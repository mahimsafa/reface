import { Router } from 'express';
import { addToProcessingQueue, getQueueStatus } from '../controllers/queue.controller';

const router = Router();

// Add a new process to the queue
router.post('/process', addToProcessingQueue);

// Get queue status
router.get('/status', getQueueStatus);

export default router;
