import { Decision, Participant } from '../types';

export function calculateScore(decisionA: Decision, decisionB: Decision): { scoreA: number, scoreB: number } {
  if (decisionA === 'cooperate' && decisionB === 'cooperate') return { scoreA: 3, scoreB: 3 };
  if (decisionA === 'defect' && decisionB === 'defect') return { scoreA: 1, scoreB: 1 };
  if (decisionA === 'cooperate' && decisionB === 'defect') return { scoreA: 0, scoreB: 5 };
  if (decisionA === 'defect' && decisionB === 'cooperate') return { scoreA: 5, scoreB: 0 };
  
  // if error
  return { scoreA: 0, scoreB: 0 };
}

export function generateRoundRobinSchedule(participants: Participant[]): {a: string, b: string}[] {
  const matches: {a: string, b: string}[] = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({ a: participants[i].id, b: participants[j].id });
    }
  }
  // Randomize the match order for more exciting UI
  return matches.sort(() => Math.random() - 0.5);
}
