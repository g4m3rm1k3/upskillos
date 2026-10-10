#include "minitest.h"
#include "../agent.h"

TEST(EpsilonTest, StartsAtTheStartValue) {
    EXPECT_NEAR(epsilonAt(0, 11, 1.0, 0.1), 1.0, 1e-12);
}

TEST(EpsilonTest, EndsAtTheEndValue) {
    EXPECT_NEAR(epsilonAt(10, 11, 1.0, 0.1), 0.1, 1e-12);
}

TEST(EpsilonTest, HalfwayIsHalfway) {
    EXPECT_NEAR(epsilonAt(5, 11, 1.0, 0.1), 0.55, 1e-12);
}

TEST(EpsilonTest, GoesDownSteadily) {
    for (int i = 1; i <= 10; i++) {
        EXPECT_LT(epsilonAt(i, 11, 1.0, 0.1), epsilonAt(i - 1, 11, 1.0, 0.1));
    }
}

TEST(EpsilonTest, StaysAtTheEndAfterwards) {
    EXPECT_NEAR(epsilonAt(50, 11, 1.0, 0.1), 0.1, 1e-12);
}

TEST(EpsilonTest, OneEpisodeUsesTheStart) {
    EXPECT_NEAR(epsilonAt(0, 1, 0.8, 0.1), 0.8, 1e-12);
}

TEST(EpsilonTest, CanAlsoGoUp) {
    EXPECT_NEAR(epsilonAt(10, 11, 0.1, 0.9), 0.9, 1e-12);
}

TEST(EpsilonTest, IntegerDivisionTrap) {
    EXPECT_NEAR(epsilonAt(1, 3, 1.0, 0.0), 0.5, 1e-12);
}
