import React, { useState } from "react";

export default function FlashcardForm({ deckId, onFlashcardCreated }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const newCard = {
      CardID: Date.now(),
      DeckID: deckId,
      Question: question,
      Answer: answer
    };

    onFlashcardCreated(newCard);

    setQuestion("");
    setAnswer("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "10px" }}>
      <input
        type="text"
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <input
        type="text"
        placeholder="Answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <button type="submit">Add</button>
    </form>
  );
}
