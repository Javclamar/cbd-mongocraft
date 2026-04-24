export interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: Array<{ message?: string } | string>;
}
