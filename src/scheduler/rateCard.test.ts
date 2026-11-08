import { describe, it, expect } from "vitest";
import { rateCard } from "./rateCard";
import type { Card } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NOW = 1_700_000_000_000;

const newCard: Card = {
    id: "1",
    front: "Q",
    back: "A",
    stability: null,
    difficulty: null,
    lastReview: null,
    due: 0,
    reps: 0,
    lapses: 0,
    state: "New"
};

describe("rateCard", () => {
    it("gives a new card its first memory state", () => {
        const card = rateCard(newCard, "Good", NOW);
        expect(card.stability).toBeCloseTo(2.3065, 9);
        expect(card.lastReview).toBe(NOW);
        expect(card.reps).toBe(1);
    });

    it("schedules the card for when recall drops to 90%", () => {
        const card = rateCard(newCard, "Good", NOW);
        expect((card.due - NOW) / MS_PER_DAY).toBeCloseTo(card.stability!, 9);
    });

    it("uses the review formula on later reviews", () => {
        const first = rateCard(newCard, "Good", NOW);
        const second = rateCard(first, "Good", first.due);
        expect(second.stability!).toBeGreaterThan(first.stability!);
        expect(second.reps).toBe(2);
    });

    it("counts a lapse when you press Again", () => {
        const first = rateCard(newCard, "Good", NOW);
        const second = rateCard(first, "Again", first.due);
        expect(second.lapses).toBe(1);
        expect(second.stability!).toBeLessThan(first.stability!);
    });

    it("doesn't change the original card", () => {
        rateCard(newCard, "Good", NOW);
        expect(newCard.stability).toBeNull();
    });
});