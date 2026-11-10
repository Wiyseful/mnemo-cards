import { describe, it, expect } from "vitest";
import { applyRating } from "./applyRating";
import { MS_PER_DAY, MS_PER_MINUTE } from "./time";
import type { Card } from "./types";

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

    // ---- learning steps for new cards ----

    it("a new card rated Again is due right away", () => {
        const cardAfterRating = applyRating(unstudiedCard, "Again", TEST_START_TIME_MS);
        expect(cardAfterRating.dueAt).toBe(TEST_START_TIME_MS);
    });

    it("a new card rated Hard is due in 5 minutes", () => {
        const cardAfterRating = applyRating(unstudiedCard, "Hard", TEST_START_TIME_MS);
        const minutesUntilDue = (cardAfterRating.dueAt - TEST_START_TIME_MS) / MS_PER_MINUTE;
        expect(minutesUntilDue).toBe(5);
    });

    it("a new card rated Good is due in 1 day", () => {
        const cardAfterRating = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);
        const daysUntilDue = (cardAfterRating.dueAt - TEST_START_TIME_MS) / MS_PER_DAY;
        expect(daysUntilDue).toBe(1);
    });

    it("a new card rated Easy is due in 3 days", () => {
        const cardAfterRating = applyRating(unstudiedCard, "Easy", TEST_START_TIME_MS);
        const daysUntilDue = (cardAfterRating.dueAt - TEST_START_TIME_MS) / MS_PER_DAY;
        expect(daysUntilDue).toBe(3);
    });

    // ---- older cards ----

    it("an older card rated Again is due right away", () => {
        // first review: a new card rated Good (due 1 day later)
        const afterFirstReview = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);

        // second review: forgotten when it comes back
        const reviewTimeMs = afterFirstReview.dueAt;
        const afterAgainReview = applyRating(afterFirstReview, "Again", reviewTimeMs);

        expect(afterAgainReview.dueAt).toBe(reviewTimeMs);
    });

    it("an older card rated Hard uses FSRS, not the 5-minute step", () => {
        // first review: a new card rated Good (due 1 day later)
        const afterFirstReview = applyRating(unstudiedCard, "Good", TEST_START_TIME_MS);

        // second review: rated Hard exactly when it's due
        const reviewTimeMs = afterFirstReview.dueAt;
        const afterHardReview = applyRating(afterFirstReview, "Hard", reviewTimeMs);

        // FSRS should schedule it well past the 5-minute learning step
        const timeUntilDueMs = afterHardReview.dueAt - reviewTimeMs;
        expect(timeUntilDueMs).toBeGreaterThan(5 * MS_PER_MINUTE);
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