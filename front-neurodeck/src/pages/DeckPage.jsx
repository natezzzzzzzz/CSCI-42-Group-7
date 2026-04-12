import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeckForm from "../components/DeckForm";
import DeckList from "../components/DeckList";
import { fetchDecks } from "../api/deckApi";

export default function DeckPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await fetchDecks();
      setDecks(data);
    };
    load();
  }, []);

  const handleDeckCreated = (newDeck) => {
    setDecks(prev => [newDeck, ...prev]);
  };

  const handleDeckUpdate = (updatedDeck) => {
    setDecks(prev => prev.map(d => d.DeckID === updatedDeck.DeckID ? updatedDeck : d));
  };

  const handleDeckDelete = (deckId) => {
    setDecks(prev => prev.filter(d => d.DeckID !== deckId));
  };

  return (
    <div className="container mp-page">
      <div className="mp-page-header">
        <button className="mp-back-btn" onClick={() => navigate("/main")}> ← Back to Menu </button>
        
        <div className="mp-page-title">
          <h1 className="h4">My Decks</h1>
          <p className="tagline mp-subtitle">Create and manage your flashcard decks.</p>
        </div>
      </div>

      <DeckForm onDeckCreated={handleDeckCreated} />

      <div className="mp-panel" style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <input
          className="mp-input"
          style={{ marginBottom: 0 }}
          type="text"
          placeholder="Search by deck name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          className="mp-input"
          style={{ marginBottom: 0 }}
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