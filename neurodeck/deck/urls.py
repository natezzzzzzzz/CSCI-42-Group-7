from django.urls import path
from . import views

urlpatterns = [
    path('decklist/', views.deck_list, name='deck_list'),
    path('deck/<str:deck_id>/', views.deck_detail, name='deck_detail'),
    path('create/', views.create_deck, name='create_deck'),
    path('deck/<str:deck_id>/add/', views.add_flashcard, name='add_flashcard'),
    path('deck/<str:deck_id>/delete/', views.delete_deck, name='delete_deck'),
    path('card/<int:card_id>/delete/', views.delete_flashcard, name='delete_flashcard'),
]