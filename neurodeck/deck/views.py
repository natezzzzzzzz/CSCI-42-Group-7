from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Deck, Flashcard
from .serializers import DeckSerializer, FlashcardSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deck_list(request):
    decks = Deck.objects.filter(UserID=request.user)
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_deck_api(request):
    serializer = DeckSerializer(data=request.data)
    if serializer.is_valid():
        deck = serializer.save(UserID=request.user)
        return Response(DeckSerializer(deck).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_deck_api(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)
    deck.delete()
    return Response({"message": "Deck deleted"}, status=200)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_deck(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    allowed = {'DeckName', 'Category', 'Description', 'IsPublic'}
    for key, value in request.data.items():
        if key in allowed:
            setattr(deck, key, value)
    deck.save()

    return Response({
        "DeckID": deck.DeckID,
        "DeckName": deck.DeckName,
        "Category": deck.Category,
        "Description": deck.Description,
    })


# ─── Flashcard endpoints ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_cards(request, deck_id):
    """List all flashcards in a deck. Deck must belong to the requesting user."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)
    cards = Flashcard.objects.filter(DeckID=deck)
    return Response(FlashcardSerializer(cards, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_card(request, deck_id):
    """Create a flashcard inside a deck the user owns."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    serializer = FlashcardSerializer(data=request.data)
    if serializer.is_valid():
        card = serializer.save(DeckID=deck)
        return Response(FlashcardSerializer(card).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_card(request, deck_id, card_id):
    """Edit the question or answer of a card. Deck ownership is enforced."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    card = Flashcard.objects.filter(CardID=card_id, DeckID=deck).first()
    if not card:
        return Response({"error": "Card not found"}, status=404)

    allowed = {'Question', 'Answer'}
    for key, value in request.data.items():
        if key in allowed:
            setattr(card, key, value)
    card.save()

    return Response(FlashcardSerializer(card).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_card(request, deck_id, card_id):
    """Delete a card from a deck the user owns."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    card = Flashcard.objects.filter(CardID=card_id, DeckID=deck).first()
    if not card:
        return Response({"error": "Card not found"}, status=404)

    card.delete()
    return Response({"message": "Card deleted"}, status=200)