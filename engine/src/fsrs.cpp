#include "fsrs.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace fsrs {
    namespace {
        // FSRS-6 default weights, from py-fsrs
        constexpr std::array<double, 21> W = {
            0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194,
            0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629,
            1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
        };

        // curve shape. FACTOR makes sure recall is 90% after S days
        constexpr double DECAY = -W[20];
        const double FACTOR = std::pow(0.9, 1.0 / DECAY) - 1.0;

        // keeps stability from hitting 0
        constexpr double MIN_STABILITY = 0.001;

        void requirePositiveStability(double stability) {
            if (stability <= 0.0) {
                throw std::invalid_argument("stability must be > 0");
            }
        }

        // starting difficulty for a new card.
        double initialDifficulty(Rating rating) {
            const int g = static_cast<int>(rating);
            return W[4] - std::exp(W[5] * (g - 1)) + 1.0;
        }

        // again/hard = harder, easy = easier, good = about the same
        double nextDifficulty(double difficulty, Rating rating) {
            const int g = static_cast<int>(rating);

            const double deltaDifficulty = -W[6] * (g - 3);
            const double dampedDifficulty = difficulty + deltaDifficulty * (10.0 - difficulty) / 9.0;
            const double revertedDifficulty =
                W[7] * initialDifficulty(Rating::Easy) + (1.0 - W[7]) * dampedDifficulty;

            return std::clamp(revertedDifficulty, 1.0, 10.0);
        }

        // you remembered it, so stability goes up
        double nextRecallStability(double stability, double difficulty, double retrievability,
                                   Rating rating) {
            const double difficultyFactor = 11.0 - difficulty; // higher difficulty means less growth
            const double stabilityFactor = std::pow(stability, -W[9]); // higher stability means smaller proportional growth
            const double retrievabilityFactor = std::exp(W[10] * (1.0 - retrievability)) - 1.0; // lower predicted recall means more growth when correct
            const double hardPenalty = (rating == Rating::Hard) ? W[15] : 1.0; // reduces growth when user selects Hard
            const double easyBonus = (rating == Rating::Easy) ? W[16] : 1.0; // increases growth with a bonus when user selects Easy

            const double growth = std::exp(W[8]) * difficultyFactor * stabilityFactor
                * retrievabilityFactor * hardPenalty * easyBonus;

            // Only increase gets adjusted not existing stability
            return stability * (1.0 + growth);
        }

        // you forgot it, so stability goes down
        double nextForgetStability(double stability, double difficulty, double retrievability) {
            const double difficultyFactor = std::pow(difficulty, -W[12]);
            const double stabilityFactor = std::pow(stability + 1.0, W[13]) - 1.0;
            const double retrievabilityFactor = std::exp(W[14] * (1.0 - retrievability));

            const double longTerm = W[11] * difficultyFactor * stabilityFactor * retrievabilityFactor;
            const double shortTerm = stability / std::exp(W[17] * W[18]);

            return std::min(longTerm, shortTerm);
        }

        // reviewed twice in the same day
        double shortTermStability(double stability, Rating rating) {
            const int g = static_cast<int>(rating);

            double multiplier = std::exp(W[17] * (g - 3 + W[18])) * std::pow(stability, -W[19]);
            if (rating != Rating::Again) {
                multiplier = std::max(multiplier, 1.0);
            }

            return stability * multiplier;
        }
    } // namespace

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

    MemoryState initialState(Rating rating) {
        const int g = static_cast<int>(rating);

        const double stability = W[g - 1];
        const double difficulty = std::clamp(initialDifficulty(rating), 1.0, 10.0);

        return {stability, difficulty};
    }

    // stability has to use the old difficulty, so do it first
    MemoryState review(MemoryState state, double daysElapsed, Rating rating) {
        requirePositiveStability(state.stability);
        if (state.difficulty < 1.0 || state.difficulty > 10.0) {
            throw std::invalid_argument("difficulty must be between 1 and 10");
        }
        if (daysElapsed < 0.0) {
            throw std::invalid_argument("daysElapsed must be >= 0");
        }

        double stability;
        if (daysElapsed < 1.0) {
            stability = shortTermStability(state.stability, rating);
        }
        else {
            const double r = retrievability(state.stability, daysElapsed);
            stability = (rating == Rating::Again)
                            ? nextForgetStability(state.stability, state.difficulty, r)
                            : nextRecallStability(state.stability, state.difficulty, r, rating);
        }

        return {
            std::max(stability, MIN_STABILITY),
            nextDifficulty(state.difficulty, rating),
        };
    }
} // namespace fsrs
