import { describe, it, expect } from "vitest";
import {averageRecallChance} from './averageRecallChance';
import {MS_PER_DAY} from './time';
import type {Card} from './types';

const TEST_CURRENT_TIME_MS = 1_700_000_000_000;

const unstudiedCard: Card = {
    id: "1",
    front: "Q",
    back: "A",
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    dueAt: 0,
    reviewCount: 0,
    forgetCount: 0,
    studyPhase: "New",
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


