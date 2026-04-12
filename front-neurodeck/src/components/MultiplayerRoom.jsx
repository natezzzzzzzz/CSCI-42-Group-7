import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createRoom as apiCreateRoom,
  joinRoom as apiJoinRoom,
  leaveRoom as apiLeaveRoom,
  getRoomDetail,
  startGame as apiStartGame,
  endGame as apiEndGame,
  getFlashcard as apiGetFlashcard,
  submitAnswer as apiSubmitAnswer,
  fetchMyDecks,
  nextCard as apiNextCard,
  getImageUrl,
} from '../api/deckApi';
import { useAchievementNotify } from './AchievementToast';


const getUsernameFromToken = () => {
  try {
    const token = localStorage.getItem('access');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username ?? null;
  } catch {
    return null;
  }
};

const MEDALS = ['🥇', '🥈', '🥉'];


function Scoreboard({ participants, currentUsername, showSubmissionStatus }) {
  const sorted = [...participants].sort((a, b) => b.Score - a.Score);
  return (
    <div className="mp-scoreboard">
      <p className="mp-scoreboard-title">Scoreboard</p>
      {sorted.length === 0 && (
        <p className="mp-empty">No participants yet.</p>
      )}
      {sorted.map((p, i) => (
        <div key={p.user_id} className={`mp-scoreboard-row ${p.username === currentUsername ? 'is-me' : ''}`}>
          <span className="mp-scoreboard-rank">
            {MEDALS[i] ?? `#${i + 1}`}
          </span>
          <span className="mp-scoreboard-name">
            {p.username}
            {p.username === currentUsername && <span className="mp-you-badge">you</span>}
          </span>
          {showSubmissionStatus && (
            <span className={`mp-submission-status ${p.CurrentCardSubmitted ? 'done' : 'pending'}`}>
              {p.CurrentCardSubmitted
                ? (p.LastAnswerCorrect ? '✅' : '❌')
                : '⏳'}
            </span>
          )}
          <span className="mp-scoreboard-pts">{p.Score} pts</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="mp-progress-bar">
      <div className="mp-progress-track">
        <div className="mp-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="mp-progress-label">Card {current} / {total}</span>
    </div>
  );
}

function ScorePop({ show }) {
  return show ? <div className="mp-score-pop">+1</div> : null;
}

// onNext is null for non-hosts — all host-only buttons are guarded with {onNext && ...}
function FlashcardPanel({ card, onSubmit, onNext, isLoading, currentRound, totalRounds, confirmPayload, onConfirm }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showPop, setShowPop] = useState(false);
  const inputRef = useRef(null);

  // Reset state whenever the card changes
  useEffect(() => {
    setAnswer('');
    setFeedback(null);
    setShowPop(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [card?.CardID]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const result = await onSubmit(answer.trim());
    if (result) {
      setFeedback(result);
      if (result.is_correct) {
        setShowPop(true);
        setTimeout(() => setShowPop(false), 1200);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !feedback) handleSubmit();
  };

  if (!card) {
    return (
      <div className="mp-card mp-card-empty">
        {onNext ? (
          // Host sees a button while the first card is loading
          <button className="mp-btn mp-btn-primary" onClick={onNext} disabled={isLoading} id="mp-get-card-btn">
            {isLoading ? <span className="mp-spinner" /> : 'Get First Card →'}
          </button>
        ) : (
          <p className="mp-waiting-text">⏳ Waiting for host to start the round…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mp-card mp-card-enter">
      <ScorePop show={showPop} />

      {totalRounds > 0 && (
        <ProgressBar current={currentRound ?? 0} total={totalRounds} />
      )}

      <div className="mp-question-box">
        <span className="mp-question-label">Question</span>
        {card.QuestionImage && (
          <img src={getImageUrl(card.QuestionImage)} alt="Question" className="mp-card-image" />
        )}
        <p className="mp-question-text">{card.Question}</p>
      </div>

      {confirmPayload ? (
        <div className="mp-confirm-dialog">
          <p className="mp-confirm-warning">⚠️ {confirmPayload.warning}</p>
          <p className="mp-confirm-hint">You can wait or skip anyway.</p>
          <div className="mp-btn-row">
            <button
              id="mp-confirm-advance-btn"
              className="mp-btn mp-btn-danger"
              onClick={onConfirm}
              disabled={isLoading}
            >
              Skip Anyway
            </button>
            <button
              id="mp-cancel-advance-btn"
              className="mp-btn mp-btn-ghost"
              onClick={() => setConfirmPayload(null)}
              disabled={isLoading}
            >
              Wait for Players
            </button>
          </div>
        </div>
      ) : feedback ? (
        <div className={`mp-feedback ${feedback.is_correct ? 'mp-correct' : 'mp-incorrect'}`}>
          <span className="mp-feedback-icon">{feedback.is_correct ? '✅' : '❌'}</span>
          <div className="mp-feedback-content">
            <span>
              {feedback.is_correct
                ? 'Correct!'
                : `Incorrect — answer: ${feedback.correct_answer}`}
            </span>
            {!feedback.is_correct && feedback.correct_answer_image && (
              <img src={getImageUrl(feedback.correct_answer_image)} alt="Correct answer" className="mp-card-image mp-feedback-image" />
            )}
          </div>
          {/* "Next Card" only for host */}
          {onNext && (
            <button
              id="mp-next-btn"
              className="mp-btn mp-btn-primary mp-btn-full"
              onClick={onNext}
              disabled={isLoading}
            >
              {isLoading ? <span className="mp-spinner" /> : 'Next Card →'}
            </button>
          )}
        </div>
      ) : (
        <div className="mp-answer-area">
          <input
            ref={inputRef}
            id="mp-answer-input"
            className="mp-input"
            type="text"
            placeholder="Type your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="mp-btn-row">
            <button
              id="mp-submit-btn"
              className="mp-btn mp-btn-primary"
              onClick={handleSubmit}
              disabled={!answer.trim() || isLoading}
            >
              Submit
            </button>
            {/* "Skip" only for host */}
            {onNext && (
              <button
                id="mp-skip-btn"
                className="mp-btn mp-btn-ghost"
                onClick={onNext}
                disabled={isLoading}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function MultiplayerRoom({ onLeave }) {
  const navigate = useNavigate();
  const currentUsername = getUsernameFromToken();
  const notifyAchievement = useAchievementNotify();

  const [phase, setPhase] = useState('entry');  // entry | lobby | playing | finished
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [myDecks, setMyDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [selectedRounds, setSelectedRounds] = useState(10);
  const [decksLoading, setDecksLoading] = useState(false);

  const [room, setRoom] = useState(null);
  const [card, setCard] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [syncWarning, setSyncWarning] = useState(null);
  const [confirmPayload, setConfirmPayload] = useState(null); // { warning, unsynced_count } when host must confirm

  const pollRef = useRef(null);
  const roomRef = useRef(null);
  const checkSyncRef = useRef(null);

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => () => clearInterval(pollRef.current), []);

  useEffect(() => {
    setDecksLoading(true);
    fetchMyDecks()
      .then((data) => {
        setMyDecks(data);
        if (data.length > 0) setSelectedDeckId(data[0].DeckID);
      })
      .catch(() => {})
      .finally(() => setDecksLoading(false));
  }, []);

  const clearError = () => setError('');

  // FIX: No longer depends on `phase` — uses functional setState to avoid stale closures
  // inside the polling interval.
  const applyRoomUpdate = useCallback((data) => {
    setRoom(data);
    roomRef.current = data;
    setPhase((prev) => {
      if (data.Status === 'playing' && prev === 'lobby') return 'playing';
      if (data.Status === 'finished') return 'finished';
      return prev;
    });
  }, []);

  // Safe for all players — reads the current card WITHOUT advancing the index.
  // The server's GetFlashcardView is read-only; only NextCardView (host POST) mutates the index.
  const handleFetchCard = useCallback(async (roomCode) => {
    const code = roomCode ?? roomRef.current?.RoomCode;
    if (!code) return;
    setIsLoading(true);
    setConfirmPayload(null); // clear any stale blocking state when loading a new card
    try {
      const data = await apiGetFlashcard(code);
      if (data.game_over) { setPhase('finished'); return; }
      setCard(data);
      setCurrentRound(data.current_round ?? 0);
    } catch (e) {
      setError(e.message ?? 'Failed to fetch card.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polls room detail every 3 seconds.
  // When CurrentCardIndex changes (host advanced via NextCardView), all clients re-fetch
  // the card at the new index. This is the ONLY trigger for non-hosts to advance.
  const startPolling = useCallback((roomCode) => {
    if (pollRef.current) clearInterval(pollRef.current);

    // Seed with -1 so that index=0 (game just started) is always treated as "changed"
    // and both host and non-hosts auto-load the first card as soon as polling sees
    // Status = 'playing'.
    let lastCardIndex = -1;

    pollRef.current = setInterval(async () => {
      try {
        const data = await getRoomDetail(roomCode);
        setRoom(data);
        roomRef.current = data;

        if (data.Status === 'playing') {
          // Transition lobby → playing for non-hosts when the host starts the game
          setPhase((prev) => prev === 'lobby' ? 'playing' : prev);

          // Only fetch the card when the index has actually changed (host called /next/)
          if (data.CurrentCardIndex !== lastCardIndex) {
            lastCardIndex = data.CurrentCardIndex;
            handleFetchCard(roomCode);
          }
        }

        if (data.Status === 'finished') setPhase('finished');
      } catch { /* ignore transient network errors */ }
    }, 3000);
  }, [handleFetchCard]);

  // Host-only: advances the index on the server then immediately fetches the new card
  // for the host. Non-hosts will pick up the change on their next poll tick (≤3 s).
  const handleNextCard = useCallback(async () => {
    const code = roomRef.current?.RoomCode;
    if (!code) return;
    setIsLoading(true);
    try {
      const result = await apiNextCard(code);
      if (result.blocking) {
        setConfirmPayload({ warning: result.warning, unsynced_count: result.unsynced_count });
        setIsLoading(false);
        return;
      }
      if (result.game_over) { setPhase('finished'); return; }
      // Rapid-poll until all participants show CurrentCardSubmitted=True
      if (checkSyncRef.current) clearTimeout(checkSyncRef.current);
      setSyncWarning(null);
      const checkSync = async () => {
        const data = await getRoomDetail(code);
        const allSubmitted = data.participants?.every((p) => p.CurrentCardSubmitted);
        if (allSubmitted) {
          setSyncWarning(null);
        } else {
          setSyncWarning('Waiting for other players to submit...');
          checkSyncRef.current = setTimeout(checkSync, 500);
        }
      };
      checkSync();
      await handleFetchCard(code);
    } catch (e) {
      setError(e.message ?? 'Failed to advance card.');
    } finally {
      setIsLoading(false);
    }
  }, [handleFetchCard]);

  // Called when host clicks "Skip anyway" on the confirm dialog
  const handleConfirmAdvance = async () => {
    const code = roomRef.current?.RoomCode;
    if (!code) return;
    setConfirmPayload(null);
    setIsLoading(true);
    try {
      const result = await apiNextCard(code, true); // pass confirm=true
      if (result.game_over) { setPhase('finished'); return; }
      if (checkSyncRef.current) clearTimeout(checkSyncRef.current);
      setSyncWarning(null);
      const checkSync = async () => {
        const data = await getRoomDetail(code);
        const allSubmitted = data.participants?.every((p) => p.CurrentCardSubmitted);
        if (allSubmitted) {
          setSyncWarning(null);
        } else {
          setSyncWarning('Waiting for other players to submit...');
          checkSyncRef.current = setTimeout(checkSync, 500);
        }
      };
      checkSync();
      await handleFetchCard(code);
    } catch (e) {
      setError(e.message ?? 'Failed to advance card.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedDeckId) return setError('Please select a deck.');
    clearError();
    setIsLoading(true);
    try {
      const data = await apiCreateRoom(selectedDeckId);
      applyRoomUpdate(data);
      setPhase('lobby');
      startPolling(data.RoomCode);
    } catch (e) {
      setError(e.message ?? 'Failed to create room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return setError('Please enter a room code.');
    clearError();
    setIsLoading(true);
    try {
      const data = await apiJoinRoom(code);
      applyRoomUpdate(data);
      setPhase('lobby');
      startPolling(data.RoomCode);
    } catch (e) {
      setError(e.message ?? 'Failed to join room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    clearError();
    setIsLoading(true);
    try {
      const data = await apiStartGame(roomRef.current.RoomCode, selectedRounds);
      applyRoomUpdate(data);
      setPhase('playing');
      // FIX: Immediately fetch the first card for the host instead of waiting for the
      // next poll tick. Non-hosts pick it up via polling (CurrentCardIndex 0 !== -1).
      await handleFetchCard(data.RoomCode);
    } catch (e) {
      setError(e.message ?? 'Failed to start game.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndGame = async () => {
    clearError();
    try {
      const data = await apiEndGame(roomRef.current.RoomCode);
      applyRoomUpdate(data);
      setPhase('finished');
    } catch (e) {
      setError(e.message ?? 'Failed to end game.');
    }
  };

  const handleLeaveRoom = async () => {
    const code = roomRef.current?.RoomCode;
    if (code) {
      try { await apiLeaveRoom(code); } catch { /* ignore */ }
    }
    clearInterval(pollRef.current);
    onLeave();
  };

  const handleSubmitAnswer = async (answer) => {
    try {
      const data = await apiSubmitAnswer(roomRef.current.RoomCode, card.CardID, answer);
      if (data.is_correct) {
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
      // Show achievement toasts if any were unlocked
      if (data.new_achievements && data.new_achievements.length > 0) {
        data.new_achievements.forEach((a) => notifyAchievement(a));
      }
      // Refresh room to get live scoreboard update
      const roomData = await getRoomDetail(roomRef.current.RoomCode);
      setRoom(roomData);
      return data;
    } catch (e) {
      setError(e.message ?? 'Failed to submit answer.');
      return null;
    }
  };

  const isHost = room?.host_username === currentUsername;
  const myParticipant = room?.participants?.find((p) => p.username === currentUsername);


  if (phase === 'entry') {
    return (
      <div className="mp-entry">
        <div className="mp-panel">
          <h2 className="mp-panel-title">🚀 Create a Room</h2>

          <label className="mp-label" htmlFor="mp-deck-select">Select Deck</label>
          {decksLoading ? (
            <div className="mp-skeleton" />
          ) : myDecks.length === 0 ? (
            <p className="mp-empty">No decks found. <a href="/decks">Create one first →</a></p>
          ) : (
            <select
              id="mp-deck-select"
              className="mp-select"
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
            >
              {myDecks.map((d) => (
                <option key={d.DeckID} value={d.DeckID}>
                  {d.DeckName} ({d.card_count} cards)
                </option>
              ))}
            </select>
          )}

          <label className="mp-label" htmlFor="mp-rounds-select">Rounds</label>
          <select
            id="mp-rounds-select"
            className="mp-select"
            value={selectedRounds}
            onChange={(e) => setSelectedRounds(Number(e.target.value))}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n} rounds</option>
            ))}
          </select>

          <button
            id="mp-create-btn"
            className={`mp-btn mp-btn-primary mp-btn-full ${isLoading ? 'mp-loading' : ''}`}
            onClick={handleCreateRoom}
            disabled={isLoading || myDecks.length === 0}
          >
            {isLoading ? <span className="mp-spinner" /> : 'Create Room'}
          </button>
        </div>

        <div className="mp-divider"><span>or</span></div>

        <div className="mp-panel">
          <h2 className="mp-panel-title">🔗 Join a Room</h2>
          <label className="mp-label" htmlFor="mp-join-input">Room Code</label>
          <input
            id="mp-join-input"
            className="mp-input"
            type="text"
            placeholder="e.g. AB12CD"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <button
            id="mp-join-btn"
            className={`mp-btn mp-btn-secondary mp-btn-full ${isLoading ? 'mp-loading' : ''}`}
            onClick={handleJoinRoom}
            disabled={isLoading}
          >
            {isLoading ? <span className="mp-spinner" /> : 'Join Room'}
          </button>
        </div>

        {error && <p className="mp-error">{error}</p>}
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="mp-lobby">
        <div className="mp-panel has-text-centered">
          <p className="mp-room-code-label">Room Code</p>
          <p className="mp-room-code" id="mp-room-code-display">{room?.RoomCode}</p>
          <p className="mp-room-hint">Share this code with friends to join</p>
        </div>

        <Scoreboard participants={room?.participants ?? []} currentUsername={currentUsername} />

        <p className="mp-waiting-text">⏳ Waiting for host to start…</p>

        {isHost && (
          <div className="mp-host-controls">
            <label className="mp-label" htmlFor="mp-lobby-rounds">Rounds</label>
            <select
              id="mp-lobby-rounds"
              className="mp-select"
              value={selectedRounds}
              onChange={(e) => setSelectedRounds(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} rounds</option>
              ))}
            </select>
            <button
              id="mp-start-btn"
              className="mp-btn mp-btn-success mp-btn-full"
              onClick={handleStartGame}
              disabled={isLoading}
            >
              {isLoading ? <span className="mp-spinner" /> : '▶ Start Game'}
            </button>
          </div>
        )}

        {error && <p className="mp-error">{error}</p>}

        <button id="mp-leave-lobby-btn" className="mp-btn mp-btn-ghost mp-btn-full" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="mp-playing">
        <div className="mp-play-main">
          <div className="mp-play-header">
            <div className="mp-room-tag">Room: <strong>{room?.RoomCode}</strong></div>
            <div className="mp-score-tag">
              Score: <strong>{myParticipant?.Score ?? 0}</strong>
            </div>
            {streak >= 2 && (
              <div className="mp-streak">🔥 {streak} streak</div>
            )}
          </div>

          {confirmPayload ? (
            <div className="mp-sync-warning mp-sync-warning--confirm">{confirmPayload.warning}</div>
          ) : syncWarning ? (
            <div className="mp-sync-warning">{syncWarning}</div>
          ) : null}

          {/* onNext is handleNextCard for host, null for non-hosts */}
          <FlashcardPanel
            card={card}
            onSubmit={handleSubmitAnswer}
            onNext={isHost ? handleNextCard : null}
            isLoading={isLoading}
            currentRound={currentRound}
            totalRounds={room?.TotalRounds ?? 0}
            confirmPayload={confirmPayload}
            onConfirm={handleConfirmAdvance}
          />

          {isHost && (
            <button id="mp-end-btn" className="mp-btn mp-btn-danger mp-btn-full" onClick={handleEndGame}>
              ⏹ End Game
            </button>
          )}

          {error && <p className="mp-error">{error}</p>}
        </div>

        <div className="mp-play-sidebar">
          <Scoreboard participants={room?.participants ?? []} currentUsername={currentUsername} showSubmissionStatus={true} />
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const sorted = [...(room?.participants ?? [])].sort((a, b) => b.Score - a.Score);
    const winner = sorted[0];
    const isWinner = winner?.username === currentUsername;

    return (
      <div className="mp-finished">
        <div className="mp-winner-banner">
          <div className="mp-winner-trophy">{isWinner ? '🏆' : '🎉'}</div>
          <h2 className="mp-winner-title">
            {isWinner ? 'You Win!' : `${winner?.username ?? '?'} Wins!`}
          </h2>
          {winner && (
            <p className="mp-winner-score">
              {winner.username} — {winner.Score} pts
            </p>
          )}
        </div>

        <Scoreboard participants={room?.participants ?? []} currentUsername={currentUsername} />

        <button
          id="mp-back-to-menu-btn"
          className="mp-btn mp-btn-primary mp-btn-full"
          onClick={handleLeaveRoom}
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return null;
}
