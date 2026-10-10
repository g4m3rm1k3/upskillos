#include "minitest.h"
#include "../enemy.h"

TEST(EnemyTest, StartsAtGivenPosition) {
    Enemy e(8, 4);
    EXPECT_EQ(e.getX(), 8);
    EXPECT_EQ(e.getY(), 4);
}

TEST(EnemyTest, StepsAcrossWhenTheHeroIsFartherAcross) {
    Map m;
    Player p(2, 4);
    Enemy e(8, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 7);
    EXPECT_EQ(e.getY(), 4);
}

TEST(EnemyTest, StepsUpWhenTheHeroIsFartherUp) {
    Map m;
    Player p(1, 1);
    Enemy e(1, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 1);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, LongerDistanceGoesFirst) {
    Map m;
    Player p(7, 1);
    Enemy e(8, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 8);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, EqualDistancesGoAcrossFirst) {
    Map m;
    Player p(7, 3);
    Enemy e(8, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 7);
    EXPECT_EQ(e.getY(), 4);
}

TEST(EnemyTest, StaysOnTheHero) {
    Map m;
    Player p(3, 3);
    Enemy e(3, 3);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 3);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, FallsBackToTheOtherDirection) {
    Map m;
    Player p(4, 1);
    Enemy e(3, 3);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 4);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, StaysPutWhenBothWaysAreBlocked) {
    Map m;
    Player p(4, 1);
    Enemy e(4, 3);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 4);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, NeverWalksIntoAWall) {
    Map m;
    Player p(8, 1);
    Enemy e(1, 4);
    for (int i = 0; i < 20; i++) {
        e.chase(m, p);
        EXPECT_FALSE(m.isWall(e.getX(), e.getY()));
    }
}

TEST(EnemyTest, ReachesTheHeroOnOpenFloor) {
    Map m;
    Player p(8, 4);
    Enemy e(1, 4);
    for (int i = 0; i < 7; i++) {
        e.chase(m, p);
    }
    EXPECT_EQ(e.getX(), 8);
    EXPECT_EQ(e.getY(), 4);
}
