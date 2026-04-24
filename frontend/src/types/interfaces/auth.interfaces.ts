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

export interface AuthResponse {
  user: User;
  accessToken: string;
}
