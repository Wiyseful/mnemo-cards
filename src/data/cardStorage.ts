import type {Card} from "@/scheduler/types";

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
    return JSON.parse(savedCardsText) as Card[];
}