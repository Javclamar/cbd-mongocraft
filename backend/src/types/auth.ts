import { IUser, UserRole } from '../models/user.model';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthSessionResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}
