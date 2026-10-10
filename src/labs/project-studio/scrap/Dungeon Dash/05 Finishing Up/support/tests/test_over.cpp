#include "minitest.h"
#include "../game.h"

TEST(OverTest, NotOverAtTheStart) {
    Game g;
    EXPECT_FALSE(g.isOver());
}

TEST(OverTest, OverAfterQuitting) {
    Game g;
    g.apply(Action::Quit);
    EXPECT_TRUE(g.isOver());
}

TEST(OverTest, HelpDoesNotEndTheGame) {
    Game g;
    g.apply(Action::Help);
    EXPECT_FALSE(g.isOver());
}

TEST(OverTest, NotOverWhileTheHeroIsAlive) {
    Game g;
    for (int i = 0; i < 22; i++) {
        g.apply(Action::None);
    }
    EXPECT_FALSE(g.isOver());
}

TEST(OverTest, OverWhenTheHeroIsDefeated) {
    Game g;
    for (int i = 0; i < 23; i++) {
        g.apply(Action::None);
    }
    EXPECT_TRUE(g.isOver());
}
