import { api } from './http.service';

export const usersService = {
  async getLeaderboard(limit = 50) {
    const { data } = await api.get<{ items: any[] }>(`/users/leaderboard?limit=${limit}`);
    return data;
  },

  async getMyLeaderboardContext() {
    const { data } = await api.get<any>('/users/leaderboard/me');
    return data;
  },
};
