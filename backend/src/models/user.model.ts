import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  Types,
  model,
} from 'mongoose';

export type UserRole = 'user' | 'admin';

const refreshSessionSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

export type IRefreshSession = InferSchemaType<typeof refreshSessionSchema>;

const statsSchema = new Schema(
  {
    totalSubmissions: { type: Number, default: 0 },
    evaluatedSubmissions: { type: Number, default: 0 },
    correctSubmissions: { type: Number, default: 0 },
    solvedChallenges: {
      type: [Schema.Types.ObjectId],
      ref: 'Challenge',
      default: [],
    },
    totalScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    lastSubmissionAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

export type IUserStats = InferSchemaType<typeof statsSchema>;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'] as const,
      default: 'user',
      required: true,
    },
    refreshSessions: {
      type: [refreshSessionSchema],
      default: [],
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
    lastLoginAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({
  'stats.totalScore': -1,
  'stats.correctSubmissions': -1,
  'stats.lastSubmissionAt': -1,
});

userSchema.index({ username: 1 }, { unique: true });

export type IUser = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = HydratedDocument<IUser>;

export const UserModel = model<IUser>('User', userSchema);
