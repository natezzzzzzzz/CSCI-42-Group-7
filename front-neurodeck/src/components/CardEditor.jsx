import React, { useState, useEffect } from "react";
import { fetchCards, createCard, updateCard, deleteCard } from "../api/deckApi";

export default function CardEditor({ deckId }) {
  const [cards, setCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    loadCards();
  }, [deckId]);

  async function loadCards() {
    setLoading(true);
    try {
      const data = await fetchCards(deckId);
      setCards(data);
    } catch (err) {
      setError("Failed to load cards.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCard(e) {
    e.preventDefault();
    setAddError("");
    try {
      const card = await createCard(deckId, {
        Question: newQuestion,
        Answer: newAnswer,
      });
      setCards((prev) => [...prev, card]);
      setNewQuestion("");
      setNewAnswer("");
    } catch (err) {
      setAddError(err.message || "Failed to add card.");
    }
  }

  function startEditing(card) {
    setEditingId(card.CardID);
    setEditQuestion(card.Question);
    setEditAnswer(card.Answer);
    setEditError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditQuestion("");
    setEditAnswer("");
    setEditError("");
  }

  async function handleSaveEdit(cardId) {
    setEditError("");
    try {
      const updated = await updateCard(deckId, cardId, {
        Question: editQuestion,
        Answer: editAnswer,
      });
      setCards((prev) =>
        prev.map((c) => (c.CardID === cardId ? updated : c))
      );
      cancelEditing();
    } catch (err) {
      setEditError(err.message || "Failed to update card.");
    }
  }

  async function handleDeleteCard(cardId) {
    try {
      await deleteCard(deckId, cardId);
      setCards((prev) => prev.filter((c) => c.CardID !== cardId));
    } catch (err) {
      setError("Failed to delete card.");
    }
  }

  const filteredCards = cards.filter((card) => {
    const q = (card.Question ?? "").toLowerCase();
    const a = (card.Answer ?? "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return q.includes(query) || a.includes(query);
  });

  if (loading) return <p className="text-small">Loading cards...</p>;
  if (error) return <p className="help is-danger">{error}</p>;

  return (
    <div>
      {/* ── Add card form ── */}
      <form onSubmit={handleAddCard}>
        <div className="field">
          <div className="control">
            <input
              className="input"
              type="text"
              placeholder="Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="field">
          <div className="control">
            <input
              className="input"
              type="text"
              placeholder="Answer"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
          </div>
        </div>
        {addError && <p className="help is-danger">{addError}</p>}
        <div className="field">
          <div className="control">
            <button className="button is-primary is-small" type="submit">
              Add Card
            </button>
          </div>
        </div>
      </form>

      {/* ── Search ── */}
      {cards.length > 0 && (
        <div className="field">
          <div className="control">
            <input
              className="input is-small"
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Card list ── */}
      {filteredCards.length === 0 && cards.length > 0 && (
        <p className="text-small">No cards match your search.</p>
      )}
      {cards.length === 0 && (
        <p className="text-small">No cards yet. Add one above.</p>
      )}

      {filteredCards.map((card) => (
        <div className="box shadow-lg" key={card.CardID}>
          {editingId === card.CardID ? (
            <>
              <div className="field">
                <div className="control">
                  <input
                    className="input is-small"
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    placeholder="Question"
                  />
                </div>
              </div>
              <div className="field">
                <div className="control">
                  <input
                    className="input is-small"
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    placeholder="Answer"
                  />
                </div>
              </div>
              {editError && <p className="help is-danger">{editError}</p>}
              <div className="buttons">
                <button
                  className="button is-success is-small"
                  onClick={() => handleSaveEdit(card.CardID)}
                >
                  Save
                </button>
                <button className="button is-small" onClick={cancelEditing}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-small">
                <strong>Q:</strong> {card.Question}
              </p>
              <p className="text-small">
                <strong>A:</strong> {card.Answer || <em>No answer yet</em>}
              </p>
              <div className="buttons">
                <button
                  className="button is-small"
                  onClick={() => startEditing(card)}
                >
                  Edit
                </button>
                <button
                  className="button is-small is-danger"
                  onClick={() => handleDeleteCard(card.CardID)}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
