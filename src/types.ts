export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes?: number;
}

export interface Poll {
  id: string;
  code?: string;
  ownerId: string;
  ownerEmail?: string;
  question: string;
  options: PollOption[];
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  totalVotes: number;
  counts: Record<string, number>;
}

export interface AIPollSuggestion {
  question: string;
  options: string[];
  category?: string;
}

export interface AIPollInsights {
  summary: string;
  dominantChoice: string;
  marginAnalysis: string;
  discussionPrompts: string[];
  generatedWithFallback?: boolean;
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  voterId: string;
  createdAt: string;
}

export type RealtimeEventType = 'vote_cast' | 'poll_closed' | 'initial_state' | 'poll_updated';

export interface RealtimeEvent {
  type: RealtimeEventType;
  pollId: string;
  optionId?: string;
  counts: Record<string, number>;
  totalVotes: number;
  status?: 'active' | 'closed';
  closedAt?: string | null;
  timestamp?: string;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  message?: string;
}
