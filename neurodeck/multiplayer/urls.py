from django.urls import path
from .views import (
    CreateRoomView,
    JoinRoomView,
    RoomDetailView,
    StartGameView,
    EndGameView,
    GetFlashcardView,
    SubmitAnswerView,
    ListDecksForRoomView,
)

urlpatterns = [
    # Utility
    path("decks/", ListDecksForRoomView.as_view(), name="multiplayer-decks"),

    # Room lifecycle (non-code-scoped)
    path("create-room/", CreateRoomView.as_view(), name="create-room"),
    path("join-room/", JoinRoomView.as_view(), name="join-room"),
    path("submit-answer/", SubmitAnswerView.as_view(), name="submit-answer"),

    # Room-scoped endpoints  (<room_code> is always uppercased in views)
    path("<str:room_code>/", RoomDetailView.as_view(), name="room-detail"),
    path("<str:room_code>/start/", StartGameView.as_view(), name="start-game"),
    path("<str:room_code>/end/", EndGameView.as_view(), name="end-game"),
    path("<str:room_code>/flashcard/", GetFlashcardView.as_view(), name="get-flashcard"),
]