from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver

class User(AbstractUser):
    username = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='api_user_set',  # unique related_name
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='api_user_permissions_set',  # unique related_name
        blank=True
    )
    
    def __str__(self):
        return self.email
    
    @property
    def profile(self):
        from api.models import Profile
        profile, created = Profile.objects.get_or_create(user=self)
        return profile
        
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=1000)
    bio = models.CharField(max_length=100)
    image = models.ImageField(upload_to="user_images", default="default.jpg")
    verified = models.BooleanField(default=False)
    
    def __str__(self):
        return self.user.username

# ===== SIGNALS =====
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

        