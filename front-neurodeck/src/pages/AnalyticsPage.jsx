import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { fetchAchievementStats, fetchActivityData, fetchRecentUnlocks, fetchLeaderboard } from "../api/deckApi";
import AuthContext from "../context/AuthContext";

const TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#a8b4c0",
  gold: "#fbbf24",
  platinum: "#818cf8",
};

const CATEGORY_COLORS = {
  general: "#6366f1",
  solo: "#22c55e",
  multiplayer: "#f59e0b",
};

const TIER_LABELS = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const CATEGORY_LABELS = {
  general: "General",
  solo: "Solo",
  multiplayer: "Multiplayer",
};

const PLAYER_TIER_COLORS = {
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#ffd700",
  Platinum: "#a5b4fc",
  Diamond: "#b9f2ff",
};

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await Promise.allSettled([
        fetchAchievementStats().then(setStats).catch((e) => console.error("Stats failed:", e)),
        fetchActivityData().then(setActivity).catch((e) => console.error("Activity failed:", e)),
        fetchRecentUnlocks(10).then((d) => setRecentAchievements(d.recent || [])).catch((e) => console.error("Recent failed:", e)),
        fetchLeaderboard().then((d) => setLeaderboard(d.leaderboard || [])).catch((e) => console.error("Leaderboard failed:", e)),
      ]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="an-loading">Loading analytics...</div>;
  if (!stats && !activity) return (
    <div className="an-loading">
      Failed to load analytics data.
      <button className="an-retry-btn" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const correctPct = stats && stats.total_answers > 0
    ? Math.round((stats.total_correct_answers / stats.total_answers) * 100)
    : 0;

  // Build pie chart data for categories
  const categoryData = activity ? Object.entries(activity.categories).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    unlocked: val.unlocked,
    remaining: val.total - val.unlocked,
    total: val.total,
  })) : [];

  // Build category bar data
  const categoryBarData = activity ? Object.entries(activity.categories).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    unlocked: val.unlocked,
    remaining: val.total - val.unlocked,
    total: val.total,
    fill: CATEGORY_COLORS[key] || "#6366f1",
  })) : [];

  // Find current user's leaderboard entry
  const myEntry = leaderboard.find((e) => e.username === user?.username);

  return (
    <div className="an-page">
      <div className="an-header">
        <button className="mp-back-btn" onClick={() => navigate("/main")}>
          ← Back to Menu
        </button>
        <h1 className="h4">Analytics</h1>
      </div>

      {/* ── Key Metrics ── */}
      {stats && (
      <div className="an-metrics">
        <div className="an-metric-card">
          <span className="an-metric-value">{stats.total_cards_studied}</span>
          <span className="an-metric-label">Cards Studied</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-value">{stats.accuracy_percent}%</span>
          <span className="an-metric-label">Accuracy</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-value">{stats.best_streak}</span>
          <span className="an-metric-label">Best Streak</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-value">{stats.multiplayer_games_won}</span>
          <span className="an-metric-label">Games Won</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-value">{stats.total_answers - stats.total_correct_answers}</span>
          <span className="an-metric-label">Wrong Answers</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-value">{stats.best_consecutive_study_days}</span>
          <span className="an-metric-label">Study Streak (days)</span>
        </div>
      </div>
      )}

      {/* ── Player Tier Card ── */}
      {myEntry && (() => {
        const color = PLAYER_TIER_COLORS[myEntry.tier] || "#cd7f32";
        const pct = myEntry.max_points > 0
          ? Math.round((myEntry.total_points / myEntry.max_points) * 100)
          : 0;
        const TIER_LADDER = [
          { tier: "Bronze", pct: 0 },
          { tier: "Silver", pct: 20 },
          { tier: "Gold", pct: 40 },
          { tier: "Platinum", pct: 60 },
          { tier: "Diamond", pct: 80 },
        ];
        const currentIdx = TIER_LADDER.findIndex((t) => t.tier === myEntry.tier);
        const nextTier = currentIdx < TIER_LADDER.length - 1 ? TIER_LADDER[currentIdx + 1] : null;
        const ptsToNext = nextTier
          ? Math.ceil((nextTier.pct / 100) * myEntry.max_points) - myEntry.total_points
          : 0;
        return (
          <div className="an-tier-card" style={{ borderColor: `${color}60`, background: `${color}10` }}>
            <span className="an-tier-name" style={{ color }}>{myEntry.tier}</span>
            <span className="an-tier-sub">{myEntry.total_points}/{myEntry.max_points} pts ({pct}%)</span>
            {nextTier ? (
              <span className="an-tier-next">{ptsToNext} pts to {nextTier.tier}</span>
            ) : (
              <span className="an-tier-next">Max tier reached!</span>
            )}
          </div>
        );
      })()}

      {/* ── Charts Row ── */}
      {activity && (
      <div className="an-charts-row">
        {/* Activity Over Time */}
        <div className="an-chart-card">
          <h3 className="an-chart-title">Study Activity (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activity.activity} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="correctGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wrongGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                interval={6}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "#f8fafc" }}
                itemStyle={{ color: "#cbd5e1" }}
              />
              <Area type="monotone" dataKey="correct" stroke="#6366f1" fill="url(#correctGrad)" name="Correct" />
              <Area type="monotone" dataKey="wrong" stroke="#ef4444" fill="url(#wrongGrad)" name="Wrong" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Pie */}
        <div className="an-chart-card">
          <h3 className="an-chart-title">Achievements by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData.flatMap((c) => [
                  { name: `${c.name} ✓`, value: c.unlocked, fill: CATEGORY_COLORS[c.name.toLowerCase()] || "#6366f1" },
                  ...(c.remaining > 0 ? [{ name: c.name, value: c.remaining, fill: `${CATEGORY_COLORS[c.name.toLowerCase()] || "#6366f1"}40` }] : []),
                ])}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {categoryData.flatMap((c) => {
                  const color = CATEGORY_COLORS[c.name.toLowerCase()] || "#6366f1";
                  const cells = [<Cell key={`${c.name}-u`} fill={color} />];
                  if (c.remaining > 0) cells.push(<Cell key={`${c.name}-r`} fill={`${color}40`} />);
                  return cells;
                })}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                itemStyle={{ color: "#cbd5e1" }}
              />
              <Legend
                formatter={(value) => <span style={{ color: "#cbd5e1", fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* ── Category Progress Bars ── */}
      {categoryBarData.length > 0 && (
      <div className="an-chart-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="an-chart-title">Achievement Category Progress</h3>
        <div className="an-tier-bars">
          {categoryBarData.map((c) => {
            const pct = c.total > 0 ? (c.unlocked / c.total) * 100 : 0;
            return (
              <div key={c.name} className="an-tier-row">
                <span className="an-tier-label" style={{ color: c.fill }}>{c.name}</span>
                <div className="an-tier-track">
                  <div
                    className="an-tier-fill"
                    style={{ width: `${pct}%`, backgroundColor: c.fill }}
                  />
                </div>
                <span className="an-tier-count">{c.unlocked}/{c.total}</span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Accuracy Ring ── */}
      {stats && (
      <div className="an-charts-row">
        <div className="an-chart-card">
          <h3 className="an-chart-title">Answer Accuracy</h3>
          <div className="an-accuracy-ring">
            <svg viewBox="0 0 120 120" className="an-ring-svg">
              <circle cx="60" cy="60" r="50" className="an-ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="50"
                className="an-ring-fill"
                strokeDasharray={`${correctPct * 3.14} ${(100 - correctPct) * 3.14}`}
              />
            </svg>
            <div className="an-ring-label">
              <span className="an-ring-pct">{correctPct}%</span>
              <span className="an-ring-sub">{stats.total_correct_answers}/{stats.total_answers}</span>
            </div>
          </div>
        </div>

        {/* ── Recent Achievements ── */}
        <div className="an-chart-card">
          <h3 className="an-chart-title">Recent Achievements</h3>
          {recentAchievements.length === 0 ? (
            <p className="an-empty">No achievements yet — start studying!</p>
          ) : (
            <div className="an-recent-list">
              {recentAchievements.map((a, i) => (
                <div key={i} className="an-recent-item">
                  <div className="an-recent-info">
                    <span className="an-recent-name">{a.name}</span>
                    <span className="an-recent-desc">{a.description}</span>
                    <span className="an-recent-date">
                      {new Date(a.unlocked_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Global Leaderboard ── */}
      <div className="an-chart-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="an-chart-title">Global Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="an-empty">No players yet.</p>
        ) : (() => {
          const topCount = 10;
          const topEntries = leaderboard.slice(0, topCount);
          const myRank = leaderboard.find((e) => e.username === user?.username)?.rank;
          const meInTop = myRank != null && myRank <= topCount;
          const myEntry = myRank != null ? leaderboard[myRank - 1] : null;
          return (
            <div className="an-lb-list">
              {topEntries.map((entry) => {
                const isMe = entry.username === user?.username;
                const tierColor = PLAYER_TIER_COLORS[entry.tier] || "#cd7f32";
                return (
                  <div key={entry.rank} className={`an-lb-row ${isMe ? "an-lb-me" : ""}`}>
                    <span className="an-lb-rank">#{entry.rank}</span>
                    <span className="an-lb-name">
                      {entry.username}
                      {isMe && <span className="an-lb-you">You</span>}
                    </span>
                    <span className="an-lb-tier" style={{ color: tierColor }}>
                      {entry.tier}
                    </span>
                    <span className="an-lb-score">{entry.total_correct_answers}</span>
                  </div>
                );
              })}
              {myEntry && !meInTop && (
                <>
                  <div className="an-lb-ellipsis">...</div>
                  <div className="an-lb-row an-lb-me">
                    <span className="an-lb-rank">#{myEntry.rank}</span>
                    <span className="an-lb-name">
                      {myEntry.username}
                      <span className="an-lb-you">You</span>
                    </span>
                    <span className="an-lb-tier" style={{ color: PLAYER_TIER_COLORS[myEntry.tier] || "#cd7f32" }}>
                      {myEntry.tier}
                    </span>
                    <span className="an-lb-score">{myEntry.total_correct_answers}</span>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}