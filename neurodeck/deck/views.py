from django.shortcuts import render, redirect
from .models import Deck, Flashcard
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Deck
from .serializers import DeckSerializer, FlashcardSerializer

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


@api_view(['GET'])
def flashcard_list(request, deck_id):
    flashcards = Flashcard.objects.filter(DeckID__DeckID=deck_id)
    serializer = FlashcardSerializer(flashcards, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_flashcard(request):
    serializer = FlashcardSerializer(data=request.data)
    if serializer.is_valid():
        flashcard = serializer.save()
        return Response(FlashcardSerializer(flashcard).data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['PATCH'])
def update_flashcard(request, card_id):
    flashcard = Flashcard.objects.filter(CardID=card_id).first()
    if not flashcard:
        return Response({"error": "Flashcard not found"}, status=404)

    for key, value in request.data.items():
        setattr(flashcard, key, value)
    flashcard.save()
    return Response({
        "CardID": flashcard.CardID,
        "DeckID": flashcard.DeckID.DeckID,
        "Question": flashcard.Question,
        "Answer": flashcard.Answer,
        "FlashDateCreated": flashcard.FlashDateCreated,
        "LastReviewed": flashcard.LastReviewed
    })


@api_view(['DELETE'])
def delete_flashcard(request, card_id):
    flashcard = Flashcard.objects.filter(CardID=card_id).first()
    if not flashcard:
        return Response({"error": "Flashcard not found"}, status=404)
    
    flashcard.delete()
    return Response({"message": "Flashcard deleted"}, status=200)