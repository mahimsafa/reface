import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from core.database import get_db
from core.models import JobRecord, JobMetadataRecord, StorageRecord, JobStorageRecord
from core.image_utils import is_valid_extension
from modules.face_restore.schemas import RestoreJobResponse, PaginatedRestoreResponse
from modules.face_restore.tasks import process_face_restore_task
from modules.storage.service import s3_client

router = APIRouter()


def _job_to_response(job: JobRecord, db: Session) -> RestoreJobResponse:
    meta = db.query(JobMetadataRecord).filter(JobMetadataRecord.job_id == job.id).first()
    payload = meta.payload if meta else {}

    links = (
        db.query(JobStorageRecord, StorageRecord)
        .join(StorageRecord, JobStorageRecord.storage_id == StorageRecord.id)
        .filter(JobStorageRecord.job_id == job.id, JobStorageRecord.is_deleted == False)
        .order_by(JobStorageRecord.created_at.desc())
        .all()
    )

    source_url = None
    result_url = None
    result_urls = []

    for link, st in links:
        url = s3_client.public_url_for(st.key)
        if link.role == "source":
            source_url = url
        elif link.role == "result":
            if result_url is None:
                result_url = url
            result_urls.append(url)

    return RestoreJobResponse(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        error_message=job.error_message,
        created_at=job.created_at,
        finished_at=job.finished_at,
        metadata=payload,
        source_image=source_url,
        result_image=result_url,
        result_images=result_urls,
    )


@router.post("/face-restore", response_model=RestoreJobResponse, status_code=201)
async def create_face_restore(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not is_valid_extension(image.filename):
        raise HTTPException(400, "Only JPG, JPEG, PNG, and WEBP files are allowed")

    data = await image.read()
    md5 = s3_client.md5_hash(data)

    existing = db.query(StorageRecord).filter(StorageRecord.md5_hash == md5).first()
    if existing:
        src_storage = existing
    else:
        ext = os.path.splitext(image.filename)[1].lower()
        key = s3_client.generate_key(ext)
        s3_client.upload_bytes(data, key, "image/jpeg")
        src_storage = StorageRecord(
            key=key,
            original_filename=image.filename,
            content_type="image",
            file_type="image/jpeg",
            file_size=len(data),
            md5_hash=md5,
        )
        db.add(src_storage)
        db.commit()
        db.refresh(src_storage)

    job = JobRecord(job_type="face_restore", status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)

    meta = JobMetadataRecord(job_id=job.id, payload={})
    db.add(meta)

    link = JobStorageRecord(job_id=job.id, storage_id=src_storage.id, role="source")
    db.add(link)
    db.commit()

    process_face_restore_task.delay(process_id=job.id)

    return _job_to_response(job, db)


@router.get("/face-restore/{process_id}", response_model=RestoreJobResponse)
async def get_restore_process(process_id: int, db: Session = Depends(get_db)):
    job = (
        db.query(JobRecord)
        .filter(JobRecord.id == process_id, JobRecord.job_type == "face_restore")
        .first()
    )
    if not job:
        raise HTTPException(404, "Restore process not found")
    return _job_to_response(job, db)


@router.post("/face-restore/{process_id}/retry", response_model=RestoreJobResponse, status_code=202)
async def retry_restore_process(process_id: int, db: Session = Depends(get_db)):
    job = (
        db.query(JobRecord)
        .filter(JobRecord.id == process_id, JobRecord.job_type == "face_restore")
        .first()
    )
    if not job:
        raise HTTPException(404, "Restore process not found")
    if job.status not in ("completed", "failed"):
        raise HTTPException(400, f"Cannot retry process in '{job.status}' state")

    job.status = "queued"
    job.error_message = None
    job.finished_at = None
    db.commit()

    process_face_restore_task.delay(process_id=job.id)

    return _job_to_response(job, db)


@router.get("/face-restore", response_model=PaginatedRestoreResponse)
async def list_restore_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),
    sort_by: str = Query("created_at", pattern=r"^(created_at|finished_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    q = db.query(JobRecord).filter(JobRecord.job_type == "face_restore")
    if status:
        q = q.filter(JobRecord.status == status)

    total = q.count()
    order_fn = desc if sort_order == "desc" else asc
    column = getattr(JobRecord, sort_by)
    items = q.order_by(order_fn(column)).offset(skip).limit(limit).all()

    return {"items": [_job_to_response(j, db) for j in items], "total": total}
