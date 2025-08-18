import { Request, Response } from 'express';
import { addToQueue } from '../services/queue.service';

interface QueueRequest {
  processId: string;
  sourceImage: string;
  targetImage: string;
  outputPrefix?: string;
  [key: string]: any;
}

export const addToProcessingQueue = async (req: Request, res: Response) => {
  try {
    const { processId, sourceImage, targetImage, outputPrefix, ...rest } = req.body as QueueRequest;
    
    if (!processId || !sourceImage || !targetImage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: processId, sourceImage, and targetImage are required',
      });
    }

    const message = {
      processId,
      sourceImage,
      targetImage,
      outputPrefix: outputPrefix || `process_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...rest, // Include any additional fields
    };

    const success = await addToQueue(message);

    if (!success) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Failed to add process to queue. Please try again.',
        retryable: true,
      });
    }

    return res.status(202).json({
      success: true,
      message: 'Process added to queue',
      data: {
        processId: message.processId,
        status: 'queued',
        timestamp: message.timestamp,
      },
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Queue processing error:', error);
    
    // Determine appropriate status code
    const statusCode = error instanceof Error && 'statusCode' in error 
      ? (error as any).statusCode 
      : 500;
      
    // Prepare error response
    const errorResponse: any = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined,
        details: error
      }),
    };
    
    return res.status(statusCode).json(errorResponse);
  }
};

export const getQueueStatus = async (req: Request, res: Response) => {
  try {
    // In a real implementation, you might want to get queue stats
    // For now, we'll just return a simple status
    return res.json({
      success: true,
      status: 'operational',
      message: 'Queue service is running',
    });
  } catch (error) {
    console.error('Queue status check error:', error);
    
    const statusCode = error instanceof Error && 'statusCode' in error 
      ? (error as any).statusCode 
      : 500;
      
    return res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get queue status',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined
      }),
    });
  }
};
