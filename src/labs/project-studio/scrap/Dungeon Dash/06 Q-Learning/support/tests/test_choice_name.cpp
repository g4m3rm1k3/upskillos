#include "minitest.h"
#include <string>
#include "../agent.h"

TEST(ChoiceNameTest, AnEmptyTableSaysUp) {
    QTable q(5);
    EXPECT_EQ(describeChoice(q, "s"), "Up");
}

TEST(ChoiceNameTest, EveryActionHasAName) {
    const char* names[] = {"Up", "Down", "Left", "Right", "Wait"};
    for (int a = 0; a < 5; a++) {
        QTable q(5);
        q.set("s", a, 1.0);
        EXPECT_EQ(describeChoice(q, "s"), names[a]);
    }
}

TEST(ChoiceNameTest, DoesNotChangeTheTable) {
    QTable q(5);
    describeChoice(q, "s");
    EXPECT_EQ(q.stateCount(), 0);
}
