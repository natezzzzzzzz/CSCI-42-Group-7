from rest_framework import serializers
from .models import CosmeticItem, UserCosmetic


class CosmeticItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CosmeticItem
        fields = ["CosmeticID", "ItemName", "ItemType", "Cost", "ImagePath"]


class UserCosmeticSerializer(serializers.ModelSerializer):
    item = CosmeticItemSerializer(source="CosmeticID", read_only=True)

    class Meta:
        model = UserCosmetic
        fields = ["item", "IsEquipped", "DatePurchased"]