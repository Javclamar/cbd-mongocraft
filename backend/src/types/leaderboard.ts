import { Types } from 'mongoose';

export interface LeaderboardEntry {
  _id: Types.ObjectId;
  username: string;
  role: 'user' | 'admin';
  stats: Record<string, unknown>;
  rank: number;
}
