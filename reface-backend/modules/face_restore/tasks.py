import time
from celery_app import celery_app
from core.database import SessionLocal
from core.models import JobRecord, JobMetadataRecord, StorageRecord, JobStorageRecord
from core.image_utils import bytes_to_image, image_to_bytes
from modules.face_restore.service import FaceRestoreService
from modules.storage.service import s3_client
from sqlalchemy.sql import func


@celery_app.task(bind=True, max_retries=3, name="process_face_restore", autoretry_for=(OSError, ConnectionError))
def process_face_restore_task(self, process_id: int):
    db = SessionLocal()
    job = None
    try:
        job = db.query(JobRecord).filter(JobRecord.id == process_id).first()
        if not job:
            return

        job.status = "processing"
        db.commit()

        link = (
            db.query(JobStorageRecord, StorageRecord)
            .join(StorageRecord, JobStorageRecord.storage_id == StorageRecord.id)
            .filter(JobStorageRecord.job_id == job.id, JobStorageRecord.role == "source")
            .first()
        )

        if not link:
            raise ValueError("Source image not found in storage")

        _, st = link
        source_bytes = s3_client.download_bytes(st.key)
        source_img = bytes_to_image(source_bytes)

        restorer = FaceRestoreService()
        result = restorer.restore_face(source_img)

        result_bytes = image_to_bytes(result)
        ts = int(time.time())
        result_key = f"output/restored_{process_id}/{ts}.jpg"

        s3_client.upload_bytes(result_bytes, result_key, "image/jpeg")

        st_result = StorageRecord(
            key=result_key,
            original_filename=f"restored_{process_id}.jpg",
            content_type="image",
            file_type="image/jpeg",
            file_size=len(result_bytes),
            md5_hash=s3_client.md5_hash(result_bytes),
        )
        db.add(st_result)
        db.commit()
        db.refresh(st_result)

        link_result = JobStorageRecord(
            job_id=job.id,
            storage_id=st_result.id,
            role="result",
        )
        db.add(link_result)

        job.status = "completed"
        job.finished_at = func.now()
        db.commit()

    except (ValueError, RuntimeError) as exc:
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            job.finished_at = func.now()
            db.commit()
        raise

    except Exception as exc:
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            job.finished_at = func.now()
            db.commit()
        raise self.retry(exc=exc, countdown=5)

    finally:
        db.close()
