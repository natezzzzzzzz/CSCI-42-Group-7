import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/multiplayer';

/** Read the JWT access token from localStorage. */
const getToken = () => localStorage.getItem('access');

/** Axios config with Bearer token header. */
const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
});

/**
 * Decode user_id from the JWT payload.
 * djangorestframework-simplejwt embeds `user_id` by default.
 */
const getUserIdFromToken = () => {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id ?? null;
  } catch {
    return null;
  }
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function Scoreboard({ participants, currentUserId }) {
  const sorted = [...participants].sort((a, b) => b.Score - a.Score);
  return (
    <div className="box">
      <p className="has-text-weight-bold mb-3">Scoreboard</p>
      {sorted.length === 0 && (
        <p className="has-text-grey">No participants yet.</p>
      )}
      {sorted.map((p, i) => (
        <div key={p.user_id} className="is-flex is-justify-content-space-between mb-2">
          <span>
            {i === 0 && <span className="mr-1">🥇</span>}
            <span className={p.user_id === currentUserId ? 'has-text-weight-bold' : ''}>
              {p.username}
              {p.user_id === currentUserId && ' (you)'}
            </span>
          </span>
          <span className="tag is-primary">{p.Score} pts</span>
        </div>
      ))}
    </div>
  );
}

function FlashcardPanel({ card, onSubmit, onSkip, isLoading }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // { is_correct, correct_answer }

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const result = await onSubmit(answer.trim());
    if (result) {
      setFeedback(result);
      setAnswer('');
    }
  };

  const handleNext = () => {
    setFeedback(null);
    onSkip();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !feedback) handleSubmit();
  };

  if (!card) {
    return (
      <div className="box has-text-centered">
        <button className="button is-primary" onClick={onSkip} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Get First Card'}
        </button>
      </div>
    );
  }

  return (
    <div className="box">
      {/* Question */}
      <div className="notification is-dark mb-4">
        <p className="has-text-weight-bold mb-1 text-small has-text-grey">Question</p>
        <p className="h4">{card.Question}</p>
      </div>

      {/* Feedback after answer */}
      {feedback ? (
        <div>
          <div className={`notification ${feedback.is_correct ? 'is-success' : 'is-danger'} mb-3`}>
            {feedback.is_correct
              ? '✅ Correct!'
              : `❌ Incorrect — correct answer: ${feedback.correct_answer}`}
          </div>
          <button className="button is-primary is-fullwidth" onClick={handleNext}>
            Next Card
          </button>
        </div>
      ) : (
        <div>
          <div className="field">
            <div className="control">
              <input
                className="input"
                type="text"
                placeholder="Your answer…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
          </div>
          <div className="buttons">
            <button
              className="button is-primary is-flex-grow-1"
              onClick={handleSubmit}
              disabled={!answer.trim() || isLoading}
            >
              Submit
            </button>
            <button className="button is-light" onClick={handleNext} disabled={isLoading}>
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * MultiplayerRoom
 *
 * Props:
 *   deckId  — the deck to use when creating a room (optional; undefined = ask user)
 *   onLeave — callback when user navigates away
 */
export default function MultiplayerRoom({ deckId, onLeave }) {
  const userId = getUserIdFromToken();

  // UI state machine: 'entry' | 'lobby' | 'playing' | 'finished'
  const [phase, setPhase] = useState('entry');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Entry form
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [createDeckId, setCreateDeckId] = useState(deckId ?? '');

  // Room
  const [room, setRoom] = useState(null); // full room object from API
  const [card, setCard] = useState(null);

  const pollRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const clearError = () => setError('');

  const applyRoomUpdate = useCallback((data) => {
    setRoom(data);
    if (data.Status === 'playing' && phase !== 'playing') setPhase('playing');
    if (data.Status === 'finished') setPhase('finished');
  }, [phase]);

  // ── Polling ──────────────────────────────────────────────────────────────────

  const startPolling = useCallback((roomCode) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/${roomCode}/`, authHeaders());
        applyRoomUpdate(res.data);
      } catch {
        // Silently ignore transient polling errors
      }
    }, 3000);
  }, [applyRoomUpdate]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const createRoom = async () => {
    if (!createDeckId) return setError('Please enter a Deck ID.');
    clearError();
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API}/create-room/`,
        { deck_id: createDeckId },
        authHeaders(),
      );
      applyRoomUpdate(res.data);
      setPhase('lobby');
      startPolling(res.data.RoomCode);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to create room.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return setError('Please enter a room code.');
    clearError();
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API}/join-room/`,
        { room_code: code },
        authHeaders(),
      );
      applyRoomUpdate(res.data);
      setPhase('lobby');
      startPolling(code);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Room not found or already finished.');
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    clearError();
    try {
      const res = await axios.post(
        `${API}/${room.RoomCode}/start/`,
        {},
        authHeaders(),
      );
      applyRoomUpdate(res.data);
      setPhase('playing');
      fetchCard();
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to start game.');
    }
  };

  const fetchCard = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/${room.RoomCode}/flashcard/`, authHeaders());
      setCard(res.data);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to fetch card.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (answer) => {
    try {
      const res = await axios.post(
        `${API}/submit-answer/`,
        { room_code: room.RoomCode, card_id: card.CardID, answer },
        authHeaders(),
      );
      return res.data; // { is_correct, correct_answer, score }
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to submit answer.');
      return null;
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────────

  const isHost = room?.Host === userId;
  const myParticipant = room?.participants.find((p) => p.user_id === userId);

  // ── Phase: Entry ─────────────────────────────────────────────────────────────

  if (phase === 'entry') {
    return (
      <div className="columns is-centered mt-4">
        <div className="column is-8-tablet is-6-desktop">
          {/* Create room */}
          <div className="box mb-5">
            <p className="h4 mb-4">Create a Room</p>
            <div className="field">
              <label className="label">Deck ID</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. DECK-0001"
                  value={createDeckId}
                  onChange={(e) => setCreateDeckId(e.target.value)}
                />
              </div>
            </div>
            <button
              className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
              onClick={createRoom}
              disabled={isLoading}
            >
              Create Room
            </button>
          </div>

          <div className="is-flex is-align-items-center mb-5">
            <hr className="is-flex-grow-1" />
            <span className="mx-3 has-text-grey text-small">or</span>
            <hr className="is-flex-grow-1" />
          </div>

          {/* Join room */}
          <div className="box">
            <p className="h4 mb-4">Join a Room</p>
            <div className="field">
              <label className="label">Room Code</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
            </div>
            <button
              className={`button is-link is-fullwidth ${isLoading ? 'is-loading' : ''}`}
              onClick={joinRoom}
              disabled={isLoading}
            >
              Join Room
            </button>
          </div>

          {error && <p className="help is-danger mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Phase: Lobby ─────────────────────────────────────────────────────────────

  if (phase === 'lobby') {
    return (
      <div className="columns is-centered mt-4">
        <div className="column is-8-tablet is-6-desktop">
          <div className="box has-text-centered mb-5">
            <p className="text-small has-text-grey mb-1">Room Code</p>
            <p className="h4 tagline">{room?.RoomCode}</p>
            <p className="text-small has-text-grey mt-2">
              Share this code with friends to join
            </p>
          </div>

          <Scoreboard participants={room?.participants ?? []} currentUserId={userId} />

          <p className="text-small has-text-grey has-text-centered mb-3">
            Waiting for host to start…
          </p>

          {isHost && (
            <button className="button is-success is-fullwidth" onClick={startGame}>
              Start Game
            </button>
          )}

          {error && <p className="help is-danger mt-3">{error}</p>}

          <button className="button is-ghost is-fullwidth mt-3" onClick={onLeave}>
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: Playing ────────────────────────────────────────────────────────────

  if (phase === 'playing') {
    return (
      <div className="columns mt-4">
        <div className="column is-7">
          <div className="box mb-4">
            <div className="is-flex is-justify-content-space-between is-align-items-center">
              <span className="text-small has-text-grey">Room: <strong>{room?.RoomCode}</strong></span>
              <span className="tag is-primary">
                My score: {myParticipant?.Score ?? 0}
              </span>
            </div>
          </div>

          <FlashcardPanel
            card={card}
            onSubmit={submitAnswer}
            onSkip={fetchCard}
            isLoading={isLoading}
          />

          {error && <p className="help is-danger">{error}</p>}
        </div>

        <div className="column is-5">
          <Scoreboard participants={room?.participants ?? []} currentUserId={userId} />
        </div>
      </div>
    );
  }

  // ── Phase: Finished ───────────────────────────────────────────────────────────

  if (phase === 'finished') {
    const winner = [...(room?.participants ?? [])]
      .sort((a, b) => b.Score - a.Score)[0];
    return (
      <div className="columns is-centered mt-4">
        <div className="column is-8-tablet is-6-desktop has-text-centered">
          <div className="box mb-5">
            <p className="h4 mb-2">Game Over!</p>
            {winner && (
              <p className="tagline">
                🏆 {winner.username} wins with {winner.Score} pts
              </p>
            )}
          </div>
          <Scoreboard participants={room?.participants ?? []} currentUserId={userId} />
          <button className="button is-primary is-fullwidth mt-4" onClick={onLeave}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
