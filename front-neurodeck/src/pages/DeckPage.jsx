import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DeckForm from "../components/DeckForm";
import DeckSettingsModal from "../components/DeckSettingsModal";
import CustomStudyModal from "../components/CustomStudyModal";
import CardEditor from "../components/CardEditor";
import DashboardLayout from "../components/DashboardLayout";
import { fetchDecks, createDeck, updateDeck, deleteDeck, fetchLeaderboard } from "../api/deckApi";
import AuthContext from "../context/AuthContext";


const ITEMS_PER_PAGE = 6;


function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

// This page displays the user's decks in a dashboard layout, allowing them to create new decks, search existing ones, view deck details, access settings, and start study sessions.
// It also includes a right panel showing the global leaderboard. The page fetches the necessary data from the API and manages various UI states for modals and error handling.
function LeaderboardPanel({ leaderboard }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(leaderboard.length / ITEMS_PER_PAGE));
  const pageEntries = leaderboard.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);


  return (
    <div>
      <h2 className="db-leaderboard-title">Leaderboard</h2>
      <table className="db-lb-table">
        <thead>
          <tr>
            <th>Player</th>
            <th style={{ textAlign: "right" }}>Cards Reviewed</th>
          </tr>
        </thead>
        <tbody>
          {pageEntries.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", color: "#aaa", padding: "1rem 0" }}>
                No data yet
              </td>
            </tr>
          ) : (
            pageEntries.map((entry) => (
              <tr key={entry.rank}>
                <td>{entry.username}</td>
                <td style={{ textAlign: "right" }}>{entry.total_correct_answers ?? 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>


      {totalPages > 1 && (
        <div className="db-pagination">
          <button
            className="db-page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`db-page-btn${page === n ? " db-page-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="db-page-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}


function DeckRow({ deck, onDelete, onUpdate, showCards, onToggleCards, onSettings, onStudy }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(deck.DeckName);
  const [category, setCategory] = useState(deck.Category || "");
  const [description, setDescription] = useState(deck.Description || "");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);


  const dateStr =
    deck.LastReviewed || deck.last_reviewed ||
    deck.UpdatedAt || deck.updated_at ||
    deck.CreatedAt || deck.created_at || null;


  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const updated = await updateDeck(deck.DeckID, {
        DeckName: name,
        Category: category,
        Description: description,
      });
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }


  function handleCancel() {
    setName(deck.DeckName);
    setCategory(deck.Category || "");
    setDescription(deck.Description || "");
    setSaveError("");
    setEditing(false);
  }


  return (
    <div className={`db-deck-entry${showCards ? " db-deck-entry--open" : ""}`}>
      {editing ? (
        <div className="db-deck-edit-form">
          <div className="db-deck-edit-fields">
            <input
              className="db-deck-edit-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Deck name"
              autoFocus
            />
            <input
              className="db-deck-edit-input"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Category (optional)"
            />
            <input
              className="db-deck-edit-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          {saveError && <p className="db-deck-edit-error">{saveError}</p>}
          <div className="db-deck-edit-actions">
            <button className="db-edit-save-btn" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="db-edit-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="db-deck-item">
          <div className="db-deck-info">
            <div className="db-deck-name-row">
              <p className="db-deck-name">{deck.DeckName}</p>
              {deck.Category && <span className="db-deck-badge">{deck.Category}</span>}
            </div>
            {deck.Description && (
              <p className="db-deck-desc">{deck.Description}</p>
            )}
            {dateStr && (
              <p className="db-deck-date">Last reviewed {formatDate(dateStr)}</p>
            )}
          </div>


          <div className="db-deck-actions">
            <button
              className={`db-cards-btn${showCards ? " db-cards-btn--active" : ""}`}
              onClick={onToggleCards}
            >
              {showCards ? "Hide Cards" : "Cards"}
            </button>
            <button className="db-action-btn" title="Edit deck" onClick={() => setEditing(true)}>
              ✎
            </button>
            <button className="db-action-btn" title="Settings" onClick={onSettings}>
              ⚙
            </button>
            <button className="db-action-btn db-action-danger" title="Delete" onClick={() => onDelete(deck.DeckID)}>
              ✕
            </button>
            <button className="db-review-btn" onClick={onStudy}>
              Review
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      )}


      {showCards && !editing && (
        <div className="db-card-editor-panel">
          <div className="db-card-editor-header">
            <span className="db-card-editor-title">Flashcards</span>
            <span className="db-card-editor-subtitle">Add and manage cards in this deck</span>
          </div>
          <div className="db-card-editor-body">
            <CardEditor deckId={deck.DeckID} />
          </div>
        </div>
      )}
    </div>
  );
}


export default function DeckPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [decks, setDecks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(null);
  const [showStudy, setShowStudy] = useState(null);
  const [showCards, setShowCards] = useState(null);
  const [error, setError] = useState({});


  useEffect(() => {
    fetchDecks().then(setDecks).catch(console.error);
    fetchLeaderboard()
      .then(d => setLeaderboard(d.leaderboard || []))
      .catch(console.error);
  }, []);


  const handleDeckCreated = (newDeck) => {
    setDecks(prev => [newDeck, ...prev]);
    setShowForm(false);
  };


  const handleDelete = async (deckId) => {
    try {
      await deleteDeck(deckId);
      setDecks(prev => prev.filter(d => d.DeckID !== deckId));
    } catch (err) {
      setError(prev => ({ ...prev, [deckId]: err.message || "Could not delete deck" }));
    }
  };


  const handleUpdate = (updated) => {
    setDecks(prev => prev.map(d => d.DeckID === updated.DeckID ? updated : d));
  };


  const filteredDecks = decks.filter(deck =>
    deck.DeckName?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <DashboardLayout rightPanel={<LeaderboardPanel leaderboard={leaderboard} />}>
      <div className="db-content-header">
        <h1 className="db-page-title">Dashboard</h1>
        <button className="db-new-btn" onClick={() => setShowForm(p => !p)}>
          + New Deck
        </button>
      </div>


      {showForm && (
        <div className="db-form-wrapper">
          <DeckForm onDeckCreated={handleDeckCreated} />
        </div>
      )}


      <input
        className="db-search"
        type="text"
        placeholder="Search decks..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />


      <div className="db-deck-list">
        {filteredDecks.map(deck => (
          <DeckRow
            key={deck.DeckID}
            deck={deck}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            showCards={showCards === deck.DeckID}
            onToggleCards={() => setShowCards(prev => prev === deck.DeckID ? null : deck.DeckID)}
            onSettings={() => setShowSettings(deck.DeckID)}
            onStudy={() => setShowStudy(deck)}
          />
        ))}


        {filteredDecks.length === 0 && (
          <p className="db-empty">
            {searchQuery ? "No decks match your search." : "No decks yet — create one above!"}
          </p>
        )}
      </div>


      {showSettings && (
        <DeckSettingsModal
          deckId={showSettings}
          onClose={() => setShowSettings(null)}
        />
      )}
      {showStudy && (
        <CustomStudyModal
          deckId={showStudy.DeckID}
          deckName={showStudy.DeckName}
          onClose={() => setShowStudy(null)}
        />
      )}
    </DashboardLayout>
  );
}

