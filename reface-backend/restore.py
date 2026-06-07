from modules.face_restore.service import FaceRestoreService


if __name__ == "__main__":
    restorer = FaceRestoreService()

    restorer.restore(
        image_path="uploads/output/result_8.jpg",
        output_path="uploads/output/result_restored_8.jpg",
    )
