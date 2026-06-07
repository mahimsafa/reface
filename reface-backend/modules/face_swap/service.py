import cv2
import numpy as np
from insightface.app import FaceAnalysis
from insightface.model_zoo import get_model


class FaceSwapService:
    def __init__(self, model_path: str = "models/inswapper_128.onnx"):
        self.model_path = model_path
        self.detector = None
        self.swapper = None
        self._initialize()

    def _initialize(self):
        self.detector = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
            download=False,
            download_zip=False,
        )
        self.detector.prepare(ctx_id=0, det_size=(640, 640))
        self.swapper = get_model(
            self.model_path,
            download=False,
            download_onnx=False,
        )

    def swap_face(
        self,
        source_image: np.ndarray,
        target_image: np.ndarray,
        source_index: int = 0,
        target_index: int = 0,
    ) -> np.ndarray:
        source_rgb = cv2.cvtColor(source_image, cv2.COLOR_BGR2RGB)
        target_rgb = cv2.cvtColor(target_image, cv2.COLOR_BGR2RGB)

        source_faces = self.detector.get(source_rgb)
        target_faces = self.detector.get(target_rgb)

        if len(source_faces) == 0:
            raise ValueError("No face found in source image")
        if len(target_faces) == 0:
            raise ValueError("No face found in target image")

        s_idx = min(source_index, len(source_faces) - 1) if source_index >= 0 else 0
        t_idx = min(target_index, len(target_faces) - 1) if target_index >= 0 else 0

        source_face = source_faces[s_idx]
        target_face = target_faces[t_idx]

        result = target_rgb.copy()
        result = self.swapper.get(result, target_face, source_face, paste_back=True)
        result = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)

        return result
