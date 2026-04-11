import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCards, reportSoloCardStudied, reportSoloSessionComplete } from "../api/deckApi";
import { useAchievementNotify } from "../components/AchievementToast";

export default function SoloGamePage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const notifyAchievement = useAchievementNotify();
  const completionReported = useRef(false);

  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [visitedCards, setVisitedCards] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      const data = await fetchCards(deckId);
      setCards(data);
    };
    load();
  }, [deckId]);

  useEffect(() => {
    if (cards.length > 0 && currentIndex === cards.length - 1 && !completionReported.current) {
      completionReported.current = true;
      // Report deck completion to server
      reportSoloSessionComplete(deckId, visitedCards.size, 0, 0)
        .then((data) => {
          if (data.new_achievements) {
            data.new_achievements.forEach((a) => notifyAchievement(a));
          }
        })
        .catch(() => {});
    }
  }, [currentIndex, cards.length, deckId, visitedCards.size, notifyAchievement]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    setIsFlipped(false);

    const nextIndex = (currentIndex + 1) % cards.length;
    const nextCardId = cards[nextIndex].CardID;

    setVisitedCards((prev) => {
      if (!prev.has(nextCardId)) {
        const updated = new Set(prev);
        updated.add(nextCardId);

        // Report card studied to server (fire-and-forget)
        reportSoloCardStudied(nextCardId)
          .then((data) => {
            if (data.new_achievements) {
              data.new_achievements.forEach((a) => notifyAchievement(a));
            }
          })
          .catch(() => {});

        return updated;
      }
      return prev;
    });

    setCurrentIndex(nextIndex);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => prev - 1);
  };

  const handleRestart = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
    completionReported.current = false;
  };

  if (cards.length === 0) return <p className="mp-empty">No flashcards in this deck yet!</p>;

  const current = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="solo-page">

      {/* Header */}
      <div className="solo-header">
        <button className="mp-back-btn" onClick={() => navigate("/decks")}>
          ← Back to Decks
        </button>
        <span className="mp-room-tag">Solo Study</span>
      </div>

      {/* Progress bar */}
      <div className="solo-progress-wrap">
        <div className="mp-progress-bar">        
          <div className="mp-progress-track">    
            <div
              className="mp-progress-fill"      
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="mp-progress-label">  
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Flashcard */}
      <div className="solo-card-wrap">
        <div
          className={`solo-card${isFlipped ? " flipped" : ""}`}
          onClick={handleFlip}
        >
          <span className="solo-card-label">
            {isFlipped ? "Answer" : "Question"}
          </span>
          <p className="solo-card-text">
            {isFlipped ? current.Answer : current.Question}
          </p>
          {!isFlipped && (
            <span className="solo-card-hint">Click to reveal answer</span>
          )}
        </div>
      </div>

      {/* Restart */}
      <div className="solo-restart-row">
        <button className="mp-btn mp-btn-ghost" onClick={handleRestart}>
          ↺ Restart
        </button>
      </div>

      {/* Navigation */}
      <div className="solo-nav">
        <button
          className="mp-btn mp-btn-ghost"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← Prev
        </button>
        <button
          className="mp-btn mp-btn-primary"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
        >
          Next →
        </button>
      </div>

    </div>
  );
}