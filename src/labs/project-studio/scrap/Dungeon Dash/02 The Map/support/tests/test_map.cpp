#include "minitest.h"
#include "../map.h"

TEST(MapTest, HasExpectedSize) {
    Map m;
    EXPECT_EQ(m.getWidth(), 10);
    EXPECT_EQ(m.getHeight(), 6);
}

TEST(MapTest, BordersAreWalls) {
    Map m;
    EXPECT_EQ(m.getTile(0, 0), '#');
    EXPECT_EQ(m.getTile(9, 5), '#');
    EXPECT_TRUE(m.isWall(0, 3));
}

TEST(MapTest, InteriorIsFloor) {
    Map m;
    EXPECT_EQ(m.getTile(1, 1), '.');
    EXPECT_FALSE(m.isWall(1, 1));
}

TEST(MapTest, InteriorWallBlock) {
    Map m;
    EXPECT_TRUE(m.isWall(3, 2));
    EXPECT_TRUE(m.isWall(6, 2));
    EXPECT_FALSE(m.isWall(2, 2));
}

TEST(MapTest, InBoundsOnlyInsideTheGrid) {
    Map m;
    EXPECT_TRUE(m.inBounds(9, 5));
    EXPECT_FALSE(m.inBounds(-1, 0));
    EXPECT_FALSE(m.inBounds(10, 0));
    EXPECT_FALSE(m.inBounds(0, 6));
}

TEST(MapTest, OutsideCountsAsWall) {
    Map m;
    EXPECT_EQ(m.getTile(99, 99), '#');
    EXPECT_TRUE(m.isWall(-1, -1));
}
