import type { Card } from "./types";
import { MS_PER_DAY } from "./time";
import { retrievability } from "@/engine";

// how many days ahead the memory score looks
export const MEMORY_FORECAST_DAYS = 7

// how much of these cards you'd remember in MEMORY_FORECAST_DAYS, as a whole percent like 73
export function memoryPercentForecast(cards: Card[], currentTimeMs: number): number {
    const forecastTimeMs = currentTimeMs + MEMORY_FORECAST_DAYS * MS_PER_DAY;
    return Math.round(averageRecallChance(cards, forecastTimeMs) * 100);
}

// average chance of remembering each card at the given time. unstudied cards count as 0
export function averageRecallChance(cards: Card[], currentTimeMs: number): number {
    let total = 0;
    for (const card of cards) {
        if (card.stability === null || card.lastReviewedAt === null) {
            continue;
        }

        const daysSinceLastReview = Math.max(0, (currentTimeMs - card.lastReviewedAt) / MS_PER_DAY);
        const recallChance = retrievability(card.stability, daysSinceLastReview);
        total += recallChance;
    }
    return cards.length > 0 ? total / cards.length : 0;
}