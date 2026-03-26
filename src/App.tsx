import { useState, useEffect } from 'react';
import { Participant, MatchResult } from './types';
import { loadPromptFolders, PromptFolder } from './game/defaults';
import { askParticipantDecision } from './api/openrouter';
import { generateRoundRobinSchedule, calculateScore } from './game/tournament';
import { UserPlus, Play, Trophy, Swords, UserX, FolderOpen, X } from 'lucide-react';

const getScoreColor = (score: number) => {
  if (score === 5) return '#10b981'; // Green
  if (score === 3) return '#f59e0b'; // Amber
  if (score === 1) return '#ef4444'; // Red
  return 'var(--text-secondary)'; // 0
};

const getDecisionEmoji = (decision: string) => {
  if (decision === 'cooperate') return '🤝';
  if (decision === 'defect') return '⚔️';
  return '⚠️';
};

function App() {
  const [folders, setFolders] = useState<PromptFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'leaderboard'>('setup');
  const [matches, setMatches] = useState<{a: string, b: string}[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isMatchProcessing, setIsMatchProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  // New participant form state
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  // Initial load
  useEffect(() => {
    const loadedFolders = loadPromptFolders();
    setFolders(loadedFolders);
    if (loadedFolders.length > 0) {
      setSelectedFolder(loadedFolders[0].name);
      setParticipants(loadedFolders[0].participants);
    }
  }, []);

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const folderName = e.target.value;
    setSelectedFolder(folderName);
    const folder = folders.find(f => f.name === folderName);
    if (folder) {
      setParticipants(folder.participants);
    }
  };

  const addParticipant = () => {
    if (!newName || !newPrompt) return;
    const avatar = newAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${newName}`;
    
    setParticipants([...participants, {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      avatarUrl: avatar,
      systemPrompt: newPrompt,
      score: 0
    }]);
    
    setNewName('');
    setNewAvatar('');
    setNewPrompt('');
  };

  const renderTranscriptModal = () => {
    if (!selectedMatch) return null;
    const pA = participants.find(p => p.id === selectedMatch.participantAId)!;
    const pB = participants.find(p => p.id === selectedMatch.participantBId)!;

    return (
      <div className="modal-overlay" onClick={() => setSelectedMatch(null)}>
        <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Match Transcript</h2>
            <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setSelectedMatch(null)}>
              <X size={20} />
            </button>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <img src={pA.avatarUrl} className="avatar" alt={pA.name} />
              <h3 style={{ margin: 0 }}>{pA.name} ({getDecisionEmoji(selectedMatch.decisionA)} {selectedMatch.decisionA.toUpperCase()})</h3>
            </div>
            {selectedMatch.reasoningA && (
              <div className="transcript-section">
                <strong style={{ color: 'var(--text-primary)' }}>Internal Reasoning:</strong><br />
                {selectedMatch.reasoningA}
              </div>
            )}
            <div className="transcript-section">
              <strong style={{ color: 'var(--text-primary)' }}>Raw Output:</strong><br />
              {selectedMatch.rawResponseA}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <img src={pB.avatarUrl} className="avatar" alt={pB.name} />
              <h3 style={{ margin: 0 }}>{pB.name} ({getDecisionEmoji(selectedMatch.decisionB)} {selectedMatch.decisionB.toUpperCase()})</h3>
            </div>
            {selectedMatch.reasoningB && (
              <div className="transcript-section">
                <strong style={{ color: 'var(--text-primary)' }}>Internal Reasoning:</strong><br />
                {selectedMatch.reasoningB}
              </div>
            )}
            <div className="transcript-section">
              <strong style={{ color: 'var(--text-primary)' }}>Raw Output:</strong><br />
              {selectedMatch.rawResponseB}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const startTournament = () => {
    if (participants.length < 2) {
      alert("Need at least 2 participants!");
      return;
    }
    // Reset scores
    const resetParticipants = participants.map(p => ({ ...p, score: 0 }));
    setParticipants(resetParticipants);
    
    const schedule = generateRoundRobinSchedule(resetParticipants);
    setMatches(schedule);
    setMatchResults([]);
    setCurrentMatchIndex(0);
    setGameState('playing');
    setLogs(['Tournament Started! generating matches...']);
  };

  const logMsg = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    if (gameState === 'playing' && !isMatchProcessing) {
      if (currentMatchIndex < matches.length) {
        processNextMatch();
      } else if (matches.length > 0) {
        setGameState('leaderboard');
        logMsg('Tournament Completed!');
      }
    }
  }, [gameState, currentMatchIndex, isMatchProcessing, matches]);


  const processNextMatch = async () => {
    setIsMatchProcessing(true);
    const match = matches[currentMatchIndex];
    const pA = participants.find(p => p.id === match.a)!;
    const pB = participants.find(p => p.id === match.b)!;

    logMsg(`Starting match ${currentMatchIndex + 1}: ${pA.name} vs ${pB.name}`);

    // Call OpenRouter API sequentially to avoid rate limits
    logMsg(`Waiting for ${pA.name} response...`);
    const resA = await askParticipantDecision(pA.systemPrompt, pB.systemPrompt);
    logMsg(`[REASONING] ${pA.name}: \n${resA.reasoning}`);
    logMsg(`${pA.name} raw response: "${resA.rawResponse}"`);
    logMsg(`${pA.name} decided to ${resA.decision.toUpperCase()}`);
    
    logMsg(`Waiting for ${pB.name} response...`);
    const resB = await askParticipantDecision(pB.systemPrompt, pA.systemPrompt);
    logMsg(`[REASONING] ${pB.name}: \n${resB.reasoning}`);
    logMsg(`${pB.name} raw response: "${resB.rawResponse}"`);
    logMsg(`${pB.name} decided to ${resB.decision.toUpperCase()}`);

    const { scoreA, scoreB } = calculateScore(resA.decision, resB.decision);

    logMsg(`Score outcome: ${pA.name} (+${scoreA}), ${pB.name} (+${scoreB})`);

    const result: MatchResult = {
      matchId: `${pA.id}-${pB.id}-${Date.now()}`,
      participantAId: pA.id,
      participantBId: pB.id,
      decisionA: resA.decision,
      decisionB: resB.decision,
      scoreA,
      scoreB,
      rawResponseA: resA.rawResponse,
      rawResponseB: resB.rawResponse,
      reasoningA: resA.reasoning,
      reasoningB: resB.reasoning
    };

    setMatchResults(prev => [...prev, result]);
    
    // Update participant scores
    setParticipants(prev => prev.map(p => {
      if (p.id === pA.id) return { ...p, score: p.score + scoreA };
      if (p.id === pB.id) return { ...p, score: p.score + scoreB };
      return p;
    }));

    if (resA.decision === 'error' || resB.decision === 'error') {
      logMsg('Tournament halted due to API error. Please check your API key and network.');
      setTimeout(() => {
        setIsMatchProcessing(false);
        setGameState('setup'); // actually halt the loop
      }, 500);
      return;
    }

    // Pause slightly for dramatic effect
    setTimeout(() => {
      setCurrentMatchIndex(i => i + 1);
      setIsMatchProcessing(false);
    }, 2000);
  };


  const renderSetup = () => (
    <div className="dashboard-grid animate-fade-in">
      <div>
        <div className="section-title">
          <FolderOpen className="text-accent-primary" />
          <h2>Select Prompt Folder</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
          <select 
            value={selectedFolder} 
            onChange={handleFolderChange}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            {folders.map(f => (
              <option key={f.name} value={f.name}>{f.name} Directory ({f.participants.length} prompts)</option>
            ))}
          </select>
        </div>

        <div className="section-title">
          <UserPlus className="text-accent-primary" />
          <h2>Manage Participants</h2>
        </div>
        
        <div className="add-participant-form">
          <input 
            placeholder="Name (e.g. Benevolent Bot)" 
            value={newName} 
            onChange={e => setNewName(e.target.value)}
          />
          <input 
            placeholder="Avatar URL (optional)" 
            value={newAvatar} 
            onChange={e => setNewAvatar(e.target.value)}
          />
          <textarea 
            placeholder="System Prompt..." 
            rows={4}
            value={newPrompt} 
            onChange={e => setNewPrompt(e.target.value)}
          />
          <button className="btn-primary" onClick={addParticipant}>
            Add Participant
          </button>
        </div>

        <div className="participant-list">
          {participants.map(p => (
            <div key={p.id} className="participant-card">
              <img src={p.avatarUrl} alt={p.name} className="avatar" />
              <div className="participant-info">
                <div className="participant-name">{p.name}</div>
                <div className="participant-prompt-preview">{p.systemPrompt}</div>
              </div>
              <button className="btn-danger" onClick={() => removeParticipant(p.id)}>
                <UserX size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <Trophy size={48} className="text-accent-primary" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ marginBottom: '1rem' }}>Ready to Battle?</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {participants.length} AI participants configured for the Prisoner's Dilemma.
        </p>
        <button 
          className="btn-primary" 
          onClick={startTournament}
          disabled={participants.length < 2}
          style={{ width: '100%', padding: '1rem' }}
        >
          <Play size={20} /> Start Tournament
        </button>
      </div>
    </div>
  );


  const renderPlaying = () => {
    if (currentMatchIndex >= matches.length) return null;
    
    const match = matches[currentMatchIndex];
    const pA = participants.find(p => p.id === match.a)!;
    const pB = participants.find(p => p.id === match.b)!;
    
    // Check if result exists for this match yet
    const result = matchResults[currentMatchIndex];

    return (
      <div className="arena animate-fade-in">
        <div className="section-title" style={{ justifyContent: 'center' }}>
          <Swords className="text-accent-secondary" />
          <h2>Match {currentMatchIndex + 1} of {matches.length}</h2>
        </div>

        <div className="versus-board glass-panel">
          <div className="vs-badge">VS</div>
          
          <div className="contender" style={{ transform: result ? 'translateX(-20px)' : 'none', transition: 'var(--transition)' }}>
            <img src={pA.avatarUrl} className="avatar avatar-lg" alt={pA.name} />
            <div className="contender-name">{pA.name}</div>
            
            <div className="decision-box">
              {isMatchProcessing && !result ? (
                <div className="spinner"></div>
              ) : result ? (
                <div className={`badge badge-${result.decisionA}`}>
                  {getDecisionEmoji(result.decisionA)} {result.decisionA.toUpperCase()}
                </div>
              ) : null}
            </div>
          </div>

          <div className="contender" style={{ transform: result ? 'translateX(20px)' : 'none', transition: 'var(--transition)' }}>
            <img src={pB.avatarUrl} className="avatar avatar-lg" alt={pB.name} />
            <div className="contender-name">{pB.name}</div>
            
            <div className="decision-box">
              {isMatchProcessing && !result ? (
                <div className="spinner"></div>
              ) : result ? (
                <div className={`badge badge-${result.decisionB}`}>
                  {getDecisionEmoji(result.decisionB)} {result.decisionB.toUpperCase()}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {result && (
          <div className="match-scores animate-fade-in">
            <div className="score-delta" style={{ color: getScoreColor(result.scoreA) }}>+{result.scoreA} Pts</div>
            <div className="score-delta" style={{ color: getScoreColor(result.scoreB) }}>+{result.scoreB} Pts</div>
          </div>
        )}

        <div className="log-box">
          {logs.map((log, i) => (
            <div key={i}>{'>'} {log}</div>
          ))}
        </div>

        {matchResults.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Completed Matches</h3>
            <div className="history-list">
              {matchResults.map((r, i) => {
                const histA = participants.find(p => p.id === r.participantAId)!;
                const histB = participants.find(p => p.id === r.participantBId)!;
                return (
                  <div key={i} className="history-item animate-fade-in history-clickable" style={{ animationDelay: '0.1s' }} onClick={() => setSelectedMatch(r)}>
                    <div className="history-participant">
                      <span style={{ fontSize: '1.2rem' }}>{getDecisionEmoji(r.decisionA)}</span>
                      <span>{histA.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <span style={{ color: getScoreColor(r.scoreA), fontWeight: 'bold' }}>+{r.scoreA}</span> vs <span style={{ color: getScoreColor(r.scoreB), fontWeight: 'bold' }}>+{r.scoreB}</span>
                    </span>
                    <div className="history-participant">
                      <span>{histB.name}</span>
                      <span style={{ fontSize: '1.2rem' }}>{getDecisionEmoji(r.decisionB)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };


  const downloadResults = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ participants, matchResults }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tournament_results_" + Date.now() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const renderLeaderboard = () => {
    const sorted = [...participants].sort((a, b) => b.score - a.score);

    const getStats = (participantId: string) => {
      let wins = 0, draws = 0, losses = 0;
      matchResults.forEach(r => {
        if (r.participantAId === participantId) {
          if (r.scoreA > r.scoreB) wins++;
          else if (r.scoreA === r.scoreB) draws++;
          else losses++;
        } else if (r.participantBId === participantId) {
          if (r.scoreB > r.scoreA) wins++;
          else if (r.scoreB === r.scoreA) draws++;
          else losses++;
        }
      });
      return { wins, draws, losses };
    };

    return (
      <div className="dashboard-grid animate-fade-in">
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div className="section-title" style={{ borderBottom: 'none', marginBottom: '2rem' }}>
            <Trophy size={32} className="text-accent-primary" />
            <h2 style={{ fontSize: '2rem' }}>Final Standings</h2>
          </div>
          
          <div className="participant-list">
            {sorted.map((p, i) => (
              <div key={p.id} className="participant-card leaderboard-item">
                <div className="leaderboard-rank">
                  {i === 0 ? '🏆' : `#${i + 1}`}
                </div>
                <img src={p.avatarUrl} alt={p.name} className="avatar" />
                <div className="participant-info" style={{ flex: 1 }}>
                  <div className="participant-name">{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {getStats(p.id).wins}W - {getStats(p.id).draws}D - {getStats(p.id).losses}L
                  </div>
                </div>
                <div className="leaderboard-score">{p.score} Pts</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
              className="btn-secondary" 
              onClick={downloadResults}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Download JSON
            </button>

            <button 
              className="btn-primary" 
              onClick={() => { setGameState('setup'); setMatchResults([]); setLogs([]); }}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              New Tournament
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Match History</h3>
          <div className="history-list">
            {matchResults.map((r, i) => {
              const pA = participants.find(p => p.id === r.participantAId)!;
              const pB = participants.find(p => p.id === r.participantBId)!;
              return (
                <div key={i} className="history-item history-clickable" onClick={() => setSelectedMatch(r)}>
                  <div className="history-participant">
                    <span style={{ fontSize: '1.2rem' }}>{getDecisionEmoji(r.decisionA)}</span>
                    <span>{pA.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>VS</span>
                  <div className="history-participant">
                    <span>{pB.name}</span>
                    <span style={{ fontSize: '1.2rem' }}>{getDecisionEmoji(r.decisionB)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="app-container">
      <header className="header animate-fade-in">
        <h1>AI Prisoner's Dilemma</h1>
        <p>System Prompts vs System Prompts in the ultimate test of trust.</p>
      </header>
      
      {gameState === 'setup' && renderSetup()}
      {gameState === 'playing' && renderPlaying()}
      {gameState === 'leaderboard' && renderLeaderboard()}
      {renderTranscriptModal()}
    </div>
  );
}

export default App;
