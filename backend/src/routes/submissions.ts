import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.middleware';
import { getSandboxDb } from '../config/db';
import { ChallengeModel } from '../models/challenge.model';
import { SubmissionModel } from '../models/submission.model';
import { evaluateChallengeSubmission, parseMongoQuery } from '../services/query-evaluator.service';
import { recomputeUserStats } from '../services/user-stats.service';
import { QueryPayload } from '../types/query';

const router = Router();

router.use(requireAuth);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown evaluation error';
};

router.get('/:id', async (req, res) => {
  try {
    const submission = await SubmissionModel.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const isOwner = submission.userId.toString() === req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You cannot access this submission' });
    }

    return res.json(submission);
  } catch (_error) {
    return res.status(400).json({ message: 'Invalid submission id' });
  }
});

router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    SubmissionModel.find({ userId: new Types.ObjectId(req.user.userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SubmissionModel.countDocuments({ userId: new Types.ObjectId(req.user.userId) }),
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

router.post('/', async (req, res) => {
  const { challengeId, code } = req.body as {
    challengeId?: string;
    code?: string;
  };

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!challengeId || !code) {
    return res.status(400).json({
      message: 'Missing required fields: challengeId, code',
    });
  }

  const challenge = await ChallengeModel.findById(challengeId);

  if (!challenge || !challenge.active) {
    return res.status(404).json({ message: 'Challenge not found or inactive' });
  }

  let query: QueryPayload;
  try {
    query = parseMongoQuery(code);
  } catch (parseError) {
    return res.status(400).json({
      message: getErrorMessage(parseError),
    });
  }

  const submission = await SubmissionModel.create({
    userId: new Types.ObjectId(req.user.userId),
    challengeId: challenge._id,
    query,
    status: 'pending',
  });

  try {
    const sandboxDb = getSandboxDb();
    const evaluation = await evaluateChallengeSubmission(challenge, query, sandboxDb);

    submission.set({
      status: 'evaluated',
      isCorrect: evaluation.isCorrect,
      correctnessScore: evaluation.correctnessScore,
      efficiencyScore: evaluation.efficiencyScore,
      queryQualityScore: evaluation.queryQualityScore,
      normalizedScore: evaluation.normalizedScore,
      maxPoints: evaluation.maxPoints,
      score: evaluation.awardedPoints,
      metrics: evaluation.metrics,
      resultSample: evaluation.resultSample,
      errorMessage: undefined,
    });

    await submission.save();
    await recomputeUserStats(req.user.userId);
    return res.status(201).json(submission);
  } catch (error) {
    submission.set({
      status: 'error',
      errorMessage: getErrorMessage(error),
    });

    await submission.save();
    await recomputeUserStats(req.user.userId);

    return res.status(400).json({
      message: submission.errorMessage,
      submissionId: submission._id,
    });
  }
});

export default router;
