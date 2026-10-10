#include "minitest.h"
#include "../Input.h"

TEST(YesNo, AcceptsYes) {
    bool yes = false;
    EXPECT_EQ(parseYesNo("y", yes), true);
    EXPECT_EQ(yes, true);
    yes = false;
    EXPECT_EQ(parseYesNo("YES", yes), true);
    EXPECT_EQ(yes, true);
    yes = false;
    EXPECT_EQ(parseYesNo(" Yes \r", yes), true);
    EXPECT_EQ(yes, true);
}

TEST(YesNo, AcceptsNo) {
    bool yes = true;
    EXPECT_EQ(parseYesNo("n", yes), true);
    EXPECT_EQ(yes, false);
    yes = true;
    EXPECT_EQ(parseYesNo("No", yes), true);
    EXPECT_EQ(yes, false);
    yes = true;
    EXPECT_EQ(parseYesNo("NO", yes), true);
    EXPECT_EQ(yes, false);
}

TEST(YesNo, RejectsOtherWords) {
    bool yes = true;
    EXPECT_EQ(parseYesNo("maybe", yes), false);
    EXPECT_EQ(parseYesNo("yess", yes), false);
    EXPECT_EQ(parseYesNo("", yes), false);
    EXPECT_EQ(parseYesNo("y n", yes), false);
}

TEST(YesNo, LeavesTheAnswerAloneOnFailure) {
    bool yes = true;
    EXPECT_EQ(parseYesNo("nope", yes), false);
    EXPECT_EQ(yes, true);
    yes = false;
    EXPECT_EQ(parseYesNo("nope", yes), false);
    EXPECT_EQ(yes, false);
}
