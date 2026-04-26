from django.conf import settings
from django.db import models

""" This module defines the data models for the achievements system. 
These models form the foundation for implementing the achievements system and tracking user progress towards unlocking achievements. """

class Achievement(models.Model):
    CATEGORY_CHOICES = [
        ("solo", "Solo"),
        ("multiplayer", "Multiplayer"),
        ("general", "General"),
    ]

    TIER_CHOICES = [
        ("bronze", "Bronze"),
        ("silver", "Silver"),
        ("gold", "Gold"),
        ("platinum", "Platinum"),
    ]

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50, default="trophy")
    criteria = models.CharField(max_length=50)
    threshold = models.IntegerField(default=1)
    multiplayer_only = models.BooleanField(default=False)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="general"
    )
    is_hidden = models.BooleanField(default=False)
    points = models.PositiveIntegerField(default=10)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default="bronze")

    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="achievements",
    )
    achievement = models.ForeignKey(
        Achievement, on_delete=models.CASCADE, related_name="user_achievements"
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "achievement")

    def __str__(self):
        return f"{self.user.username} earned '{self.achievement.name}'"


class UserStats(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stats",
    )
    total_cards_studied = models.PositiveIntegerField(default=0)
    total_decks_completed = models.PositiveIntegerField(default=0)
    total_games_played = models.PositiveIntegerField(default=0)
    total_games_won = models.PositiveIntegerField(default=0)
    total_correct_answers = models.PositiveIntegerField(default=0)
    total_answers = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    best_streak = models.PositiveIntegerField(default=0)
    multiplayer_games_played = models.PositiveIntegerField(default=0)
    multiplayer_games_won = models.PositiveIntegerField(default=0)
    solo_sessions_completed = models.PositiveIntegerField(default=0)
    last_study_date = models.DateField(null=True, blank=True)
    consecutive_study_days = models.PositiveIntegerField(default=0)
    best_consecutive_study_days = models.PositiveIntegerField(default=0)
    spaced_repetition_reviews = models.PositiveIntegerField(default=0)
    cards_mastered = models.PositiveIntegerField(default=0)
    currency = models.PositiveIntegerField(default=0) 

    class Meta:
        verbose_name_plural = "user stats"

    def __str__(self):
        return f"Stats for {self.user.username}"


class GameResult(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_results",
    )
    room = models.ForeignKey(
        "multiplayer.MultiplayerRoom",
        on_delete=models.SET_NULL,
        null=True,
        related_name="game_results",
    )
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    is_winner = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=1)
    played_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-played_at"]

    def __str__(self):
        return f"{self.user.username} - {self.score}pts ({'W' if self.is_winner else 'L'})"


class AnswerRecord(models.Model):
    MODE_CHOICES = [
        ("solo", "Solo"),
        ("multiplayer", "Multiplayer"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="answer_records",
    )
    room = models.ForeignKey(
        "multiplayer.MultiplayerRoom",
        on_delete=models.CASCADE,
        related_name="answer_records",
        null=True,
        blank=True,
    )
    card = models.ForeignKey(
        "deck.Flashcard",
        on_delete=models.SET_NULL,
        null=True,
    )
    is_correct = models.BooleanField()
    answer_given = models.CharField(max_length=255, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # Solo: 1=Again, 2=Hard, 3=Good, 4=Easy
    answered_at = models.DateTimeField(auto_now_add=True)
    mode = models.CharField(max_length=12, choices=MODE_CHOICES, default="multiplayer")

    class Meta:
        ordering = ["-answered_at"]

    def __str__(self):
        status = "correct" if self.is_correct else "wrong"
        return f"{self.user.username} - {status} ({self.mode})"