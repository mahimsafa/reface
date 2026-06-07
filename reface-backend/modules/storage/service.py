import uuid
import hashlib
import threading
from core.config import settings

try:
    import boto3
except ImportError:
    boto3 = None


class S3Client:
    def __init__(self):
        self._client = None
        self._lock = threading.Lock()
        self.bucket = settings.S3_BUCKET_NAME
        self.public_url = settings.S3_PUBLIC_URL

    def _ensure_client(self):
        if self._client is None:
            with self._lock:
                if self._client is None:
                    if boto3 is None:
                        raise ImportError("boto3 is required for S3 storage")
                    if not settings.S3_ENDPOINT_URL:
                        raise ValueError("S3_ENDPOINT_URL is not configured")
                    self._client = boto3.client(
                        "s3",
                        endpoint_url=settings.S3_ENDPOINT_URL,
                        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                        region_name=settings.S3_REGION,
                    )

    def upload_bytes(self, data: bytes, key: str, content_type: str) -> str:
        self._ensure_client()
        self._client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key

    def download_bytes(self, key: str) -> bytes:
        self._ensure_client()
        resp = self._client.get_object(Bucket=self.bucket, Key=key)
        return resp["Body"].read()

    def delete_object(self, key: str):
        self._ensure_client()
        self._client.delete_object(Bucket=self.bucket, Key=key)

    def public_url_for(self, key: str) -> str:
        if self.public_url:
            return f"{self.public_url}/{key}"
        return key

    def generate_key(self, ext: str = ".jpg") -> str:
        return f"{uuid.uuid4().hex}{ext}"

    @staticmethod
    def md5_hash(data: bytes) -> str:
        return hashlib.md5(data).hexdigest()


s3_client = S3Client()
