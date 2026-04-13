from datetime import date, timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import Achievement, UserAchievement, UserStats


# ---------------------------------------------------------------------------
# Event types
# ---------------------------------------------------------------------------

class AchievementEvent:
    """Base event class."""

    def __init__(self, user, **kwargs):
        self.user = user
        self.timestamp = timezone.now()
        self.extra = kwargs


class AnswerSubmittedEvent(AchievementEvent):
    """Fired after any answer is graded."""
    # extra: is_correct, mode ("solo"/"multiplayer"), room, card


class GameCompletedEvent(AchievementEvent):
    """Fired when a multiplayer game finishes."""
    # extra: room, score, total_questions, is_winner, position, participant_count, margin


class SoloSessionCompletedEvent(AchievementEvent):
    """Fired when a user completes a solo study session."""
    # extra: deck_id, cards_studied


class DeckCreatedEvent(AchievementEvent):
    """Fired when a user creates a new deck."""
    # extra: deck


class CardStudiedEvent(AchievementEvent):
    """Fired when a user views/studies a card."""
    # extra: card, deck, mode


class CardMasteredEvent(AchievementEvent):
    """Fired when a card transitions to mastered state via spaced repetition."""
    # extra: card_id, deck_id


# ---------------------------------------------------------------------------
# Evaluator registry
# ---------------------------------------------------------------------------

EVALUATORS = {}


def register_evaluator(criteria_key):
    """Decorator to register an evaluator function for a criteria key."""

    def decorator(func):
        EVALUATORS[criteria_key] = func
        return func

    return decorator


# ---------------------------------------------------------------------------
# Achievement Engine
# ---------------------------------------------------------------------------

class AchievementEngine:
    """Central engine that receives events, updates stats, and evaluates achievements."""

    @classmethod
    def process_event(cls, event):
        """
        Main entry point. Called from view hooks.
        1. Updates UserStats atomically.
        2. Evaluates all achievements for the user.
        3. Returns list of newly unlocked achievements.
        """
        with transaction.atomic():
            stats, _ = UserStats.objects.select_for_update().get_or_create(
                user=event.user
            )
            cls._update_stats(stats, event)
            newly_unlocked = cls._evaluate_achievements(event.user, stats, event)
            return newly_unlocked

    @classmethod
    def _update_stats(cls, stats, event):
        """Increment the appropriate counters based on event type."""
        if isinstance(event, AnswerSubmittedEvent):
            stats.total_answers = F("total_answers") + 1
            if event.extra.get("mode") == "solo":
                stats.spaced_repetition_reviews = F("spaced_repetition_reviews") + 1
            if event.extra.get("is_correct"):
                stats.total_correct_answers = F("total_correct_answers") + 1
                stats.current_streak = F("current_streak") + 1
            else:
                stats.current_streak = 0
            stats.save()
            stats.refresh_from_db()
            if stats.current_streak > stats.best_streak:
                stats.best_streak = stats.current_streak
                stats.save(update_fields=["best_streak"])

        elif isinstance(event, CardStudiedEvent):
            stats.total_cards_studied = F("total_cards_studied") + 1
            cls._update_study_streak(stats)
            stats.save()
            stats.refresh_from_db()
            if stats.consecutive_study_days > stats.best_consecutive_study_days:
                stats.best_consecutive_study_days = stats.consecutive_study_days
                stats.save(update_fields=["best_consecutive_study_days"])

        elif isinstance(event, SoloSessionCompletedEvent):
            stats.solo_sessions_completed = F("solo_sessions_completed") + 1
            stats.total_decks_completed = F("total_decks_completed") + 1
            stats.save()
            stats.refresh_from_db()  # ← fixed

        elif isinstance(event, GameCompletedEvent):
            stats.total_games_played = F("total_games_played") + 1
            stats.multiplayer_games_played = F("multiplayer_games_played") + 1
            if event.extra.get("is_winner"):
                stats.total_games_won = F("total_games_won") + 1
                stats.multiplayer_games_won = F("multiplayer_games_won") + 1
            stats.save()
            stats.refresh_from_db()  # ← fixed

        elif isinstance(event, DeckCreatedEvent):
            pass

        elif isinstance(event, CardMasteredEvent):
            stats.cards_mastered = F("cards_mastered") + 1
            stats.save()
            stats.refresh_from_db()  # ← fixed

    @classmethod
    def _update_study_streak(cls, stats):
        """Update consecutive study day tracking."""
        today = date.today()
        if stats.last_study_date == today:
            return
        elif stats.last_study_date == today - timedelta(days=1):
            stats.consecutive_study_days = F("consecutive_study_days") + 1
        else:
            stats.consecutive_study_days = 1
        stats.last_study_date = today

    @classmethod
    def _evaluate_achievements(cls, user, stats, event):
        """Evaluate all relevant achievements and unlock any that qualify."""
        newly_unlocked = []

        unlocked_ids = set(
            UserAchievement.objects.filter(user=user).values_list(
                "achievement_id", flat=True
            )
        )
        pending_achievements = Achievement.objects.exclude(pk__in=unlocked_ids)

        for achievement in pending_achievements:
            evaluator = EVALUATORS.get(achievement.criteria)
            if evaluator and evaluator(user, stats, event, achievement):
                try:
                    ua = UserAchievement.objects.create(
                        user=user,
                        achievement=achievement,
                    )
                    newly_unlocked.append(ua)
                except Exception:
                    continue

        return newly_unlocked