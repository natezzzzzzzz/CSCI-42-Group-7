from django.db import migrations


def seed_more_achievements(apps, schema_editor):
    Achievement = apps.get_model("achievements", "Achievement")
    achievements = [
        {
            "name": "Marathon Runner",
            "description": "Study 500 cards",
            "icon": "running",
            "criteria": "cards_studied",
            "threshold": 500,
            "category": "general",
            "tier": "platinum",
            "is_hidden": False,
            "points": 75,
            "multiplayer_only": False,
        },
        {
            "name": "Bookworm",
            "description": "Complete 25 decks",
            "icon": "book-open",
            "criteria": "decks_completed",
            "threshold": 25,
            "category": "solo",
            "tier": "gold",
            "is_hidden": False,
            "points": 45,
            "multiplayer_only": False,
        },
        {
            "name": "Unstoppable",
            "description": "Get 20 correct answers in a row",
            "icon": "bolt",
            "criteria": "answer_streak",
            "threshold": 20,
            "category": "general",
            "tier": "platinum",
            "is_hidden": False,
            "points": 60,
            "multiplayer_only": False,
        },
        {
            "name": "Lone Wolf",
            "description": "Complete 5 solo sessions",
            "icon": "moon",
            "criteria": "solo_sessions",
            "threshold": 5,
            "category": "solo",
            "tier": "bronze",
            "is_hidden": False,
            "points": 15,
            "multiplayer_only": False,
        },
        {
            "name": "Knowledge Seeker",
            "description": "Complete 25 solo sessions",
            "icon": "compass",
            "criteria": "solo_sessions",
            "threshold": 25,
            "category": "solo",
            "tier": "gold",
            "is_hidden": False,
            "points": 45,
            "multiplayer_only": False,
        },
        {
            "name": "Party Animal",
            "description": "Play 10 multiplayer games",
            "icon": "confetti",
            "criteria": "multiplayer_games_played",
            "threshold": 10,
            "category": "multiplayer",
            "tier": "silver",
            "is_hidden": False,
            "points": 25,
            "multiplayer_only": True,
        },
        {
            "name": "Veteran",
            "description": "Play 25 multiplayer games",
            "icon": "shield",
            "criteria": "multiplayer_games_played",
            "threshold": 25,
            "category": "multiplayer",
            "tier": "gold",
            "is_hidden": False,
            "points": 45,
            "multiplayer_only": True,
        },
        {
            "name": "Sharp Mind",
            "description": "Maintain 75% accuracy over 20+ answers",
            "icon": "brain",
            "criteria": "accuracy",
            "threshold": 75,
            "category": "general",
            "tier": "silver",
            "is_hidden": False,
            "points": 25,
            "multiplayer_only": False,
        },
        {
            "name": "Consistent",
            "description": "Study 3 days in a row",
            "icon": "calendar",
            "criteria": "study_days",
            "threshold": 3,
            "category": "general",
            "tier": "bronze",
            "is_hidden": False,
            "points": 15,
            "multiplayer_only": False,
        },
        {
            "name": "Dedicated",
            "description": "Study 7 days in a row",
            "icon": "sunrise",
            "criteria": "study_days",
            "threshold": 7,
            "category": "general",
            "tier": "gold",
            "is_hidden": False,
            "points": 40,
            "multiplayer_only": False,
        },
    ]
    for data in achievements:
        Achievement.objects.get_or_create(name=data["name"], defaults=data)


class Migration(migrations.Migration):

    dependencies = [
        ("achievements", "0002_seed_achievements"),
    ]

    operations = [
        migrations.RunPython(seed_more_achievements, migrations.RunPython.noop),
    ]