import React, { useState, useEffect } from "react";
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

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Deck Settings</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          {error && <p className="help is-danger">{error}</p>}

          <div className="field">
            <label className="label is-small">Max New Cards / Day</label>
            <div className="control">
              <input
                className="input is-small"
                type="number"
                min="0"
                value={maxNew}
                onChange={(e) => setMaxNew(parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="help">Brand-new cards introduced per day</p>
          </div>

          <div className="field">
            <label className="label is-small">Max Learning Cards / Day</label>
            <div className="control">
              <input
                className="input is-small"
                type="number"
                min="0"
                value={maxLearning}
                onChange={(e) => setMaxLearning(parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="help">Cards in the learning phase per day</p>
          </div>

          <div className="field">
            <label className="label is-small">Max Review Cards / Day</label>
            <div className="control">
              <input
                className="input is-small"
                type="number"
                min="0"
                value={maxReview}
                onChange={(e) => setMaxReview(parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="help">Graduated cards due for review per day</p>
          </div>
        </section>
        <footer className="modal-card-foot">
          <button
            className={`button is-link ${saving ? "is-loading" : ""}`}
            onClick={handleSave}
          >
            Save
          </button>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}