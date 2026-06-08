import csv
import io
import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.generation.models import ContentStatus, GeneratedContent, GenerationJob, JobStatus
from app.modules.repository.models import AssessmentItem
from app.modules.repository.schemas import AssessmentItemCreate, AssessmentItemList, AssessmentItemRead
from app.modules.repository.service import RepositoryService

router = APIRouter(prefix="/repository", tags=["repository"])

# Columns that map to the question stem
_STEM_COLS = {"stem", "question"}


def _normalise_row(row: dict) -> dict:
    """Return a row dict with lower-case, stripped keys."""
    return {k.strip().lower(): v.strip() for k, v in row.items()}


@router.post("/import")
async def import_csv(
    file: UploadFile,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> dict:
    """Accept a CSV file and bulk-import questions into the repository."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a .csv")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    # Create one import job to act as parent for all GeneratedContent rows
    import_job = GenerationJob(
        status=JobStatus.completed,
        knowledge_asset_ids=[],
        ai_provider="import",
        ai_model="csv",
        prompt_version="import",
        created_by=uuid.UUID(current_user_id),
    )
    db.add(import_job)
    await db.flush()

    imported = 0
    errors: list[str] = []

    for line_num, raw_row in enumerate(reader, start=2):  # 1-based, row 1 = header
        row = _normalise_row(raw_row)

        # Find stem
        stem = None
        for col in _STEM_COLS:
            if col in row and row[col]:
                stem = row[col]
                break
        if not stem:
            errors.append(f"Row {line_num}: missing stem/question column")
            continue

        question_type = row.get("question_type") or "multiple_choice"
        difficulty = row.get("difficulty") or "medium"
        cognitive_level = row.get("cognitive_level") or "understand"
        options_raw = row.get("options") or ""
        options = [o.strip() for o in options_raw.split("|") if o.strip()] if options_raw else []
        correct_answer = row.get("correct_answer") or ""
        rationale = row.get("rationale") or ""

        content_metadata = {
            "question_type": question_type,
            "difficulty": difficulty,
            "bloom": cognitive_level,
            "bloom_level": cognitive_level,
            "cognitive_level": cognitive_level,
            "options": options,
            "correct_answer": correct_answer,
            "rationale": rationale,
            "source_type": "import",
        }

        content = GeneratedContent(
            job_id=import_job.id,
            content_type=question_type,
            body=stem,
            content_metadata=content_metadata,
            framework_alignment={},
            source_references=[],
            ai_provider="import",
            ai_model="csv",
            prompt_version="import",
            status=ContentStatus.approved,
        )
        db.add(content)
        await db.flush()

        # Generate a short item code
        item_code = f"IMP-{str(content.id)[:8].upper()}"

        item = AssessmentItem(
            content_id=content.id,
            item_code=item_code,
            tags=[],
            created_by=uuid.UUID(current_user_id),
        )
        db.add(item)
        imported += 1

    await db.flush()

    return {"imported": imported, "errors": errors}


@router.post("", response_model=AssessmentItemRead, status_code=status.HTTP_201_CREATED)
async def add_item(data: AssessmentItemCreate, current_user_id: CurrentUserID, db: DBSession) -> AssessmentItemRead:
    service = RepositoryService(db)
    return await service.add_item(data, current_user_id)


@router.get("", response_model=AssessmentItemList)
async def list_items(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> AssessmentItemList:
    service = RepositoryService(db)
    return await service.list_items(skip=skip, limit=limit)


@router.get("/{item_id}", response_model=AssessmentItemRead)
async def get_item(item_id: str, db: DBSession, current_user_id: CurrentUserID) -> AssessmentItemRead:
    service = RepositoryService(db)
    try:
        return await service.get_item(item_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
