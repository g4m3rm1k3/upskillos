#include "minitest.h"
#include "../timing.h"

TEST(TickerTest, NothingUntilTheIntervalPasses) {
    Ticker t(100);
    EXPECT_EQ(t.advance(50), 0);
    EXPECT_EQ(t.advance(50), 1);
}

TEST(TickerTest, LeftoverTimeIsKept) {
    Ticker t(100);
    EXPECT_EQ(t.advance(99), 0);
    EXPECT_EQ(t.advance(1), 1);
    EXPECT_EQ(t.advance(99), 0);
}

TEST(TickerTest, ALongGapGivesSeveralTicks) {
    Ticker t(100);
    EXPECT_EQ(t.advance(250), 2);
    EXPECT_EQ(t.advance(50), 1);
}

TEST(TickerTest, ZeroAndNegativeTimeGiveNothing) {
    Ticker t(100);
    EXPECT_EQ(t.advance(0), 0);
    EXPECT_EQ(t.advance(-10), 0);
    EXPECT_EQ(t.advance(100), 1);
}

TEST(TickerTest, ABadIntervalNeverTicks) {
    Ticker zero(0);
    Ticker negative(-5);
    EXPECT_EQ(zero.advance(1000), 0);
    EXPECT_EQ(negative.advance(1000), 0);
}

TEST(TickerTest, RemembersItsInterval) {
    Ticker t(250);
    EXPECT_EQ(t.getInterval(), 250);
}
