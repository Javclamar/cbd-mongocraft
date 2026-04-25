import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/logout-all', requireAuth, AuthController.logoutAll);
router.get('/me', requireAuth, AuthController.me);

export default router;
