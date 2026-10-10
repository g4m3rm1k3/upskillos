#include "minitest.h"
#include "../level.h"

TEST(LoadTest, ANewFileNameFails) {
    Level level;
    EXPECT_FALSE(loadLevelFile("no/such/folder/level.txt", level));
    EXPECT_EQ(level.error, "cannot open file");
}

TEST(LoadTest, AFailedLoadLeavesAnEmptyLevel) {
    Level level;
    EXPECT_FALSE(loadLevelFile("no/such/folder/level.txt", level));
    EXPECT_TRUE(level.rows.empty());
    EXPECT_TRUE(level.coins.empty());
}
