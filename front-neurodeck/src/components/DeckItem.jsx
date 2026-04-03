import React, { useState } from "react";
import { updateDeck, deleteDeck } from "../api/deckApi";
import CardEditor from "./CardEditor";

export default function DeckItem({ deck, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCards, setShowCards] = useState(false);

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
    try {
      await deleteDeck(deck.DeckID);
      onDelete(deck.DeckID);
    } catch (err) {
      setError(err.message || "Could not delete deck");
    }
  };

  return (
    <div className="box shadow-lg">
      {isEditing ? (
        <>
          <div className="field">
            <div className="control">
              <input
                className="input"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Deck Name"
              />
            </div>
          </div>
          <div className="field">
            <div className="control">
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
              />
            </div>
          </div>
          <div className="field">
            <div className="control">
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
              />
            </div>
          </div>
          {error && <p className="help is-danger">{error}</p>}
          <div className="buttons">
            <button className="button is-success" onClick={handleSave}>Save</button>
            <button className="button" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="h4">{deck.DeckName}</p>
          <p className="text-small">
            <strong>Category:</strong> {deck.Category}
          </p>
          <p className="text-small">{deck.Description}</p>
          {error && <p className="help is-danger">{error}</p>}
          <div className="buttons">
            <button
              className="button is-small"
              onClick={() => setShowCards((prev) => !prev)}
            >
              {showCards ? "Hide Cards" : "View Cards"}
            </button>
            <button className="button is-small" onClick={() => setIsEditing(true)}>Edit</button>
            <button className="button is-small is-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </>
      )}

      {/* ── Accordion ── */}
      {showCards && !isEditing && (
        <div className="mt-3">
          <CardEditor deckId={deck.DeckID} />
        </div>
      )}
    </div>
  );
}
