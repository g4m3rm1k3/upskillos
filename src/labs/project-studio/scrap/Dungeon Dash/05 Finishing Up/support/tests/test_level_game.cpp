#include "minitest.h"
#include <sstream>
#include <string>
#include "../game.h"

static Level levelFrom(const std::string& text) {
    std::istringstream in(text);
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(LevelGameTest, StartsWhereTheFileSays) {
    Game g(levelFrom("#####\n#@E*#\n#####\n"));
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getPlayer().getY(), 1);
    EXPECT_EQ(g.getEnemy().getX(), 2);
    EXPECT_EQ(g.getEnemy().getY(), 1);
    EXPECT_EQ(g.getCoins().remaining(), 1);
    EXPECT_TRUE(g.getCoins().hasCoinAt(3, 1));
}

TEST(LevelGameTest, UsesTheLevelsMap) {
    Game g(levelFrom("#######\n#@...E#\n#*....#\n#######\n"));
    EXPECT_EQ(g.getMap().getWidth(), 7);
    EXPECT_EQ(g.getMap().getHeight(), 4);
    EXPECT_EQ(g.getMap().getTile(1, 1), '.');
    EXPECT_TRUE(g.getMap().isWall(0, 1));
}

TEST(LevelGameTest, CollectingTheLastCoinWins) {
    Game g(levelFrom("#######\n#@*..E#\n#######\n"));
    g.apply(Action::Right);
    EXPECT_EQ(g.getState(), GameState::Won);
    EXPECT_EQ(g.getCoins().remaining(), 0);
    EXPECT_EQ(g.getMessage(), "You found a coin!\n");
}

TEST(LevelGameTest, TheLevelsWallsBlock) {
    Game g(levelFrom("#######\n#@*..E#\n#######\n"));
    g.apply(Action::Up);
    EXPECT_EQ(g.getPlayer().getY(), 1);
    EXPECT_EQ(g.getMessage(), "A wall blocks the way.\n");
}

TEST(LevelGameTest, TheEnemyCatchesAHeroWhoStandsStill) {
    Game g(levelFrom("#####\n#@E*#\n#####\n"));
    g.apply(Action::None);
    EXPECT_EQ(g.getPlayer().getHealth(), 10);
    g.apply(Action::None);
    EXPECT_EQ(g.getPlayer().getHealth(), 7);
    EXPECT_EQ(g.getMessage(), "The enemy hits you!\n");
}
