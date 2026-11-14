import { describe, it, expect } from "vitest";
import {
    daysUntilExam,
    forecastEndTimeMs,
    memoryForecast,
    percentRememberedAt,
    DEFAULT_FORECAST_DAYS,
} from "./memoryForecast";
import { MS_PER_DAY } from "./time";
import type { Card } from "./types";

const TEST_CURRENT_TIME_MS = new Date(2026, 10, 14, 15, 30).getTime();
const THIRTY_DAYS_LATER_MS = TEST_CURRENT_TIME_MS + 30 * MS_PER_DAY;

const unstudiedCard: Card = {
    id: "new",
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

const dueCard: Card = {
    ...unstudiedCard,
    id: "due",
    stability: 4,
    difficulty: 5,
    lastReviewedAt: TEST_CURRENT_TIME_MS - 6 * MS_PER_DAY,
    dueAt: TEST_CURRENT_TIME_MS - MS_PER_DAY,
    reviewCount: 2,
    studyPhase: "Review",
};

const notDueCard: Card = {
    ...dueCard,
    id: "not-due",
    stability: 20,
    lastReviewedAt: TEST_CURRENT_TIME_MS - 2 * MS_PER_DAY,
    dueAt: TEST_CURRENT_TIME_MS + 10 * MS_PER_DAY,
};

describe("memoryForecast", () => {
    it("returns null when nothing has been studied", () => {
        expect(memoryForecast([unstudiedCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)).toBeNull();
    });

    it("returns null when the end time isn't in the future", () => {
        expect(memoryForecast([dueCard], TEST_CURRENT_TIME_MS, TEST_CURRENT_TIME_MS)).toBeNull();
    });

    it("starts at today and ends at the end time", () => {
        const forecast = memoryForecast([dueCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        expect(forecast.timesMs[0]).toBe(TEST_CURRENT_TIME_MS);
        expect(forecast.timesMs.at(-1)).toBe(THIRTY_DAYS_LATER_MS);
    });

    it("only goes down if you stop studying", () => {
        const { percentsIfYouStop } = memoryForecast([dueCard, notDueCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        for (let pointIndex = 1; pointIndex < percentsIfYouStop.length; pointIndex++) {
            expect(percentsIfYouStop[pointIndex]!).toBeLessThan(percentsIfYouStop[pointIndex - 1]!);
        }
    });

    it("is never lower if you review the due cards", () => {
        const forecast = memoryForecast([dueCard, notDueCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        forecast.percentsIfYouReviewDueCards.forEach((percent, pointIndex) => {
            expect(percent).toBeGreaterThanOrEqual(forecast.percentsIfYouStop[pointIndex]!);
        });
        expect(forecast.percentsIfYouReviewDueCards.at(-1)!).toBeGreaterThan(forecast.percentsIfYouStop.at(-1)!);
    });

    it("draws the same line twice when nothing is due", () => {
        const forecast = memoryForecast([notDueCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        expect(forecast.dueCardCount).toBe(0);
        expect(forecast.percentsIfYouReviewDueCards).toEqual(forecast.percentsIfYouStop);
    });

    it("ignores unstudied cards instead of counting them as forgotten", () => {
        const withNewCard = memoryForecast([dueCard, unstudiedCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        const withoutNewCard = memoryForecast([dueCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        expect(withNewCard.percentsIfYouStop).toEqual(withoutNewCard.percentsIfYouStop);
    });
});

describe("daysUntilExam", () => {
    it("counts calendar days, no matter the time of day", () => {
        expect(daysUntilExam("2026-12-12", TEST_CURRENT_TIME_MS)).toBe(28);
    });

    it("is 0 on exam day and negative after it", () => {
        expect(daysUntilExam("2026-11-14", TEST_CURRENT_TIME_MS)).toBe(0);
        expect(daysUntilExam("2026-11-10", TEST_CURRENT_TIME_MS)).toBe(-4);
    });
});

describe("forecastEndTimeMs", () => {
    it("uses the exam date when it's in the future", () => {
        expect(forecastEndTimeMs("2026-12-12", TEST_CURRENT_TIME_MS)).toBe(new Date(2026, 11, 12).getTime());
    });

    it("falls back to 30 days when there's no exam or it already happened", () => {
        const fallbackMs = TEST_CURRENT_TIME_MS + DEFAULT_FORECAST_DAYS * MS_PER_DAY;
        expect(forecastEndTimeMs(null, TEST_CURRENT_TIME_MS)).toBe(fallbackMs);
        expect(forecastEndTimeMs("2026-11-14", TEST_CURRENT_TIME_MS)).toBe(fallbackMs);
    });
});

describe("percentRememberedAt", () => {
    it("returns null when nothing has been studied", () => {
        expect(percentRememberedAt([unstudiedCard], THIRTY_DAYS_LATER_MS)).toBeNull();
    });

    it("matches the end of the forecast's stop-studying line", () => {
        const forecast = memoryForecast([dueCard, notDueCard], TEST_CURRENT_TIME_MS, THIRTY_DAYS_LATER_MS)!;
        expect(percentRememberedAt([dueCard, notDueCard], THIRTY_DAYS_LATER_MS)).toBe(
            Math.round(forecast.percentsIfYouStop.at(-1)!),
        );
    });
});
