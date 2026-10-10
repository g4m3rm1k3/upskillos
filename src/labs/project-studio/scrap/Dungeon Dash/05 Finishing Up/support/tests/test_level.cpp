#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

static const char* kSmall =
    "#####\n"
    "#@.*#\n"
    "#.E.#\n"
    "#####\n";

TEST(LevelTest, ParsesTheRows) {
    std::istringstream in(kSmall);
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.rows[0], "#####");
    EXPECT_EQ(level.rows[3], "#####");
}

TEST(LevelTest, FindsTheHero) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    EXPECT_EQ(level.hero.x, 1);
    EXPECT_EQ(level.hero.y, 1);
}

TEST(LevelTest, FindsTheCoin) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    ASSERT_EQ(level.coins.size(), 1u);
    EXPECT_EQ(level.coins[0].x, 3);
    EXPECT_EQ(level.coins[0].y, 1);
}

TEST(LevelTest, FindsTheEnemy) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    EXPECT_EQ(level.enemy.x, 2);
    EXPECT_EQ(level.enemy.y, 2);
}

TEST(LevelTest, MarkersBecomeFloor) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    EXPECT_EQ(level.rows[1], "#...#");
    EXPECT_EQ(level.rows[2], "#...#");
}

TEST(LevelTest, CoinsAreReadTopToBottomThenLeftToRight) {
    std::istringstream in("#######\n#@..*.#\n#*..E.#\n#######\n");
    Level level;
    parseLevel(in, level);
    ASSERT_EQ(level.coins.size(), 2u);
    EXPECT_EQ(level.coins[0].x, 4);
    EXPECT_EQ(level.coins[0].y, 1);
    EXPECT_EQ(level.coins[1].x, 1);
    EXPECT_EQ(level.coins[1].y, 2);
}

TEST(LevelTest, WindowsLineEndingsAreFine) {
    std::istringstream in("#####\r\n#@.*#\r\n#.E.#\r\n#####\r\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.rows[0], "#####");
    EXPECT_EQ(level.rows[1], "#...#");
}

TEST(LevelTest, BlankLinesAreSkipped) {
    std::istringstream in("\n#####\n\n#@.*#\n#.E.#\n#####\n\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.hero.y, 1);
}

TEST(LevelTest, NoFinalNewlineIsFine) {
    std::istringstream in("#####\n#@.*#\n#.E.#\n#####");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    EXPECT_EQ(level.rows.size(), 4u);
}

TEST(LevelTest, ParsingTwiceStartsFresh) {
    Level level;
    std::istringstream first(kSmall);
    parseLevel(first, level);
    std::istringstream second(kSmall);
    parseLevel(second, level);
    EXPECT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.coins.size(), 1u);
}
