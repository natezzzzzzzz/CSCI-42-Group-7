import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { fetchDeckSettings, updateDeckSettings } from "../api/deckApi";

export default function DeckSettingsModal({ deckId, onClose }) {
  const [maxNew, setMaxNew] = useState(20);
  const [maxLearning, setMaxLearning] = useState(20);
  const [maxReview, setMaxReview] = useState(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDeckSettings(deckId)
      .then((data) => {
        setMaxNew(data.max_new_per_day);
        setMaxLearning(data.max_learning_per_day);
        setMaxReview(data.max_review_per_day);
      })
      .catch(() => {});
  }, [deckId]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateDeckSettings(deckId, {
        max_new_per_day: maxNew,
        max_learning_per_day: maxLearning,
        max_review_per_day: maxReview,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="ds-overlay">
      {/* backdrop */}
      <div className="ds-backdrop" onClick={onClose} />

      {/* modal card */}
      <div className="mp-panel ds-modal">

        {/* header */}
        <div className="ds-modal-header">
          <p className="mp-panel-title ds-modal-title">Deck Settings</p>
          <button className="mp-btn mp-btn-ghost ds-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <p className="mp-error ds-error">{error}</p>}

        {/* Max New */}
        <div className="ds-field">
          <label className="mp-label">Max New Cards / Day</label>
          <input
            className="mp-input"
            type="number"
            min="0"
            value={maxNew}
            onChange={(e) => setMaxNew(parseInt(e.target.value) || 0)}
          />
          <p className="text-small ds-field-hint">
            Brand-new cards introduced per day
          </p>
        </div>

        {/* Max Learning */}
        <div className="ds-field">
          <label className="mp-label">Max Learning Cards / Day</label>
          <input
            className="mp-input"
            type="number"
            min="0"
            value={maxLearning}
            onChange={(e) => setMaxLearning(parseInt(e.target.value) || 0)}
          />
          <p className="text-small ds-field-hint">
            Cards in the learning phase per day
          </p>
        </div>

        {/* Max Review */}
        <div className="ds-field ds-field-last">
          <label className="mp-label">Max Review Cards / Day</label>
          <input
            className="mp-input"
            type="number"
            min="0"
            value={maxReview}
            onChange={(e) => setMaxReview(parseInt(e.target.value) || 0)}
          />
          <p className="text-small ds-field-hint">
            Graduated cards due for review per day
          </p>
        </div>

        {/* footer */}
        <div className="mp-btn-row">
          <button
            className="mp-btn mp-btn-primary ds-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="mp-spinner" /> : "Save"}
          </button>
          <button className="mp-btn mp-btn-ghost" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>,
    document.body
  );
}