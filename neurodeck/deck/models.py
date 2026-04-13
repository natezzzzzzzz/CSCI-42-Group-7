from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

# Utility function for incremental IDs
def generate_id(prefix, model, digits=4):
    last = model.objects.order_by("-" + model._meta.pk.name).first()
    if last:
        last_num = last.pk.replace(prefix, "")
        new_num = int(last_num) + 1 if last_num.isdigit() else 1
    else:
        new_num = 1
    return f"{prefix}{new_num:0{digits}d}"


class Deck(models.Model):
    DeckID = models.CharField(primary_key=True, max_length=20, editable=False)
    UserID = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name='user_decks')
    DeckName = models.CharField(max_length=20, default="None")
    Description = models.CharField(max_length=255, blank=True, null=True, default="None")
    Category = models.CharField(max_length=20, blank=True, null=True, default="None")
    IsPublic = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)
    last_studied = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.DeckID:
            self.DeckID = generate_id("DECK-", Deck)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.DeckName} by {self.UserID.username}"


class Flashcard(models.Model):
    CardID = models.AutoField(primary_key=True)
    DeckID = models.ForeignKey("deck.Deck", on_delete=models.CASCADE, related_name='cards')
    Question = models.CharField(max_length=255, default="None")
    Answer = models.CharField(max_length=255, blank=True, null=True, default="None")
    QuestionImage = models.ImageField(upload_to="card_images/", blank=True, null=True)
    AnswerImage = models.ImageField(upload_to="card_images/", blank=True, null=True)
    FlashDateCreated = models.DateTimeField(auto_now_add=True)
    LastReviewed = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Card {self.CardID} in {self.DeckID.DeckName}"


class CardProgress(models.Model):
    class CardState(models.TextChoices):
        NEW = 'new', 'New'
        LEARNING = 'learning', 'Learning'
        REVIEW = 'review', 'Review'
        RELEARNING = 'relearning', 'Relearning'

    UserID = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name='user_card_progress')
    CardID = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name='card_progress')

    # SM-2 scheduling fields
    State = models.CharField(max_length=12, choices=CardState.choices, default=CardState.NEW)
    EF = models.FloatField(default=2.5, help_text="Easiness factor (min 1.3, starts at 2.5)")
    Repetitions = models.PositiveIntegerField(default=0, help_text="Consecutive successful recalls in review state")
    Interval = models.FloatField(default=0, help_text="Current interval in days (0 = not yet scheduled)")
    StepIndex = models.PositiveIntegerField(default=0, help_text="Current index within learning/relearning steps")
    NextReview = models.DateTimeField(null=True, blank=True, help_text="When card is due next (null = due now)")
    LastReviewed = models.DateTimeField(null=True, blank=True, help_text="Timestamp of most recent review")
    Mastered = models.BooleanField(default=False)

    class Meta:
        unique_together = ('UserID', 'CardID')

    def __str__(self):
        return f"{self.UserID.username} progress on Card {self.CardID.CardID}"


class DeckSettings(models.Model):
    """Per-deck spaced repetition settings (daily limits)."""
    DeckID = models.OneToOneField(
        Deck, on_delete=models.CASCADE, primary_key=True, related_name='settings'
    )
    MaxNewPerDay = models.PositiveIntegerField(
        default=20, help_text="Maximum new cards to introduce per day"
    )
    MaxLearningPerDay = models.PositiveIntegerField(
        default=20, help_text="Maximum learning cards to study per day"
    )
    MaxReviewPerDay = models.PositiveIntegerField(
        default=100, help_text="Maximum review cards to study per day"
    )

    def __str__(self):
        return f"Settings for {self.DeckID.DeckName}"


class DeckDailyCount(models.Model):
    """Tracks how many cards of each type a user has studied today for a deck."""
    UserID = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name='daily_counts')
    DeckID = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='daily_counts')
    Date = models.DateField()
    NewStudied = models.PositiveIntegerField(default=0)
    LearningStudied = models.PositiveIntegerField(default=0)
    ReviewStudied = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('UserID', 'DeckID', 'Date')

    def __str__(self):
        return f"{self.UserID.username} - {self.DeckID.DeckName} on {self.Date}"


@receiver(post_save, sender=Deck)
def create_deck_settings(sender, instance, created, **kwargs):
    """Auto-create DeckSettings when a new Deck is created."""
    if created:
        DeckSettings.objects.get_or_create(DeckID=instance)