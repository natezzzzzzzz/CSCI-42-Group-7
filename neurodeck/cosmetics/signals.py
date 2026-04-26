from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Profile, CosmeticItem

""" This module defines signal handlers for the Cosmetics app, ensuring that a Profile instance is automatically created for each new user, with a default cosmetic item equipped. """
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, **kwargs):
    
    if created:
        default = CosmeticItem.objects.filter(cosmeticID="CSM_0001").first()
        Profile.objects.create(
            user=instance,
            equipped_cosmetic=default
        )