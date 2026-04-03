from django.db import models
from deck.models import Deck

# Reuse the same generate_id function
def generate_id(prefix, model, digits=4):
    last = model.objects.order_by("-" + model._meta.pk.name).first()
    if last:
        last_num = last.pk.replace(prefix, "")
        new_num = int(last_num) + 1 if last_num.isdigit() else 1
    else:
        new_num = 1
    return f"{prefix}{new_num:0{digits}d}"


class MultiplayerRoom(models.Model):
    RoomID = models.CharField(primary_key=True, max_length=20, editable=False)
    Deck = models.ForeignKey("deck.Deck", on_delete=models.CASCADE)
    Host = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name="hosted_rooms")
    RoomCode = models.CharField(max_length=10, unique=True)

    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("playing", "Playing"),
        ("finished", "Finished"),
    ]
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")

    def save(self, *args, **kwargs):
        if not self.RoomID:
            self.RoomID = generate_id("ROOM-", MultiplayerRoom)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Room {self.RoomCode}"


class RoomParticipant(models.Model):
    Room = models.ForeignKey(MultiplayerRoom, on_delete=models.CASCADE, related_name="participants")
    User = models.ForeignKey("api.User", on_delete=models.CASCADE)
    Score = models.IntegerField(default=0)
    JoinedAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('Room', 'User')

    def __str__(self):
        return f"{self.User.username} in {self.Room.RoomCode}"