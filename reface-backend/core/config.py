from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./reface.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    MODEL_PATH: str = "models/inswapper_128.onnx"
    CODEFORMER_PATH: str = "models/codeformer-v0.1.0.pth"
    UPLOAD_DIR: str = "uploads"
    OUTPUT_DIR: str = "uploads/output"
    IMAGES_DIR: str = "uploads/images"
    HOST: str = "0.0.0.0"
    PORT: int = 5000

    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "auto"
    S3_BUCKET_NAME: str = "reface"
    S3_PUBLIC_URL: str = ""

    DEVICE: str = "cpu"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
