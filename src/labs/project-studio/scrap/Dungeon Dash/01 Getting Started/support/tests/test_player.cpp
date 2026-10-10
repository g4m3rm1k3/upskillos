#include "minitest.h"
#include "../player.h"

TEST(PlayerTest, StartsAtGivenPosition) {
    Player p(4, 7);
    EXPECT_EQ(p.getX(), 4);
    EXPECT_EQ(p.getY(), 7);
}

TEST(PlayerTest, MoveChangesPosition) {
    Player p(2, 3);
    p.move(1, -1);
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 2);
}
