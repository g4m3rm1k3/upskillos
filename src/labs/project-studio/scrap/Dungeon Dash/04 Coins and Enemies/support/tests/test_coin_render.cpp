#include "minitest.h"
#include <algorithm>
#include <string>
#include "../render.h"

TEST(CoinRenderTest, DrawsCoinsAsStars) {
    Map m;
    Player p(1, 1);
    Coins c;
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(out[1 * 11 + 2], '*');
    EXPECT_EQ(out[4 * 11 + 8], '*');
}

TEST(CoinRenderTest, DrawsEveryCoin) {
    Map m;
    Player p(1, 1);
    Coins c;
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 5);
}

TEST(CoinRenderTest, HeroIsDrawnOverACoin) {
    Map m;
    Player p(2, 1);
    Coins c;
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(out[1 * 11 + 2], '@');
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 4);
}

TEST(CoinRenderTest, CollectedCoinsDisappear) {
    Map m;
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(out[1 * 11 + 2], '.');
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 4);
}

TEST(CoinRenderTest, PictureKeepsItsSize) {
    Map m;
    Player p(1, 1);
    Coins c;
    EXPECT_EQ(renderMap(m, p, c).size(), 66u);
}
