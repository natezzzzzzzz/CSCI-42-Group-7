from django.conf import settings
from django.db import models


def generate_cosmetic_id():
    last = CosmeticItem.objects.order_by("-CosmeticID").first()
    if last:
        num = int(last.CosmeticID.replace("CSM_", "")) + 1
    else:
        num = 0
    return f"CSM_{num:04d}"


class CosmeticItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ("Hat", "Hat"),
        ("Shirt", "Shirt"),
        ("Pants", "Pants"),
        ("Glasses", "Glasses"),
        ("Shoes", "Shoes"),
    ]

    CosmeticID = models.CharField(primary_key=True, max_length=10, editable=False)
    ItemName = models.CharField(max_length=255, unique=True, default="DefaultItemName")
    ItemType = models.CharField(max_length=50, choices=ITEM_TYPE_CHOICES, default="Hat")
    Cost = models.PositiveIntegerField(default=1)
    ImagePath = models.ImageField(upload_to="cosmetics/", default="default_img.jpeg")

    def save(self, *args, **kwargs):
        if not self.CosmeticID:
            self.CosmeticID = generate_cosmetic_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ItemName} ({self.ItemType})"


class UserCosmetic(models.Model):
    UserID = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_cosmetics",
    )
    CosmeticID = models.ForeignKey(
        CosmeticItem,
        on_delete=models.CASCADE,
        related_name="owners",
    )
    IsEquipped = models.BooleanField(default=False)
    DatePurchased = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("UserID", "CosmeticID")

    def __str__(self):
        return f"{self.UserID.username} owns {self.CosmeticID.ItemName}"