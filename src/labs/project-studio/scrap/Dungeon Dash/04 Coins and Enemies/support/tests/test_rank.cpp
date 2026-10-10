#include "minitest.h"
#include <string>
#include "../rules.h"

TEST(RankTest, FullScoreIsGold) {
    EXPECT_EQ(rankFor(50), "Gold");
}

TEST(RankTest, AboveFiftyIsStillGold) {
    EXPECT_EQ(rankFor(80), "Gold");
}

TEST(RankTest, JustBelowGoldIsSilver) {
    EXPECT_EQ(rankFor(49), "Silver");
}

TEST(RankTest, SilverStartsAtThirty) {
    EXPECT_EQ(rankFor(30), "Silver");
    EXPECT_EQ(rankFor(29), "Bronze");
}

TEST(RankTest, BronzeStartsAtTen) {
    EXPECT_EQ(rankFor(10), "Bronze");
    EXPECT_EQ(rankFor(9), "None");
}

TEST(RankTest, ZeroIsNone) {
    EXPECT_EQ(rankFor(0), "None");
}
