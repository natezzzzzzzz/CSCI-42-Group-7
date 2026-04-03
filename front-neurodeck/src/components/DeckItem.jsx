import React, { useState } from "react";

export default function DeckItem({ deck, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [deckName, setDeckName] = useState(deck.DeckName);
  const [category, setCategory] = useState(deck.Category || "");
  const [description, setDescription] = useState(deck.Description || "");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(`http://127.0.0.1:8000/deck/api/decks/${deck.DeckID}/update/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,   // ← was missing
        },
        body: JSON.stringify({ DeckName: deckName, Category: category, Description: description }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update deck");
      }

      const data = await res.json();
      setIsEditing(false);
      onUpdate(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update deck");
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
          <div className="buttons">
            <button className="button is-small" onClick={() => setIsEditing(true)}>Edit</button>
            <button className="button is-small is-danger" onClick={() => onDelete(deck.DeckID)}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
