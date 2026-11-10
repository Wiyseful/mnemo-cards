import type { Deck } from "@/scheduler/types";

const STORAGE_KEY = "mnemo-decks";

export function saveDecks(decks: Deck[]) {
    const decksAsText = JSON.stringify(decks);
    localStorage.setItem(STORAGE_KEY, decksAsText);
}

export function loadSavedDecks(): Deck[] | null {
    const savedDecksAsText = localStorage.getItem(STORAGE_KEY);
    if (savedDecksAsText === null) {
        return null;
    }
    const savedDecks = JSON.parse(savedDecksAsText) as Deck[];

    // decks saved before the trash existed have no deletedAt, so mark them as not deleted
    const migratedDecks = savedDecks.map((deck) => ({ ...deck, deletedAt: deck.deletedAt ?? null }));
    return migratedDecks;
}