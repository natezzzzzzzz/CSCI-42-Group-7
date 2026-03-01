// src/components/DeckList.jsx
import React, { useEffect, useState } from "react";
import { fetchDecks, deleteDeck } from "../api/deckApi";
import DeckItem from "./DeckItem";

export default function DeckList({ refresh }) {
  const [decks, setDecks] = useState([]);

  const loadDecks = async () => {
    try {
      const data = await fetchDecks();
      setDecks(data);
    } catch (err) {
      console.error("Error fetching decks:", err);
    }
  };

  const handleDelete = async (deckId) => {
    try {
      await deleteDeck(deckId);
      setDecks(decks.filter(deck => deck.DeckID !== deckId));
    } catch (err) {
      console.error("Error deleting deck:", err);
    }
  };

  useEffect(() => {
    loadDecks();
  }, [refresh]); // reload whenever 'refresh' changes

  if (decks.length === 0) return <p>No decks available.</p>;

  return (
    <div>
      {decks.map(deck => (
        <DeckItem key={deck.DeckID} deck={deck} onDelete={handleDelete} />
      ))}
    </div>
  );
}