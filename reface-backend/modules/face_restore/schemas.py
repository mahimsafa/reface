from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RestoreJobResponse(BaseModel):
    id: int
    job_type: str
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    metadata: Optional[dict] = None
    source_image: Optional[str] = None
    result_image: Optional[str] = None
    result_images: list[str] = []

    model_config = {"from_attributes": True}


class PaginatedRestoreResponse(BaseModel):
    items: list[RestoreJobResponse]
    total: int
