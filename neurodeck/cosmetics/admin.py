from django.contrib import admin
from .models import CosmeticItem, UserCosmetic, Avatar


@admin.register(CosmeticItem)
class CosmeticItemAdmin(admin.ModelAdmin):
    list_display = ("cosmeticID", "item_name", "cost", "rarity")
    search_fields = ("cosmeticID", "item_name")
    list_filter = ("rarity",)


@admin.register(UserCosmetic)
class UserCosmeticAdmin(admin.ModelAdmin):
    list_display = ("userID", "cosmeticID", "date_purchased")
    search_fields = ("userID__username", "cosmeticID__item_name")

