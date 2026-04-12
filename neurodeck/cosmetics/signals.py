from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import UserAvatar, CosmeticItem

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_avatar(sender, instance, created, **kwargs):
    if not created:
        return

    default = CosmeticItem.objects.filter(cosmeticID="CSM_0001").first()

    UserAvatar.objects.create(
        user=instance,
        equipped_cosmetic=default
    )