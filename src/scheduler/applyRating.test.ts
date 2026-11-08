import { describe, it, expect } from "vitest";
import { applyRating } from "./applyRating";
import { MS_PER_DAY } from "./time";
import type { Card } from "./types";

// a fixed point in time, so tests give the same result every run
const TEST_START_TIME_MS = 1_700_000_000_000;

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

describe("applyRating", () => {
    it("gives a new card its first memory state", () => {
        const cardAfterRating = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);
        expect(cardAfterRating.stability).toBeCloseTo(2.3065, 9);
        expect(cardAfterRating.lastReviewedAt).toBe(TEST_START_TIME_MS);
        expect(cardAfterRating.reviewCount).toBe(1);
    });

    it("schedules the card for when recall drops to 90%", () => {
        const cardAfterRating = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);
        const daysUntilDue = (cardAfterRating.dueAt - TEST_START_TIME_MS) / MS_PER_DAY;
        expect(daysUntilDue).toBeCloseTo(cardAfterRating.stability!, 9);
    });

    it("uses the review formula on later reviews", () => {
        const afterFirstReview = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);
        const afterSecondReview = applyRating(afterFirstReview, "Good", afterFirstReview.dueAt);
        expect(afterSecondReview.stability!).toBeGreaterThan(afterFirstReview.stability!);
        expect(afterSecondReview.reviewCount).toBe(2);
    });

    it("counts a forget when you press Again", () => {
        const afterFirstReview = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);
        const afterForgetting = applyRating(afterFirstReview, "Again", afterFirstReview.dueAt);
        expect(afterForgetting.forgetCount).toBe(1);
        expect(afterForgetting.stability!).toBeLessThan(afterFirstReview.stability!);
    });

    it("doesn't change the original card", () => {
        applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);
        expect(unstudiedCard.stability).toBeNull();
    });
});
