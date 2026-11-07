import { describe, it, expect } from "vitest";
import { retrievability, nextInterval, initialState, review } from "./index";

describe("engine (wasm)", () => {
    it("matches the C++ forgetting curve", () => {
        expect(retrievability(10, 0)).toBe(1);
        expect(retrievability(10, 10)).toBeCloseTo(0.9, 9);
        expect(nextInterval(10, 0.9)).toBeCloseTo(10, 9);
    });

    it("starts a new card from its first rating", () => {
        expect(initialState("Good").stability).toBeCloseTo(2.3065, 9);
    });

    it("updates a card after a review", () => {
        const after = review({ stability: 10, difficulty: 5 }, 10, "Good");
        expect(after.stability).toBeCloseTo(32.026729482, 6);
        expect(after.difficulty).toBeCloseTo(4.990228369, 6);
    });

    it("throws on bad input", () => {
        expect(() => retrievability(0, 1)).toThrow();
    });
});