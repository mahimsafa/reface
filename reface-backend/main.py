#!/usr/bin/env python3
"""
Face Swapping Tool

This script allows swapping faces between two images using the FaceSwap class.
"""

import os
import argparse
from lib.face_swap import FaceSwap
from lib.image_utils import load_image, save_image

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Swap faces between two images.')
    
    # Required arguments
    parser.add_argument('source', help='Path to the source image (face to swap from)')
    parser.add_argument('target', help='Path to the target image (face to swap to)')
    
    # Optional arguments
    parser.add_argument('--output-dir', default='output', 
                       help='Directory to save the result (default: output)')
    parser.add_argument('--prefix', default='result',
                       help='Prefix for the output filename (default: result)')
    parser.add_argument('--model', default='models/inswapper_128.onnx',
                       help='Path to the face swap model (default: models/inswapper_128.onnx)')
    
    return parser.parse_args()

def main():
    """Main function to handle face swapping."""
    args = parse_arguments()
    
    try:
        # Initialize face swapper
        face_swapper = FaceSwap(model_path=args.model)
        
        # Load images
        source_image = load_image(args.source)
        target_image = load_image(args.target)
        
        if source_image is None:
            print(f"Error: Could not load source image '{args.source}'")
            return 1
        if target_image is None:
            print(f"Error: Could not load target image '{args.target}'")
            return 1
        
        # Perform face swap
        print(f"Swapping faces from '{args.source}' to '{args.target}'...")
        result = face_swapper.swap_face(source_image, target_image)
        
        # Save the result
        output_path = save_image(
            result, 
            output_dir=args.output_dir,
            prefix=args.prefix
        )
        
        print(f"Success! Result saved to: {os.path.abspath(output_path)}")
        return 0
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return 1

if __name__ == '__main__':
    exit(main())