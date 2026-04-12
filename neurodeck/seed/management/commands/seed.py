"""
Django management command to populate the database with sample users, decks,
and flashcards — including cards with images on the question side, answer side,
or both.

Usage:
    python manage.py seed

The command is idempotent: it skips creating objects whose email/username
already exist in the database.
"""

import os
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image, ImageDraw, ImageFont

from api.models import User
from deck.models import Deck, Flashcard


# ── Colour palette for placeholder images ──────────────────────────────────
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

    # Use default font (no need for system fonts)
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
            users = self._create_users()
            decks = self._create_decks(users)
            self._create_flashcards(decks)

        self.stdout.write(self.style.SUCCESS("Done! Database seeded.\n"))

    # ── Users ──────────────────────────────────────────────────────────────

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

    # ── Decks ──────────────────────────────────────────────────────────────

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

    # ── Flashcards ─────────────────────────────────────────────────────────

    def _create_flashcards(self, decks):
        """Create flashcards with varying content types:
        - Text-only cards
        - Cards with a question image
        - Cards with an answer image
        - Cards with both images
        - Cards with an image but minimal text (testing 'None' default)
        """

        colour_keys = list(PALETTE.keys())

        # ── Biology 101 (alice) ────────────────────────────────────────
        bio = decks["Biology 101"]

        card_specs = [
            # Text-only cards
            {"Question": "What is the powerhouse of the cell?", "Answer": "Mitochondria"},
            {"Question": "What organelle is responsible for photosynthesis?", "Answer": "Chloroplast"},
            {"Question": "What is the basic unit of life?", "Answer": "Cell"},
            # Card with question image — a diagram
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
            # Image-only card (question text is descriptive, answer is just "None"/label)
            {
                "Question": "Name this organelle",
                "Answer": "Golgi apparatus",
                "question_image_label": "golgi",
                "question_image_color": "teal",
            },
        ]
        self._create_cards(bio, card_specs, colour_keys)

        # ── World Capitals (alice) ────────────────────────────────────
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

        # ── Spanish Vocabulary (bob) ───────────────────────────────────
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

        # ── JavaScript Basics (bob) ────────────────────────────────────
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

        # ── Art History (carol) ────────────────────────────────────────
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