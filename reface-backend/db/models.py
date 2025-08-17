from __future__ import annotations

import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .session import Base


class ProcessStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ProcessRecord(Base):
    __tablename__ = "process_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # File paths
    source_image_path: Mapped[str] = mapped_column(String(512))
    target_image_path: Mapped[str] = mapped_column(String(512))
    result_image_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Metadata
    status: Mapped[ProcessStatus] = mapped_column(Enum(ProcessStatus), default=ProcessStatus.pending, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Optional: an output prefix or request correlation id
    output_prefix: Mapped[str | None] = mapped_column(String(128), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source_image_path": self.source_image_path,
            "target_image_path": self.target_image_path,
            "result_image_path": self.result_image_path,
            "status": self.status.value if isinstance(self.status, ProcessStatus) else self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "output_prefix": self.output_prefix,
        }
