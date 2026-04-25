import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import * as AdminController from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/summary', AdminController.getSummary);
router.get('/users', AdminController.getUsers);
router.get('/challenges', AdminController.getChallenges);
router.post('/challenges', AdminController.postChallenge);
router.patch('/challenges/:id', AdminController.patchChallenge);
router.patch('/challenges/:id/active', AdminController.patchChallengeActive);
router.delete('/challenges/:id', AdminController.deleteChallenge);

export default router;
