from api.models import User, Profile
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers

""" This handles serialization and validation for user registration and JWT token generation, including injecting profile fields into the JWT payload frontend. """
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

""" Custom serializer for JWT token generation that includes additional user profile information in the token payload. """
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Inject profile fields into the JWT payload so the frontend
        # can read them from the token without a separate profile request.
        token = super().get_token(user)

        profile, _ = Profile.objects.get_or_create(user=user)

        token['full_name'] = profile.full_name
        token['username'] = user.username
        token['email'] = user.email
        token['bio'] = profile.bio
        token['image'] = str(profile.image)
        token['verified'] = profile.verified

        return token

""" Serializer for user registration that validates password confirmation and creates a new User instance. """
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            # CustomUserManager.create_user(email, username, password)
            user = User.objects.create_user(
                email=validated_data['email'],
                username=validated_data['username'],
                password=validated_data['password'],
            )
        return user