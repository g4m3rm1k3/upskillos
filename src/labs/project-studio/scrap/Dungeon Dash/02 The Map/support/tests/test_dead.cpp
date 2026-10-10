#include "minitest.h"
#include <string>
#include "../render.h"

TEST(DeadHeroTest, LivingHeroIsAt) {
    Map m;
    Player p(1, 1);
    p.takeDamage(9);
    EXPECT_EQ(renderMap(m, p)[12], '@');
}

TEST(DeadHeroTest, DeadHeroIsX) {
    Map m;
    Player p(1, 1);
    p.takeDamage(10);
    EXPECT_EQ(renderMap(m, p)[12], 'X');
}

TEST(DeadHeroTest, VeryDeadHeroIsStillOneX) {
    Map m;
    Player p(1, 1);
    p.takeDamage(25);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out[12], 'X');
    EXPECT_EQ(out.find('@'), std::string::npos);
}
