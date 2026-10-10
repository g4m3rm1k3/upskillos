#include "minitest.h"
#include <sstream>
#include <string>
#include "../env.h"

static Level corridor() {
    std::istringstream in("#########\n#@..*...#\n#######E#\n#########\n");
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(EnvTest, FiveActionsInAFixedOrder) {
    EXPECT_EQ(Env::actionCount(), 5);
    EXPECT_EQ(Env::actionAt(0), Action::Up);
    EXPECT_EQ(Env::actionAt(1), Action::Down);
    EXPECT_EQ(Env::actionAt(2), Action::Left);
    EXPECT_EQ(Env::actionAt(3), Action::Right);
    EXPECT_EQ(Env::actionAt(4), Action::None);
}

TEST(EnvTest, TheStartingStateKey) {
    Env env(corridor());
    EXPECT_EQ(env.stateKey(), "h1,1;e7,2;c4,1+;p0");
}

TEST(EnvTest, ResetReturnsTheStartingKey) {
    Env env(corridor());
    env.step(3);
    EXPECT_EQ(env.reset(), "h1,1;e7,2;c4,1+;p0");
    EXPECT_EQ(env.getSteps(), 0);
    EXPECT_EQ(env.getGame().getTurn(), 0);
}

TEST(EnvTest, AStepReturnsTheNewStateAndAReward) {
    Env env(corridor());
    StepResult r = env.step(3);
    EXPECT_EQ(r.state, "h2,1;e7,2;c4,1+;p1");
    EXPECT_DOUBLE_EQ(r.reward, -1.0);
    EXPECT_FALSE(r.done);
    EXPECT_EQ(env.getSteps(), 1);
}

TEST(EnvTest, ABlockedMoveStillCostsAStep) {
    Env env(corridor());
    StepResult r = env.step(0);
    EXPECT_EQ(env.getGame().getPlayer().getY(), 1);
    EXPECT_EQ(r.state, "h1,1;e7,2;c4,1+;p1");
    EXPECT_DOUBLE_EQ(r.reward, -1.0);
}

TEST(EnvTest, TheKeyKnowsWhetherTheTurnIsOddOrEven) {
    Env env(corridor());
    std::string first = env.stateKey();
    StepResult r = env.step(4);
    EXPECT_NE(r.state, first);
    EXPECT_EQ(r.state, "h1,1;e7,2;c4,1+;p1");
}

TEST(EnvTest, TheCoinAndTheWinPayOff) {
    Env env(corridor());
    EXPECT_DOUBLE_EQ(env.step(3).reward, -1.0);
    EXPECT_DOUBLE_EQ(env.step(3).reward, -1.0);
    StepResult r = env.step(3);
    EXPECT_DOUBLE_EQ(r.reward, 59.0);
    EXPECT_TRUE(r.done);
    EXPECT_EQ(r.state, "h4,1;e7,1;c;p1");
    EXPECT_EQ(env.getGame().getState(), GameState::Won);
}

TEST(EnvTest, TheStepLimitEndsTheEpisode) {
    Env env(corridor(), 3);
    EXPECT_FALSE(env.step(4).done);
    EXPECT_FALSE(env.step(4).done);
    EXPECT_TRUE(env.step(4).done);
}

TEST(EnvTest, LosingCostsFiftyMore) {
    Env env(corridor());
    StepResult r{"", 0.0, false};
    for (int i = 0; i < 17; i++) {
        r = env.step(4);
        if (i < 16) {
            EXPECT_FALSE(r.done);
        }
    }
    EXPECT_TRUE(r.done);
    EXPECT_EQ(env.getGame().getState(), GameState::Lost);
    EXPECT_DOUBLE_EQ(r.reward, -53.0);
}
