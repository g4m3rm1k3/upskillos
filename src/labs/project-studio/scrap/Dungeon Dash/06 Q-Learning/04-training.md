---
title: 6.4 — Training
runtime: none
support: levels/training.txt, tests/test_train.cpp, tests/test_greedy.cpp, tests/test_choice_name.cpp
---

You have an environment, a table and a way to explore. Now put them together. **Training** is one loop inside another:

```text
for each episode:
    start a new game, and get the first state
    until the game is over:
        choose an action        (lesson 6.3)
        play it, get a reward and a new state   (lesson 6.1)
        update the table        (lesson 6.2)
```

After thousands of episodes the table holds a good guess for how every situation turns out. Then you switch exploring **off** (epsilon 0) and let the agent play from the table alone. That is the test of whether it learned anything.

Click the button that creates the supporting files before you start. It creates `levels/training.txt` and the test files.

## Read the training tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_train.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include <vector>
#include "../agent.h"

static Level corridor() {
    std::istringstream in("#########\n#@..*...#\n#######E#\n#########\n");
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(TrainTest, OneRewardPerEpisode) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 25;
    std::vector<double> rewards = train(env, q, config);
    EXPECT_EQ(rewards.size(), 25u);
}

TEST(TrainTest, TrainingFillsTheTable) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 25;
    train(env, q, config);
    EXPECT_GT(q.stateCount(), 0);
    EXPECT_TRUE(q.knows("h1,1;e7,2;c4,1+;p0"));
}

TEST(TrainTest, TheSameSeedGivesTheSameTraining) {
    Env env1(corridor());
    Env env2(corridor());
    QTable q1(Env::actionCount());
    QTable q2(Env::actionCount());
    TrainConfig config;
    config.episodes = 40;
    config.seed = 99;
    EXPECT_EQ(train(env1, q1, config), train(env2, q2, config));
    EXPECT_EQ(q1.stateCount(), q2.stateCount());
}

TEST(TrainTest, RewardsStayInTheRealRange) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 50;
    for (double r : train(env, q, config)) {
        EXPECT_GT(r, -200.0);
        EXPECT_LT(r, 60.0);
    }
}
```

- `TrainConfig` holds the settings for a training run, so `train` doesn't need a long list of parameters.
- `train(env, q, config)` returns one number per episode: the total reward that episode earned.
- The same seed must give exactly the same training. That makes experiments repeatable.
- The last test checks that no episode scores outside what the rules allow: no more than the best possible `57`, and not below `-200`.

## Declare the training functions

Replace `agent.h`. The two functions from lesson 6.3 stay:

```cpp file=agent.h
#pragma once

#include <random>
#include <string>
#include <vector>
#include "env.h"
#include "qtable.h"

struct TrainConfig {
    int episodes = 1000;
    double alpha = 0.5;
    double gamma = 0.9;
    double epsilonStart = 1.0;
    double epsilonEnd = 0.05;
    unsigned seed = 1;
};

struct EpisodeResult {
    double totalReward;
    int steps;
    bool won;
};

int chooseAction(const QTable& q, const std::string& state, double epsilon, std::mt19937& rng);
double epsilonAt(int episode, int totalEpisodes, double start, double end);

std::vector<double> train(Env& env, QTable& q, const TrainConfig& config);
EpisodeResult runGreedy(Env& env, const QTable& q);
```

- `int episodes = 1000;` inside a struct gives the member a **default value**, as `Point hero{0, 0};` did in lesson 5.2. A new `TrainConfig` has all of these settings already filled in. You change only the ones you want: `config.episodes = 500;`.
- `unsigned` is a whole number that can't be negative. It is the type the random engine likes for a seed.
- `train` changes both the environment and the table, so both are non-`const` references.
- `runGreedy` plays one episode using only the table's best actions. It changes the environment, but only **reads** the table, so `q` is `const`.

```check
contains agent.h "#include \"env.h\"" -- Include env.h in agent.h.
matches agent.h "struct\s+TrainConfig\s*\{" -- Define the type with struct TrainConfig { ... };
matches agent.h "int\s+episodes\s*=\s*1000\s*;" -- Give TrainConfig the member int episodes = 1000;
matches agent.h "unsigned\s+seed\s*=\s*1\s*;" -- Give TrainConfig the member unsigned seed = 1;
matches agent.h "struct\s+EpisodeResult\s*\{" -- Define the type with struct EpisodeResult { ... };
matches agent.h "std::vector<double>\s+train\s*\(\s*Env\s*&\s*\w+\s*,\s*QTable\s*&\s*\w+\s*,\s*const\s+TrainConfig\s*&\s*\w+\s*\)\s*;" -- Declare std::vector<double> train(Env& env, QTable& q, const TrainConfig& config);
matches agent.h "EpisodeResult\s+runGreedy\s*\(\s*Env\s*&\s*\w+\s*,\s*const\s+QTable\s*&\s*\w+\s*\)\s*;" -- Declare EpisodeResult runGreedy(Env& env, const QTable& q);
```

## The training loop

Replace `agent.cpp`. Keep your own `chooseAction` and `epsilonAt`. They are shown here as in lessons 6.3:

```cpp file=agent.cpp
#include "agent.h"

int chooseAction(const QTable& q, const std::string& state, double epsilon, std::mt19937& rng) {
    std::uniform_real_distribution<double> unit(0.0, 1.0);

    if (unit(rng) < epsilon) {
        std::uniform_int_distribution<int> pick(0, q.actionCount() - 1);
        return pick(rng);
    }
    return q.bestAction(state);
}

double epsilonAt(int episode, int totalEpisodes, double start, double end) {
    if (totalEpisodes <= 1) {
        return start;
    }

    double progress = static_cast<double>(episode) / (totalEpisodes - 1);
    if (progress > 1.0) {
        progress = 1.0;
    }
    if (progress < 0.0) {
        progress = 0.0;
    }
    return start + (end - start) * progress;
}

std::vector<double> train(Env& env, QTable& q, const TrainConfig& config) {
    std::mt19937 rng(config.seed);
    std::vector<double> rewards;

    for (int episode = 0; episode < config.episodes; episode++) {
        double epsilon = epsilonAt(episode, config.episodes,
                                   config.epsilonStart, config.epsilonEnd);
        std::string state = env.reset();
        double total = 0.0;
        bool done = false;

        while (!done) {
            int action = chooseAction(q, state, epsilon, rng);
            StepResult result = env.step(action);

            q.update(state, action, result.reward, result.state,
                     result.done, config.alpha, config.gamma);

            total += result.reward;
            state = result.state;
            done = result.done;
        }
        rewards.push_back(total);
    }
    return rewards;
}
```

- The engine is created **once**, from the seed, and used for the whole training. That is why one seed gives one repeatable run.
- The outer loop is the episodes. Each one gets its own epsilon, from the schedule in lesson 6.3: large early, small late.
- `env.reset()` starts a new game and returns the first state.
- The inner `while (!done)` loop is one episode. It chooses an action, plays it, and calls `q.update` with the four facts from the step.
- After the update, the new state becomes the current one: `state = result.state;`. The step's `done` says whether the loop stops.
- `total` adds up the rewards. It is pushed into `rewards` when the episode ends, so the result has one number per episode.
- One simplification: the step limit also counts as `done`, so the table treats "ran out of steps" the same as "the game ended". For these small levels that is fine.

```predict
question: You train for 500 episodes. How many numbers does train return?
answer: 500
explain: The function adds exactly one total to the vector at the end of every episode.
tolerance: 0
```

```check
matches agent.cpp "std::vector<double>\s+train\s*\(\s*Env\s*&\s*\w+\s*,\s*QTable\s*&\s*\w+\s*,\s*const\s+TrainConfig\s*&\s*\w+\s*\)\s*\{" -- Define std::vector<double> train(Env& env, QTable& q, const TrainConfig& config) { ... } in agent.cpp.
contains agent.cpp "std::mt19937 rng(config.seed);" -- Create the engine once with std::mt19937 rng(config.seed);
contains agent.cpp "env.reset()" -- Start each episode with env.reset()
contains agent.cpp "q.update(" -- Learn from every step with q.update(...)
run "g++ -std=c++17 -c agent.cpp -o agent.o" label="agent.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_train.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_train" label="tests/test_train.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_train" label="Training runs correctly" -- A test failed. Read which one. Is the engine created ONCE outside both loops? Do you push one total per episode?
run "g++ -std=c++17 tests/test_choose.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_choose" label="tests/test_choose.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_choose" label="chooseAction still passes" -- Your changes broke an earlier test.
run "g++ -std=c++17 tests/test_epsilon.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_epsilon" label="tests/test_epsilon.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_epsilon" label="epsilonAt still passes" -- Your changes broke an earlier test.
```

## Read the greedy tests

Now the other half: playing with what was learned. Here are the tests, given to you:

```cpp file=tests/test_greedy.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../agent.h"

static Level corridor() {
    std::istringstream in("#########\n#@..*...#\n#######E#\n#########\n");
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(GreedyTest, AnEmptyTableJustPicksUp) {
    Env env(corridor());
    QTable q(Env::actionCount());
    EpisodeResult r = runGreedy(env, q);
    EXPECT_FALSE(r.won);
    EXPECT_EQ(r.steps, 17);
    EXPECT_DOUBLE_EQ(r.totalReward, -87.0);
}

TEST(GreedyTest, ATableThatKnowsTheWay) {
    Env env(corridor());
    QTable q(Env::actionCount());
    q.set("h1,1;e7,2;c4,1+;p0", 3, 1.0);
    q.set("h2,1;e7,2;c4,1+;p1", 3, 1.0);
    q.set("h3,1;e7,1;c4,1+;p0", 3, 1.0);
    EpisodeResult r = runGreedy(env, q);
    EXPECT_TRUE(r.won);
    EXPECT_EQ(r.steps, 3);
    EXPECT_DOUBLE_EQ(r.totalReward, 57.0);
}

TEST(GreedyTest, PlayingDoesNotChangeTheTable) {
    Env env(corridor());
    QTable q(Env::actionCount());
    runGreedy(env, q);
    EXPECT_EQ(q.stateCount(), 0);
}

TEST(GreedyTest, TheAgentLearnsTheCorridor) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 5000;
    train(env, q, config);

    EpisodeResult r = runGreedy(env, q);
    EXPECT_TRUE(r.won);
    EXPECT_EQ(r.steps, 3);
    EXPECT_DOUBLE_EQ(r.totalReward, 57.0);
}
```

- The first test is an agent that learned nothing. Every cell is zero, so the best action is always 0 (Up). The hero bumps into the top wall for 17 turns while the enemy walks up and wins. The reward adds up as `-13` for the first 13 steps, then `-7`, `-7`, `-7` for the three hits, then `-53` for the final blow: `-87` in all.
- The second test fakes a table that knows the way: Right in each of the three states on the path.
- The last test is the real thing. It trains for 5000 episodes and checks that the agent then wins in the **fewest possible steps**: three. With only 2000 episodes the agent always wins, but about one run in four still takes a wasted step, depending on its random choices. More practice makes the best path certain, which is a first taste of how much training a learner needs.

## Play with what was learned

Add `runGreedy` to the end of `agent.cpp`. Keep everything above it:

```cpp file=agent.cpp
#include "agent.h"

int chooseAction(const QTable& q, const std::string& state, double epsilon, std::mt19937& rng) {
    std::uniform_real_distribution<double> unit(0.0, 1.0);

    if (unit(rng) < epsilon) {
        std::uniform_int_distribution<int> pick(0, q.actionCount() - 1);
        return pick(rng);
    }
    return q.bestAction(state);
}

double epsilonAt(int episode, int totalEpisodes, double start, double end) {
    if (totalEpisodes <= 1) {
        return start;
    }

    double progress = static_cast<double>(episode) / (totalEpisodes - 1);
    if (progress > 1.0) {
        progress = 1.0;
    }
    if (progress < 0.0) {
        progress = 0.0;
    }
    return start + (end - start) * progress;
}

std::vector<double> train(Env& env, QTable& q, const TrainConfig& config) {
    std::mt19937 rng(config.seed);
    std::vector<double> rewards;

    for (int episode = 0; episode < config.episodes; episode++) {
        double epsilon = epsilonAt(episode, config.episodes,
                                   config.epsilonStart, config.epsilonEnd);
        std::string state = env.reset();
        double total = 0.0;
        bool done = false;

        while (!done) {
            int action = chooseAction(q, state, epsilon, rng);
            StepResult result = env.step(action);

            q.update(state, action, result.reward, result.state,
                     result.done, config.alpha, config.gamma);

            total += result.reward;
            state = result.state;
            done = result.done;
        }
        rewards.push_back(total);
    }
    return rewards;
}

EpisodeResult runGreedy(Env& env, const QTable& q) {
    EpisodeResult result{0.0, 0, false};
    std::string state = env.reset();
    bool done = false;

    while (!done) {
        StepResult step = env.step(q.bestAction(state));
        result.totalReward += step.reward;
        result.steps++;
        state = step.state;
        done = step.done;
    }

    result.won = env.getGame().getState() == GameState::Won;
    return result;
}
```

- It is the same loop as in `train`, with the learning and the exploring removed. The action is always `q.bestAction(state)`, with no randomness at all.
- `EpisodeResult result{0.0, 0, false};` builds the result with braces: total reward `0.0`, steps `0`, won `false`. The loop fills it in.
- The `done` flag is true when the game is over or the step limit is hit, so the loop always ends.
- `result.won` compares the game's final state with `GameState::Won`. It is `true` only for a real win.

```predict
question: After 5000 episodes, the greedy agent starts the corridor. How many steps does the best possible play take?
answer: 3
explain: The coin is three tiles to the right of the hero. Right, Right, Right collects it, and with it the last coin, which wins the game.
tolerance: 0
```

```check
matches agent.cpp "EpisodeResult\s+runGreedy\s*\(\s*Env\s*&\s*\w+\s*,\s*const\s+QTable\s*&\s*\w+\s*\)\s*\{" -- Define EpisodeResult runGreedy(Env& env, const QTable& q) { ... } in agent.cpp.
contains agent.cpp "q.bestAction(state)" -- Play with env.step(q.bestAction(state)): no exploring.
contains agent.cpp "GameState::Won" -- Set result.won by comparing the game's state with GameState::Won.
run "g++ -std=c++17 -c agent.cpp -o agent.o" label="agent.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_greedy.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_greedy" label="tests/test_greedy.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_greedy" label="The agent plays and learns" -- A test failed. Read which one. Does runGreedy only read the table? Does training update with the step's done value?
run "g++ -std=c++17 tests/test_train.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_train" label="tests/test_train.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_train" label="Training still passes" -- Your changes broke an earlier test.
```

## Train from the command line

Now run it for real. Replace `main.cpp`. It is the menu game from lesson 5.4, with a new mode: if the first word after the program's name is `--train`, the program trains an agent, then lets you watch it play:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include "agent.h"
#include "env.h"
#include "game.h"
#include "input.h"
#include "level.h"
#include "menu.h"
#include "scoreboard.h"

static int playLevel(const std::string& path) {
    Level level;
    Game game;
    if (loadLevelFile(path, level)) {
        game = Game(level);
        std::cout << "Loaded " << path << " (" << describeLevel(level) << ")" << std::endl;
    } else {
        std::cout << "Could not load " << path << ": " << level.error << std::endl;
        std::cout << "Using the built-in level instead." << std::endl;
    }

    while (!game.isOver()) {
        std::cout << game.render();
        std::cout << game.statusText();
        std::cout << "Move (W/A/S/D, H for help, Q to quit): ";
        Action action = readAction(std::cin);

        if (action == Action::Help) {
            showHelp();
        }

        game.apply(action);
        std::cout << game.getMessage();
    }

    std::cout << game.summary();
    return game.getPlayer().getScore();
}

static int trainMode(const std::string& path) {
    Level level;
    if (!loadLevelFile(path, level)) {
        std::cout << "Could not load " << path << ": " << level.error << std::endl;
        return 1;
    }

    Env env(level);
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 20000;

    std::cout << "Training on " << path << " for " << config.episodes << " episodes..." << std::endl;
    train(env, q, config);
    std::cout << "The table knows " << q.stateCount() << " states." << std::endl;

    std::string state = env.reset();
    bool done = false;
    while (!done) {
        std::cout << env.getGame().render();
        int action = q.bestAction(state);
        std::cout << "Agent chooses action " << action << std::endl;

        StepResult result = env.step(action);
        state = result.state;
        done = result.done;
    }

    std::cout << env.getGame().summary();
    return 0;
}

int main(int argc, char* argv[]) {
    std::string path = "levels/level1.txt";
    bool pathGiven = false;
    bool training = false;

    for (int i = 1; i < argc; i++) {
        std::string word = argv[i];
        if (word == "--train") {
            training = true;
        } else {
            path = word;
            pathGiven = true;
        }
    }

    if (training) {
        if (!pathGiven) {
            path = "levels/training.txt";
        }
        return trainMode(path);
    }

    showTitle();

    Scoreboard board;
    bool running = true;
    while (running) {
        showMenu();
        MenuChoice choice = readMenuChoice(std::cin);

        switch (choice) {
            case MenuChoice::Start:
                if (board.record(playLevel(path))) {
                    std::cout << "New best score: " << board.getBest() << std::endl;
                }
                break;
            case MenuChoice::Help:
                showHelp();
                break;
            case MenuChoice::Quit:
                running = false;
                break;
            case MenuChoice::Unknown:
                std::cout << "Please choose 1, 2 or 3." << std::endl;
                break;
        }
    }

    std::cout << "Thanks for playing!" << std::endl;
    return 0;
}
```

- This is `main` as it stands after lesson 5.4's Your turn. If yours differs a little, keep your menu code and add only the `trainMode` function and the `--train` handling.
- The loop over `argv` looks at every word the player typed. `--train` switches the mode on. Any other word is taken as the level path, and `pathGiven` remembers that one was given.
- `argv[i]` is a plain C string. `std::string word = argv[i];` converts it, so `word == "--train"` compares text properly.
- `trainMode` loads the level, trains for 20000 episodes, then plays once with the learned table and prints each picture and chosen action number. Action 0 is Up, 1 Down, 2 Left, 3 Right and 4 Wait.
- Without a path, training uses `levels/training.txt`. It is a small arena with two coins. The agent must grab both, dodge the enemy, and reach the end:

```text
#######
#@.*..#
#.##..#
#..*.E#
#######
```

Compile, then run it in a terminal so you can give it the extra word. On Windows run `game --train`. On macOS and Linux run `./game --train`. It takes a few seconds.

Watch what happens. On a hard level the agent may win, or it may walk into the enemy. Neither is a bug: the learning is random, and 20000 episodes is a modest amount. Try changing `config.episodes` to `5000` or `100000` and compare.

```check
contains main.cpp "#include \"agent.h\"" -- Include agent.h in main.cpp.
contains main.cpp "static int trainMode" -- Add static int trainMode(const std::string& path) { ... } to main.cpp.
contains main.cpp "\"--train\"" -- Switch training on when an argument is "--train".
contains main.cpp "Env env(level);" -- Create the environment with Env env(level);
contains main.cpp "train(env, q, config)" -- Train with train(env, q, config);
contains main.cpp "levels/training.txt" -- Use levels/training.txt as the default level for training.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o game" label="the whole project builds" -- Build all fourteen .cpp files together and fix the errors shown.
run "./game --train" stdout="Training on levels/training.txt for 20000 episodes..." label="--train trains on the training level" -- When a word on the command line is --train, train on levels/training.txt. If the level is missing, click the button that creates the provided files.
run "./game --train" stdout="Agent chooses action " label="the trained agent plays a game" -- After training, play once with q.bestAction(state) and print Agent chooses action and the number.
run "./game" stdin="2\n" stdout="Thanks for playing!" label="without --train the menu still works" -- Only train when --train is given; otherwise run the menu as in lesson 5.4.
```

## Your turn: name the move

Action numbers are hard to read. Write a function in `agent.h` and `agent.cpp`:

```
std::string describeChoice(const QTable& q, const std::string& state);
```

- It looks up the table's best action for the state and returns its name: `"Up"`, `"Down"`, `"Left"`, `"Right"` or `"Wait"`.

Then change `trainMode` in `main.cpp`: instead of printing `Agent chooses action ` and the number, print `Agent chooses: ` followed by `describeChoice(q, state)`. Keep playing with `q.bestAction(state)`.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_choice_name.cpp provided
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
```

Your changes go in `agent.h`, `agent.cpp` and `main.cpp`. Don't change the tests.

```check
matches agent.h "std::string\s+describeChoice\s*\(\s*const\s+QTable\s*&\s*\w+\s*,\s*const\s+std::string\s*&\s*\w+\s*\)\s*;" -- Declare std::string describeChoice(const QTable& q, const std::string& state); in agent.h.
run "g++ -std=c++17 -c agent.cpp -o agent.o" label="agent.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_choice_name.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_choice_name" label="tests/test_choice_name.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_choice_name" label="Moves have names" -- A test failed. Read which one. Do you look up the best action first, then convert its number into an Action with Env::actionAt?
run "g++ -std=c++17 tests/test_greedy.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_greedy" label="tests/test_greedy.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_greedy" label="Greedy play still passes" -- Your changes broke an earlier test.
contains main.cpp "Agent chooses: " -- Print Agent chooses:  followed by the name.
contains main.cpp "describeChoice(q, state)" -- Get the name with describeChoice(q, state).
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o game" label="the whole project builds" -- Build all fourteen .cpp files together and fix the errors shown.
run "./game --train" stdout="Agent chooses: " label="the agent's moves are named" -- Print Agent chooses: followed by describeChoice(q, state).
run "./game --train" without="Agent chooses action " label="the action numbers are gone" -- Replace the line that printed the action number.
```

```hints
nudge: You already have a function that turns an action number into an Action. And you have a switch for enums from lesson 3.1.
concept: q.bestAction(state) gives a number. Env::actionAt(number) turns it into an Action. A switch on that Action can return the right word, with default for the last one.
shape: switch (Env::actionAt(q.bestAction(state))) { case Action::Up: return "Up"; ... default: return "Wait"; }
answer: In agent.h, add:
~~~cpp
std::string describeChoice(const QTable& q, const std::string& state);
~~~
In agent.cpp, add:
~~~cpp
std::string describeChoice(const QTable& q, const std::string& state) {
    switch (Env::actionAt(q.bestAction(state))) {
        case Action::Up:
            return "Up";
        case Action::Down:
            return "Down";
        case Action::Left:
            return "Left";
        case Action::Right:
            return "Right";
        default:
            return "Wait";
    }
}
~~~
In main.cpp, in trainMode, replace the line that prints the action number:
~~~cpp
        std::cout << "Agent chooses action " << action << std::endl;
~~~
with a line that prints its name:
~~~cpp
        std::cout << "Agent chooses: " << describeChoice(q, state) << std::endl;
~~~
```
