import type { Card } from "./types";

// the card that's been due the longest, or undefined if nothing is due yet
export function findNextDueCard(cards: Card[], currentTimeMs: number): Card | undefined {
    const dueCards = cards.filter((card) => card.dueAt <= currentTimeMs);
    dueCards.sort((cardA, cardB) => cardA.dueAt - cardB.dueAt);
    return dueCards[0];
}
