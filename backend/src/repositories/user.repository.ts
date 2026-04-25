import { Types } from 'mongoose';
import { UserModel, IUser, UserDocument } from '../models/user.model';

export const countUsers = async (filter: Record<string, unknown> = {}): Promise<number> => {
  return UserModel.countDocuments(filter);
};

export const findUsers = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number,
  select?: string
): Promise<UserDocument[]> => {
  let query = UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  if (select) {
    query = query.select(select) as any;
  }
  return query;
};

export const findUserById = async (id: string | Types.ObjectId): Promise<UserDocument | null> => {
  return UserModel.findById(id);
};

export const aggregateUsers = async <T>(pipeline: any[]): Promise<T[]> => {
  return UserModel.aggregate<T>(pipeline);
};
