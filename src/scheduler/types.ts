export type Rating = "Again" | "Hard" | "Good" | "Easy";

export type Card = {
    id: string;
    front: string;
    back: string;

    stability: number | null; // days until recall drops to 90%
    difficulty: number | null; // 1-10, how hard this card is for you
    lastReview: number | null; // timestamp (ms) of the last review
    due: number; // timestamp (ms) of when card should be shown next

    reps: number; // total times card has been reviewed
    lapses: number; // times you forgot the card
    state: CardState;
}

export type CardState = "New" | "Learning" | "Review" | "Relearning";