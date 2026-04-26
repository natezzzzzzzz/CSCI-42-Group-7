from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from .models import UserStats


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_stats(sender, instance, created, **kwargs):

    # This auto-create a UserStats row for every new user so counters
    # are always available without needing a get_or_create at each event.
    if created:
        UserStats.objects.get_or_create(user=instance)