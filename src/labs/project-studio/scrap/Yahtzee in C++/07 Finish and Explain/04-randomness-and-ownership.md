---
title: 7.4 — Randomness you can reason about
runtime: none
teaches: random engine, distribution, static lifetime, deterministic testing
experiments: Predict, trace, change, check
---

### The story so far

Rules and state transitions are tested with controlled hands. A real player needs unpredictable faces, but the visual animation must not silently choose a different scoring distribution.

### What this lesson builds

Replace modulo mapping with a uniform distribution and distinguish generator state, distribution and borrowed dependencies.

## Separate a fair result from an animation {#step-1}

**Understand:** imagine a generator with only eight equally likely outputs, 0 through 7. Map them with n % 6 + 1:

| Generator output | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Face | 1 | 2 | 3 | 4 | 5 | 6 | 1 | 2 |

Faces 1 and 2 have twice as many source outcomes. The real rand range is larger, so the bias is smaller, but the mechanism is the same. Use a standard uniform distribution to map engine output appropriately.

An **engine** holds state and produces successive pseudo-random values. A **distribution** maps those values to the outcomes we want. They are different objects with different responsibilities. This is suitable for local gameplay, not security-sensitive randomness.

```predict
question: Reseed the engine with the same seed before every roll. What happens?
choice: Each call restarts the sequence
choice: It becomes more random
answer: Each call restarts the sequence
explain: A seed initializes engine state. Reinitializing it discards the progress made by earlier calls.
```

## Advance one engine across calls {#engine-state}

**Build:** replace the rand mapping in roll and have the constructor call that same operation.

```cpp file=Die.cpp
#include <cstdlib>
#include <random>
#include <string>

#include "Die.h"

static const char* const pip[7][3] = {
    {"   ", "   ", "   "},
    {"   ", " o ", "   "},
    {"o  ", "   ", "  o"},
    {"o  ", " o ", "  o"},
    {"o o", "   ", "o o"},
    {"o o", " o ", "o o"},
    {"o o", "o o", "o o"},
};

static const int adjacent[4][4] = {
    {0, 0, 0, 0},
    {2, 3, 4, 5},
    {1, 3, 4, 6},
    {1, 2, 5, 6},
};

Die::Die() : face(1) {
    roll();
}

Die::Die(int startFace) {
    face = (startFace >= 1 && startFace <= 6) ? startFace : 1;
}

void Die::roll() {
    static std::mt19937 engine(std::random_device{}());
    std::uniform_int_distribution<int> faceValue(1, 6);
    face = faceValue(engine);
}

void Die::tumbleStep() {
    int row = (face > 3) ? 7 - face : face;
    face = adjacent[row][std::rand() % 4];
}

int Die::getFace() const {
    return face;
}

bool Die::sameFace(const Die& other) const {
    return face == other.face;
}

std::string Die::line(int r) const {
    if (r == 0 || r == 4) {
        return " --- ";
    }
    return std::string("|") + pip[face][r - 1] + "|";
}

int Die::opposite() const { return 7 - face; }
```

**Understand:** `<random>` declares the standard random machinery. mt19937 is an engine type. The local static engine is initialized on its first use and retains its state until program termination. random_device{} creates a temporary seed source; the following () calls it. The implementation may provide a deterministic source, so it is not a security guarantee.

`uniform_int_distribution<int>` is a class-template specialization producing ints. Constructing it with (1, 6) selects inclusive limits. `faceValue(engine)` calls the distribution object, advancing engine as it produces a face. Reconstructing this simple distribution per call does not reset engine.

The constructor's face(1) establishes a valid initial member, then roll samples the first face. The old srand in main now affects visual tumble randomness only. For replayable simulations a later design should accept an engine from the caller instead of hiding it in a static local.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## End animation with the actual roll {#step-2}

**Build:** finish animate with rollFree(hold), then display that final sample. The added operations are after the visual-frame loop.

```cpp file=Dice.cpp
#include <iostream>

#include "Dice.h"
#include "Terminal.h"

Dice::Dice(std::size_t count) : dice(count) {}

std::size_t Dice::size() const {
    return dice.size();
}

int Dice::face(std::size_t i) const {
    return dice[i].getFace();
}

int Dice::total() const {
    int sum = 0;
    for (const Die& d : dice) {
        sum += d.getFace();
    }
    return sum;
}

void Dice::rollAll() {
    for (auto& d : dice) {
        d.roll();
    }
}

void Dice::rollFree(const std::vector<bool>& hold) {
    for (std::size_t i = 0; i < dice.size(); i++) {
        if (!hold[i]) {
            dice[i].roll();
        }
    }
}

void Dice::draw() const {
    for (int r = 0; r < 5; r++) {
        for (const Die& d : dice) {
            std::cout << d.line(r);
        }
        std::cout << "\n";
    }
    for (std::size_t i = 0; i < dice.size(); i++) {
        std::cout << " *" << i + 1 << "* ";
    }
    std::cout << "\n";
}

bool Dice::animate(const std::vector<bool>& hold) {
    bool anyFree = false;
    for (std::size_t i = 0; i < dice.size(); i++) {
        if (!hold[i]) {
            anyFree = true;
        }
    }
    if (!anyFree) {
        return false;
    }

    for (int frame = 0; frame < 15; frame++) {
        for (std::size_t i = 0; i < dice.size(); i++) {
            if (!hold[i]) {
                dice[i].tumbleStep();
            }
        }
        clearScreen();
        draw();
        sleepMs(50 + frame * 15);
    }
    rollFree(hold);
    clearScreen();
    draw();
    return true;
}
```

**Understand:** tumbleStep chooses an adjacent face for a visual effect. That transition is not the uniform sampling contract of roll. If the last animation frame became the scored state, animation would influence the distribution. Sampling afterward gives each unheld die its actual result. Held elements never enter rollFree's assignment path.

Fast and animated modes now score the same kind of distribution, although they need not produce identical sequences. If all dice are held, animate returns before changing anything.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## Try it — Spot hidden coupling {#step-3}

On paper move rollFree before the animation loop. Every later tumbleStep can overwrite the sampled face. Point to the assignment that breaks the intended order, then keep rollFree after the loop.

Do not assert that 60 rolls contain exactly ten of each face; random variation is expected. Small-sample counts are useful diagnostics but cannot prove a distribution contract. To prove holding, use controlled replacements as in the opening lesson.

> **Engineer:** make randomness a dependency you can replace with a known sequence in a test. Test state transitions deterministically and the distribution choice separately.

## Read the independent acceptance cases {#acceptance-cases}

**Build:** install this test, then read each input and expected outcome before implementing the function. The test has main; your practice file supplies the requested function. Add an example of your own after these cases pass.

```cpp file=tests/finish_task_04.cpp provided
#include <iostream>
#include <vector>
#include <cstddef>
bool takeRoll(const std::vector<int>& sequence, std::size_t& cursor, int& face);
int main() {
    const std::vector<int> values = {2, 6}; std::size_t cursor = 0; int face = 4;
    if (!takeRoll(values, cursor, face) || face != 2 || cursor != 1) return 1;
    if (!takeRoll(values, cursor, face) || face != 6 || cursor != 2) return 1;
    if (takeRoll(values, cursor, face) || face != 6 || cursor != 2) return 1;
    cursor = 0; const std::vector<int> bad = {7};
    if (takeRoll(bad, cursor, face) || cursor != 0 || face != 6) return 1;
    std::cout << "PASS: independent\n";
    return 0;
}
```

## Your turn — Supply a predictable roll source {#step-4}

**Build, on your own:** Define bool takeRoll(const std::vector<int>& sequence, std::size_t& cursor, int& face). On a valid next face, assign face and advance cursor exactly once. On exhaustion or an invalid next face, return false and leave both outputs unchanged. This is a small deterministic dependency for a future game test.

Write practice/take_roll.cpp. Keep the test unchanged. If it fails, identify the first unsatisfied case and trace it by hand before editing.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_task_04.cpp practice/take_roll.cpp  -o exercise_result" label="Build exercise_result" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: independent" label="Observe the result"
```

```hints
nudge: Which data is read-only, and which values must the operation advance?
concept: The sequence is borrowed through const reference. Cursor and face are mutable references with an unchanged-on-failure contract.
shape: Check bounds, read a local candidate, validate 1–6, then commit face and increment cursor. Explain why cursor cannot be const.
```
