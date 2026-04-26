from rest_framework import serializers
from .models import MultiplayerRoom, RoomParticipant

"""This returns full participant info — username + score + avatar — needed by the frontend."""
class RoomParticipantSerializer(serializers.ModelSerializer):
    
    username = serializers.CharField(source="User.username", read_only=True)
    user_id = serializers.IntegerField(source="User.pk", read_only=True)
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, obj):
        from cosmetics.models import Avatar, CosmeticItem
        try:
            avatar = Avatar.objects.select_related("equipped_cosmetic").get(user_id=obj.User_id)
        except Avatar.DoesNotExist:
            avatar = None
        item = avatar.equipped_cosmetic if avatar else None
        if not item:
            try:
                item = CosmeticItem.objects.get(cosmeticID="CSM_0008")
            except CosmeticItem.DoesNotExist:
                item = CosmeticItem.objects.first()
        return item.image.url if item else None

    class Meta:
        model = RoomParticipant
        fields = ["user_id", "username", "avatar_url", "Score", "JoinedAt", "CurrentCardSubmitted", "IsActive", "LastAnswerCorrect"]

""" This provides a full serialization of the multiplayer room, including nested participant info and related deck/host details. """
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

""" This serializer is used when a player submits an answer for a card, containing the necessary info to identify the room, card, and their answer. """
class AnswerSerializer(serializers.Serializer):
    """
    room_code  — identifies which room the answer belongs to (avoids ambiguous deck lookup)
    card_id    — IntegerField because Flashcard.CardID is an AutoField (integer PK)
    answer     — the user's typed answer
    """
    room_code = serializers.CharField(max_length=10)
    card_id = serializers.IntegerField()
    answer = serializers.CharField(max_length=255)