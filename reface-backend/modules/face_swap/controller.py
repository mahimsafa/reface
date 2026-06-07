import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from core.database import get_db
from core.models import ProcessRecord
from core.config import settings
from core.image_utils import ensure_dir, is_valid_extension
from modules.face_swap.schemas import ProcessRecordResponse, PaginatedProcessResponse, QueueProcessRequest
from modules.face_swap.tasks import process_face_swap_task

router = APIRouter()


@router.post("/image-processes", response_model=ProcessRecordResponse, status_code=201)
async def create_image_process(
    source_image: UploadFile = File(...),
    target_image: UploadFile = File(...),
    restore: bool = Form(False),
    db: Session = Depends(get_db),
):
    if not is_valid_extension(source_image.filename) or not is_valid_extension(target_image.filename):
        raise HTTPException(400, "Only JPG, JPEG, PNG, and WEBP files are allowed")

    ensure_dir(settings.IMAGES_DIR)

    src_ext = os.path.splitext(source_image.filename)[1]
    tgt_ext = os.path.splitext(target_image.filename)[1]
    src_name = f"{uuid.uuid4().hex}{src_ext}"
    tgt_name = f"{uuid.uuid4().hex}{tgt_ext}"
    src_path = os.path.join(settings.IMAGES_DIR, src_name)
    tgt_path = os.path.join(settings.IMAGES_DIR, tgt_name)

    src_content = await source_image.read()
    tgt_content = await target_image.read()

    with open(src_path, "wb") as f:
        f.write(src_content)
    with open(tgt_path, "wb") as f:
        f.write(tgt_content)

    record = ProcessRecord(
        process_type="face_swap",
        status="pending",
        source_image=src_path,
        target_image=tgt_path,
        restore_enabled=restore,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.post("/queue/process", status_code=202)
async def queue_process(
    body: QueueProcessRequest,
    db: Session = Depends(get_db),
):
    record = db.query(ProcessRecord).filter(ProcessRecord.id == body.process_id).first()
    if not record:
        raise HTTPException(404, "Process not found")
    if record.status != "pending":
        raise HTTPException(400, f"Process is already {record.status}")

    record.status = "queued"
    db.commit()

    process_face_swap_task.delay(
        process_id=record.id,
        source_path=record.source_image,
        target_path=record.target_image,
        restore=record.restore_enabled,
    )

    return {"status": "queued", "process_id": record.id}


@router.get("/image-processes", response_model=PaginatedProcessResponse)
async def list_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),
    process_type: str | None = Query(None),
    sort_by: str = Query("created_at", pattern=r"^(created_at|finished_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    q = db.query(ProcessRecord)

    if status:
        q = q.filter(ProcessRecord.status == status)
    if process_type:
        q = q.filter(ProcessRecord.process_type == process_type)

    total = q.count()

    order_fn = desc if sort_order == "desc" else asc
    column = getattr(ProcessRecord, sort_by)
    items = q.order_by(order_fn(column)).offset(skip).limit(limit).all()

    return {"items": items, "total": total}


@router.get("/image-processes/{process_id}", response_model=ProcessRecordResponse)
async def get_process(process_id: int, db: Session = Depends(get_db)):
    record = db.query(ProcessRecord).filter(ProcessRecord.id == process_id).first()
    if not record:
        raise HTTPException(404, "Process not found")
    return record
