#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

static Level levelFrom(const std::string& text) {
    std::istringstream in(text);
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(DescribeTest, OneCoin) {
    EXPECT_EQ(describeLevel(levelFrom("#####\n#@.*#\n#.E.#\n#####\n")), "5x4, 1 coin");
}

TEST(DescribeTest, TwoCoins) {
    EXPECT_EQ(describeLevel(levelFrom("#######\n#@..*.#\n#*..E.#\n#######\n")), "7x4, 2 coins");
}

TEST(DescribeTest, ThreeCoinsInOneRow) {
    EXPECT_EQ(describeLevel(levelFrom("#########\n#@*.*.*E#\n#########\n")), "9x3, 3 coins");
}
