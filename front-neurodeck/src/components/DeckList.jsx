import React from "react";
import DeckItem from "./DeckItem";

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
    <div>
      {filteredDecks.map(deck => (
        <DeckItem
          key={deck.DeckID}
          deck={deck}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      {filteredDecks.length === 0 && <p className="text-small">No decks found.</p>}
    </div>
    
  );
}
