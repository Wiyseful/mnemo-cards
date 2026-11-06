#include "fsrs.h"

#include <cmath>
#include <stdexcept>

namespace fsrs {

namespace {

// Forgetting curve constants. FACTOR is chosen so that
// retrievability(S, S) == 0.9 for any stability S.
constexpr double DECAY = -0.5;
constexpr double FACTOR = 19.0 / 81.0;

void requirePositiveStability(double stability) {
    if (stability <= 0.0) {
        throw std::invalid_argument("stability must be > 0");
    }
}

}  // namespace

double retrievability(double stability, double daysElapsed) {
    requirePositiveStability(stability);
    if (daysElapsed < 0.0) {
        throw std::invalid_argument("daysElapsed must be >= 0");
    }

    return std::pow(1.0 + FACTOR * daysElapsed / stability, DECAY);
}

double nextInterval(double stability, double desiredRetention) {
    requirePositiveStability(stability);
    if (desiredRetention <= 0.0 || desiredRetention >= 1.0) {
        throw std::invalid_argument("desiredRetention must be between 0 and 1 (exclusive)");
    }

    return (stability / FACTOR) * (std::pow(desiredRetention, 1.0 / DECAY) - 1.0);
}

}  // namespace fsrs
