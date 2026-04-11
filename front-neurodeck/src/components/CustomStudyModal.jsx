import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDeckStudyStats } from "../api/deckApi";

export default function CustomStudyModal({ deckId, deckName, onClose }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [daysAhead, setDaysAhead] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeckStudyStats(deckId)
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [deckId]);

  const handleStart = () => {
    const params = daysAhead > 0 ? `?days_ahead=${daysAhead}` : "";
    navigate(`/solo/${deckId}${params}`);
  };

  const totalDue = stats
    ? stats.due_today.new + stats.due_today.learning + stats.due_today.review
    : 0;

  return (
    <div className="ds-overlay">
      {/* backdrop */}
      <div className="ds-backdrop" onClick={onClose} />

      {/* modal card */}
      <div className="mp-panel ds-modal cs-modal">

        {/* header */}
        <div className="ds-modal-header">
          <p className="mp-panel-title ds-modal-title">Study: {deckName}</p>
          <button className="mp-btn mp-btn-ghost ds-close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="cs-loading">
            <span className="mp-spinner" />
          </div>
        ) : stats ? (
          <>
            {/* Cards Due Today */}
            <p className="mp-label cs-section-label">Cards Due Today</p>
            <div className="cs-table-wrapper">
              <table className="cs-table">
                <thead>
                  <tr className="cs-table-head-row">
                    {["Type", "Due", "Studied", "Limit", "Remaining"].map(h => (
                      <th key={h} className="cs-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "New", key: "new" },
                    { label: "Learning", key: "learning" },
                    { label: "Review", key: "review" },
                  ].map(({ label, key }, i) => (
                    <tr key={key} className={`cs-tr ${i % 2 !== 0 ? "cs-tr-alt" : ""}`}>
                      <td className="cs-td cs-td-label">{label}</td>
                      <td className="cs-td">{stats.due_today[key]}</td>
                      <td className="cs-td">{stats.studied_today[key]}</td>
                      <td className="cs-td">{stats.limits[key]}</td>
                      <td className="cs-td">{stats.remaining[key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalDue === 0 && daysAhead === 0 && (
              <div className="cs-no-due-banner">
                No cards are due right now. Use "Study Ahead" below to review cards scheduled for future days.
              </div>
            )}

            {/* Study Ahead */}
            <div className="ds-field">
              <label className="mp-label">Study Ahead (days)</label>
              <input
                className="mp-input"
                type="number"
                min="0"
                max="365"
                value={daysAhead}
                onChange={(e) => setDaysAhead(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <p className="text-small ds-field-hint">
                Include cards due within this many days. Set to 0 for only currently due cards.
              </p>
            </div>

            <p className="text-small cs-total-cards">
              {stats.total_cards_in_deck} total cards in deck
            </p>
          </>
        ) : (
          <p className="mp-empty">Could not load study stats.</p>
        )}

        {/* footer */}
        <div className="mp-btn-row">
          <button
            className="mp-btn mp-btn-primary ds-save-btn"
            onClick={handleStart}
          >
            Start Session
          </button>
          <button className="mp-btn mp-btn-ghost" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
}