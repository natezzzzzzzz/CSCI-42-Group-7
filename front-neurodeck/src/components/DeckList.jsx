import React from "react";
import DeckItem from "./DeckItem";

// This component renders a list of DeckItem components based on the provided decks array.
export default function DeckList({ decks, searchQuery, filterCategory, onUpdate, onDelete }) {
  const filteredDecks = decks.filter(deck => {
    const name = deck.DeckName?.toLowerCase() ?? "";
    const category = deck.Category?.toLowerCase() ?? "";
    const matchesName = name.includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory
      ? category.includes(filterCategory.toLowerCase())
      : true;
    return matchesName && matchesCategory;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0", textAlign: "left" }}>
      {filteredDecks.map(deck => (
        <DeckItem
          key={deck.DeckID}
          deck={deck}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      {filteredDecks.length === 0 && (
        <p className="mp-empty">No decks found.</p>
      )}
    </div>
  );
}