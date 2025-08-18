import { Router } from 'express';
import multer from 'multer';
import { 
  createImageProcess, 
  listImageProcesses, 
  getImageProcess, 
  updateImageProcess, 
  deleteImageProcess 
} from '../controllers/process-image.controller';
import { authenticate } from '../middlewares/auth.middleware';

// Use memory storage; controller writes to disk
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// List and get
router.use(authenticate);
router.get('', listImageProcesses);
router.get('/:id', getImageProcess);

// Create
router.post(
  '',
  upload.fields([
    { name: 'source_image', maxCount: 1 },
    { name: 'target_image', maxCount: 1 },
  ]),
  createImageProcess
);

// Update (allow optional file re-uploads)
router.put(
  '/:id',
  upload.fields([
    { name: 'source_image', maxCount: 1 },
    { name: 'target_image', maxCount: 1 },
    { name: 'result_image', maxCount: 1 },
  ]),
  updateImageProcess
);

router.patch(
  '/:id',
  upload.fields([
    { name: 'source_image', maxCount: 1 },
    { name: 'target_image', maxCount: 1 },
    { name: 'result_image', maxCount: 1 },
  ]),
  updateImageProcess
);

// Delete
router.delete('/:id', deleteImageProcess);

export default router;
