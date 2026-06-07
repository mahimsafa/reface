import os
import cv2
import numpy as np


def ensure_bgr(image: np.ndarray) -> np.ndarray:
    if image is None:
        raise ValueError("Image is None")
    if len(image.shape) == 3 and image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    elif len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    return image


def load_image(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Failed to load image: {path}")
    return img


def save_image(image: np.ndarray, path: str):
    dirname = os.path.dirname(path)
    if dirname:
        ensure_dir(dirname)
    success = cv2.imwrite(path, image)
    if not success:
        raise ValueError(f"Failed to save image: {path}")


def bytes_to_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image from bytes")
    return img


def image_to_bytes(image: np.ndarray, ext: str = ".jpg") -> bytes:
    success, buffer = cv2.imencode(ext, image)
    if not success:
        raise ValueError("Failed to encode image")
    return buffer.tobytes()


def ensure_dir(path: str):
    if path:
        os.makedirs(path, exist_ok=True)


def is_valid_extension(filename: str) -> bool:
    valid = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(filename)[1].lower()
    return ext in valid
