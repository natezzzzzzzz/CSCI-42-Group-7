const BASE_URL = "http://127.0.0.1:8000";

// This function returns JSON headers with the JWT access token if one is stored.
function authHeaders() {
  const token = localStorage.getItem("access");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

//This helper converts image paths from the backend into full URLs.
export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

// This helper checks the response status and parses JSON, throwing errors for non-OK responses.
async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/";
    throw new Error("Session expired. Please log in again.");
  }

  // For other non-OK responses, try to extract error messages from the JSON body.
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data === "object") {
        message = Object.values(data).flat().join(" ");
      }
    } catch {
      // If response isn't JSON, keep the generic error message.
    }
    throw new Error(message);
  }
  return res.json();
}

// This is a helper for making authenticated GET requests and handling responses.
async function get(url, opts = {}) {
  return handleResponse(
    await fetch(url, { method: "GET", headers: authHeaders(), ...opts })
  );
}


// This is a helper for making authenticated POST requests with JSON bodies and handling responses.
async function post(url, body = {}) {
  return handleResponse(
    await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
  );
}


// This is a helper for making authenticated PATCH requests with JSON bodies and handling responses.
async function patch(url, body = {}) {
  return handleResponse(
    await fetch(url, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
  );
}


// This is a helper for making authenticated DELETE requests and handling responses.
async function del(url) {
  return handleResponse(
    await fetch(url, { method: "DELETE", headers: authHeaders() })
  );
}

// ─── DECK SECTION ────────────────────────────────────

// These function are the main API calls for managing decks, including fetching, creating, updating, and deleting decks, as well as managing deck settings and study stats.

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

// ─── CARDS SECTION ───────────────────────────────────

export async function createCard(deckId, cardData) {
  const hasImages = cardData.QuestionImage || cardData.AnswerImage;

  // This handles both the case of uploading new images and the case of clearing existing images.
  if (hasImages) {
    const formData = new FormData();
    formData.append("Question", cardData.Question);
    formData.append("Answer", cardData.Answer || "");

    if (cardData.QuestionImage) formData.append("QuestionImage", cardData.QuestionImage);

    if (cardData.AnswerImage) formData.append("AnswerImage", cardData.AnswerImage);

    const token = localStorage.getItem("access");
    const res = await fetch(`${BASE_URL}/deck/api/decks/${deckId}/cards/create/`, 
      {
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

// This function updates a card, handling both the case of updating text fields and the case of uploading new images or clearing existing images.
export async function updateCard(deckId, cardId, cardData) {
  const hasImages =
    cardData.QuestionImage instanceof File || cardData.AnswerImage instanceof File;
  const hasClearFlags = cardData.clear_QuestionImage || cardData.clear_AnswerImage;

  // It uses FormData when uploading new files or when the clear flags are set
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

  // If there are no images to upload and no clear flags, we can just send JSON.
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

// This function fetches all cards for a given deck.
export const fetchCards = (id) =>
  get(`${BASE_URL}/deck/api/decks/${id}/cards/`);

// This function deletes a specific card from a deck.
export const deleteCard = (deckId, cardId) =>
  del(`${BASE_URL}/deck/api/decks/${deckId}/cards/${cardId}/delete/`);

// ─── SOLO SECTION ─────────────────────────────────────

// These functions manage solo study sessions, including starting a session, rating cards, reporting studied cards, and completing a session with stats.

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

// ─── MULTIPLAYER SECTION ──────────────────────────────

// These functions manage multiplayer sessions, including fetching available decks, creating and joining rooms, managing game flow, and submitting answers.

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

// ─── ACHIEVEMENTS SECTION ─────────────────────────────

// These functions manage achievements, including fetching available achievements, stats, recent unlocks, and leaderboard data.

export const fetchAchievements = () => get(`${BASE_URL}/achievements/`);

export const fetchAchievementStats = () => get(`${BASE_URL}/achievements/stats/`);

export const fetchActivityData = () => get(`${BASE_URL}/achievements/activity/`);

export const fetchRecentUnlocks = (limit = 5) =>
  get(`${BASE_URL}/achievements/recent/?limit=${limit}`);

export const fetchLeaderboard = () =>
  get(`${BASE_URL}/achievements/leaderboard/`);

// ─── COSMETICS SECTION ────────────────────────────────

// These functions manage cosmetics, including fetching the shop inventory, purchasing items, fetching the user's avatar and owned cosmetics, and equipping items.

export const fetchCosmeticShop = () => get(`${BASE_URL}/cosmetics/shop/`);

export const purchaseCosmetic = (id) =>
  post(`${BASE_URL}/cosmetics/shop/${id}/purchase/`);

// ─── PROFILE ──────────────────────────────────

export const fetchAvatar = () => get(`${BASE_URL}/cosmetics/avatar/`);

export const fetchMyCosmetics = () => get(`${BASE_URL}/cosmetics/my/`);

export const equipCosmetic = (id) =>
  post(`${BASE_URL}/cosmetics/shop/${id}/equip/`);