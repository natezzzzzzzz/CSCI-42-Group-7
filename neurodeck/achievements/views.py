from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from datetime import timedelta

from django.utils import timezone

from .models import Achievement, AnswerRecord, GameResult, UserAchievement, UserStats


def _compute_progress(achievement, stats, is_unlocked):
    """Map criteria to a stat field for progress bars."""
    mapping = {
        "cards_studied": "total_cards_studied",
        "decks_completed": "total_decks_completed",
        "correct_answers": "total_correct_answers",
        "answer_streak": "best_streak",
        "current_streak": "current_streak",
        "games_played": "total_games_played",
        "games_won": "multiplayer_games_won",
        "multiplayer_games_played": "multiplayer_games_played",
        "solo_sessions": "solo_sessions_completed",
        "study_days": "best_consecutive_study_days",
    }
    field = mapping.get(achievement.criteria)
    if field:
        return getattr(stats, field, 0)
    return 0 if not is_unlocked else achievement.threshold


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_achievements(request):
    """GET /achievements/ — all achievements with user unlock status and progress."""
    stats, _ = UserStats.objects.get_or_create(user=request.user)

    all_achievements = Achievement.objects.all()
    user_unlocks = {
        ua.achievement_id: ua.unlocked_at
        for ua in UserAchievement.objects.filter(user=request.user)
    }

    result = []
    total_points = 0
    unlocked_count = 0

    for a in all_achievements:
        is_unlocked = a.id in user_unlocks
        visible = is_unlocked or not a.is_hidden

        if is_unlocked:
            total_points += a.points
            unlocked_count += 1

        progress = _compute_progress(a, stats, is_unlocked)

        result.append(
            {
                "id": a.id,
                "name": a.name if visible else "???",
                "description": a.description if visible else "Hidden achievement",
                "icon": a.icon if visible else "lock",
                "category": a.category,
                "tier": a.tier,
                "is_hidden": a.is_hidden,
                "points": a.points if visible else 0,
                "criteria": a.criteria,
                "threshold": a.threshold,
                "unlocked": is_unlocked,
                "unlocked_at": user_unlocks.get(a.id),
                "progress": min(progress, a.threshold) if not is_unlocked else a.threshold,
                "progress_max": a.threshold,
            }
        )

    return Response(
        {
            "achievements": result,
            "total_points": total_points,
            "max_points": sum(a.points for a in all_achievements),
            "unlocked_count": unlocked_count,
            "total_count": len(result),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """GET /achievements/stats/ — user's aggregated statistics."""
    stats, _ = UserStats.objects.get_or_create(user=request.user)
    accuracy = (
        (stats.total_correct_answers / stats.total_answers * 100)
        if stats.total_answers
        else 0
    )
    return Response(
        {
            "total_cards_studied": stats.total_cards_studied,
            "total_decks_completed": stats.total_decks_completed,
            "total_games_played": stats.total_games_played,
            "total_games_won": stats.total_games_won,
            "total_correct_answers": stats.total_correct_answers,
            "total_answers": stats.total_answers,
            "current_streak": stats.current_streak,
            "best_streak": stats.best_streak,
            "consecutive_study_days": stats.consecutive_study_days,
            "best_consecutive_study_days": stats.best_consecutive_study_days,
            "multiplayer_games_played": stats.multiplayer_games_played,
            "multiplayer_games_won": stats.multiplayer_games_won,
            "solo_sessions_completed": stats.solo_sessions_completed,
            "accuracy_percent": round(accuracy, 1),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_unlocks(request):
    """GET /achievements/recent/?limit=5 — recent unlocks for notifications."""
    limit = int(request.query_params.get("limit", 5))
    recent = (
        UserAchievement.objects.filter(user=request.user)
        .select_related("achievement")
        .order_by("-unlocked_at")[:limit]
    )
    return Response(
        {
            "recent": [
                {
                    "name": ua.achievement.name,
                    "description": ua.achievement.description,
                    "icon": ua.achievement.icon,
                    "tier": ua.achievement.tier,
                    "unlocked_at": ua.unlocked_at,
                }
                for ua in recent
            ]
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_data(request):
    """GET /achievements/activity/ — daily activity and performance data for charts."""
    user = request.user
    stats, _ = UserStats.objects.get_or_create(user=user)

    # ── Daily activity for last 30 days ──
    start_date = timezone.now().date() - timedelta(days=29)
    answer_qs = AnswerRecord.objects.filter(
        user=user, answered_at__date__gte=start_date
    )
    game_qs = GameResult.objects.filter(
        user=user, played_at__date__gte=start_date
    )

    # Build date-indexed dicts
    daily_correct = {}
    daily_wrong = {}
    daily_games = {}
    for rec in answer_qs:
        d = rec.answered_at.date()
        if rec.is_correct:
            daily_correct[d] = daily_correct.get(d, 0) + 1
        else:
            daily_wrong[d] = daily_wrong.get(d, 0) + 1
    for gr in game_qs:
        d = gr.played_at.date()
        daily_games[d] = daily_games.get(d, 0) + 1

    activity = []
    for i in range(30):
        d = start_date + timedelta(days=i)
        activity.append(
            {
                "date": d.strftime("%b %d"),
                "correct": daily_correct.get(d, 0),
                "wrong": daily_wrong.get(d, 0),
                "games": daily_games.get(d, 0),
            }
        )

    # ── Category breakdown ──
    user_unlock_ids = set(
        UserAchievement.objects.filter(user=user).values_list(
            "achievement_id", flat=True
        )
    )
    all_achievements = Achievement.objects.all()
    categories = {}
    for a in all_achievements:
        cat = a.category
        if cat not in categories:
            categories[cat] = {"total": 0, "unlocked": 0}
        categories[cat]["total"] += 1
        if a.id in user_unlock_ids:
            categories[cat]["unlocked"] += 1

    # ── Tier breakdown ──
    tiers = {}
    for a in all_achievements:
        t = a.tier
        if t not in tiers:
            tiers[t] = {"total": 0, "unlocked": 0}
        tiers[t]["total"] += 1
        if a.id in user_unlock_ids:
            tiers[t]["unlocked"] += 1

    # ── Recent game results ──
    recent_games = GameResult.objects.filter(user=user)[:10]
    games_list = [
        {
            "score": g.score,
            "total_questions": g.total_questions,
            "is_winner": g.is_winner,
            "played_at": g.played_at,
        }
        for g in recent_games
    ]

    return Response(
        {
            "activity": activity,
            "categories": categories,
            "tiers": tiers,
            "recent_games": games_list,
            "total_correct": stats.total_correct_answers,
            "total_wrong": stats.total_answers - stats.total_correct_answers,
        }
    )