import json
import time
import logging
import pika
import os
import cv2
import numpy as np
from datetime import datetime
from pika.exceptions import AMQPConnectionError, ChannelClosedByBroker
from lib.face_swap import FaceSwap
from lib.image_utils import save_image, ensure_directory_exists
import requests

# Configure logging

logging.getLogger("pika").setLevel(logging.WARNING)

# Configure app’s logging normally
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ImageProcessingWorker:
    def __init__(self, connection_url):
        self.connection_url = connection_url
        self.connection = None
        self.channel = None
        self.queue_name = 'image_processing_queue'
        self.max_retries = 5
        self.retry_delay = 5  # seconds
        
        # Configuration
        self.model_path = "models/inswapper_128.onnx"
        self.output_dir = "output"
        self.input_dir = "images"
        
        # Ensure directories exist
        ensure_directory_exists(self.output_dir)
        ensure_directory_exists(self.input_dir)
        
        # Initialize face swapper
        try:
            self.face_swapper = FaceSwap(model_path=self.model_path)
            logger.info(f"Loaded face swap model from {self.model_path}")
        except Exception as e:
            logger.error(f"Error loading face swap model: {str(e)}")
            raise

    def connect(self):
        """Establish connection to RabbitMQ server"""
        retries = 0
        while retries < self.max_retries:
            try:
                parameters = pika.URLParameters(self.connection_url)
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                
                # Declare the queue to ensure it exists
                self.channel.queue_declare(
                    queue=self.queue_name,
                    durable=True,  # Make the queue persistent
                    arguments={
                        'x-message-ttl': 86400000,  # 24 hours TTL
                        'x-max-length': 10000,      # Max 10,000 messages
                    }
                )
                
                # Configure quality of service
                self.channel.basic_qos(prefetch_count=1)
                
                logger.info("Successfully connected to RabbitMQ")
                return True
                
            except (AMQPConnectionError, Exception) as e:
                retries += 1
                if retries >= self.max_retries:
                    logger.error(f"Failed to connect to RabbitMQ after {self.max_retries} attempts: {e}")
                    return False
                
                logger.warning(f"Connection attempt {retries} failed. Retrying in {self.retry_delay} seconds...")
                time.sleep(self.retry_delay)

    def download_image(self, url):
        """Download an image from a URL and return it as a numpy array"""
        import requests
        from io import BytesIO
        from PIL import Image
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Read image from response content
            image = Image.open(BytesIO(response.content))
            
            # Convert to RGB if needed (handles PNG with alpha channel)
            if image.mode != 'RGB':
                image = image.convert('RGB')
                
            # Convert to numpy array and BGR to RGB
            image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            return image_np
            
        except requests.RequestException as e:
            raise Exception(f"Failed to download image from {url}: {str(e)}")
        except Exception as e:
            raise Exception(f"Error processing image from {url}: {str(e)}")
            
    def get_image(self, image_path):
        """Get image from URL or local path"""
        if image_path.startswith(('http://', 'https://')):
            return self.download_image(image_path)
            
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
            
        # Read the image using OpenCV
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Failed to read image: {image_path}")
            
        # Convert from BGR to RGB (which is what our face swapper expects)
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    def update_process_status(self, process_id, status, result_image_path=None):
        """Update process status via API"""
        import requests
        
        url = f"http://localhost:5000/api/image-processes/{process_id}"
        data = {
            'status': status,
            'process_ended_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        files = {}
        if result_image_path and os.path.exists(result_image_path):
            files['result_image'] = (
                os.path.basename(result_image_path),
                open(result_image_path, 'rb'),
                'image/jpeg'
            )
        
        try:
            response = requests.patch(
                url,
                data=data,
                files=files if files else None
            )
            response.raise_for_status()
            logger.info(f"Successfully updated process {process_id} status to {status}")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to update process {process_id} status: {str(e)}")
            return False

    def process_message(self, ch, method, properties, body):
        """Process incoming message from the queue"""
        try:
            message = json.loads(body)
            process_id = message.get('id')
            if not process_id:
                raise ValueError("Missing process ID in message")
                
            logger.info(f"Processing message: {process_id}")
            
            try:
                # Get image URLs and download them
                base_url = "http://localhost:5000"
                source_url = f"{base_url}/{message['sourceImage'].lstrip('/')}"
                target_url = f"{base_url}/{message['targetImage'].lstrip('/')}"
                
                logger.info(f"Downloading source image from: {source_url}")
                logger.info(f"Downloading target image from: {target_url}")
                
                source_img = self.get_image(source_url)
                target_img = self.get_image(target_url)
                
                # Perform face swap
                logger.info(f"Swapping faces for process {process_id}")
                result_img = self.face_swapper.swap_face(
                    source_img, 
                    target_img, 
                    target_input=message.get('targetIndex', 0),
                    source_input=message.get('sourceIndex', 0)
                )
                
                # Save the result
                output_prefix = message.get('outputPrefix', 'result')
                output_filename = f"{output_prefix}_{process_id}_{int(time.time())}"
                output_path = save_image(
                    result_img,
                    output_dir=self.output_dir,
                    prefix=output_filename,
                    extension="jpg"
                )
                
                logger.info(f"Successfully processed process {process_id}. Result saved to: {output_path}")
                
                # Update process status to completed and upload result image
                if not self.update_process_status(process_id, 'completed', output_path):
                    logger.error(f"Failed to update process {process_id} status")
                
                # Acknowledge the message
                ch.basic_ack(delivery_tag=method.delivery_tag)
                
            except Exception as e:
                logger.error(f"Error processing message {process_id}: {str(e)}")
                # Try to update status to failed
                try:
                    self.update_process_status(process_id, 'failed')
                except Exception as update_err:
                    logger.error(f"Failed to update process {process_id} status to failed: {str(update_err)}")
                # Nack the message and don't requeue it
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            # Nack the message and don't requeue it
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def start_consuming(self):
        """Start consuming messages from the queue"""
        if not self.connect():
            return

        try:
            logger.info(f"Waiting for messages in queue: {self.queue_name}")
            self.channel.basic_consume(
                queue=self.queue_name,
                on_message_callback=self.process_message,
                auto_ack=False
            )
            
            self.channel.start_consuming()
            
        except KeyboardInterrupt:
            logger.info("Worker stopped by user")
        except Exception as e:
            logger.error(f"Error in consumer: {e}")
        finally:
            if self.connection and self.connection.is_open:
                self.connection.close()
            logger.info("Worker stopped")

def main():
    # Connection URL - you can also load this from environment variables
    connection_url = "amqp://admin:admin@localhost:5672"
    
    worker = ImageProcessingWorker(connection_url)
    worker.start_consuming()

if __name__ == "__main__":
    main()
