import React, { useState } from "react";
import { createDeck } from "../api/deckApi";

export default function DeckForm({ onDeckCreated }) {
  const [deckName, setDeckName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
    }
  };

  return (
    <div className="box shadow-lg">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <div className="control">
            <input
              className="input"
              type="text"
              placeholder="Deck Name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <div className="control">
            <input
              className="input"
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <div className="control">
            <input
              className="input"
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="help is-danger">{error}</p>}

        <div className="field">
          <div className="control">
            <button className="button is-primary" type="submit">
              Add Deck
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
