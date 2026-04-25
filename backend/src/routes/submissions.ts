import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as SubmissionsController from '../controllers/submissions.controller';

const router = Router();

router.use(requireAuth);

router.get('/:id', SubmissionsController.getSubmissionById);
router.get('/', SubmissionsController.getSubmissions);
router.post('/', SubmissionsController.createNewSubmission);

export default router;
