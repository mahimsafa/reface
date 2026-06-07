import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from core.database import get_db
from core.models import ProcessRecord
from core.config import settings
from core.image_utils import ensure_dir, is_valid_extension
from modules.face_restore.schemas import RestoreRecordResponse, PaginatedRestoreResponse
from modules.face_restore.tasks import process_face_restore_task

router = APIRouter()


@router.post("/face-restore", response_model=RestoreRecordResponse, status_code=201)
async def create_face_restore(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not is_valid_extension(image.filename):
        raise HTTPException(400, "Only JPG, JPEG, PNG, and WEBP files are allowed")

    ensure_dir(settings.IMAGES_DIR)

    ext = os.path.splitext(image.filename)[1]
    img_name = f"{uuid.uuid4().hex}{ext}"
    img_path = os.path.join(settings.IMAGES_DIR, img_name)

    content = await image.read()
    with open(img_path, "wb") as f:
        f.write(content)

    record = ProcessRecord(
        process_type="face_restore",
        status="pending",
        source_image=img_path,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    process_face_restore_task.delay(
        process_id=record.id,
        source_path=record.source_image,
    )

    return record


@router.get("/face-restore/{process_id}", response_model=RestoreRecordResponse)
async def get_restore_process(process_id: int, db: Session = Depends(get_db)):
    record = (
        db.query(ProcessRecord)
        .filter(ProcessRecord.id == process_id, ProcessRecord.process_type == "face_restore")
        .first()
    )
    if not record:
        raise HTTPException(404, "Restore process not found")
    return record


@router.get("/face-restore", response_model=PaginatedRestoreResponse)
async def list_restore_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),
    sort_by: str = Query("created_at", pattern=r"^(created_at|finished_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    q = db.query(ProcessRecord).filter(ProcessRecord.process_type == "face_restore")
    if status:
        q = q.filter(ProcessRecord.status == status)

    total = q.count()
    order_fn = desc if sort_order == "desc" else asc
    column = getattr(ProcessRecord, sort_by)
    items = q.order_by(order_fn(column)).offset(skip).limit(limit).all()

    return {"items": items, "total": total}
