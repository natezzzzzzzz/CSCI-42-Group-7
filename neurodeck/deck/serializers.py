from rest_framework import serializers
from .models import Deck, Flashcard


""" This serializer exposes all fields on Deck, but locks down the system-managed ones. """
class DeckSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deck
        fields = '__all__'
        read_only_fields = ['DeckID', 'UserID', 'date_created', 'last_studied']

""" This serializer includes validation to enforce a 5 MB upload limit on both question and answer images, and locks down system-managed fields. """
class FlashcardSerializer(serializers.ModelSerializer):
    # 5 MB upload limit enforced for both question and answer images.
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