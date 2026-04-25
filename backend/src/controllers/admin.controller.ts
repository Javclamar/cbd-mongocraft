import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { countUsers, findUsers } from '../repositories/user.repository';
import { countChallenges, findChallenges, createChallenge, updateChallengeById, findChallengeById } from '../repositories/challenge.repository';
import { countSubmissions } from '../repositories/submission.repository';

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

export const getSummary = async (_req: Request, res: Response) => {
  const [users, challenges, activeChallenges, submissions] = await Promise.all([
    countUsers({}),
    countChallenges({}),
    countChallenges({ active: true }),
    countSubmissions({}),
  ]);

  return res.json({
    users,
    challenges,
    activeChallenges,
    inactiveChallenges: challenges - activeChallenges,
    submissions,
  });
};

export const getUsers = async (req: Request, res: Response) => {
  const page = parseIntWithBounds(req.query.page, 1, 1, 100000);
  const limit = parseIntWithBounds(req.query.limit, 20, 1, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    findUsers({}, skip, limit, '-passwordHash -refreshSessions'),
    countUsers({}),
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
};

export const getChallenges = async (req: Request, res: Response) => {
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
    findChallenges(filter, { createdAt: -1 }, skip, limit),
    countChallenges(filter),
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
};

export const postChallenge = async (req: Request, res: Response) => {
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

  const challenge = await createChallenge(req.body);
  return res.status(201).json(challenge);
};

export const patchChallenge = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }

  const allowedFields = new Set([
    'title',
    'description',
    'difficulty',
    'points',
    'datasetCollection',
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

  const challenge = await updateChallengeById(id, updates);

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  return res.json(challenge);
};

export const patchChallengeActive = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { active } = req.body as { active?: unknown };

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }

  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active must be a boolean' });
  }

  const challenge = await updateChallengeById(id, { active });

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  return res.json(challenge);
};

export const deleteChallenge = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }

  const challenge = await findChallengeById(id);

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  challenge.active = false;
  await challenge.save();

  return res.json({
    message: 'Challenge deactivated',
    challenge,
  });
};
