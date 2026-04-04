from rest_framework import serializers
from .models import Deck, Flashcard

class DeckSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deck
        fields = '__all__'
        read_only_fields = ['DeckID', 'UserID', 'date_created', 'last_studied']

class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = '__all__'
        read_only_fields = ['CardID', 'DeckID', 'FlashDateCreated', 'LastReviewed']
