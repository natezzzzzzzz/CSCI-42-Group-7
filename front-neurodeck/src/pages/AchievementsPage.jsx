import React, { useEffect, useState } from "react";

export default function AchievementsPage() {
  const [stats, setStats] = useState({
    cardsStudied: 0,
    decksCompleted: 0,
    streak: 0,
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("studyStats"));
    if (saved) setStats(saved);
  }, []);

  const achievements = [
    {
      title: "First Study Session",
      unlocked: stats.cardsStudied > 0,
    },
    {
      title: "10 Cards Studied",
      unlocked: stats.cardsStudied >= 10,
    },
    {
      title: "50 Cards Studied",
      unlocked: stats.cardsStudied >= 50,
    },
    {
      title: "First Deck Completed",
      unlocked: stats.decksCompleted >= 1,
    },
    {
      title: "3-Day Streak",
      unlocked: stats.streak >= 3,
    },
  ];

  return (
    <div style={{ padding: "40px" }}>
      <h2>🏆 Achievements</h2>

      {/* 📊 Stats */}
      <div style={{ marginBottom: "20px" }}>
        <p><strong>Cards Studied:</strong> {stats.cardsStudied}</p>
        <p><strong>Decks Completed:</strong> {stats.decksCompleted}</p>
        <p><strong>Streak:</strong> {stats.streak} days</p>
      </div>

      {/* 🎖️ Achievements */}
      <div>
        {achievements.map((a, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "10px",
              borderRadius: "10px",
              backgroundColor: a.unlocked ? "#e6fffa" : "#f5f5f5",
            }}
          >
            <strong>{a.title}</strong>
            <p>{a.unlocked ? "Unlocked 🎉" : "Locked 🔒"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}