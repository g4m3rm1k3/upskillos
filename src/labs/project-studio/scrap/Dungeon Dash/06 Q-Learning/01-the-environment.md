---
title: 6.1 — The Environment
track: Q-Learning
runtime: none
support: tests/test_env.cpp, tests/test_env_coins.cpp
---

So far you wrote the rules and a person played. In this chapter the computer learns to play **by itself**. Nobody tells it "go right, then collect the coin". It only gets a score, tries things, and slowly works out which choices pay off. This is **reinforcement learning**, and **Q-learning** is one of its simplest methods.

You build it in five steps:

1. **6.1** wraps the game so a learner can play it. (This lesson.)
2. **6.2** builds the table that stores what was learned.
3. **6.3** decides when to try something new.
4. **6.4** trains the agent and watches it play.
5. **6.5** measures the progress and saves the table to a file.

Click the button that creates the supporting test files before you start.

## The words you need

| Word            | Meaning here                                                           |
| --------------- | ---------------------------------------------------------------------- |
| **Agent**       | The learner. It chooses what to do.                                    |
| **Environment** | The world the agent acts in. Here, your `Game` and its rules.          |
| **State**       | What the agent can see right now.                                      |
| **Action**      | One thing the agent can do.                                            |
| **Reward**      | A number the environment gives back after an action. Higher is better. |
| **Episode**     | One whole game, from the start until it ends.                          |

The agent and the environment take turns, again and again:

```text
agent sees a state -> agent picks an action -> environment returns a reward and a new state
```

Your `Game` class is already the environment. It has the rules, in `apply`. What it lacks is a plain interface that a learner can use. A learner wants two things: "start over" and "do action number 3, then tell me what happened". You build that now, in a class called `Env`.

```predict
question: In this chapter, which part of the project is the environment?
choice: The Game class and its rules
choice: The table of learned numbers
choice: The person at the keyboard
answer: The Game class and its rules
explain: The environment is the world the agent acts in. The agent sends it an action, and the rules in Game::apply decide what happens.
```

## A small level to learn on

The first lessons use this tiny level, a corridor. The coin is three steps to the right, and the enemy starts in a pocket at the far end:

```text
#########
#@..*...#
#######E#
#########
```

Every number in the tests comes from this level. The hero starts at `(1, 1)`, the coin is at `(4, 1)`, and the enemy is at `(7, 2)`.

## The class

Create `env.h`:

```cpp file=env.h
#pragma once

#include <string>
#include "game.h"
#include "level.h"

struct StepResult {
    std::string state;
    double reward;
    bool done;
};

class Env {
public:
    explicit Env(const Level& startLevel, int limit = 60);

    static int actionCount();
    static Action actionAt(int index);

    std::string reset();
    StepResult step(int actionIndex);

    std::string stateKey() const;
    const Game& getGame() const;
    int getSteps() const;

private:
    Level level;
    Game game;
    int maxSteps;
    int steps;
};
```

- `StepResult` bundles what one action gives back: the new `state` (as text), the `reward` (a `double`, a number with a decimal point), and `done`, which says whether the episode is over.
- `int limit = 60` is a **default argument**. If the caller gives no second value, `limit` is 60. It is written only in the declaration, never again in the definition.
- `static` in front of a member function means it belongs to the class, not to one object. You call it as `Env::actionCount()`, with no `Env` object needed.
- The learner will use **numbers** for actions: 0, 1, 2 and so on. `actionAt` turns a number into the game's `Action`.
- `level` is a copy of the starting level. `reset` uses it to build a fresh game.
- `maxSteps` stops an episode that goes nowhere. A hero that bumps into a wall forever would otherwise never finish.
- The members are in the order `level`, `game`, `maxSteps`, `steps`. The constructor's list must follow that order.

```check
file env.h -- Create a file called env.h in the project folder.
contains env.h "#pragma once" -- Start the header with #pragma once.
matches env.h "struct\s+StepResult\s*\{" -- Define the type with struct StepResult { ... };
matches env.h "explicit\s+Env\s*\(\s*const\s+Level\s*&\s*\w+\s*,\s*int\s+\w+\s*=\s*60\s*\)\s*;" -- Declare explicit Env(const Level& startLevel, int limit = 60);
matches env.h "static\s+int\s+actionCount\s*\(\s*\)\s*;" -- Declare static int actionCount();
matches env.h "static\s+Action\s+actionAt\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare static Action actionAt(int index);
matches env.h "StepResult\s+step\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare StepResult step(int actionIndex);
matches env.h "std::string\s+reset\s*\(\s*\)\s*;" -- Declare std::string reset();
matches env.h "std::string\s+stateKey\s*\(\s*\)\s*const\s*;" -- Declare std::string stateKey() const;
```

## Read the tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_env.cpp provided
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
```

- `env.step(3)` means "do action number 3", which is Right.
- A **state key** is a short piece of text that describes the situation. `h1,1` is the hero, `e7,2` the enemy, `c4,1+` a coin at `(4, 1)`, and `p0` says whether the turn number is even (`0`) or odd (`1`).
- The last test stands still for 17 turns. The enemy walks along the corridor and wears the hero down. On turn 17 the hero's health goes from 1 to 0, so it loses 1 point of health: `-1` for the step, `-2` for the damage, `-50` for losing.

## Actions, resets and the constructor

Create `env.cpp`. Start with the constructor, the actions and the reset:

```cpp file=env.cpp
#include "env.h"

Env::Env(const Level& startLevel, int limit)
    : level(startLevel), game(startLevel), maxSteps(limit), steps(0) {}

int Env::actionCount() {
    return 5;
}

Action Env::actionAt(int index) {
    switch (index) {
        case 0:
            return Action::Up;
        case 1:
            return Action::Down;
        case 2:
            return Action::Left;
        case 3:
            return Action::Right;
        default:
            return Action::None;
    }
}

const Game& Env::getGame() const { return game; }
int Env::getSteps() const { return steps; }
```

- The constructor stores a copy of the level and builds the first game from it, using the `Game(const Level&)` constructor from lesson 5.3.
- A `static` function has no `static` in its definition. Only the declaration carries it.
- `switch` on an `int` works like the switch on a `char` in lesson 3.1. Action 4, and any number that isn't 0 to 3, falls into `default` and means "wait".
- The agent can't choose Help or Quit. Both would be useless to it.

```check
file env.cpp -- Create a file called env.cpp in the project folder.
contains env.cpp "#include \"env.h\"" -- Include your own header with #include "env.h".
matches env.cpp "int\s+Env::actionCount\s*\(\s*\)" -- Define int Env::actionCount() { ... } with no static in front.
matches env.cpp "Action\s+Env::actionAt\s*\(\s*int\s+\w+\s*\)" -- Define Action Env::actionAt(int index) { ... }
run "g++ -std=c++17 -c env.cpp -o env.o" label="env.cpp compiles" -- Fix the compiler errors shown. Keep the initializer list in the same order as the members in env.h.
```

## What the agent sees

The agent doesn't see a picture. It sees a **state key**: text built from the facts that matter. Add `stateKey` to `env.cpp`:

```cpp file=env.cpp
#include "env.h"

Env::Env(const Level& startLevel, int limit)
    : level(startLevel), game(startLevel), maxSteps(limit), steps(0) {}

int Env::actionCount() {
    return 5;
}

Action Env::actionAt(int index) {
    switch (index) {
        case 0:
            return Action::Up;
        case 1:
            return Action::Down;
        case 2:
            return Action::Left;
        case 3:
            return Action::Right;
        default:
            return Action::None;
    }
}

const Game& Env::getGame() const { return game; }
int Env::getSteps() const { return steps; }

std::string Env::stateKey() const {
    const Map& map = game.getMap();

    std::string key = "h" + std::to_string(game.getPlayer().getX())
        + "," + std::to_string(game.getPlayer().getY());
    key += ";e" + std::to_string(game.getEnemy().getX())
        + "," + std::to_string(game.getEnemy().getY());

    key += ";c";
    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            if (game.getCoins().hasCoinAt(x, y)) {
                key += std::to_string(x) + "," + std::to_string(y) + "+";
            }
        }
    }

    key += ";p" + std::to_string(game.getTurn() % 2);
    return key;
}
```

- `"h" + std::to_string(...)` works because one side is a `std::string`, as in lesson 5.1.
- The two loops visit every tile, as in lesson 2.2. Each tile that holds a coin adds its position to the key. So the key always says exactly which coins are left, in a fixed order.
- `game.getTurn() % 2` is `0` on even turns and `1` on odd turns. The enemy moves only on even turns, so the same picture can mean two different futures. The key includes this so the agent can tell them apart.
- The key does **not** include health or the step count. Fewer details mean fewer different states, so the agent learns faster. The price is that the agent can't tell a hero with 10 health from one with 1.
- The key has no spaces. That matters in lesson 6.5, when it is saved to a file.

```predict
question: In the corridor, the agent is at the start and does action 3 (Right). What is the new state key?
choice: h2,1;e7,2;c4,1+;p1
choice: h2,1;e7,2;c4,1+;p0
choice: h1,1;e7,2;c4,1+;p1
answer: h2,1;e7,2;c4,1+;p1
explain: The hero moves from x = 1 to x = 2. The enemy doesn't move, because it moves only on even turns. This was turn 1, which is odd, so the last part is p1.
```

```check
matches env.cpp "std::string\s+Env::stateKey\s*\(\s*\)\s*const" -- Define std::string Env::stateKey() const { ... }
contains env.cpp "hasCoinAt(x, y)" -- Look for coins with game.getCoins().hasCoinAt(x, y) inside the two loops.
contains env.cpp "% 2" -- Add the turn's parity with game.getTurn() % 2.
run "g++ -std=c++17 -c env.cpp -o env.o" label="env.cpp compiles" -- Fix the compiler errors shown.
```

## Rewards and steps

Now the heart of it. `step` plays one action and works out the reward:

| Event                            | Reward       |
| -------------------------------- | ------------ |
| Every step                       | -1           |
| Each point scored (a coin is 10) | +1 per point |
| Each health point lost           | -2           |
| Winning                          | +50          |
| Losing                           | -50          |

The `-1` on every step makes a fast win worth more than a slow one. Coins give a small prize, winning a big one. Damage and losing are punished. The agent has no idea what these numbers mean. It only learns that some choices lead to higher totals.

Add `step` and `reset` to the end of `env.cpp`:

```cpp file=env.cpp
#include "env.h"

Env::Env(const Level& startLevel, int limit)
    : level(startLevel), game(startLevel), maxSteps(limit), steps(0) {}

int Env::actionCount() {
    return 5;
}

Action Env::actionAt(int index) {
    switch (index) {
        case 0:
            return Action::Up;
        case 1:
            return Action::Down;
        case 2:
            return Action::Left;
        case 3:
            return Action::Right;
        default:
            return Action::None;
    }
}

const Game& Env::getGame() const { return game; }
int Env::getSteps() const { return steps; }

std::string Env::stateKey() const {
    const Map& map = game.getMap();

    std::string key = "h" + std::to_string(game.getPlayer().getX())
        + "," + std::to_string(game.getPlayer().getY());
    key += ";e" + std::to_string(game.getEnemy().getX())
        + "," + std::to_string(game.getEnemy().getY());

    key += ";c";
    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            if (game.getCoins().hasCoinAt(x, y)) {
                key += std::to_string(x) + "," + std::to_string(y) + "+";
            }
        }
    }

    key += ";p" + std::to_string(game.getTurn() % 2);
    return key;
}

std::string Env::reset() {
    game = Game(level);
    steps = 0;
    return stateKey();
}

StepResult Env::step(int actionIndex) {
    int scoreBefore = game.getPlayer().getScore();
    int healthBefore = game.getPlayer().getHealth();

    game.apply(actionAt(actionIndex));
    steps++;

    double reward = -1.0;
    reward += game.getPlayer().getScore() - scoreBefore;
    reward -= 2.0 * (healthBefore - game.getPlayer().getHealth());
    if (game.getState() == GameState::Won) {
        reward += 50.0;
    }
    if (game.getState() == GameState::Lost) {
        reward -= 50.0;
    }

    bool done = game.isOver() || steps >= maxSteps;
    return StepResult{stateKey(), reward, done};
}
```

- `reset` replaces the game with a brand new one, the same way `main` did in lesson 5.3. It returns the starting state.
- `step` first writes down the score and health **before** the action. The difference afterwards says what the action caused.
- `game.apply(...)` is the whole game turn from lesson 5.1: the move, the coin, the enemy and the win/lose check.
- `reward += int` is fine. C++ converts the `int` into a `double` for you.
- The episode is `done` when the game is over **or** the step limit is reached.
- `StepResult{stateKey(), reward, done}` builds the result with braces, as `Point{x, y}` did in lesson 5.2.

```predict
question: In the corridor the agent does Right three times in a row. What is the reward for the third step? (-1 for the step, +10 for the coin, +50 for winning.)
answer: 59
explain: -1 + 10 + 50 = 59. The first two steps only cost -1 each.
tolerance: 0.01
```

```check
contains env.cpp "game = Game(level);" -- Reset with game = Game(level); and set steps back to 0.
matches env.cpp "game\.apply\(\s*actionAt\(\s*\w+\s*\)\s*\)" -- Play the action with game.apply(actionAt(actionIndex));
contains env.cpp "GameState::Won" -- Add 50 to the reward when the game is won.
contains env.cpp "GameState::Lost" -- Subtract 50 from the reward when the game is lost.
matches env.cpp "steps\s*>=\s*maxSteps" -- The episode is also done when steps >= maxSteps.
run "g++ -std=c++17 -c env.cpp -o env.o" label="env.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_env.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp -o test_env" label="tests/test_env.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_env" label="The environment passes its tests" -- A test failed. Read which one. Do you measure the score and health BEFORE game.apply? Is the reward -1 plus the score gained, minus twice the health lost?
```

## Your turn: count the coins

A learner often wants a simple measure of how well an episode went. Add a function to `Env`:

- `int coinsCollected() const` returns how many coins the hero has collected **in the current episode**.
- It is `0` at the start and after a `reset`.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_env_coins.cpp provided
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
```

Your changes go in `env.h` and `env.cpp`. Don't change the tests.

```check
matches env.h "int\s+coinsCollected\s*\(\s*\)\s*const\s*;" -- Declare int coinsCollected() const; in env.h.
run "g++ -std=c++17 -c env.cpp -o env.o" label="env.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_env_coins.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp -o test_env_coins" label="tests/test_env_coins.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_env_coins" label="Coins are counted" -- A test failed. Read which one. Compare how many coins the level started with to how many are left.
run "g++ -std=c++17 tests/test_env.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp -o test_env" label="tests/test_env.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_env" label="The environment still passes" -- Your change broke an earlier test. Check you only added a function.
```

```hints
nudge: How many coins did the level start with? How many are left now? What is the difference?
concept: The Env keeps its own copy of the level, and level.coins is a vector of the starting coin positions. The game's Coins object knows how many are left. Collected = started minus remaining.
shape: One line: return the size of level.coins (converted to int) minus game.getCoins().remaining().
answer: In env.h, add to the public section:
~~~cpp
    int coinsCollected() const;
~~~
In env.cpp, add:
~~~cpp
int Env::coinsCollected() const {
    return static_cast<int>(level.coins.size()) - game.getCoins().remaining();
}
~~~
```
