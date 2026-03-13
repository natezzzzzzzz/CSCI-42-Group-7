const BASE_URL = "http://127.0.0.1:8000/deck/api/flashcards/";

export const fetchFlashcards = async (deckId) => {
  const res = await fetch(`${BASE_URL}${deckId}/`);
  return res.json();
};

export const createFlashcard = async (cardData) => {
  const res = await fetch(BASE_URL + "create/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cardData),
  });
  return res.json();
};

export const deleteFlashcard = async (cardId) => {
  const res = await fetch(`${BASE_URL}${cardId}/delete/`, {
    method: "DELETE",
  });
  return res.json();
};

export const updateFlashcard = async (cardId, cardData) => {
  const res = await fetch(`${BASE_URL}${cardId}/update/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cardData),
  });
  return res.json();
};
