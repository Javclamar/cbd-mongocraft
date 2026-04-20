import { CookieOptions, Request, Response, Router } from 'express';
import { config } from '../config/env';
import { requireAuth } from '../middleware/auth.middleware';
import { UserModel } from '../models/user.model';
import {
  loginUser,
  refreshSession,
  registerUser,
  revokeAllUserSessions,
  revokeRefreshToken,
  toPublicUser,
} from '../services/auth.service';
import { recomputeUserStats } from '../services/user-stats.service';
import { parseDurationToMs } from '../utils/time';

const router = Router();

const REFRESH_COOKIE_MAX_AGE = parseDurationToMs(
  config.jwtRefreshExpiresIn,
  30 * 24 * 60 * 60 * 1000,
);

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.authCookieSecure,
  sameSite: 'lax',
  maxAge: REFRESH_COOKIE_MAX_AGE,
  path: '/api/auth',
};

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(config.authCookieName, token, refreshCookieOptions);
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(config.authCookieName, {
    ...refreshCookieOptions,
    maxAge: undefined,
  });
};

const getRefreshTokenFromRequest = (req: Request): string | null => {
  const bodyToken = req.body?.refreshToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken;
  }

  const cookieToken = req.cookies?.[config.authCookieName];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken;
  }

  return null;
};

router.post('/register', async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must contain at least 8 characters' });
  }

  try {
    const { user, accessToken, refreshToken } = await registerUser(username, password);

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to register user';
    return res.status(400).json({ message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  try {
    const { user, accessToken, refreshToken } = await loginUser(username, password);

    setRefreshCookie(res, refreshToken);

    return res.json({
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken is required' });
  }

  try {
    const session = await refreshSession(refreshToken);

    setRefreshCookie(res, session.refreshToken);

    return res.json({
      user: toPublicUser(session.user),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  } catch (_error) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  clearRefreshCookie(res);

  return res.json({ message: 'Session closed' });
});

router.post('/logout-all', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  await revokeAllUserSessions(req.user.userId);
  clearRefreshCookie(res);

  return res.json({ message: 'All sessions closed' });
});

router.get('/me', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  await recomputeUserStats(req.user.userId);

  const user = await UserModel.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: toPublicUser(user) });
});

export default router;
