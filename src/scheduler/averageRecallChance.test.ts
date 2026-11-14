import { describe, it, expect } from "vitest";
import { averageRecallChance, forgetPercentBy, memoryPercentForecast } from "./averageRecallChance";
import { MS_PER_DAY } from "./time";
import type { Card } from "./types";

const TEST_CURRENT_TIME_MS = 1_700_000_000_000;

const unstudiedCard: Card = {
    id: "1",
    deckId: "test-deck",
    front: "Q",
    back: "A",
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    dueAt: 0,
    reviewCount: 0,
    forgetCount: 0,
    studyPhase: "New",
    deletedAt: null,
};

const cardReviewedJustNow: Card = {
    ...unstudiedCard,
    stability: 10,
    difficulty: 5,
    lastReviewedAt: TEST_CURRENT_TIME_MS,
};

const cardReviewedExactlyStabilityDaysAgo: Card = {
    ...unstudiedCard,
    stability: 10,
    difficulty: 5,
    lastReviewedAt: TEST_CURRENT_TIME_MS - 10 * MS_PER_DAY,
};

describe("averageRecallChance", () => {
    it("returns 0 for an empty deck", () => {
        expect(averageRecallChance([], TEST_CURRENT_TIME_MS)).toBe(0);
    });

    it("returns 1 for a card reviewed just now", () => {
        expect(averageRecallChance([cardReviewedJustNow], TEST_CURRENT_TIME_MS)).toBe(1);
    });

    it("returns 0.9 for a card reviewed S days ago", () => {
        expect(averageRecallChance([cardReviewedExactlyStabilityDaysAgo], TEST_CURRENT_TIME_MS)).toBeCloseTo(0.9);
    });

    it("returns 0 for a deck with only unstudied cards", () => {
        expect(averageRecallChance([unstudiedCard], TEST_CURRENT_TIME_MS)).toBe(0);
    });

    it("returns 0.5 for a deck with one unstudied card and a studied one", () => {
        expect(averageRecallChance([unstudiedCard, cardReviewedJustNow], TEST_CURRENT_TIME_MS)).toBeCloseTo(0.5);
    });
});

describe("memoryPercentForecast", () => {
    it("returns 0 for an empty deck", () => {
        expect(memoryPercentForecast([], TEST_CURRENT_TIME_MS)).toBe(0);
    });

    it("returns 0 for a deck with only unstudied cards", () => {
        expect(memoryPercentForecast([unstudiedCard], TEST_CURRENT_TIME_MS)).toBe(0);
    });

    it("returns a whole number", () => {
        const memoryPercent = memoryPercentForecast([cardReviewedJustNow], TEST_CURRENT_TIME_MS);
        expect(Number.isInteger(memoryPercent)).toBe(true);
    });

    it("is lower than what you'd remember right now, because you forget over time", () => {
        const memoryPercent = memoryPercentForecast([cardReviewedJustNow], TEST_CURRENT_TIME_MS);
        const recallPercentRightNow = averageRecallChance([cardReviewedJustNow], TEST_CURRENT_TIME_MS) * 100;
        expect(memoryPercent).toBeLessThan(recallPercentRightNow);
    });
});
describe("forgetPercentBy", () => {
    it("returns null when nothing has been studied, so there's nothing to forget", () => {
        expect(forgetPercentBy([unstudiedCard], TEST_CURRENT_TIME_MS)).toBeNull();
    });

    it("returns 0 for a card reviewed just now", () => {
        expect(forgetPercentBy([cardReviewedJustNow], TEST_CURRENT_TIME_MS)).toBe(0);
    });

    it("returns 10 for a card reviewed S days ago", () => {
        expect(forgetPercentBy([cardReviewedExactlyStabilityDaysAgo], TEST_CURRENT_TIME_MS)).toBe(10);
    });

    it("ignores unstudied cards instead of counting them as forgotten", () => {
        const deck = [unstudiedCard, cardReviewedExactlyStabilityDaysAgo];
        expect(forgetPercentBy(deck, TEST_CURRENT_TIME_MS)).toBe(10);
    });

    it("grows the further ahead you look", () => {
        const soon = forgetPercentBy([cardReviewedJustNow], TEST_CURRENT_TIME_MS + 3 * MS_PER_DAY)!;
        const later = forgetPercentBy([cardReviewedJustNow], TEST_CURRENT_TIME_MS + 30 * MS_PER_DAY)!;
        expect(later).toBeGreaterThan(soon);
    });
});
