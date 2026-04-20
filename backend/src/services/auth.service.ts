import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { IUser, UserDocument, UserModel } from '../models/user.model';
import { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from '../types/auth';
import { parseDurationToMs } from '../utils/time';

export interface AuthSessionResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

const ACCESS_EXPIRES_IN = config.jwtAccessExpiresIn as SignOptions['expiresIn'];
const REFRESH_EXPIRES_IN = config.jwtRefreshExpiresIn as SignOptions['expiresIn'];
const REFRESH_TTL_MS = parseDurationToMs(config.jwtRefreshExpiresIn, 30 * 24 * 60 * 60 * 1000);
const MAX_REFRESH_SESSIONS = 20;

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const normalizeUsername = (username: string): string => username.trim().toLowerCase();

const buildAccessTokenPayload = (user: IUser): AccessTokenPayload => ({
  sub: user._id.toString(),
  username: user.username,
  role: user.role,
  type: 'access',
});

const signAccessToken = (user: IUser): string => {
  return jwt.sign(buildAccessTokenPayload(user), config.jwtSecret, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
};

const signRefreshToken = (user: IUser): { token: string; tokenHash: string; expiresAt: Date } => {
  const payload: RefreshTokenPayload = {
    sub: user._id.toString(),
    jti: crypto.randomUUID(),
    type: 'refresh',
  };

  const token = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: REFRESH_EXPIRES_IN,
  });

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  };
};

const cleanupRefreshSessions = (user: UserDocument): void => {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const compacted = user.refreshSessions
    .filter((session) => {
      const notExpired = session.expiresAt.getTime() > now;
      const recentlyRevoked =
        session.revokedAt && session.revokedAt.getTime() > weekAgo;

      return notExpired || recentlyRevoked;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_REFRESH_SESSIONS)
    .map((session) => ({
      tokenHash: session.tokenHash,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
    }));

  user.set('refreshSessions', compacted);
};

const issueSession = async (
  user: UserDocument,
  rotateFromTokenHash?: string,
): Promise<AuthSessionResult> => {
  const { token: refreshToken, tokenHash, expiresAt } = signRefreshToken(user);
  const now = new Date();

  if (rotateFromTokenHash) {
    const previousSession = user.refreshSessions.find(
      (session) => session.tokenHash === rotateFromTokenHash,
    );

    if (previousSession) {
      previousSession.revokedAt = now;
    }
  }

  user.refreshSessions.push({
    tokenHash,
    createdAt: now,
    expiresAt,
  });

  user.lastLoginAt = now;
  cleanupRefreshSessions(user);
  await user.save();

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken,
  };
};

const assertRefreshPayload = (decoded: string | JwtPayload): RefreshTokenPayload => {
  if (typeof decoded === 'string') {
    throw new Error('Invalid refresh token payload');
  }

  const sub = decoded.sub;
  const jti = decoded.jti;
  const type = decoded.type;

  if (typeof sub !== 'string' || typeof jti !== 'string' || type !== 'refresh') {
    throw new Error('Invalid refresh token payload');
  }

  return { sub, jti, type };
};

export const verifyAccessToken = (token: string): AuthenticatedUser => {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (typeof decoded === 'string') {
    throw new Error('Invalid access token');
  }

  const { sub, username, role, type } = decoded as JwtPayload;

  if (typeof sub !== 'string' || typeof username !== 'string' || type !== 'access') {
    throw new Error('Invalid access token payload');
  }

  if (role !== 'user' && role !== 'admin') {
    throw new Error('Invalid access token role');
  }

  return {
    userId: sub,
    username,
    role,
  };
};

export const toPublicUser = (user: IUser): Record<string, unknown> => {
  return {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
    stats: user.stats,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
};

export const registerUser = async (
  username: string,
  password: string,
): Promise<AuthSessionResult> => {
  const normalizedUsername = normalizeUsername(username);
  const existingUser = await UserModel.findOne({ username: normalizedUsername });

  if (existingUser) {
    throw new Error('Username is already in use');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({
    username: normalizedUsername,
    passwordHash,
    role: 'user',
  });

  return issueSession(user);
};

export const loginUser = async (
  username: string,
  password: string,
): Promise<AuthSessionResult> => {
  const normalizedUsername = normalizeUsername(username);
  const user = await UserModel.findOne({ username: normalizedUsername });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  return issueSession(user);
};

export const refreshSession = async (
  refreshToken: string,
): Promise<AuthSessionResult> => {
  const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
  const payload = assertRefreshPayload(decoded);
  const tokenHash = hashToken(refreshToken);

  const user = await UserModel.findById(payload.sub);

  if (!user) {
    throw new Error('Invalid refresh token');
  }

  const session = user.refreshSessions.find(
    (refreshSessionItem) => refreshSessionItem.tokenHash === tokenHash,
  );

  const now = Date.now();
  const isUsableSession =
    session && !session.revokedAt && session.expiresAt.getTime() > now;

  if (!isUsableSession) {
    user.set('refreshSessions', []);
    await user.save();
    throw new Error('Refresh token is no longer valid');
  }

  return issueSession(user, tokenHash);
};

export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const payload = assertRefreshPayload(decoded);
    const tokenHash = hashToken(refreshToken);

    const user = await UserModel.findById(payload.sub);
    if (!user) {
      return;
    }

    const session = user.refreshSessions.find(
      (refreshSessionItem) => refreshSessionItem.tokenHash === tokenHash,
    );

    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await user.save();
    }
  } catch (_error) {
    return;
  }
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  const user = await UserModel.findById(userId);

  if (!user) {
    return;
  }

  user.set('refreshSessions', []);
  await user.save();
};
