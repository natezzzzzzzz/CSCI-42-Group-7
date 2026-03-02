// src/components/DeckForm.jsx
import React, { useState } from "react";
import { createDeck } from "../api/deckApi";

export default function DeckForm({ onDeckCreated }) {
  const [deckName, setDeckName] = useState("");
  const [category, setCategory] = useState(""); // NEW
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newDeck = await createDeck({
        DeckName: deckName,
        Category: category,      // pass category to backend
        Description: description,
      });
      onDeckCreated(newDeck);
      setDeckName("");
      setCategory("");           // reset field
      setDescription("");
    } catch (err) {
      console.error(err);
      alert("Failed to create deck");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Deck Name"
        value={deckName}
        onChange={(e) => setDeckName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Category"  // NEW INPUT
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit">Add Deck</button>
    </form>
  );
}