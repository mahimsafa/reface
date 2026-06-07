from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./reface.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    MODEL_PATH: str = "models/inswapper_128.onnx"
    CODEFORMER_PATH: str = "models/CodeFormer/codeformer.pth"
    UPLOAD_DIR: str = "uploads"
    OUTPUT_DIR: str = "uploads/output"
    IMAGES_DIR: str = "uploads/images"
    HOST: str = "0.0.0.0"
    PORT: int = 5000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
