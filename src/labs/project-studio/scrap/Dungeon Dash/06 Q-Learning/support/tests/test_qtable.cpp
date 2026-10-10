#include "minitest.h"
#include "../qtable.h"

TEST(QTableTest, StartsEmpty) {
    QTable q(5);
    EXPECT_EQ(q.actionCount(), 5);
    EXPECT_EQ(q.stateCount(), 0);
    EXPECT_DOUBLE_EQ(q.get("s", 2), 0.0);
}

TEST(QTableTest, SetAndGet) {
    QTable q(5);
    q.set("a", 1, 2.5);
    EXPECT_DOUBLE_EQ(q.get("a", 1), 2.5);
    EXPECT_DOUBLE_EQ(q.get("a", 0), 0.0);
    EXPECT_EQ(q.stateCount(), 1);
}

TEST(QTableTest, ReadingNeverAddsAState) {
    QTable q(5);
    q.get("a", 0);
    q.maxValue("a");
    q.bestAction("a");
    EXPECT_EQ(q.stateCount(), 0);
}

TEST(QTableTest, BadActionsAreIgnored) {
    QTable q(5);
    q.set("a", 7, 1.0);
    q.set("a", -1, 1.0);
    EXPECT_EQ(q.stateCount(), 0);
    EXPECT_DOUBLE_EQ(q.get("a", 7), 0.0);
    EXPECT_DOUBLE_EQ(q.get("a", -1), 0.0);
}

TEST(QTableTest, BestActionPicksTheHighest) {
    QTable q(5);
    q.set("a", 1, 2.0);
    q.set("a", 3, 4.0);
    EXPECT_EQ(q.bestAction("a"), 3);
}

TEST(QTableTest, TiesGoToTheFirstAction) {
    QTable q(5);
    q.set("a", 2, 1.0);
    q.set("a", 4, 1.0);
    EXPECT_EQ(q.bestAction("a"), 2);
}

TEST(QTableTest, UnseenStatesPickActionZero) {
    QTable q(5);
    EXPECT_EQ(q.bestAction("never seen"), 0);
    EXPECT_DOUBLE_EQ(q.maxValue("never seen"), 0.0);
}

TEST(QTableTest, NegativeValuesAreFine) {
    QTable q(5);
    for (int a = 0; a < 5; a++) {
        q.set("a", a, -10.0 + a);
    }
    EXPECT_EQ(q.bestAction("a"), 4);
    EXPECT_DOUBLE_EQ(q.maxValue("a"), -6.0);
}

TEST(QTableTest, MaxValueIsTheValueOfTheBestAction) {
    QTable q(5);
    q.set("a", 0, 3.0);
    q.set("a", 2, 7.5);
    EXPECT_DOUBLE_EQ(q.maxValue("a"), 7.5);
}
