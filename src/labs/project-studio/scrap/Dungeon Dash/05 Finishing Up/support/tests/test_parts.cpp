#include "minitest.h"
#include <string>
#include <vector>
#include "../map.h"
#include "../coins.h"

TEST(MapRowsTest, UsesTheGivenRows) {
    std::vector<std::string> rows = {"#####", "#...#", "#####"};
    Map m(rows);
    EXPECT_EQ(m.getWidth(), 5);
    EXPECT_EQ(m.getHeight(), 3);
    EXPECT_EQ(m.getTile(1, 1), '.');
    EXPECT_TRUE(m.isWall(0, 0));
    EXPECT_FALSE(m.isWall(2, 1));
}

TEST(MapRowsTest, OutsideIsStillAWall) {
    std::vector<std::string> rows = {"#####", "#...#", "#####"};
    Map m(rows);
    EXPECT_TRUE(m.isWall(5, 1));
    EXPECT_TRUE(m.isWall(-1, 1));
    EXPECT_TRUE(m.isWall(1, 3));
}

TEST(MapRowsTest, TheDefaultMapIsUnchanged) {
    Map m;
    EXPECT_EQ(m.getWidth(), 10);
    EXPECT_EQ(m.getHeight(), 6);
}

TEST(CoinsFromTest, UsesTheGivenPositions) {
    std::vector<Point> spots = {{1, 1}, {3, 2}};
    Coins c(spots);
    EXPECT_EQ(c.remaining(), 2);
    EXPECT_TRUE(c.hasCoinAt(1, 1));
    EXPECT_TRUE(c.hasCoinAt(3, 2));
    EXPECT_FALSE(c.hasCoinAt(5, 4));
}

TEST(CoinsFromTest, CollectingStillWorks) {
    std::vector<Point> spots = {{1, 1}, {3, 2}};
    Coins c(spots);
    EXPECT_TRUE(c.collectAt(3, 2));
    EXPECT_EQ(c.remaining(), 1);
    EXPECT_FALSE(c.hasCoinAt(3, 2));
}

TEST(CoinsFromTest, TheDefaultCoinsAreUnchanged) {
    Coins c;
    EXPECT_EQ(c.remaining(), 5);
}
