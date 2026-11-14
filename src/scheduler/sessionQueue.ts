import type { Rating, Card } from "./types";

// how many cards later a forgotten card comes back in the same session
export const AGAIN_RETURN_MIN_DISTANCE = 5;
export const AGAIN_RETURN_MAX_DISTANCE = 20;

// the session's line of card ids after the card at the front is rated.
// Again: the card goes back in line a random AGAIN_RETURN_MIN_DISTANCE to AGAIN_RETURN_MAX_DISTANCE spots (or at the end).
// anything else: the card is done for this session
export function queueAfterRating(
    queuedCardIds: string[],
    rating: Rating,
    randomNumber: number = Math.random(),
): string[] {
    const ratedCardId = queuedCardIds[0];
    const remainingCardIds = queuedCardIds.slice(1);

    if (rating !== "Again" || ratedCardId === undefined) {
        return remainingCardIds;
    }

    const distanceRange = AGAIN_RETURN_MAX_DISTANCE - AGAIN_RETURN_MIN_DISTANCE + 1;
    const returnDistance = AGAIN_RETURN_MIN_DISTANCE + Math.floor(randomNumber * distanceRange);
    const returnPosition = Math.min(returnDistance, remainingCardIds.length);
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