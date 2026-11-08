import loadFsrsEngine from "./generated/fsrs.js";
import type { MemoryState } from "./generated/fsrs.js";
import type { Rating } from "../scheduler/types";

export type { MemoryState };

// loads the C++ engine (WebAssembly) once, when this file is first imported
const fsrsEngine = await loadFsrsEngine();

// chance (0 to 1) you remember a card right now
export function retrievability(stability: number, daysSinceLastReview: number): number {
    return fsrsEngine.retrievability(stability, daysSinceLastReview);
}

// days to wait until your chance of remembering drops to desiredRetention
export function nextInterval(stability: number, desiredRetention: number): number {
    return fsrsEngine.nextInterval(stability, desiredRetention);
}

// memory after the very first review of a brand-new card
export function initialState(rating: Rating): MemoryState {
    return fsrsEngine.initialState(fsrsEngine.Rating[rating]);
}

// memory after any review except the first one
export function review(currentMemory: MemoryState, daysSinceLastReview: number, rating: Rating): MemoryState {
    return fsrsEngine.review(currentMemory, daysSinceLastReview, fsrsEngine.Rating[rating]);
}
