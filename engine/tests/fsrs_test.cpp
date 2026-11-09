#include <gtest/gtest.h>

#include <stdexcept>

#include "fsrs.h"

constexpr double kTolerance = 1e-9;

// ---- retrievability ----

TEST(Retrievability, IsOneRightAfterReview) {
    EXPECT_DOUBLE_EQ(fsrs::retrievability(10.0, 0.0), 1.0);
}

TEST(Retrievability, IsNinetyPercentAfterStabilityDays) {
    EXPECT_NEAR(fsrs::retrievability(10.0, 10.0), 0.9, kTolerance);
    EXPECT_NEAR(fsrs::retrievability(250.0, 250.0), 0.9, kTolerance);
}

TEST(Retrievability, DecreasesOverTime) {
    EXPECT_GT(fsrs::retrievability(10.0, 1.0), fsrs::retrievability(10.0, 5.0));
    EXPECT_GT(fsrs::retrievability(10.0, 5.0), fsrs::retrievability(10.0, 30.0));
}

TEST(Retrievability, HigherStabilityMeansSlowerForgetting) {
    EXPECT_GT(fsrs::retrievability(30.0, 10.0), fsrs::retrievability(5.0, 10.0));
}

TEST(Retrievability, ThrowsOnInvalidInput) {
    EXPECT_THROW(fsrs::retrievability(0.0, 1.0), std::invalid_argument);
    EXPECT_THROW(fsrs::retrievability(-1.0, 1.0), std::invalid_argument);
    EXPECT_THROW(fsrs::retrievability(10.0, -1.0), std::invalid_argument);
}

// ---- nextInterval ----

TEST(NextInterval, IsStabilityDaysAtNinetyPercent) {
    EXPECT_NEAR(fsrs::nextInterval(10.0, 0.9), 10.0, kTolerance);
}

TEST(NextInterval, IsShorterForHigherRetention) {
    EXPECT_LT(fsrs::nextInterval(10.0, 0.95), 10.0);
    EXPECT_GT(fsrs::nextInterval(10.0, 0.80), 10.0);
}

TEST(NextInterval, IsInverseOfRetrievability) {
    for (double stability : {0.5, 3.0, 10.0, 120.0}) {
        for (double retention : {0.7, 0.85, 0.9, 0.97}) {
            const double days = fsrs::nextInterval(stability, retention);
            EXPECT_NEAR(fsrs::retrievability(stability, days), retention, kTolerance)
                << "stability=" << stability << " retention=" << retention;
        }
    }
}

TEST(NextInterval, ThrowsOnInvalidInput) {
    EXPECT_THROW(fsrs::nextInterval(0.0, 0.9), std::invalid_argument);
    EXPECT_THROW(fsrs::nextInterval(10.0, 0.0), std::invalid_argument);
    EXPECT_THROW(fsrs::nextInterval(10.0, 1.0), std::invalid_argument);
}

// ---- initialState ----

TEST(InitialState, UsesWeightsForStability) {
    EXPECT_DOUBLE_EQ(fsrs::initialState(fsrs::Rating::Good).stability, 2.3065);
}

TEST(InitialState, AgainStartsHardest) {
    EXPECT_NEAR(fsrs::initialState(fsrs::Rating::Again).difficulty, 6.4133, kTolerance);
    EXPECT_LT(fsrs::initialState(fsrs::Rating::Easy).difficulty,
              fsrs::initialState(fsrs::Rating::Again).difficulty);
}

// ---- review ----

namespace {
// a typical card that has been studied a few times
constexpr fsrs::MemoryState kTypicalCard{10.0, 5.0};
}  // namespace

TEST(Review, RememberingGrowsStability) {
    for (auto rating : {fsrs::Rating::Hard, fsrs::Rating::Good, fsrs::Rating::Easy}) {
        EXPECT_GT(fsrs::review(kTypicalCard, 10.0, rating).stability, kTypicalCard.stability);
    }
}

TEST(Review, BetterRatingsGrowStabilityMore) {
    const double hard = fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Hard).stability;
    const double good = fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Good).stability;
    const double easy = fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Easy).stability;
    EXPECT_LT(hard, good);
    EXPECT_LT(good, easy);
}

TEST(Review, ForgettingLowersStability) {
    EXPECT_LT(fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Again).stability, kTypicalCard.stability);
}

TEST(Review, RememberingWhenCloseToForgettingGrowsMore) {
    // reviewing later = lower retrievability = bigger boost
    const double onTime = fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Good).stability;
    const double late = fsrs::review(kTypicalCard, 30.0, fsrs::Rating::Good).stability;
    EXPECT_GT(late, onTime);
}

TEST(Review, DifficultyMovesWithRating) {
    EXPECT_GT(fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Again).difficulty, kTypicalCard.difficulty);
    EXPECT_GT(fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Hard).difficulty, kTypicalCard.difficulty);
    EXPECT_NEAR(fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Good).difficulty, kTypicalCard.difficulty, 0.01);
    EXPECT_LT(fsrs::review(kTypicalCard, 10.0, fsrs::Rating::Easy).difficulty, kTypicalCard.difficulty);
}

TEST(Review, DifficultyStaysInRange) {
    fsrs::MemoryState state = kTypicalCard;
    for (int i = 0; i < 50; ++i) {
        state = fsrs::review(state, 1.0, fsrs::Rating::Again);
        EXPECT_LE(state.difficulty, 10.0);
    }
    for (int i = 0; i < 50; ++i) {
        state = fsrs::review(state, 1.0, fsrs::Rating::Easy);
        EXPECT_GE(state.difficulty, 1.0);
    }
}

TEST(Review, SameDayRememberingNeverLowersStability) {
    for (auto rating : {fsrs::Rating::Hard, fsrs::Rating::Good, fsrs::Rating::Easy}) {
        EXPECT_GE(fsrs::review(kTypicalCard, 0.0, rating).stability, kTypicalCard.stability);
    }
}

TEST(Review, SameDayForgettingLowersStability) {
    EXPECT_LT(fsrs::review(kTypicalCard, 0.0, fsrs::Rating::Again).stability, kTypicalCard.stability);
}

TEST(Review, IntervalsGrowWhenReviewedOnTime) {
    // a student who always presses Good right when the card is due
    fsrs::MemoryState state = fsrs::initialState(fsrs::Rating::Good);
    double previousInterval = 0.0;
    for (int i = 0; i < 6; ++i) {
        const double interval = fsrs::nextInterval(state.stability, 0.9);
        EXPECT_GT(interval, previousInterval);
        previousInterval = interval;
        state = fsrs::review(state, interval, fsrs::Rating::Good);
    }
}

TEST(Review, ThrowsOnInvalidInput) {
    EXPECT_THROW(fsrs::review({0.0, 5.0}, 1.0, fsrs::Rating::Good), std::invalid_argument);
    EXPECT_THROW(fsrs::review({10.0, 0.5}, 1.0, fsrs::Rating::Good), std::invalid_argument);
    EXPECT_THROW(fsrs::review({10.0, 11.0}, 1.0, fsrs::Rating::Good), std::invalid_argument);
    EXPECT_THROW(fsrs::review(kTypicalCard, -1.0, fsrs::Rating::Good), std::invalid_argument);
}