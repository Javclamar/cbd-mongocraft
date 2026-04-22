import { Db, Document } from 'mongodb';
import { IChallenge } from '../models/challenge.model';
import { QueryPayload } from '../types/query';
import { config } from '../config/env';

interface ExecutionStatsSummary {
  executionTimeMillis: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  nReturned: number;
}

interface QueryExecutionResult {
  result: unknown[];
  stats: ExecutionStatsSummary;
}

export interface EvaluationResult {
  isCorrect: boolean;
  correctnessScore: number;
  efficiencyScore: number;
  queryQualityScore: number;
  normalizedScore: number;
  maxPoints: number;
  awardedPoints: number;
  metrics: {
    submitted: ExecutionStatsSummary;
    baseline?: ExecutionStatsSummary;
  };
  resultSample: unknown[];
}

const BLOCKED_OPERATORS = new Set([
  '$where',
  '$function',
  '$accumulator',
  '$out',
  '$merge',
]);

const normalizeLimit = (limit?: number): number => {
  const defaultLimit = Math.min(50, config.evaluationMaxResults);

  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return defaultLimit;
  }

  return Math.min(Math.max(Math.floor(limit), 1), config.evaluationMaxResults);
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const round2 = (value: number): number => Number(value.toFixed(2));

const scoreFromRatio = (base: number, actual: number): number => {
  if (base <= 0 || actual <= 0) {
    return 1;
  }

  return clamp(base / actual, 0, 1);
};

const hasBlockedOperators = (value: unknown, depth = 0): boolean => {
  if (depth > 25) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasBlockedOperators(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (BLOCKED_OPERATORS.has(key)) {
        return true;
      }

      if (hasBlockedOperators(nestedValue, depth + 1)) {
        return true;
      }
    }
  }

  return typeof value === 'function';
};

const validateQuery = (datasetCollection: string, query: QueryPayload): void => {
  const allowedCollectionName = /^[a-zA-Z0-9_.-]+$/;

  if (!['find', 'aggregate'].includes(query.type)) {
    throw new Error('Only find and aggregate queries are allowed');
  }

  if (!allowedCollectionName.test(query.collection)) {
    throw new Error('Invalid collection name');
  }

  if (query.collection !== datasetCollection) {
    throw new Error('Query must target the challenge dataset collection');
  }

  const sectionsToValidate = [query.filter, query.projection, query.sort, query.pipeline];

  if (sectionsToValidate.some((section) => hasBlockedOperators(section))) {
    throw new Error('Query contains blocked operators');
  }
};

const extractExecutionStats = (explainOutput: unknown): ExecutionStatsSummary => {
  const fallbackStats: ExecutionStatsSummary = {
    executionTimeMillis: 0,
    totalDocsExamined: 0,
    totalKeysExamined: 0,
    nReturned: 0,
  };

  if (!explainOutput || typeof explainOutput !== 'object') {
    return fallbackStats;
  }

  const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const executionTimeCandidates: number[] = [];
  const docsCandidates: number[] = [];
  const keysCandidates: number[] = [];
  const returnedCandidates: number[] = [];
  const seen = new Set<unknown>();

  const collectFromObject = (value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) {
      return;
    }

    seen.add(value);
    const node = value as Record<string, unknown>;

    const executionTimeMillis =
      toFiniteNumber(node.executionTimeMillis) ??
      toFiniteNumber(node.executionTimeMillisEstimate);
    const totalDocsExamined = toFiniteNumber(node.totalDocsExamined);
    const totalKeysExamined = toFiniteNumber(node.totalKeysExamined);
    const nReturned = toFiniteNumber(node.nReturned);

    if (executionTimeMillis !== null) {
      executionTimeCandidates.push(executionTimeMillis);
    }

    if (totalDocsExamined !== null) {
      docsCandidates.push(totalDocsExamined);
    }

    if (totalKeysExamined !== null) {
      keysCandidates.push(totalKeysExamined);
    }

    if (nReturned !== null) {
      returnedCandidates.push(nReturned);
    }

    for (const nestedValue of Object.values(node)) {
      if (Array.isArray(nestedValue)) {
        for (const item of nestedValue) {
          collectFromObject(item);
        }
      } else {
        collectFromObject(nestedValue);
      }
    }
  };

  collectFromObject(explainOutput);

  return {
    executionTimeMillis: executionTimeCandidates.length > 0 ? Math.max(...executionTimeCandidates) : 0,
    totalDocsExamined: docsCandidates.length > 0 ? Math.max(...docsCandidates) : 0,
    totalKeysExamined: keysCandidates.length > 0 ? Math.max(...keysCandidates) : 0,
    nReturned: returnedCandidates.length > 0 ? Math.max(...returnedCandidates) : 0,
  };
};

const runQuery = async (db: Db, query: QueryPayload): Promise<QueryExecutionResult> => {
  const collection = db.collection(query.collection);
  const limit = normalizeLimit(query.limit);

  if (query.type === 'find') {
    const result = await collection
      .find(query.filter as Document, {
        projection: query.projection as Document,
        sort: query.sort as Document,
        limit,
        maxTimeMS: config.queryTimeout,
      })
      .toArray();

    const explain = await collection
      .find(query.filter as Document, {
        projection: query.projection as Document,
        sort: query.sort as Document,
        limit,
        maxTimeMS: config.queryTimeout,
      })
      .explain('executionStats');

    return {
      result,
      stats: {
        ...extractExecutionStats(explain),
        nReturned: result.length,
      },
    };
  }

  const submittedPipeline = Array.isArray(query.pipeline) ? query.pipeline : [];
  const pipeline = [...submittedPipeline, { $limit: limit }];

  const result = await collection
    .aggregate(pipeline as Document[], {
      allowDiskUse: false,
      maxTimeMS: config.queryTimeout,
    })
    .toArray();

  const explain = await collection
    .aggregate(pipeline as Document[], {
      allowDiskUse: false,
      maxTimeMS: config.queryTimeout,
    })
    .explain('executionStats');

  return {
    result,
    stats: {
      ...extractExecutionStats(explain),
      nReturned: result.length,
    },
  };
};

const normalizeValue = (value: unknown, orderMatters: boolean): unknown => {
  if (Array.isArray(value)) {
    const normalizedArray = value.map((item) => normalizeValue(item, orderMatters));

    if (orderMatters) {
      return normalizedArray;
    }

    return normalizedArray.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  }

  if (value && typeof value === 'object') {
    const normalizedObject: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      normalizedObject[key] = normalizeValue(
        (value as Record<string, unknown>)[key],
        orderMatters,
      );
    }

    return normalizedObject;
  }

  return value;
};

const calculateEfficiencyScore = (
  submitted: ExecutionStatsSummary,
  baseline: ExecutionStatsSummary,
): number => {
  const timeRatio = scoreFromRatio(baseline.executionTimeMillis, submitted.executionTimeMillis);
  const docsRatio = scoreFromRatio(baseline.totalDocsExamined, submitted.totalDocsExamined);
  const keysRatio = scoreFromRatio(baseline.totalKeysExamined, submitted.totalKeysExamined);

  return (timeRatio * 0.5 + docsRatio * 0.3 + keysRatio * 0.2) * 20;
};

export const evaluateChallengeSubmission = async (
  challenge: IChallenge,
  submittedQuery: QueryPayload,
  sandboxDb: Db,
): Promise<EvaluationResult> => {
  validateQuery(challenge.datasetCollection, submittedQuery);
  validateQuery(challenge.datasetCollection, challenge.baselineQuery);

  const [submittedExecution, baselineExecution] = await Promise.all([
    runQuery(sandboxDb, submittedQuery),
    runQuery(sandboxDb, challenge.baselineQuery),
  ]);

  const normalizedExpected = normalizeValue(baselineExecution.result, challenge.orderMatters);
  const normalizedResult = normalizeValue(submittedExecution.result, challenge.orderMatters);

  const isCorrect = JSON.stringify(normalizedResult) === JSON.stringify(normalizedExpected);
  const correctnessScore = isCorrect ? 80 : 0;

  const baselineStats: ExecutionStatsSummary = baselineExecution.stats;
  let efficiencyScore = 0;
  const queryQualityScore = 0;

  if (isCorrect) {
    efficiencyScore = calculateEfficiencyScore(submittedExecution.stats, baselineExecution.stats);
  }

  const normalizedScore = round2(correctnessScore + efficiencyScore + queryQualityScore);
  const maxPoints = typeof challenge.points === 'number' && challenge.points > 0 ? challenge.points : 100;
  const awardedPoints = isCorrect ? round2((normalizedScore / 100) * maxPoints) : 0;

  return {
    isCorrect,
    correctnessScore,
    efficiencyScore: round2(efficiencyScore),
    queryQualityScore: round2(queryQualityScore),
    normalizedScore,
    maxPoints,
    awardedPoints,
    metrics: {
      submitted: submittedExecution.stats,
      baseline: baselineStats,
    },
    resultSample: submittedExecution.result.slice(0, 10),
  };
};
