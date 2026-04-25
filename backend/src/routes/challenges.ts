import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import * as ChallengesController from '../controllers/challenges.controller';

const router = Router();

router.get('/', ChallengesController.getChallenges);
router.get('/:id/schema', ChallengesController.getChallengeSchema);
router.get('/:id', ChallengesController.getChallengeById);
router.post('/', requireAuth, requireRole('admin'), ChallengesController.createNewChallenge);

export default router;
