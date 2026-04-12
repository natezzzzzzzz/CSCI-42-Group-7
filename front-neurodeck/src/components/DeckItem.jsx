import React, { useState } from "react";
import { updateDeck, deleteDeck } from "../api/deckApi";
import CardEditor from "./CardEditor";
import DeckSettingsModal from "./DeckSettingsModal";
import CustomStudyModal from "./CustomStudyModal";

export default function DeckItem({ deck, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStudy, setShowStudy] = useState(false);

  const [deckName, setDeckName] = useState(deck.DeckName);
  const [category, setCategory] = useState(deck.Category || "");
  const [description, setDescription] = useState(deck.Description || "");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    try {
      const data = await updateDeck(deck.DeckID, {
        DeckName: deckName,
        Category: category,
        Description: description,
      });
      setIsEditing(false);
      onUpdate(data);
    } catch (err) {
      setError(err.message || "Could not update deck");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this deck? This cannot be undone.")) return;
    try {
      await deleteDeck(deck.DeckID);
      onDelete(deck.DeckID);
    } catch (err) {
      setError(err.message || "Could not delete deck");
    }
  };

  return (
    <div className="mp-panel" style={{ textAlign: "left" }}>
      {isEditing ? (
        <>
          <label className="mp-label">Deck Name</label>
          <input
            className="mp-input"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck Name"
          />
          <label className="mp-label">Category</label>
          <input
            className="mp-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
          />
          <label className="mp-label">Description</label>
          <input
            className="mp-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
          {error && <p className="mp-error">{error}</p>}
          <div className="mp-btn-row" style={{ marginTop: "0.5rem" }}>
            <button className="mp-btn mp-btn-success" onClick={handleSave}>Save</button>
            <button className="mp-btn mp-btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <p className="mp-panel-title" style={{ marginBottom: "0.5rem" }}>
              {deck.DeckName}
            </p>
            {deck.Category && (
              <span className="mp-room-tag" style={{ display: "inline-block", marginBottom: "0.5rem" }}>
                {deck.Category}
              </span>
            )}
            {deck.Description && (
              <p className="text-small" style={{ color: "var(--neutral-dark)", marginTop: "0.25rem" }}>
                {deck.Description}
              </p>
            )}
          </div>

          {error && <p className="mp-error">{error}</p>}

          <div className="mp-btn-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <button className="mp-btn mp-btn-ghost" onClick={() => setShowCards(prev => !prev)}>
              {showCards ? "Hide Cards" : "View Cards"}
            </button>
            <button className="mp-btn mp-btn-ghost" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button className="mp-btn mp-btn-ghost" onClick={() => setShowSettings(true)} title="Deck Settings">
              ⚙
            </button>
            <button className="mp-btn mp-btn-primary" style={{ flex: "none" }} onClick={() => setShowStudy(true)}>
              Play
            </button>
            <button className="mp-btn mp-btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </>
      )}

      {showCards && !isEditing && (
        <div style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.25rem" }}>
          <CardEditor deckId={deck.DeckID} />
        </div>
      )}

      {showSettings && (
        <DeckSettingsModal deckId={deck.DeckID} onClose={() => setShowSettings(false)} />
      )}
      {showStudy && (
        <CustomStudyModal deckId={deck.DeckID} deckName={deck.DeckName} onClose={() => setShowStudy(false)} />
      )}
    </div>
  );
}