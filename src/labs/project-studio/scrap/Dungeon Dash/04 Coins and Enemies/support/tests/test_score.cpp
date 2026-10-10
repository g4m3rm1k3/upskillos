#include "minitest.h"
#include "../player.h"

TEST(ScoreTest, StartsAtZero) {
    Player p(0, 0);
    EXPECT_EQ(p.getScore(), 0);
}

TEST(ScoreTest, PointsAddUp) {
    Player p(0, 0);
    p.addScore(10);
    p.addScore(5);
    EXPECT_EQ(p.getScore(), 15);
}

TEST(ScoreTest, MovingAndDamageDoNotChangeTheScore) {
    Player p(0, 0);
    p.move(1, 0);
    p.takeDamage(2);
    EXPECT_EQ(p.getScore(), 0);
}

TEST(ScoreTest, ScoringChangesNothingElse) {
    Player p(3, 3);
    p.addScore(10);
    EXPECT_EQ(p.getHealth(), 10);
    EXPECT_EQ(p.getSteps(), 0);
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 3);
}
