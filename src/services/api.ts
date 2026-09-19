import { ApiResponse, Poll, User, AIPollSuggestion, AIPollInsights } from '../types';

const TOKEN_KEY = 'pulsepoll_jwt_token';
const VOTER_ID_KEY = 'pulsepoll_voter_id';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getOrCreateVoterId(): string {
  let id = localStorage.getItem(VOTER_ID_KEY);
  if (!id) {
    id = 'voter_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem(VOTER_ID_KEY, id);
  }
  return id;
}

export function hasVotedOnPoll(pollId: string): string | null {
  try {
    const voted = localStorage.getItem(`pulsepoll_voted_${pollId}`);
    return voted || null;
  } catch {
    return null;
  }
}

export function markPollAsVoted(pollId: string, optionId: string): void {
  try {
    localStorage.setItem(`pulsepoll_voted_${pollId}`, optionId);
  } catch (err) {
    console.error('Failed to save voting state to storage', err);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || json.message || `Request failed with status ${response.status}`);
  }

  return json.data as T;
}

export const api = {
  // Auth
  async signup(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    return request<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  // Polls
  async getPolls(): Promise<Poll[]> {
    return request<Poll[]>('/api/polls');
  },

  async getMyPolls(): Promise<Poll[]> {
    return request<Poll[]>('/api/polls/my');
  },

  async getPoll(id: string): Promise<Poll> {
    return request<Poll>(`/api/polls/${id}`);
  },

  async getPollResults(id: string): Promise<{ pollId: string; counts: Record<string, number>; totalVotes: number }> {
    return request<{ pollId: string; counts: Record<string, number>; totalVotes: number }>(`/api/polls/${id}/results`);
  },

  async createPoll(question: string, options: string[], code?: string): Promise<Poll> {
    return request<Poll>('/api/polls', {
      method: 'POST',
      body: JSON.stringify({ question, options, code }),
    });
  },

  async generatePollKey(alternate = false): Promise<{ key: string }> {
    return request<{ key: string }>(`/api/polls/generate-key?alternate=${alternate}`);
  },

  async generateAIPoll(topic?: string): Promise<AIPollSuggestion & { generatedWithFallback?: boolean }> {
    return request<AIPollSuggestion & { generatedWithFallback?: boolean }>('/api/ai/generate-poll', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  },

  async analyzeResults(pollId: string): Promise<AIPollInsights> {
    return request<AIPollInsights>('/api/ai/analyze-results', {
      method: 'POST',
      body: JSON.stringify({ pollId }),
    });
  },

  async closePoll(id: string): Promise<Poll> {
    return request<Poll>(`/api/polls/${id}/close`, {
      method: 'POST',
    });
  },

  async deletePoll(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/polls/${id}`, {
      method: 'DELETE',
    });
  },

  async vote(pollId: string, optionId: string): Promise<{ success: boolean; totalVotes: number; counts: Record<string, number> }> {
    const voterId = getOrCreateVoterId();
    const result = await request<{ success: boolean; totalVotes: number; counts: Record<string, number> }>(`/api/polls/${pollId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionId, voterId }),
    });
    markPollAsVoted(pollId, optionId);
    return result;
  },
};
