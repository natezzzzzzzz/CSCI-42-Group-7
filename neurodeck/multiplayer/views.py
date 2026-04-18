import random
import string

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from deck.models import Deck, Flashcard
from deck.serializers import DeckSerializer
from .models import MultiplayerRoom, RoomParticipant
from .serializers import AnswerSerializer, MultiplayerRoomSerializer


def _finalize_game(room):
    """
    Create GameResult records and fire achievement events for all active participants.
    Called when a multiplayer game ends (natural finish, manual end, or last player leaves).
    Idempotent — skips if GameResults already exist for this room.
    Returns a dict mapping user IDs to lists of newly unlocked achievement dicts.
    """
    from achievements.engine import AchievementEngine, GameCompletedEvent
    from achievements.models import GameResult

    if GameResult.objects.filter(room=room).exists():
        return {}

    participants = RoomParticipant.objects.filter(
        Room=room, IsActive=True
    ).order_by("-Score")

    if not participants.exists():
        return {}

    participant_count = participants.count()
    scores = [p.Score for p in participants]
    top_score = scores[0] if scores else 0
    second_score = scores[1] if len(scores) > 1 else 0

    # Require 2+ participants for win/margin achievements to prevent
    # single-player games from trivially unlocking multiplayer awards.
    has_enough_players = participant_count >= 2

    achievements_by_user = {}

    for idx, p in enumerate(participants, 1):
        # All players tied for the top score are winners (not just the first
        # in the ordering).  Only counts when there are 2+ participants.
        is_winner = has_enough_players and p.Score == top_score
        margin = (top_score - second_score) if is_winner else 0

        GameResult.objects.create(
            user=p.User,
            room=room,
            score=p.Score,
            total_questions=room.TotalRounds,
            is_winner=is_winner,
            position=idx,
        )

        newly_unlocked = AchievementEngine.process_event(
            GameCompletedEvent(
                user=p.User,
                room=room,
                score=p.Score,
                total_questions=room.TotalRounds,
                is_winner=is_winner,
                position=idx,
                participant_count=participant_count,
                margin=margin,
            )
        )

        achievements_by_user[p.User.id] = [
            {
                "name": ua.achievement.name,
                "description": ua.achievement.description,
                "icon": ua.achievement.icon,
            }
            for ua in newly_unlocked
        ]

    return achievements_by_user


def generate_room_code():
    """Generate a unique 6-character alphanumeric room code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not MultiplayerRoom.objects.filter(RoomCode=code).exists():
            return code


class GetFlashcardView(APIView):
    """
    GET /multiplayer/<room_code>/flashcard/
    Returns the card at the CURRENT index without advancing it.
    All players call this to read the same card.
    Index is only advanced by NextCardView (host-only POST).
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

        card_order = room.get_card_order()
        if not card_order:
            return Response({"detail": "No cards in this deck."}, status=status.HTTP_404_NOT_FOUND)

        idx = room.CurrentCardIndex

        if idx >= room.TotalRounds:
            return Response(
                {"detail": "All rounds complete.", "game_over": True},
                status=status.HTTP_200_OK,
            )

        card_id = card_order[idx]
        card = get_object_or_404(Flashcard, pk=card_id)

        # NOTE: index is NOT advanced here — only NextCardView (host-only) does that.
        return Response({
            "CardID": card.CardID,
            "Question": card.Question,
            "QuestionImage": card.QuestionImage.url if card.QuestionImage else None,
            "current_round": idx + 1,
            "total_rounds": room.TotalRounds,
        })


class NextCardView(APIView):
    """
    POST /multiplayer/<room_code>/next/
    Host-only. Advances CurrentCardIndex by 1.
    Non-hosts detect the change via polling RoomDetailView and re-fetch the card themselves.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())

        if room.Host != request.user:
            return Response({"detail": "Only the host can advance cards."}, status=status.HTTP_403_FORBIDDEN)

        if room.Status != "playing":
            return Response({"detail": "Game is not active."}, status=status.HTTP_400_BAD_REQUEST)

        next_index = room.CurrentCardIndex + 1

        # Check for unsynced players — warn and BLOCK advance unless host explicitly confirms
        # Exclude the host from the unsynced check (host is a participant but shouldn't block themselves)
        unsynced_qs = RoomParticipant.objects.filter(Room=room, IsActive=True, CurrentCardSubmitted=False).exclude(User=request.user)
        unsynced_count = unsynced_qs.count()
        confirm = request.data.get("confirm", False) in (True, "true", "1")

        if unsynced_count > 0 and not confirm:
            return Response({
                "detail": "waiting",
                "warning": f"{unsynced_count} active player(s) haven't submitted yet.",
                "unsynced_count": unsynced_count,
                "blocking": True,
            }, status=status.HTTP_200_OK)

        # Auto-finish when all rounds are exhausted
        if next_index >= room.TotalRounds:
            room.Status = "finished"
            room.CurrentCardIndex = next_index
            room.save(update_fields=["Status", "CurrentCardIndex"])
            RoomParticipant.objects.filter(Room=room, IsActive=True).update(CurrentCardSubmitted=False)
            achievements_by_user = _finalize_game(room)
            my_achievements = achievements_by_user.get(request.user.id, [])
            return Response({"game_over": True, "new_achievements": my_achievements})

        room.CurrentCardIndex = next_index
        room.save(update_fields=["CurrentCardIndex"])
        RoomParticipant.objects.filter(Room=room, IsActive=True).update(CurrentCardSubmitted=False)

        return Response({"current_round": next_index + 1, "total_rounds": room.TotalRounds})


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


class LeaveRoomView(APIView):
    """
    POST /multiplayer/leave-room/
    Body: { room_code }
    Marks the user as inactive in the room. If the room is still active
    (waiting/playing) and the leaving user is the host, migrates host to the
    next earliest-joined participant. When all active participants have left,
    the room is finalized and deleted from the database.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_code = request.data.get("room_code", "").strip().upper()
        if not room_code:
            return Response({"detail": "room_code is required."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code)
        participant = get_object_or_404(RoomParticipant, Room=room, User=request.user)

        participant.IsActive = False
        participant.save(update_fields=["IsActive"])

        # If the room is already finished, just check for cleanup — no host migration needed.
        if room.Status == "finished":
            active_count = RoomParticipant.objects.filter(Room=room, IsActive=True).count()
            if active_count == 0:
                _finalize_game(room)
                try:
                    room.delete()
                except MultiplayerRoom.DoesNotExist:
                    pass
            return Response({"detail": "Left room successfully."})

        # Room is still active (waiting/playing) — handle host migration
        if room.Host == request.user:
            next_host = (
                RoomParticipant.objects
                .filter(Room=room, IsActive=True)
                .exclude(User=request.user)
                .order_by("JoinedAt")
                .first()
            )
            if next_host:
                room.Host = next_host.User
                room.save(update_fields=["Host"])
            else:
                room.Status = "finished"
                room.save(update_fields=["Status"])
                _finalize_game(room)

        # If all players have now left, finalize and delete the room
        active_count = RoomParticipant.objects.filter(Room=room, IsActive=True).count()
        if active_count == 0:
            _finalize_game(room)
            try:
                room.delete()
            except MultiplayerRoom.DoesNotExist:
                pass

        return Response({"detail": "Left room successfully."})


class RoomDetailView(APIView):
    """
    GET /multiplayer/<room_code>/
    Returns full room info including all participants and scores.
    Used for polling by all clients. When the room is finished, also
    returns any achievements the current user unlocked during this game.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())
        serializer = MultiplayerRoomSerializer(room)
        data = serializer.data

        if room.Status == "finished":
            from achievements.models import UserAchievement
            from datetime import timedelta
            recent = UserAchievement.objects.filter(
                user=request.user,
                unlocked_at__gte=timezone.now() - timedelta(minutes=5),
            ).select_related("achievement")
            data["new_achievements"] = [
                {
                    "name": ua.achievement.name,
                    "description": ua.achievement.description,
                    "icon": ua.achievement.icon,
                }
                for ua in recent
            ]

        return Response(data)


class StartGameView(APIView):
    """
    POST /multiplayer/<room_code>/start/
    Host-only. Transitions room from 'waiting' → 'playing'.
    Accepts optional body: { rounds } — number of rounds to play (capped at deck size).
    Initialises a deterministic shuffled card order so all players see the same cards.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())

        if room.Host != request.user:
            return Response({"detail": "Only the host can start the game."}, status=status.HTTP_403_FORBIDDEN)

        if room.Status != "waiting":
            return Response({"detail": f"Room is already '{room.Status}'."}, status=status.HTTP_400_BAD_REQUEST)

        # Build a shuffled card order
        card_ids = list(room.Deck.cards.values_list("CardID", flat=True))
        if not card_ids:
            return Response({"detail": "Cannot start — the deck has no cards."}, status=status.HTTP_400_BAD_REQUEST)

        random.shuffle(card_ids)

        # Resolve requested rounds (capped at deck size)
        requested_rounds = request.data.get("rounds", len(card_ids))
        try:
            requested_rounds = int(requested_rounds)
        except (ValueError, TypeError):
            requested_rounds = len(card_ids)
        total_rounds = min(max(1, requested_rounds), len(card_ids))

        room.Status = "playing"
        room.CurrentCardIndex = 0
        room.TotalRounds = total_rounds
        room.set_card_order(card_ids)
        room.save()
        RoomParticipant.objects.filter(Room=room, IsActive=True).update(CurrentCardSubmitted=False)

        serializer = MultiplayerRoomSerializer(room)
        return Response(serializer.data)


class EndGameView(APIView):
    """
    POST /multiplayer/<room_code>/end/
    Host-only. Transitions room from 'playing' → 'finished'.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(MultiplayerRoom, RoomCode=room_code.upper())

        if room.Host != request.user:
            return Response({"detail": "Only the host can end the game."}, status=status.HTTP_403_FORBIDDEN)

        if room.Status != "playing":
            return Response(
                {"detail": f"Cannot end — room is '{room.Status}', not 'playing'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        room.Status = "finished"
        room.save()
        achievements_by_user = _finalize_game(room)

        serializer = MultiplayerRoomSerializer(room)
        my_achievements = achievements_by_user.get(request.user.id, [])
        return Response({**serializer.data, "new_achievements": my_achievements})


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
            participant.save(update_fields=["Score"])
        participant.CurrentCardSubmitted = True
        participant.LastAnswerCorrect = is_correct
        participant.save(update_fields=["CurrentCardSubmitted", "LastAnswerCorrect"])

        # --- Achievement system integration ---
        from achievements.engine import AchievementEngine, AnswerSubmittedEvent, CardStudiedEvent
        from achievements.models import AnswerRecord

        # Record the answer for history
        AnswerRecord.objects.create(
            user=request.user,
            room=room,
            card=card,
            is_correct=is_correct,
            answer_given=answer,
            mode="multiplayer",
        )

        # Fire achievement events
        all_unlocked = []
        all_unlocked += AchievementEngine.process_event(
            AnswerSubmittedEvent(
                user=request.user,
                is_correct=is_correct,
                mode="multiplayer",
                room=room,
                card=card,
            )
        )
        all_unlocked += AchievementEngine.process_event(
            CardStudiedEvent(
                user=request.user,
                card=card,
                deck=room.Deck,
                mode="multiplayer",
            )
        )

        return Response({
            "is_correct": is_correct,
            "correct_answer": card.Answer,
            "correct_answer_image": card.AnswerImage.url if card.AnswerImage else None,
            "score": participant.Score,
            "new_achievements": [
                {
                    "name": ua.achievement.name,
                    "description": ua.achievement.description,
                    "icon": ua.achievement.icon,
                }
                for ua in all_unlocked
            ],
        })


class ListDecksForRoomView(APIView):
    """
    GET /multiplayer/decks/
    Returns a lightweight list of the authenticated user's decks for the room-creation picker.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        decks = Deck.objects.filter(UserID=request.user).order_by("DeckName")
        data = [
            {"DeckID": d.DeckID, "DeckName": d.DeckName, "card_count": d.cards.count()}
            for d in decks
        ]
        return Response(data)
