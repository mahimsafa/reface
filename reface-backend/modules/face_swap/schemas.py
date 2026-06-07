from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProcessRecordResponse(BaseModel):
    id: int
    process_type: str
    status: str
    source_image: Optional[str] = None
    target_image: Optional[str] = None
    result_image: Optional[str] = None
    restore_enabled: bool = False
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PaginatedProcessResponse(BaseModel):
    items: list[ProcessRecordResponse]
    total: int


class QueueProcessRequest(BaseModel):
    process_id: int
