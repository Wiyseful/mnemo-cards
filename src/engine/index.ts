import createEngine from "./generated/fsrs.js";
import type { MemoryState } from "./generated/fsrs.js";
import type { Rating } from "../scheduler/types.js";

export type { MemoryState };

// loads wasm file once when this file is imported
const engine = await createEngine();

export function retrievability(stability: number, daysElapsed: number): number {
    return engine.retrievability(stability, daysElapsed);
}

export function nextInterval(stability: number, desiredRetention: number): number {
    return engine.nextInterval(stability, desiredRetention);
}

export function initialState(rating: Rating): MemoryState {
    return engine.initialState(engine.Rating[rating]);
}

export function review(state: MemoryState, daysElapsed: number, rating: Rating): MemoryState {
    return engine.review(state, daysElapsed, engine.Rating[rating]);
}