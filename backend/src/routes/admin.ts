import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ChallengeModel } from '../models/challenge.model';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';

const router = Router();

router.use(requireAuth, requireRole('admin'));

const parseIntWithBounds = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
};

const isValidObjectId = (value: string): boolean => Types.ObjectId.isValid(value);

router.get('/summary', async (_req, res) => {
  const [users, challenges, activeChallenges, submissions, pendingSubmissions] = await Promise.all([
    UserModel.countDocuments({}),
    ChallengeModel.countDocuments({}),
    ChallengeModel.countDocuments({ active: true }),
    SubmissionModel.countDocuments({}),
    SubmissionModel.countDocuments({ status: 'pending' }),
  ]);

  return res.json({
    users,
    challenges,
    activeChallenges,
    inactiveChallenges: challenges - activeChallenges,
    submissions,
    pendingSubmissions,
  });
});

router.get('/users', async (req, res) => {
  const page = parseIntWithBounds(req.query.page, 1, 1, 100000);
  const limit = parseIntWithBounds(req.query.limit, 20, 1, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    UserModel.find({})
      .select('-passwordHash -refreshSessions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    UserModel.countDocuments({}),
  ]);

  return res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get('/challenges', async (req, res) => {
  const page = parseIntWithBounds(req.query.page, 1, 1, 100000);
  const limit = parseIntWithBounds(req.query.limit, 20, 1, 100);
  const skip = (page - 1) * limit;

  const includeInactive = req.query.includeInactive !== 'false';
  const difficulty = req.query.difficulty;

  const filter: Record<string, unknown> = includeInactive ? {} : { active: true };

  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
    filter.difficulty = difficulty;
  }

  const [items, total] = await Promise.all([
    ChallengeModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChallengeModel.countDocuments(filter),
  ]);

  return res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/challenges', async (req, res) => {
  const { title, description, datasetCollection, baselineQuery } = req.body as {
    title?: string;
    description?: string;
    datasetCollection?: string;
    baselineQuery?: unknown;
  };

  if (!title || !description || !datasetCollection || !baselineQuery) {
    return res.status(400).json({
      message:
        'Missing required fields: title, description, datasetCollection, baselineQuery',
    });
  }

  const challenge = await ChallengeModel.create(req.body);
  return res.status(201).json(challenge);
});

router.patch('/challenges/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }

  const allowedFields = new Set([
    'title',
    'description',
    'difficulty',
    'points',
    'datasetCollection',
    'expectedResult',
    'baselineQuery',
    'tags',
    'notes',
    'active',
    'orderMatters',
  ]);

  const updates = Object.entries(req.body as Record<string, unknown>).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (allowedFields.has(key)) {
        acc[key] = value;
      }

      return acc;
    },
    {},
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No valid fields provided to update' });
  }

  const challenge = await ChallengeModel.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  return res.json(challenge);
});

router.patch('/challenges/:id/active', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body as { active?: unknown };

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }

  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active must be a boolean' });
  }

  const challenge = await ChallengeModel.findByIdAndUpdate(
    id,
    { active },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  return res.json(challenge);
});

router.delete('/challenges/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }

  const challenge = await ChallengeModel.findById(id);

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  challenge.active = false;
  await challenge.save();

  return res.json({
    message: 'Challenge deactivated',
    challenge,
  });
});

router.get('/submissions', async (req, res) => {
  const page = parseIntWithBounds(req.query.page, 1, 1, 100000);
  const limit = parseIntWithBounds(req.query.limit, 20, 1, 100);
  const skip = (page - 1) * limit;

  const status = req.query.status;
  const userId = req.query.userId;
  const challengeId = req.query.challengeId;

  const filter: Record<string, unknown> = {};

  if (status === 'pending' || status === 'evaluated' || status === 'error') {
    filter.status = status;
  }

  if (typeof userId === 'string' && userId) {
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    filter.userId = new Types.ObjectId(userId);
  }

  if (typeof challengeId === 'string' && challengeId) {
    if (!isValidObjectId(challengeId)) {
      return res.status(400).json({ message: 'Invalid challengeId' });
    }

    filter.challengeId = new Types.ObjectId(challengeId);
  }

  const [items, total] = await Promise.all([
    SubmissionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SubmissionModel.countDocuments(filter),
  ]);

  return res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get('/submissions/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid submission id' });
  }

  const submission = await SubmissionModel.findById(id);

  if (!submission) {
    return res.status(404).json({ message: 'Submission not found' });
  }

  return res.json(submission);
});

export default router;
