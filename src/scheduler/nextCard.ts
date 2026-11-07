import type { Card } from "./types";

// keep only the cards that are due
// put the earliest one first
// give back the first one
export function nextCard(cards: Card[], now: number): Card | undefined {
    const dueCards = cards.filter((card) => card.due <= now);
    dueCards.sort((a, b) => a.due - b.due);
    return dueCards[0];
}
