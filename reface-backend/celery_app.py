import ssl
from celery import Celery
from core.config import settings


celery_app = Celery(
    "reface",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "modules.face_swap.tasks",
        "modules.face_restore.tasks",
    ],
)

# Explicitly set cert_reqs to NONE
ssl_skip_verify = {
    'ssl_cert_reqs': ssl.CERT_NONE
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_use_ssl=ssl_skip_verify,
    redis_backend_use_ssl=ssl_skip_verify
)
