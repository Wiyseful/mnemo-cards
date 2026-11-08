import { initialState, nextInterval, review, type MemoryState } from "@/engine";
import { MS_PER_DAY } from "./time";
import type { Card, Rating } from "./types";

// show cards again when the chance of remembering drops to 90%
const DESIRED_RETENTION = 0.9;

// returns a new copy of the card after the user rates it. the original card isn't changed
export function applyRating(card: Card, rating: Rating, currentTimeMs: number): Card {
    const hasNeverBeenStudied =
        card.stability === null || card.difficulty === null || card.lastReviewedAt === null;

    let newMemory: MemoryState;
    if (hasNeverBeenStudied) {
        newMemory = initialState(rating);
    } else {
        const daysSinceLastReview = (currentTimeMs - card.lastReviewedAt!) / MS_PER_DAY;
        newMemory = review(
            { stability: card.stability!, difficulty: card.difficulty! },
            Math.max(0, daysSinceLastReview),
            rating,
        );
    }

    const daysUntilDue = nextInterval(newMemory.stability, DESIRED_RETENTION);

    return {
        ...card,
        stability: newMemory.stability,
        difficulty: newMemory.difficulty,
        lastReviewedAt: currentTimeMs,
        dueAt: currentTimeMs + daysUntilDue * MS_PER_DAY,
        reviewCount: card.reviewCount + 1,
        forgetCount: rating === "Again" ? card.forgetCount + 1 : card.forgetCount,
    };
}
