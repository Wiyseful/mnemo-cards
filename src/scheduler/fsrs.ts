import type { Card } from "./types.js";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DECAY = -0.5;
const FACTOR = 19/81;

export function retrievability(card: Card, now: number): number {
    if (card.stability === null || card.lastReview === null) {
        return 0;
    }

    const daysSinceLastReview = (now - card.lastReview) / MS_PER_DAY;

    return Math.pow((1 + FACTOR * daysSinceLastReview / card.stability), DECAY);
}