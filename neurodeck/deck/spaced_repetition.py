"""
Spaced repetition scheduling engine based on the SM-2 algorithm
(Piotr Wozniak, 1987), adapted for a 4-level Anki-style rating system.

Key invariant: intervals always satisfy  Again < Hard < Good < Easy.

This module is pure Python with no Django dependencies.
The view layer handles persistence.
"""

from dataclasses import dataclass
from datetime import timedelta
from enum import IntEnum


# ---------------------------------------------------------------------------
# Rating levels (user-facing labels)
# ---------------------------------------------------------------------------

class Rating(IntEnum):
    VERY_DIFFICULT = 1   # "Again" — lapse, card reappears immediately
    DIFFICULT = 2        # "Hard" — shorter interval than Good
    OKAY = 3             # "Good" — standard SM-2 progression
    EASY = 4             # "Easy" — accelerated progression


# ---------------------------------------------------------------------------
# Card states
# ---------------------------------------------------------------------------

class CardState:
    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    RELEARNING = "relearning"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Learning steps (minutes) for new/learning cards
LEARNING_STEPS = [1, 10]  # 1 minute, then 10 minutes

# Relearning steps (minutes) for lapsed review cards
RELEARNING_STEPS = [1, 10]  # 1 minute, then 10 minutes

# Minimum easiness factor (SM-2 specification)
MIN_EF = 1.3

# Default starting easiness factor
DEFAULT_EF = 2.5

# Easy bonus multiplier (Anki-inspired)
EASY_BONUS = 1.3

# Hard interval as a fraction of Good's interval
# Guarantees Hard < Good
HARD_GOOD_RATIO = 0.7

# New interval multiplier on lapse graduation (Anki's "new interval")
LAPSE_GRADUATION_FACTOR = 0.7

# Mastered threshold: card is considered mastered when it has been
# successfully recalled across multiple review intervals spanning
# at least 3 weeks
MASTERED_MIN_REPETITIONS = 5
MASTERED_MIN_INTERVAL_DAYS = 21


# ---------------------------------------------------------------------------
# Scheduling result
# ---------------------------------------------------------------------------

@dataclass
class SchedulingResult:
    """Output of the SM-2 algorithm for a single card rating."""
    state: str                # new CardState value
    ef: float                 # updated easiness factor
    repetitions: int          # updated repetition count
    interval_days: float      # new interval in days (0 for sub-day)
    step_index: int           # new step index within learning/relearning steps
    next_review_delta: timedelta  # exact timedelta to next review
    mastered: bool            # whether card should be marked mastered
    requeue: bool             # True if card should reappear in current session


# ---------------------------------------------------------------------------
# Helper: compute Good's interval for a card in REVIEW state
# ---------------------------------------------------------------------------

def _good_interval(repetitions: int, interval_days: float, ef: float) -> float:
    """Compute the interval a 'Good' rating would produce."""
    if repetitions == 0:
        return 1.0
    elif repetitions == 1:
        return 3.0
    else:
        return interval_days * ef


# ---------------------------------------------------------------------------
# Core scheduling function
# ---------------------------------------------------------------------------

def schedule(card_state: str, ef: float, repetitions: int,
             interval_days: float, step_index: int,
             rating: Rating) -> SchedulingResult:
    """
    Calculate the next scheduling parameters for a card after a rating.

    Args:
        card_state: Current state of the card (new/learning/review/relearning)
        ef: Current easiness factor
        repetitions: Current repetition count (consecutive successful reviews)
        interval_days: Current interval in days
        step_index: Current step index within learning/relearning steps
        rating: User's difficulty rating (1-4)

    Returns:
        SchedulingResult with updated scheduling parameters
    """
    if card_state in (CardState.NEW, CardState.LEARNING):
        return _schedule_new_or_learning(ef, step_index, rating)
    elif card_state == CardState.REVIEW:
        return _schedule_review(ef, repetitions, interval_days, rating)
    elif card_state == CardState.RELEARNING:
        return _schedule_relearning(ef, interval_days, step_index, rating)
    else:
        # Fallback: treat as new
        return _schedule_new_or_learning(ef, step_index, rating)


def _schedule_new_or_learning(ef: float, step_index: int,
                               rating: Rating) -> SchedulingResult:
    """Handle scheduling for cards in NEW or LEARNING state."""
    if rating == Rating.VERY_DIFFICULT:
        # Reset to first learning step
        return SchedulingResult(
            state=CardState.LEARNING,
            ef=max(MIN_EF, ef - 0.20),
            repetitions=0,
            interval_days=0,
            step_index=0,
            next_review_delta=timedelta(minutes=LEARNING_STEPS[0]),
            mastered=False,
            requeue=True,
        )

    elif rating == Rating.DIFFICULT:
        # Advance to next learning step (or stay at last)
        new_step = min(step_index + 1, len(LEARNING_STEPS) - 1)
        return SchedulingResult(
            state=CardState.LEARNING,
            ef=max(MIN_EF, ef - 0.08),
            repetitions=0,
            interval_days=0,
            step_index=new_step,
            next_review_delta=timedelta(minutes=LEARNING_STEPS[new_step]),
            mastered=False,
            requeue=False,
        )

    elif rating == Rating.OKAY:
        # Graduate to review with 1-day interval
        new_ef = ef  # no change on first graduation
        new_interval = 1.0
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=new_ef,
            repetitions=1,
            interval_days=new_interval,
            step_index=0,
            next_review_delta=timedelta(days=new_interval),
            mastered=False,
            requeue=False,
        )

    else:  # EASY
        # Graduate to review with 4-day interval, EF boost
        new_ef = ef + 0.15
        new_interval = 4.0
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=new_ef,
            repetitions=1,
            interval_days=new_interval,
            step_index=0,
            next_review_delta=timedelta(days=new_interval),
            mastered=False,
            requeue=False,
        )


def _schedule_review(ef: float, repetitions: int,
                      interval_days: float, rating: Rating) -> SchedulingResult:
    """Handle scheduling for cards in REVIEW state.

    The key invariant is that intervals always satisfy:
        Again < Hard < Good < Easy

    Good's interval is computed first, then Hard is derived as a
    fraction of Good (HARD_GOOD_RATIO), and Easy is derived by
    applying the EASY_BONUS to Good.
    """
    # Compute Good's interval first — all other ratings are derived from it
    good_int = _good_interval(repetitions, interval_days, ef)

    if rating == Rating.VERY_DIFFICULT:
        # Lapse: go to relearning
        return SchedulingResult(
            state=CardState.RELEARNING,
            ef=max(MIN_EF, ef - 0.20),
            repetitions=0,
            interval_days=0,
            step_index=0,
            next_review_delta=timedelta(minutes=RELEARNING_STEPS[0]),
            mastered=False,
            requeue=True,
        )

    elif rating == Rating.DIFFICULT:
        # Hard: shorter than Good, derived as a fraction of Good's interval.
        # Reps stay the same (Hard is still a successful recall, just difficult).
        hard_int = good_int * HARD_GOOD_RATIO

        return SchedulingResult(
            state=CardState.REVIEW,
            ef=max(MIN_EF, ef - 0.08),
            repetitions=repetitions,  # keep reps — don't reset or increment
            interval_days=hard_int,
            step_index=0,
            next_review_delta=timedelta(days=hard_int),
            mastered=False,
            requeue=False,
        )

    elif rating == Rating.OKAY:
        # Standard SM-2 progression
        new_reps = repetitions + 1
        mastered = (new_reps >= MASTERED_MIN_REPETITIONS
                    and good_int >= MASTERED_MIN_INTERVAL_DAYS)

        return SchedulingResult(
            state=CardState.REVIEW,
            ef=ef,
            repetitions=new_reps,
            interval_days=good_int,
            step_index=0,
            next_review_delta=timedelta(days=good_int),
            mastered=mastered,
            requeue=False,
        )

    else:  # EASY
        # Accelerated progression with easy bonus
        easy_int = good_int * EASY_BONUS
        new_ef = ef + 0.15
        new_reps = repetitions + 1
        mastered = (new_reps >= MASTERED_MIN_REPETITIONS
                    and easy_int >= MASTERED_MIN_INTERVAL_DAYS)

        return SchedulingResult(
            state=CardState.REVIEW,
            ef=new_ef,
            repetitions=new_reps,
            interval_days=easy_int,
            step_index=0,
            next_review_delta=timedelta(days=easy_int),
            mastered=mastered,
            requeue=False,
        )


def _schedule_relearning(ef: float, interval_days: float,
                          step_index: int, rating: Rating) -> SchedulingResult:
    """Handle scheduling for cards in RELEARNING state."""
    if rating == Rating.VERY_DIFFICULT:
        # Back to first relearning step
        return SchedulingResult(
            state=CardState.RELEARNING,
            ef=max(MIN_EF, ef - 0.20),
            repetitions=0,
            interval_days=0,
            step_index=0,
            next_review_delta=timedelta(minutes=RELEARNING_STEPS[0]),
            mastered=False,
            requeue=True,
        )

    elif rating == Rating.DIFFICULT:
        # Advance to next relearning step (or stay at last)
        new_step = min(step_index + 1, len(RELEARNING_STEPS) - 1)
        return SchedulingResult(
            state=CardState.RELEARNING,
            ef=max(MIN_EF, ef - 0.08),
            repetitions=0,
            interval_days=0,
            step_index=new_step,
            next_review_delta=timedelta(minutes=RELEARNING_STEPS[new_step]),
            mastered=False,
            requeue=False,
        )

    elif rating == Rating.OKAY:
        # Graduate back to review with reduced interval
        new_interval = max(interval_days * LAPSE_GRADUATION_FACTOR, 1) if interval_days > 0 else 1.0
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=ef,
            repetitions=1,
            interval_days=new_interval,
            step_index=0,
            next_review_delta=timedelta(days=new_interval),
            mastered=False,
            requeue=False,
        )

    else:  # EASY
        # Graduate back to review with previous interval preserved
        new_ef = ef + 0.15
        new_interval = max(interval_days, 1) if interval_days > 0 else 1.0
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=new_ef,
            repetitions=1,
            interval_days=new_interval,
            step_index=0,
            next_review_delta=timedelta(days=new_interval),
            mastered=False,
            requeue=False,
        )


def format_next_review(delta: timedelta) -> str:
    """Format a timedelta as a human-readable string for the frontend."""
    total_seconds = int(delta.total_seconds())
    if total_seconds < 60:
        return "<1 min"
    elif total_seconds < 3600:
        return f"{total_seconds // 60} min"
    elif total_seconds < 86400:
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours}h {minutes}m" if minutes else f"{hours}h"
    else:
        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        return f"{days}d" if days < 30 else f"{days // 7}w"