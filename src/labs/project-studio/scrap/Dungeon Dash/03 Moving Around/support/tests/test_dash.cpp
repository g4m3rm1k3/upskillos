#include "minitest.h"
#include "../rules.h"

TEST(DashTest, TwoTilesOnOpenFloor) {
    Map m;
    Player p(1, 3);
    EXPECT_EQ(dash(m, p, 1, 0), 2);
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 3);
}

TEST(DashTest, StopsBeforeAWall) {
    Map m;
    Player p(7, 3);
    EXPECT_EQ(dash(m, p, 1, 0), 1);
    EXPECT_EQ(p.getX(), 8);
}

TEST(DashTest, BlockedAtOnceMovesNothing) {
    Map m;
    Player p(8, 3);
    EXPECT_EQ(dash(m, p, 1, 0), 0);
    EXPECT_EQ(p.getX(), 8);
}

TEST(DashTest, WorksDownTheMap) {
    Map m;
    Player p(1, 1);
    EXPECT_EQ(dash(m, p, 0, 1), 2);
    EXPECT_EQ(p.getY(), 3);
}

TEST(DashTest, InteriorWallStopsTheDash) {
    Map m;
    Player p(3, 1);
    EXPECT_EQ(dash(m, p, 0, 1), 0);
    EXPECT_EQ(p.getY(), 1);
}

TEST(DashTest, EachTileCountsAsAStep) {
    Map m;
    Player p(1, 3);
    dash(m, p, 1, 0);
    EXPECT_EQ(p.getSteps(), 2);
}
