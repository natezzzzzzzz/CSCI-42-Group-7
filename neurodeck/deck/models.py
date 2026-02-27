from django.db import models

# Create your models here.
#TODO: Change primary keys to follow format, e.g CARD-0000 instead of 0000.
class Deck(models.Model):
    DeckID = models.AutoField(primary_key=True)  # can use custom ID if needed
    #UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    DeckName = models.CharField(max_length=20, default="None")
    Description = models.CharField(max_length=255, blank=True, null=True, default="None")
    Category = models.CharField(max_length=20, blank=True, null=True, default="None")
    IsPublic = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)
    last_studied = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} by {self.owner.username}"
    
class Flashcard(models.Model):
    CardID = models.AutoField(primary_key=True)
    DeckID = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    Question = models.CharField(max_length=255, default="None")
    Answer = models.CharField(max_length=255, blank=True, null=True, default="None")
    FlashDateCreated = models.DateTimeField(auto_now_add=True)
    LastReviewed = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Card {self.card_id} in {self.deck.name}"

class CardProgress(models.Model):
    #UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    CardID = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    difficulty_choices = [
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Difficult', 'Difficult'),
        ('Very Difficult', 'Very Difficult'),
    ]
    difficulty = models.CharField(max_length=20, choices=difficulty_choices, default='Normal')
    times_reviewed = models.PositiveIntegerField(default=0)
    next_review_date = models.DateTimeField(auto_now=True)
    last_review_date = models.DateTimeField(auto_now=True)
    mastered = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'card') 

    def __str__(self):
        return f"{self.user.username} progress on Card {self.card.card_id}"