import { api } from './http.service';
import { authState, clearAuth, setAuth, setUser } from './auth.state';
import type { AuthResponse, User } from '@/types/interfaces/auth.interfaces';

export const authApi = {
  async login(username: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { username, password });

    setAuth(data.user, data.accessToken);
    return data;
  },

  async register(username: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/register', { username, password });

    setAuth(data.user, data.accessToken);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
    }
  },

  async getMe() {
    const { data } = await api.get<{ user: User }>('/auth/me');
    setUser(data.user);
    return data;
  },

  setAuth,
  setUser,
  clearAuth,
};

export { authState };
