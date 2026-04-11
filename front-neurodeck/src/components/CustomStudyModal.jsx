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
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Study: {deckName}</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          {loading ? (
            <p>Loading...</p>
          ) : stats ? (
            <>
              {/* Due cards breakdown */}
              <h6 className="title is-6">Cards Due Today</h6>
              <table className="table is-fullwidth is-striped is-hoverable">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Due</th>
                    <th>Studied</th>
                    <th>Limit</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>New</td>
                    <td>{stats.due_today.new}</td>
                    <td>{stats.studied_today.new}</td>
                    <td>{stats.limits.new}</td>
                    <td>{stats.remaining.new}</td>
                  </tr>
                  <tr>
                    <td>Learning</td>
                    <td>{stats.due_today.learning}</td>
                    <td>{stats.studied_today.learning}</td>
                    <td>{stats.limits.learning}</td>
                    <td>{stats.remaining.learning}</td>
                  </tr>
                  <tr>
                    <td>Review</td>
                    <td>{stats.due_today.review}</td>
                    <td>{stats.studied_today.review}</td>
                    <td>{stats.limits.review}</td>
                    <td>{stats.remaining.review}</td>
                  </tr>
                </tbody>
              </table>

              {totalDue === 0 && daysAhead === 0 && (
                <div className="notification is-info is-light">
                  No cards are due right now. Use "Study Ahead" below to review
                  cards scheduled for future days.
                </div>
              )}

              {/* Study Ahead */}
              <div className="field" style={{ marginTop: "20px" }}>
                <label className="label is-small">Study Ahead (days)</label>
                <div className="control">
                  <input
                    className="input is-small"
                    type="number"
                    min="0"
                    max="365"
                    value={daysAhead}
                    onChange={(e) =>
                      setDaysAhead(Math.max(0, parseInt(e.target.value) || 0))
                    }
                  />
                </div>
                <p className="help">
                  Include cards due within this many days from now. Set to 0 for
                  only currently due cards.
                </p>
              </div>

              {/* Total cards info */}
              <p className="has-text-grey is-size-7" style={{ marginTop: "8px" }}>
                {stats.total_cards_in_deck} total cards in deck
              </p>
            </>
          ) : (
            <p>Could not load study stats.</p>
          )}
        </section>
        <footer className="modal-card-foot">
          <button className="button is-link" onClick={handleStart}>
            Start Session
          </button>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}