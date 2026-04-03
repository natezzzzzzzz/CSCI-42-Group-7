from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import MultiplayerRoom, RoomParticipant
from flashcards.models import Deck

import random
import string


def generate_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


@api_view(['POST'])
def create_room(request):
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    deck_id = request.data.get('deck_id')
    if not deck_id:
        return Response({"error": "deck_id is required"}, status=400)

    deck = get_object_or_404(Deck, DeckID=deck_id)

    room = MultiplayerRoom.objects.create(
        Deck=deck,
        Host=request.user,
        RoomCode=generate_code()
    )

    RoomParticipant.objects.create(
        Room=room,
        User=request.user
    )

    return Response({
        "room_id": room.RoomID,
        "room_code": room.RoomCode
    }, status=201)