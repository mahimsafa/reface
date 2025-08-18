import { Router } from 'express';
import { getUserProfile } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', getUserProfile);

export default router;