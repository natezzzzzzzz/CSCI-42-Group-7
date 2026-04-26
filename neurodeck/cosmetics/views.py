from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import CosmeticItem, UserCosmetic, Avatar
from .serializers import CosmeticItemSerializer, UserCosmeticSerializer
from achievements.models import UserStats


""" This module defines API views for the Cosmetics feature, allowing users to view the shop, purchase items, equip cosmetics, and view their owned cosmetics and avatar. """
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_shop(request):
    # GET /cosmetics/shop/ — all shop items with ownership and equipped status.
    items = CosmeticItem.objects.all()
    stats, _ = UserStats.objects.get_or_create(user=request.user)

    owned = set(
        UserCosmetic.objects.filter(userID=request.user)
        .values_list("cosmeticID_id", flat=True)
    )

    avatar, _ = Avatar.objects.get_or_create(user=request.user)

    data = []
    for item in items:
        data.append({
            "CosmeticID": item.cosmeticID,
            "ItemName": item.item_name,
            "Cost": item.cost,
            "Rarity": item.rarity,
            "Image": item.image.url,
            "owned": item.cosmeticID in owned,
            "equipped": (
                avatar.equipped_cosmetic_id == item.cosmeticID
                if avatar.equipped_cosmetic else False
            ),
        })

    return Response({"items": data, "currency": stats.currency})

""" The purchase view handles buying a cosmetic item, checking for ownership and sufficient currency, and then deducting the cost and granting the item to the user. """
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def purchase(request, cosmetic_id):
    # POST /cosmetics/shop/<cosmetic_id>/purchase/ — buy an item using currency.
    try:
        item = CosmeticItem.objects.get(cosmeticID=cosmetic_id)
    except CosmeticItem.DoesNotExist:
        return Response({"error": "Item not found."}, status=404)

    if UserCosmetic.objects.filter(userID=request.user, cosmeticID=item).exists():
        return Response({"error": "Already owned."}, status=400)

    stats, _ = UserStats.objects.get_or_create(user=request.user)
    if stats.currency < item.cost:
        return Response({"error": "Insufficient currency."}, status=400)

    stats.currency -= item.cost
    stats.save(update_fields=["currency"])

    UserCosmetic.objects.create(userID=request.user, cosmeticID=item)

    return Response({
        "message": f"Purchased {item.item_name}!",
        "currency": stats.currency,
    })

""" The equip view allows users to toggle whether an owned cosmetic item is currently equipped on their avatar, updating the Avatar model accordingly. """
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def equip(request, cosmetic_id):
    # POST /cosmetics/shop/<cosmetic_id>/equip/ — toggle equip on an owned item.
    try:
        item = CosmeticItem.objects.get(cosmeticID=cosmetic_id)
    except CosmeticItem.DoesNotExist:
        return Response({"error": "Item not found"}, status=404)

    if not UserCosmetic.objects.filter(userID=request.user, cosmeticID=item).exists():
        return Response({"error": "You don't own this item"}, status=403)

    profile, _ = Avatar.objects.get_or_create(user=request.user)

    if profile.equipped_cosmetic_id == item.cosmeticID:
        profile.equipped_cosmetic = None
        profile.save()
        return Response({"equipped": False})

    profile.equipped_cosmetic = item
    profile.save()
    return Response({"equipped": True})

""" This view returns a list of all cosmetics the user owns, along with an "equipped" flag to indicate which one is currently equipped on their avatar. """
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_cosmetics(request):
    # GET /cosmetics/mine/ — list all cosmetics the user owns, with equipped flag.
    owned = UserCosmetic.objects.filter(
        userID=request.user
    ).select_related("cosmeticID")

    avatar, _ = Avatar.objects.get_or_create(user=request.user)
    equipped_id = avatar.equipped_cosmetic_id

    serializer = UserCosmeticSerializer(owned, many=True)
    data = serializer.data
    for item in data:
        item["equipped"] = (item["cosmeticID"] == equipped_id)

    return Response(data)

""" This view returns the currently equipped cosmetic item for the user's avatar, defaulting to a predefined item if none is equipped. """
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_avatar(request):
    profile, _ = Avatar.objects.get_or_create(user=request.user)

    item = profile.equipped_cosmetic

    if not item:
        try:
            item = CosmeticItem.objects.get(cosmeticID="CSM_0008")
        except CosmeticItem.DoesNotExist:
            item = CosmeticItem.objects.first()
        if item:
            profile.equipped_cosmetic = item
            profile.save()

    if not item:
        return Response({"url": None, "name": "Default", "cosmeticID": None})

    return Response({
        "url": item.image.url,
        "name": item.item_name,
        "cosmeticID": item.cosmeticID,
    })
