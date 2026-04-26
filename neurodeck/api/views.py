from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializer import RegisterSerializer, MyTokenObtainPairSerializer


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

""" This module defines API views for user registration and a test authentication endpoint, utilizing serializers for input validation and JWT token generation. """
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    # Create a new user account.
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Account created."}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

""" A protected endpoint that requires JWT authentication, used to verify that the authentication system is working correctly. """
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def testAuth(request):
    # Smoke-test endpoint to confirm JWT auth is wired up correctly.
    return Response("You are authenticated!")