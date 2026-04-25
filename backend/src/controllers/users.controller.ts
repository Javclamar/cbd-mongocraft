import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { aggregateUsers, countUsers } from '../repositories/user.repository';

const LEADERBOARD_SORT = {
  'stats.totalScore': -1,
  'stats.correctSubmissions': -1,
  'stats.lastSubmissionAt': -1,
  _id: 1,
} as const;

interface LeaderboardEntry {
  _id: Types.ObjectId;
  username: string;
  role: 'user' | 'admin';
  stats: Record<string, unknown>;
  rank: number;
}

const toLeaderboardItem = (entry: LeaderboardEntry, currentUserId?: string) => ({
  rank: entry.rank,
  isCurrentUser: currentUserId ? entry._id.toString() === currentUserId : false,
  user: {
    id: entry._id.toString(),
    username: entry.username,
    role: entry.role,
    stats: entry.stats,
  },
});

const getLeaderboardPage = async (
  page: number,
  limit: number,
): Promise<{ items: ReturnType<typeof toLeaderboardItem>[]; total: number }> => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    aggregateUsers<LeaderboardEntry>([
      {
        $setWindowFields: {
          sortBy: { 'stats.totalScore': -1 },
          output: {
            rank: { $documentNumber: {} },
          },
        },
      },
      {
        $sort: LEADERBOARD_SORT,
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          username: 1,
          role: 1,
          stats: 1,
          rank: 1,
        },
      },
    ]),
    countUsers({}),
  ]);

  return {
    items: rows.map((row) => toLeaderboardItem(row)),
    total,
  };
};

export const getLeaderboard = async (req: Request, res: Response) => {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const { items, total } = await getLeaderboardPage(page, limit);

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

export const getGlobalLeaderboard = async (req: Request, res: Response) => {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const { items, total } = await getLeaderboardPage(page, limit);

  return res.json({
    scope: 'global',
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const getMyLeaderboard = async (req: Request, res: Response) => {
  if (!req.user || !Types.ObjectId.isValid(req.user.userId)) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const currentUserId = new Types.ObjectId(req.user.userId);

  const [rankRows, totalUsers] = await Promise.all([
    aggregateUsers<LeaderboardEntry>([
      {
        $setWindowFields: {
          sortBy: { 'stats.totalScore': -1 },
          output: {
            rank: { $documentNumber: {} },
          },
        },
      },
      {
        $match: {
          _id: currentUserId,
        },
      },
      {
        $project: {
          username: 1,
          role: 1,
          stats: 1,
          rank: 1,
        },
      },
    ]),
    countUsers({}),
  ]);

  const me = rankRows[0];

  if (!me) {
    return res.status(404).json({ message: 'User not found in leaderboard' });
  }

  const percentile =
    totalUsers > 0 ? Number((((totalUsers - me.rank + 1) / totalUsers) * 100).toFixed(2)) : 0;

  return res.json({
    user: toLeaderboardItem(me, req.user.userId),
    totalUsers,
    percentile,
  });
};

export const getMyLeaderboardContext = async (req: Request, res: Response) => {
  if (!req.user || !Types.ObjectId.isValid(req.user.userId)) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const currentUserId = new Types.ObjectId(req.user.userId);
  const windowSize = Math.min(
    Math.max(parseInt((req.query.window as string) || '3', 10), 1),
    10,
  );

  const myRankRow = await aggregateUsers<Pick<LeaderboardEntry, 'rank'>>([
    {
      $setWindowFields: {
        sortBy: { 'stats.totalScore': -1 },
        output: {
          rank: { $documentNumber: {} },
        },
      },
    },
    {
      $match: {
        _id: currentUserId,
      },
    },
    {
      $project: {
        rank: 1,
      },
    },
  ]);

  const myRank = myRankRow[0]?.rank;

  if (!myRank) {
    return res.status(404).json({ message: 'User not found in leaderboard' });
  }

  const startRank = Math.max(myRank - windowSize, 1);
  const endRank = myRank + windowSize;

  const rows = await aggregateUsers<LeaderboardEntry>([
    {
      $setWindowFields: {
        sortBy: { 'stats.totalScore': -1 },
        output: {
          rank: { $documentNumber: {} },
        },
      },
    },
    {
      $match: {
        rank: {
          $gte: startRank,
          $lte: endRank,
        },
      },
    },
    {
      $sort: {
        rank: 1,
      },
    },
    {
      $project: {
        username: 1,
        role: 1,
        stats: 1,
        rank: 1,
      },
    },
  ]);

  return res.json({
    myRank,
    window: windowSize,
    items: rows.map((row) => toLeaderboardItem(row, req.user?.userId)),
  });
};
