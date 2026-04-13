from rest_framework import serializers
from .models import Deck, Flashcard

class DeckSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deck
        fields = '__all__'
        read_only_fields = ['DeckID', 'UserID', 'date_created', 'last_studied']

class FlashcardSerializer(serializers.ModelSerializer):
    def validate_QuestionImage(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image must be under 5MB.")
        return value

    def validate_AnswerImage(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image must be under 5MB.")
        return value

    class Meta:
        model = Flashcard
        fields = '__all__'
        read_only_fields = ['CardID', 'DeckID', 'FlashDateCreated', 'LastReviewed']