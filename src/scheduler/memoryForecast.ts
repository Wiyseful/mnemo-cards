import { applyRating } from "./applyRating";
import { averageRecallChance } from "./averageRecallChance";
import { MS_PER_DAY } from "./time";
import type { Card } from "./types";

export const DEFAULT_FORECAST_DAYS = 30;
const FORECAST_POINT_COUNT = 61;

export type MemoryForecast = {
    timesMs: number[];
    percentsIfYouStop: number[];
    percentsIfYouReviewDueCards: number[];
    dueCardCount: number;
};

function isStudied(card: Card): boolean {
    return card.stability !== null && card.lastReviewedAt !== null;
}

function averagePercent(cards: Card[], timeMs: number): number {
    return averageRecallChance(cards, timeMs) * 100;
}

export function memoryForecast(cards: Card[], currentTimeMs: number, endTimeMs: number): MemoryForecast | null {
    const studiedCards = cards.filter(isStudied);
    if (studiedCards.length === 0 || endTimeMs <= currentTimeMs) {
        return null;
    }

    const dueCards = studiedCards.filter((card) => card.dueAt <= currentTimeMs);
    const cardsAfterReview = studiedCards.map((card) =>
        card.dueAt <= currentTimeMs ? applyRating(card, "Good", currentTimeMs) : card,
    );

    const timesMs = Array.from(
        { length: FORECAST_POINT_COUNT },
        (_, pointIndex) => currentTimeMs + ((endTimeMs - currentTimeMs) * pointIndex) / (FORECAST_POINT_COUNT - 1),
    );

    return {
        timesMs,
        percentsIfYouStop: timesMs.map((timeMs) => averagePercent(studiedCards, timeMs)),
        percentsIfYouReviewDueCards: timesMs.map((timeMs) => averagePercent(cardsAfterReview, timeMs)),
        dueCardCount: dueCards.length,
    };
}

export function examDateToTimeMs(examDate: string): number {
    const [year = 0, month = 1, day = 1] = examDate.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
}

export function daysUntilExam(examDate: string, currentTimeMs: number): number {
    const today = new Date(currentTimeMs);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Math.round((examDateToTimeMs(examDate) - startOfToday) / MS_PER_DAY);
}

export function forecastEndTimeMs(examDate: string | null, currentTimeMs: number): number {
    if (examDate !== null && daysUntilExam(examDate, currentTimeMs) > 0) {
        return examDateToTimeMs(examDate);
    }
    return currentTimeMs + DEFAULT_FORECAST_DAYS * MS_PER_DAY;
}

export function percentRememberedAt(cards: Card[], timeMs: number): number | null {
    const studiedCards = cards.filter(isStudied);
    if (studiedCards.length === 0) {
        return null;
    }
    return Math.round(averagePercent(studiedCards, timeMs));
}
