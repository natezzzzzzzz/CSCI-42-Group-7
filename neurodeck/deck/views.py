from django.shortcuts import render, redirect
from .models import Deck, Flashcard
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Deck
from .serializers import DeckSerializer

@api_view(['GET'])
def deck_list(request):
    decks = Deck.objects.all()
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def create_deck_api(request):
    serializer = DeckSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['DELETE'])
def delete_deck_api(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)
    
    deck.delete()
    return Response({"message": "Deck deleted"}, status=200)