import type { Card } from "@/scheduler/types";

function createUnstudiedCard(id: string, front: string, back: string): Card {
    return {
        id,
        front,
        back,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        dueAt: 0, // 0 = long ago, so new cards are due right away
        reviewCount: 0,
        forgetCount: 0,
        studyPhase: "New",
    };
}

export const sampleCards: Card[] = [
    createUnstudiedCard("1", "What does CPU stand for?", "Central Processing Unit"),
    createUnstudiedCard("2", "What is the time complexity of binary search?", "O(log n)"),
    createUnstudiedCard("3", "What does HTTP stand for?", "HyperText Transfer Protocol"),
    createUnstudiedCard("4", "What data structure uses FIFO?", "A queue"),
    createUnstudiedCard("5", "What does RAM stand for?", "Random Access Memory"),
];
