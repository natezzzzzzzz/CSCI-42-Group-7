from rest_framework import serializers
from .models import MultiplayerRoom, RoomParticipant


class RoomParticipantSerializer(serializers.ModelSerializer):
    """Returns full participant info — username + score — needed by the frontend."""
    username = serializers.CharField(source="User.username", read_only=True)
    user_id = serializers.IntegerField(source="User.pk", read_only=True)

    class Meta:
        model = RoomParticipant
        fields = ["user_id", "username", "Score", "JoinedAt", "CurrentCardSubmitted", "IsActive", "LastAnswerCorrect"]


class MultiplayerRoomSerializer(serializers.ModelSerializer):
    participants = RoomParticipantSerializer(many=True, read_only=True)
    deck_name = serializers.CharField(source="Deck.DeckName", read_only=True)
    host_username = serializers.CharField(source="Host.username", read_only=True)

    class Meta:
        model = MultiplayerRoom
        fields = [
            "RoomID", "RoomCode", "Status",
            "Deck", "deck_name",
            "Host", "host_username",
            "CurrentCardIndex", "TotalRounds",
            "participants",
        ]


class AnswerSerializer(serializers.Serializer):
    """
    room_code  — identifies which room the answer belongs to (avoids ambiguous deck lookup)
    card_id    — IntegerField because Flashcard.CardID is an AutoField (integer PK)
    answer     — the user's typed answer
    """
    room_code = serializers.CharField(max_length=10)
    card_id = serializers.IntegerField()
    answer = serializers.CharField(max_length=255)