from .engine import (
    AchievementEngine,
    AnswerSubmittedEvent,
    CardMasteredEvent,
    GameCompletedEvent,
    SoloSessionCompletedEvent,
    register_evaluator,
)


@register_evaluator("cards_studied")
def eval_cards_studied(user, stats, event, achievement):
    return stats.total_cards_studied >= achievement.threshold


@register_evaluator("decks_completed")
def eval_decks_completed(user, stats, event, achievement):
    return stats.total_decks_completed >= achievement.threshold


@register_evaluator("correct_answers")
def eval_correct_answers(user, stats, event, achievement):
    return stats.total_correct_answers >= achievement.threshold


@register_evaluator("answer_streak")
def eval_answer_streak(user, stats, event, achievement):
    return stats.best_streak >= achievement.threshold


@register_evaluator("current_streak")
def eval_current_streak(user, stats, event, achievement):
    return stats.current_streak >= achievement.threshold


@register_evaluator("games_played")
def eval_games_played(user, stats, event, achievement):
    return stats.total_games_played >= achievement.threshold


@register_evaluator("games_won")
def eval_games_won(user, stats, event, achievement):
    return stats.multiplayer_games_won >= achievement.threshold


@register_evaluator("accuracy")
def eval_accuracy(user, stats, event, achievement):
    if stats.total_answers < 20:
        return False
    accuracy = (stats.total_correct_answers / stats.total_answers) * 100
    return accuracy >= achievement.threshold


@register_evaluator("multiplayer_games_played")
def eval_multiplayer_games(user, stats, event, achievement):
    return stats.multiplayer_games_played >= achievement.threshold


@register_evaluator("solo_sessions")
def eval_solo_sessions(user, stats, event, achievement):
    return stats.solo_sessions_completed >= achievement.threshold


@register_evaluator("study_days")
def eval_study_days(user, stats, event, achievement):
    return stats.best_consecutive_study_days >= achievement.threshold


@register_evaluator("perfect_game")
def eval_perfect_game(user, stats, event, achievement):
    """All answers correct in a multiplayer game."""
    if isinstance(event, GameCompletedEvent):
        score = event.extra.get("score", 0)
        total = event.extra.get("total_questions", 0)
        return score == total and score > 0
    return False


@register_evaluator("winner_by_margin")
def eval_winner_by_margin(user, stats, event, achievement):
    """Win a multiplayer game by a margin >= threshold."""
    if isinstance(event, GameCompletedEvent):
        return event.extra.get("is_winner", False) and event.extra.get(
            "margin", 0
        ) >= achievement.threshold
    return False


@register_evaluator("cards_mastered")
def eval_cards_mastered(user, stats, event, achievement):
    """Number of cards mastered through spaced repetition."""
    return stats.cards_mastered >= achievement.threshold


@register_evaluator("spaced_repetition_reviews")
def eval_sr_reviews(user, stats, event, achievement):
    """Number of spaced repetition reviews completed."""
    return stats.spaced_repetition_reviews >= achievement.threshold


@register_evaluator("late_night_study")
def eval_late_night_study(user, stats, event, achievement):
    """Complete a solo session between midnight and 5 AM."""
    if isinstance(event, SoloSessionCompletedEvent):
        hour = event.timestamp.hour
        return 0 <= hour < 5
    return False