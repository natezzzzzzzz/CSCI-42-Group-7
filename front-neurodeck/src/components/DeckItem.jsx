import React from "react";

export default function DeckItem({ deck, onDelete }) {
  return (
    <div style={{ border: "1px solid #ccc", margin: "10px 0", padding: "10px", borderRadius: "5px" }}>
      <h3>{deck.DeckName}</h3>
      <p>{deck.Description}</p>
      <p><strong>Category:</strong> {deck.Category}</p>
      <button onClick={() => onDelete(deck.DeckID)}>Delete</button>
    </div>
  );
}