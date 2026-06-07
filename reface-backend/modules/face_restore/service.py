import cv2
import numpy as np
from insightface.app import FaceAnalysis
from core.image_utils import ensure_bgr


class FaceRestoreService:
    def __init__(self):
        self.model = None
        self.detector = None
        self._initialize()

    def _initialize(self):
        self.detector = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
            download=False,
            download_zip=False,
        )
        self.detector.prepare(ctx_id=0, det_size=(640, 640))

        self._load_restoration_model()

    def _load_restoration_model(self):
        try:
            from gfpgan import GFPGANer
            self.model = GFPGANer(
                model_path="models/GFPGANv1.4.pth",
                upscale=1,
                arch="clean",
                channel_multiplier=2,
                bg_upsampler=None,
            )
        except ImportError:
            raise RuntimeError(
                "Face restoration requires gfpgan. Install with: pip install gfpgan"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to load restoration model: {e}")

    def restore_face(self, image: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Restoration model not initialized")

        image = ensure_bgr(image)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        try:
            _, _, restored = self.model.enhance(
                rgb,
                has_aligned=False,
                only_center_face=False,
                paste_back=True,
            )
            if restored is None:
                return image
            result = cv2.cvtColor(restored, cv2.COLOR_RGB2BGR)
            return result
        except Exception as e:
            raise RuntimeError(f"Face restoration failed: {e}")
