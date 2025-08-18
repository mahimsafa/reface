import { Router } from 'express';
import { facebookAuth, facebookAuthCallback } from '../controllers/auth.controller';

const router = Router();

router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookAuthCallback);

export default router;
