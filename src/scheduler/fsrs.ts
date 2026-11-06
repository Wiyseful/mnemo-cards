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

export function nextInterval(stability: number, desiredRetention: number): number {
    if (stability <= 0) {
        throw new Error("stability must be > 0");
    }

    if (desiredRetention <= 0 || desiredRetention >= 1) {
        throw new Error("desiredRetention must be between 0 and 1 (exclusive)");
    }

    return (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
}