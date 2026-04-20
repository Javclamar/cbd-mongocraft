import { InferSchemaType, Schema, model } from 'mongoose';
import { QueryPayload } from '../types/query';

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

const submissionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    query: {
      type: querySchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'evaluated', 'error'],
      required: true,
      default: 'pending',
      index: true,
    },
    isCorrect: {
      type: Boolean,
      default: undefined,
    },
    correctnessScore: {
      type: Number,
      default: undefined,
    },
    efficiencyScore: {
      type: Number,
      default: undefined,
    },
    queryQualityScore: {
      type: Number,
      default: undefined,
    },
    normalizedScore: {
      type: Number,
      default: undefined,
    },
    maxPoints: {
      type: Number,
      default: undefined,
    },
    score: {
      type: Number,
      default: undefined,
    },
    metrics: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    resultSample: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    errorMessage: {
      type: String,
      default: undefined,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

export type ISubmission = InferSchemaType<typeof submissionSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const SubmissionModel = model<ISubmission>('Submission', submissionSchema);
