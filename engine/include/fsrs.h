#pragma once

namespace fsrs {

// Probability (0 to 1) of recalling a card right now, given its stability
// (days until recall drops to 90%) and the days since its last review.
// Throws std::invalid_argument if stability <= 0 or daysElapsed < 0.
double retrievability(double stability, double daysElapsed);

// Days to wait before the next review so that recall has dropped to
// desiredRetention by then. The inverse of retrievability().
// Throws std::invalid_argument if stability <= 0 or desiredRetention
// is not strictly between 0 and 1.
double nextInterval(double stability, double desiredRetention);

}  // namespace fsrs
