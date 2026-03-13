import React, { useState } from "react";

export default function DeckItem({ deck, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [deckName, setDeckName] = useState(deck.DeckName);
  const [category, setCategory] = useState(deck.Category || "");
  const [description, setDescription] = useState(deck.Description || "");

  const handleSave = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/deck/api/decks/${deck.DeckID}/update/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DeckName: deckName, Category: category, Description: description }),
      });

      if (!res.ok) throw new Error("Failed to update deck");
      const data = await res.json();
      setIsEditing(false);
      onUpdate(data);
    } catch (err) {
      console.error(err);
      alert("Could not update deck");
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
      {isEditing ? (
        <>
          <input value={deckName} onChange={(e) => setDeckName(e.target.value)} />
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </>
      ) : (
        <>
          <h3>{deck.DeckName}</h3>
          <p><strong>Category:</strong> {deck.Category}</p>
          <p>{deck.Description}</p>
          <button onClick={() => setIsEditing(true)}>Edit</button>
          <button onClick={() => onDelete(deck.DeckID)}>Delete</button>
        </>
      )}
    </div>
  );
}