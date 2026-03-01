from django.shortcuts import render, redirect
from .models import Deck, Flashcard
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required


# @login_required
def deck_list(request):
    # decks = Deck.objects.filter(UserID_id=request.user.id)
    decks = Deck.objects.all() # remove this when UserID is added
    return render(request, "deck_list.html", {"decks": decks})


# @login_required
def deck_detail(request, deck_id):
    # deck = Deck.objects.filter(
    #     DeckID=deck_id,
    #     UserID_id=request.user.id
    # ).first()
    deck = Deck.objects.filter(DeckID=deck_id).first() # remove this when UserID is added

    if not deck:
        return redirect("deck_list")
    

    if request.method == "POST":
        Flashcard.objects.create(
            DeckID=deck,
            Question=request.POST.get("Question"),
            Answer=request.POST.get("Answer")
        )
        return redirect("deck_detail", deck_id=deck.DeckID)

    cards = deck.cards.all()
    return render(request, "deck_detail.html", {
        "deck": deck,
        "cards": cards
    })


# @login_required
def create_deck(request):
    if request.method == "POST":
        Deck.objects.create(
            # UserID=request.user,
            DeckName=request.POST.get("DeckName"),
            Description=request.POST.get("Description"),
            Category=request.POST.get("Category"),
            IsPublic=request.POST.get("IsPublic") == "on"
        )
        return redirect("deck_list")

    return render(request, "create_deck.html")


# @login_required
def delete_deck(request, deck_id):
    # deck = Deck.objects.filter(
    #     DeckID=deck_id,
    #     UserID_id=request.user.id
    # ).first()

    deck = Deck.objects.filter(DeckID=deck_id).first() # remove this when UserID is added

    if deck:
        deck.delete()

    return redirect("deck_list")


# @login_required
def add_flashcard(request, deck_id):
    deck = Deck.objects.filter(
        DeckID=deck_id,
        UserID_id=request.user.id
    ).first()

    if not deck:
        return redirect("deck_list")

    if request.method == "POST":
        Flashcard.objects.create(
            DeckID=deck,
            Question=request.POST.get("Question"),
            Answer=request.POST.get("Answer")
        )
        return redirect("deck_detail", deck_id=deck.DeckID)

    return render(request, "add_flashcard.html", {"deck": deck})


# @login_required
def delete_flashcard(request, card_id):
    # card = Flashcard.objects.filter(
    #     CardID=card_id,
    #     DeckID__UserID_id=request.user.id
    # ).first()

    card = Flashcard.objects.filter(CardID=card_id).first() # remove this when UserID is added

    if not card:
        return redirect("deck_list")

    deck_id = card.DeckID.DeckID
    card.delete()
    return redirect("deck_detail", deck_id=deck_id)