#!/usr/bin/env python3
"""
FastAPI Face Swap API

This module provides a REST API for face swapping between images.
"""

import os
import uuid
import json
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload
from contextlib import asynccontextmanager

from db.init_db import init_db
from db.session import get_db
from db.models import ProcessRecord, ProcessStatus
from lib.face_swap import FaceSwap
from lib.image_utils import (
    bytes_to_image,
    is_valid_image_extension,
    ensure_directory_exists,
    save_image
)

from typing import List, Optional
from fastapi import Query
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    init_db()
    yield

# Initialize FastAPI app
app = FastAPI(title="Face Swap API",
              description="API for swapping faces between images",
              version="1.0.0",
              lifespan=lifespan
              )

# Ensure database tables exist on startup


# @app.on_event("startup")
# def on_startup() -> None:
#     init_db()


# Configure CORS
origins = [
    "http://localhost:3000",  # React default port
    "http://127.0.0.1:3000",  # React default port (alternative)
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",  # Vite default port (alternative)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_PATH = "models/inswapper_128.onnx"
OUTPUT_DIR = "output"
INPUT_DIR = "images"  # where we store uploaded originals

# Ensure directories exist
ensure_directory_exists(OUTPUT_DIR)
ensure_directory_exists(INPUT_DIR)

# Mount the output directory to serve static files
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")
app.mount("/images", StaticFiles(directory=INPUT_DIR), name="images")


class ProcessRecordResponse(BaseModel):
    id: int
    source_image_path: str
    target_image_path: str
    result_image_path: Optional[str]
    status: str
    created_at: datetime
    finished_at: Optional[datetime]
    output_prefix: str

    class Config:
        from_attributes = True


class PaginatedProcessResponse(BaseModel):
    items: List[ProcessRecordResponse]
    total: int


@app.get("/processes/", response_model=PaginatedProcessResponse)
async def list_processes(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        10, ge=1, le=100, description="Number of records to return"),
    status: Optional[ProcessStatus] = Query(
        None, description="Filter by status"),
    sort_by: str = Query(
        "created_at", description="Field to sort by (created_at or finished_at)"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$",
                            description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    """
    List all process records with pagination, sorting and filtering.
    """
    query = db.query(ProcessRecord)

    # Apply status filter if provided
    if status is not None:
        query = query.filter(ProcessRecord.status == status)

    # Validate sort_by field
    if sort_by not in ["created_at", "finished_at"]:
        sort_by = "created_at"

    # Apply sorting
    sort_field = getattr(ProcessRecord, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_field.desc())
    else:
        query = query.order_by(sort_field.asc())

    # Apply pagination
    processes = query.offset(skip).limit(limit).all()

    total = query.count()
    return {
        "items": processes,
        "total": total,
    }


@app.get("/processes/{process_id}", response_model=ProcessRecordResponse)
async def get_process(
    process_id: int,
    db: Session = Depends(get_db)
):
    """
    Get details of a single process record by ID.
    """
    process = db.query(ProcessRecord).filter(
        ProcessRecord.id == process_id).first()
    if process is None:
        raise HTTPException(status_code=404, detail="Process not found")
    return process

# Initialize face swapper
try:
    face_swapper = FaceSwap(model_path=MODEL_PATH)
    print(f"Loaded face swap model from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading face swap model: {str(e)}")
    raise


@app.get("/")
async def read_root():
    """Root endpoint that returns a welcome message."""
    return {"message": "Welcome to the Face Swap API! Use the /swap-faces endpoint to swap faces between images."}


def _save_upload_to_disk(upload: UploadFile, dest_dir: str, prefix: str) -> str:
    """Save an UploadFile to disk and return the path."""
    ensure_directory_exists(dest_dir)
    original_name = upload.filename or "uploaded.jpg"
    _, ext = os.path.splitext(original_name)
    ext = ext.lower().lstrip(".") or "jpg"
    unique_name = f"{prefix}_{uuid.uuid4().hex}.{ext}"
    path = os.path.join(dest_dir, unique_name)
    # We read from the UploadFile's file-like object which may have been read separately too
    upload.file.seek(0)
    with open(path, "wb") as f:
        f.write(upload.file.read())
    return path


class FaceSwapRequest(BaseModel):
    target_index: int = 0
    source_index: int = 0
    output_prefix: str = "result"


@app.post("/swap-faces")
async def swap_faces(
    source_image: UploadFile = File(...),
    target_image: UploadFile = File(...),
    form_data: str = Form(
        "{\"target_index\":0,\"source_index\":0,\"output_prefix\":\"result\"}"),
    db: Session = Depends(get_db),
):
    # Parse the form data JSON string
    try:
        data = json.loads(form_data)
        target_index = int(data.get("target_index", 0))
        source_index = int(data.get("source_index", 0))
        output_prefix = data.get("output_prefix", "result")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing form data: {e}")
        target_index = 0
        source_index = 0
        output_prefix = "result"
    """
    Swap faces between the source and target images.

    Args:
        source_image: The image containing the face to swap from
        target_image: The image containing the face to swap to
        output_prefix: Prefix for the output filename (default: "result")

    Returns:
        dict: Dictionary containing the URL of the generated image
    """
    print("target_index", target_index)
    print("source_index", source_index)
    # Validate file types
    if not is_valid_image_extension(source_image.filename or ""):
        raise HTTPException(
            status_code=400, detail="Source image must be a JPG or PNG file")

    if not is_valid_image_extension(target_image.filename or ""):
        raise HTTPException(
            status_code=400, detail="Target image must be a JPG or PNG file")

    # Create DB record (processing)
    record = ProcessRecord(
        status=ProcessStatus.processing,
        created_at=datetime.utcnow(),
        output_prefix=output_prefix or "result",
        source_image_path="",
        target_image_path="",
        result_image_path=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        # Save original uploads to disk first
        source_path = _save_upload_to_disk(
            source_image, INPUT_DIR, f"source_{record.id}")
        target_path = _save_upload_to_disk(
            target_image, INPUT_DIR, f"target_{record.id}")
        record.source_image_path = source_path
        record.target_image_path = target_path
        db.commit()

        # Read and validate images from bytes (for processing)
        source_image.file.seek(0)
        target_image.file.seek(0)
        source_content = await source_image.read()
        target_content = await target_image.read()

        # Convert bytes to OpenCV images
        source_np = bytes_to_image(source_content)
        target_np = bytes_to_image(target_content)

        if source_np is None:
            raise HTTPException(
                status_code=400, detail="Could not read source image")
        if target_np is None:
            raise HTTPException(
                status_code=400, detail="Could not read target image")

        # Perform face swap
        result = face_swapper.swap_face(
            source_np, target_np, target_input=target_index)

        # Save the result with a unique filename
        output_filename = f"{output_prefix}_{record.id}_{uuid.uuid4().hex}"
        output_path = save_image(
            result,
            output_dir=OUTPUT_DIR,
            prefix=output_filename,
            extension="jpg"
        )

        # Update DB record as completed
        record.result_image_path = output_path
        record.status = ProcessStatus.completed
        record.finished_at = datetime.utcnow()
        db.commit()

        # Return the URL to the generated image and process id
        return {
            "status": "success",
            "process_id": record.id,
            "result_url": f"/output/{os.path.basename(output_path)}",
            "message": "Face swap completed successfully"
        }

    except HTTPException:
        # Mark record failed and re-raise
        record.status = ProcessStatus.failed
        record.finished_at = datetime.utcnow()
        db.commit()
        raise
    except Exception as e:
        record.status = ProcessStatus.failed
        record.finished_at = datetime.utcnow()
        db.commit()
        raise HTTPException(
            status_code=500, detail=f"Error processing images: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
