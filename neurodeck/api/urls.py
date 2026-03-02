from django.urls import path
from .views import testAuth

urlpatterns = [
    path('test/', testAuth),
]