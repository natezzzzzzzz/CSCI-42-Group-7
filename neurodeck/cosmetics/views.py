from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import CosmeticItem, UserCosmetic, UserAvatar
from .serializers import CosmeticItemSerializer, UserCosmeticSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_shop(request):
    items = CosmeticItem.objects.all()

    owned = set(
        UserCosmetic.objects.filter(userID=request.user)
        .values_list("cosmeticID_id", flat=True)
    )

    avatar, _ = UserAvatar.objects.get_or_create(user=request.user)

    data = []
    for item in items:
        data.append({
            "CosmeticID": item.cosmeticID,
            "ItemName": item.item_name,
            "Cost": item.cost,
            "Image": item.image.url,
            "owned": item.cosmeticID in owned,
            "equipped": (
                avatar.equipped_cosmetic_id == item.cosmeticID
                if avatar.equipped_cosmetic else False
            )
        })

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def purchase(request, cosmetic_id):
    try:
        item = CosmeticItem.objects.get(cosmeticID=cosmetic_id)
    except CosmeticItem.DoesNotExist:
        return Response({"error": "Item not found."}, status=404)

    if UserCosmetic.objects.filter(
        userID=request.user,
        cosmeticID=item
    ).exists():
        return Response({"error": "Already owned."}, status=400)

    stats = getattr(request.user, "stats", None)
    if stats is None or stats.currency < item.cost:
        return Response({"error": "Insufficient currency."}, status=400)

    stats.currency -= item.cost
    stats.save()

    UserCosmetic.objects.create(
        userID=request.user,
        cosmeticID=item
    )

    return Response({"message": f"Purchased {item.item_name}."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def equip(request, cosmetic_id):
    try:
        item = CosmeticItem.objects.get(cosmeticID=cosmetic_id)
    except CosmeticItem.DoesNotExist:
        return Response({"error": "Item not found"}, status=404)

    if not UserCosmetic.objects.filter(
        userID=request.user,
        cosmeticID=item
    ).exists():
        return Response({"error": "You don't own this item"}, status=403)

    avatar, _ = UserAvatar.objects.get_or_create(user=request.user)

    avatar.equipped_cosmetic = item
    avatar.save()

    return Response({
        "is_equipped": True,
        "cosmetic_id": item.cosmeticID
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_cosmetics(request):
    owned = UserCosmetic.objects.filter(
        userID=request.user
    ).select_related("cosmeticID")

    serializer = UserCosmeticSerializer(owned, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_avatar(request):
    avatar, _ = UserAvatar.objects.get_or_create(user=request.user)

    if not avatar.equipped_cosmetic:
        default = CosmeticItem.objects.get(cosmeticID="CSM_0001")
        avatar.equipped_cosmetic = default
        avatar.save()

    return Response({
        "url": avatar.equipped_cosmetic.image.url,
        "name": avatar.equipped_cosmetic.item_name
    })
    
