import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/auth.service';

const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ message: 'Missing or invalid authorization header' });
    return;
  }

  try {
    const authUser = verifyAccessToken(token);
    req.user = authUser;
    next();
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

export const requireRole = (...roles: Array<'user' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
