#include "minitest.h"
#include <algorithm>
#include <string>
#include "../render.h"

TEST(RenderTest, OneLinePerRow) {
    Map m;
    Player p(1, 1);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out.size(), 66u);
}

TEST(RenderTest, DrawsHeroAtPosition) {
    Map m;
    Player p(1, 1);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out[12], '@');
}

TEST(RenderTest, DrawsExactlyOneHero) {
    Map m;
    Player p(4, 3);
    std::string out = renderMap(m, p);
    EXPECT_EQ(std::count(out.begin(), out.end(), '@'), 1);
}

TEST(RenderTest, DrawsWallsAndFloor) {
    Map m;
    Player p(1, 1);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out.substr(0, 11), "##########\n");
}
