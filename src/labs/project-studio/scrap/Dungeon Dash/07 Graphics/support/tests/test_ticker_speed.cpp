#include "minitest.h"
#include "../timing.h"

TEST(TickerSpeedTest, FasterHalvesTheInterval) {
    Ticker t(400);
    t.faster();
    EXPECT_EQ(t.getInterval(), 200);
    t.faster();
    EXPECT_EQ(t.getInterval(), 100);
    t.faster();
    EXPECT_EQ(t.getInterval(), 50);
}

TEST(TickerSpeedTest, FasterStopsAtFifty) {
    Ticker t(50);
    t.faster();
    EXPECT_EQ(t.getInterval(), 50);
    Ticker u(60);
    u.faster();
    EXPECT_EQ(u.getInterval(), 50);
}

TEST(TickerSpeedTest, SlowerDoublesTheInterval) {
    Ticker t(400);
    t.slower();
    EXPECT_EQ(t.getInterval(), 800);
    t.slower();
    EXPECT_EQ(t.getInterval(), 1600);
}

TEST(TickerSpeedTest, SlowerStopsAtSixteenHundred) {
    Ticker t(1600);
    t.slower();
    EXPECT_EQ(t.getInterval(), 1600);
    Ticker u(1000);
    u.slower();
    EXPECT_EQ(u.getInterval(), 1600);
}

TEST(TickerSpeedTest, OddIntervalsUseWholeNumbers) {
    Ticker t(301);
    t.faster();
    EXPECT_EQ(t.getInterval(), 150);
}

TEST(TickerSpeedTest, TheTickerStillWorksAfterwards) {
    Ticker t(400);
    t.faster();
    EXPECT_EQ(t.advance(199), 0);
    EXPECT_EQ(t.advance(1), 1);
}
