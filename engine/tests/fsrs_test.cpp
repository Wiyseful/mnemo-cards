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


TEST(InitialState, usesWeightsForStability) {
    EXPECT_DOUBLE_EQ(fsrs::initialState(fsrs::Rating::Good).stability, 2.3065);
}

TEST(InitialState, AgainStartsHardest) {
    EXPECT_NEAR(fsrs::initialState(fsrs::Rating::Again).difficulty, 6.4133, 1e-9);
    EXPECT_LT(fsrs::initialState(fsrs::Rating::Easy).difficulty,
              fsrs::initialState(fsrs::Rating::Again).difficulty);
}