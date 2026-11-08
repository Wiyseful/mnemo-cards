import type { Card } from "@/scheduler/types";

function newCard(id: string, front: string, back: string): Card {
    return {
        id,
        front,
        back,
        stability: null,
        difficulty: null,
        lastReview: null,
        due: 0,
        reps: 0,
        lapses: 0,
        state: "New"
    };
}

export const sampleCards: Card[] = [
    newCard("1", "What does CPU stand for?", "Central Processing Unit"),
    newCard("2", "What is the time complexity of binary search?", "O(log n)"),
    newCard("3", "What does HTTP stand for?", "HyperText Transfer Protocol"),
    newCard("4", "What data structure uses FIFO?", "A queue"),
    newCard("5", "What does RAM stand for?", "Random Access Memory"),
];