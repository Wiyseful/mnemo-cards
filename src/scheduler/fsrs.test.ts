import { describe, it, expect } from "vitest";
import { retrievability } from "./fsrs.js";
import type { Card} from "./types.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NOW = 1_700_000_000_000;

function makeCard(overrides: Partial<Card>): Card {
    return {
        id: "1",
        front: "Q",
        back: "A",
        stability: null,
        difficulty: null,
        lastReview: null,
        due: NOW,
        reps: 0,
        lapses: 0,
        ...overrides,
    };
}

describe("retrievability", () => {
    it("returns 0 for a new card", () => {
        const card = makeCard({});
        expect(retrievability(card, NOW)).toBe(0);
    });

    it("returns 1 right after a review", () => {
        const card = makeCard({ stability: 10, lastReview: NOW });
        expect(retrievability(card, NOW)).toBe(1);
    });

    it("returns 0.9 after exactly S days", () => {
        const card = makeCard({ stability: 10, lastReview: NOW - 10 * MS_PER_DAY });
        expect(retrievability(card, NOW)).toBeCloseTo(0.9);
    });
});