import amqp, { Channel, Connection, Options } from 'amqplib';

type QueueMessage = {
  id: number;
  sourceImage: string;
  targetImage: string;
  outputPrefix: string;
  sourceIndex: number;
  targetIndex: number;
  status: string;
  [key: string]: any;
};

class QueueService {
  private static instance: QueueService;
  private channel: Channel | null = null;
  private connection: Connection | null = null;
  private readonly QUEUE_NAME = 'image_processing_queue';
  private readonly RABBITMQ_URL: string;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  private constructor() {
    this.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private async ensureConnection(): Promise<Channel> {
    if (this.channel) return this.channel;
    if (this.isConnecting) {
      // Wait for the connection to be established
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.channel) {
            resolve(this.channel);
          } else if (!this.isConnecting) {
            reject(new Error('Failed to establish connection'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    return this.initialize();
  }

  public async initialize(): Promise<Channel> {
    if (this.channel) return this.channel;
    if (this.isConnecting) return this.ensureConnection();

    this.isConnecting = true;
    
    try {
      const url = new URL(this.RABBITMQ_URL);
      const options: Options.Connect = {
        protocol: 'amqp',
        hostname: url.hostname,
        port: parseInt(url.port) || 5672,
        username: url.username || 'guest',
        password: url.password || 'guest',
        heartbeat: 30, // 30 seconds heartbeat
      };

      console.log('Connecting to RabbitMQ...');
      // @ts-ignore
      this.connection = await amqp.connect(options);
      if (!this.connection) {
        throw new Error('Failed to create RabbitMQ connection');
      }
      
      // @ts-ignore
      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create RabbitMQ channel');
      }
      
      // Assert the queue with additional options
      await this.channel.assertQueue(this.QUEUE_NAME, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours TTL for messages
          'x-max-length': 10000, // Maximum number of messages in the queue
        },
      });
      
      console.log('Successfully connected to RabbitMQ and queue is ready');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      
      // Set up event handlers
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));
      
      // At this point, we know channel is not null due to the check above
      return this.channel;
    } catch (error) {
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.MAX_RECONNECT_ATTEMPTS) {
        console.warn(`Connection attempt ${this.reconnectAttempts} failed. Retrying in ${this.RECONNECT_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
        return this.initialize();
      }
      
      console.error('Max reconnection attempts reached. Please check your RabbitMQ server.');
      throw new Error(`Failed to connect to RabbitMQ after ${this.reconnectAttempts} attempts: ${error}`);
    } finally {
      this.isConnecting = false;
    }
  }
  
  private handleConnectionError(error: any): void {
    console.error('RabbitMQ connection error:', error);
    this.channel = null;
  }
  
  private async handleConnectionClose(): Promise<void> {
    console.log('RabbitMQ connection closed');
    this.channel = null;
    this.connection = null;
    
    // Attempt to reconnect if not already trying
    if (!this.isConnecting) {
      console.log('Attempting to reconnect to RabbitMQ...');
      await this.initialize();
    }
  }
  
  public async addToQueue(message: QueueMessage): Promise<boolean> {
    try {
      const channel = await this.ensureConnection();
      
      const messageString = JSON.stringify(message);
      const success = channel.sendToQueue(
        this.QUEUE_NAME,
        Buffer.from(messageString),
        {
          persistent: true,
          expiration: '86400000', // 24 hours TTL
          timestamp: Date.now(),
        } as Options.Publish
      );
      
      if (success) {
        console.log(`[${new Date().toISOString()}] Message added to queue:`, {
          processId: message.processId,
          queue: this.QUEUE_NAME,
        });
      } else {
        console.warn(`[${new Date().toISOString()}] Message not added to queue (backpressure):`, {
          processId: message.processId,
          queue: this.QUEUE_NAME,
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error adding message to queue:', error);
      throw error;
    }
  }
  
  public async closeConnection(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        // @ts-ignore
        await this.connection.close();
        this.connection = null;
      }
      console.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const queueService = QueueService.getInstance();

// Helper functions for backward compatibility
export const initializeQueue = (): Promise<Channel> => queueService.initialize();
export const addToQueue = (message: QueueMessage): Promise<boolean> => queueService.addToQueue(message);
export const closeConnection = (): Promise<void> => queueService.closeConnection();
