import { InferSchemaType, Schema, model } from 'mongoose';
import { QueryPayload } from '../types/query';

const DIFFICULTY_POINTS: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 100,
  medium: 200,
  hard: 300,
};

const querySchema = new Schema<QueryPayload>(
  {
    type: {
      type: String,
      enum: ['find', 'aggregate'],
      required: true,
    },
    collection: {
      type: String,
      required: true,
      trim: true,
    },
    filter: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    projection: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    sort: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    limit: {
      type: Number,
      min: 1,
      max: 500,
      default: undefined,
    },
    pipeline: {
      type: [Schema.Types.Mixed],
      default: undefined,
    },
  },
  {
    _id: false,
    strict: false,
    suppressReservedKeysWarning: true,
  },
);

const challengeSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      default: 'easy',
    },
    points: {
      type: Number,
      required: true,
      min: 1,
      default: function defaultPoints(this: { difficulty?: 'easy' | 'medium' | 'hard' }) {
        return DIFFICULTY_POINTS[this.difficulty || 'easy'];
      },
    },
    datasetCollection: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    expectedResult: {
      type: Schema.Types.Mixed,
      required: true,
    },
    baselineQuery: {
      type: querySchema,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    orderMatters: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export type IChallenge = InferSchemaType<typeof challengeSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const ChallengeModel = model<IChallenge>('Challenge', challengeSchema);
