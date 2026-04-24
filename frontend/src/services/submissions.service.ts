import { api } from './http.service';

export const submissionsService = {
  async create(payload: unknown) {
    const { data } = await api.post<any>('/submissions', payload);
    return data;
  },
};
