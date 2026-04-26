import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DeckForm from "../components/DeckForm";
import DeckSettingsModal from "../components/DeckSettingsModal";
import CustomStudyModal from "../components/CustomStudyModal";
import DashboardLayout from "../components/DashboardLayout";
import { fetchDecks, deleteDeck, fetchLeaderboard } from "../api/deckApi";
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

export default function DeckPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [decks, setDecks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(null);
  const [showStudy, setShowStudy] = useState(null);
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
        {filteredDecks.map(deck => {
          const dateStr =
            deck.LastReviewed || deck.last_reviewed ||
            deck.UpdatedAt || deck.updated_at ||
            deck.CreatedAt || deck.created_at || null;

          return (
            <div key={deck.DeckID} className="db-deck-item">
              <div className="db-deck-info">
                <p className="db-deck-name">{deck.DeckName}</p>
                <p className="db-deck-date">
                  {dateStr
                    ? `Reviewed on ${formatDate(dateStr)}`
                    : deck.Category || "No category"}
                </p>
                {error[deck.DeckID] && (
                  <p style={{ color: "#ef4444", fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
                    {error[deck.DeckID]}
                  </p>
                )}
              </div>

              <div className="db-deck-actions">
                <button
                  className="db-action-btn"
                  title="Settings"
                  onClick={() => setShowSettings(deck.DeckID)}
                >
                  ⚙
                </button>
                <button
                  className="db-action-btn db-action-danger"
                  title="Delete"
                  onClick={() => handleDelete(deck.DeckID)}
                >
                  ✕
                </button>
                <button
                  className="db-review-btn"
                  onClick={() => setShowStudy(deck)}
                >
                  Review
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

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
