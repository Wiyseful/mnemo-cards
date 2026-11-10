// the button the user pressed after seeing the answer
export type Rating = "Again" | "Hard" | "Good" | "Easy";

// where a card is in the learning process
// New: never studied
// Learning: studied, still in the short minutes-long steps
// Review: learned, now scheduled days or months apart
// Relearning: was learned, then forgotten, back in short steps
export type StudyPhase = "New" | "Learning" | "Review" | "Relearning";

export type Card = {
    id: string;
    deckId: string;
    front: string; // the question side
    back: string; // the answer side

    stability: number | null; // days until recall drops to 90%. null = never studied
    difficulty: number | null; // 1 (easy) to 10 (hard). null = never studied
    lastReviewedAt: number | null; // timestamp in ms. null = never studied
    dueAt: number; // timestamp in ms: show the card again at or after this time

    reviewCount: number; // total times the card has been rated
    forgetCount: number; // times the card was rated Again
    studyPhase: StudyPhase;
};

export type Deck = {
    id: string;
    name: string;
    // null = top-level deck, string means child of another deck
    parentDeckId: string | null;
};