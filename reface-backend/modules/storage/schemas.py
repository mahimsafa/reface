from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StorageRecordResponse(BaseModel):
    id: int
    key: str
    original_filename: str
    content_type: str
    file_type: str
    file_size: int
    md5_hash: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    storage: StorageRecordResponse
    deduplicated: bool = False
