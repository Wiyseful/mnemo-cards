import type {Card} from "@/scheduler/types";
import {SAMPLE_DECK_ID} from "./sampleCards";

const STORAGE_KEY = "mnemo-cards";

export function saveCards(cards: Card[]) {
    const cardsAsText = JSON.stringify(cards);
    localStorage.setItem(STORAGE_KEY, cardsAsText);
}

export function loadSavedCards(): Card[] | null {
    const savedCardsText = localStorage.getItem(STORAGE_KEY);
    if (savedCardsText === null) {
        return null;
    }
    const savedCards = (JSON.parse(savedCardsText)) as Card[];
    const migratedCards = savedCards.map((card) => ({...card, deckId: card.deckId ?? SAMPLE_DECK_ID}));
    return migratedCards;
}