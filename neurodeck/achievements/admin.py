from django.contrib import admin
from .models import Achievement, UserAchievement, UserStats, GameResult, AnswerRecord


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "tier", "criteria", "threshold", "is_hidden", "points")
    list_filter = ("category", "tier", "is_hidden", "multiplayer_only")
    search_fields = ("name", "description")


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ("user", "achievement", "unlocked_at")
    list_filter = ("achievement__category",)
    raw_id_fields = ("user",)


@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    list_display = ("user", "total_cards_studied", "total_games_played", "best_streak")
    raw_id_fields = ("user",)


@admin.register(GameResult)
class GameResultAdmin(admin.ModelAdmin):
    list_display = ("user", "room", "score", "is_winner", "position", "played_at")
    list_filter = ("is_winner",)
    raw_id_fields = ("user", "room")


@admin.register(AnswerRecord)
class AnswerRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "room", "card", "is_correct", "mode", "answered_at")
    list_filter = ("is_correct", "mode")
    raw_id_fields = ("user", "room", "card")