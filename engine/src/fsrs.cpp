#include "fsrs.h"

#include <array>
#include <cmath>
#include <stdexcept>
#include <algorithm>

namespace fsrs {

    namespace {

        // FSRS-6 default weights (w0 to w20), from the official py-fsrs implementation.
        constexpr std::array<double, 21> W = {
            0.212,  1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194,
            0.001,  1.8722, 0.1666, 0.796,  1.4835, 0.0614, 0.2629,
            1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
        };

        // Forgetting curve shape. In FSRS-6 the decay is learned (w20).
        // FACTOR is derived from DECAY so that retrievability(S, S) == 0.9 for any S.
        constexpr double DECAY = -W[20];
        const double FACTOR = std::pow(0.9, 1.0 / DECAY) - 1.0;

        // Throws if stability isn't positive. Stability = days until recall
        // drops to 90%
        void requirePositiveStability(double stability) {
            if (stability <= 0.0) {
                throw std::invalid_argument("stability must be > 0");
            }
        }

        // Starting difficulty for a brand-new card, from its first rating.
        // D0(G) = w4 - e^(w5 * (G - 1)) + 1.
        double initialDifficulty(Rating rating) {
            const int g = static_cast<int>(rating);
            return W[4] - std::exp(W[5] * (g - 1)) + 1.0;
        }



    }  // namespace

    // Forgetting curve: R = (1 + FACTOR * t / S) ^ DECAY.
    // Starts at 1.0 right after a review and decreases as days pass.
    double retrievability(double stability, double daysElapsed) {
        requirePositiveStability(stability);
        if (daysElapsed < 0.0) {
            throw std::invalid_argument("daysElapsed must be >= 0");
        }

        return std::pow(1.0 + FACTOR * daysElapsed / stability, DECAY);
    }
    // Inverse of the forgetting curve: solves R = desiredRetention for t.
    // t = (S / FACTOR) * (desiredRetention ^ (1 / DECAY) - 1)
    double nextInterval(double stability, double desiredRetention) {
        requirePositiveStability(stability);
        if (desiredRetention <= 0.0 || desiredRetention >= 1.0) {
            throw std::invalid_argument("desiredRetention must be between 0 and 1 (exclusive)");
        }

        return (stability / FACTOR) * (std::pow(desiredRetention, 1.0 / DECAY) - 1.0);
    }

    MemoryState initialState(Rating rating) {
        const int g = static_cast<int>(rating);

        // Again (1) reads W[0] and Easy (4) reads W[3]
        const double stability = W[g - 1];
        const double difficulty = std::clamp(initialDifficulty(rating), 1.0, 10.0);

        return {stability, difficulty};
    }
}  // namespace fsrs