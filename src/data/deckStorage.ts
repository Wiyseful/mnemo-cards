import type {Deck} from "@/scheduler/types";

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
    return JSON.parse(savedDecksAsText) as Deck[];
}