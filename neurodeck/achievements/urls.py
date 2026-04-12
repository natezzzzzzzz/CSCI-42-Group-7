from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_achievements, name="achievements-list"),
    path("stats/", views.user_stats, name="achievements-stats"),
    path("recent/", views.recent_unlocks, name="achievements-recent"),
    path("activity/", views.activity_data, name="achievements-activity"),
    path("leaderboard/", views.leaderboard, name="achievements-leaderboard"),
]