import cv2
import torch
import numpy as np

from abc import ABC, abstractmethod

from basicsr.archs.rrdbnet_arch import RRDBNet
from facexlib.utils.face_restoration_helper import FaceRestoreHelper
from realesrgan import RealESRGANer

from modules.face_restore.codeformer_arch import CodeFormer


class BaseRestorer(ABC):
    @abstractmethod
    def restore_face(self, image: np.ndarray) -> np.ndarray:
        ...


class CodeFormerRestorer(BaseRestorer):
    def __init__(self, fidelity=0.7, upscale=2):
        self.fidelity = fidelity
        self.upscale = upscale

        self.device = (
            "mps"
            if torch.backends.mps.is_available()
            else "cpu"
        )

        self.net = CodeFormer(
            dim_embd=512,
            codebook_size=1024,
            n_head=8,
            n_layers=9,
            connect_list=["32", "64", "128", "256"]
        ).to(self.device)

        checkpoint = torch.load(
            "models/codeformer-v0.1.0.pth",
            map_location=self.device
        )

        self.net.load_state_dict(checkpoint["params_ema"])
        self.net.eval()

        bg_model = RRDBNet(
            num_in_ch=3, num_out_ch=3, num_feat=64,
            num_block=23, num_grow_ch=32, scale=2
        )

        model_url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth"
        self.bg_upsampler = RealESRGANer(
            scale=2,
            model_path=model_url,
            model=bg_model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False,
            device=self.device,
        )

    def restore_face(self, image: np.ndarray) -> np.ndarray:
        if len(image.shape) == 3 and image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
        elif len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        face_helper = FaceRestoreHelper(
            upscale_factor=self.upscale,
            face_size=512,
            crop_ratio=(1, 1),
            det_model="retinaface_resnet50",
            save_ext="png",
            use_parse=True,
            device=self.device,
        )

        face_helper.clean_all()
        face_helper.read_image(image)

        face_helper.get_face_landmarks_5(
            only_center_face=False,
            resize=640,
            eye_dist_threshold=5,
        )

        face_helper.align_warp_face()

        for cropped_face in face_helper.cropped_faces:
            face_tensor = (
                torch.from_numpy(cropped_face)
                .float()
                .permute(2, 0, 1)
                .unsqueeze(0)
                / 255.0
            )

            face_tensor = (face_tensor * 2 - 1).to(self.device)

            with torch.no_grad():
                restored_face = self.net(
                    face_tensor, w=self.fidelity, adain=True
                )[0]

            restored_face = (
                restored_face
                .squeeze(0)
                .permute(1, 2, 0)
                .cpu()
                .numpy()
            )

            restored_face = (
                ((restored_face + 1) / 2).clip(0, 1) * 255
            ).astype("uint8")

            face_helper.add_restored_face(restored_face)

        face_helper.get_inverse_affine(None)
        return face_helper.paste_faces_to_input_image()


class FaceRestoreService:
    def __init__(self, restorer: BaseRestorer | None = None):
        if restorer is not None:
            self.restorer = restorer
        else:
            self.restorer = CodeFormerRestorer()

    def restore_face(self, image: np.ndarray) -> np.ndarray:
        return self.restorer.restore_face(image)

    def restore(self, image_path: str, output_path: str):
        img = cv2.imread(image_path)
        result = self.restore_face(img)
        cv2.imwrite(output_path, result)
