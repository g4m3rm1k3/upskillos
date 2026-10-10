#include "minitest.h"
#include <string>
#include "../game.h"
#include "../render.h"

static void idle(Game& g, int turns) {
    for (int i = 0; i < turns; i++) {
        g.apply(Action::None);
    }
}

TEST(ViewTest, RenderIsTheFourArgumentRenderMap) {
    Game g;
    EXPECT_EQ(g.render(), renderMap(g.getMap(), g.getPlayer(), g.getCoins(), g.getEnemy()));
}

TEST(ViewTest, StatusAtTheStart) {
    Game g;
    EXPECT_EQ(g.statusText(), "Steps: 0\nScore: 0\nCoins left: 5\nHealth: 10\n");
}

TEST(ViewTest, StatusAfterACoin) {
    Game g;
    g.apply(Action::Right);
    EXPECT_EQ(g.statusText(), "Steps: 1\nScore: 10\nCoins left: 4\nHealth: 10\n");
}

TEST(ViewTest, NoWarningWhileTheEnemyIsFar) {
    Game g;
    idle(g, 15);
    EXPECT_EQ(g.statusText().find("The enemy is close!"), std::string::npos);
}

TEST(ViewTest, WarnsWhenTheEnemyIsClose) {
    Game g;
    idle(g, 16);
    EXPECT_NE(g.statusText().find("The enemy is close!"), std::string::npos);
}

TEST(ViewTest, FallenHeroIsDrawnAsX) {
    Game g;
    idle(g, 23);
    EXPECT_EQ(g.render()[12], 'X');
}

TEST(ViewTest, SummaryAtTheStart) {
    Game g;
    EXPECT_EQ(g.summary(), g.render() + "Steps: 0\nScore: 0\nRank: None\nGoodbye!\n");
}

TEST(ViewTest, SummaryAfterLosing) {
    Game g;
    idle(g, 23);
    EXPECT_EQ(g.summary(), g.render() + "Steps: 0\nScore: 0\nRank: None\nThe enemy got you. Game over.\n");
}
