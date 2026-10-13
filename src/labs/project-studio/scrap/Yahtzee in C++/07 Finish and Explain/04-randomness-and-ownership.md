---
title: Fair rolls — state, lifetime and responsibility
runtime: none
---

Replace the prototype random mapping and keep animation from deciding the game result.

## Separate a fair result from an animation

The old modulo mapping is biased unless the generator's range divides evenly by six. Tumbling is another issue: choosing an adjacent face is a visual transition, not a promise of a uniform final roll. The final result should be sampled independently of that animation.

`std::mt19937` is a standard pseudo-random engine. `std::random_device{}()` supplies a seed, though an implementation may use a deterministic source. A local static engine is initialized once and retains its state between calls; reseeding each roll would be a mistake. `std::uniform_int_distribution<int>(1, 6)` maps engine output to an inclusive, uniform face range. This is suitable for a local practice game, not security-sensitive randomness.

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

The adjacent-face table still animates using rand. The srand call in main now seeds that visual sequence only; it no longer controls scored rolls. Scored rolls now use the separate engine. Exact sequences are not a portable testing contract. To test scoring, continue supplying explicit hands. To design fully replayable simulations later, inject a generator owned by the game instead of hiding it in a static local.

## End animation with the actual roll

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

The added rollFree(hold) obtains final faces after the visual frames. Held dice remain untouched. Clearing and drawing once more makes the final sample visible. Both fast mode and animated mode now score a uniform draw for each unheld die, though they need not produce the same sequence.

```predict
question: Does observing every face in 60 rolls prove a generator is fair?
choice: No — sample coverage is not a proof of its distribution
choice: Yes — all outcomes occurred
answer: No — sample coverage is not a proof of its distribution
explain: Small-sample counts can reveal some bugs but cannot certify uniformity. We use the distribution contract and deterministic rule tests for different purposes.
```

## Try it — Spot hidden coupling

On paper move the final rollFree before the animation. The subsequent tumbleStep calls overwrite the sampled faces. Restore it after the animation before running. Play one turn keeping all dice: animate must return without changing any face.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build fair final rolls"
```

The build establishes type and link correctness. Manually verify held dice in animated and fast modes. Do not assert exact random output in your test suite.

## Your turn — Transfer the idea

Design a RollSource interface on paper that lets a test return 1, 2, 3, 4, 5 without randomness. Explain who owns the generator, whether a call mutates it, and why a const reference would be inappropriate for advancing it.

```hints
nudge: Random engines have state.
concept: Dependency injection means callers supply a dependency instead of a function finding it globally.
shape: Start with a function taking a mutable engine reference; isolate display randomness from the game result. Implement it only after writing deterministic held-dice tests.
```
