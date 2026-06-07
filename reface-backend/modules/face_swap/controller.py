import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from core.database import get_db
from core.models import JobRecord, JobMetadataRecord, StorageRecord, JobStorageRecord
from core.image_utils import is_valid_extension
from modules.face_swap.schemas import JobResponse, PaginatedJobResponse, QueueProcessRequest
from modules.face_swap.tasks import process_face_swap_task
from modules.storage.service import s3_client

router = APIRouter()


def _job_to_response(job: JobRecord, db: Session) -> JobResponse:
    meta = db.query(JobMetadataRecord).filter(JobMetadataRecord.job_id == job.id).first()
    payload = meta.payload if meta else {}

    storage_links = (
        db.query(JobStorageRecord, StorageRecord)
        .join(StorageRecord, JobStorageRecord.storage_id == StorageRecord.id)
        .filter(JobStorageRecord.job_id == job.id, JobStorageRecord.is_deleted == False)
        .order_by(JobStorageRecord.created_at.desc())
        .all()
    )

    source_url = None
    target_url = None
    result_url = None
    result_urls = []

    for link, st in storage_links:
        url = s3_client.public_url_for(st.key)
        if link.role == "source":
            source_url = url
        elif link.role == "target":
            target_url = url
        elif link.role == "result":
            if result_url is None:
                result_url = url
            result_urls.append(url)

    return JobResponse(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        error_message=job.error_message,
        created_at=job.created_at,
        finished_at=job.finished_at,
        metadata=payload,
        source_image=source_url,
        target_image=target_url,
        result_image=result_url,
        result_images=result_urls,
        restore_enabled=payload.get("restore_enabled", False),
    )


@router.post("/image-processes", response_model=JobResponse, status_code=201)
async def create_image_process(
    source_image: UploadFile = File(...),
    target_image: UploadFile = File(...),
    restore: bool = Form(False),
    db: Session = Depends(get_db),
):
    if not is_valid_extension(source_image.filename) or not is_valid_extension(target_image.filename):
        raise HTTPException(400, "Only JPG, JPEG, PNG, and WEBP files are allowed")

    source_data = await source_image.read()
    target_data = await target_image.read()

    def _upload(data: bytes, filename: str) -> StorageRecord:
        md5 = s3_client.md5_hash(data)
        existing = db.query(StorageRecord).filter(StorageRecord.md5_hash == md5).first()
        if existing:
            return existing
        ext = os.path.splitext(filename)[1].lower()
        key = s3_client.generate_key(ext)
        content_type = "image/jpeg"
        s3_client.upload_bytes(data, key, content_type)
        record = StorageRecord(
            key=key,
            original_filename=filename,
            content_type="image",
            file_type=content_type,
            file_size=len(data),
            md5_hash=md5,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    src_storage = _upload(source_data, source_image.filename)
    tgt_storage = _upload(target_data, target_image.filename)

    job = JobRecord(
        job_type="face_swap",
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    meta = JobMetadataRecord(
        job_id=job.id,
        payload={"restore_enabled": restore},
    )
    db.add(meta)

    for st, role in [(src_storage, "source"), (tgt_storage, "target")]:
        link = JobStorageRecord(
            job_id=job.id,
            storage_id=st.id,
            role=role,
        )
        db.add(link)

    db.commit()

    return _job_to_response(job, db)


@router.post("/queue/process", status_code=202)
async def queue_process(
    body: QueueProcessRequest,
    db: Session = Depends(get_db),
):
    job = db.query(JobRecord).filter(JobRecord.id == body.process_id).first()
    if not job:
        raise HTTPException(404, "Process not found")
    if job.status != "pending":
        raise HTTPException(400, f"Process is already {job.status}")

    job.status = "queued"
    db.commit()

    process_face_swap_task.delay(process_id=job.id)

    return {"status": "queued", "process_id": job.id}


@router.get("/image-processes", response_model=PaginatedJobResponse)
async def list_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),
    process_type: str | None = Query(None),
    sort_by: str = Query("created_at", pattern=r"^(created_at|finished_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    q = db.query(JobRecord)

    if status:
        q = q.filter(JobRecord.status == status)
    if process_type:
        q = q.filter(JobRecord.job_type == process_type)

    total = q.count()

    order_fn = desc if sort_order == "desc" else asc
    column = getattr(JobRecord, sort_by)
    items = q.order_by(order_fn(column)).offset(skip).limit(limit).all()

    return {
        "items": [_job_to_response(j, db) for j in items],
        "total": total,
    }


@router.get("/image-processes/{process_id}", response_model=JobResponse)
async def get_process(process_id: int, db: Session = Depends(get_db)):
    job = db.query(JobRecord).filter(JobRecord.id == process_id).first()
    if not job:
        raise HTTPException(404, "Process not found")
    return _job_to_response(job, db)


@router.post("/image-processes/{process_id}/retry", response_model=JobResponse, status_code=202)
async def retry_process(process_id: int, db: Session = Depends(get_db)):
    job = db.query(JobRecord).filter(JobRecord.id == process_id).first()
    if not job:
        raise HTTPException(404, "Process not found")
    if job.status not in ("completed", "failed"):
        raise HTTPException(400, f"Cannot retry process in '{job.status}' state")

    job.status = "queued"
    job.error_message = None
    job.finished_at = None
    db.commit()

    process_face_swap_task.delay(process_id=job.id)

    return _job_to_response(job, db)
