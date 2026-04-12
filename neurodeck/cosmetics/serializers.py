from rest_framework import serializers
from .models import CosmeticItem, UserCosmetic


class CosmeticItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CosmeticItem
        fields = ["cosmeticID", "item_name", "cost", "image", "rarity"]


class UserCosmeticSerializer(serializers.ModelSerializer):
    CosmeticID = serializers.CharField(source="cosmeticID.cosmeticID")
    ItemName = serializers.CharField(source="cosmeticID.item_name")
    Image = serializers.ImageField(source="cosmeticID.image")
    Cost = serializers.IntegerField(source="cosmeticID.cost")

    class Meta:
        model = UserCosmetic
        fields = [
            "CosmeticID",
            "ItemName",
            "Image",
            "Cost",
            "is_equipped",
            "date_purchased",
        ]