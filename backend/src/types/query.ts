export type QueryType = 'find' | 'aggregate';

export interface QueryPayload {
  type: QueryType;
  collection: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  pipeline?: Array<Record<string, unknown>>;
}

export interface ExecutionStatsSummary {
  executionTimeMillis: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  nReturned: number;
}

export interface QueryExecutionResult {
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
