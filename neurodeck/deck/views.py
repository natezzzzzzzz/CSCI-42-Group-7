from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Deck
from .serializers import DeckSerializer


@api_view(['GET'])
def deck_list(request):
    decks = Deck.objects.all()
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])          # ← now requires a valid JWT
def create_deck_api(request):
    serializer = DeckSerializer(data=request.data)
    if serializer.is_valid():
        # Inject the authenticated user — never trust the client to send UserID
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

    # Only allow safe fields to be patched — never let the client overwrite UserID/DeckID
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