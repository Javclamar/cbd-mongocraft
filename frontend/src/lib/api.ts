import { reactive } from 'vue';

const BASE_URL = 'http://localhost:3001/api';

export interface User {
  id: string;
  username: string;
  role: 'user' | 'admin';
  stats: {
    totalScore: number;
    correctSubmissions: number;
    lastSubmissionAt: string | null;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const authState = reactive<AuthState>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
});

// Load auth from localStorage if available
const storedUser = localStorage.getItem('mongocraft_user');
const storedToken = localStorage.getItem('mongocraft_token');

if (storedUser && storedToken) {
  authState.user = JSON.parse(storedUser);
  authState.accessToken = storedToken;
  authState.isAuthenticated = true;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers);
  if (authState.accessToken) {
    headers.set('Authorization', `Bearer ${authState.accessToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for cookies (refresh tokens)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || response.statusText);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  async login(username: string, password: string) {
    const data = await apiFetch<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.setAuth(data.user, data.accessToken);
    return data;
  },

  async register(username: string, password: string) {
    const data = await apiFetch<{ user: User; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.setAuth(data.user, data.accessToken);
    return data;
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      this.clearAuth();
    }
  },

  async getMe() {
    const data = await apiFetch<{ user: User }>('/auth/me');
    this.setUser(data.user);
    return data;
  },

  setAuth(user: User, token: string) {
    authState.user = user;
    authState.accessToken = token;
    authState.isAuthenticated = true;
    localStorage.setItem('mongocraft_user', JSON.stringify(user));
    localStorage.setItem('mongocraft_token', token);
  },

  setUser(user: User) {
    authState.user = user;
    localStorage.setItem('mongocraft_user', JSON.stringify(user));
  },

  clearAuth() {
    authState.user = null;
    authState.accessToken = null;
    authState.isAuthenticated = false;
    localStorage.removeItem('mongocraft_user');
    localStorage.removeItem('mongocraft_token');
  }
};
