#include "minitest.h"
#include "../Scoring.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(TwoPairs, TwoSeparatePairsScoreTwenty) {
    EXPECT_EQ(scoreTwoPairs(hand(2, 2, 5, 5, 6)), 20);
}

TEST(TwoPairs, FullHouseHasTwoFacesThatRepeat) {
    EXPECT_EQ(scoreTwoPairs(hand(3, 3, 3, 5, 5)), 20);
}

TEST(TwoPairs, FourOfAKindIsOnlyOneFace) {
    EXPECT_EQ(scoreTwoPairs(hand(2, 2, 2, 2, 6)), 0);
}

TEST(TwoPairs, OnePairIsNotEnough) {
    EXPECT_EQ(scoreTwoPairs(hand(1, 2, 3, 4, 4)), 0);
}

TEST(TwoPairs, NothingRepeatsScoresZero) {
    EXPECT_EQ(scoreTwoPairs(hand(1, 2, 3, 4, 5)), 0);
}
