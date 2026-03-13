import React, { useState } from "react";

export default function FlashcardList({ flashcards, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const startEdit = (card) => {
    setEditingId(card.CardID);
    setQuestion(card.Question);
    setAnswer(card.Answer);
  };

  const saveEdit = () => {
    onUpdate({
      CardID: editingId,
      Question: question,
      Answer: answer,
    });
    setEditingId(null);
  };

  return (
    <div>
      {flashcards.map((card) => (
        <div
          key={card.CardID}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "5px",
          }}
        >
          {editingId === card.CardID ? (
            <>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ marginBottom: "5px" }}
              />

              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{ marginBottom: "5px" }}
              />

              <br />

              <button onClick={saveEdit}>Save</button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <div>
                <strong>Q:</strong> {card.Question}
              </div>

              <div>
                <strong>A:</strong> {card.Answer}
              </div>

              <button onClick={() => startEdit(card)}>Edit</button>

              <button
                onClick={() => onDelete(card.CardID)}
                style={{ marginLeft: "5px" }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
