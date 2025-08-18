import { Router } from 'express';
import { facebookAuth, facebookAuthCallback, refreshToken } from '../controllers/auth.controller';

const router = Router();

router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookAuthCallback);
router.post('/refresh-token', refreshToken);

export default router;
