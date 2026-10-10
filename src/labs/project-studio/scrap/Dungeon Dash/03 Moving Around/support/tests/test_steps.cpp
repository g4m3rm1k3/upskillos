#include "minitest.h"
#include "../player.h"

TEST(StepsTest, StartsAtZero) {
    Player p(0, 0);
    EXPECT_EQ(p.getSteps(), 0);
}

TEST(StepsTest, EachMoveAddsOne) {
    Player p(5, 5);
    p.move(1, 0);
    p.move(0, -1);
    p.move(-1, 0);
    EXPECT_EQ(p.getSteps(), 3);
}

TEST(StepsTest, MoveStillChangesPosition) {
    Player p(5, 5);
    p.move(2, -3);
    EXPECT_EQ(p.getX(), 7);
    EXPECT_EQ(p.getY(), 2);
}

TEST(StepsTest, DamageIsNotAStep) {
    Player p(5, 5);
    p.takeDamage(3);
    EXPECT_EQ(p.getSteps(), 0);
}
