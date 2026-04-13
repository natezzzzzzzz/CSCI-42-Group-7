const BASE_URL = "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/";
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data === "object") {
        message = Object.values(data).flat().join(" ");
      }
    } catch {
      // Response body wasn't JSON — use the default message
    }
    throw new Error(message);
  }
  return res.json();
}

async function get(url, opts = {}) {
  return handleResponse(
    await fetch(url, { method: "GET", headers: authHeaders(), ...opts })
  );
}

async function post(url, body = {}) {
  return handleResponse(
    await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
  );
}

async function patch(url, body = {}) {
  return handleResponse(
    await fetch(url, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
  );
}

async function del(url) {
  return handleResponse(
    await fetch(url, { method: "DELETE", headers: authHeaders() })
  );
}

// ─── DECK ────────────────────────────────────

export const fetchDecks = () => get(`${BASE_URL}/deck/api/decks/`);

export const createDeck = (data) =>
  post(`${BASE_URL}/deck/api/decks/create/`, data);

export const updateDeck = (id, data) =>
  patch(`${BASE_URL}/deck/api/decks/${id}/update/`, data);

export const deleteDeck = (id) =>
  del(`${BASE_URL}/deck/api/decks/${id}/delete/`);

export const fetchDeckSettings = (id) =>
  get(`${BASE_URL}/deck/api/decks/${id}/settings/`);

export const updateDeckSettings = (id, data) =>
  patch(`${BASE_URL}/deck/api/decks/${id}/settings/`, data);

export const fetchDeckStudyStats = (id) =>
  get(`${BASE_URL}/deck/api/decks/${id}/study-stats/`);

// ─── CARDS ───────────────────────────────────

export async function createCard(deckId, cardData) {
  const hasImages = cardData.QuestionImage || cardData.AnswerImage;

  if (hasImages) {
    const formData = new FormData();
    formData.append("Question", cardData.Question);
    formData.append("Answer", cardData.Answer || "");
    if (cardData.QuestionImage) formData.append("QuestionImage", cardData.QuestionImage);
    if (cardData.AnswerImage) formData.append("AnswerImage", cardData.AnswerImage);
    const token = localStorage.getItem("access");
    const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/create/`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    return handleResponse(res);
  }

  const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(cardData),
  });
  return handleResponse(res);
}

export async function updateCard(deckId, cardId, cardData) {
  const hasImages =
    cardData.QuestionImage instanceof File || cardData.AnswerImage instanceof File;
  const hasClearFlags = cardData.clear_QuestionImage || cardData.clear_AnswerImage;

  if (hasImages || hasClearFlags) {
    const formData = new FormData();
    if (cardData.Question) formData.append("Question", cardData.Question);
    if (cardData.Answer !== undefined) formData.append("Answer", cardData.Answer);
    if (cardData.QuestionImage instanceof File)
      formData.append("QuestionImage", cardData.QuestionImage);
    if (cardData.AnswerImage instanceof File)
      formData.append("AnswerImage", cardData.AnswerImage);
    if (cardData.clear_QuestionImage) formData.append("clear_QuestionImage", "true");
    if (cardData.clear_AnswerImage) formData.append("clear_AnswerImage", "true");
    const token = localStorage.getItem("access");
    const res = await fetch(
      `${BASE_URL}/deck/api/decks/${deckId}/cards/${cardId}/update/`,
      {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      }
    );
    return handleResponse(res);
  }

  const res = await fetch(
    `${BASE_URL}/deck/api/decks/${deckId}/cards/${cardId}/update/`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(cardData),
    }
  );
  return handleResponse(res);
}

export const fetchCards = (id) =>
  get(`${BASE_URL}/deck/api/decks/${id}/cards/`);

export const deleteCard = (deckId, cardId) =>
  del(`${BASE_URL}/deck/api/decks/${deckId}/cards/${cardId}/delete/`);

// ─── SOLO ─────────────────────────────────────

export const startSoloSession = (deckId, daysAhead = 0) =>
  post(`${BASE_URL}/deck/api/solo/start-session/`, {
    deck_id: deckId,
    days_ahead: daysAhead,
  });

export const rateSoloCard = (cardId, rating) =>
  post(`${BASE_URL}/deck/api/solo/rate-card/`, { card_id: cardId, rating });

export const reportSoloCardStudied = (cardId, isCorrect = null) =>
  post(`${BASE_URL}/deck/api/solo/card-studied/`, {
    card_id: cardId,
    is_correct: isCorrect,
  });

export const reportSoloSessionComplete = (
  deckId,
  cardsStudied,
  correctCount,
  totalCount,
  cardsMastered = 0,
  durationSeconds = 0
) =>
  post(`${BASE_URL}/deck/api/solo/complete/`, {
    deck_id: deckId,
    cards_studied: cardsStudied,
    correct_count: correctCount,
    total_count: totalCount,
    cards_mastered: cardsMastered,
    session_duration_seconds: durationSeconds,
  });

// ─── MULTIPLAYER ──────────────────────────────

export const fetchMyDecks = () => get(`${BASE_URL}/multiplayer/decks/`);

export const createRoom = (deckId) =>
  post(`${BASE_URL}/multiplayer/create-room/`, { deck_id: deckId });

export const joinRoom = (code) =>
  post(`${BASE_URL}/multiplayer/join-room/`, { room_code: code });

export const getRoomDetail = (code) => get(`${BASE_URL}/multiplayer/${code}/`);

export const startGame = (code, rounds) =>
  post(`${BASE_URL}/multiplayer/${code}/start/`, { rounds });

export const nextCard = (code, confirm = false) =>
  post(`${BASE_URL}/multiplayer/${code}/next/`, { confirm });

export const endGame = (code) => post(`${BASE_URL}/multiplayer/${code}/end/`);

export const getFlashcard = (code) =>
  get(`${BASE_URL}/multiplayer/${code}/flashcard/`);

export const submitAnswer = (code, cardId, answer) =>
  post(`${BASE_URL}/multiplayer/submit-answer/`, {
    room_code: code,
    card_id: cardId,
    answer,
  });

export const leaveRoom = (code) =>
  post(`${BASE_URL}/multiplayer/leave-room/`, { room_code: code });

// ─── ACHIEVEMENTS ─────────────────────────────

export const fetchAchievements = () => get(`${BASE_URL}/achievements/`);

export const fetchAchievementStats = () => get(`${BASE_URL}/achievements/stats/`);

export const fetchActivityData = () => get(`${BASE_URL}/achievements/activity/`);

export const fetchRecentUnlocks = (limit = 5) =>
  get(`${BASE_URL}/achievements/?limit=${limit}`);

export const fetchLeaderboard = () =>
  get(`${BASE_URL}/achievements/leaderboard/`);

// ─── COSMETICS ────────────────────────────────

export const fetchCosmeticShop = () => get(`${BASE_URL}/cosmetics/shop/`);

export const purchaseCosmetic = (id) =>
  post(`${BASE_URL}/cosmetics/shop/${id}/purchase/`);

// ─── PROFILE ──────────────────────────────────

export const fetchAvatar = () => get(`${BASE_URL}/cosmetics/avatar/`);

export const fetchMyCosmetics = () => get(`${BASE_URL}/cosmetics/my/`);

export const equipCosmetic = (id) =>
  post(`${BASE_URL}/cosmetics/shop/${id}/equip/`);