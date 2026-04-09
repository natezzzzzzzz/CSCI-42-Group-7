from django.contrib.auth import get_user_model
from django.db import models


class Achievement(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50, default="🏆")
    criteria = models.CharField(max_length=50)
    threshold = models.IntegerField(default=1)
    multiplayer_only = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="achievements")
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="user_achievements")
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "achievement")

    def __str__(self):
        return f"{self.user.username} earned '{self.achievement.name}'"