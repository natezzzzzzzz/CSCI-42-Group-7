import os
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image, ImageDraw, ImageFont

from achievements.models import Achievement
from api.models import User
from deck.models import Deck, Flashcard


PALETTE = {
    "blue": (59, 130, 246),
    "green": (34, 197, 94),
    "purple": (139, 92, 246),
    "red": (239, 68, 68),
    "orange": (249, 115, 22),
    "teal": (20, 184, 166),
    "pink": (236, 72, 153),
    "yellow": (234, 179, 8),
}


def _make_placeholder_image(label, bg_color, size=(400, 300)):
    """Generate a simple coloured PNG with centred text using Pillow."""
    img = Image.new("RGB", size, bg_color)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except (OSError, IOError):
        font = ImageFont.load_default()

    # Draw text centred
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size[0] - text_w) // 2
    y = (size[1] - text_h) // 2
    draw.text((x, y), label, fill=(255, 255, 255), font=font)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Populate the database with sample users, decks, and flashcards (including image cards)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...\n")

        with transaction.atomic():
            self._create_achievements()
            users = self._create_users()
            decks = self._create_decks(users)
            self._create_flashcards(decks)

        self.stdout.write(self.style.SUCCESS("Done! Database seeded.\n"))


    def _create_achievements(self):
        """Create 50 achievements covering all registered evaluator criteria.
        Idempotent: skips achievements whose name already exists."""
        achievement_specs = [
            ("First Steps", "Study your first flashcard.", "book", "cards_studied", 1, False, "solo", "bronze", 10),
            ("Bookworm", "Study 25 flashcards.", "book", "cards_studied", 25, False, "solo", "bronze", 10),
            ("Scholar", "Study 100 flashcards.", "book-open", "cards_studied", 100, False, "solo", "silver", 25),
            ("Knowledge Seeker", "Study 500 flashcards.", "book-open", "cards_studied", 500, False, "solo", "gold", 50),
            ("Walking Encyclopedia", "Study 1,000 flashcards.", "library", "cards_studied", 1000, False, "solo", "platinum", 100),

            ("Deck Apprentice", "Complete your first deck.", "layers", "decks_completed", 1, False, "solo", "bronze", 10),
            ("Deck Master", "Complete 5 decks.", "layers", "decks_completed", 5, False, "solo", "silver", 25),
            ("Deck Champion", "Complete 15 decks.", "award", "decks_completed", 15, False, "solo", "gold", 50),
            ("Deck Legend", "Complete 30 decks.", "crown", "decks_completed", 30, False, "solo", "platinum", 100),

            ("Sharp Mind", "Get 10 correct answers.", "check-circle", "correct_answers", 10, False, "general", "bronze", 10),
            ("Quick Thinker", "Get 50 correct answers.", "check-circle", "correct_answers", 50, False, "general", "silver", 25),
            ("Brain Power", "Get 250 correct answers.", "brain", "correct_answers", 250, False, "general", "gold", 50),

            ("On a Roll", "Achieve a best streak of 3.", "fire", "answer_streak", 3, False, "general", "bronze", 10),
            ("Hot Streak", "Achieve a best streak of 10.", "fire", "answer_streak", 10, False, "general", "silver", 25),
            ("Unstoppable", "Achieve a best streak of 25.", "flame", "answer_streak", 25, False, "general", "gold", 50),
            ("Flawless Focus", "Achieve a best streak of 50.", "diamond", "answer_streak", 50, False, "general", "platinum", 100),

            ("In the Zone", "Get a current streak of 5.", "zap", "current_streak", 5, False, "general", "bronze", 10),
            ("Riding the Wave", "Get a current streak of 15.", "zap", "current_streak", 15, False, "general", "silver", 25),
            ("Locked In", "Get a current streak of 30.", "bolt", "current_streak", 30, False, "general", "gold", 50),

            ("Social Learner", "Play your first multiplayer game.", "gamepad", "games_played", 1, False, "multiplayer", "bronze", 10),
            ("Regular Competitor", "Play 10 multiplayer games.", "gamepad", "games_played", 10, False, "multiplayer", "silver", 25),
            ("Tournament Veteran", "Play 50 multiplayer games.", "sword", "games_played", 50, False, "multiplayer", "gold", 50),

            ("First Victory", "Win your first multiplayer game.", "trophy", "games_won", 1, False, "multiplayer", "bronze", 10),
            ("Consistent Winner", "Win 5 multiplayer games.", "trophy", "games_won", 5, False, "multiplayer", "silver", 25),
            ("Champion", "Win 25 multiplayer games.", "crown", "games_won", 25, False, "multiplayer", "gold", 50),
            ("Dominator", "Win 50 multiplayer games.", "crown", "games_won", 50, False, "multiplayer", "platinum", 100),

            ("Precise", "Reach 60% overall accuracy.", "target", "accuracy", 60, False, "general", "bronze", 10),
            ("Sharpshooter", "Reach 75% overall accuracy.", "crosshair", "accuracy", 75, False, "general", "silver", 25),
            ("Marksman", "Reach 90% overall accuracy.", "bullseye", "accuracy", 90, False, "general", "gold", 50),

            ("Social Butterfly", "Play 5 multiplayer games.", "users", "multiplayer_games_played", 5, False, "multiplayer", "bronze", 10),
            ("Party Regular", "Play 20 multiplayer games.", "users", "multiplayer_games_played", 20, False, "multiplayer", "silver", 25),
            ("Networker", "Play 50 multiplayer games.", "globe", "multiplayer_games_played", 50, False, "multiplayer", "gold", 50),
            ("Solo Starter", "Complete your first solo session.", "user", "solo_sessions", 1, False, "solo", "bronze", 10),
            ("Solo Student", "Complete 10 solo sessions.", "user", "solo_sessions", 10, False, "solo", "silver", 25),
            ("Lone Wolf", "Complete 50 solo sessions.", "shield", "solo_sessions", 50, False, "solo", "gold", 50),
            ("Hermit", "Complete 100 solo sessions.", "mountain", "solo_sessions", 100, False, "solo", "platinum", 100),

            ("Dedicated", "Study 3 days in a row.", "calendar", "study_days", 3, False, "general", "bronze", 10),
            ("Committed", "Study 7 days in a row.", "calendar", "study_days", 7, False, "general", "silver", 25),
            ("Devoted", "Study 14 days in a row.", "calendar-check", "study_days", 14, False, "general", "gold", 50),
            ("Unwavering", "Study 30 days in a row.", "infinity", "study_days", 30, False, "general", "platinum", 100),

            ("Flawless Round", "Answer every question correctly in a multiplayer game.", "star", "perfect_game", 1, False, "multiplayer", "bronze", 10),
            ("Perfect Performer", "Achieve a perfect game with style.", "star", "perfect_game", 1, True, "multiplayer", "gold", 50),

            ("Convincing Win", "Win a game by a margin of 3 or more.", "trophy", "winner_by_margin", 3, False, "multiplayer", "bronze", 10),
            ("Dominant Victory", "Win a game by a margin of 5 or more.", "medal", "winner_by_margin", 5, False, "multiplayer", "silver", 25),
            ("Crushing Blowout", "Win a game by a margin of 8 or more.", "award", "winner_by_margin", 8, False, "multiplayer", "gold", 50),

            ("Card Conqueror", "Master 10 cards through spaced repetition.", "award", "cards_mastered", 10, False, "solo", "bronze", 10),
            ("Memory Master", "Master 50 cards through spaced repetition.", "gem", "cards_mastered", 50, False, "solo", "gold", 50),

            ("Repetition Rookie", "Complete 10 spaced repetition reviews.", "repeat", "spaced_repetition_reviews", 10, False, "solo", "bronze", 10),
            ("Spaced Repetition Pro", "Complete 50 spaced repetition reviews.", "refresh-cw", "spaced_repetition_reviews", 50, False, "solo", "silver", 25),

            ("Night Owl", "Complete a solo session between midnight and 5 AM.", "moon", "late_night_study", 1, True, "solo", "silver", 25),
        ]

        count = 0
        for name, desc, icon, criteria, threshold, is_hidden, category, tier, points in achievement_specs:
            obj, created = Achievement.objects.get_or_create(
                name=name,
                defaults={
                    "description": desc,
                    "icon": icon,
                    "criteria": criteria,
                    "threshold": threshold,
                    "is_hidden": is_hidden,
                    "category": category,
                    "tier": tier,
                    "points": points,
                },
            )
            if created:
                count += 1
        self.stdout.write(f"  Created {count} achievements (50 total defined)")


    def _create_users(self):
        """Create three test users. Skips if they already exist."""
        user_specs = [
            ("alice@example.com", "alice", "password123"),
            ("bob@example.com", "bob", "password123"),
            ("carol@example.com", "carol", "password123"),
        ]
        users = {}
        for email, username, password in user_specs:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": username},
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Created user: {username} ({email})")
            else:
                self.stdout.write(f"  User already exists: {username} ({email})")
            users[username] = user
        return users


    def _create_decks(self, users):
        """Create sample decks for each user."""
        deck_specs = [
            ("alice", "Biology 101", "Intro to cell biology", "Science"),
            ("alice", "World Capitals", "Capital cities of the world", "Geography"),
            ("bob", "Spanish Vocabulary", "Common Spanish words and phrases", "Language"),
            ("bob", "JavaScript Basics", "Core JS concepts for beginners", "Programming"),
            ("carol", "Art History", "Renaissance to Modern art movements", "History"),
        ]
        decks = {}
        for username, name, desc, category in deck_specs:
            deck, created = Deck.objects.get_or_create(
                DeckName=name,
                UserID=users[username],
                defaults={
                    "Description": desc,
                    "Category": category,
                    "IsPublic": True,
                },
            )
            if created:
                self.stdout.write(f"  Created deck: {name} (owner: {username})")
            else:
                self.stdout.write(f"  Deck already exists: {name}")
            decks[name] = deck
        return decks


    def _create_flashcards(self, decks):
        """Create flashcards with varying content types:
        - Text-only cards
        - Cards with a question image
        - Cards with an answer image
        - Cards with both images
        - Cards with an image but minimal text (testing 'None' default)
        """

        colour_keys = list(PALETTE.keys())

        bio = decks["Biology 101"]

        card_specs = [
            # Text-only cards
            {"Question": "What is the powerhouse of the cell?", "Answer": "Mitochondria"},
            {"Question": "What organelle is responsible for photosynthesis?", "Answer": "Chloroplast"},
            {"Question": "What is the basic unit of life?", "Answer": "Cell"},
            {
                "Question": "What cellular structure is shown in this diagram?",
                "Answer": "Cell membrane",
                "question_image_label": "cell_diagram",
                "question_image_color": "blue",
            },
            # Card with answer image
            {
                "Question": "Draw the structure of a chloroplast.",
                "Answer": "See diagram",
                "answer_image_label": "chloroplast",
                "answer_image_color": "green",
            },
            # Card with both images
            {
                "Question": "Identify the organelle shown below:",
                "Answer": "Mitochondria — structure shown below",
                "question_image_label": "mitochondria_q",
                "question_image_color": "purple",
                "answer_image_label": "mitochondria_a",
                "answer_image_color": "orange",
            },
            {
                "Question": "Name this organelle",
                "Answer": "Golgi apparatus",
                "question_image_label": "golgi",
                "question_image_color": "teal",
            },
        ]
        self._create_cards(bio, card_specs, colour_keys)

        geo = decks["World Capitals"]
        card_specs = [
            {"Question": "What is the capital of France?", "Answer": "Paris"},
            {"Question": "What is the capital of Japan?", "Answer": "Tokyo"},
            {"Question": "What is the capital of Brazil?", "Answer": "Brasilia"},
            {"Question": "What is the capital of Australia?", "Answer": "Canberra"},
            # Flag-image card
            {
                "Question": "Which country's flag is this?",
                "Answer": "Japan",
                "question_image_label": "flag_japan",
                "question_image_color": "red",
            },
        ]
        self._create_cards(geo, card_specs, colour_keys)

        spanish = decks["Spanish Vocabulary"]
        card_specs = [
            {"Question": "How do you say 'hello' in Spanish?", "Answer": "Hola"},
            {"Question": "How do you say 'thank you' in Spanish?", "Answer": "Gracias"},
            {"Question": "How do you say 'goodbye' in Spanish?", "Answer": "Adiós"},
            # Card with question image (sign/photo of a street sign)
            {
                "Question": "What does this Spanish sign mean?",
                "Answer": "Exit / Salida",
                "question_image_label": "sign_salida",
                "question_image_color": "green",
            },
        ]
        self._create_cards(spanish, card_specs, colour_keys)

        js = decks["JavaScript Basics"]
        card_specs = [
            {"Question": "What is the output of typeof null?", "Answer": "object"},
            {"Question": "What keyword declares a block-scoped variable?", "Answer": "let"},
            {"Question": "What does the === operator check?", "Answer": "Strict equality (value and type)"},
            # Code screenshot card
            {
                "Question": "What does this code output?",
                "Answer": "42",
                "question_image_label": "js_code_1",
                "question_image_color": "yellow",
            },
            # Card with answer image showing the correct output
            {
                "Question": "Write a function that reverses a string.",
                "Answer": "See solution",
                "answer_image_label": "js_reverse_solution",
                "answer_image_color": "blue",
            },
        ]
        self._create_cards(js, card_specs, colour_keys)

        art = decks["Art History"]
        card_specs = [
            {"Question": "Who painted the Mona Lisa?", "Answer": "Leonardo da Vinci"},
            {"Question": "What art movement is Salvador Dalí associated with?", "Answer": "Surrealism"},
            # Painting identification card
            {
                "Question": "Identify the painting shown below:",
                "Answer": "The Starry Night — Vincent van Gogh, 1889",
                "question_image_label": "starry_night",
                "question_image_color": "purple",
            },
            # Both images — artist portrait and their work
            {
                "Question": "Which artist is depicted in this portrait?",
                "Answer": "Frida Kahlo — self-portrait",
                "question_image_label": "artist_portrait",
                "question_image_color": "pink",
                "answer_image_label": "frida_self_portrait",
                "answer_image_color": "teal",
            },
            # Answer-only image card
            {
                "Question": "What does Baroque architecture look like?",
                "Answer": "See example",
                "answer_image_label": "baroque_example",
                "answer_image_color": "orange",
            },
        ]
        self._create_cards(art, card_specs, colour_keys)

    def _create_cards(self, deck, card_specs, colour_keys):
        """Bulk-create flashcards for a deck, generating placeholder images as needed."""
        count = 0
        for i, spec in enumerate(card_specs):
            question = spec["Question"]
            answer = spec.get("Answer", "None")

            # Skip if an identical card already exists in this deck
            if Flashcard.objects.filter(DeckID=deck, Question=question).exists():
                self.stdout.write(f"    Card already exists: {question[:50]}")
                continue

            card = Flashcard(DeckID=deck, Question=question, Answer=answer)

            # Attach question image if specified
            q_label = spec.get("question_image_label")
            if q_label:
                colour_name = spec.get("question_image_color", colour_keys[i % len(colour_keys)])
                img = _make_placeholder_image(
                    q_label, PALETTE[colour_name]
                )
                card.QuestionImage.save(f"{q_label}.png", img, save=False)

            # Attach answer image if specified
            a_label = spec.get("answer_image_label")
            if a_label:
                colour_name = spec.get("answer_image_color", colour_keys[i % len(colour_keys)])
                img = _make_placeholder_image(
                    a_label, PALETTE[colour_name]
                )
                card.AnswerImage.save(f"{a_label}.png", img, save=False)

            card.save()
            count += 1

        self.stdout.write(f"  Created {count} cards for deck '{deck.DeckName}'")