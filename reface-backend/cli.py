"""
CLI for testing face swap and face restore locally.
Uses the same service classes as the API and worker.

Examples:
    python cli.py swap --source face.jpg --target person.jpg --output result.jpg
    python cli.py swap --source face.jpg --target person.jpg --restore --output result.jpg
    python cli.py restore --image blurry.jpg --output restored.jpg
"""
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.image_utils import load_image, save_image, ensure_bgr
from core.config import settings


def cmd_swap(args):
    from modules.face_swap.service import FaceSwapService

    print(f"Loading source: {args.source}")
    source = load_image(args.source)
    print(f"Loading target: {args.target}")
    target = load_image(args.target)

    print("Initializing face swap model...")
    swapper = FaceSwapService(model_path=settings.MODEL_PATH)
    print("Running face swap...")
    result = swapper.swap_face(
        source, target,
        source_index=args.source_index,
        target_index=args.target_index,
        source_path=args.source,
        target_path=args.target,
    )

    if args.restore:
        print("Running face restoration on result...")
        from modules.face_restore.service import FaceRestoreService
        restorer = FaceRestoreService()
        result = restorer.restore_face(result)

    save_image(result, args.output)
    print(f"Saved result to {args.output}")


def cmd_restore(args):
    from modules.face_restore.service import FaceRestoreService

    print(f"Loading image: {args.image}")
    image = load_image(args.image)

    print("Initializing restoration model...")
    restorer = FaceRestoreService()
    print("Running face restoration...")
    result = restorer.restore_face(image)

    save_image(result, args.output)
    print(f"Saved result to {args.output}")


def cmd_detect(args):
    import cv2
    from insightface.app import FaceAnalysis

    print(f"Loading image: {args.image}")
    image = load_image(args.image)
    image = ensure_bgr(image)
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = image.shape[:2]
    print(f"Image size: {w}x{h}, {image.shape[2]} channels")

    print(f"Initializing detector (download={args.download})...")
    detector = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"],
        download=args.download,
        download_zip=args.download,
    )
    detector.prepare(ctx_id=0, det_size=(640, 640))

    print("Detecting faces...")
    faces = detector.get(rgb)
    print(f"Found {len(faces)} face(s)")
    for i, face in enumerate(faces):
        bbox = face.bbox.astype(int)
        print(f"  Face {i}: bbox=[{bbox[0]}, {bbox[1]}, {bbox[2]}, {bbox[3]}], det_score={face.det_score:.3f}")

    if args.output and len(faces) > 0:
        for i, face in enumerate(faces):
            bbox = face.bbox.astype(int)
            cv2.rectangle(image, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
        save_image(image, args.output)
        print(f"Annotated image saved to {args.output}")


def main():
    parser = argparse.ArgumentParser(description="Reface CLI - Face swap and restore")
    sub = parser.add_subparsers(dest="command", required=True)

    # swap
    p = sub.add_parser("swap", help="Swap face from source onto target")
    p.add_argument("--source", required=True, help="Source image path (face to copy)")
    p.add_argument("--target", required=True, help="Target image path (face to replace)")
    p.add_argument("--output", default="output_swap.jpg", help="Output path")
    p.add_argument("--restore", action="store_true", help="Apply face restoration after swap")
    p.add_argument("--source-index", type=int, default=0, help="Face index in source")
    p.add_argument("--target-index", type=int, default=0, help="Face index in target")

    # restore
    p = sub.add_parser("restore", help="Restore/enhance faces in an image")
    p.add_argument("--image", required=True, help="Image path")
    p.add_argument("--output", default="output_restore.jpg", help="Output path")

    # detect
    p = sub.add_parser("detect", help="Detect faces in an image (diagnostic)")
    p.add_argument("--image", required=True, help="Image path")
    p.add_argument("--output", help="Save annotated image with bounding boxes")
    p.add_argument("--download", action="store_true", help="Download model if missing")

    args = parser.parse_args()

    if args.command == "swap":
        cmd_swap(args)
    elif args.command == "restore":
        cmd_restore(args)
    elif args.command == "detect":
        cmd_detect(args)


if __name__ == "__main__":
    main()
