#include "minitest.h"
#include "../map.h"

TEST(CountTest, CountsWalls) {
    Map m;
    EXPECT_EQ(m.countTiles('#'), 32);
}

TEST(CountTest, CountsFloor) {
    Map m;
    EXPECT_EQ(m.countTiles('.'), 28);
}

TEST(CountTest, UnknownTileIsZero) {
    Map m;
    EXPECT_EQ(m.countTiles('Z'), 0);
}
