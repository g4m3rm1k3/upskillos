#include "minitest.h"
#include "../enemy.h"

TEST(NearTest, SameTileIsNear) {
    Enemy e(3, 3);
    Player p(3, 3);
    EXPECT_TRUE(e.isNear(p, 0));
}

TEST(NearTest, ExactRangeCounts) {
    Enemy e(1, 1);
    Player p(3, 2);
    EXPECT_TRUE(e.isNear(p, 3));
}

TEST(NearTest, OneTooFarIsNotNear) {
    Enemy e(1, 1);
    Player p(3, 2);
    EXPECT_FALSE(e.isNear(p, 2));
}

TEST(NearTest, WorksInEveryDirection) {
    Enemy e(5, 3);
    Player left(3, 3);
    Player up(5, 1);
    Player diagonal(6, 4);
    EXPECT_TRUE(e.isNear(left, 2));
    EXPECT_TRUE(e.isNear(up, 2));
    EXPECT_TRUE(e.isNear(diagonal, 2));
    EXPECT_FALSE(e.isNear(diagonal, 1));
}

TEST(NearTest, NegativeDifferencesStillCount) {
    Enemy e(8, 4);
    Player p(1, 1);
    EXPECT_TRUE(e.isNear(p, 10));
    EXPECT_FALSE(e.isNear(p, 9));
}
