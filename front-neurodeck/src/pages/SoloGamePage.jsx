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

  if (cards.length === 0) return <p>No flashcards in this deck yet!</p>;

  const current = cards[currentIndex];

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>

      <button
        onClick={() => navigate("/decks")}
        style={{ marginTop: "20px", display: "block", margin: "20px auto" }}
      >
        Back to Decks
      </button>

      {/* deck progress counter */}
      <p>{currentIndex + 1} / {cards.length}</p>

      {/* flashcard proper */}
      <div
        onClick={handleFlip}
        style={{
          border: "2px solid #ccc",
          borderRadius: "12px",
          padding: "60px 40px",
          margin: "20px auto",
          maxWidth: "500px",
          minHeight: "200px",
          cursor: "pointer",
          backgroundColor: isFlipped ? "#f0f8ff" : "#ffffff",
          transition: "background-color 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        {isFlipped ? current.Answer : current.Question}
      </div>

      <p style={{ color: "#999", fontSize: "13px" }}>
        {isFlipped ? "Answer" : "Click to reveal answer"}
      </p>

      <button onClick={handleRestart} style={{ marginBottom: "20px" }}>
        Restart
      </button>

      {/* navigation buttons */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "12px" }}>
        <button onClick={handlePrev} disabled={currentIndex === 0}>
          Previous
        </button>

        <button onClick={handleNext} disabled={currentIndex === cards.length - 1}>
          Next
        </button>
      </div>

    </div>
  );
}