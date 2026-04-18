import React, { useEffect, useState, useContext } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { fetchAchievementStats, fetchActivityData, fetchRecentUnlocks, fetchLeaderboard } from "../api/deckApi";
import AuthContext from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import { useLocation } from "react-router-dom";

const CATEGORY_COLORS = { general: "#6366f1", solo: "#22c55e", multiplayer: "#f59e0b" };
const CATEGORY_LABELS = { general: "General", solo: "Solo", multiplayer: "Multiplayer" };
const PLAYER_TIER_COLORS = { Bronze: "#d97706", Silver: "#94a3b8", Gold: "#eab308", Platinum: "#818cf8", Diamond: "#67e8f9" };

export default function AnalyticsPage() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function load() {
      const newErrors = {};

      const [statsRes, activityRes, recentRes, leaderboardRes] = await Promise.allSettled([
        fetchAchievementStats(),
        fetchActivityData(),
        fetchRecentUnlocks(10),
        fetchLeaderboard(),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      } else {
        newErrors.stats = statsRes.reason?.message || "Failed to load stats.";
      }

      if (activityRes.status === "fulfilled") {
        setActivity(activityRes.value);
      } else {
        newErrors.activity = activityRes.reason?.message || "Failed to load activity data.";
      }

      if (recentRes.status === "fulfilled") {
        setRecentAchievements(recentRes.value.recent || []);
      } else {
        newErrors.recent = recentRes.reason?.message || "Failed to load recent achievements.";
      }

      if (leaderboardRes.status === "fulfilled") {
        setLeaderboard(leaderboardRes.value.leaderboard || []);
      } else {
        newErrors.leaderboard = leaderboardRes.reason?.message || "Failed to load leaderboard.";
      }

      setErrors(newErrors);
      setLoading(false);
    }
    load();
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  if (loading) return (
    <DashboardLayout><div className="lp-loading">Loading analytics...</div></DashboardLayout>
  );

  if (!stats && !activity) return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: "1rem" }}>
        <p style={{ color: "#888", fontSize: "0.9rem" }}>Failed to load analytics data.</p>
        <button className="db-new-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </DashboardLayout>
  );

  const correctPct = stats && stats.total_answers > 0
    ? Math.round((stats.total_correct_answers / stats.total_answers) * 100) : 0;

  const myEntry = leaderboard.find(e => e.username === user?.username);

  const categoryData = activity ? Object.entries(activity.categories).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    unlocked: val.unlocked,
    remaining: val.total - val.unlocked,
    total: val.total,
    fill: CATEGORY_COLORS[key] || "#6366f1",
  })) : [];

  const tooltipStyle = {
    contentStyle: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
    labelStyle: { color: "#111", fontWeight: 600 },
    itemStyle: { color: "#555" },
  };

  return (
    <DashboardLayout>
      <h1 className="db-page-title" style={{ marginBottom: "1.25rem" }}>Analytics</h1>

      {Object.keys(errors).length > 0 && (
        <div style={{ background: "#fef2f2", borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1rem", color: "#ef4444", fontSize: "0.85rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Some data failed to load</p>
          {Object.values(errors).map((msg, i) => (
            <p key={i} style={{ margin: 0, fontSize: "0.8rem", color: "#888" }}>{msg}</p>
          ))}
          <button className="db-new-btn" style={{ marginTop: "0.5rem" }} onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {stats && (
        <div className="an-lp-metrics" id="trends">
          {[
            { label: "Cards Studied",   value: stats.total_cards_studied },
            { label: "Accuracy",        value: `${stats.accuracy_percent}%` },
            { label: "Best Streak",     value: stats.best_streak },
            { label: "Games Won",       value: stats.multiplayer_games_won },
            { label: "Wrong Answers",   value: stats.total_answers - stats.total_correct_answers },
            { label: "Study Streak",    value: `${stats.best_consecutive_study_days}d` },
          ].map(m => (
            <div key={m.label} className="an-lp-metric">
              <span className="an-lp-metric-val">{m.value}</span>
              <span className="an-lp-metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {myEntry && (() => {
        const color = PLAYER_TIER_COLORS[myEntry.tier] || "#d97706";
        const pct = myEntry.max_points > 0 ? Math.round((myEntry.total_points / myEntry.max_points) * 100) : 0;
        const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
        const idx = TIERS.indexOf(myEntry.tier);
        const nextTier = TIERS[idx + 1];
        const ptsToNext = nextTier
          ? Math.ceil(((idx + 1) / (TIERS.length - 1)) * myEntry.max_points) - myEntry.total_points
          : 0;
        return (
          <div className="an-lp-tier-card" style={{ borderColor: `${color}50`, background: `${color}0d` }}>
            <span className="an-lp-tier-name" style={{ color }}>{myEntry.tier}</span>
            <span className="an-lp-tier-sub">{myEntry.total_points}/{myEntry.max_points} pts ({pct}%)</span>
            {nextTier
              ? <span className="an-lp-tier-next">{ptsToNext} pts to {nextTier}</span>
              : <span className="an-lp-tier-next">Max tier reached!</span>}
          </div>
        );
      })()}

      {activity && (
        <div className="an-lp-charts" id="analytics">
          <div className="an-lp-chart-card">
            <h3 className="an-lp-chart-title">Study Activity (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={activity.activity} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {[
                    ["correctGrad", "#6366f1"],
                    ["goodGrad", "#22c55e"],
                    ["easyGrad", "#3b82f6"],
                    ["hardGrad", "#f97316"],
                    ["wrongGrad", "#ef4444"],
                  ].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 11 }} interval={6}/>
                <YAxis tick={{ fill: "#aaa", fontSize: 11 }} allowDecimals={false}/>
                <Tooltip {...tooltipStyle}/>
                <Area type="monotone" dataKey="correct" stroke="#6366f1" fill="url(#correctGrad)" name="Correct"/>
                <Area type="monotone" dataKey="good"    stroke="#22c55e" fill="url(#goodGrad)"    name="Good"/>
                <Area type="monotone" dataKey="easy"    stroke="#3b82f6" fill="url(#easyGrad)"    name="Easy"/>
                <Area type="monotone" dataKey="hard"    stroke="#f97316" fill="url(#hardGrad)"    name="Hard"/>
                <Area type="monotone" dataKey="wrong"   stroke="#ef4444" fill="url(#wrongGrad)"   name="Wrong"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="an-lp-chart-card">
            <h3 className="an-lp-chart-title">Achievement Categories</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData.flatMap(c => [
                    { name: `${c.name} ✓`, value: c.unlocked, fill: c.fill },
                    ...(c.remaining > 0 ? [{ name: c.name, value: c.remaining, fill: `${c.fill}40` }] : []),
                  ])}
                  dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}
                >
                  {categoryData.flatMap(c => {
                    const cells = [<Cell key={`${c.name}-u`} fill={c.fill}/>];
                    if (c.remaining > 0) cells.push(<Cell key={`${c.name}-r`} fill={`${c.fill}40`}/>);
                    return cells;
                  })}
                </Pie>
                <Tooltip {...tooltipStyle}/>
                <Legend formatter={v => <span style={{ color: "#555", fontSize: 12 }}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {categoryData.length > 0 && (
        <div className="an-lp-chart-card" style={{ marginBottom: "1rem" }}>
          <h3 className="an-lp-chart-title">Category Progress</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
            {categoryData.map(c => {
              const pct = c.total > 0 ? (c.unlocked / c.total) * 100 : 0;
              return (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ width: 80, fontSize: "0.85rem", fontWeight: 600, color: c.fill, flexShrink: 0 }}>{c.name}</span>
                  <div style={{ flex: 1, height: 12, background: "#f0f0f0", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c.fill, borderRadius: 6 }}/>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "#888", width: 40, textAlign: "right", flexShrink: 0 }}>{c.unlocked}/{c.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="an-lp-charts">
        {stats && (
          <div className="an-lp-chart-card">
            <h3 className="an-lp-chart-title">Answer Accuracy</h3>
            <div style={{ position: "relative", width: 160, height: 160, margin: "1rem auto" }}>
              <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="10"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#6366f1" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${correctPct * 3.14} ${(100 - correctPct) * 3.14}`}/>
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111", lineHeight: 1 }}>{correctPct}%</div>
                <div style={{ fontSize: "0.75rem", color: "#888" }}>{stats.total_correct_answers}/{stats.total_answers}</div>
              </div>
            </div>
          </div>
        )}

        <div className="an-lp-chart-card">
          <h3 className="an-lp-chart-title">Recent Achievements</h3>
          {recentAchievements.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>No achievements yet — start studying!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 220, overflowY: "auto" }}>
              {recentAchievements.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.5rem", borderRadius: "0.4rem", background: "#fafafa" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111" }}>{a.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>{new Date(a.unlocked_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="an-lp-chart-card" id="historical">
        <h3 className="an-lp-chart-title">Global Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>No players yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {leaderboard.slice(0, 10).map(entry => {
              const isMe = entry.username === user?.username;
              const tierColor = PLAYER_TIER_COLORS[entry.tier] || "#d97706";
              return (
                <div key={entry.rank} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.55rem 0.75rem", borderRadius: "0.4rem",
                  background: isMe ? "#ededf8" : "transparent",
                  border: isMe ? "1px solid #c7d2fe" : "1px solid transparent",
                }}>
                  <span style={{ width: "2rem", fontSize: "0.85rem", fontWeight: 600, color: "#aaa" }}>#{entry.rank}</span>
                  <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: isMe ? 600 : 400, color: "#333", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {entry.username}
                    {isMe && <span style={{ fontSize: "0.65rem", background: "#6366f120", color: "#6366f1", padding: "0.1rem 0.4rem", borderRadius: 99, fontWeight: 600 }}>You</span>}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: tierColor, flexShrink: 0 }}>{entry.tier}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", background: "#6366f115", padding: "0.2rem 0.6rem", borderRadius: 99, flexShrink: 0 }}>
                    {entry.total_correct_answers}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
