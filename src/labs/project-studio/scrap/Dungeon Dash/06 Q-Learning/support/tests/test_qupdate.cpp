#include "minitest.h"
#include "../qtable.h"

TEST(QUpdateTest, MovesHalfwayToTheTarget) {
    QTable q(5);
    q.update("s", 3, 10.0, "t", false, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 3), 5.0);
}

TEST(QUpdateTest, UsesTheBestNextValue) {
    QTable q(5);
    q.set("s", 3, 5.0);
    q.set("t", 1, 20.0);
    q.update("s", 3, 10.0, "t", false, 0.5, 0.9);
    EXPECT_NEAR(q.get("s", 3), 16.5, 1e-9);
}

TEST(QUpdateTest, DoneIgnoresTheFuture) {
    QTable q(5);
    q.set("t", 1, 20.0);
    q.update("s", 3, 10.0, "t", true, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 3), 5.0);
}

TEST(QUpdateTest, NegativeRewardsLowerTheValue) {
    QTable q(5);
    q.update("s", 0, -1.0, "t", false, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 0), -0.5);
}

TEST(QUpdateTest, AlphaOneJumpsToTheTarget) {
    QTable q(5);
    q.set("t", 2, 4.0);
    q.update("s", 0, 3.0, "t", false, 1.0, 0.5);
    EXPECT_DOUBLE_EQ(q.get("s", 0), 5.0);
}

TEST(QUpdateTest, AlphaZeroChangesNothing) {
    QTable q(5);
    q.set("s", 3, 7.0);
    q.update("s", 3, 100.0, "t", false, 0.0, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 3), 7.0);
}

TEST(QUpdateTest, OnlyOneCellChanges) {
    QTable q(5);
    q.update("s", 3, 10.0, "t", false, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 0), 0.0);
    EXPECT_DOUBLE_EQ(q.get("s", 4), 0.0);
    EXPECT_EQ(q.stateCount(), 1);
}

TEST(QUpdateTest, RepeatedUpdatesApproachTheTarget) {
    QTable q(5);
    for (int i = 0; i < 10; i++) {
        q.update("s", 0, 10.0, "t", true, 0.5, 0.9);
    }
    EXPECT_NEAR(q.get("s", 0), 9.990234375, 1e-9);
}
