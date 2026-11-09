#include "fsrs.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace fsrs {
    namespace {
        // FSRS-6 default weights (w0 to w20), from py-fsrs
        constexpr std::array<double, 21> WEIGHTS = {
            0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194,
            0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629,
            1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
        };

        // shape of the forgetting curve.
        // CURVE_FACTOR makes sure recall is exactly 90% after `stability` days
        constexpr double CURVE_DECAY = -WEIGHTS[20];
        const double CURVE_FACTOR = std::pow(0.9, 1.0 / CURVE_DECAY) - 1.0;

        // keeps stability from hitting 0
        constexpr double MIN_STABILITY = 0.001;

        void requirePositiveStability(double stability) {
            if (stability <= 0.0) {
                throw std::invalid_argument("stability must be > 0");
            }
        }

        // starting difficulty for a new card. not clamped on purpose,
        // difficultyAfterReview needs the raw number
        double unclampedInitialDifficulty(Rating rating) {
            const int ratingNumber = static_cast<int>(rating);
            return WEIGHTS[4] - std::exp(WEIGHTS[5] * (ratingNumber - 1)) + 1.0;
        }

        // again/hard = harder, easy = easier, good = about the same
        double difficultyAfterReview(double currentDifficulty, Rating rating) {
            const int ratingNumber = static_cast<int>(rating);

            const double difficultyChange = -WEIGHTS[6] * (ratingNumber - 3);
            // smaller changes as difficulty gets close to 10
            const double dampedDifficulty =
                currentDifficulty + difficultyChange * (10.0 - currentDifficulty) / 9.0;
            // pull slightly back toward a normal difficulty
            const double revertedDifficulty =
                WEIGHTS[7] * unclampedInitialDifficulty(Rating::Easy) + (1.0 - WEIGHTS[7]) * dampedDifficulty;

            return std::clamp(revertedDifficulty, 1.0, 10.0);
        }

        // you remembered it, so stability goes up
        double stabilityAfterRemembering(double stability, double difficulty, double recallChance,
                                         Rating rating) {
            // harder cards grow less
            const double difficultyFactor = 11.0 - difficulty;
            // strong memories grow less
            const double stabilityFactor = std::pow(stability, -WEIGHTS[9]);
            // remembering when you were close to forgetting grows more
            const double recallChanceFactor = std::exp(WEIGHTS[10] * (1.0 - recallChance)) - 1.0;
            // Hard shrinks the growth, Easy boosts it
            const double hardPenalty = (rating == Rating::Hard) ? WEIGHTS[15] : 1.0;
            const double easyBonus = (rating == Rating::Easy) ? WEIGHTS[16] : 1.0;

            const double stabilityGrowth = std::exp(WEIGHTS[8]) * difficultyFactor * stabilityFactor
                * recallChanceFactor * hardPenalty * easyBonus;

            return stability * (1.0 + stabilityGrowth);
        }

        // you forgot it, so stability goes down
        double stabilityAfterForgetting(double stability, double difficulty, double recallChance) {
            // harder cards drop lower
            const double difficultyFactor = std::pow(difficulty, -WEIGHTS[12]);
            // strong old memories keep more
            const double stabilityFactor = std::pow(stability + 1.0, WEIGHTS[13]) - 1.0;
            // forgetting when you were likely to forget is less of a hit
            const double recallChanceFactor = std::exp(WEIGHTS[14] * (1.0 - recallChance));

            const double longTermStability =
                WEIGHTS[11] * difficultyFactor * stabilityFactor * recallChanceFactor;
            // cap so forgetting always lowers stability
            const double maxStabilityAfterForgetting = stability / std::exp(WEIGHTS[17] * WEIGHTS[18]);

            return std::min(longTermStability, maxStabilityAfterForgetting);
        }

        // reviewed again less than a day after the last review
        double stabilityAfterSameDayReview(double stability, Rating rating) {
            const int ratingNumber = static_cast<int>(rating);

            double stabilityMultiplier =
                std::exp(WEIGHTS[17] * (ratingNumber - 3 + WEIGHTS[18])) * std::pow(stability, -WEIGHTS[19]);
            // remembering never lowers stability
            if (rating != Rating::Again) {
                stabilityMultiplier = std::max(stabilityMultiplier, 1.0);
            }

            return stability * stabilityMultiplier;
        }
    } // namespace

    double retrievability(double stability, double daysSinceLastReview) {
        requirePositiveStability(stability);
        if (daysSinceLastReview < 0.0) {
            throw std::invalid_argument("daysSinceLastReview must be >= 0");
        }

        return std::pow(1.0 + CURVE_FACTOR * daysSinceLastReview / stability, CURVE_DECAY);
    }

    double nextInterval(double stability, double desiredRetention) {
        requirePositiveStability(stability);
        if (desiredRetention <= 0.0 || desiredRetention >= 1.0) {
            throw std::invalid_argument("desiredRetention must be between 0 and 1 (exclusive)");
        }

        return (stability / CURVE_FACTOR) * (std::pow(desiredRetention, 1.0 / CURVE_DECAY) - 1.0);
    }

    MemoryState initialState(Rating rating) {
        const int ratingNumber = static_cast<int>(rating);

        // Again reads WEIGHTS[0], Easy reads WEIGHTS[3]
        const double stability = WEIGHTS[ratingNumber - 1];
        const double difficulty = std::clamp(unclampedInitialDifficulty(rating), 1.0, 10.0);

        return {stability, difficulty};
    }

    // new stability has to use the old difficulty, so it's worked out first
    MemoryState review(MemoryState currentMemory, double daysSinceLastReview, Rating rating) {
        requirePositiveStability(currentMemory.stability);
        if (currentMemory.difficulty < 1.0 || currentMemory.difficulty > 10.0) {
            throw std::invalid_argument("difficulty must be between 1 and 10");
        }
        if (daysSinceLastReview < 0.0) {
            throw std::invalid_argument("daysSinceLastReview must be >= 0");
        }

        double newStability;
        if (daysSinceLastReview < 1.0) {
            newStability = stabilityAfterSameDayReview(currentMemory.stability, rating);
        } else {
            const double recallChance = retrievability(currentMemory.stability, daysSinceLastReview);
            newStability = (rating == Rating::Again)
                               ? stabilityAfterForgetting(currentMemory.stability, currentMemory.difficulty,
                                                          recallChance)
                               : stabilityAfterRemembering(currentMemory.stability, currentMemory.difficulty,
                                                           recallChance, rating);
        }

        return {
            std::max(newStability, MIN_STABILITY),
            difficultyAfterReview(currentMemory.difficulty, rating),
        };
    }
} // namespace fsrs
 