"""
Image processing utilities for the face swap application.
"""
import os
import cv2
import numpy as np
from typing import Tuple, Optional, Union

def load_image(file_path: str) -> Optional[np.ndarray]:
    """
    Load an image from the given file path.
    
    Args:
        file_path: Path to the image file
        
    Returns:
        np.ndarray: Loaded image as a numpy array, or None if loading fails
    """
    if not os.path.exists(file_path):
        return None
    return cv2.imread(file_path)

def save_image(
    image: np.ndarray, 
    output_dir: str = 'output', 
    prefix: str = 'result',
    extension: str = 'jpg'
) -> str:
    """
    Save an image to the specified directory with a unique filename.
    
    Args:
        image: Image to save as a numpy array
        output_dir: Directory to save the image in
        prefix: Prefix for the output filename
        extension: File extension (without the dot)
        
    Returns:
        str: Path to the saved image
    """
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{prefix}.{extension}"
    output_path = os.path.join(output_dir, filename)
    cv2.imwrite(output_path, image)
    return output_path

def bytes_to_image(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Convert image bytes to a numpy array.
    
    Args:
        image_bytes: Image data as bytes
        
    Returns:
        np.ndarray: Image as a numpy array, or None if conversion fails
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception:
        return None

def is_valid_image_extension(filename: str) -> bool:
    """
    Check if the filename has a valid image extension.
    
    Args:
        filename: Name of the file to check
        
    Returns:
        bool: True if the extension is valid, False otherwise
    """
    valid_extensions = {'.jpg', '.jpeg', '.png'}
    return any(filename.lower().endswith(ext) for ext in valid_extensions)

def ensure_directory_exists(directory: str) -> None:
    """
    Ensure that the specified directory exists, creating it if necessary.
    
    Args:
        directory: Path to the directory
    """
    os.makedirs(directory, exist_ok=True)
