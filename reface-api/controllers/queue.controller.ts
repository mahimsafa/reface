import { Request, Response } from 'express';
import { addToQueue } from '../services/queue.service';

interface QueueRequest {
  id: number;
  sourceImage: string;
  targetImage: string;
  sourceIndex?: number;
  targetIndex?: number;
  outputPrefix?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  processStartedAt?: string | null;
  processEndedAt?: string | null;
  timestamp?: string;
  [key: string]: any;
}

export const addToProcessingQueue = async (req: Request, res: Response) => {
  try {
    const { id, sourceImage, targetImage, outputPrefix, sourceIndex = 0, targetIndex = 0, ...rest } = req.body as QueueRequest;
    
    if (!id || !sourceImage || !targetImage || sourceIndex === undefined || targetIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, sourceImage, targetImage, sourceIndex, and targetIndex are required',
        missingFields: [
          ...(!id ? ['id'] : []),
          ...(!sourceImage ? ['sourceImage'] : []),
          ...(!targetImage ? ['targetImage'] : []),
          ...(sourceIndex === undefined ? ['sourceIndex'] : []),
          ...(targetIndex === undefined ? ['targetIndex'] : [])
        ]
      });
    }

    const timestamp = new Date().toISOString();
    const message = {
      id,
      sourceImage,
      targetImage,
      sourceIndex: Number(sourceIndex) || 0,
      targetIndex: Number(targetIndex) || 0,
      outputPrefix: outputPrefix || 'result',
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...rest,
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
        processId: message.id,
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
