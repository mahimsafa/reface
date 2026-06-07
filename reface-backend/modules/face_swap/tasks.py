from celery_app import celery_app
from core.config import settings
from core.database import SessionLocal
from core.models import JobRecord, JobMetadataRecord, StorageRecord, JobStorageRecord
from core.image_utils import bytes_to_image, image_to_bytes
from modules.face_swap.service import FaceSwapService
from modules.storage.service import s3_client
from sqlalchemy.sql import func


@celery_app.task(bind=True, max_retries=3, name="process_face_swap", autoretry_for=(OSError, ConnectionError))
def process_face_swap_task(self, process_id: int):
    db = SessionLocal()
    job = None
    try:
        job = db.query(JobRecord).filter(JobRecord.id == process_id).first()
        if not job:
            return

        job.status = "processing"
        db.commit()

        links = (
            db.query(JobStorageRecord, StorageRecord)
            .join(StorageRecord, JobStorageRecord.storage_id == StorageRecord.id)
            .filter(JobStorageRecord.job_id == job.id)
            .all()
        )

        source_bytes = None
        source_key = None
        target_bytes = None
        target_key = None
        for link, st in links:
            data = s3_client.download_bytes(st.key)
            if link.role == "source":
                source_bytes = data
                source_key = st.key
            elif link.role == "target":
                target_bytes = data
                target_key = st.key

        if source_bytes is None:
            raise ValueError(f"Source image not found in storage for job {process_id}")
        if target_bytes is None:
            raise ValueError(f"Target image not found in storage for job {process_id}")

        source_img = bytes_to_image(source_bytes)
        target_img = bytes_to_image(target_bytes)

        meta = db.query(JobMetadataRecord).filter(JobMetadataRecord.job_id == job.id).first()
        restore = meta.payload.get("restore_enabled", False) if meta else False

        swapper = FaceSwapService(model_path=settings.MODEL_PATH)
        try:
            result = swapper.swap_face(source_img, target_img, source_path=source_key, target_path=target_key)
        except ValueError as exc:
            raise ValueError(f"{exc} (source_key={source_key}, target_key={target_key})") from exc

        if restore:
            from modules.face_restore.service import FaceRestoreService
            restorer = FaceRestoreService()
            result = restorer.restore_face(result)

        result_bytes = image_to_bytes(result)
        ext = ".jpg"
        result_key = f"output/{process_id}{ext}"

        s3_client.upload_bytes(result_bytes, result_key, "image/jpeg")

        st = StorageRecord(
            key=result_key,
            original_filename=f"result_{process_id}{ext}",
            content_type="image",
            file_type="image/jpeg",
            file_size=len(result_bytes),
            md5_hash=s3_client.md5_hash(result_bytes),
        )
        db.add(st)
        db.commit()
        db.refresh(st)

        link = JobStorageRecord(
            job_id=job.id,
            storage_id=st.id,
            role="result",
        )
        db.add(link)

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
