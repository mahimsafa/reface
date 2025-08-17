import os
import cv2
import insightface
from insightface.app import FaceAnalysis
import numpy as np
import warnings

class FaceSwap:
    def __init__(self, model_path: str = 'models/inswapper_128.onnx'):
        """
        Initialize the FaceSwap class with the path to the face swap model.
        
        Args:
            model_path (str): Path to the inswapper model file
        """
        self.model_path = model_path
        self.detector = None
        self.swapper = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize face detection and swapping models."""
        # Initialize face detection model
        with self._suppress_output():
            self.detector = FaceAnalysis(
                name='buffalo_l', 
                providers=['CPUExecutionProvider'], 
                download=False, 
                download_zip=False
            )
            self.detector.prepare(ctx_id=0, det_size=(640, 640))
            
            # Initialize face swapper model
            self.swapper = insightface.model_zoo.get_model(
                self.model_path,
                download=False,
                download_onnx=False
            )
    
    @staticmethod
    def _suppress_output():
        """Context manager to suppress output from model loading."""
        # Import here to avoid circular import
        import sys
        from io import StringIO
        from contextlib import contextmanager
        
        @contextmanager
        def suppress_stdout():
            save_stdout = sys.stdout
            sys.stdout = StringIO()
            warnings.filterwarnings('ignore')
            try:
                yield
            finally:
                sys.stdout = save_stdout
                
        return suppress_stdout()
    
    def swap_face(
        self, 
        source_image: np.ndarray, 
        target_image: np.ndarray,
        target_input: int = 0,
        source_input: int = 0,
    ) -> np.ndarray:
        """
        Swap faces between source and target images.
        
        Args:
            source_image (np.ndarray): Source image (BGR format)
            target_image (np.ndarray): Target image (BGR format)
            
        Returns:
            np.ndarray: Resulting image with swapped face (BGR format)
            
        Raises:
            ValueError: If no faces are detected in either image
        """
        # Convert images to RGB for processing
        source_rgb = source_image[:, :, ::-1]
        target_rgb = target_image[:, :, ::-1]
        
        # Detect faces
        source_faces = self.detector.get(source_rgb)
        target_faces = self.detector.get(target_rgb)
        
        # Check if faces are detected
        if not source_faces:
            raise ValueError("No faces detected in the source image")
        if not target_faces:
            raise ValueError("No faces detected in the target image")
        
        # Get the first face from each image
        if target_input >= len(target_faces):
            target_input = 0
        if source_input >= len(source_faces):
            source_input = 0
        source_face = source_faces[source_input]
        target_face = target_faces[target_input]
        
        # Perform face swap
        result = target_rgb.copy()
        result = self.swapper.get(
            result,
            target_face=target_face,
            source_face=source_face,
            paste_back=True
        )
        
        # Convert back to BGR for OpenCV
        return result[:, :, ::-1]
    
    @staticmethod
    def save_image(
        image: np.ndarray, 
        prefix: str, 
        output_dir: str = 'output'
    ) -> str:
        """
        Save an image with an auto-incrementing filename.
        
        Args:
            image (np.ndarray): Image to save (BGR format)
            prefix (str): Prefix for the output filename
            output_dir (str): Directory to save the image in
            
        Returns:
            str: Path to the saved image
        """
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Find the next available counter
        max_counter = -1
        base_filename = f'{prefix}.jpg'
        
        # Check base filename
        if os.path.exists(os.path.join(output_dir, base_filename)):
            max_counter = 0
        
        # Check numbered files
        for filename in os.listdir(output_dir):
            if filename.startswith(f'{prefix}-') and filename.endswith('.jpg'):
                try:
                    # Extract counter (e.g., 'result-42.jpg' -> 42)
                    counter = int(filename[len(prefix)+1:-4])
                    max_counter = max(max_counter, counter)
                except (ValueError, IndexError):
                    continue
        
        # Determine filename
        if max_counter == -1:
            filename = base_filename
        else:
            filename = f'{prefix}-{max_counter + 1}.jpg'
        
        # Save the image
        output_path = os.path.join(output_dir, filename)
        cv2.imwrite(output_path, image)
        return output_path