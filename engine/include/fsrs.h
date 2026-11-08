#pragma once

namespace fsrs {

    // the button the user pressed after seeing the answer
    enum class Rating {
        Again = 1,  // forgot it
        Hard = 2,   // remembered, with effort
        Good = 3,   // remembered
        Easy = 4,   // remembered instantly
    };

    // stability = days until you have a 90% chance of recalling the card
    // difficulty = how hard the card is for you, 1 (easy) to 10 (hard)
    struct MemoryState {
        double stability;
        double difficulty;
    };

    // chance (0 to 1) you remember the card right now
    // throws if stability <= 0 or daysSinceLastReview < 0
    double retrievability(double stability, double daysSinceLastReview);

    // days to wait until your chance of remembering drops to desiredRetention
    // throws if stability <= 0 or desiredRetention isn't between 0 and 1
    double nextInterval(double stability, double desiredRetention);

    // memory after the very first review of a brand-new card
    MemoryState initialState(Rating rating);

    // memory after any review except the first one
    // throws if stability <= 0, difficulty isn't 1 to 10, or daysSinceLastReview < 0
    MemoryState review(MemoryState currentMemory, double daysSinceLastReview, Rating rating);

}  // namespace fsrs
