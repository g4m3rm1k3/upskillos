#include "minitest.h"
#include <vector>
#include "../stats.h"

TEST(StatsTest, AveragesEachBlock) {
    std::vector<double> got = blockAverages({1, 2, 3, 4, 5, 6}, 2);
    ASSERT_EQ(got.size(), 3u);
    EXPECT_DOUBLE_EQ(got[0], 1.5);
    EXPECT_DOUBLE_EQ(got[1], 3.5);
    EXPECT_DOUBLE_EQ(got[2], 5.5);
}

TEST(StatsTest, TheLastBlockMayBeShort) {
    std::vector<double> got = blockAverages({1, 2, 3, 4, 5, 6}, 4);
    ASSERT_EQ(got.size(), 2u);
    EXPECT_DOUBLE_EQ(got[0], 2.5);
    EXPECT_DOUBLE_EQ(got[1], 5.5);
}

TEST(StatsTest, OneBlockWhenItIsBigEnough) {
    std::vector<double> got = blockAverages({2, 4}, 10);
    ASSERT_EQ(got.size(), 1u);
    EXPECT_DOUBLE_EQ(got[0], 3.0);
}

TEST(StatsTest, BlocksOfOneAreTheValuesThemselves) {
    std::vector<double> got = blockAverages({7, -3}, 1);
    ASSERT_EQ(got.size(), 2u);
    EXPECT_DOUBLE_EQ(got[0], 7.0);
    EXPECT_DOUBLE_EQ(got[1], -3.0);
}

TEST(StatsTest, EmptyInputGivesNothing) {
    EXPECT_TRUE(blockAverages({}, 3).empty());
}

TEST(StatsTest, ABadBlockSizeGivesNothing) {
    EXPECT_TRUE(blockAverages({1, 2, 3}, 0).empty());
    EXPECT_TRUE(blockAverages({1, 2, 3}, -2).empty());
}
