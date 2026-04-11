import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  startSoloSession,
  rateSoloCard,
  reportSoloSessionComplete,
} from "../api/deckApi";
import { useAchievementNotify } from "../components/AchievementToast";

const MAX_REQUEUES_PER_CARD = 3;

export default function SoloGamePage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const daysAhead = parseInt(searchParams.get("days_ahead")) || 0;
  const notifyAchievement = useAchievementNotify();
  const completionReported = useRef(false);
  const sessionStartRef = useRef(Date.now());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);
  const [studyQueue, setStudyQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [lastScheduling, setLastScheduling] = useState(null);
  const [ratingInProgress, setRatingInProgress] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctCount: 0,
    cardsMastered: 0,
  });
  const requeueCounts = useRef({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await startSoloSession(deckId, daysAhead);
        setDeckName(data.deck_name || "Study Session");
        if (data.cards.length === 0) {
          setCards([]);
          setStudyQueue([]);
        } else {
          setCards(data.cards);
          setStudyQueue(data.cards.map((c) => ({ ...c, _requeues: 0 })));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId]);

  const currentCard = studyQueue[currentIndex] || null;

  const handleFlip = useCallback(() => {
    if (!isFlipped) setIsFlipped(true);
  }, [isFlipped]);

  const advanceCard = useCallback(() => {
    setIsFlipped(false);
    setLastScheduling(null);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= studyQueue.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, studyQueue.length]);

  const handleRate = useCallback(
    async (rating) => {
      if (!currentCard || ratingInProgress) return;
      setRatingInProgress(true);
      try {
        const data = await rateSoloCard(currentCard.CardID, rating);
        setLastScheduling(data.scheduling);
        setSessionStats((prev) => ({
          cardsStudied: prev.cardsStudied + 1,
          correctCount: prev.correctCount + (rating >= 3 ? 1 : 0),
          cardsMastered: prev.cardsMastered + (data.scheduling.mastered ? 1 : 0),
        }));
        if (data.new_achievements) {
          data.new_achievements.forEach((a) => notifyAchievement(a));
        }
        if (data.scheduling.requeue) {
          const cardId = currentCard.CardID;
          const currentCount = requeueCounts.current[cardId] || 0;
          if (currentCount < MAX_REQUEUES_PER_CARD) {
            requeueCounts.current[cardId] = currentCount + 1;
            setStudyQueue((prev) => [
              ...prev,
              { ...currentCard, _requeues: currentCount + 1, previews: data.previews },
            ]);
          }
        }
        setTimeout(() => {
          advanceCard();
          setRatingInProgress(false);
        }, 800);
      } catch (err) {
        console.error("Error rating card:", err);
        setRatingInProgress(false);
      }
    },
    [currentCard, ratingInProgress, advanceCard, notifyAchievement]
  );

  const handleFinishEarly = useCallback(async () => {
    if (completionReported.current) return;
    completionReported.current = true;
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    try {
      const data = await reportSoloSessionComplete(
        deckId,
        sessionStats.cardsStudied,
        sessionStats.correctCount,
        sessionStats.cardsStudied,
        sessionStats.cardsMastered,
        duration
      );
      if (data.new_achievements) {
        data.new_achievements.forEach((a) => notifyAchievement(a));
      }
    } catch {}
    navigate("/decks");
  }, [deckId, sessionStats, navigate, notifyAchievement]);

  useEffect(() => {
    if (sessionComplete && !completionReported.current) {
      completionReported.current = true;
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      reportSoloSessionComplete(
        deckId,
        sessionStats.cardsStudied,
        sessionStats.correctCount,
        sessionStats.cardsStudied,
        sessionStats.cardsMastered,
        duration
      )
        .then((data) => {
          if (data.new_achievements) {
            data.new_achievements.forEach((a) => notifyAchievement(a));
          }
        })
        .catch(() => {});
    }
  }, [sessionComplete, deckId, sessionStats, notifyAchievement]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="sg-centered-state">
        <span className="mp-spinner" />
        <p className="sg-state-text">Loading study session...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="sg-centered-state">
        <p className="mp-error">{error}</p>
        <button className="mp-btn mp-btn-primary" onClick={() => navigate("/decks")}>
          Back to Decks
        </button>
      </div>
    );
  }

  // ── No cards due ──
  if (cards.length === 0) {
    return (
      <div className="sg-centered-state">
        <div className="mp-panel sg-state-panel">
          <div className="sg-state-icon">🎉</div>
          <h3 className="h5">No Cards Due</h3>
          <p className="sg-state-text">All cards in this deck are scheduled for later. Great job!</p>
          <button className="mp-btn mp-btn-primary" onClick={() => navigate("/decks")}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // ── Session complete ──
  if (sessionComplete) {
    const accuracy = sessionStats.cardsStudied > 0
      ? Math.round((sessionStats.correctCount / sessionStats.cardsStudied) * 100)
      : 0;
    return (
      <div className="sg-centered-state">
        <div className="mp-panel sg-state-panel">
          <div className="sg-state-icon">✅</div>
          <h3 className="h5">Session Complete!</h3>
          <div className="sg-stat-rows">
            <div className="sg-stat-row">
              <span>Cards studied</span>
              <strong>{sessionStats.cardsStudied}</strong>
            </div>
            <div className="sg-stat-row">
              <span>Correct</span>
              <strong>{sessionStats.correctCount}</strong>
            </div>
            <div className="sg-stat-row">
              <span>Accuracy</span>
              <strong>{accuracy}%</strong>
            </div>
            <div className="sg-stat-row">
              <span>Cards mastered</span>
              <strong className="sg-mastered">{sessionStats.cardsMastered}</strong>
            </div>
          </div>
          <button className="mp-btn mp-btn-primary mp-btn-full" onClick={() => navigate("/decks")}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // ── Active session ──
  const progress = (currentIndex / studyQueue.length) * 100;

  return (
    <div className="container mp-page sg-page">

      {/* Header */}
      <div className="sg-header">
        <div className="sg-header-top">
          <button className="mp-back-btn" onClick={handleFinishEarly}>
            ← Finish Early
          </button>
          <h1 className="h6 sg-header-title">{deckName}</h1>
          <span className="mp-score-tag">{sessionStats.cardsStudied} studied</span>
        </div>
        <div className="sg-header-bottom">
          <div className="mp-progress-bar">
            <div className="mp-progress-track">
              <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="mp-progress-label">{currentIndex + 1} / {studyQueue.length}</span>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      {currentCard && (
        <div
          className={`mp-card sg-flashcard mp-card-enter ${isFlipped ? "sg-flipped" : ""}`}
          onClick={handleFlip}
        >
          <span className="mp-question-label">
            {isFlipped ? "Answer" : "Question"}
          </span>
          <p className="mp-question-text sg-card-text">
            {isFlipped ? currentCard.Answer : currentCard.Question}
          </p>
          {!isFlipped && (
            <p className="sg-flip-hint">Click to reveal answer</p>
          )}
        </div>
      )}

      {/* Scheduling feedback */}
      {lastScheduling && (
        <div className={`mp-feedback ${lastScheduling.requeue ? "mp-incorrect" : "mp-correct"}`}>
          <span className="mp-feedback-icon">
            {lastScheduling.requeue ? "🔁" : lastScheduling.mastered ? "🏆" : "⏱️"}
          </span>
          <span>
            {lastScheduling.requeue
              ? "Card re-added to your session"
              : lastScheduling.mastered
              ? "Card mastered!"
              : `Next review: ${lastScheduling.next_review_label}`}
          </span>
        </div>
      )}

      {/* Rating buttons */}
      {isFlipped && currentCard && (
        <div className="sg-rating-row">
          {[
            { rating: 1, label: "Again", preview: currentCard.previews?.["1"] || "1m",  cls: "sg-btn-again" },
            { rating: 2, label: "Hard",  preview: currentCard.previews?.["2"] || "10m", cls: "sg-btn-hard"  },
            { rating: 3, label: "Good",  preview: currentCard.previews?.["3"] || "1d",  cls: "sg-btn-good"  },
            { rating: 4, label: "Easy",  preview: currentCard.previews?.["4"] || "4d",  cls: "sg-btn-easy"  },
          ].map(({ rating, label, preview, cls }) => (
            <button
              key={rating}
              className={`mp-btn sg-rating-btn ${cls}`}
              onClick={() => handleRate(rating)}
              disabled={ratingInProgress}
            >
              <span className="sg-rating-label">{label}</span>
              <span className="sg-rating-preview">{preview}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}