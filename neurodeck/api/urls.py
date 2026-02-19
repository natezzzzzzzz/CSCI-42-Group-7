from django.urls import path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('token/', MyTokenObtainPairView, name='token_obtain_pair'),
    # path('token/refresh/', TokenRefreshView, name='token_refresh'),
    path('register/', RegisterView, name='auth_register'),
    path('test/', testEndPoint, name='test'),
    path('', getRoutes),
]