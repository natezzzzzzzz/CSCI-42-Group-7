from django.conf import settings
from django.db import models


def generate_cosmetic_id():
    from .models import CosmeticItem

    last = CosmeticItem.objects.order_by("-cosmeticID").first()

    if last and last.cosmeticID.startswith("CSM_"):
        num = int(last.cosmeticID.replace("CSM_", "")) + 1
    else:
        num = 1

    return f"CSM_{num:04d}"


class CosmeticItem(models.Model):
    cosmeticID = models.CharField(primary_key=True, max_length=10, editable=False)
    item_name = models.CharField(max_length=255, unique=True)
    cost = models.PositiveIntegerField(default=10)
    image = models.ImageField(upload_to="cosmetics/avatars/")
    preview_image = models.ImageField(
        upload_to="cosmetics/previews/",
        null=True,
        blank=True
    )

    rarity = models.CharField(
        max_length=20,
        choices=[
            ("common", "Common"),
            ("rare", "Rare"),
            ("epic", "Epic"),
            ("legendary", "Legendary"),
        ],
        default="common"
    )

    def save(self, *args, **kwargs):
        if not self.cosmeticID:
            self.cosmeticID = generate_cosmetic_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.item_name


class UserCosmetic(models.Model):
    userID = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cosmetics",
    )

    cosmeticID = models.ForeignKey(
        CosmeticItem,
        on_delete=models.CASCADE,
        related_name="owners",
    )

    date_purchased = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("userID", "cosmeticID")

    def __str__(self):
        return f"{self.userID.username} owns {self.cosmeticID.item_name}"
        
        
        
class UserAvatar(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avatar"
    )

    equipped_cosmetic = models.ForeignKey(
        CosmeticItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="equipped_by"
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s avatar"
    


# class Pet(models.Model):
#     name = models.CharField(max_length=50)
#     image = models.ImageField(upload_to="pets/")
#     happiness = models.IntegerField(default=50)