#include "minitest.h"
#include "../scoreboard.h"

TEST(ScoreboardTest, StartsAtZero) {
    Scoreboard s;
    EXPECT_EQ(s.getBest(), 0);
}

TEST(ScoreboardTest, AHigherScoreIsANewBest) {
    Scoreboard s;
    EXPECT_TRUE(s.record(30));
    EXPECT_EQ(s.getBest(), 30);
}

TEST(ScoreboardTest, ALowerScoreIsNot) {
    Scoreboard s;
    s.record(30);
    EXPECT_FALSE(s.record(10));
    EXPECT_EQ(s.getBest(), 30);
}

TEST(ScoreboardTest, AnEqualScoreIsNot) {
    Scoreboard s;
    s.record(30);
    EXPECT_FALSE(s.record(30));
    EXPECT_EQ(s.getBest(), 30);
}

TEST(ScoreboardTest, ZeroNeverBeatsTheStart) {
    Scoreboard s;
    EXPECT_FALSE(s.record(0));
    EXPECT_EQ(s.getBest(), 0);
}

TEST(ScoreboardTest, TheBestOnlyGoesUp) {
    Scoreboard s;
    s.record(10);
    s.record(50);
    s.record(20);
    s.record(40);
    EXPECT_EQ(s.getBest(), 50);
}
