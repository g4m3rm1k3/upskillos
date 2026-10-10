#include "minitest.h"
#include "../coins.h"

TEST(CoinsTest, StartsWithFiveCoins) {
    Coins c;
    EXPECT_EQ(c.remaining(), 5);
}

TEST(CoinsTest, FindsCoinsAtTheirPositions) {
    Coins c;
    EXPECT_TRUE(c.hasCoinAt(2, 1));
    EXPECT_TRUE(c.hasCoinAt(7, 1));
    EXPECT_TRUE(c.hasCoinAt(1, 3));
    EXPECT_TRUE(c.hasCoinAt(5, 4));
    EXPECT_TRUE(c.hasCoinAt(8, 4));
}

TEST(CoinsTest, NoCoinOnOtherTiles) {
    Coins c;
    EXPECT_FALSE(c.hasCoinAt(1, 1));
    EXPECT_FALSE(c.hasCoinAt(3, 2));
    EXPECT_FALSE(c.hasCoinAt(2, 7));
    EXPECT_FALSE(c.hasCoinAt(-1, -1));
}

TEST(CoinsTest, CollectingRemovesTheCoin) {
    Coins c;
    EXPECT_TRUE(c.collectAt(2, 1));
    EXPECT_EQ(c.remaining(), 4);
    EXPECT_FALSE(c.hasCoinAt(2, 1));
}

TEST(CoinsTest, CollectingNothingChangesNothing) {
    Coins c;
    EXPECT_FALSE(c.collectAt(1, 1));
    EXPECT_EQ(c.remaining(), 5);
}

TEST(CoinsTest, ACoinCanOnlyBeCollectedOnce) {
    Coins c;
    EXPECT_TRUE(c.collectAt(7, 1));
    EXPECT_FALSE(c.collectAt(7, 1));
    EXPECT_EQ(c.remaining(), 4);
}

TEST(CoinsTest, OtherCoinsStayWhenOneIsCollected) {
    Coins c;
    c.collectAt(1, 3);
    EXPECT_TRUE(c.hasCoinAt(2, 1));
    EXPECT_TRUE(c.hasCoinAt(7, 1));
    EXPECT_TRUE(c.hasCoinAt(5, 4));
    EXPECT_TRUE(c.hasCoinAt(8, 4));
    EXPECT_EQ(c.remaining(), 4);
}

TEST(CoinsTest, CanCollectEveryCoin) {
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    c.collectAt(8, 4);
    EXPECT_EQ(c.remaining(), 0);
}
