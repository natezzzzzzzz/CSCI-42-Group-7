from django.db import models
from django.contrib.auth import get_user_model
# from django.db.models.signals import post_save
# from django.dispatch import receiver

User = get_user_model()
#This is the utility function to generate incremental IDs
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
    # UserID = models.ForeignKey("User", on_delete=models.CASCADE, related_name='user_decks')
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
        return self.DeckName # remove this when UserID is added
        # return f"{self.DeckName} by {self.UserID.username}"
        
    
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
    #UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_card_progress')
    CardID = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name='card_progress')
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

    # class Meta:
    #     unique_together = ('UserID', 'CardID')

    def __str__(self):
        return f"{self.UserID.username} progress on Card {self.CardID.CardID}"