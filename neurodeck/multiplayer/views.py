import random
import string

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from deck.models import Deck, Flashcard
from .models import MultiplayerRoom, RoomParticipant
from .serializers import AnswerSerializer, MultiplayerRoomSerializer


def generate_room_code():
    """Generate a unique 6-character alphanumeric room code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not MultiplayerRoom.objects.filter(RoomCode=code).exists():
            return code


class CreateRoomView(APIView):
    """
    POST /multiplayer/create-room/
    Body: { deck_id }
    Creates a room and adds the requesting user as host + first participant.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        deck_id = request.data.get("deck_id")
        if not deck_id:
            return Response({"detail": "deck_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        deck = get_object_or_404(Deck, pk=deck_id)

        room = MultiplayerRoom.objects.create(
            Deck=deck,
            Host=request.user,
            RoomCode=generate_room_code(),
        )
        # Host is automatically added as a participant
        RoomParticipant.objects.create(Room=room, User=request.user)

        serializer = MultiplayerRoomSerializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JoinRoomView(APIView):
    """
    POST /multiplayer/join-room/
    Body: { room_code }
    Adds the requesting user to the room (idempotent — rejoining is safe).
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_code = request.data.get("room_code", "").strip().upper()
        if not room_code:
            return Response({"detail": "room_code is required."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code)

        if room.Status == "finished":
            return Response({"detail": "This room has already finished."}, status=status.HTTP_400_BAD_REQUEST)

        RoomParticipant.objects.get_or_create(Room=room, User=request.user)

        serializer = MultiplayerRoomSerializer(room)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoomDetailView(APIView):
    """
    GET /multiplayer/<room_code>/
    Returns full room info including all participants and scores.
    Used for polling.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())
        serializer = MultiplayerRoomSerializer(room)
        return Response(serializer.data)


class StartGameView(APIView):
    """
    POST /multiplayer/<room_code>/start/
    Host-only. Transitions room from 'waiting' → 'playing'.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())

        if room.Host != request.user:
            return Response({"detail": "Only the host can start the game."}, status=status.HTTP_403_FORBIDDEN)

        if room.Status != "waiting":
            return Response({"detail": f"Room is already '{room.Status}'."}, status=status.HTTP_400_BAD_REQUEST)

        room.Status = "playing"
        room.save()

        serializer = MultiplayerRoomSerializer(room)
        return Response(serializer.data)


class GetFlashcardView(APIView):
    """
    GET /multiplayer/<room_code>/flashcard/
    Returns a random card from the room's deck.
    The Answer field is intentionally omitted — grading happens server-side.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())

        if room.Status != "playing":
            return Response(
                {"detail": "The game hasn't started yet or has already finished."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        flashcards = list(room.Deck.cards.all())
        if not flashcards:
            return Response({"detail": "No cards in this deck."}, status=status.HTTP_404_NOT_FOUND)

        card = random.choice(flashcards)
        return Response({
            "CardID": card.CardID,
            "Question": card.Question,
            # Answer is intentionally hidden — evaluated server-side in SubmitAnswerView
        })


class SubmitAnswerView(APIView):
    """
    POST /multiplayer/submit-answer/
    Body: { room_code, card_id, answer }
    Grades the answer server-side and increments the participant's score if correct.
    Returns updated score and whether the answer was correct.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        room_code = serializer.validated_data["room_code"]
        card_id = serializer.validated_data["card_id"]
        answer = serializer.validated_data["answer"]

        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())
        card = get_object_or_404(Flashcard, pk=card_id)
        participant = get_object_or_404(RoomParticipant, Room=room, User=request.user)

        is_correct = answer.strip().lower() == card.Answer.strip().lower()
        if is_correct:
            participant.Score += 1
            participant.save()

        return Response({
            "is_correct": is_correct,
            "correct_answer": card.Answer,
            "score": participant.Score,
        })