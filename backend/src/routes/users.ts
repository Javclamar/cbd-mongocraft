import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as UsersController from '../controllers/users.controller';

const router = Router();

router.get('/leaderboard', UsersController.getLeaderboard);
router.get('/leaderboard/global', UsersController.getGlobalLeaderboard);
router.get('/leaderboard/me', requireAuth, UsersController.getMyLeaderboard);
router.get('/leaderboard/me/context', requireAuth, UsersController.getMyLeaderboardContext);

export default router;
