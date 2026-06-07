import os
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import StorageRecord
from modules.storage.service import s3_client
from modules.storage.schemas import UploadResponse, StorageRecordResponse

router = APIRouter()


CONTENT_TYPE_MAP = {
    ".jpg": ("image", "image/jpeg"),
    ".jpeg": ("image", "image/jpeg"),
    ".png": ("image", "image/png"),
    ".webp": ("image", "image/webp"),
    ".mp4": ("video", "video/mp4"),
    ".mkv": ("video", "video/x-matroska"),
    ".avi": ("video", "video/x-msvideo"),
    ".mov": ("video", "video/quicktime"),
}


@router.post("/storage/upload", response_model=UploadResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = await file.read()
    md5 = s3_client.md5_hash(data)

    existing = db.query(StorageRecord).filter(StorageRecord.md5_hash == md5).first()
    if existing:
        return UploadResponse(
            storage=StorageRecordResponse.model_validate(existing),
            deduplicated=True,
        )

    ext = os.path.splitext(file.filename or "file")[1].lower()
    content_type_name, file_type = CONTENT_TYPE_MAP.get(ext, ("file", "application/octet-stream"))
    key = s3_client.generate_key(ext)

    s3_client.upload_bytes(data, key, file_type)

    record = StorageRecord(
        key=key,
        original_filename=file.filename or "unknown",
        content_type=content_type_name,
        file_type=file_type,
        file_size=len(data),
        md5_hash=md5,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return UploadResponse(
        storage=StorageRecordResponse.model_validate(record),
        deduplicated=False,
    )
