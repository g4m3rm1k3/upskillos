#include "minitest.h"
#include "../qtable.h"

TEST(QTableExtraTest, UnknownAtTheStart) {
    QTable q(5);
    EXPECT_FALSE(q.knows("a"));
}

TEST(QTableExtraTest, SettingMakesAStateKnown) {
    QTable q(5);
    q.set("a", 0, 1.0);
    EXPECT_TRUE(q.knows("a"));
    EXPECT_FALSE(q.knows("b"));
}

TEST(QTableExtraTest, ReadingDoesNotMakeAStateKnown) {
    QTable q(5);
    q.get("a", 0);
    EXPECT_FALSE(q.knows("a"));
}

TEST(QTableExtraTest, UpdatingMakesTheFirstStateKnownOnly) {
    QTable q(5);
    q.update("a", 1, 1.0, "b", false, 0.5, 0.9);
    EXPECT_TRUE(q.knows("a"));
    EXPECT_FALSE(q.knows("b"));
}

TEST(QTableExtraTest, ClearForgetsEverything) {
    QTable q(5);
    q.set("a", 0, 1.0);
    q.set("b", 1, 2.0);
    q.clear();
    EXPECT_EQ(q.stateCount(), 0);
    EXPECT_FALSE(q.knows("a"));
    EXPECT_DOUBLE_EQ(q.get("b", 1), 0.0);
    EXPECT_EQ(q.actionCount(), 5);
}
