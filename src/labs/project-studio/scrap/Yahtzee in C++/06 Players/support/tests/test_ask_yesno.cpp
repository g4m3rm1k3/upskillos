#include "minitest.h"
#include "fakeinput.h"
#include "../Input.h"

TEST(AskYesNo, AcceptsYes) {
    FakeInput in("y\n");
    bool yes = false;
    EXPECT_EQ(askYesNo("? ", yes), true);
    EXPECT_EQ(yes, true);
}

TEST(AskYesNo, AcceptsNo) {
    FakeInput in("No\n");
    bool yes = true;
    EXPECT_EQ(askYesNo("? ", yes), true);
    EXPECT_EQ(yes, false);
}

TEST(AskYesNo, AsksAgainUntilItUnderstands) {
    FakeInput in("maybe\n\nsure\nYES\n");
    bool yes = false;
    EXPECT_EQ(askYesNo("? ", yes), true);
    EXPECT_EQ(yes, true);
}

TEST(AskYesNo, GivesUpWhenInputEnds) {
    FakeInput in("maybe\n");
    bool yes = true;
    EXPECT_EQ(askYesNo("? ", yes), false);
    EXPECT_EQ(yes, true);
}
