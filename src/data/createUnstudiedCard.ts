import type { Card } from "@/scheduler/types";

// a brand-new card that has never been studied, so it's due right away
export function createUnstudiedCard(id: string, deckId: string, front: string, back: string): Card {
    return {
        id,
        deckId,
        front,
        back,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        dueAt: 0, // 0 = long ago, so new cards are due right away
        reviewCount: 0,
        forgetCount: 0,
        studyPhase: "New",
        deletedAt: null,
    };
}