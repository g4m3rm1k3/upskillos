#include "minitest.h"
#include "../hud.h"

TEST(HudTest, FullHealthFillsTheBar) {
    EXPECT_EQ(barWidth(10, 10, 100), 100);
}

TEST(HudTest, HalfHealthFillsHalf) {
    EXPECT_EQ(barWidth(5, 10, 100), 50);
    EXPECT_EQ(barWidth(3, 10, 100), 30);
}

TEST(HudTest, NoHealthIsAnEmptyBar) {
    EXPECT_EQ(barWidth(0, 10, 100), 0);
}

TEST(HudTest, TooMuchStopsAtFull) {
    EXPECT_EQ(barWidth(25, 10, 100), 100);
}

TEST(HudTest, NegativeStopsAtEmpty) {
    EXPECT_EQ(barWidth(-2, 10, 100), 0);
}

TEST(HudTest, WholePixelsOnly) {
    EXPECT_EQ(barWidth(1, 3, 100), 33);
}

TEST(HudTest, ABadMaximumGivesAnEmptyBar) {
    EXPECT_EQ(barWidth(5, 0, 100), 0);
    EXPECT_EQ(barWidth(5, -3, 100), 0);
}
