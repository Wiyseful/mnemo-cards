import { describe, it, expect } from "vitest";
import { findNextDueCard } from "./findNextDueCard";
import type { Card } from "./types";

const CURRENT_TIME_MS = 1_000_000;

function cardDueAt(id: string, dueAt: number): Card {
    return {
        id,
        front: "Q",
        back: "A",
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        dueAt,
        reviewCount: 0,
        forgetCount: 0,
        studyPhase: "New",
    };
}

describe("findNextDueCard", () => {
    it("picks the card that has been due the longest", () => {
        const cards = [cardDueAt("a", 500), cardDueAt("b", 100), cardDueAt("c", 900)];
        expect(findNextDueCard(cards, CURRENT_TIME_MS)?.id).toBe("b");
    });

    it("skips cards that aren't due yet", () => {
        const cards = [cardDueAt("later", 2_000_000), cardDueAt("now", 999_999)];
        expect(findNextDueCard(cards, CURRENT_TIME_MS)?.id).toBe("now");
    });

    it("returns undefined when nothing is due", () => {
        const cards = [cardDueAt("later", 2_000_000)];
        expect(findNextDueCard(cards, CURRENT_TIME_MS)).toBeUndefined();
    });
});
