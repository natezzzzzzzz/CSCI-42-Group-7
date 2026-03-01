from django.urls import path
from . import views

urlpatterns = [
    path('api/decks/', views.deck_list),
    path('api/decks/create/', views.create_deck_api),
    path('api/decks/<str:deck_id>/delete/', views.delete_deck_api),
]