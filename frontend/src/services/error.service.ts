import { AxiosError } from 'axios';
import type { ApiErrorPayload } from '@/types/interfaces/error.interfaces';

export type ApiErrorKind = 'network' | 'validation' | 'http' | 'unknown';

export class ApiFetchError extends Error {
  statusCode: number | null;
  kind: ApiErrorKind;
  backendMessage: string | null;
  payload: unknown;

  constructor(message: string, kind: ApiErrorKind, statusCode: number | null = null, backendMessage: string | null = null, payload: unknown = null) {
    super(message);
    this.name = 'ApiFetchError';
    this.statusCode = statusCode;
    this.kind = kind;
    this.backendMessage = backendMessage;
    this.payload = payload;
  }
}

export function mapAxiosError(error: unknown): ApiFetchError {
  if (error instanceof ApiFetchError) {
    return error;
  }

  const axiosError = error as AxiosError<ApiErrorPayload>;

  if (!axiosError.response) {
    return new ApiFetchError(
      'Unable to reach the server. Please check your connection and try again.',
      'network',
      null,
      axiosError.message ?? null,
      null,
    );
  }

  const statusCode = axiosError.response.status;
  const payload = axiosError.response.data ?? null;
  const backendMessage = payload?.message || payload?.error || null;
  const kind: ApiErrorKind = statusCode === 400 || statusCode === 422 ? 'validation' : 'http';
  const message = backendMessage || axiosError.response.statusText || axiosError.message || 'An unknown error occurred';

  return new ApiFetchError(message, kind, statusCode, backendMessage, payload);
}
