import axios, { AxiosError } from 'axios';
import { clearAuth, getAccessToken, setAuth } from './auth.state';
import { mapAxiosError } from './error.service';
import type { RefreshResponse, RetryableRequestConfig } from '@/types/interfaces/http.interfaces';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

async function refreshToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<RefreshResponse>('/auth/refresh')
      .then((response) => {
        setAuth(response.data.user, response.data.accessToken);
        return response.data.accessToken;
      })
      .catch((error) => {
        clearAuth();
        throw mapAxiosError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!(typeof FormData !== 'undefined' && config.data instanceof FormData)) {
    config.headers = config.headers ?? {};
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !(originalRequest.url || '').includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const token = await refreshToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(mapAxiosError(error));
  },
);
