import { initialState, nextInterval, review, type MemoryState } from "@/engine";
import { MS_PER_DAY, MS_PER_MINUTE } from "./time";
import type { Card, Rating } from "./types";

// show cards again when the chance of remembering drops to 90%
const DESIRED_RETENTION = 0.9;

// learning steps: fixed wait times used instead of FSRS in these cases
const HARD_DELAY_MINUTES = 5;
const NEW_CARD_GOOD_DELAY_DAYS = 1;
const NEW_CARD_EASY_DELAY_DAYS = 3;

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

// when the card comes back
    let nextDueAt: number;
    if (rating === "Again") {
        nextDueAt = currentTimeMs;
    } else if (hasNeverBeenStudied && rating === "Hard") {
        nextDueAt = currentTimeMs + HARD_DELAY_MINUTES * MS_PER_MINUTE;
    } else if (hasNeverBeenStudied && rating === "Good") {
        nextDueAt = currentTimeMs + NEW_CARD_GOOD_DELAY_DAYS * MS_PER_DAY;
    } else if (hasNeverBeenStudied && rating === "Easy") {
        nextDueAt = currentTimeMs + NEW_CARD_EASY_DELAY_DAYS * MS_PER_DAY;
    } else {
        // every review after the first: FSRS decides, so the gaps keep growing
        nextDueAt = currentTimeMs + daysUntilDue * MS_PER_DAY;
    }
// currentTimeMs + daysUntilDue * MS_PER_DAY
    return {
        ...card,
        stability: newMemory.stability,
        difficulty: newMemory.difficulty,
        lastReviewedAt: currentTimeMs,
        dueAt: nextDueAt,
        reviewCount: card.reviewCount + 1,
        forgetCount: rating === "Again" ? card.forgetCount + 1 : card.forgetCount,
    };
}
