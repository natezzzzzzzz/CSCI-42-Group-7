from django.urls import path
from . import views

urlpatterns = [
    path('api/decks/', views.deck_list),
    path('api/decks/create/', views.create_deck_api),
    path('api/decks/<str:deck_id>/delete/', views.delete_deck_api),
    path('api/decks/<str:deck_id>/update/', views.update_deck),

   
    path('api/flashcards/create/', views.create_flashcard),  
    path('api/flashcards/<str:deck_id>/', views.flashcard_list),
    path('api/flashcards/<int:card_id>/delete/', views.delete_flashcard),
    path('api/flashcards/<int:card_id>/update/', views.update_flashcard),
]
