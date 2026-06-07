from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from core.database import Base


class ProcessRecord(Base):
    __tablename__ = "process_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    process_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    source_image = Column(String(500), nullable=True)
    target_image = Column(String(500), nullable=True)
    result_image = Column(String(500), nullable=True)
    restore_enabled = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)
