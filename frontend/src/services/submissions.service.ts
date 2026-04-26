import { api } from './http.service';

export interface ChallengeStatusInfo {
  status: 'completed' | 'in-progress';
  bestScore: number;
}

export const submissionsService = {
  async create(payload: unknown) {
    const { data } = await api.post<any>('/submissions', payload);
    return data;
  },

  async getMyChallengeStatuses(): Promise<Record<string, ChallengeStatusInfo>> {
    const { data } = await api.get<Record<string, ChallengeStatusInfo>>('/submissions/challenge-statuses');
    return data;
  },
};
