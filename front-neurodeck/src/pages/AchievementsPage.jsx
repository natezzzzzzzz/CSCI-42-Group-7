import React, { useEffect, useState } from "react";
import { fetchAchievements, fetchAchievementStats } from "../api/deckApi";
import DashboardLayout from "../components/DashboardLayout";

const TIER_COLORS = {
  bronze:   { border: "#d97706", bg: "#fffbeb", text: "#b45309" },
  silver:   { border: "#94a3b8", bg: "#f8fafc", text: "#64748b" },
  gold:     { border: "#eab308", bg: "#fefce8", text: "#a16207" },
  platinum: { border: "#818cf8", bg: "#eef2ff", text: "#4f46e5" },
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState({ total_points: 0, max_points: 0, unlocked_count: 0, total_count: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
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
        setError(e.message || "Failed to load achievements.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry]);

  const filtered = filter === "all"
    ? achievements
    : achievements.filter(a => a.category === filter);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="lp-loading">Loading achievements...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#ef4444", background: "#fef2f2", borderRadius: "0.5rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Something went wrong</p>
          <p style={{ fontSize: "0.85rem", color: "#888" }}>{error}</p>
          <button className="db-new-btn" style={{ marginTop: "0.75rem" }} onClick={() => setRetry(r => r + 1)}>Retry</button>
        </div>
      ) : (
        <>
          <div className="db-content-header" style={{ marginBottom: "1.25rem" }}>
            <h1 className="db-page-title">Achievements</h1>
            <span className="ach-lp-summary">
              <strong>{summary.unlocked_count}</strong>/{summary.total_count} unlocked
              &nbsp;·&nbsp;
              <strong style={{ color: "#6366f1" }}>{summary.total_points}</strong>/{summary.max_points} pts
            </span>
          </div>

          {stats && (
            <div className="ach-lp-stats">
              {[
                { label: "Cards Studied",    value: stats.total_cards_studied },
                { label: "Best Streak",      value: stats.best_streak },
                { label: "Accuracy",         value: `${stats.accuracy_percent}%` },
                { label: "Games Won",        value: stats.multiplayer_games_won },
                { label: "Study Streak",     value: `${stats.best_consecutive_study_days}d` },
                { label: "Solo Sessions",    value: stats.solo_sessions_completed },
              ].map(s => (
                <div key={s.label} className="ach-lp-stat">
                  <span className="ach-lp-stat-value">{s.value}</span>
                  <span className="ach-lp-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="ach-lp-filters">
            {["all", "general", "solo", "multiplayer"].map(f => (
              <button
                key={f}
                className={`ach-lp-filter${filter === f ? " ach-lp-filter-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="ach-lp-grid">
            {filtered.map(a => {
              const t = TIER_COLORS[a.tier] || TIER_COLORS.bronze;
              const pct = a.progress_max > 0 ? (a.progress / a.progress_max) * 100 : 0;
              return (
                <div
                  key={a.id}
                  className={`ach-lp-card${a.unlocked ? "" : " ach-lp-locked"}`}
                  style={{ borderColor: a.unlocked ? t.border : "#e8e8e8", background: a.unlocked ? t.bg : "#fafafa" }}
                >
                  <div className="ach-lp-card-header">
                    <span className="ach-lp-tier" style={{ color: a.unlocked ? t.text : "#bbb", background: a.unlocked ? `${t.border}22` : "#f0f0f0" }}>
                      {a.tier}
                    </span>
                    {a.unlocked && <span className="ach-lp-check">✓</span>}
                  </div>
                  <p className="ach-lp-name" style={{ color: a.unlocked ? "#111" : "#999" }}>{a.name}</p>
                  <p className="ach-lp-desc">{a.description}</p>
                  {!a.unlocked && a.progress_max > 1 && (
                    <div className="ach-lp-progress">
                      <div className="ach-lp-track">
                        <div className="ach-lp-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="ach-lp-prog-text">{a.progress}/{a.progress_max}</span>
                    </div>
                  )}
                  {a.unlocked && a.unlocked_at && (
                    <p className="ach-lp-date">{new Date(a.unlocked_at).toLocaleDateString()}</p>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="db-empty" style={{ gridColumn: "1/-1" }}>No achievements found.</p>}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
