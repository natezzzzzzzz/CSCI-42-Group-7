from django.db import migrations


def seed_sr_achievements(apps, schema_editor):
    Achievement = apps.get_model("achievements", "Achievement")
    achievements = [
        {
            "name": "Spaced Out",
            "description": "Complete your first spaced repetition review",
            "icon": "clock",
            "criteria": "spaced_repetition_reviews",
            "threshold": 1,
            "category": "solo",
            "tier": "bronze",
            "is_hidden": False,
            "points": 10,
            "multiplayer_only": False,
        },
        {
            "name": "Repetition is the Mother of Learning",
            "description": "Complete 50 spaced repetition reviews",
            "icon": "repeat",
            "criteria": "spaced_repetition_reviews",
            "threshold": 50,
            "category": "solo",
            "tier": "silver",
            "is_hidden": False,
            "points": 25,
            "multiplayer_only": False,
        },
        {
            "name": "Encyclopedic Memory",
            "description": "Complete 200 spaced repetition reviews",
            "icon": "library",
            "criteria": "spaced_repetition_reviews",
            "threshold": 200,
            "category": "solo",
            "tier": "gold",
            "is_hidden": False,
            "points": 50,
            "multiplayer_only": False,
        },
        {
            "name": "Mastered",
            "description": "Master your first card through spaced repetition",
            "icon": "award",
            "criteria": "cards_mastered",
            "threshold": 1,
            "category": "solo",
            "tier": "bronze",
            "is_hidden": False,
            "points": 15,
            "multiplayer_only": False,
        },
        {
            "name": "Grand Master",
            "description": "Master 25 cards through spaced repetition",
            "icon": "crown",
            "criteria": "cards_mastered",
            "threshold": 25,
            "category": "solo",
            "tier": "gold",
            "is_hidden": False,
            "points": 45,
            "multiplayer_only": False,
        },
        {
            "name": "Night Owl",
            "description": "Complete a solo study session after midnight",
            "icon": "moon",
            "criteria": "late_night_study",
            "threshold": 1,
            "category": "solo",
            "tier": "silver",
            "is_hidden": True,
            "points": 20,
            "multiplayer_only": False,
        },
    ]
    for a in achievements:
        Achievement.objects.get_or_create(name=a["name"], defaults=a)


def reverse_sr_achievements(apps, schema_editor):
    Achievement = apps.get_model("achievements", "Achievement")
    names = [
        "Spaced Out",
        "Repetition is the Mother of Learning",
        "Encyclopedic Memory",
        "Mastered",
        "Grand Master",
        "Night Owl",
    ]
    Achievement.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("achievements", "0003_more_achievements"),
    ]

    operations = [
        migrations.RunPython(seed_sr_achievements, reverse_sr_achievements),
    ]