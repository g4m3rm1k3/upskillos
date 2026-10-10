#include "minitest.h"
#include "../agent.h"

TEST(ChooseTest, ZeroEpsilonAlwaysExploits) {
    QTable q(5);
    q.set("s", 2, 3.0);
    std::mt19937 rng(1);
    for (int i = 0; i < 50; i++) {
        EXPECT_EQ(chooseAction(q, "s", 0.0, rng), 2);
    }
}

TEST(ChooseTest, FullEpsilonStaysInRange) {
    QTable q(5);
    q.set("s", 2, 3.0);
    std::mt19937 rng(7);
    for (int i = 0; i < 200; i++) {
        int a = chooseAction(q, "s", 1.0, rng);
        EXPECT_GE(a, 0);
        EXPECT_LT(a, 5);
    }
}

TEST(ChooseTest, FullEpsilonTriesEveryAction) {
    QTable q(5);
    q.set("s", 2, 3.0);
    std::mt19937 rng(7);
    bool seen[5] = {false, false, false, false, false};
    for (int i = 0; i < 300; i++) {
        seen[chooseAction(q, "s", 1.0, rng)] = true;
    }
    for (int a = 0; a < 5; a++) {
        EXPECT_TRUE(seen[a]);
    }
}

TEST(ChooseTest, TheSameSeedGivesTheSameChoices) {
    QTable q(5);
    std::mt19937 a(42);
    std::mt19937 b(42);
    for (int i = 0; i < 100; i++) {
        EXPECT_EQ(chooseAction(q, "s", 0.5, a), chooseAction(q, "s", 0.5, b));
    }
}

TEST(ChooseTest, HalfEpsilonMixesBothKinds) {
    QTable q(5);
    q.set("s", 4, 1.0);
    std::mt19937 rng(3);
    int best = 0;
    for (int i = 0; i < 1000; i++) {
        if (chooseAction(q, "s", 0.5, rng) == 4) {
            best++;
        }
    }
    EXPECT_GT(best, 500);
    EXPECT_LT(best, 1000);
}
