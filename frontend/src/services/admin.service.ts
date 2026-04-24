import { api } from './http.service';

export const adminService = {
  async getSummary() {
    const { data } = await api.get<any>('/admin/summary');
    return data;
  },

  async getChallenges(limit = 100, includeInactive = true) {
    const { data } = await api.get<any>(`/admin/challenges?limit=${limit}&includeInactive=${includeInactive}`);
    return data;
  },

  async getUsers(limit = 100) {
    const { data } = await api.get<any>(`/admin/users?limit=${limit}`);
    return data;
  },

  async setChallengeActive(id: string, active: boolean) {
    const { data } = await api.patch(`/admin/challenges/${id}/active`, { active });
    return data;
  },

  async createChallenge(payload: unknown) {
    const { data } = await api.post('/admin/challenges', payload);
    return data;
  },

  async updateChallenge(id: string, payload: unknown) {
    const { data } = await api.patch(`/admin/challenges/${id}`, payload);
    return data;
  },
};
