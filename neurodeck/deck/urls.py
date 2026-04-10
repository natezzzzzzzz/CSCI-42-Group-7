from django.urls import path
from . import views

urlpatterns = [
    path('api/decks/', views.deck_list),
    path('api/decks/create/', views.create_deck_api),
    path('api/decks/<str:deck_id>/delete/', views.delete_deck_api),
    path('api/decks/<str:deck_id>/update/', views.update_deck),
    path('api/decks/<str:deck_id>/settings/', views.deck_settings),
    path('api/decks/<str:deck_id>/study-stats/', views.deck_study_stats),
    path('api/decks/<str:deck_id>/cards/', views.list_cards),
    path('api/decks/<str:deck_id>/cards/create/', views.create_card),
    path('api/decks/<str:deck_id>/cards/<int:card_id>/update/', views.update_card),
    path('api/decks/<str:deck_id>/cards/<int:card_id>/delete/', views.delete_card),
    path('api/solo/start-session/', views.solo_start_session),
    path('api/solo/rate-card/', views.solo_rate_card),
    path('api/solo/card-studied/', views.solo_card_studied),
    path('api/solo/complete/', views.solo_session_complete),
]