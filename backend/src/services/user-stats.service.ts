import { Types } from 'mongoose';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';

const round2 = (value: number): number => Number(value.toFixed(2));

export const recomputeUserStats = async (userId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(userId)) {
    return;
  }

  const userObjectId = new Types.ObjectId(userId);

  const [
    totalSubmissions,
    evaluatedSummary,
    rankingSummary,
    solvedChallenges,
    lastSubmission,
  ] = await Promise.all([
    SubmissionModel.countDocuments({ userId: userObjectId }),
    SubmissionModel.aggregate<{
      evaluatedSubmissions: number;
      correctSubmissions: number;
      totalScore: number;
      bestScore: number;
    }>([
      {
        $match: {
          userId: userObjectId,
          status: 'evaluated',
        },
      },
      {
        $group: {
          _id: null,
          evaluatedSubmissions: { $sum: 1 },
          correctSubmissions: {
            $sum: {
              $cond: [{ $eq: ['$isCorrect', true] }, 1, 0],
            },
          },
          totalScore: { $sum: { $ifNull: ['$score', 0] } },
          bestScore: { $max: { $ifNull: ['$score', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          evaluatedSubmissions: 1,
          correctSubmissions: 1,
          totalScore: 1,
          bestScore: 1,
        },
      },
    ]),
    SubmissionModel.aggregate<{
      solvedChallengesCount: number;
      totalRankingPoints: number;
      bestChallengePoints: number;
    }>([
      {
        $match: {
          userId: userObjectId,
          status: 'evaluated',
          isCorrect: true,
        },
      },
      {
        $group: {
          _id: '$challengeId',
          bestPointsForChallenge: { $max: { $ifNull: ['$score', 0] } },
        },
      },
      {
        $group: {
          _id: null,
          solvedChallengesCount: { $sum: 1 },
          totalRankingPoints: { $sum: '$bestPointsForChallenge' },
          bestChallengePoints: { $max: '$bestPointsForChallenge' },
        },
      },
      {
        $project: {
          _id: 0,
          solvedChallengesCount: 1,
          totalRankingPoints: 1,
          bestChallengePoints: 1,
        },
      },
    ]),
    SubmissionModel.distinct('challengeId', {
      userId: userObjectId,
      status: 'evaluated',
      isCorrect: true,
    }),
    SubmissionModel.findOne({ userId: userObjectId }).sort({ createdAt: -1 }),
  ]);

  const summary = evaluatedSummary[0] || {
    evaluatedSubmissions: 0,
    correctSubmissions: 0,
    totalScore: 0,
    bestScore: 0,
  };

  const ranking = rankingSummary[0] || {
    solvedChallengesCount: 0,
    totalRankingPoints: 0,
    bestChallengePoints: 0,
  };

  const averageScore =
    ranking.solvedChallengesCount > 0
      ? ranking.totalRankingPoints / ranking.solvedChallengesCount
      : 0;

  await UserModel.findByIdAndUpdate(userObjectId, {
    $set: {
      stats: {
        totalSubmissions,
        evaluatedSubmissions: summary.evaluatedSubmissions,
        correctSubmissions: summary.correctSubmissions,
        solvedChallenges,
        totalScore: round2(ranking.totalRankingPoints),
        averageScore: round2(averageScore),
        bestScore: round2(ranking.bestChallengePoints || 0),
        lastSubmissionAt: lastSubmission?.createdAt,
      },
    },
  });
};
