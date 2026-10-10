#include "minitest.h"
#include "../keymap.h"

TEST(KeymapTest, TheLetterKeys) {
    EXPECT_EQ(actionForKey('w'), Action::Up);
    EXPECT_EQ(actionForKey('s'), Action::Down);
    EXPECT_EQ(actionForKey('a'), Action::Left);
    EXPECT_EQ(actionForKey('d'), Action::Right);
}

TEST(KeymapTest, TheArrowKeys) {
    EXPECT_EQ(actionForKey(1073741906), Action::Up);
    EXPECT_EQ(actionForKey(1073741905), Action::Down);
    EXPECT_EQ(actionForKey(1073741904), Action::Left);
    EXPECT_EQ(actionForKey(1073741903), Action::Right);
}

TEST(KeymapTest, QuitAndEscape) {
    EXPECT_EQ(actionForKey('q'), Action::Quit);
    EXPECT_EQ(actionForKey(27), Action::Quit);
}

TEST(KeymapTest, TheHelpKey) {
    EXPECT_EQ(actionForKey('h'), Action::Help);
}

TEST(KeymapTest, OtherKeysDoNothing) {
    EXPECT_EQ(actionForKey('x'), Action::None);
    EXPECT_EQ(actionForKey(' '), Action::None);
    EXPECT_EQ(actionForKey(0), Action::None);
    EXPECT_EQ(actionForKey(-1), Action::None);
    EXPECT_EQ(actionForKey((1 << 30) + 4), Action::None);
}
