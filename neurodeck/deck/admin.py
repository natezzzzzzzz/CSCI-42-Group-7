from django.contrib import admin
from .models import Deck, Flashcard


class FlashcardInline(admin.TabularInline):
    model = Flashcard
    extra = 1


class DeckAdmin(admin.ModelAdmin):
    list_display = ("DeckID", "DeckName", "Category", "IsPublic", "date_created")
    #list_display = ("DeckID", "DeckName", "UserID", "Category", "IsPublic", "date_created")
    search_fields = ("DeckName",)
    #search_fields = ("DeckName", "UserID__username")
    list_filter = ("IsPublic", "Category")
    inlines = [FlashcardInline]


class FlashcardAdmin(admin.ModelAdmin):
    list_display = ("CardID", "DeckID", "Question", "FlashDateCreated")
    search_fields = ("Question", "DeckID__DeckName")


admin.site.register(Deck, DeckAdmin)
admin.site.register(Flashcard, FlashcardAdmin)