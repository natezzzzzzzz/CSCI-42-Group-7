import React, { useState } from "react";
import DeckList from "../components/DeckList";
import DeckForm from "../components/DeckForm";

export default function DeckPage() {
  const [refresh, setRefresh] = useState(false);

  const handleDeckCreated = () => {
    setRefresh(prev => !prev); // toggle to trigger reload
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Deck Management</h1>
      <DeckForm onDeckCreated={handleDeckCreated} />
      <DeckList refresh={refresh} />
    </div>
  );
}