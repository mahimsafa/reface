IMAGE_PATH = "/Users/mahim/Downloads/Source/oishirony1.png"

import cv2
import insightface
from insightface.app import FaceAnalysis


class FaceDetector:
    def __init__(
        self,
        det_size=(640, 640),
        min_confidence=0.1,
    ):
        self.min_confidence = min_confidence

        self.app = FaceAnalysis(
            name="buffalo_l",
            allowed_modules=["detection"],
            providers=["CPUExecutionProvider"]
        )

        # ctx_id=-1 is recommended for CPU
        self.app.prepare(
            ctx_id=-1,
            det_size=det_size
        )

    def detect(self, image):
        faces = self.app.get(image)

        results = []

        for face in faces:
            if face.det_score < self.min_confidence:
                continue

            x1, y1, x2, y2 = face.bbox.astype(int)

            results.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": float(face.det_score),
                "landmarks": face.kps.tolist()
            })

        return results


def draw_faces(image, detections):
    output = image.copy()

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]

        cv2.rectangle(
            output,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        cv2.putText(
            output,
            f"{det['confidence']:.2f}",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

        for x, y in det["landmarks"]:
            cv2.circle(
                output,
                (int(x), int(y)),
                2,
                (0, 0, 255),
                -1
            )

    return output


if __name__ == "__main__":
    image_path = IMAGE_PATH

    image = cv2.imread(image_path)

    if image is None:
        raise FileNotFoundError(image_path)

    detector = FaceDetector(
        det_size=(640, 640),
        min_confidence=0.5
    )

    detections = detector.detect(image)

    print(f"Detected {len(detections)} face(s)")

    for i, face in enumerate(detections, start=1):
        print(f"\nFace #{i}")
        print("Bounding Box:", face["bbox"])
        print("Confidence:", face["confidence"])

    output = draw_faces(image, detections)

    cv2.imwrite("output.jpg", output)

    print("Saved output.jpg")