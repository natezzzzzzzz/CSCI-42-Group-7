const BASE_URL = "http://127.0.0.1:8000/deck/api/decks/";

export const fetchDecks = async () => {
  const res = await fetch(BASE_URL);
  return res.json();
};

export const createDeck = async (deckData) => {
  const res = await fetch(BASE_URL + "create/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deckData),
  });
  return res.json();
};

export const deleteDeck = async (deckId) => {
  const res = await fetch(`${BASE_URL}${deckId}/delete/`, { method: "DELETE" });
  return res.json();
};