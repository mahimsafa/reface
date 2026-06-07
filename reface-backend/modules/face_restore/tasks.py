from celery_app import celery_app
from core.database import SessionLocal
from core.models import ProcessRecord
from core.config import settings
from core.image_utils import load_image, save_image, ensure_dir
from modules.face_restore.service import FaceRestoreService
import os
from sqlalchemy.sql import func


@celery_app.task(bind=True, max_retries=3, name="process_face_restore", autoretry_for=(OSError, ConnectionError))
def process_face_restore_task(self, process_id: int, source_path: str):
    db = SessionLocal()
    record = None
    try:
        record = db.query(ProcessRecord).filter(ProcessRecord.id == process_id).first()
        if not record:
            return

        record.status = "processing"
        db.commit()

        source_img = load_image(source_path)

        restorer = FaceRestoreService()
        result = restorer.restore_face(source_img)

        ensure_dir(settings.OUTPUT_DIR)
        output_filename = f"restored_{process_id}.jpg"
        output_path = os.path.join(settings.OUTPUT_DIR, output_filename)
        save_image(result, output_path)

        relative_path = os.path.join("uploads", "output", output_filename)
        record.result_image = relative_path
        record.status = "completed"
        record.finished_at = func.now()
        db.commit()

    except (ValueError, RuntimeError) as exc:
        if record:
            record.status = "failed"
            record.error_message = str(exc)
            record.finished_at = func.now()
            db.commit()
        raise

    except Exception as exc:
        if record:
            record.status = "failed"
            record.error_message = str(exc)
            record.finished_at = func.now()
            db.commit()
        raise self.retry(exc=exc, countdown=5)

    finally:
        db.close()
