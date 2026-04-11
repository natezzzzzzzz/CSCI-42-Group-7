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
  const [cards, setCards] = useState([]); // all due cards from API
  const [studyQueue, setStudyQueue] = useState([]); // ordered queue with re-queued cards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [lastScheduling, setLastScheduling] = useState(null);
  const [ratingInProgress, setRatingInProgress] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctCount: 0,
    cardsMastered: 0,
  });
  // Track requeue counts per card to prevent infinite loops
  const requeueCounts = useRef({});

  // Load due cards on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await startSoloSession(deckId, daysAhead);
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

        // Show scheduling info
        setLastScheduling(data.scheduling);

        // Update session stats
        setSessionStats((prev) => ({
          cardsStudied: prev.cardsStudied + 1,
          correctCount: prev.correctCount + (rating >= 3 ? 1 : 0),
          cardsMastered:
            prev.cardsMastered + (data.scheduling.mastered ? 1 : 0),
        }));

        // Show achievement toasts
        if (data.new_achievements) {
          data.new_achievements.forEach((a) => notifyAchievement(a));
        }

        // If "Again" was pressed, re-queue this card (with limit)
        // Also update the card's previews for the next time it appears
        if (data.scheduling.requeue) {
          const cardId = currentCard.CardID;
          const currentCount = requeueCounts.current[cardId] || 0;
          if (currentCount < MAX_REQUEUES_PER_CARD) {
            requeueCounts.current[cardId] = currentCount + 1;
            setStudyQueue((prev) => [
              ...prev,
              {
                ...currentCard,
                _requeues: currentCount + 1,
                previews: data.previews,
              },
            ]);
          }
        }

        // Brief delay to show scheduling result, then advance
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
    } catch {
      // Silently handle
    }
    navigate("/decks");
  }, [deckId, sessionStats, navigate, notifyAchievement]);

  // Auto-complete session when all cards are done
  useEffect(() => {
    if (sessionComplete && !completionReported.current) {
      completionReported.current = true;
      const duration = Math.round(
        (Date.now() - sessionStartRef.current) / 1000
      );
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

  // Loading state
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <p className="is-size-4">Loading study session...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <p className="has-text-danger">{error}</p>
        <button
          className="button is-link mt-4"
          onClick={() => navigate("/decks")}
        >
          Back to Decks
        </button>
      </div>
    );
  }

  // No cards due
  if (cards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <h3 className="title is-3">No Cards Due</h3>
        <p className="subtitle is-5">
          All cards in this deck are scheduled for later. Great job!
        </p>
        <button
          className="button is-link"
          onClick={() => navigate("/decks")}
        >
          Back to Decks
        </button>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <div
          className="box"
          style={{ maxWidth: "500px", margin: "0 auto", padding: "40px" }}
        >
          <h3 className="title is-3">Session Complete!</h3>
          <div style={{ margin: "24px 0", textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>Cards studied</span>
              <strong>{sessionStats.cardsStudied}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>Correct</span>
              <strong>{sessionStats.correctCount}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>Accuracy</span>
              <strong>
                {sessionStats.cardsStudied > 0
                  ? Math.round(
                      (sessionStats.correctCount / sessionStats.cardsStudied) *
                        100
                    )
                  : 0}
                %
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Cards mastered</span>
              <strong className="has-text-success">
                {sessionStats.cardsMastered}
              </strong>
            </div>
          </div>
          <button
            className="button is-link is-medium"
            onClick={() => navigate("/decks")}
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // Active study session
  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "600px",
          margin: "0 auto 20px",
        }}
      >
        <button className="button is-light is-small" onClick={handleFinishEarly}>
          Finish Early
        </button>
        <span className="tag is-medium is-info is-light">
          {currentIndex + 1} / {studyQueue.length}
        </span>
        <span className="tag is-light">
          {sessionStats.cardsStudied} studied
        </span>
      </div>

      {/* Flashcard */}
      {currentCard && (
        <div
          onClick={handleFlip}
          style={{
            border: "2px solid #ccc",
            borderRadius: "12px",
            padding: "60px 40px",
            margin: "20px auto",
            maxWidth: "500px",
            minHeight: "200px",
            cursor: isFlipped ? "default" : "pointer",
            backgroundColor: isFlipped ? "#f0f8ff" : "#ffffff",
            transition: "background-color 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          {isFlipped ? currentCard.Answer : currentCard.Question}
        </div>
      )}

      {/* Hint */}
      <p style={{ color: "#999", fontSize: "13px", marginBottom: "16px" }}>
        {isFlipped ? "Rate how well you knew this" : "Click to reveal answer"}
      </p>

      {/* Rating buttons (visible only after flip) */}
      {isFlipped && currentCard && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "8px",
          }}
        >
          <button
            className="button is-danger"
            onClick={() => handleRate(1)}
            disabled={ratingInProgress}
            title="Very Difficult - card reappears soon"
          >
            <span>Again</span>
            <span className="tag is-light ml-2" style={{ fontSize: "11px" }}>
              {currentCard.previews?.["1"] || "1m"}
            </span>
          </button>
          <button
            className="button is-warning"
            onClick={() => handleRate(2)}
            disabled={ratingInProgress}
            title="Difficult - shorter interval"
          >
            <span>Hard</span>
            <span className="tag is-light ml-2" style={{ fontSize: "11px" }}>
              {currentCard.previews?.["2"] || "10m"}
            </span>
          </button>
          <button
            className="button is-success"
            onClick={() => handleRate(3)}
            disabled={ratingInProgress}
            title="Okay - standard progression"
          >
            <span>Good</span>
            <span className="tag is-light ml-2" style={{ fontSize: "11px" }}>
              {currentCard.previews?.["3"] || "1d"}
            </span>
          </button>
          <button
            className="button is-info"
            onClick={() => handleRate(4)}
            disabled={ratingInProgress}
            title="Easy - accelerated progression"
          >
            <span>Easy</span>
            <span className="tag is-light ml-2" style={{ fontSize: "11px" }}>
              {currentCard.previews?.["4"] || "4d"}
            </span>
          </button>
        </div>
      )}

      {/* Scheduling feedback */}
      {lastScheduling && (
        <p
          style={{
            marginTop: "16px",
            fontSize: "14px",
            color: lastScheduling.requeue
              ? "#e74c3c"
              : lastScheduling.mastered
              ? "#27ae60"
              : "#666",
            fontWeight: lastScheduling.mastered ? "bold" : "normal",
          }}
        >
          {lastScheduling.requeue
            ? "Card re-added to your session"
            : lastScheduling.mastered
            ? "Card mastered!"
            : `Next review: ${lastScheduling.next_review_label}`}
        </p>
      )}
    </div>
  );
}