import csv
import io
import uuid
import xml.etree.ElementTree as ET

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy import select

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


@router.get("/export/qti")
async def export_qti(
    db: DBSession,
    current_user_id: CurrentUserID,
    job_id: str | None = None,
    framework_id: str | None = None,
) -> Response:
    """Export approved repository items as IMS QTI 2.1 XML."""
    # Fetch all assessment items joined with their GeneratedContent (approved only)
    query = (
        select(AssessmentItem, GeneratedContent)
        .join(GeneratedContent, GeneratedContent.id == AssessmentItem.content_id)
        .where(GeneratedContent.status == ContentStatus.approved)
    )
    if job_id:
        try:
            query = query.where(GeneratedContent.job_id == uuid.UUID(job_id))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job_id")

    rows = (await db.execute(query)).all()

    # Build QTI 2.1 XML
    QTI_NS = "http://www.imsglobal.org/xsd/imsqti_v2p1"
    XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"
    SCHEMA_LOC = "http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/imsqti_v2p1.xsd"

    ET.register_namespace("", QTI_NS)
    ET.register_namespace("xsi", XSI_NS)

    root = ET.Element(f"{{{QTI_NS}}}assessmentTest")
    root.set(f"{{{XSI_NS}}}schemaLocation", SCHEMA_LOC)
    root.set("identifier", "export")
    root.set("title", "Exported Assessment")

    test_part = ET.SubElement(root, f"{{{QTI_NS}}}testPart")
    test_part.set("identifier", "testPart1")
    test_part.set("navigationMode", "linear")
    test_part.set("submissionMode", "individual")

    section = ET.SubElement(test_part, f"{{{QTI_NS}}}assessmentSection")
    section.set("identifier", "section1")
    section.set("title", "Section 1")
    section.set("visible", "true")

    for item_row, content_row in rows:
        meta = content_row.content_metadata or {}
        stem = content_row.body or ""
        options: list = meta.get("options", [])
        correct_answer: str = meta.get("correct_answer", "")
        rationale: str = meta.get("rationale", "")
        item_id = str(item_row.id)
        title = stem[:50].replace('"', "'")

        ai_elem = ET.SubElement(section, f"{{{QTI_NS}}}assessmentItem")
        ai_elem.set("identifier", item_id)
        ai_elem.set("title", title)
        ai_elem.set("adaptive", "false")
        ai_elem.set("timeDependent", "false")

        # Response declaration
        resp_decl = ET.SubElement(ai_elem, f"{{{QTI_NS}}}responseDeclaration")
        resp_decl.set("identifier", "RESPONSE")
        resp_decl.set("cardinality", "single")
        resp_decl.set("baseType", "identifier")
        correct_resp = ET.SubElement(resp_decl, f"{{{QTI_NS}}}correctResponse")
        value_elem = ET.SubElement(correct_resp, f"{{{QTI_NS}}}value")
        value_elem.text = correct_answer

        # Outcome declaration
        outcome_decl = ET.SubElement(ai_elem, f"{{{QTI_NS}}}outcomeDeclaration")
        outcome_decl.set("identifier", "SCORE")
        outcome_decl.set("cardinality", "single")
        outcome_decl.set("baseType", "float")

        # Item body
        item_body = ET.SubElement(ai_elem, f"{{{QTI_NS}}}itemBody")
        p_elem = ET.SubElement(item_body, f"{{{QTI_NS}}}p")
        p_elem.text = stem

        if rationale:
            rat_elem = ET.SubElement(item_body, f"{{{QTI_NS}}}p")
            rat_elem.set("class", "rationale")
            rat_elem.text = f"Rationale: {rationale}"

        if options:
            choice_int = ET.SubElement(item_body, f"{{{QTI_NS}}}choiceInteraction")
            choice_int.set("responseIdentifier", "RESPONSE")
            choice_int.set("maxChoices", "1")
            labels = ["A", "B", "C", "D", "E", "F"]
            for idx, opt in enumerate(options):
                sc = ET.SubElement(choice_int, f"{{{QTI_NS}}}simpleChoice")
                sc.set("identifier", labels[idx] if idx < len(labels) else str(idx))
                sc.text = opt

    xml_bytes = ET.tostring(root, encoding="unicode", xml_declaration=False)
    xml_output = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_bytes

    return Response(
        content=xml_output.encode("utf-8"),
        media_type="application/xml",
        headers={"Content-Disposition": 'attachment; filename="export.xml"'},
    )


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
