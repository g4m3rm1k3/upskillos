#include "minitest.h"
#include "../player.h"

TEST(HealthTest, StartsAtTen) {
    Player p(0, 0);
    EXPECT_EQ(p.getHealth(), 10);
}

TEST(HealthTest, DamageReducesHealth) {
    Player p(0, 0);
    p.takeDamage(4);
    EXPECT_EQ(p.getHealth(), 6);
}

TEST(HealthTest, HealthStopsAtZero) {
    Player p(0, 0);
    p.takeDamage(25);
    EXPECT_EQ(p.getHealth(), 0);
}
