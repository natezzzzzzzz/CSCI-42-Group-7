const BASE_URL = "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const message =
      typeof data === "object"
        ? Object.values(data).flat().join(" ")
        : "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function fetchDecks() {
  const res = await fetch(`${BASE_URL}/deck/api/decks/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createDeck(deckData) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(deckData),
  });
  return handleResponse(res);
}

export async function updateDeck(deckId, deckData) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/update/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(deckData),
  });
  return handleResponse(res);
}

export async function deleteDeck(deckId) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/delete/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Deck Settings API ──────────────────────────────────────────────────────

export async function fetchDeckSettings(deckId) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/settings/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function updateDeckSettings(deckId, settings) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/settings/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function fetchDeckStudyStats(deckId) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/study-stats/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Card API ─────────────────────────────────────────────────────────────────

export async function fetchCards(deckId) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createCard(deckId, cardData) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(cardData),
  });
  return handleResponse(res);
}

export async function updateCard(deckId, cardId, cardData) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/${cardId}/update/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(cardData),
  });
  return handleResponse(res);
}

export async function deleteCard(deckId, cardId) {
  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/${cardId}/delete/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Multiplayer API ──────────────────────────────────────────────────────────

export async function fetchMyDecks() {
  const res = await fetch(`${BASE_URL}/multiplayer/decks/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createRoom(deckId) {
  const res = await fetch(`${BASE_URL}/multiplayer/create-room/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deck_id: deckId }),
  });
  return handleResponse(res);
}

export async function joinRoom(roomCode) {
  const res = await fetch(`${BASE_URL}/multiplayer/join-room/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ room_code: roomCode }),
  });
  return handleResponse(res);
}

export async function getRoomDetail(roomCode) {
  const res = await fetch(`${BASE_URL}/multiplayer/${roomCode}/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function startGame(roomCode, rounds) {
  const body = rounds != null ? JSON.stringify({ rounds }) : JSON.stringify({});
  const res = await fetch(`${BASE_URL}/multiplayer/${roomCode}/start/`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  return handleResponse(res);
}

// ✅ Fixed: was using `api.post` (axios) but this file uses raw fetch
export async function nextCard(roomCode, confirm = false) {
  const res = await fetch(`${BASE_URL}/multiplayer/${roomCode}/next/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ confirm }),
  });
  return handleResponse(res);
}

export async function endGame(roomCode) {
  const res = await fetch(`${BASE_URL}/multiplayer/${roomCode}/end/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}

export async function getFlashcard(roomCode) {
  const res = await fetch(`${BASE_URL}/multiplayer/${roomCode}/flashcard/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function submitAnswer(roomCode, cardId, answer) {
  const res = await fetch(`${BASE_URL}/multiplayer/submit-answer/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ room_code: roomCode, card_id: cardId, answer }),
  });
  return handleResponse(res);
}

export async function leaveRoom(roomCode) {
  const res = await fetch(`${BASE_URL}/multiplayer/leave-room/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ room_code: roomCode }),
  });
  return handleResponse(res);
}

// ─── Achievements API ────────────────────────────────────────────────────────

export async function fetchAchievements() {
  const res = await fetch(`${BASE_URL}/achievements/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function fetchAchievementStats() {
  const res = await fetch(`${BASE_URL}/achievements/stats/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function fetchRecentUnlocks(limit = 5) {
  const res = await fetch(`${BASE_URL}/achievements/recent/?limit=${limit}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Solo Session API ───────────────────────────────────────────────────────

export async function startSoloSession(deckId, daysAhead = 0) {
  const body = { deck_id: deckId };
  if (daysAhead > 0) body.days_ahead = daysAhead;
  const res = await fetch(`${BASE_URL}/deck/api/solo/start-session/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function rateSoloCard(cardId, rating) {
  const res = await fetch(`${BASE_URL}/deck/api/solo/rate-card/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ card_id: cardId, rating }),
  });
  return handleResponse(res);
}

export async function reportSoloCardStudied(cardId, isCorrect = null) {
  const body = { card_id: cardId };
  if (isCorrect !== null) body.is_correct = isCorrect;
  const res = await fetch(`${BASE_URL}/deck/api/solo/card-studied/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function reportSoloSessionComplete(deckId, cardsStudied, correctCount, totalCount, cardsMastered = 0, durationSeconds = 0) {
  const res = await fetch(`${BASE_URL}/deck/api/solo/complete/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      deck_id: deckId,
      cards_studied: cardsStudied,
      correct_count: correctCount,
      total_count: totalCount,
      cards_mastered: cardsMastered,
      session_duration_seconds: durationSeconds,
    }),
  });
  return handleResponse(res);
}

// ─── Analytics API ──────────────────────────────────────────────────────────

export async function fetchActivityData() {
  const res = await fetch(`${BASE_URL}/achievements/activity/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}


// Cosmetics API

export async function fetchCosmeticShop() {
  const res = await fetch(`${BASE_URL}/api/cosmetics/shop/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function purchaseCosmetic(cosmeticId) {
  const res = await fetch(`${BASE_URL}/api/cosmetics/shop/${cosmeticId}/purchase/`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function equipCosmetic(cosmeticId) {
  const res = await fetch(`${BASE_URL}/api/cosmetics/shop/${cosmeticId}/equip/`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function fetchMyCosmetics() {
  const res = await fetch(`${BASE_URL}/api/cosmetics/my/`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}