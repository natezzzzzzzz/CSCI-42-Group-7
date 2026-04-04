import json
from django.db import models


def generate_id(prefix, model, digits=4):
    """Generate a sequential prefixed ID (e.g. ROOM-0001)."""
    last = model.objects.order_by("-" + model._meta.pk.name).first()
    if last:
        last_num = last.pk.replace(prefix, "")
        new_num = int(last_num) + 1 if last_num.isdigit() else 1
    else:
        new_num = 1
    return f"{prefix}{new_num:0{digits}d}"


class MultiplayerRoom(models.Model):
    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("playing", "Playing"),
        ("finished", "Finished"),
    ]

    RoomID = models.CharField(primary_key=True, max_length=20, editable=False)
    Deck = models.ForeignKey("deck.Deck", on_delete=models.CASCADE, related_name="multiplayer_rooms")
    Host = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name="hosted_rooms")
    RoomCode = models.CharField(max_length=10, unique=True)
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")
    CreatedAt = models.DateTimeField(auto_now_add=True)

    # Round tracking
    CurrentCardIndex = models.IntegerField(default=0)
    TotalRounds = models.IntegerField(default=10)
    # JSON-stored list of card PKs in shuffled order, set when game starts
    CardOrder = models.TextField(default="[]")

    def get_card_order(self):
        """Return the card order as a Python list."""
        try:
            return json.loads(self.CardOrder)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_card_order(self, card_ids):
        """Store a list of card PKs as JSON."""
        self.CardOrder = json.dumps(card_ids)

    def save(self, *args, **kwargs):
        if not self.RoomID:
            self.RoomID = generate_id("ROOM-", MultiplayerRoom)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Room {self.RoomCode} [{self.Status}]"


class RoomParticipant(models.Model):
    Room = models.ForeignKey(MultiplayerRoom, on_delete=models.CASCADE, related_name="participants")
    User = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name="room_participations")
    Score = models.IntegerField(default=0)
    JoinedAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("Room", "User")

    def __str__(self):
        return f"{self.User.username} in {self.Room.RoomCode} (Score: {self.Score})"