#include "minitest.h"
#include "../keymap.h"

TEST(WaitKeyTest, SpaceAndFullStopWait) {
    EXPECT_TRUE(isWaitKey(' '));
    EXPECT_TRUE(isWaitKey('.'));
}

TEST(WaitKeyTest, OtherKeysDoNot) {
    EXPECT_FALSE(isWaitKey('w'));
    EXPECT_FALSE(isWaitKey('r'));
    EXPECT_FALSE(isWaitKey(0));
}

TEST(RestartKeyTest, OnlyRRestarts) {
    EXPECT_TRUE(isRestartKey('r'));
    EXPECT_FALSE(isRestartKey('R'));
    EXPECT_FALSE(isRestartKey(' '));
    EXPECT_FALSE(isRestartKey('w'));
}

TEST(KeysTest, TheNewKeysAreNotActions) {
    EXPECT_EQ(actionForKey(' '), Action::None);
    EXPECT_EQ(actionForKey('r'), Action::None);
}
