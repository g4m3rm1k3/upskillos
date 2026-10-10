#include "minitest.h"
#include "../game.h"

static void idle(Game& g, int turns) {
    for (int i = 0; i < turns; i++) {
        g.apply(Action::None);
    }
}

TEST(GameTest, StartsReady) {
    Game g;
    EXPECT_TRUE(g.isRunning());
    EXPECT_EQ(g.getState(), GameState::Playing);
    EXPECT_EQ(g.getTurn(), 0);
    EXPECT_EQ(g.getMessage(), "");
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getPlayer().getY(), 1);
    EXPECT_EQ(g.getCoins().remaining(), 5);
}

TEST(GameTest, WalkingOntoACoinCollectsIt) {
    Game g;
    g.apply(Action::Right);
    EXPECT_EQ(g.getPlayer().getX(), 2);
    EXPECT_EQ(g.getPlayer().getScore(), 10);
    EXPECT_EQ(g.getPlayer().getSteps(), 1);
    EXPECT_EQ(g.getCoins().remaining(), 4);
    EXPECT_EQ(g.getMessage(), "You found a coin!\n");
}

TEST(GameTest, AWallBlocksTheMove) {
    Game g;
    g.apply(Action::Left);
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getPlayer().getSteps(), 0);
    EXPECT_EQ(g.getMessage(), "A wall blocks the way.\n");
    EXPECT_EQ(g.getTurn(), 1);
}

TEST(GameTest, QuitStopsTheGameButIsNotALoss) {
    Game g;
    g.apply(Action::Quit);
    EXPECT_FALSE(g.isRunning());
    EXPECT_EQ(g.getState(), GameState::Playing);
    EXPECT_EQ(g.getTurn(), 0);
}

TEST(GameTest, HelpCostsNothing) {
    Game g;
    g.apply(Action::Help);
    EXPECT_EQ(g.getTurn(), 0);
    EXPECT_EQ(g.getMessage(), "");
}

TEST(GameTest, DoingNothingCostsATurn) {
    Game g;
    g.apply(Action::None);
    EXPECT_EQ(g.getTurn(), 1);
    EXPECT_EQ(g.getPlayer().getX(), 1);
}

TEST(GameTest, TheEnemyMovesEverySecondTurn) {
    Game g;
    idle(g, 1);
    EXPECT_EQ(g.getEnemy().getX(), 8);
    idle(g, 1);
    EXPECT_EQ(g.getEnemy().getX(), 7);
    EXPECT_EQ(g.getEnemy().getY(), 4);
}

TEST(GameTest, TheMessageIsReplacedEachTurn) {
    Game g;
    g.apply(Action::Right);
    g.apply(Action::Right);
    EXPECT_EQ(g.getMessage(), "");
}

TEST(GameTest, StandingStillGetsYouHit) {
    Game g;
    idle(g, 19);
    EXPECT_EQ(g.getPlayer().getHealth(), 10);
    g.apply(Action::None);
    EXPECT_EQ(g.getPlayer().getHealth(), 7);
    EXPECT_EQ(g.getMessage(), "The enemy hits you!\n");
}

TEST(GameTest, LosingNeedsTwentyThreeTurnsOfStandingStill) {
    Game g;
    idle(g, 22);
    EXPECT_EQ(g.getState(), GameState::Playing);
    EXPECT_EQ(g.getPlayer().getHealth(), 1);
    g.apply(Action::None);
    EXPECT_EQ(g.getState(), GameState::Lost);
    EXPECT_EQ(g.getPlayer().getHealth(), 0);
}

TEST(GameTest, NothingHappensAfterTheGameEnds) {
    Game g;
    idle(g, 23);
    g.apply(Action::Right);
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getTurn(), 23);
}
