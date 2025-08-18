import { Router } from 'express';
import multer from 'multer';
import { 
  createImageProcess, 
  listImageProcesses, 
  getImageProcess, 
  updateImageProcess, 
  deleteImageProcess 
} from '../controllers/process-image.controller';

// Use memory storage; controller writes to disk
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// List and get
router.get('/image-processes', listImageProcesses);
router.get('/image-processes/:id', getImageProcess);

// Create
router.post(
  '/image-processes',
  upload.fields([
    { name: 'source_image', maxCount: 1 },
    { name: 'target_image', maxCount: 1 },
  ]),
  createImageProcess
);

// Update (allow optional file re-uploads)
router.put(
  '/image-processes/:id',
  upload.fields([
    { name: 'source_image', maxCount: 1 },
    { name: 'target_image', maxCount: 1 },
    { name: 'result_image', maxCount: 1 },
  ]),
  updateImageProcess
);

router.patch(
  '/image-processes/:id',
  upload.fields([
    { name: 'source_image', maxCount: 1 },
    { name: 'target_image', maxCount: 1 },
    { name: 'result_image', maxCount: 1 },
  ]),
  updateImageProcess
);

// Delete
router.delete('/image-processes/:id', deleteImageProcess);

export default router;
