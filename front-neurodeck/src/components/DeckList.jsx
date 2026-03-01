import React from "react";
import DeckItem from "./DeckItem";

export default function DeckList({ decks, searchQuery, filterCategory, onUpdate, onDelete }) {
  const filteredDecks = decks.filter(deck => {
    const matchesName = deck.DeckName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory
      ? deck.Category.toLowerCase().includes(filterCategory.toLowerCase())
      : true;
    return matchesName && matchesCategory;
  });

  return (
    <div>
      {filteredDecks.map(deck => (
        <DeckItem
          key={deck.DeckID}
          deck={deck}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      {filteredDecks.length === 0 && <p>No decks found.</p>}
    </div>
  );
}