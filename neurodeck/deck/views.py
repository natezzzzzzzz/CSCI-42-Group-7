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
        deck = serializer.save()  # save returns the instance
        return Response(DeckSerializer(deck).data, status=201)  # serialize the saved deck
    return Response(serializer.errors, status=400)
@api_view(['DELETE'])
def delete_deck_api(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)
    
    deck.delete()
    return Response({"message": "Deck deleted"}, status=200)

@api_view(['PATCH'])
def update_deck(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    for key, value in request.data.items():
        setattr(deck, key, value)
    deck.save()
    return Response({
        "DeckID": deck.DeckID,
        "DeckName": deck.DeckName,
        "Category": deck.Category,
        "Description": deck.Description
    })