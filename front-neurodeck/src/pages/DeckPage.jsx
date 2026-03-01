import React, { useEffect, useState } from "react";
import DeckForm from "../components/DeckForm";
import DeckList from "../components/DeckList";
import { fetchDecks } from "../api/deckApi";

export default function DeckPage() {
  const [decks, setDecks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // initial load
  useEffect(() => {
    const load = async () => {
      const data = await fetchDecks();
      setDecks(data);
    };
    load();
  }, []);

  // called by DeckForm when a new deck is created
  const handleDeckCreated = (newDeck) => {
    setDecks(prev => [newDeck, ...prev]); // prepend new deck
  };

  const handleDeckUpdate = (updatedDeck) => {
    setDecks(prev => prev.map(d => d.DeckID === updatedDeck.DeckID ? updatedDeck : d));
  };

  const handleDeckDelete = (deckId) => {
    setDecks(prev => prev.filter(d => d.DeckID !== deckId));
  };

  return (
    <div>
      <h2>My Decks</h2>

      <DeckForm onDeckCreated={handleDeckCreated} />

      {/* Search / filter inputs */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by deck name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Filter by category..."
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        />
      </div>

      <DeckList
        decks={decks}
        searchQuery={searchQuery}
        filterCategory={filterCategory}
        onUpdate={handleDeckUpdate}
        onDelete={handleDeckDelete}
      />
    </div>
  );
}