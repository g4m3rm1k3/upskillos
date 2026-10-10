---
title: 6.5 — Measuring and Saving
runtime: none
support: tests/test_stats.cpp, tests/test_qio.cpp, tests/test_qfile.cpp
---

Training prints nothing while it runs, so you can't tell whether the agent is improving. And when the program ends, everything it learned is gone. In this last lesson you fix both: you print a **learning curve**, and you **save** the table to a file.

Click the button that creates the supporting test files before you start.

## Averages by block

A single episode's reward is noisy. One episode wins, the next loses. To see a trend, group the episodes in **blocks**, for example 2000 at a time, and average each block. If the agent is learning, the averages should climb.

Here are the tests. They are given to you:

```cpp file=tests/test_stats.cpp provided
#include "minitest.h"
#include <vector>
#include "../stats.h"

TEST(StatsTest, AveragesEachBlock) {
    std::vector<double> got = blockAverages({1, 2, 3, 4, 5, 6}, 2);
    ASSERT_EQ(got.size(), 3u);
    EXPECT_DOUBLE_EQ(got[0], 1.5);
    EXPECT_DOUBLE_EQ(got[1], 3.5);
    EXPECT_DOUBLE_EQ(got[2], 5.5);
}

TEST(StatsTest, TheLastBlockMayBeShort) {
    std::vector<double> got = blockAverages({1, 2, 3, 4, 5, 6}, 4);
    ASSERT_EQ(got.size(), 2u);
    EXPECT_DOUBLE_EQ(got[0], 2.5);
    EXPECT_DOUBLE_EQ(got[1], 5.5);
}

TEST(StatsTest, OneBlockWhenItIsBigEnough) {
    std::vector<double> got = blockAverages({2, 4}, 10);
    ASSERT_EQ(got.size(), 1u);
    EXPECT_DOUBLE_EQ(got[0], 3.0);
}

TEST(StatsTest, BlocksOfOneAreTheValuesThemselves) {
    std::vector<double> got = blockAverages({7, -3}, 1);
    ASSERT_EQ(got.size(), 2u);
    EXPECT_DOUBLE_EQ(got[0], 7.0);
    EXPECT_DOUBLE_EQ(got[1], -3.0);
}

TEST(StatsTest, EmptyInputGivesNothing) {
    EXPECT_TRUE(blockAverages({}, 3).empty());
}

TEST(StatsTest, ABadBlockSizeGivesNothing) {
    EXPECT_TRUE(blockAverages({1, 2, 3}, 0).empty());
    EXPECT_TRUE(blockAverages({1, 2, 3}, -2).empty());
}
```

- `blockAverages({1, 2, 3, 4, 5, 6}, 2)` passes the numbers in braces. C++ builds a `std::vector<double>` from them.
- With a block of 4 the second block has only two numbers, `5` and `6`. It is averaged over **those two**, not divided by four.

## Declare blockAverages

Create `stats.h`:

```cpp file=stats.h
#pragma once

#include <vector>

std::vector<double> blockAverages(const std::vector<double>& values, int blockSize);
```

```check
file stats.h -- Create a file called stats.h in the project folder.
contains stats.h "#pragma once" -- Start the header with #pragma once.
matches stats.h "std::vector<double>\s+blockAverages\s*\(\s*const\s+std::vector<double>\s*&\s*\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare std::vector<double> blockAverages(const std::vector<double>& values, int blockSize);
```

## Write blockAverages

Create `stats.cpp`:

```cpp file=stats.cpp
#include "stats.h"

std::vector<double> blockAverages(const std::vector<double>& values, int blockSize) {
    std::vector<double> averages;
    if (blockSize <= 0) {
        return averages;
    }

    int count = static_cast<int>(values.size());
    for (int start = 0; start < count; start += blockSize) {
        int end = start + blockSize;
        if (end > count) {
            end = count;
        }

        double sum = 0.0;
        for (int i = start; i < end; i++) {
            sum += values[i];
        }
        averages.push_back(sum / (end - start));
    }
    return averages;
}
```

- A bad block size returns an empty result at once. Otherwise the loop below could run forever.
- The outer loop jumps `blockSize` at a time. `start += blockSize` is the same as `start = start + blockSize`. Each pass handles the values from `start` up to, but not including, `end`.
- `end` is capped at `count`, so the last block can be short.
- `sum / (end - start)` divides a `double` by an `int`. C++ turns the `int` into a `double`, so there is no integer-division trap here. `end - start` is the real size of this block.

```predict
question: The values are 1, 2, 3, 4, 5 and the block size is 2. How many averages come back?
answer: 3
explain: The blocks are (1, 2), (3, 4) and the short last block (5). That is three blocks, so three averages.
tolerance: 0
```

```check
file stats.cpp -- Create a file called stats.cpp in the project folder.
contains stats.cpp "#include \"stats.h\"" -- Include your own header with #include "stats.h".
matches stats.cpp "start\s*\+=\s*blockSize" -- Step through the values one block at a time with start += blockSize
run "g++ -std=c++17 -c stats.cpp -o stats.o" label="stats.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_stats.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o test_stats" label="tests/test_stats.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_stats" label="Block averages are correct" -- A test failed. Read which one. Is the last block divided by its own size? Does a block size of 0 or less return an empty vector?
```

## Show the learning curve

Now use it. Change `trainMode` in `main.cpp` to keep the rewards that `train` returns and print their block averages. Only `#include` lines and `trainMode` change. The rest of the file stays as it is:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include <vector>
#include "agent.h"
#include "env.h"
#include "game.h"
#include "input.h"
#include "level.h"
#include "menu.h"
#include "scoreboard.h"
#include "stats.h"

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
    std::vector<double> rewards = train(env, q, config);
    std::cout << "The table knows " << q.stateCount() << " states." << std::endl;

    int block = config.episodes / 10;
    std::vector<double> curve = blockAverages(rewards, block);
    std::cout << "Average reward in each block of " << block << " episodes:" << std::endl;
    for (int i = 0; i < static_cast<int>(curve.size()); i++) {
        std::cout << "  episodes " << i * block + 1 << " to " << (i + 1) * block
                  << ": " << curve[i] << std::endl;
    }

    std::string state = env.reset();
    bool done = false;
    while (!done) {
        std::cout << env.getGame().render();
        std::cout << "Agent chooses: " << describeChoice(q, state) << std::endl;

        int action = q.bestAction(state);
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

- `train` already returned the list of rewards. Before, `trainMode` threw it away. Now it keeps it in `rewards`.
- With 20000 episodes and `block = 2000`, you get ten averages.
- `i * block + 1` and `(i + 1) * block` print the range of episodes each average covers.
- Run it with `--train` again. The first block should be the lowest. The agent explores a lot there, and bumps into things. Later blocks should be higher. If the numbers stay flat, the agent isn't learning, and the usual suspects are `alpha`, `gamma` and `episodes`.

```check
contains main.cpp "#include \"stats.h\"" -- Include stats.h in main.cpp.
matches main.cpp "std::vector<double>\s+rewards\s*=\s*train\(\s*env\s*,\s*q\s*,\s*config\s*\)" -- Keep the result with std::vector<double> rewards = train(env, q, config);
contains main.cpp "blockAverages(rewards, block)" -- Average the rewards with blockAverages(rewards, block)
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o game" label="the whole project builds" -- Build all fifteen .cpp files together and fix the errors shown.
run "./game --train" stdout="Average reward in each block of 2000 episodes:\n  episodes 1 to 2000: " label="training prints a learning curve" -- After training, print the heading, then one line per block of blockAverages(rewards, block).
run "./game --train" stdout="  episodes 18001 to 20000: " label="the curve covers every block" -- Loop over every value in the curve, 10 blocks for 20000 episodes.
```

## Save the table as text

A trained table is worth keeping. A plain text file is easiest: one line for the number of actions, then one line per state with the state's key and its numbers. This is what the table from lesson 6.2 would look like:

```text
actions 5
s1 -1 -1 -1 4.5 -0.5
s3 2 -3 0 1 0
```

It works because a state key contains **no spaces**. Reading `key` and then five numbers with `>>` is enough to rebuild each row.

Here are the tests, given to you:

```cpp file=tests/test_qio.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../qtable.h"

TEST(QIoTest, SavesASortedTextTable) {
    QTable q(5);
    q.set("s2", 4, -2.25);
    q.set("s2", 0, 1.5);
    q.set("s1", 3, 2.0);
    std::ostringstream out;
    q.save(out);
    EXPECT_EQ(out.str(), "actions 5\ns1 0 0 0 2 0\ns2 1.5 0 0 0 -2.25\n");
}

TEST(QIoTest, AnEmptyTableSavesOnlyTheHeader) {
    QTable q(5);
    std::ostringstream out;
    q.save(out);
    EXPECT_EQ(out.str(), "actions 5\n");
}

TEST(QIoTest, LoadRestoresEveryValue) {
    QTable q(5);
    q.set("h1,1;e7,2;c4,1+;p0", 3, 0.1);
    q.set("h2,1;e7,2;c4,1+;p1", 0, -12.375);
    std::ostringstream out;
    q.save(out);

    QTable copy(5);
    std::istringstream in(out.str());
    EXPECT_TRUE(copy.load(in));
    EXPECT_EQ(copy.stateCount(), 2);
    EXPECT_DOUBLE_EQ(copy.get("h1,1;e7,2;c4,1+;p0", 3), 0.1);
    EXPECT_DOUBLE_EQ(copy.get("h2,1;e7,2;c4,1+;p1", 0), -12.375);
    EXPECT_DOUBLE_EQ(copy.get("h2,1;e7,2;c4,1+;p1", 4), 0.0);
}

TEST(QIoTest, LoadReplacesWhatWasThere) {
    QTable q(5);
    q.set("new", 1, 2.0);
    std::ostringstream out;
    q.save(out);

    QTable copy(5);
    copy.set("old", 0, 9.0);
    std::istringstream in(out.str());
    EXPECT_TRUE(copy.load(in));
    EXPECT_FALSE(copy.knows("old"));
    EXPECT_TRUE(copy.knows("new"));
}

TEST(QIoTest, WrongActionCountFails) {
    QTable q(5);
    q.set("a", 0, 1.0);
    std::ostringstream out;
    q.save(out);

    QTable other(4);
    std::istringstream in(out.str());
    EXPECT_FALSE(other.load(in));
}

TEST(QIoTest, GarbageFails) {
    QTable q(5);
    std::istringstream words("hello world");
    EXPECT_FALSE(q.load(words));
    std::istringstream shortRow("actions 5\ns1 1 2 3\n");
    EXPECT_FALSE(q.load(shortRow));
}

TEST(QIoTest, AFailedLoadKeepsTheOldTable) {
    QTable q(5);
    q.set("keep", 0, 9.0);
    std::istringstream in("actions 5\ns1 1 2 3\n");
    EXPECT_FALSE(q.load(in));
    EXPECT_DOUBLE_EQ(q.get("keep", 0), 9.0);
}
```

- `std::ostringstream` is an output stream that writes into a string, the mirror of `std::istringstream`. `out.str()` gives the text.
- The table is saved with its keys **sorted**, which a `std::map` does for free.
- The values are written with 17 digits, so a number like `0.1` comes back as exactly the same `double`.
- A load that fails halfway must leave the old table untouched.

## Declare save and load

Replace `qtable.h`. Keep your `knows` and `clear` from lesson 6.2. They are shown here:

```cpp file=qtable.h
#pragma once

#include <istream>
#include <map>
#include <ostream>
#include <string>
#include <vector>

class QTable {
public:
    explicit QTable(int actionTotal);

    int actionCount() const;
    int stateCount() const;

    double get(const std::string& state, int action) const;
    void set(const std::string& state, int action, double value);

    double maxValue(const std::string& state) const;
    int bestAction(const std::string& state) const;

    void update(const std::string& state, int action, double reward,
                const std::string& nextState, bool done, double alpha, double gamma);

    bool knows(const std::string& state) const;
    void clear();

    void save(std::ostream& out) const;
    bool load(std::istream& in);

private:
    int actions;
    std::map<std::string, std::vector<double>> table;
};
```

`save` and `load` use `std::ostream&` and `std::istream&`, so they work with a file, a string, or the console. It is the same idea as `readAction` in lesson 3.1.

```check
contains qtable.h "#include <istream>" -- Add #include <istream> to qtable.h.
contains qtable.h "#include <ostream>" -- Add #include <ostream> to qtable.h.
matches qtable.h "void\s+save\s*\(\s*std::ostream\s*&\s*\w+\s*\)\s*const\s*;" -- Declare void save(std::ostream& out) const;
matches qtable.h "bool\s+load\s*\(\s*std::istream\s*&\s*\w+\s*\)\s*;" -- Declare bool load(std::istream& in);
```

## Write save and load

Add the two functions to the end of `qtable.cpp`. Keep the rest:

```cpp
void QTable::save(std::ostream& out) const {
    std::streamsize oldPrecision = out.precision(17);

    out << "actions " << actions << "\n";
    for (const auto& entry : table) {
        out << entry.first;
        for (double value : entry.second) {
            out << " " << value;
        }
        out << "\n";
    }

    out.precision(oldPrecision);
}

bool QTable::load(std::istream& in) {
    std::string word;
    int count = 0;
    if (!(in >> word >> count) || word != "actions" || count != actions) {
        return false;
    }

    std::map<std::string, std::vector<double>> loaded;
    std::string key;
    while (in >> key) {
        std::vector<double> row(actions);
        for (int a = 0; a < actions; a++) {
            if (!(in >> row[a])) {
                return false;
            }
        }
        loaded[key] = row;
    }

    table = loaded;
    return true;
}
```

- `out.precision(17)` makes numbers print with up to 17 digits. It returns the old setting, which is put back at the end so the caller's stream isn't left changed.
- `for (const auto& entry : table)` is the range-based loop over a map. Each `entry` is a key-value pair: `entry.first` is the state and `entry.second` is its row.
- Numbers like `2` and `1.5` print without extra zeros, which is why the saved text is tidy.
- `load` first checks the header. The word must be `actions`, and the number must match this table's number of actions. A table for 5 actions can't read a file for 4.
- `while (in >> key)` reads one state's key. The loop stops at the end of the file. For each key, exactly `actions` numbers must follow, otherwise the file is damaged and it returns `false`.
- The rows go into a **separate** map, `loaded`. Only at the end is `table = loaded;` done. That is why a failed load leaves the old table alone.

```predict
question: A saved file starts with the line "actions 5" but you load it into a QTable created with QTable(4). What does load return?
choice: false
choice: true
answer: false
explain: The header says 5 actions, but this table has 4. load compares the two numbers and returns false before it reads any rows.
```

```check
matches qtable.cpp "void\s+QTable::save\s*\(\s*std::ostream\s*&\s*\w+\s*\)\s*const" -- Define void QTable::save(std::ostream& out) const { ... } in qtable.cpp.
matches qtable.cpp "bool\s+QTable::load\s*\(\s*std::istream\s*&\s*\w+\s*\)" -- Define bool QTable::load(std::istream& in) { ... } in qtable.cpp.
contains qtable.cpp "precision(17)" -- Write numbers with out.precision(17) so they come back exactly.
contains qtable.cpp "table = loaded;" -- Only at the very end, replace the table with table = loaded;
run "g++ -std=c++17 -c qtable.cpp -o qtable.o" label="qtable.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_qio.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o test_qio" label="tests/test_qio.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qio" label="Tables save and load correctly" -- A test failed. Read which one. Is there a space between values and a newline after each row? Does a failed load leave the old table untouched?
run "g++ -std=c++17 tests/test_qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o test_qtable" label="tests/test_qtable.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qtable" label="The table still passes" -- Your changes broke an earlier test.
run "g++ -std=c++17 tests/test_qupdate.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o test_qupdate" label="tests/test_qupdate.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qupdate" label="The update rule still passes" -- Your changes broke an earlier test.
```

## Your turn: keep what it learned

Writing to a stream is done. Now connect it to a **file**, as `loadLevelFile` did in lesson 5.3. Add two functions to `qtable.h` and `qtable.cpp`:

```
bool saveQTableFile(const QTable& q, const std::string& path);
bool loadQTableFile(QTable& q, const std::string& path);
```

- `saveQTableFile` writes the table to the file. It returns `false` if the file can't be opened for writing, and `true` otherwise.
- `loadQTableFile` reads the table from the file. It returns `false` if the file can't be opened or its contents aren't a valid table. A failed load leaves the table as it was.

Then in `main.cpp`, right after the training finishes and the learning curve is printed, save the table to the file `qtable.txt` and print `Saved the table to qtable.txt`. If the save fails, print `Could not save the table.` instead.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_qfile.cpp provided
#include "minitest.h"
#include <cstdio>
#include <fstream>
#include <string>
#include "../qtable.h"

TEST(QFileTest, RoundTripThroughAFile) {
    const std::string path = "qtable_test_tmp.txt";

    QTable q(5);
    q.set("a;b", 2, 3.5);
    q.set("c", 0, -1.0);
    EXPECT_TRUE(saveQTableFile(q, path));

    QTable loaded(5);
    EXPECT_TRUE(loadQTableFile(loaded, path));
    EXPECT_DOUBLE_EQ(loaded.get("a;b", 2), 3.5);
    EXPECT_DOUBLE_EQ(loaded.get("c", 0), -1.0);
    EXPECT_EQ(loaded.stateCount(), 2);

    std::remove(path.c_str());
}

TEST(QFileTest, MissingFileFailsToLoad) {
    QTable q(5);
    q.set("keep", 1, 2.0);
    EXPECT_FALSE(loadQTableFile(q, "no/such/folder/q.txt"));
    EXPECT_DOUBLE_EQ(q.get("keep", 1), 2.0);
}

TEST(QFileTest, ImpossiblePathFailsToSave) {
    QTable q(5);
    EXPECT_FALSE(saveQTableFile(q, "no/such/folder/q.txt"));
}

TEST(QFileTest, BadFileContentsFailToLoad) {
    const std::string path = "qtable_bad_tmp.txt";
    {
        std::ofstream file(path);
        file << "this is not a table\n";
    }

    QTable q(5);
    q.set("keep", 1, 2.0);
    EXPECT_FALSE(loadQTableFile(q, path));
    EXPECT_DOUBLE_EQ(q.get("keep", 1), 2.0);

    std::remove(path.c_str());
}
```

Your changes go in `qtable.h`, `qtable.cpp` and `main.cpp`. Don't change the tests. The two functions are free functions, not members of the class. Declare them below the class in `qtable.h`, and add `#include <fstream>` to `qtable.cpp`.

```check
matches qtable.h "bool\s+saveQTableFile\s*\(\s*const\s+QTable\s*&\s*\w+\s*,\s*const\s+std::string\s*&\s*\w+\s*\)\s*;" -- Declare bool saveQTableFile(const QTable& q, const std::string& path); in qtable.h, below the class.
matches qtable.h "bool\s+loadQTableFile\s*\(\s*QTable\s*&\s*\w+\s*,\s*const\s+std::string\s*&\s*\w+\s*\)\s*;" -- Declare bool loadQTableFile(QTable& q, const std::string& path); in qtable.h, below the class.
contains qtable.cpp "#include <fstream>" -- Add #include <fstream> to qtable.cpp.
run "g++ -std=c++17 -c qtable.cpp -o qtable.o" label="qtable.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_qfile.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o test_qfile" label="tests/test_qfile.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qfile" label="Tables can be kept in files" -- A test failed. Read which one. Do you return false when the file doesn't open? Does loadQTableFile use q.load, so a bad file keeps the old table?
run "g++ -std=c++17 tests/test_qio.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o test_qio" label="tests/test_qio.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qio" label="Saving to streams still passes" -- Your changes broke an earlier test.
contains main.cpp "saveQTableFile(q, \"qtable.txt\")" -- In trainMode, save with saveQTableFile(q, "qtable.txt")
contains main.cpp "Saved the table to qtable.txt" -- Print Saved the table to qtable.txt when the save works.
contains main.cpp "Could not save the table." -- Print Could not save the table. when it fails.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp -o game" label="the whole project builds" -- Build all fifteen .cpp files together and fix the errors shown.
run "./game --train" stdout="Saved the table to qtable.txt" label="training saves the table" -- After the learning curve, call saveQTableFile(q, "qtable.txt") and print the message.
file qtable.txt -- Run ./game --train once so it writes qtable.txt.
matches qtable.txt "^actions 5$" label="qtable.txt starts with its header" -- save must write actions and the number of actions on the first line.
```

```hints
nudge: Look at loadLevelFile in lesson 5.3. It opens a file, tests the stream, and hands the stream to a function that already reads from any stream.
concept: std::ofstream is an output stream for files, the mirror of std::ifstream. A stream used as a condition is false when it failed to open. save and load already work on any stream, so the file functions only open the file and pass it on.
shape: Each function is four lines: open the file, if (!file) return false, call q.save(file) or return q.load(file).
answer: In qtable.h, below the class, add:
~~~cpp
bool saveQTableFile(const QTable& q, const std::string& path);
bool loadQTableFile(QTable& q, const std::string& path);
~~~
In qtable.cpp, add #include <fstream> at the top and these two functions at the end:
~~~cpp
bool saveQTableFile(const QTable& q, const std::string& path) {
    std::ofstream file(path);
    if (!file) {
        return false;
    }
    q.save(file);
    return !file.fail();
}

bool loadQTableFile(QTable& q, const std::string& path) {
    std::ifstream file(path);
    if (!file) {
        return false;
    }
    return q.load(file);
}
~~~
In main.cpp, in trainMode, add this right after the loop that prints the learning curve:
~~~cpp
    if (saveQTableFile(q, "qtable.txt")) {
        std::cout << "Saved the table to qtable.txt" << std::endl;
    } else {
        std::cout << "Could not save the table." << std::endl;
    }
~~~
```

## Where to go from here

You now have working Q-learning, built from nothing but the pieces you wrote in this project. Here are ideas for growing it. Each one uses only what you know:

- **A `--watch` mode.** Load `qtable.txt` with `loadQTableFile`, skip the training and just watch the saved agent play.
- **Tune the numbers.** Change `alpha`, `gamma`, the epsilon range and the number of episodes. Look at how the learning curve changes. Which setting matters most?
- **Change the rewards.** Make coins worth more, or damage hurt less. The agent will change its behaviour to match. Rewards are how you tell it what you want.
- **A bigger or harder level.** The table grows with every new combination of hero, enemy and coins. Watch `stateCount()`. A level that is twice as big needs far more than twice the episodes.
- **Give the agent more to see.** The key leaves out health. Add it, and see whether the agent learns to be more careful, and what it costs in table size.
- **A smarter enemy.** The enemy's chase rule is simple. Make the enemy cleverer and see whether the agent can still win.
- **Beyond tables.** A table can't handle huge numbers of states. Deep Q-learning replaces the table with a neural network that guesses the numbers. Everything else you wrote here, the environment, the reward, the update rule and exploring, stays the same.

That finishes the course. You built a game in C++ and then taught a program to play it.
