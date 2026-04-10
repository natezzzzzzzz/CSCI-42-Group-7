import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAchievements, fetchAchievementStats } from "../api/deckApi";

const TIER_STYLES = {
  bronze: { border: "rgba(205,127,50,0.4)", bg: "rgba(205,127,50,0.1)", color: "#cd7f32" },
  silver: { border: "rgba(192,192,192,0.4)", bg: "rgba(192,192,192,0.08)", color: "#c0c0c0" },
  gold: { border: "rgba(255,215,0,0.4)", bg: "rgba(255,215,0,0.1)", color: "#ffd700" },
  platinum: { border: "rgba(165,180,252,0.5)", bg: "rgba(165,180,252,0.12)", color: "#a5b4fc" },
};

export default function AchievementsPage() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState({ total_points: 0, max_points: 0, unlocked_count: 0, total_count: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [achData, statsData] = await Promise.all([
          fetchAchievements(),
          fetchAchievementStats(),
        ]);
        setAchievements(achData.achievements);
        setStats(statsData);
        setSummary({
          total_points: achData.total_points,
          max_points: achData.max_points,
          unlocked_count: achData.unlocked_count,
          total_count: achData.total_count,
        });
      } catch (e) {
        console.error("Failed to load achievements:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === "all"
    ? achievements
    : achievements.filter((a) => a.category === filter);

  if (loading) return <div className="ach-loading">Loading achievements...</div>;

  return (
    <div className="ach-page">
      <div className="ach-header">
        <button className="mp-back-btn" onClick={() => navigate("/main")}>
          Back to Menu
        </button>
        <h1 className="h4">Achievements</h1>
        <div className="ach-summary">
          <span className="ach-summary-points">{summary.total_points}/{summary.max_points} pts</span>
          <span className="ach-summary-count">{summary.unlocked_count}/{summary.total_count} unlocked</span>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="ach-stats-grid">
          <div className="ach-stat-card">
            <span className="ach-stat-value">{stats.total_cards_studied}</span>
            <span className="ach-stat-label">Cards Studied</span>
          </div>
          <div className="ach-stat-card">
            <span className="ach-stat-value">{stats.best_streak}</span>
            <span className="ach-stat-label">Best Streak</span>
          </div>
          <div className="ach-stat-card">
            <span className="ach-stat-value">{stats.accuracy_percent}%</span>
            <span className="ach-stat-label">Accuracy</span>
          </div>
          <div className="ach-stat-card">
            <span className="ach-stat-value">{stats.multiplayer_games_won}</span>
            <span className="ach-stat-label">Games Won</span>
          </div>
          <div className="ach-stat-card">
            <span className="ach-stat-value">{stats.best_consecutive_study_days}</span>
            <span className="ach-stat-label">Best Study Streak</span>
          </div>
          <div className="ach-stat-card">
            <span className="ach-stat-value">{stats.solo_sessions_completed}</span>
            <span className="ach-stat-label">Solo Sessions</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="ach-filters">
        {["all", "general", "solo", "multiplayer"].map((f) => (
          <button
            key={f}
            className={`ach-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      <div className="ach-grid">
        {filtered.map((a) => {
          const tierStyle = TIER_STYLES[a.tier] || TIER_STYLES.bronze;
          const progressPct = a.progress_max > 0 ? (a.progress / a.progress_max) * 100 : 0;
          return (
            <div
              key={a.id}
              className={`ach-card ${a.unlocked ? "ach-unlocked" : "ach-locked"}`}
              style={{
                borderColor: a.unlocked ? tierStyle.border : "rgba(255,255,255,0.06)",
                background: a.unlocked ? tierStyle.bg : "rgba(255,255,255,0.02)",
              }}
            >
              <div className="ach-card-info">
                <div
                  className="ach-card-name"
                  style={{ color: a.unlocked ? "var(--neutral-lightest)" : "var(--neutral-dark)" }}
                >
                  {a.name}
                </div>
                <div className="ach-card-desc">{a.description}</div>
                {!a.unlocked && a.progress_max > 1 && (
                  <div className="ach-progress">
                    <div className="ach-progress-track">
                      <div
                        className="ach-progress-fill"
                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                      />
                    </div>
                    <span className="ach-progress-text">{a.progress}/{a.progress_max}</span>
                  </div>
                )}
                {a.unlocked && a.unlocked_at && (
                  <div className="ach-card-date">
                    {new Date(a.unlocked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}