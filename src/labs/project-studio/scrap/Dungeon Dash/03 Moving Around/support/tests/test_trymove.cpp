#include "minitest.h"
#include "../rules.h"

TEST(TryMoveTest, MovesOntoFloor) {
    Map m;
    Player p(2, 1);
    EXPECT_TRUE(tryMove(m, p, 1, 0));
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 1);
}

TEST(TryMoveTest, WallBlocksTheMove) {
    Map m;
    Player p(1, 1);
    EXPECT_FALSE(tryMove(m, p, -1, 0));
    EXPECT_EQ(p.getX(), 1);
    EXPECT_EQ(p.getY(), 1);
}

TEST(TryMoveTest, InteriorWallBlocks) {
    Map m;
    Player p(3, 1);
    EXPECT_FALSE(tryMove(m, p, 0, 1));
    EXPECT_EQ(p.getY(), 1);
}

TEST(TryMoveTest, BottomEdgeBlocks) {
    Map m;
    Player p(8, 4);
    EXPECT_FALSE(tryMove(m, p, 0, 1));
    EXPECT_EQ(p.getY(), 4);
}

TEST(TryMoveTest, BlockedMoveIsNotAStep) {
    Map m;
    Player p(1, 1);
    tryMove(m, p, -1, 0);
    EXPECT_EQ(p.getSteps(), 0);
    tryMove(m, p, 1, 0);
    EXPECT_EQ(p.getSteps(), 1);
}
