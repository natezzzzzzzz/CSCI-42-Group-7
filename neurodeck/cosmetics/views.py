from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import CosmeticItem, UserCosmetic, Avatar
from .serializers import CosmeticItemSerializer, UserCosmeticSerializer
from achievements.models import UserStats


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_shop(request):
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def purchase(request, cosmetic_id):
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def equip(request, cosmetic_id):
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_cosmetics(request):
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
