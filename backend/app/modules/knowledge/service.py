import asyncio
import uuid

import boto3
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.knowledge.models import AssetStatus, KnowledgeAsset
from app.modules.knowledge.schemas import KnowledgeAssetCreate, KnowledgeAssetList, KnowledgeAssetRead, KnowledgeAssetUpdate

logger = structlog.get_logger(__name__)


class KnowledgeService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _s3_client(self):
        return boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            endpoint_url=settings.AWS_ENDPOINT_URL or None,
        )

    async def create_asset(self, data: KnowledgeAssetCreate, created_by: str) -> KnowledgeAssetRead:
        asset = KnowledgeAsset(
            title=data.title,
            description=data.description,
            content_type=data.content_type,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(asset)
        await self.db.flush()
        await self.db.refresh(asset)
        return KnowledgeAssetRead.model_validate(asset)

    async def upload_file(self, asset_id: str, file_bytes: bytes, filename: str) -> KnowledgeAssetRead:
        result = await self.db.execute(select(KnowledgeAsset).where(KnowledgeAsset.id == uuid.UUID(asset_id)))
        asset = result.scalar_one_or_none()
        if not asset:
            raise ValueError("Asset not found")

        s3_key = f"knowledge/{asset_id}/{filename}"

        # Run synchronous boto3 call in a thread to avoid blocking the event loop.
        # If S3/MinIO is unreachable we record the failure and mark the asset
        # failed so the UI can surface it, rather than reporting a false success.
        try:
            s3 = self._s3_client()
            await asyncio.to_thread(
                s3.put_object, Bucket=settings.AWS_BUCKET_NAME, Key=s3_key, Body=file_bytes
            )
            asset.storage_path = s3_key
        except Exception as exc:
            logger.error(
                "knowledge_s3_upload_failed",
                asset_id=str(asset_id),
                bucket=settings.AWS_BUCKET_NAME,
                error=str(exc),
            )
            asset.storage_path = None
            asset.status = AssetStatus.failed
            asset.file_size = len(file_bytes)
            await self.db.flush()
            await self.db.refresh(asset)
            raise RuntimeError(f"Storage upload failed: {exc}")
        asset.file_size = len(file_bytes)
        asset.status = AssetStatus.uploaded
        await self.db.flush()
        await self.db.refresh(asset)
        return KnowledgeAssetRead.model_validate(asset)

    async def list_assets(self, skip: int = 0, limit: int = 20) -> KnowledgeAssetList:
        count_result = await self.db.execute(select(func.count(KnowledgeAsset.id)))
        total = count_result.scalar_one()
        result = await self.db.execute(select(KnowledgeAsset).offset(skip).limit(limit))
        assets = result.scalars().all()
        return KnowledgeAssetList(
            items=[KnowledgeAssetRead.model_validate(a) for a in assets],
            total=total,
        )

    async def get_asset(self, asset_id: str) -> KnowledgeAssetRead:
        result = await self.db.execute(select(KnowledgeAsset).where(KnowledgeAsset.id == uuid.UUID(asset_id)))
        asset = result.scalar_one_or_none()
        if not asset:
            raise ValueError("Asset not found")
        return KnowledgeAssetRead.model_validate(asset)

    async def update_asset(self, asset_id: str, data: KnowledgeAssetUpdate) -> KnowledgeAssetRead:
        result = await self.db.execute(select(KnowledgeAsset).where(KnowledgeAsset.id == uuid.UUID(asset_id)))
        asset = result.scalar_one_or_none()
        if not asset:
            raise ValueError("Asset not found")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(asset, field, value)
        await self.db.flush()
        await self.db.refresh(asset)
        return KnowledgeAssetRead.model_validate(asset)

    async def delete_asset(self, asset_id: str) -> None:
        result = await self.db.execute(select(KnowledgeAsset).where(KnowledgeAsset.id == uuid.UUID(asset_id)))
        asset = result.scalar_one_or_none()
        if not asset:
            raise ValueError("Asset not found")
        await self.db.delete(asset)
