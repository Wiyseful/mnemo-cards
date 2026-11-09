import type { Rating, Card } from "./types";



// how many cards later a forgotten card comes back in the same session
export const AGAIN_RETURN_DISTANCE = 5;

// the session's line of card ids after the card at the front is rated.
// Again: the card goes back in line, AGAIN_RETURN_DISTANCE spots back (or at the end).
// anything else: the card is done for this session
export function queueAfterRating(queuedCardIds: string[], rating: Rating): string[] {
    const ratedCardId = queuedCardIds[0];
    const remainingCardIds = queuedCardIds.slice(1);

    if (rating !== "Again" || ratedCardId === undefined) {
        return remainingCardIds;
    }

    const returnPosition = Math.min(AGAIN_RETURN_DISTANCE, remainingCardIds.length);
    return [
        ...remainingCardIds.slice(0, returnPosition),
        ratedCardId,
        ...remainingCardIds.slice(returnPosition),
    ];
}
// ids of the cards due right now, most overdue first
export function dueCardIdsInOrder(cards: Card[], currentTimeMs: number): string[] {
    return (
        cards
            .filter((card) => card.dueAt <= currentTimeMs)
            .sort((cardA, cardB) => cardA.dueAt - cardB.dueAt)
            .map((card) => card.id)
    );
}