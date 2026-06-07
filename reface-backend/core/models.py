from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from core.database import Base


class JobRecord(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)


class JobMetadataRecord(Base):
    __tablename__ = "job_metadata"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    payload = Column(JSON, nullable=True)


class StorageRecord(Base):
    __tablename__ = "storage"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(500), nullable=False, unique=True)
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    md5_hash = Column(String(32), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class JobStorageRecord(Base):
    __tablename__ = "job_storage"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    storage_id = Column(Integer, ForeignKey("storage.id"), nullable=False)
    role = Column(String(20), nullable=False)
    is_deleted = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
