import type { InternalAxiosRequestConfig } from 'axios';
import type { User } from './auth.interfaces';

export interface RefreshResponse {
  user: User;
  accessToken: string;
}

export interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
