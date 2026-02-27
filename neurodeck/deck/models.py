from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
# Create your models here.
#TODO: Change primary keys to follow format, e.g CARD-0000 instead of 0000.

#PLACEHOLDER FOR NOW, since we need user for userID FK.
class User(AbstractUser):
    username = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='api_user_set',  # unique related_name
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='api_user_permissions_set',  # unique related_name
        blank=True
    )
    
    def __str__(self):
        return self.email
    
    @property
    def profile(self):
        from api.models import Profile
        profile, created = Profile.objects.get_or_create(user=self)
        return profile
        
class Deck(models.Model):
    DeckID = models.AutoField(primary_key=True)  # can use custom ID if needed
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    DeckName = models.CharField(max_length=20, default="None")
    Description = models.CharField(max_length=255, blank=True, null=True, default="None")
    Category = models.CharField(max_length=20, blank=True, null=True, default="None")
    IsPublic = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)
    last_studied = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.DeckName} by {self.UserID.username}"
    
class Flashcard(models.Model):
    CardID = models.AutoField(primary_key=True)
    DeckID = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    Question = models.CharField(max_length=255, default="None")
    Answer = models.CharField(max_length=255, blank=True, null=True, default="None")
    FlashDateCreated = models.DateTimeField(auto_now_add=True)
    LastReviewed = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Card {self.CardID} in {self.DeckID.DeckName}"

class CardProgress(models.Model):
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    CardID = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name='cards')
    difficulty_choices = [
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Difficult', 'Difficult'),
        ('Very Difficult', 'Very Difficult'),
    ]
    Difficulty = models.CharField(max_length=20, choices=difficulty_choices, default='Normal')
    TimesReviewed = models.PositiveIntegerField(default=0)
    NextReviewDate = models.DateTimeField(auto_now_add=True)
    LastReviewDate = models.DateTimeField(auto_now_add=True)
    Mastered = models.BooleanField(default=False)

    class Meta:
        unique_together = ('UserID', 'CardID')

    def __str__(self):
        return f"{self.UserID.username} progress on Card {self.CardID.CardID}"