#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

static std::string errorFor(const std::string& text) {
    std::istringstream in(text);
    Level level;
    if (parseLevel(in, level)) {
        return "";
    }
    return level.error;
}

TEST(LevelErrorTest, EmptyText) {
    EXPECT_EQ(errorFor(""), "empty level");
}

TEST(LevelErrorTest, OnlyBlankLines) {
    EXPECT_EQ(errorFor("\n\n"), "empty level");
}

TEST(LevelErrorTest, RowsOfDifferentLengths) {
    EXPECT_EQ(errorFor("#####\n#@.*#\n#.E#\n#####\n"), "rows differ in length");
}

TEST(LevelErrorTest, UnknownTile) {
    EXPECT_EQ(errorFor("#####\n#@x*#\n#.E.#\n#####\n"), "unknown tile");
}

TEST(LevelErrorTest, NoHero) {
    EXPECT_EQ(errorFor("#####\n#..*#\n#.E.#\n#####\n"), "need exactly one hero (@)");
}

TEST(LevelErrorTest, TwoHeroes) {
    EXPECT_EQ(errorFor("#####\n#@@*#\n#.E.#\n#####\n"), "need exactly one hero (@)");
}

TEST(LevelErrorTest, NoEnemy) {
    EXPECT_EQ(errorFor("#####\n#@.*#\n#...#\n#####\n"), "need exactly one enemy (E)");
}

TEST(LevelErrorTest, TwoEnemies) {
    EXPECT_EQ(errorFor("#####\n#@E*#\n#.E.#\n#####\n"), "need exactly one enemy (E)");
}

TEST(LevelErrorTest, NoCoins) {
    EXPECT_EQ(errorFor("#####\n#@..#\n#.E.#\n#####\n"), "need at least one coin (*)");
}

TEST(LevelErrorTest, AGoodLevelHasNoError) {
    EXPECT_EQ(errorFor("#####\n#@.*#\n#.E.#\n#####\n"), "");
}
