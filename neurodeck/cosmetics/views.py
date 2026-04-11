from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import CosmeticItem, UserCosmetic
from .serializers import CosmeticItemSerializer, UserCosmeticSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_shop(request):
    """All cosmetics with ownership/equipped status for the current user."""
    items = CosmeticItem.objects.all()
    owned_map = {
        uc.CosmeticID_id: uc
        for uc in UserCosmetic.objects.filter(UserID=request.user)
    }
    data = []
    for item in items:
        uc = owned_map.get(item.CosmeticID)
        data.append({
            **CosmeticItemSerializer(item).data,
            "owned": uc is not None,
            "is_equipped": uc.IsEquipped if uc else False,
        })
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def purchase(request, cosmetic_id):
    """Purchase a cosmetic item."""
    try:
        item = CosmeticItem.objects.get(CosmeticID=cosmetic_id)
    except CosmeticItem.DoesNotExist:
        return Response({"error": "Item not found."}, status=404)

    if UserCosmetic.objects.filter(UserID=request.user, CosmeticID=item).exists():
        return Response({"error": "Already owned."}, status=400)

    # Currency check — attach to your UserStats or User model as needed
    stats = getattr(request.user, "stats", None)
    if stats is None or stats.currency < item.Cost:
        return Response({"error": "Insufficient currency."}, status=400)

    stats.currency -= item.Cost
    stats.save()

    UserCosmetic.objects.create(UserID=request.user, CosmeticID=item)
    return Response({"message": f"Purchased {item.ItemName}."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def equip(request, cosmetic_id):
    """Equip or unequip a cosmetic. Only one item per type can be equipped at a time."""
    try:
        uc = UserCosmetic.objects.get(UserID=request.user, CosmeticID__CosmeticID=cosmetic_id)
    except UserCosmetic.DoesNotExist:
        return Response({"error": "You don't own this item."}, status=404)

    # Unequip others of the same type first
    UserCosmetic.objects.filter(
        UserID=request.user,
        CosmeticID__ItemType=uc.CosmeticID.ItemType,
        IsEquipped=True,
    ).update(IsEquipped=False)

    uc.IsEquipped = not uc.IsEquipped
    uc.save()
    return Response({"is_equipped": uc.IsEquipped})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_cosmetics(request):
    """Returns only items the user owns."""
    owned = UserCosmetic.objects.filter(UserID=request.user).select_related("CosmeticID")
    return Response(UserCosmeticSerializer(owned, many=True).data)