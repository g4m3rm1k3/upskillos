#include "minitest.h"
#include "../Scoring.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(Scoring, UpperSectionCountsOneFace) {
    Counts c = hand(1, 1, 3, 4, 1);
    EXPECT_EQ(scoreUpper(c, 1), 3);
    EXPECT_EQ(scoreUpper(c, 3), 3);
    EXPECT_EQ(scoreUpper(c, 6), 0);
}

TEST(Scoring, UpperSectionRejectsImpossibleFaces) {
    Counts c = hand(1, 1, 3, 4, 1);
    EXPECT_EQ(scoreUpper(c, 0), 0);
    EXPECT_EQ(scoreUpper(c, 7), 0);
}

TEST(Scoring, ThreeOfAKindScoresAllDice) {
    Counts c = hand(4, 4, 4, 2, 6);
    EXPECT_EQ(scoreOfAKind(c, 3), 20);
    EXPECT_EQ(scoreOfAKind(c, 4), 0);
}

TEST(Scoring, FourOfAKindAlsoCountsAsThree) {
    Counts c = hand(5, 5, 5, 5, 1);
    EXPECT_EQ(scoreOfAKind(c, 4), 21);
    EXPECT_EQ(scoreOfAKind(c, 3), 21);
}

TEST(Scoring, FullHouse) {
    EXPECT_EQ(scoreFullHouse(hand(2, 2, 3, 3, 3)), 25);
    EXPECT_EQ(scoreFullHouse(hand(2, 2, 2, 2, 3)), 0);
    EXPECT_EQ(scoreFullHouse(hand(5, 5, 5, 5, 5)), 0);
    EXPECT_EQ(scoreFullHouse(hand(1, 2, 3, 4, 5)), 0);
}

TEST(Scoring, SmallStraight) {
    EXPECT_EQ(scoreSmallStraight(hand(1, 2, 3, 4, 6)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(2, 3, 4, 5, 5)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(3, 4, 5, 6, 6)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(1, 2, 3, 4, 5)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(1, 2, 3, 5, 6)), 0);
}

TEST(Scoring, LargeStraight) {
    EXPECT_EQ(scoreLargeStraight(hand(1, 2, 3, 4, 5)), 40);
    EXPECT_EQ(scoreLargeStraight(hand(2, 3, 4, 5, 6)), 40);
    EXPECT_EQ(scoreLargeStraight(hand(1, 2, 3, 4, 6)), 0);
    EXPECT_EQ(scoreLargeStraight(hand(1, 3, 4, 5, 6)), 0);
}

TEST(Scoring, Yahtzee) {
    EXPECT_EQ(scoreYahtzee(hand(3, 3, 3, 3, 3)), 50);
    EXPECT_EQ(scoreYahtzee(hand(3, 3, 3, 3, 4)), 0);
}

TEST(Scoring, ChanceIsTheSum) {
    EXPECT_EQ(scoreChance(hand(1, 2, 3, 4, 6)), 16);
}
