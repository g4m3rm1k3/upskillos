#include "minitest.h"
#include "../input.h"

TEST(ParseTest, LowercaseKeys) {
    EXPECT_EQ(parseAction('w'), Action::Up);
    EXPECT_EQ(parseAction('a'), Action::Left);
    EXPECT_EQ(parseAction('s'), Action::Down);
    EXPECT_EQ(parseAction('d'), Action::Right);
    EXPECT_EQ(parseAction('q'), Action::Quit);
}

TEST(ParseTest, UppercaseKeys) {
    EXPECT_EQ(parseAction('W'), Action::Up);
    EXPECT_EQ(parseAction('A'), Action::Left);
    EXPECT_EQ(parseAction('S'), Action::Down);
    EXPECT_EQ(parseAction('D'), Action::Right);
    EXPECT_EQ(parseAction('Q'), Action::Quit);
}

TEST(ParseTest, OtherKeysDoNothing) {
    EXPECT_EQ(parseAction('x'), Action::None);
    EXPECT_EQ(parseAction('1'), Action::None);
    EXPECT_EQ(parseAction(' '), Action::None);
}
