import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { startSoloSession, rateSoloCard, reportSoloSessionComplete, getImageUrl } from "../api/deckApi";
import { useAchievementNotify } from "../components/AchievementToast";
import DashboardLayout from "../components/DashboardLayout";

// This caps how many times a single card can be re-added to the queue in one session
// to prevent an "Again" loop from making the session feel endless.
const MAX_REQUEUES_PER_CARD = 3;

// This page manages the solo study session for a given deck. It handles loading the session data, displaying cards one at a time, allowing the user to flip the card and rate their recall, and providing feedback on scheduling.
export default function SoloGamePage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const daysAhead = parseInt(searchParams.get("days_ahead")) || 0;
  const notifyAchievement = useAchievementNotify();
  // Guard against reporting session completion twice (e.g. finish-early + natural end).
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
  const [sessionStats, setSessionStats] = useState({ cardsStudied: 0, correctCount: 0, cardsMastered: 0 });
  const requeueCounts = useRef({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await startSoloSession(deckId, daysAhead);
        setDeckName(data.deck_name || "Study Session");
        if (data.cards.length === 0) {
          setCards([]); setStudyQueue([]);
        } else {
          setCards(data.cards);
          setStudyQueue(data.cards.map(c => ({ ...c, _requeues: 0 })));
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

  const handleFlip = useCallback(() => { if (!isFlipped) setIsFlipped(true); }, [isFlipped]);

  const advanceCard = useCallback(() => {
    setIsFlipped(false); setLastScheduling(null);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= studyQueue.length) setSessionComplete(true);
    else setCurrentIndex(nextIndex);
  }, [currentIndex, studyQueue.length]);

  const handleRate = useCallback(async (rating) => {
    if (!currentCard || ratingInProgress) return;
    setRatingInProgress(true);
    try {
      const data = await rateSoloCard(currentCard.CardID, rating);
      setLastScheduling(data.scheduling);
      setSessionStats(prev => ({
        cardsStudied: prev.cardsStudied + 1,
        correctCount: prev.correctCount + (rating >= 3 ? 1 : 0),
        cardsMastered: prev.cardsMastered + (data.scheduling.mastered ? 1 : 0),
      }));
      if (data.new_achievements) data.new_achievements.forEach(a => notifyAchievement(a));
      if (data.scheduling.requeue) {
        const cardId = currentCard.CardID;
        const cur = requeueCounts.current[cardId] || 0;
        if (cur < MAX_REQUEUES_PER_CARD) {
          requeueCounts.current[cardId] = cur + 1;
          setStudyQueue(prev => [...prev, { ...currentCard, _requeues: cur + 1, previews: data.previews }]);
        }
      }
      setTimeout(() => { try { advanceCard(); } finally { setRatingInProgress(false); } }, 800);
    } catch (err) {
      console.error("Error rating card:", err);
      setRatingInProgress(false);
    }
  }, [currentCard, ratingInProgress, advanceCard, notifyAchievement]);

  const handleFinishEarly = useCallback(async () => {
    if (completionReported.current) return;
    completionReported.current = true;
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    try {
      const data = await reportSoloSessionComplete(deckId, sessionStats.cardsStudied, sessionStats.correctCount, sessionStats.cardsStudied, sessionStats.cardsMastered, duration);
      if (data.new_achievements) data.new_achievements.forEach(a => notifyAchievement(a));
    } catch {}
    navigate("/decks");
  }, [deckId, sessionStats, navigate, notifyAchievement]);

  useEffect(() => {
    if (sessionComplete && !completionReported.current) {
      completionReported.current = true;
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      reportSoloSessionComplete(deckId, sessionStats.cardsStudied, sessionStats.correctCount, sessionStats.cardsStudied, sessionStats.cardsMastered, duration)
        .then(data => { if (data.new_achievements) data.new_achievements.forEach(a => notifyAchievement(a)); })
        .catch(() => {});
    }
  }, [sessionComplete, deckId, sessionStats, notifyAchievement]);

  if (loading) return (
    <DashboardLayout>
      <div className="sg-lp-center"><span className="sg-lp-spinner"/><p className="sg-lp-state-text">Loading session...</p></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="sg-lp-center">
        <div className="sg-lp-state-card">
          <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>
          <button className="sg-lp-btn sg-lp-btn-primary" onClick={() => navigate("/decks")}>Back to Decks</button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (cards.length === 0) return (
    <DashboardLayout>
      <div className="sg-lp-center">
        <div className="sg-lp-state-card">
          <div className="sg-lp-state-icon">🎉</div>
          <h3 className="sg-lp-state-title">All Caught Up!</h3>
          <p className="sg-lp-state-text">No cards are due right now. Great work!</p>
          <button className="sg-lp-btn sg-lp-btn-primary" onClick={() => navigate("/decks")}>Back to Decks</button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (sessionComplete) {
    const accuracy = sessionStats.cardsStudied > 0
      ? Math.round((sessionStats.correctCount / sessionStats.cardsStudied) * 100) : 0;
    return (
      <DashboardLayout>
        <div className="sg-lp-center">
          <div className="sg-lp-state-card">
            <div className="sg-lp-state-icon">✅</div>
            <h3 className="sg-lp-state-title">Session Complete!</h3>
            <div className="sg-lp-stats">
              {[
                ["Cards studied", sessionStats.cardsStudied],
                ["Correct", sessionStats.correctCount],
                ["Accuracy", `${accuracy}%`],
                ["Mastered", sessionStats.cardsMastered],
              ].map(([label, value]) => (
                <div key={label} className="sg-lp-stat-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <button className="sg-lp-btn sg-lp-btn-primary" style={{ width: "100%" }} onClick={() => navigate("/decks")}>Back to Decks</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = studyQueue.length > 0 ? (currentIndex / studyQueue.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="sg-lp-wrap">
        <div className="sg-lp-header">
          <button className="sg-lp-back" onClick={handleFinishEarly}>← Finish Early</button>
          <h2 className="sg-lp-deck-name">{deckName}</h2>
          <span className="sg-lp-score-tag">{sessionStats.cardsStudied} studied</span>
        </div>

        <div className="sg-lp-progress">
          <div className="sg-lp-progress-track">
            <div className="sg-lp-progress-fill" style={{ width: `${progress}%` }}/>
          </div>
          <span className="sg-lp-progress-label">{currentIndex + 1} / {studyQueue.length}</span>
        </div>

        {currentCard && (
          <div
            className={`sg-lp-card${isFlipped ? " sg-lp-flipped" : ""}`}
            onClick={handleFlip}
          >
            <span className="sg-lp-card-label">{isFlipped ? "Answer" : "Question"}</span>
            {isFlipped ? (
              <>
                {currentCard.AnswerImage && (
                  <img src={getImageUrl(currentCard.AnswerImage)} alt="Answer" className="sg-lp-card-img"/>
                )}
                {currentCard.Answer && currentCard.Answer !== "None" && (
                  <p className="sg-lp-card-text">{currentCard.Answer}</p>
                )}
              </>
            ) : (
              <>
                {currentCard.QuestionImage && (
                  <img src={getImageUrl(currentCard.QuestionImage)} alt="Question" className="sg-lp-card-img"/>
                )}
                <p className="sg-lp-card-text">{currentCard.Question}</p>
                <p className="sg-lp-flip-hint">Click to reveal answer</p>
              </>
            )}
          </div>
        )}

        {lastScheduling && (
          <div className={`sg-lp-feedback${lastScheduling.requeue ? " sg-lp-feedback-wrong" : " sg-lp-feedback-correct"}`}>
            <span>{lastScheduling.requeue ? "🔁" : lastScheduling.mastered ? "🏆" : "⏱️"}</span>
            <span>
              {lastScheduling.requeue
                ? "Card re-added to session"
                : lastScheduling.mastered
                ? "Card mastered!"
                : `Next review: ${lastScheduling.next_review_label}`}
            </span>
          </div>
        )}

        {isFlipped && currentCard && (
          <div className="sg-lp-ratings">
            {[
              { rating: 1, label: "Again", preview: currentCard.previews?.["1"] || "1m",  cls: "sg-lp-again" },
              { rating: 2, label: "Hard",  preview: currentCard.previews?.["2"] || "10m", cls: "sg-lp-hard"  },
              { rating: 3, label: "Good",  preview: currentCard.previews?.["3"] || "1d",  cls: "sg-lp-good"  },
              { rating: 4, label: "Easy",  preview: currentCard.previews?.["4"] || "4d",  cls: "sg-lp-easy"  },
            ].map(({ rating, label, preview, cls }) => (
              <button
                key={rating}
                className={`sg-lp-rate-btn ${cls}`}
                onClick={() => handleRate(rating)}
                disabled={ratingInProgress}
              >
                <span className="sg-lp-rate-label">{label}</span>
                <span className="sg-lp-rate-preview">{preview}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
