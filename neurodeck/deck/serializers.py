from rest_framework import serializers
from .models import Deck

class DeckSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deck
        fields = '__all__'
        read_only_fields = ['DeckID', 'UserID', 'date_created', 'last_studied']
