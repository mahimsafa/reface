import json
import time
import logging
import pika
from pika.exceptions import AMQPConnectionError, ChannelClosedByBroker

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

    def process_message(self, ch, method, properties, body):
        """Process incoming message from the queue"""
        try:
            message = json.loads(body)
            logger.info(f"Received message")
            print(message)
            # TODO: Implement your actual image processing logic here
            # Example:
            # result = process_images(
            #     message['sourceImage'],
            #     message['targetImage'],
            #     message.get('outputPrefix', 'output')
            # )
            
            # Simulate processing time
            # for i in range(5):
            #     logger.info(f"Processing message {message['processId']}... {i+1}/5")
            #     time.sleep(1)
            # Acknowledge the message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            logger.info(f"Successfully processed")
            
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
