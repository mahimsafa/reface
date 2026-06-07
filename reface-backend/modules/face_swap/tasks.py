from celery_app import celery_app
from core.database import SessionLocal
from core.models import ProcessRecord
from core.config import settings
from core.image_utils import load_image, save_image, ensure_dir
from modules.face_swap.service import FaceSwapService
import os
from sqlalchemy.sql import func


@celery_app.task(bind=True, max_retries=3, name="process_face_swap", autoretry_for=(OSError, ConnectionError))
def process_face_swap_task(self, process_id: int, source_path: str, target_path: str, restore: bool = False):
    db = SessionLocal()
    record = None
    try:
        record = db.query(ProcessRecord).filter(ProcessRecord.id == process_id).first()
        if not record:
            return

        record.status = "processing"
        db.commit()

        source_img = load_image(source_path)
        target_img = load_image(target_path)

        swapper = FaceSwapService(model_path=settings.MODEL_PATH)
        result = swapper.swap_face(source_img, target_img, source_path=source_path, target_path=target_path)

        if restore:
            from modules.face_restore.service import FaceRestoreService
            restorer = FaceRestoreService()
            result = restorer.restore_face(result)

        ensure_dir(settings.OUTPUT_DIR)
        output_filename = f"result_{process_id}.jpg"
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
