import { reactive } from 'vue';
import type { AuthState, User } from '@/types/interfaces/auth.interfaces';

export const authState = reactive<AuthState>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
});

const USER_KEY = 'mongocraft_user';
const TOKEN_KEY = 'mongocraft_token';

const storedUser = localStorage.getItem(USER_KEY);
const storedToken = localStorage.getItem(TOKEN_KEY);

if (storedUser && storedToken) {
  authState.user = JSON.parse(storedUser);
  authState.accessToken = storedToken;
  authState.isAuthenticated = true;
}

export function setAuth(user: User, token: string): void {
  authState.user = user;
  authState.accessToken = token;
  authState.isAuthenticated = true;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

export function setUser(user: User): void {
  authState.user = user;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  authState.user = null;
  authState.accessToken = null;
  authState.isAuthenticated = false;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return authState.accessToken;
}
