import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ChallengeModel } from '../models/challenge.model';

const router = Router();

router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const filter = includeInactive ? {} : { active: true };

  const challenges = await ChallengeModel.find(filter).sort({ createdAt: -1 });
  res.json(challenges);
});

router.get('/:id', async (req, res) => {
  try {
    const challenge = await ChallengeModel.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    return res.json(challenge);
  } catch (_error) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, description, datasetCollection, expectedResult, baselineQuery } = req.body;

  if (!title || !description || !datasetCollection || expectedResult === undefined || !baselineQuery) {
    return res.status(400).json({
      message:
        'Missing required fields: title, description, datasetCollection, expectedResult, baselineQuery',
    });
  }

  const challenge = await ChallengeModel.create(req.body);
  return res.status(201).json(challenge);
});

export default router;
