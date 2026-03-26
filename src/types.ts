export interface Participant {
  id: string;
  name: string;
  avatarUrl: string;
  systemPrompt: string;
  score: number;
}

export type Decision = 'cooperate' | 'defect' | 'error';

export interface MatchResult {
  matchId: string;
  participantAId: string;
  participantBId: string;
  decisionA: Decision;
  decisionB: Decision;
  scoreA: number;
  scoreB: number;
  rawResponseA: string;
  rawResponseB: string;
  reasoningA?: string;
  reasoningB?: string;
}

export interface TournamentState {
  participants: Participant[];
  matches: MatchResult[];
  status: 'idle' | 'running' | 'completed';
  currentMatchIndex: number;
  totalMatches: number;
}
