"""Celery tasks for background processing."""

import asyncio

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


def _run_async(coro):
    """Run an async coroutine inside a Celery (sync) task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="tasks.process_knowledge_asset", max_retries=3)
def process_knowledge_asset(self, asset_id: str) -> dict:
    """Download the asset from S3, run extraction, update the DB record."""
    logger.info("process_knowledge_asset_start", asset_id=asset_id)

    async def _inner():
        from app.core.database import AsyncSessionLocal
        from app.modules.knowledge.models import AssetStatus, KnowledgeAsset
        from app.modules.knowledge.extractor import ContentExtractor
        from app.modules.orchestration.service import AIOrchestrationService
        import boto3
        import uuid
        from sqlalchemy import select

        from app.core.config import settings

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(KnowledgeAsset).where(KnowledgeAsset.id == uuid.UUID(asset_id)))
            asset = result.scalar_one_or_none()
            if not asset:
                return {"error": f"Asset {asset_id} not found"}

            asset.status = AssetStatus.processing
            await db.flush()

            try:
                s3 = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    endpoint_url=settings.AWS_ENDPOINT_URL or None,
                )
                obj = s3.get_object(Bucket=settings.AWS_BUCKET_NAME, Key=asset.storage_path)
                file_bytes = obj["Body"].read()

                extractor = ContentExtractor()
                extracted = await extractor.extract_text(file_bytes, asset.content_type.value)

                orchestration = AIOrchestrationService()
                analysis = await extractor.analyze_with_ai(extracted.get("raw_text", ""), orchestration)

                asset.extracted_topics = analysis.get("topics", [])
                asset.extracted_concepts = analysis.get("concepts", [])
                asset.extracted_outcomes = analysis.get("outcomes", [])
                asset.keywords = analysis.get("keywords", [])
                asset.status = AssetStatus.processed
                await db.commit()
                return {"status": "processed", "asset_id": asset_id}

            except Exception as exc:
                asset.status = AssetStatus.failed
                await db.commit()
                logger.error("process_knowledge_asset_failed", asset_id=asset_id, error=str(exc))
                raise self.retry(exc=exc, countdown=60)

    return _run_async(_inner())


@celery_app.task(bind=True, name="tasks.run_generation_job", max_retries=2)
def run_generation_job(self, job_id: str) -> dict:
    """Execute a generation job: load config + assets, call AI agent, persist results."""
    logger.info("run_generation_job_start", job_id=job_id)

    async def _inner():
        from app.core.database import AsyncSessionLocal
        from app.modules.generation.models import GeneratedContent, GenerationJob, JobStatus
        from app.modules.orchestration.service import AIOrchestrationService
        from app.agents.assessment_agent import AssessmentAgent
        from sqlalchemy import select
        import uuid

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(GenerationJob).where(GenerationJob.id == uuid.UUID(job_id)))
            job = result.scalar_one_or_none()
            if not job:
                return {"error": f"Job {job_id} not found"}

            job.status = JobStatus.running
            job.celery_task_id = self.request.id
            await db.flush()

            try:
                orchestration = AIOrchestrationService()
                agent = AssessmentAgent(orchestration)

                # --- Load configuration ---
                config = None
                if job.configuration_id:
                    from app.modules.assessment_config.models import AssessmentConfiguration
                    cfg_result = await db.execute(
                        select(AssessmentConfiguration).where(AssessmentConfiguration.id == job.configuration_id)
                    )
                    config = cfg_result.scalar_one_or_none()

                # --- Load and concatenate knowledge asset text ---
                knowledge_text = ""
                if job.knowledge_asset_ids:
                    from app.modules.knowledge.models import KnowledgeAsset
                    import boto3
                    from app.modules.knowledge.extractor import ContentExtractor
                    from app.core.config import settings as cfg

                    extractor = ContentExtractor()
                    chunks: list[str] = []

                    for asset_id_str in job.knowledge_asset_ids:
                        asset_result = await db.execute(
                            select(KnowledgeAsset).where(KnowledgeAsset.id == uuid.UUID(asset_id_str))
                        )
                        asset = asset_result.scalar_one_or_none()
                        if not asset:
                            continue

                        # Prefer already-extracted keywords/topics for a compact summary
                        if asset.extracted_topics or asset.extracted_concepts:
                            parts = []
                            if asset.extracted_topics:
                                topics = asset.extracted_topics if isinstance(asset.extracted_topics, list) else list(asset.extracted_topics.values())
                                parts.append("Topics: " + ", ".join(str(t) for t in topics))
                            if asset.extracted_concepts:
                                concepts = asset.extracted_concepts if isinstance(asset.extracted_concepts, list) else list(asset.extracted_concepts.values())
                                parts.append("Concepts: " + ", ".join(str(c) for c in concepts))
                            if asset.extracted_outcomes:
                                outcomes = asset.extracted_outcomes if isinstance(asset.extracted_outcomes, list) else list(asset.extracted_outcomes.values())
                                parts.append("Learning outcomes: " + "; ".join(str(o) for o in outcomes))
                            chunks.append(f"[{asset.title}]\n" + "\n".join(parts))

                        elif asset.storage_path and cfg.AWS_ACCESS_KEY_ID:
                            # Fall back to re-extracting from S3 raw bytes
                            try:
                                s3 = boto3.client(
                                    "s3",
                                    aws_access_key_id=cfg.AWS_ACCESS_KEY_ID,
                                    aws_secret_access_key=cfg.AWS_SECRET_ACCESS_KEY,
                                    endpoint_url=cfg.AWS_ENDPOINT_URL or None,
                                )
                                obj = s3.get_object(Bucket=cfg.AWS_BUCKET_NAME, Key=asset.storage_path)
                                file_bytes = obj["Body"].read()
                                extracted = await extractor.extract_text(file_bytes, asset.content_type.value)
                                raw = extracted.get("raw_text", "")
                                chunks.append(f"[{asset.title}]\n{raw[:3000]}")
                            except Exception:
                                pass  # skip unavailable asset; don't abort the job

                    knowledge_text = "\n\n".join(chunks)

                if not knowledge_text:
                    knowledge_text = "No source material provided. Generate plausible assessment questions based on the framework and configuration."

                # --- Build framework context string ---
                framework_context = ""
                if config and config.framework_id:
                    from app.modules.frameworks.models import Framework
                    fw_result = await db.execute(
                        select(Framework).where(Framework.id == config.framework_id)
                    )
                    fw = fw_result.scalar_one_or_none()
                    if fw:
                        framework_context = f"{fw.name} (v{fw.version})"
                        if fw.description:
                            framework_context += f": {fw.description}"

                context = {
                    "question_count": config.question_count if config else 10,
                    "question_type": (config.question_types[0] if config and config.question_types else "multiple_choice"),
                    "difficulty_levels": config.difficulty_levels if config and config.difficulty_levels else {"easy": 3, "medium": 5, "hard": 2},
                    "cognitive_levels": config.cognitive_levels if config and config.cognitive_levels else {"remember": 3, "understand": 4, "apply": 3},
                    "reading_level": config.reading_level if config else "intermediate",
                    "audience": config.audience or "general" if config else "general",
                    "language": config.language if config else "en",
                    "framework_context": framework_context,
                    "knowledge_content": knowledge_text,
                    "ai_provider": job.ai_provider,
                    "ai_model": job.ai_model,
                }

                agent_result = await agent.execute(context)

                if agent_result.success:
                    from app.modules.generation.models import ContentStatus
                    for q in agent_result.data.get("questions", []):
                        content = GeneratedContent(
                            job_id=job.id,
                            content_type=q.get("question_type", "multiple_choice"),
                            body=q.get("stem", ""),
                            content_metadata=q,
                            framework_alignment=q.get("framework_alignment", {}),
                            source_references=list(job.knowledge_asset_ids),
                            ai_provider=job.ai_provider,
                            ai_model=job.ai_model,
                            prompt_version=job.prompt_version,
                            status=ContentStatus.generated,
                        )
                        db.add(content)
                    job.status = JobStatus.completed
                else:
                    job.status = JobStatus.failed
                    job.error_message = agent_result.error

                from datetime import datetime, timezone
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": job.status.value, "job_id": job_id}

            except Exception as exc:
                job.status = JobStatus.failed
                job.error_message = str(exc)
                await db.commit()
                raise self.retry(exc=exc, countdown=30)

    return _run_async(_inner())


@celery_app.task(bind=True, name="tasks.run_quality_validation", max_retries=3)
def run_quality_validation(self, content_id: str) -> dict:
    """Run all quality validators against a generated content item."""
    logger.info("run_quality_validation_start", content_id=content_id)

    async def _inner():
        from app.core.database import AsyncSessionLocal
        from app.modules.generation.models import GeneratedContent
        from app.modules.quality.service import QualityService
        from sqlalchemy import select
        import uuid

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(GeneratedContent).where(GeneratedContent.id == uuid.UUID(content_id))
            )
            content = result.scalar_one_or_none()
            if not content:
                return {"error": f"Content {content_id} not found"}

            service = QualityService(db)
            report = await service.validate_content(
                content_id=content_id,
                content_text=content.body,
                context=content.content_metadata or {},
            )
            content.validation_score = report.overall_score
            await db.commit()
            return {"content_id": content_id, "overall_score": report.overall_score, "passed": report.passed}

    return _run_async(_inner())
