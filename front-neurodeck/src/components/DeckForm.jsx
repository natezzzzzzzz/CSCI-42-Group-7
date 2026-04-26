import React, { useState } from "react";
import { createDeck } from "../api/deckApi";

// This component provides a form for creating a new deck. It collects the deck name, category, and description from the user and calls the createDeck function to save it.
export default function DeckForm({ onDeckCreated }) {
  const [deckName, setDeckName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const newDeck = await createDeck({
        DeckName: deckName,
        Category: category,
        Description: description,
      });
      onDeckCreated(newDeck);
      setDeckName("");
      setCategory("");
      setDescription("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mp-panel">
      <p className="mp-panel-title">New Deck</p>
      <form onSubmit={handleSubmit}>
        <label className="mp-label">Deck Name</label>
        <input
          className="mp-input"
          type="text"
          placeholder="e.g. Spanish Vocabulary"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          required
        />

        <label className="mp-label">Category</label>
        <input
          className="mp-input"
          type="text"
          placeholder="e.g. Languages"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <label className="mp-label">Description</label>
        <input
          className="mp-input"
          type="text"
          placeholder="Optional description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="mp-error">{error}</p>}

        <button
          className="mp-btn mp-btn-primary mp-btn-full"
          type="submit"
          disabled={loading}
        >
          {loading ? <span className="mp-spinner" /> : "Add Deck"}
        </button>
      </form>
    </div>
  );
}