from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RestoreRecordResponse(BaseModel):
    id: int
    process_type: str
    status: str
    source_image: Optional[str] = None
    result_image: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PaginatedRestoreResponse(BaseModel):
    items: list[RestoreRecordResponse]
    total: int
