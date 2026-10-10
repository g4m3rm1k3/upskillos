#include "minitest.h"
#include <sstream>
#include <string>
#include "../env.h"

static Level twoCoins() {
    std::istringstream in("#########\n#@*.*...#\n#######E#\n#########\n");
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(EnvCoinsTest, NoneAtTheStart) {
    Env env(twoCoins());
    EXPECT_EQ(env.coinsCollected(), 0);
}

TEST(EnvCoinsTest, CountsEachCoin) {
    Env env(twoCoins());
    env.step(3);
    EXPECT_EQ(env.coinsCollected(), 1);
    env.step(3);
    EXPECT_EQ(env.coinsCollected(), 1);
    env.step(3);
    EXPECT_EQ(env.coinsCollected(), 2);
}

TEST(EnvCoinsTest, ResetStartsOver) {
    Env env(twoCoins());
    env.step(3);
    env.reset();
    EXPECT_EQ(env.coinsCollected(), 0);
}
