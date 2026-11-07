#pragma once

namespace fsrs {

    // what the user picked after seeing a card
    enum class Rating {
        Again = 1,
        Hard = 2,
        Good = 3,
        Easy = 4,
    };

    // stability = days until you have a 90% chance of remembering
    // difficulty = how hard the card is, 1 to 10
    struct MemoryState {
        double stability;
        double difficulty;
    };

    // chance (0 to 1) you remember the card right now
    // throws if stability <= 0 or daysElapsed < 0
    double retrievability(double stability, double daysElapsed);

    // how many days until the next review
    // throws if stability <= 0 or desiredRetention isn't between 0 and 1
    double nextInterval(double stability, double desiredRetention);

    // first time a card is ever reviewed
    MemoryState initialState(Rating rating);

    // every review after the first one
    // throws if stability <= 0, difficulty isn't 1 to 10, or daysElapsed < 0
    MemoryState review(MemoryState state, double daysElapsed, Rating rating);

}  // namespace fsrs