import React, { useEffect, useState } from "react";
import DeckForm from "../components/DeckForm";
import DeckList from "../components/DeckList";
import FlashcardForm from "../components/FlashcardForm";
import FlashcardList from "../components/FlashcardList";
import { fetchDecks } from "../api/deckApi";
import { fetchFlashcards, deleteFlashcard, updateFlashcard } from "../api/flashcardApi";
import { useNavigate } from "react-router-dom";

export default function DeckPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [flashcards, setFlashcards] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [expandedDecks, setExpandedDecks] = useState({}); // track which decks are expanded

  // initial load
  useEffect(() => {
    const load = async () => {
      const data = await fetchDecks();
      setDecks(data);
    };
    load();
  }, []);

  // deck CRUD handlers
  const handleDeckCreated = (newDeck) => {
    setDecks(prev => [newDeck, ...prev]);
  };

  const handleDeckUpdate = (updatedDeck) => {
    setDecks(prev => prev.map(d => d.DeckID === updatedDeck.DeckID ? updatedDeck : d));
  };

  const handleDeckDelete = (deckId) => {
    setDecks(prev => prev.filter(d => d.DeckID !== deckId));
    setFlashcards(prev => {
      const copy = { ...prev };
      delete copy[deckId]; // remove flashcards for deleted deck
      return copy;
    });
  };

  // flashcard CRUD handlers
  const handleFlashcardCreated = (deckId, newCard) => {
    setFlashcards(prev => ({
      ...prev,
      [deckId]: [newCard, ...(prev[deckId] || [])]
    }));
  };

  const handleFlashcardUpdate = async (deckId, updatedCard) => {
    try {
      const savedCard = await updateFlashcard(updatedCard.CardID, {
        Question: updatedCard.Question,
        Answer: updatedCard.Answer
      });
      setFlashcards(prev => ({
        ...prev,
        [deckId]: prev[deckId].map(c => c.CardID === savedCard.CardID ? savedCard : c)
      }));
    } catch (error) {
      console.error("Failed to update flashcard:", error);
      alert("Failed to update flashcard. Please try again.");
      // Optionally show an error message to the user
    }
  };

  const handleFlashcardDelete = async (deckId, cardId) => {
    await deleteFlashcard(cardId);
    setFlashcards(prev => ({
      ...prev,
      [deckId]: prev[deckId].filter(c => c.CardID !== cardId)
    }));
  };

  // toggle deck expand/collapse
  const toggleDeck = async (deckId) => {
    setExpandedDecks(prev => ({ ...prev, [deckId]: !prev[deckId] }));
    if (!flashcards[deckId]) {
      const data = await fetchFlashcards(deckId);
      setFlashcards(prev => ({ ...prev, [deckId]: data }));
    }
  };

  // filtered decks
  const filteredDecks = decks.filter(d =>
    d.DeckName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    d.Category.toLowerCase().includes(filterCategory.toLowerCase())
  );

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

      {/* Deck list */}
      {filteredDecks.map(deck => (
        <div
          key={deck.DeckID}
          style={{
            border: "1px solid #ccc",
            borderRadius: "5px",
            padding: "10px",
            marginBottom: "10px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{deck.DeckName}</strong> ({deck.Category}) 
            </div>
            <div>
              <button onClick={() => toggleDeck(deck.DeckID)}>
                {expandedDecks[deck.DeckID] ? "Hide Flashcards" : "Show Flashcards"}
              </button>
              <button
                onClick={() => navigate(`/decks/${deck.DeckID}/study`)}
                style={{ marginLeft: "10px" }}
              >
              Study
              </button>
              <button
                onClick={() => handleDeckDelete(deck.DeckID)}
                style={{ marginLeft: "10px" }}
              >
                Delete Deck
              </button>
            </div>
          </div>

          {/* flashcards section */}
          {expandedDecks[deck.DeckID] && (
            <div style={{ marginTop: "10px" }}>
              <FlashcardForm
                deckId={deck.DeckID}
                onFlashcardCreated={(newCard) => handleFlashcardCreated(deck.DeckID, newCard)}
              />
              <br/>
              <FlashcardList
                flashcards={flashcards[deck.DeckID] || []}
                onUpdate={(updatedCard) => handleFlashcardUpdate(deck.DeckID, updatedCard)}
                onDelete={(cardId) => handleFlashcardDelete(deck.DeckID, cardId)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
