from dataclasses import dataclass
from datetime import timedelta
from enum import IntEnum

""" This sets the users difficulty rating for a card review, which is used to determine the next review time and whether the card is marked as mastered. """
class Rating(IntEnum):
    VERY_DIFFICULT = 1
    DIFFICULT = 2
    OKAY = 3
    EASY = 4

""" This class defines the possible states of a flashcard in the spaced repetition system, which affects how the scheduling algorithm determines the next review time. """
class CardState:
    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    RELEARNING = "relearning"


LEARNING_STEPS = [1, 10]
RELEARNING_STEPS = [1, 10]
MIN_EF = 1.3
DEFAULT_EF = 2.5
EASY_BONUS = 1.3
HARD_GOOD_RATIO = 0.7
LAPSE_GRADUATION_FACTOR = 0.7
MASTERED_MIN_REPETITIONS = 5
MASTERED_MIN_INTERVAL_DAYS = 21

""" This module implements the core scheduling algorithm for the spaced repetition system, determining when a flashcard should be reviewed next based on the user's performance and the card's current state. """
@dataclass
class SchedulingResult:
    state: str
    ef: float
    repetitions: int
    interval_days: float
    step_index: int
    next_review_delta: timedelta
    mastered: bool
    requeue: bool

""" This function calculates the next interval for a card that was rated as "good" during a review, based on the number of repetitions, the current interval, and the easiness factor.  """
def _good_interval(repetitions: int, interval_days: float, ef: float) -> float:
    if repetitions == 0:
        return 1.0
    elif repetitions == 1:
        return 3.0
    else:
        return interval_days * ef

""" This is the main scheduling function that takes the current state of the card to determine the next state and review time for the card. """
def schedule(card_state: str, ef: float, repetitions: int,
             interval_days: float, step_index: int,
             rating: Rating) -> SchedulingResult:
    if card_state in (CardState.NEW, CardState.LEARNING):
        return _schedule_new_or_learning(ef, step_index, rating)
    elif card_state == CardState.REVIEW:
        return _schedule_review(ef, repetitions, interval_days, rating)
    elif card_state == CardState.RELEARNING:
        return _schedule_relearning(ef, interval_days, step_index, rating)
    else:
        return _schedule_new_or_learning(ef, step_index, rating)

""" This function formats the next review time into a human-readable string. """
def _schedule_new_or_learning(ef: float, step_index: int,
                               rating: Rating) -> SchedulingResult:
    if rating == Rating.VERY_DIFFICULT:
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
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=ef,
            repetitions=1,
            interval_days=1.0,
            step_index=0,
            next_review_delta=timedelta(days=1.0),
            mastered=False,
            requeue=False,
        )
    else:
        new_ef = ef + 0.15
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=new_ef,
            repetitions=1,
            interval_days=4.0,
            step_index=0,
            next_review_delta=timedelta(days=4.0),
            mastered=False,
            requeue=False,
        )

""" This function calculates the next review time for a card that is currently in the review state. """
def _schedule_review(ef: float, repetitions: int,
                      interval_days: float, rating: Rating) -> SchedulingResult:
    good_int = _good_interval(repetitions, interval_days, ef)

    if rating == Rating.VERY_DIFFICULT:
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
        hard_int = good_int * HARD_GOOD_RATIO
        return SchedulingResult(
            state=CardState.REVIEW,
            ef=max(MIN_EF, ef - 0.08),
            repetitions=repetitions,
            interval_days=hard_int,
            step_index=0,
            next_review_delta=timedelta(days=hard_int),
            mastered=False,
            requeue=False,
        )
    elif rating == Rating.OKAY:
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
    else:
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

""" This function calculates for the next review time for a card depending on the user's rating when the card is in the relearning state. """
def _schedule_relearning(ef: float, interval_days: float,
                          step_index: int, rating: Rating) -> SchedulingResult:
    if rating == Rating.VERY_DIFFICULT:
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
    else:
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

""" This function formats the next review time into a human-readable string. """
def format_next_review(delta: timedelta) -> str:
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
        return f"{days}d" if days < 30 else f"{days // 7}w"