import { Types } from 'mongoose';
import { SubmissionModel, ISubmission, SubmissionDocument } from '../models/submission.model';

export const countSubmissions = async (filter: Record<string, unknown> = {}): Promise<number> => {
  return SubmissionModel.countDocuments(filter);
};

export const findSubmissions = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number
): Promise<SubmissionDocument[]> => {
  return SubmissionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

export const findSubmissionById = async (id: string | Types.ObjectId): Promise<SubmissionDocument | null> => {
  return SubmissionModel.findById(id);
};

export const createSubmission = async (data: Partial<ISubmission>): Promise<SubmissionDocument> => {
  return SubmissionModel.create(data);
};
