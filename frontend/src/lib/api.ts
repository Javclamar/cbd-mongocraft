import { reactive } from 'vue';

const BASE_URL = 'http://localhost:3001/api';

export type ApiErrorKind = 'network' | 'validation' | 'http' | 'unknown';

export class ApiFetchError extends Error {
  statusCode: number | null;
  kind: ApiErrorKind;
  backendMessage: string | null;
  payload: unknown;

  constructor(params: {
    message: string;
    statusCode?: number | null;
    kind: ApiErrorKind;
    backendMessage?: string | null;
    payload?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiFetchError';
    this.statusCode = params.statusCode ?? null;
    this.kind = params.kind;
    this.backendMessage = params.backendMessage ?? null;
    this.payload = params.payload;
  }

  get isNetworkError(): boolean {
    return this.kind === 'network';
  }

  get isValidationError(): boolean {
    return this.kind === 'validation';
  }
}

interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: Array<{ message?: string } | string>;
}

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

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies (refresh tokens)
    });
  } catch (error) {
    throw new ApiFetchError({
      message: 'Unable to reach the server. Please check your connection and try again.',
      kind: 'network',
      backendMessage: error instanceof Error ? error.message : null,
      payload: null,
    });
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let errorData: ApiErrorPayload | null = null;

    if (contentType.includes('application/json')) {
      errorData = await response.json().catch(() => null);
    } else {
      const errorText = await response.text().catch(() => '');
      errorData = errorText ? { message: errorText } : null;
    }

    const backendMessage = errorData?.message || errorData?.error || null;
    const message = backendMessage || response.statusText || 'An unknown error occurred';
    const kind: ApiErrorKind = response.status === 400 || response.status === 422 ? 'validation' : 'http';

    throw new ApiFetchError({
      message,
      statusCode: response.status,
      kind,
      backendMessage,
      payload: errorData,
    });
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
