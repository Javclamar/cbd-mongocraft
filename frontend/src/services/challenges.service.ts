import { api } from './http.service';

export const challengesService = {
  async list() {
    const { data } = await api.get<any[]>('/challenges');
    return data;
  },

  async getById(challengeId: string) {
    const { data } = await api.get<any>(`/challenges/${challengeId}`);
    return data;
  },

  async getSchema(challengeId: string) {
    const { data } = await api.get<any>(`/challenges/${challengeId}/schema`);
    return data;
  },
};
