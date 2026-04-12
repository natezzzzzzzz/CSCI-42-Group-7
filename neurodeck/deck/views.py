from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from .models import Deck, Flashcard, CardProgress, DeckSettings, DeckDailyCount
from .serializers import DeckSerializer, FlashcardSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deck_list(request):
    decks = Deck.objects.filter(UserID=request.user)
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_deck_api(request):
    serializer = DeckSerializer(data=request.data)
    if serializer.is_valid():
        deck = serializer.save(UserID=request.user)
        return Response(DeckSerializer(deck).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_deck_api(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)
    deck.delete()
    return Response({"message": "Deck deleted"}, status=200)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_deck(request, deck_id):
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    allowed = {'DeckName', 'Category', 'Description', 'IsPublic'}
    for key, value in request.data.items():
        if key in allowed:
            setattr(deck, key, value)
    deck.save()

    return Response({
        "DeckID": deck.DeckID,
        "DeckName": deck.DeckName,
        "Category": deck.Category,
        "Description": deck.Description,
    })


# ─── Flashcard endpoints ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_cards(request, deck_id):
    """List all flashcards in a deck. Deck must belong to the requesting user."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)
    cards = Flashcard.objects.filter(DeckID=deck)
    return Response(FlashcardSerializer(cards, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_card(request, deck_id):
    """Create a flashcard inside a deck the user owns."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    serializer = FlashcardSerializer(data=request.data)
    if serializer.is_valid():
        card = serializer.save(DeckID=deck)
        return Response(FlashcardSerializer(card).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_card(request, deck_id, card_id):
    """Edit the question or answer of a card. Deck ownership is enforced."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    card = Flashcard.objects.filter(CardID=card_id, DeckID=deck).first()
    if not card:
        return Response({"error": "Card not found"}, status=404)

    allowed = {'Question', 'Answer'}
    for key, value in request.data.items():
        if key in allowed:
            setattr(card, key, value)

    if 'QuestionImage' in request.FILES:
        card.QuestionImage = request.FILES['QuestionImage']
    elif request.data.get('clear_QuestionImage') in ('true', 'True', True):
        card.QuestionImage = None

    if 'AnswerImage' in request.FILES:
        card.AnswerImage = request.FILES['AnswerImage']
    elif request.data.get('clear_AnswerImage') in ('true', 'True', True):
        card.AnswerImage = None

    card.save()

    return Response(FlashcardSerializer(card).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_card(request, deck_id, card_id):
    """Delete a card from a deck the user owns."""
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    card = Flashcard.objects.filter(CardID=card_id, DeckID=deck).first()
    if not card:
        return Response({"error": "Card not found"}, status=404)

    card.delete()
    return Response({"message": "Card deleted"}, status=200)


# ─── Deck settings endpoints ────────────────────────────────────────────────


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def deck_settings(request, deck_id):
    """
    GET /deck/api/decks/<deck_id>/settings/
    PATCH /deck/api/decks/<deck_id>/settings/

    Get or update per-deck spaced repetition settings (daily limits).
    """
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    settings, _ = DeckSettings.objects.get_or_create(DeckID=deck)

    if request.method == "GET":
        return Response({
            "deck_id": deck_id,
            "max_new_per_day": settings.MaxNewPerDay,
            "max_learning_per_day": settings.MaxLearningPerDay,
            "max_review_per_day": settings.MaxReviewPerDay,
        })

    # PATCH
    allowed = {"max_new_per_day", "max_learning_per_day", "max_review_per_day"}
    field_map = {
        "max_new_per_day": "MaxNewPerDay",
        "max_learning_per_day": "MaxLearningPerDay",
        "max_review_per_day": "MaxReviewPerDay",
    }
    for key, value in request.data.items():
        if key in allowed:
            model_field = field_map[key]
            int_val = int(value)
            if int_val < 0:
                return Response({key: "Must be >= 0"}, status=400)
            setattr(settings, model_field, int_val)
    settings.save()

    return Response({
        "deck_id": deck_id,
        "max_new_per_day": settings.MaxNewPerDay,
        "max_learning_per_day": settings.MaxLearningPerDay,
        "max_review_per_day": settings.MaxReviewPerDay,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def deck_study_stats(request, deck_id):
    """
    GET /deck/api/decks/<deck_id>/study-stats/

    Returns study breakdown for a deck: card counts by state,
    due today, studied today, and remaining capacity.
    """
    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    settings, _ = DeckSettings.objects.get_or_create(DeckID=deck)
    now = timezone.now()
    today = now.date()

    # Card counts by state
    all_progress = CardProgress.objects.filter(
        UserID=request.user, CardID__DeckID=deck
    )
    new_count = all_progress.filter(State=CardProgress.CardState.NEW).count()
    learning_count = all_progress.filter(State=CardProgress.CardState.LEARNING).count()
    review_count = all_progress.filter(
        State__in=[CardProgress.CardState.REVIEW, CardProgress.CardState.RELEARNING]
    ).count()

    # Due today (NextReview is null or <= now)
    due_new = all_progress.filter(
        State=CardProgress.CardState.NEW,
    ).count()
    due_learning = all_progress.filter(
        State=CardProgress.CardState.LEARNING,
        NextReview__lte=now,
    ).count()
    due_review = all_progress.filter(
        State__in=[CardProgress.CardState.REVIEW, CardProgress.CardState.RELEARNING],
        NextReview__lte=now,
    ).count()

    # Studied today
    daily_count, _ = DeckDailyCount.objects.get_or_create(
        UserID=request.user, DeckID=deck, Date=today,
        defaults={"NewStudied": 0, "LearningStudied": 0, "ReviewStudied": 0},
    )

    # Also count cards that were new but graduated today
    # (they have LastReviewed today and Repetitions > 0 but State is no longer "new")
    graduated_today = all_progress.filter(
        LastReviewed__date=today,
    ).exclude(
        State=CardProgress.CardState.NEW
    ).count()
    # Total new studied = explicitly tracked + cards that were new and are now graduated
    total_new_studied = daily_count.NewStudied

    remaining_new = max(0, settings.MaxNewPerDay - total_new_studied)
    remaining_learning = max(0, settings.MaxLearningPerDay - daily_count.LearningStudied)
    remaining_review = max(0, settings.MaxReviewPerDay - daily_count.ReviewStudied)

    return Response({
        "deck_id": deck_id,
        "card_counts": {
            "new": new_count,
            "learning": learning_count,
            "review": review_count,
        },
        "due_today": {
            "new": min(due_new, remaining_new),
            "learning": min(due_learning, remaining_learning),
            "review": min(due_review, remaining_review),
        },
        "studied_today": {
            "new": total_new_studied,
            "learning": daily_count.LearningStudied,
            "review": daily_count.ReviewStudied,
        },
        "limits": {
            "new": settings.MaxNewPerDay,
            "learning": settings.MaxLearningPerDay,
            "review": settings.MaxReviewPerDay,
        },
        "remaining": {
            "new": remaining_new,
            "learning": remaining_learning,
            "review": remaining_review,
        },
        "total_cards_in_deck": Flashcard.objects.filter(DeckID=deck).count(),
    })


# ─── Solo study tracking endpoints ─────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def solo_start_session(request):
    """
    POST /deck/api/solo/start-session/
    Body: { deck_id, days_ahead (optional, default 0) }

    Returns due and new cards for a spaced repetition study session,
    respecting per-deck daily limits. days_ahead includes cards due
    within N days from now (for custom study / study ahead).
    Cards are ordered: relearning > learning > review (overdue first) > new.
    """
    deck_id = request.data.get("deck_id")
    days_ahead = request.data.get("days_ahead", 0)
    try:
        days_ahead = int(days_ahead)
        if days_ahead < 0:
            days_ahead = 0
    except (TypeError, ValueError):
        days_ahead = 0

    deck = Deck.objects.filter(DeckID=deck_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Deck not found"}, status=404)

    # Get deck settings and daily limits
    settings, _ = DeckSettings.objects.get_or_create(DeckID=deck)
    now = timezone.now()
    today = now.date()
    cutoff = now + timedelta(days=days_ahead)

    # Get today's study counts
    daily_count, _ = DeckDailyCount.objects.get_or_create(
        UserID=request.user, DeckID=deck, Date=today,
        defaults={"NewStudied": 0, "LearningStudied": 0, "ReviewStudied": 0},
    )
    remaining_new = max(0, settings.MaxNewPerDay - daily_count.NewStudied)
    remaining_learning = max(0, settings.MaxLearningPerDay - daily_count.LearningStudied)
    remaining_review = max(0, settings.MaxReviewPerDay - daily_count.ReviewStudied)

    cards = Flashcard.objects.filter(DeckID=deck)

    # Get or create CardProgress for each card, categorize by state
    card_data = []
    new_cards = []
    learning_cards = []
    review_cards = []

    for card in cards:
        progress, _ = CardProgress.objects.get_or_create(
            UserID=request.user,
            CardID=card,
            defaults={"State": CardProgress.CardState.NEW, "EF": 2.5},
        )

        # Card is due if NextReview is null (new) or <= cutoff
        is_due = progress.NextReview is None or progress.NextReview <= cutoff
        if not is_due:
            continue

        entry = {"card": card, "progress": progress}

        if progress.State == CardProgress.CardState.NEW:
            new_cards.append(entry)
        elif progress.State == CardProgress.CardState.LEARNING:
            learning_cards.append(entry)
        else:  # REVIEW or RELEARNING
            review_cards.append(entry)

    # Apply daily limits per category
    capped_new = new_cards[:remaining_new]
    capped_learning = learning_cards[:remaining_learning]
    capped_review = review_cards[:remaining_review]

    card_data = capped_review + capped_learning + capped_new

    # Sort: relearning > learning > review > new; within group by NextReview asc
    state_priority = {
        CardProgress.CardState.RELEARNING: 0,
        CardProgress.CardState.LEARNING: 1,
        CardProgress.CardState.REVIEW: 2,
        CardProgress.CardState.NEW: 3,
    }
    card_data.sort(key=lambda x: (
        state_priority.get(x["progress"].State, 3),
        x["progress"].NextReview or now,
    ))

    from .spaced_repetition import Rating as SRRating, schedule as sr_schedule, format_next_review

    def _build_previews(progress):
        """Compute the next-review label for each possible rating."""
        previews = {}
        for rv in [1, 2, 3, 4]:
            result = sr_schedule(
                card_state=progress.State,
                ef=progress.EF,
                repetitions=progress.Repetitions,
                interval_days=progress.Interval,
                step_index=progress.StepIndex,
                rating=SRRating(rv),
            )
            previews[str(rv)] = format_next_review(result.next_review_delta)
        return previews

    return Response({
        "deck_id": deck_id,
        "total_cards_in_deck": cards.count(),
        "due_count": len(capped_review) + len(capped_learning),
        "new_count": len(capped_new),
        "learning_count": len(capped_learning),
        "review_count": len(capped_review),
        "days_ahead": days_ahead,
        "limits": {
            "new": settings.MaxNewPerDay,
            "learning": settings.MaxLearningPerDay,
            "review": settings.MaxReviewPerDay,
        },
        "studied_today": {
            "new": daily_count.NewStudied,
            "learning": daily_count.LearningStudied,
            "review": daily_count.ReviewStudied,
        },
        "cards": [
            {
                "CardID": d["card"].CardID,
                "Question": d["card"].Question,
                "Answer": d["card"].Answer,
                "QuestionImage": d["card"].QuestionImage.url if d["card"].QuestionImage else None,
                "AnswerImage": d["card"].AnswerImage.url if d["card"].AnswerImage else None,
                "state": d["progress"].State,
                "ef": d["progress"].EF,
                "interval_days": d["progress"].Interval,
                "next_review": d["progress"].NextReview,
                "previews": _build_previews(d["progress"]),
            }
            for d in card_data
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def solo_rate_card(request):
    """
    POST /deck/api/solo/rate-card/
    Body: { card_id, rating }
    rating: 1=Very Difficult, 2=Difficult, 3=Okay, 4=Easy

    Rates a card, updates CardProgress with SM-2 scheduling,
    fires achievement events, and returns the scheduling result.
    """
    card_id = request.data.get("card_id")
    rating = request.data.get("rating")

    if rating not in (1, 2, 3, 4):
        return Response({"error": "Rating must be 1, 2, 3, or 4"}, status=400)

    card = Flashcard.objects.filter(CardID=card_id).first()
    if not card:
        return Response({"error": "Card not found"}, status=404)

    # Verify the card belongs to a deck owned by the user
    deck = Deck.objects.filter(DeckID=card.DeckID_id, UserID=request.user).first()
    if not deck:
        return Response({"error": "Card not found"}, status=404)

    from .spaced_repetition import Rating, schedule, format_next_review
    from achievements.engine import (
        AchievementEngine,
        CardStudiedEvent,
        AnswerSubmittedEvent,
        CardMasteredEvent,
    )

    with transaction.atomic():
        # Get or create progress
        progress, created = CardProgress.objects.get_or_create(
            UserID=request.user,
            CardID=card,
            defaults={"State": CardProgress.CardState.NEW, "EF": 2.5},
        )

        was_mastered = progress.Mastered
        state_before = progress.State

        # Update daily count based on state BEFORE the rating
        today = timezone.now().date()
        daily_count, _ = DeckDailyCount.objects.get_or_create(
            UserID=request.user, DeckID=deck, Date=today,
            defaults={"NewStudied": 0, "LearningStudied": 0, "ReviewStudied": 0},
        )
        if state_before == CardProgress.CardState.NEW:
            daily_count.NewStudied += 1
        elif state_before == CardProgress.CardState.LEARNING:
            daily_count.LearningStudied += 1
        else:
            daily_count.ReviewStudied += 1
        daily_count.save()

        # Run SM-2 scheduling
        result = schedule(
            card_state=progress.State,
            ef=progress.EF,
            repetitions=progress.Repetitions,
            interval_days=progress.Interval,
            step_index=progress.StepIndex,
            rating=Rating(rating),
        )

        # Update CardProgress
        now = timezone.now()
        progress.State = result.state
        progress.EF = result.ef
        progress.Repetitions = result.repetitions
        progress.Interval = result.interval_days
        progress.StepIndex = result.step_index
        progress.NextReview = now + result.next_review_delta
        progress.LastReviewed = now
        progress.Mastered = result.mastered
        progress.save()

        # Update the deck's last_studied timestamp
        deck.last_studied = now
        deck.save(update_fields=["last_studied"])

        # Fire achievement events
        all_unlocked = []

        all_unlocked += AchievementEngine.process_event(
            CardStudiedEvent(user=request.user, card_id=card_id, mode="solo")
        )

        is_correct = rating >= 3  # Okay and Easy count as correct
        all_unlocked += AchievementEngine.process_event(
            AnswerSubmittedEvent(
                user=request.user, is_correct=is_correct, mode="solo"
            )
        )

        # Fire CardMasteredEvent if card is newly mastered
        if result.mastered and not was_mastered:
            all_unlocked += AchievementEngine.process_event(
                CardMasteredEvent(
                    user=request.user, card_id=card_id, deck_id=deck.DeckID
                )
            )

    # Compute previews for the card's new state (useful if re-queued)
    previews = {}
    for rv in [1, 2, 3, 4]:
        preview_result = schedule(
            card_state=result.state,
            ef=result.ef,
            repetitions=result.repetitions,
            interval_days=result.interval_days,
            step_index=result.step_index,
            rating=Rating(rv),
        )
        previews[str(rv)] = format_next_review(preview_result.next_review_delta)

    return Response({
        "card_id": card_id,
        "scheduling": {
            "state": result.state,
            "ef": result.ef,
            "repetitions": result.repetitions,
            "interval_days": result.interval_days,
            "next_review": progress.NextReview,
            "next_review_label": format_next_review(result.next_review_delta),
            "mastered": result.mastered,
            "requeue": result.requeue,
        },
        "previews": previews,
        "new_achievements": [
            {
                "name": ua.achievement.name,
                "description": ua.achievement.description,
                "icon": ua.achievement.icon,
            }
            for ua in all_unlocked
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def solo_card_studied(request):
    """
    POST /deck/api/solo/card-studied/
    Body: { card_id, is_correct (optional) }
    Records that a card was studied and optionally an answer result.
    (Legacy endpoint — prefer rate-card for spaced repetition.)
    """
    card_id = request.data.get("card_id")
    is_correct = request.data.get("is_correct")

    from achievements.engine import AchievementEngine, CardStudiedEvent, AnswerSubmittedEvent

    unlocked = []
    unlocked += AchievementEngine.process_event(
        CardStudiedEvent(user=request.user, card_id=card_id, mode="solo")
    )

    if is_correct is not None:
        unlocked += AchievementEngine.process_event(
            AnswerSubmittedEvent(
                user=request.user, is_correct=is_correct, mode="solo"
            )
        )

    return Response(
        {
            "new_achievements": [
                {
                    "name": ua.achievement.name,
                    "description": ua.achievement.description,
                    "icon": ua.achievement.icon,
                }
                for ua in unlocked
            ]
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def solo_session_complete(request):
    """
    POST /deck/api/solo/complete/
    Body: { deck_id, cards_studied, correct_count, total_count,
            cards_mastered (optional), session_duration_seconds (optional) }
    Records completion of a solo study session.
    """
    deck_id = request.data.get("deck_id")
    cards_studied = request.data.get("cards_studied", 0)
    correct_count = request.data.get("correct_count", 0)
    total_count = request.data.get("total_count", 0)

    from achievements.engine import AchievementEngine, SoloSessionCompletedEvent

    # Fire solo session complete event
    new_achievements = AchievementEngine.process_event(
        SoloSessionCompletedEvent(
            user=request.user, deck_id=deck_id, cards_studied=cards_studied
        )
    )

    return Response(
        {
            "new_achievements": [
                {
                    "name": ua.achievement.name,
                    "description": ua.achievement.description,
                    "icon": ua.achievement.icon,
                }
                for ua in new_achievements
            ]
        }
    )