#include "minitest.h"
#include "../effects.h"

TEST(FlashTest, StartsQuiet) {
    Flash f;
    EXPECT_FALSE(f.active());
    EXPECT_EQ(f.alpha(100), 0);
}

TEST(FlashTest, StartsAtFullStrength) {
    Flash f;
    f.trigger(200);
    EXPECT_TRUE(f.active());
    EXPECT_EQ(f.alpha(100), 100);
}

TEST(FlashTest, FadesInAStraightLine) {
    Flash f;
    f.trigger(200);
    f.update(100);
    EXPECT_EQ(f.alpha(100), 50);
    f.update(50);
    EXPECT_EQ(f.alpha(100), 25);
}

TEST(FlashTest, EndsAndStaysEnded) {
    Flash f;
    f.trigger(200);
    f.update(500);
    EXPECT_FALSE(f.active());
    EXPECT_EQ(f.alpha(100), 0);
    f.update(500);
    EXPECT_EQ(f.alpha(100), 0);
}

TEST(FlashTest, TriggeringAgainRestarts) {
    Flash f;
    f.trigger(200);
    f.update(150);
    f.trigger(200);
    EXPECT_EQ(f.alpha(100), 100);
}

TEST(FlashTest, NegativeTimeIsIgnored) {
    Flash f;
    f.trigger(200);
    f.update(-50);
    EXPECT_EQ(f.alpha(100), 100);
}

TEST(FlashTest, ADurationOfZeroNeverStarts) {
    Flash f;
    f.trigger(0);
    EXPECT_FALSE(f.active());
    EXPECT_EQ(f.alpha(100), 0);
}
