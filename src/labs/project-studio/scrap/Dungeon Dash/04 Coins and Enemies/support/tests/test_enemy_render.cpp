#include "minitest.h"
#include <algorithm>
#include <string>
#include "../render.h"

TEST(EnemyRenderTest, DrawsTheEnemyAsE) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 3);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(out[3 * 11 + 8], 'E');
    EXPECT_EQ(std::count(out.begin(), out.end(), 'E'), 1);
}

TEST(EnemyRenderTest, CoinsAreStillDrawn) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 3);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 5);
}

TEST(EnemyRenderTest, EnemyIsDrawnOverACoin) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 4);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(out[4 * 11 + 8], 'E');
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 4);
}

TEST(EnemyRenderTest, HeroIsDrawnOverTheEnemy) {
    Map m;
    Player p(5, 3);
    Coins c;
    Enemy e(5, 3);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(out[3 * 11 + 5], '@');
    EXPECT_EQ(std::count(out.begin(), out.end(), 'E'), 0);
}

TEST(EnemyRenderTest, PictureKeepsItsSize) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 3);
    EXPECT_EQ(renderMap(m, p, c, e).size(), 66u);
}
