from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db.models.signals import post_save
from django.dispatch import receiver


class CustomUserManager(BaseUserManager):
    """ The custom user manager was made to handle user creation with email as the unique identifier instead of username. """

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        if not username:
            raise ValueError('A username is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, username, password, **extra_fields)

""" This module defines the custom User model and Profile model for the API app, along with signal handlers to automatically create related Profile and UserStats instances when a new User is created. """
class User(AbstractUser):
    username = models.CharField(max_length=100)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = CustomUserManager()

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='api_user_set',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='api_user_permissions_set',
        blank=True
    )

    def __str__(self):
        return self.email


""" The Profile model extends the User model with additional fields like full name, bio, profile image, and verification status. A signal handler ensures that a Profile instance is created for each new User. """
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=1000, blank=True, default='')
    bio = models.CharField(max_length=100, blank=True, default='')
    image = models.ImageField(upload_to="user_images", default="default.jpg")
    verified = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username


""" Signal handler to create a Profile and UserStats instance whenever a new User is created. """
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    # Auto-create a Profile row for every new User.
    if created:
        Profile.objects.get_or_create(user=instance)