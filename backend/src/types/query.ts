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
