import React, { useEffect, useState } from "react";
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
import { fetchAchievementStats, fetchActivityData, fetchRecentUnlocks } from "../api/deckApi";

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

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, activityData, recentData] = await Promise.all([
          fetchAchievementStats(),
          fetchActivityData(),
          fetchRecentUnlocks(10),
        ]);
        setStats(statsData);
        setActivity(activityData);
        setRecentAchievements(recentData.recent || []);
      } catch (e) {
        console.error("Failed to load analytics:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="an-loading">Loading analytics...</div>;
  if (!stats || !activity) return <div className="an-loading">No data available.</div>;

  const correctPct = stats.total_answers > 0
    ? Math.round((stats.total_correct_answers / stats.total_answers) * 100)
    : 0;

  // Build pie chart data for categories
  const categoryData = Object.entries(activity.categories).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    unlocked: val.unlocked,
    remaining: val.total - val.unlocked,
    total: val.total,
  }));

  // Build tier bar data
  const tierOrder = ["bronze", "silver", "gold", "platinum"];
  const tierData = tierOrder
    .filter((t) => activity.tiers[t])
    .map((t) => ({
      name: TIER_LABELS[t],
      unlocked: activity.tiers[t].unlocked,
      remaining: activity.tiers[t].total - activity.tiers[t].unlocked,
      total: activity.tiers[t].total,
      fill: TIER_COLORS[t],
    }));

  return (
    <div className="an-page">
      <div className="an-header">
        <button className="mp-back-btn" onClick={() => navigate("/main")}>
          Back to Menu
        </button>
        <h1 className="h4">Analytics</h1>
      </div>

      {/* ── Key Metrics ── */}
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

      {/* ── Charts Row ── */}
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

      {/* ── Tier Progress Bars ── */}
      <div className="an-chart-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="an-chart-title">Achievement Tier Progress</h3>
        <div className="an-tier-bars">
          {tierData.map((t) => {
            const pct = t.total > 0 ? (t.unlocked / t.total) * 100 : 0;
            return (
              <div key={t.name} className="an-tier-row">
                <span className="an-tier-label" style={{ color: t.fill }}>{t.name}</span>
                <div className="an-tier-track">
                  <div
                    className="an-tier-fill"
                    style={{ width: `${pct}%`, backgroundColor: t.fill }}
                  />
                </div>
                <span className="an-tier-count">{t.unlocked}/{t.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Accuracy Ring ── */}
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
    </div>
  );
}