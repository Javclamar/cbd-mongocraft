import { Types } from 'mongoose';
import { ChallengeModel, IChallenge, ChallengeDocument } from '../models/challenge.model';

export const countChallenges = async (filter: Record<string, unknown> = {}): Promise<number> => {
  return ChallengeModel.countDocuments(filter);
};

export const findChallenges = async (
  filter: Record<string, unknown>,
  sort?: Record<string, 1 | -1>,
  skip?: number,
  limit?: number
): Promise<ChallengeDocument[]> => {
  let query = ChallengeModel.find(filter);
  if (sort) query = query.sort(sort) as any;
  if (skip !== undefined) query = query.skip(skip) as any;
  if (limit !== undefined) query = query.limit(limit) as any;
  return query;
};

export const findChallengeById = async (id: string | Types.ObjectId): Promise<ChallengeDocument | null> => {
  return ChallengeModel.findById(id);
};

export const createChallenge = async (data: Partial<IChallenge>): Promise<ChallengeDocument> => {
  return ChallengeModel.create(data);
};

export const updateChallengeById = async (
  id: string | Types.ObjectId,
  updates: Record<string, unknown>
): Promise<ChallengeDocument | null> => {
  return ChallengeModel.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
};
