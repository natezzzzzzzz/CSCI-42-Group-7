"""
Comprehensive unit tests for the NeuroDeck application.

Covers:
  - Authentication (registration, login, JWT token flow)
  - Deck CRUD (create, list, update, delete, ownership)
  - Card CRUD (create, list, update, delete, with and without images)
  - Image support (upload, clear, replace, serializer validation)
  - Solo study session (start-session, rate-card, study stats)
  - Spaced repetition scheduling (SM-2 state transitions)
  - Deck settings (daily limits)
  - Multiplayer rooms (create, join, start, flashcard, submit answer, next card, end)
  - Multiplayer security (AnswerImage hidden, host-only actions)
  - Achievement engine integration
"""

import io
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from api.models import User
from deck.models import Deck, Flashcard, CardProgress
from multiplayer.models import MultiplayerRoom, RoomParticipant


def _make_image(name="test.png", color=(59, 130, 246), size=(100, 100)):
    """Helper: create a small in-memory PNG image."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return ContentFile(buf.getvalue(), name=name)


# ─── Model Tests ────────────────────────────────────────────────────────────


class FlashcardModelTest(TestCase):
    """Test Flashcard model fields for image support."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="model@test.com", username="modeltester", password="pass1234"
        )
        self.deck = Deck.objects.create(
            DeckName="Test Deck", UserID=self.user, IsPublic=True
        )

    def test_create_text_only_card(self):
        """Flashcard can be created without images."""
        card = Flashcard.objects.create(
            DeckID=self.deck,
            Question="What is 2+2?",
            Answer="4",
        )
        self.assertFalse(bool(card.QuestionImage))
        self.assertFalse(bool(card.AnswerImage))
        self.assertEqual(card.Question, "What is 2+2?")
        self.assertEqual(card.Answer, "4")

    def test_create_card_with_question_image(self):
        """Flashcard can store a question-side image."""
        card = Flashcard.objects.create(
            DeckID=self.deck,
            Question="Identify this structure",
            Answer="Cell membrane",
        )
        card.QuestionImage.save("question.png", _make_image("q.png"), save=True)
        self.assertTrue(bool(card.QuestionImage))
        self.assertFalse(bool(card.AnswerImage))
        # The image URL should point to the card_images/ subdirectory
        self.assertIn("card_images/", card.QuestionImage.name)

    def test_create_card_with_answer_image(self):
        """Flashcard can store an answer-side image."""
        card = Flashcard.objects.create(
            DeckID=self.deck,
            Question="Draw a chloroplast",
            Answer="See diagram",
        )
        card.AnswerImage.save("answer.png", _make_image("a.png", color=(34, 197, 94)), save=True)
        self.assertTrue(bool(card.AnswerImage))
        self.assertIn("card_images/", card.AnswerImage.name)

    def test_create_card_with_both_images(self):
        """Flashcard can have both question and answer images simultaneously."""
        card = Flashcard.objects.create(
            DeckID=self.deck,
            Question="Identify the organelle",
            Answer="Mitochondria",
        )
        card.QuestionImage.save("both_q.png", _make_image("bq.png"), save=True)
        card.AnswerImage.save("both_a.png", _make_image("ba.png", color=(139, 92, 246)), save=True)
        self.assertTrue(bool(card.QuestionImage))
        self.assertTrue(bool(card.AnswerImage))

    def test_image_fields_are_optional(self):
        """Image fields should be nullable/blank."""
        card = Flashcard.objects.create(
            DeckID=self.deck,
            Question="Plain text card",
            Answer="No images",
        )
        # ImageFields should be falsy (None) without an uploaded file
        self.assertFalse(bool(card.QuestionImage))
        self.assertFalse(bool(card.AnswerImage))

    def test_clear_question_image(self):
        """Setting QuestionImage to None clears it."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Q", Answer="A"
        )
        card.QuestionImage.save("temp.png", _make_image("t.png"), save=True)
        self.assertTrue(bool(card.QuestionImage))

        card.QuestionImage = None
        card.save()
        card.refresh_from_db()
        self.assertFalse(bool(card.QuestionImage))

    def test_clear_answer_image(self):
        """Setting AnswerImage to None clears it."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Q", Answer="A"
        )
        card.AnswerImage.save("temp.png", _make_image("t.png"), save=True)
        self.assertTrue(bool(card.AnswerImage))

        card.AnswerImage = None
        card.save()
        card.refresh_from_db()
        self.assertFalse(bool(card.AnswerImage))


# ─── Serializer Tests ────────────────────────────────────────────────────────


class FlashcardSerializerTest(TestCase):
    """Test FlashcardSerializer validation for image fields."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="ser@test.com", username="sertester", password="pass1234"
        )
        self.deck = Deck.objects.create(
            DeckName="Serializer Deck", UserID=self.user, IsPublic=True
        )

    def test_serializer_accepts_valid_image(self):
        """Serializer should accept an image under 5MB."""
        from deck.serializers import FlashcardSerializer

        small_img = _make_image("small.png", size=(10, 10))
        data = {
            "Question": "Valid image card",
            "Answer": "Yes",
            "QuestionImage": small_img,
        }
        serializer = FlashcardSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_rejects_oversized_image(self):
        """Serializer should reject an image over 5MB."""
        from deck.serializers import FlashcardSerializer

        # Create a large fake file (>5MB)
        big_file = ContentFile(b"x" * (6 * 1024 * 1024), name="big.png")
        data = {
            "Question": "Oversized card",
            "Answer": "No",
            "QuestionImage": big_file,
        }
        serializer = FlashcardSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("QuestionImage", serializer.errors)

    def test_serializer_accepts_no_image(self):
        """Serializer should accept data without any image fields."""
        from deck.serializers import FlashcardSerializer

        data = {"Question": "Text only", "Answer": "No image"}
        serializer = FlashcardSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


# ─── Deck API Tests ─────────────────────────────────────────────────────────


@override_settings(MEDIA_ROOT="/tmp/neurodeck_test_media/")
class DeckAPITest(TestCase):
    """Test deck/card API endpoints for image support."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="api@test.com", username="apitester", password="pass1234"
        )
        # Authenticate with JWT
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        self.deck = Deck.objects.create(
            DeckName="API Test Deck", UserID=self.user, IsPublic=True
        )

    # ── List cards returns image URLs ───────────────────────────────────

    def test_list_cards_includes_image_urls(self):
        """GET /decks/<id>/cards/ should include QuestionImage and AnswerImage URLs."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Q with image", Answer="A with image"
        )
        card.QuestionImage.save("list_q.png", _make_image("lq.png"), save=True)
        card.AnswerImage.save("list_a.png", _make_image("la.png"), save=True)

        resp = self.client.get(f"/deck/api/decks/{self.deck.DeckID}/cards/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data), 1)
        # Image URLs should be present (non-null strings)
        self.assertIsNotNone(data[0].get("QuestionImage"))
        self.assertIsNotNone(data[0].get("AnswerImage"))

    def test_list_cards_image_fields_null_when_absent(self):
        """GET /decks/<id>/cards/ should return null for images when card has none."""
        Flashcard.objects.create(
            DeckID=self.deck, Question="No image Q", Answer="No image A"
        )

        resp = self.client.get(f"/deck/api/decks/{self.deck.DeckID}/cards/")
        data = resp.json()
        self.assertIsNone(data[0].get("QuestionImage"))
        self.assertIsNone(data[0].get("AnswerImage"))

    # ── Create card with image ─────────────────────────────────────────

    def test_create_card_with_question_image(self):
        """POST /decks/<id>/cards/create/ with multipart form data saves QuestionImage."""
        img = _make_image("create_q.png")
        resp = self.client.post(
            f"/deck/api/decks/{self.deck.DeckID}/cards/create/",
            {
                "Question": "Identify this",
                "Answer": "Nucleus",
                "QuestionImage": img,
            },
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(resp.json().get("QuestionImage"))

        # Verify in database
        card = Flashcard.objects.get(CardID=resp.json()["CardID"])
        self.assertTrue(bool(card.QuestionImage))

    def test_create_card_with_both_images(self):
        """POST create with both QuestionImage and AnswerImage via multipart."""
        q_img = _make_image("cq.png")
        a_img = _make_image("ca.png", color=(239, 68, 68))
        resp = self.client.post(
            f"/deck/api/decks/{self.deck.DeckID}/cards/create/",
            {
                "Question": "Both images",
                "Answer": "See diagrams",
                "QuestionImage": q_img,
                "AnswerImage": a_img,
            },
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertIsNotNone(data.get("QuestionImage"))
        self.assertIsNotNone(data.get("AnswerImage"))

    def test_create_card_text_only_still_works(self):
        """POST create with JSON (no images) should still work as before."""
        resp = self.client.post(
            f"/deck/api/decks/{self.deck.DeckID}/cards/create/",
            {"Question": "Text only Q", "Answer": "Text only A"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.json().get("QuestionImage"))
        self.assertIsNone(resp.json().get("AnswerImage"))

    # ── Update card: add/clear images ──────────────────────────────────

    def test_update_card_add_image(self):
        """PATCH with multipart data adds an image to an existing text-only card."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Add image later", Answer="OK"
        )
        self.assertFalse(bool(card.QuestionImage))

        img = _make_image("update_q.png")
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"QuestionImage": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.json().get("QuestionImage"))

        card.refresh_from_db()
        self.assertTrue(bool(card.QuestionImage))

    def test_update_card_clear_image(self):
        """PATCH with clear_QuestionImage=true removes the image."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Clear me", Answer="OK"
        )
        card.QuestionImage.save("clear_me.png", _make_image("cm.png"), save=True)
        self.assertTrue(bool(card.QuestionImage))

        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"clear_QuestionImage": "true"},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        card.refresh_from_db()
        self.assertFalse(bool(card.QuestionImage))

    def test_update_card_clear_answer_image(self):
        """PATCH with clear_AnswerImage=true removes the answer image."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Q", Answer="A"
        )
        card.AnswerImage.save("clear_a.png", _make_image("ca.png"), save=True)
        self.assertTrue(bool(card.AnswerImage))

        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"clear_AnswerImage": "true"},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        card.refresh_from_db()
        self.assertFalse(bool(card.AnswerImage))

    def test_update_card_text_only_patch(self):
        """PATCH with JSON (no images) should still update text fields."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Old Q", Answer="Old A"
        )
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"Question": "New Q", "Answer": "New A"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["Question"], "New Q")
        self.assertEqual(resp.json()["Answer"], "New A")

    def test_update_card_replace_image(self):
        """PATCH with a new image file replaces the existing one."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Replace img", Answer="OK"
        )
        card.QuestionImage.save("old.png", _make_image("old.png"), save=True)
        old_name = card.QuestionImage.name

        new_img = _make_image("new.png", color=(255, 0, 0))
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"QuestionImage": new_img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        card.refresh_from_db()
        self.assertTrue(bool(card.QuestionImage))
        # The filename should have changed
        self.assertNotEqual(card.QuestionImage.name, old_name)


# ─── Solo Session API Tests ─────────────────────────────────────────────────


@override_settings(MEDIA_ROOT="/tmp/neurodeck_test_media/")
class SoloSessionAPITest(TestCase):
    """Test that solo start-session includes image URLs in card data."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="solo@test.com", username="solotester", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        self.deck = Deck.objects.create(
            DeckName="Solo Test Deck", UserID=self.user, IsPublic=True
        )

    def test_solo_session_includes_image_urls(self):
        """start-session should return QuestionImage and AnswerImage for each card."""
        card = Flashcard.objects.create(
            DeckID=self.deck, Question="Solo image Q", Answer="Solo image A"
        )
        card.QuestionImage.save("solo_q.png", _make_image("sq.png"), save=True)
        card.AnswerImage.save("solo_a.png", _make_image("sa.png"), save=True)

        resp = self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cards = resp.json()["cards"]
        self.assertEqual(len(cards), 1)
        self.assertIsNotNone(cards[0].get("QuestionImage"))
        self.assertIsNotNone(cards[0].get("AnswerImage"))

    def test_solo_session_null_images_when_absent(self):
        """start-session should return null for QuestionImage/AnswerImage on text-only cards."""
        Flashcard.objects.create(
            DeckID=self.deck, Question="Text only Q", Answer="Text only A"
        )

        resp = self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        cards = resp.json()["cards"]
        self.assertIsNone(cards[0].get("QuestionImage"))
        self.assertIsNone(cards[0].get("AnswerImage"))


# ─── Multiplayer API Tests ──────────────────────────────────────────────────


@override_settings(MEDIA_ROOT="/tmp/neurodeck_test_media/")
class MultiplayerFlashcardAPITest(TestCase):
    """Test that multiplayer flashcard endpoints handle images correctly.

    Key security requirement: QuestionImage is sent to clients, but
    AnswerImage is NOT — it is only revealed in the submit-answer feedback.
    """

    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            email="host@test.com", username="hostuser", password="pass1234"
        )
        self.player = User.objects.create_user(
            email="player@test.com", username="playeruser", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken

        self.host_token = RefreshToken.for_user(self.host).access_token
        self.player_token = RefreshToken.for_user(self.player).access_token

        self.deck = Deck.objects.create(
            DeckName="MP Test Deck", UserID=self.host, IsPublic=True
        )
        # Create a card with both images
        self.card = Flashcard.objects.create(
            DeckID=self.deck, Question="MP image Q", Answer="MP image A"
        )
        self.card.QuestionImage.save("mp_q.png", _make_image("mq.png"), save=True)
        self.card.AnswerImage.save("mp_a.png", _make_image("ma.png"), save=True)

        # Create a room and start a game
        self.room = MultiplayerRoom.objects.create(
            Deck=self.deck, Host=self.host, RoomCode="TEST01", Status="playing"
        )
        RoomParticipant.objects.create(Room=self.room, User=self.host, Score=0)
        RoomParticipant.objects.create(Room=self.room, User=self.player, Score=0)
        # Set card order to include our card
        self.room.set_card_order([self.card.CardID])
        self.room.TotalRounds = 1
        self.room.CurrentCardIndex = 0
        self.room.save()

    def test_get_flashcard_includes_question_image(self):
        """GET flashcard should include QuestionImage URL."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        resp = self.client.get(f"/multiplayer/{self.room.RoomCode}/flashcard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("QuestionImage", data)
        self.assertIsNotNone(data["QuestionImage"])

    def test_get_flashcard_excludes_answer_image(self):
        """GET flashcard should NOT include AnswerImage (prevents cheating)."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        resp = self.client.get(f"/multiplayer/{self.room.RoomCode}/flashcard/")
        data = resp.json()
        self.assertNotIn("AnswerImage", data)

    def test_get_flashcard_excludes_answer_text(self):
        """GET flashcard should NOT include Answer text (existing security)."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        resp = self.client.get(f"/multiplayer/{self.room.RoomCode}/flashcard/")
        data = resp.json()
        self.assertNotIn("Answer", data)

    def test_submit_answer_includes_correct_answer_image(self):
        """submit-answer should include correct_answer_image in feedback."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/submit-answer/",
            {
                "room_code": self.room.RoomCode,
                "card_id": self.card.CardID,
                "answer": "wrong answer",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertFalse(data["is_correct"])
        # The correct_answer should be present (existing behaviour)
        self.assertIn("correct_answer", data)
        # The correct_answer_image should also be present
        self.assertIn("correct_answer_image", data)
        self.assertIsNotNone(data["correct_answer_image"])

    def test_submit_answer_correct_no_answer_image(self):
        """When answer is correct, correct_answer_image still present but not critical."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/submit-answer/",
            {
                "room_code": self.room.RoomCode,
                "card_id": self.card.CardID,
                "answer": "MP image A",
            },
            format="json",
        )
        data = resp.json()
        self.assertTrue(data["is_correct"])
        # correct_answer_image field should exist even for correct answers
        self.assertIn("correct_answer_image", data)

    def test_submit_answer_no_image_returns_null(self):
        """correct_answer_image should be null when the card has no AnswerImage."""
        text_card = Flashcard.objects.create(
            DeckID=self.deck, Question="Text Q", Answer="Text A"
        )
        # Set up a room with the text-only card
        room2 = MultiplayerRoom.objects.create(
            Deck=self.deck, Host=self.host, RoomCode="TXT01", Status="playing"
        )
        RoomParticipant.objects.create(Room=room2, User=self.player, Score=0)
        room2.set_card_order([text_card.CardID])
        room2.TotalRounds = 1
        room2.CurrentCardIndex = 0
        room2.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/submit-answer/",
            {
                "room_code": room2.RoomCode,
                "card_id": text_card.CardID,
                "answer": "wrong",
            },
            format="json",
        )
        data = resp.json()
        self.assertIn("correct_answer_image", data)
        self.assertIsNone(data["correct_answer_image"])

    def test_get_flashcard_null_question_image_when_absent(self):
        """QuestionImage should be null for a text-only card."""
        text_card = Flashcard.objects.create(
            DeckID=self.deck, Question="No img Q", Answer="No img A"
        )
        room3 = MultiplayerRoom.objects.create(
            Deck=self.deck, Host=self.host, RoomCode="NIMG1", Status="playing"
        )
        RoomParticipant.objects.create(Room=room3, User=self.host, Score=0)
        room3.set_card_order([text_card.CardID])
        room3.TotalRounds = 1
        room3.CurrentCardIndex = 0
        room3.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        resp = self.client.get(f"/multiplayer/{room3.RoomCode}/flashcard/")
        data = resp.json()
        self.assertIsNone(data.get("QuestionImage"))


# ─── Integration: End-to-End Card Lifecycle ────────────────────────────────


@override_settings(MEDIA_ROOT="/tmp/neurodeck_test_media/")
class CardLifecycleTest(TestCase):
    """End-to-end: create a card with images, list it, update it, delete it."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="lifecycle@test.com", username="lifetester", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        self.deck = Deck.objects.create(
            DeckName="Lifecycle Deck", UserID=self.user, IsPublic=True
        )

    def test_full_card_lifecycle_with_images(self):
        """Create → List → Add image → Clear image → Delete card."""
        # 1. Create a text-only card
        resp = self.client.post(
            f"/deck/api/decks/{self.deck.DeckID}/cards/create/",
            {"Question": "Lifecycle Q", "Answer": "Lifecycle A"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        card_id = resp.json()["CardID"]
        self.assertIsNone(resp.json().get("QuestionImage"))
        self.assertIsNone(resp.json().get("AnswerImage"))

        # 2. List cards — should show the card with null images
        resp = self.client.get(f"/deck/api/decks/{self.deck.DeckID}/cards/")
        self.assertEqual(len(resp.json()), 1)
        self.assertIsNone(resp.json()[0].get("QuestionImage"))

        # 3. Add a question image via PATCH
        img = _make_image("lifecycle_q.png")
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card_id}/update/",
            {"QuestionImage": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.json().get("QuestionImage"))

        # 4. Clear the question image
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card_id}/update/",
            {"clear_QuestionImage": "true"},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.json().get("QuestionImage"))

        # 5. Delete the card
        resp = self.client.delete(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card_id}/delete/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Flashcard.objects.filter(CardID=card_id).count(), 0)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTHENTICATION TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class AuthTest(TestCase):
    """Test user registration, login, and JWT token flow."""

    def setUp(self):
        self.client = APIClient()

    def test_register_user(self):
        """POST /api/register/ creates a new user successfully."""
        resp = self.client.post(
            "/api/register/",
            {
                "email": "newuser@test.com",
                "username": "newuser",
                "password": "SecurePass123!",
                "password2": "SecurePass123!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="newuser@test.com").exists())

    def test_register_password_mismatch(self):
        """Registration fails when passwords don't match."""
        resp = self.client.post(
            "/api/register/",
            {
                "email": "bad@test.com",
                "username": "baduser",
                "password": "Pass1!",
                "password2": "Different2!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        """Registration fails when email is already taken."""
        User.objects.create_user(email="taken@test.com", username="taken", password="pass1234")
        resp = self.client.post(
            "/api/register/",
            {
                "email": "taken@test.com",
                "username": "another",
                "password": "Pass1234!",
                "password2": "Pass1234!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        """POST /api/token/ returns access and refresh tokens."""
        User.objects.create_user(email="login@test.com", username="loginuser", password="pass1234")
        resp = self.client.post(
            "/api/token/",
            {"email": "login@test.com", "password": "pass1234"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.json())
        self.assertIn("refresh", resp.json())

    def test_login_wrong_password(self):
        """Login fails with incorrect password."""
        User.objects.create_user(email="wrong@test.com", username="wronguser", password="pass1234")
        resp = self.client.post(
            "/api/token/",
            {"email": "wrong@test.com", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_endpoint_requires_token(self):
        """Authenticated endpoints reject requests without a token."""
        resp = self.client.get("/deck/api/decks/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_endpoint_with_valid_token(self):
        """Authenticated endpoints accept requests with a valid JWT token."""
        user = User.objects.create_user(email="auth@test.com", username="authuser", password="pass1234")
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.get("/deck/api/decks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DECK CRUD TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class DeckCRUDTest(TestCase):
    """Test deck creation, listing, updating, and deletion."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="deck@test.com", username="deckuser", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_create_deck(self):
        """POST /decks/create/ creates a new deck."""
        resp = self.client.post(
            "/deck/api/decks/create/",
            {"DeckName": "My Deck", "Description": "Test desc", "Category": "Science"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["DeckName"], "My Deck")
        self.assertTrue(Deck.objects.filter(DeckName="My Deck").exists())

    def test_list_decks(self):
        """GET /decks/ returns only the authenticated user's decks."""
        other_user = User.objects.create_user(email="other@test.com", username="other", password="pass")
        Deck.objects.create(DeckName="My Deck", UserID=self.user)
        Deck.objects.create(DeckName="Other Deck", UserID=other_user)

        resp = self.client.get("/deck/api/decks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["DeckName"], "My Deck")

    def test_update_deck(self):
        """PATCH /decks/<id>/update/ modifies allowed fields."""
        deck = Deck.objects.create(DeckName="Old Name", UserID=self.user)
        resp = self.client.patch(
            f"/deck/api/decks/{deck.DeckID}/update/",
            {"DeckName": "New Name", "Category": "Math"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["DeckName"], "New Name")
        self.assertEqual(resp.json()["Category"], "Math")

    def test_update_deck_ignores_disallowed_fields(self):
        """PATCH ignores fields not in the allowed set (e.g., DeckID)."""
        deck = Deck.objects.create(DeckName="Protected", UserID=self.user)
        original_id = deck.DeckID
        resp = self.client.patch(
            f"/deck/api/decks/{original_id}/update/",
            {"DeckID": "HACKED", "DeckName": "Updated"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        deck.refresh_from_db()
        self.assertEqual(deck.DeckID, original_id)  # Not changed

    def test_delete_deck(self):
        """DELETE /decks/<id>/delete/ removes the deck."""
        deck = Deck.objects.create(DeckName="Delete Me", UserID=self.user)
        resp = self.client.delete(f"/deck/api/decks/{deck.DeckID}/delete/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(Deck.objects.filter(DeckID=deck.DeckID).exists())

    def test_delete_other_users_deck_forbidden(self):
        """Users cannot delete decks they don't own."""
        other = User.objects.create_user(email="owner@test.com", username="owner", password="pass")
        deck = Deck.objects.create(DeckName="Not Yours", UserID=other)
        resp = self.client.delete(f"/deck/api/decks/{deck.DeckID}/delete/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_other_users_deck_forbidden(self):
        """Users cannot update decks they don't own."""
        other = User.objects.create_user(email="owner2@test.com", username="owner2", password="pass")
        deck = Deck.objects.create(DeckName="Not Yours", UserID=other)
        resp = self.client.patch(
            f"/deck/api/decks/{deck.DeckID}/update/",
            {"DeckName": "Hacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_deck_auto_generates_id(self):
        """Deck IDs are auto-generated in the format DECK-NNNN."""
        resp = self.client.post(
            "/deck/api/decks/create/",
            {"DeckName": "Auto ID Deck"},
            format="json",
        )
        self.assertTrue(resp.json()["DeckID"].startswith("DECK-"))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CARD CRUD TESTS (non-image)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class CardCRUDTest(TestCase):
    """Test card creation, listing, updating, and deletion (text-only)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="card@test.com", username="carduser", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        self.deck = Deck.objects.create(DeckName="Card Deck", UserID=self.user)

    def test_create_card(self):
        """POST /decks/<id>/cards/create/ creates a flashcard."""
        resp = self.client.post(
            f"/deck/api/decks/{self.deck.DeckID}/cards/create/",
            {"Question": "What is 2+2?", "Answer": "4"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["Question"], "What is 2+2?")
        self.assertEqual(resp.json()["Answer"], "4")
        self.assertEqual(Flashcard.objects.filter(DeckID=self.deck).count(), 1)

    def test_list_cards(self):
        """GET /decks/<id>/cards/ lists all cards in a deck."""
        Flashcard.objects.create(DeckID=self.deck, Question="Q1", Answer="A1")
        Flashcard.objects.create(DeckID=self.deck, Question="Q2", Answer="A2")
        resp = self.client.get(f"/deck/api/decks/{self.deck.DeckID}/cards/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()), 2)

    def test_list_cards_other_deck_forbidden(self):
        """Users cannot list cards in decks they don't own."""
        other = User.objects.create_user(email="other3@test.com", username="other3", password="pass")
        other_deck = Deck.objects.create(DeckName="Private", UserID=other)
        Flashcard.objects.create(DeckID=other_deck, Question="Q", Answer="A")
        resp = self.client.get(f"/deck/api/decks/{other_deck.DeckID}/cards/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_card_text(self):
        """PATCH updates Question and Answer text."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Old Q", Answer="Old A")
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"Question": "New Q", "Answer": "New A"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["Question"], "New Q")
        self.assertEqual(resp.json()["Answer"], "New A")

    def test_update_card_partial(self):
        """PATCH can update just Question without touching Answer."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Original", Answer="Keep This")
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/update/",
            {"Question": "Updated"},
            format="json",
        )
        self.assertEqual(resp.json()["Question"], "Updated")
        self.assertEqual(resp.json()["Answer"], "Keep This")

    def test_delete_card(self):
        """DELETE removes a flashcard."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Bye", Answer="Gone")
        resp = self.client.delete(
            f"/deck/api/decks/{self.deck.DeckID}/cards/{card.CardID}/delete/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(Flashcard.objects.filter(CardID=card.CardID).exists())

    def test_create_card_nonexistent_deck(self):
        """Creating a card in a non-existent deck returns 404."""
        resp = self.client.post(
            "/deck/api/decks/DECK-9999/cards/create/",
            {"Question": "Q", "Answer": "A"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_card_other_users_deck(self):
        """Users cannot update cards in decks they don't own."""
        other = User.objects.create_user(email="other4@test.com", username="other4", password="pass")
        other_deck = Deck.objects.create(DeckName="Not Yours", UserID=other)
        card = Flashcard.objects.create(DeckID=other_deck, Question="Q", Answer="A")
        resp = self.client.patch(
            f"/deck/api/decks/{other_deck.DeckID}/cards/{card.CardID}/update/",
            {"Question": "Hacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DECK SETTINGS TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class DeckSettingsTest(TestCase):
    """Test deck settings endpoints (daily limits)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="settings@test.com", username="settingsuser", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        self.deck = Deck.objects.create(DeckName="Settings Deck", UserID=self.user)

    def test_get_default_settings(self):
        """GET settings returns defaults after deck creation."""
        resp = self.client.get(f"/deck/api/decks/{self.deck.DeckID}/settings/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["max_new_per_day"], 20)
        self.assertEqual(data["max_learning_per_day"], 20)
        self.assertEqual(data["max_review_per_day"], 100)

    def test_update_settings(self):
        """PATCH settings updates daily limits."""
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/settings/",
            {"max_new_per_day": 5, "max_review_per_day": 50},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["max_new_per_day"], 5)
        self.assertEqual(resp.json()["max_review_per_day"], 50)
        # Unchanged field
        self.assertEqual(resp.json()["max_learning_per_day"], 20)

    def test_settings_negative_value_rejected(self):
        """PATCH settings rejects negative values."""
        resp = self.client.patch(
            f"/deck/api/decks/{self.deck.DeckID}/settings/",
            {"max_new_per_day": -1},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_settings_nonexistent_deck(self):
        """GET settings for a non-existent deck returns 404."""
        resp = self.client.get("/deck/api/decks/DECK-9999/settings/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SOLO SESSION TESTS (non-image)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class SoloSessionTest(TestCase):
    """Test solo study session: start-session, rate-card, study-stats."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="solo2@test.com", username="solo2user", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        self.deck = Deck.objects.create(DeckName="Solo Deck", UserID=self.user)

    def _add_card(self, question="Q?", answer="A"):
        return Flashcard.objects.create(DeckID=self.deck, Question=question, Answer=answer)

    def test_start_session_returns_cards(self):
        """start-session returns due cards for the user's deck."""
        self._add_card("What is 1+1?", "2")
        resp = self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data["cards"]), 1)
        self.assertEqual(data["cards"][0]["Question"], "What is 1+1?")
        self.assertEqual(data["cards"][0]["Answer"], "2")

    def test_start_session_empty_deck(self):
        """start-session returns empty cards list when deck has no cards."""
        resp = self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()["cards"]), 0)

    def test_start_session_nonexistent_deck(self):
        """start-session returns 404 for a non-existent deck."""
        resp = self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": "DECK-9999"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_rate_card_transitions_state(self):
        """rate-card updates CardProgress state from 'new' to 'learning'."""
        card = self._add_card()
        # Start session to create CardProgress
        self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        # Rate the card (1 = Again)
        resp = self.client.post(
            "/deck/api/solo/rate-card/",
            {"card_id": card.CardID, "rating": 1},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("scheduling", data)
        self.assertIn("previews", data)
        # The card should have progressed from 'new'
        progress = CardProgress.objects.get(UserID=self.user, CardID=card)
        self.assertNotEqual(progress.State, "new")

    def test_rate_card_good_rating(self):
        """Rating 3 (Good) should schedule a review in the future."""
        card = self._add_card()
        self.client.post("/deck/api/solo/start-session/", {"deck_id": self.deck.DeckID}, format="json")
        resp = self.client.post(
            "/deck/api/solo/rate-card/",
            {"card_id": card.CardID, "rating": 3},
            format="json",
        )
        data = resp.json()
        self.assertTrue(data["scheduling"]["interval_days"] > 0)

    def test_rate_card_invalid_rating(self):
        """rate-card rejects invalid ratings."""
        card = self._add_card()
        resp = self.client.post(
            "/deck/api/solo/rate-card/",
            {"card_id": card.CardID, "rating": 5},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rate_card_nonexistent_card(self):
        """rate-card returns 404 for a non-existent card."""
        resp = self.client.post(
            "/deck/api/solo/rate-card/",
            {"card_id": 99999, "rating": 3},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_study_stats(self):
        """study-stats returns correct structure."""
        self._add_card()
        resp = self.client.get(f"/deck/api/decks/{self.deck.DeckID}/study-stats/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("card_counts", data)
        self.assertIn("due_today", data)
        self.assertIn("studied_today", data)
        self.assertIn("limits", data)
        self.assertIn("remaining", data)

    def test_start_session_days_ahead(self):
        """start-session with days_ahead includes cards due within that window."""
        self._add_card("Due soon", "Answer")
        resp = self.client.post(
            "/deck/api/solo/start-session/",
            {"deck_id": self.deck.DeckID, "days_ahead": 7},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()["cards"]), 1)

    def test_solo_session_complete(self):
        """solo/complete/ records session completion."""
        self._add_card()
        resp = self.client.post(
            "/deck/api/solo/complete/",
            {"deck_id": self.deck.DeckID, "cards_studied": 5, "correct_count": 3, "total_count": 5},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("new_achievements", resp.json())


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MULTIPLAYER ROOM LIFECYCLE TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class MultiplayerRoomTest(TestCase):
    """Test multiplayer room creation, joining, starting, and ending."""

    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            email="mphost@test.com", username="mphost", password="pass1234"
        )
        self.player = User.objects.create_user(
            email="mpplayer@test.com", username="mpplayer", password="pass1234"
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        self.host_token = RefreshToken.for_user(self.host).access_token
        self.player_token = RefreshToken.for_user(self.player).access_token

        self.deck = Deck.objects.create(DeckName="MP Deck", UserID=self.host)
        # Add a few cards
        for i in range(3):
            Flashcard.objects.create(
                DeckID=self.deck, Question=f"Q{i+1}", Answer=f"A{i+1}"
            )

    def test_create_room(self):
        """POST /multiplayer/create-room/ creates a room."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        resp = self.client.post(
            "/multiplayer/create-room/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertIn("RoomCode", data)
        self.assertEqual(data["Status"], "waiting")

    def test_join_room(self):
        """POST /multiplayer/join-room/ lets another user join."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        create_resp = self.client.post(
            "/multiplayer/create-room/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        room_code = create_resp.json()["RoomCode"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/join-room/",
            {"room_code": room_code},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()["participants"]), 2)

    def test_start_game(self):
        """Host can start a game; status transitions to 'playing'."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        create_resp = self.client.post(
            "/multiplayer/create-room/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        room_code = create_resp.json()["RoomCode"]

        resp = self.client.post(
            f"/multiplayer/{room_code}/start/",
            {"rounds": 3},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["Status"], "playing")

    def test_non_host_cannot_start_game(self):
        """Non-host users cannot start a game."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        create_resp = self.client.post(
            "/multiplayer/create-room/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        room_code = create_resp.json()["RoomCode"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        self.client.post("/multiplayer/join-room/", {"room_code": room_code}, format="json")

        resp = self.client.post(f"/multiplayer/{room_code}/start/", format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_answer_correct(self):
        """Submitting the correct answer increments the player's score."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Capital of France?", Answer="Paris")
        room = MultiplayerRoom.objects.create(
            Deck=self.deck, Host=self.host, RoomCode="ANS01", Status="playing"
        )
        RoomParticipant.objects.create(Room=room, User=self.player, Score=0)
        room.set_card_order([card.CardID])
        room.TotalRounds = 1
        room.CurrentCardIndex = 0
        room.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/submit-answer/",
            {"room_code": room.RoomCode, "card_id": card.CardID, "answer": "Paris"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertTrue(data["is_correct"])
        self.assertEqual(data["score"], 1)

    def test_submit_answer_incorrect(self):
        """Submitting a wrong answer does not increment the score."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Capital of France?", Answer="Paris")
        room = MultiplayerRoom.objects.create(
            Deck=self.deck, Host=self.host, RoomCode="ANS02", Status="playing"
        )
        RoomParticipant.objects.create(Room=room, User=self.player, Score=0)
        room.set_card_order([card.CardID])
        room.TotalRounds = 1
        room.CurrentCardIndex = 0
        room.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/submit-answer/",
            {"room_code": room.RoomCode, "card_id": card.CardID, "answer": "London"},
            format="json",
        )
        data = resp.json()
        self.assertFalse(data["is_correct"])
        self.assertEqual(data["correct_answer"], "Paris")
        self.assertEqual(data["score"], 0)

    def test_submit_answer_case_insensitive(self):
        """Answer matching is case-insensitive and strips whitespace."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="2+2?", Answer="Four")
        room = MultiplayerRoom.objects.create(
            Deck=self.deck, Host=self.host, RoomCode="ANS03", Status="playing"
        )
        RoomParticipant.objects.create(Room=room, User=self.player, Score=0)
        room.set_card_order([card.CardID])
        room.TotalRounds = 1
        room.CurrentCardIndex = 0
        room.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.player_token}")
        resp = self.client.post(
            "/multiplayer/submit-answer/",
            {"room_code": room.RoomCode, "card_id": card.CardID, "answer": "  four  "},
            format="json",
        )
        self.assertTrue(resp.json()["is_correct"])

    def test_end_game(self):
        """Host can end a game; status transitions to 'finished'."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        create_resp = self.client.post(
            "/multiplayer/create-room/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        room_code = create_resp.json()["RoomCode"]
        self.client.post(f"/multiplayer/{room_code}/start/", format="json")

        resp = self.client.post(f"/multiplayer/{room_code}/end/", format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["Status"], "finished")

    def test_leave_room(self):
        """POST /multiplayer/leave-room/ marks the user as inactive."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        create_resp = self.client.post(
            "/multiplayer/create-room/",
            {"deck_id": self.deck.DeckID},
            format="json",
        )
        room_code = create_resp.json()["RoomCode"]

        resp = self.client.post(
            "/multiplayer/leave-room/",
            {"room_code": room_code},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_list_decks_for_room(self):
        """GET /multiplayer/decks/ returns the authenticated user's decks."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.host_token}")
        resp = self.client.get("/multiplayer/decks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["DeckName"], "MP Deck")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DECK MODEL TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class DeckModelTest(TestCase):
    """Test Deck model behaviour."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="deckmodel@test.com", username="deckmodeluser", password="pass1234"
        )

    def test_deck_auto_id(self):
        """Deck ID is auto-generated in DECK-NNNN format."""
        deck = Deck.objects.create(DeckName="Auto ID", UserID=self.user)
        self.assertTrue(deck.DeckID.startswith("DECK-"))

    def test_deck_cascade_delete_cards(self):
        """Deleting a deck cascades to its flashcards."""
        deck = Deck.objects.create(DeckName="Cascade", UserID=self.user)
        card = Flashcard.objects.create(DeckID=deck, Question="Q", Answer="A")
        deck.delete()
        self.assertFalse(Flashcard.objects.filter(CardID=card.CardID).exists())

    def test_deck_settings_auto_created(self):
        """DeckSettings is auto-created when a new Deck is saved."""
        deck = Deck.objects.create(DeckName="Settings Auto", UserID=self.user)
        self.assertTrue(hasattr(deck, 'settings'))
        self.assertEqual(deck.settings.MaxNewPerDay, 20)

    def test_deck_str(self):
        """Deck __str__ includes deck name and owner."""
        deck = Deck.objects.create(DeckName="My Deck", UserID=self.user)
        self.assertIn("My Deck", str(deck))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLASHCARD MODEL TESTS (non-image)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class FlashcardModelNonImageTest(TestCase):
    """Test Flashcard model behaviour (non-image fields)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="cardmodel@test.com", username="cardmodeluser", password="pass1234"
        )
        self.deck = Deck.objects.create(DeckName="Card Model Deck", UserID=self.user)

    def test_flashcard_str(self):
        """Flashcard __str__ includes card ID and deck name."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Test Q", Answer="Test A")
        self.assertIn("Card", str(card))

    def test_flashcard_default_answer(self):
        """Flashcard Answer defaults to 'None' when not provided."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Q only")
        self.assertEqual(card.Answer, "None")

    def test_flashcard_nullable_answer(self):
        """Flashcard Answer can be set to null."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Q", Answer=None)
        self.assertIsNone(card.Answer)

    def test_flashcard_auto_timestamps(self):
        """FlashDateCreated and LastReviewed are auto-set."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Timestamps", Answer="Test")
        self.assertIsNotNone(card.FlashDateCreated)
        self.assertIsNotNone(card.LastReviewed)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CARD PROGRESS / SPACED REPETITION TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class CardProgressTest(TestCase):
    """Test CardProgress model and SM-2 scheduling behaviour."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="progress@test.com", username="progressuser", password="pass1234"
        )
        self.deck = Deck.objects.create(DeckName="Progress Deck", UserID=self.user)

    def test_card_progress_defaults(self):
        """CardProgress defaults to 'new' state with EF=2.5."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Q", Answer="A")
        progress = CardProgress.objects.create(UserID=self.user, CardID=card)
        self.assertEqual(progress.State, "new")
        self.assertEqual(progress.EF, 2.5)
        self.assertEqual(progress.Repetitions, 0)
        self.assertFalse(progress.Mastered)

    def test_card_progress_unique_together(self):
        """Each user can have only one progress record per card."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Q", Answer="A")
        CardProgress.objects.create(UserID=self.user, CardID=card)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            CardProgress.objects.create(UserID=self.user, CardID=card)

    def test_rate_again_requeues(self):
        """Rating 1 (Again) should indicate the card is requeued."""
        card = Flashcard.objects.create(DeckID=self.deck, Question="Q", Answer="A")
        self.client = APIClient()
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Start session first
        self.client.post("/deck/api/solo/start-session/", {"deck_id": self.deck.DeckID}, format="json")

        resp = self.client.post(
            "/deck/api/solo/rate-card/",
            {"card_id": card.CardID, "rating": 1},
            format="json",
        )
        data = resp.json()
        self.assertTrue(data["scheduling"]["requeue"])