from rest_framework import serializers
from .models import CosmeticItem, UserCosmetic


""" This serializes the CosmeticItem model directly, exposing all the fields you'd need to display a shop item. """
class CosmeticItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CosmeticItem
        fields = ["cosmeticID", "item_name", "cost", "image", "rarity"]

""" This serializer is used to easily display the user's owned cosmetics without needing extra queries. """
class UserCosmeticSerializer(serializers.ModelSerializer):
    cosmeticID = serializers.CharField(source="cosmeticID.cosmeticID")
    item_name = serializers.CharField(source="cosmeticID.item_name")
    image = serializers.ImageField(source="cosmeticID.image")
    cost = serializers.IntegerField(source="cosmeticID.cost")

    class Meta:
        model = UserCosmetic
        fields = [
            "cosmeticID",
            "item_name",
            "image",
            "cost",
            "date_purchased",
        ]