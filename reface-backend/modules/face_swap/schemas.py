from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobResponse(BaseModel):
    id: int
    job_type: str
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    metadata: Optional[dict] = None
    source_image: Optional[str] = None
    target_image: Optional[str] = None
    result_image: Optional[str] = None
    restore_enabled: bool = False

    model_config = {"from_attributes": True}


class PaginatedJobResponse(BaseModel):
    items: list[JobResponse]
    total: int


class QueueProcessRequest(BaseModel):
    process_id: int
