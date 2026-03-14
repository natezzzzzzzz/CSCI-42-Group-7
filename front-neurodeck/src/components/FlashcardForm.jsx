import React, { useState } from "react";
import { createFlashcard } from "../api/flashcardApi";

export default function FlashcardForm({ deckId, onFlashcardCreated }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newCard = {
      DeckID: deckId,
      Question: question,
      Answer: answer
    };

    const savedCard = await createFlashcard(newCard);

    onFlashcardCreated(savedCard);

    setQuestion("");
    setAnswer("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <input
        type="text"
        placeholder="Answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <button type="submit">Add</button>
    </form>
  );
}
