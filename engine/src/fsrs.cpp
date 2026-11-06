#include "fsrs.h"

#include <array>
#include <cmath>
#include <stdexcept>

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