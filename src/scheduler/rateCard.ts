import { initialState, nextInterval, review, type MemoryState } from "@/engine";
import type { Card, Rating } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DESIRED_RETENTION = 0.9;

// returns an updated copy of the card after the user rates it
export function rateCard(card: Card, rating: Rating, now: number): Card {
    const isNew = card.stability === null || card.difficulty === null || card.lastReview === null;

    let state: MemoryState;
    if (isNew) {
        state = initialState(rating);
    } else {
        const daysElapsed = (now - card.lastReview!) / MS_PER_DAY;
        state = review(
            { stability: card.stability!, difficulty: card.difficulty! },
            Math.max(0, daysElapsed),
            rating,
        );
    }

    const daysUntilDue = nextInterval(state.stability, DESIRED_RETENTION);

    return {
        ...card,
        stability: state.stability,
        difficulty: state.difficulty,
        lastReview: now,
        due: now + daysUntilDue * MS_PER_DAY,
        reps: card.reps + 1,
        lapses: rating === "Again" ? card.lapses + 1 : card.lapses,
    };
}