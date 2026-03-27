import { Participant, MatchResult } from '../types';

export const generateStandaloneHtml = (
  participants: Participant[],
  matchResults: MatchResult[],
  cssContent: string
): string => {
  // Compute leaderboard
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  const getStats = (participantId: string) => {
    let wins = 0, draws = 0, losses = 0;
    let cooperates = 0, defects = 0;
    matchResults.forEach(r => {
      if (r.participantAId === participantId) {
        if (r.scoreA > r.scoreB) wins++;
        else if (r.scoreA === r.scoreB) draws++;
        else losses++;

        if (r.decisionA === 'cooperate') cooperates++;
        if (r.decisionA === 'defect') defects++;
      } else if (r.participantBId === participantId) {
        if (r.scoreB > r.scoreA) wins++;
        else if (r.scoreB === r.scoreA) draws++;
        else losses++;

        if (r.decisionB === 'cooperate') cooperates++;
        if (r.decisionB === 'defect') defects++;
      }
    });
    return { wins, draws, losses, cooperates, defects };
  };

  const getEmoji = (d: string) => d === 'cooperate' ? '🤝' : d === 'defect' ? '⚔️' : '⚠️';
  const getColor = (s: number) => {
    if (s === 5) return '#10b981';
    if (s === 3) return '#f59e0b';
    if (s === 1) return '#ef4444';
    return '#a0a0b0';
  };

  const css = `
    ${cssContent}
    body { padding: 40px; }
    .export-container { max-width: 1000px; margin: 0 auto; }
    .match-card { background: var(--glass-bg); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid var(--border-color); }
    .match-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 20px; }
    .participant-row { display: flex; align-items: start; gap: 20px; margin-bottom: 20px; }
    .participant-col { flex: 1; }
    .reasoning-box { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 15px; font-family: monospace; font-size: 0.9em; margin-top: 10px; white-space: pre-wrap; color: var(--text-secondary); max-height: 200px; overflow-y: auto;}
    .raw-box { background: rgba(0,0,0,0.5); border-left: 3px solid var(--accent-primary); padding: 10px; font-family: monospace; font-size: 0.8em; margin-top: 10px; color: #a0a0b0;}
    .score-badge { font-weight: bold; font-size: 1.2em; }
    .leaderboard { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .lb-card { background: var(--bg-card); padding: 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid var(--border-color); }
  `;

  let leaderboardHtml = '<div class="leaderboard">';
  sorted.forEach((p, i) => {
    const stats = getStats(p.id);
    leaderboardHtml += `
      <div class="lb-card">
        <div style="font-size: 1.5em; width: 30px; text-align: center;">${i === 0 ? '🏆' : `#${i+1}`}</div>
        <img src="${p.avatarUrl}" style="width: 48px; height: 48px; border-radius: 50%;">
        <div>
          <div style="font-weight:bold">${p.name}</div>
          <div style="font-size:0.8em; color:var(--text-secondary)">${stats.wins} ${stats.wins === 1 ? 'win' : 'wins'} - ${stats.draws} ${stats.draws === 1 ? 'draw' : 'draws'} - ${stats.losses} ${stats.losses === 1 ? 'loss' : 'losses'}</div>
          <div style="font-size:0.75em; color:var(--text-secondary)">🤝 Cooperated: ${stats.cooperates} | ⚔️ Defected: ${stats.defects}</div>
        </div>
        <div style="margin-left: auto; font-weight: bold; font-size: 1.2em;">${p.score}</div>
      </div>
    `;
  });
  leaderboardHtml += '</div>';

  let matchesHtml = '<h2>Match Transcripts</h2>';
  matchResults.forEach((r, idx) => {
    const pA = participants.find(p => p.id === r.participantAId)!;
    const pB = participants.find(p => p.id === r.participantBId)!;

    matchesHtml += `
      <div class="match-card">
        <div class="match-header">
          <h3>Match ${idx + 1}</h3>
          <div>
            <span class="score-badge" style="color: ${getColor(r.scoreA)}">+${r.scoreA}</span>
            <span style="margin: 0 10px; color: var(--text-secondary)">VS</span>
            <span class="score-badge" style="color: ${getColor(r.scoreB)}">+${r.scoreB}</span>
          </div>
        </div>
        
        <div style="display: flex; gap: 20px;">
          <!-- Participant A -->
          <div class="participant-col">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <img src="${pA.avatarUrl}" style="width:40px; border-radius:50%;">
              <strong>${pA.name}</strong>
              <div class="badge badge-${r.decisionA}">${getEmoji(r.decisionA)} ${r.decisionA.toUpperCase()}</div>
            </div>
            ${r.reasoningA ? `
              <div style="color: var(--accent-primary); font-size: 0.8em; text-transform: uppercase; font-weight: bold; margin-top: 15px;">Chain of Thought</div>
              <div class="reasoning-box">${r.reasoningA}</div>
            ` : ''}
            <div style="color: var(--text-secondary); font-size: 0.8em; text-transform: uppercase; font-weight: bold; margin-top: 15px;">Raw Response</div>
            <div class="raw-box">${r.rawResponseA || 'N/A'}</div>
          </div>

          <!-- Participant B -->
          <div class="participant-col">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <img src="${pB.avatarUrl}" style="width:40px; border-radius:50%;">
              <strong>${pB.name}</strong>
              <div class="badge badge-${r.decisionB}">${getEmoji(r.decisionB)} ${r.decisionB.toUpperCase()}</div>
            </div>
            ${r.reasoningB ? `
              <div style="color: var(--accent-primary); font-size: 0.8em; text-transform: uppercase; font-weight: bold; margin-top: 15px;">Chain of Thought</div>
              <div class="reasoning-box">${r.reasoningB}</div>
            ` : ''}
            <div style="color: var(--text-secondary); font-size: 0.8em; text-transform: uppercase; font-weight: bold; margin-top: 15px;">Raw Response</div>
            <div class="raw-box">${r.rawResponseB || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Prisoner's Dilemma - Tournament Results</title>
    <style>${css}</style>
</head>
<body>
    <div class="export-container">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="background: linear-gradient(135deg, #a78bfa, #818cf8, #3b82f6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-size: 3em; margin-bottom: 10px;">Tournament Results</h1>
          <p style="color: var(--text-secondary)">Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <h2>Final Standings</h2>
        ${leaderboardHtml}
        
        ${matchesHtml}
    </div>
</body>
</html>
  `;
};
