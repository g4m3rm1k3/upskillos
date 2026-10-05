---
title: 3 — Random dice, predictable tests
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

Rolling 6000 times should visit every face. It need not visit each exactly 1000 times. **Outcome:** use a seeded random engine and parse a whole input line without corrupting game state.

`seed → engine state → distribution → die face → deterministic rules`

## Advance an engine twice

Reproducible randomness sounds contradictory until you see the engine state advance. Create two engines with the same seed, then compare their first and second outputs.

```predict
question: Do the two engines produce matching second outputs too?
choice: Yes
choice: No
answer: Yes
explain: Both began in the same state and have each advanced once before the second comparison.
```

```cpp file=explore_random.cpp
#include <iostream>
#include <random>
int main() {
    std::mt19937 first(42), second(42);
    auto a = first();
    auto b = first();
    std::cout << (a == second()) << '\n';
    std::cout << (b == second()) << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_random.cpp -o explore
./explore
```

Expected output:

```text
1
1
```

### How it works

Calling first() returns a number and changes internal state. The second call therefore produces the next number. The other engine advances independently through the same sequence. `auto` infers the engine output's integer type; it does not mean the type can change later. C++ prints bool as 1 or 0 by default.

The raw numbers are not die faces. A distribution will map them into 1–6 in the real game. Reinitializing an engine with 42 before each roll would restart at its first output instead of continuing the sequence.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_random.cpp -o explore"
run "./explore" stdout="1\n1"
```

## Test a repeatable sequence

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The histogram is a coarse smoke test, not a statistical proof of fairness. Equal seeds must give equal sequences within the same toolchain. Standard-library distribution algorithms can differ across platforms.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Construct engines a and b with the same seed. For each roll from a, compare a fresh roll from b, check its bounds, and increment that face in the histogram.

**Edit `test_io.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_io.cpp
#include "io.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 a(42), b(42);
    std::array<int, 7> counts{};
    for (int i = 0; i < 6000; ++i) {
        int face = roll(a);
        assert(face >= 1 && face <= 6 && face == roll(b));
        ++counts[face];
    }
}
```

`counts` has seven slots so face 6 is a valid index; slot 0 is unused. The engine is advanced once per loop on each side. Recreating b inside the loop would compare every roll against its first roll.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_io.cpp "}"
```

## Test all faces and parse exact commands

Require every face to occur, then test the parser independently. Begin with Bank so rejecting the word roll must leave an observable old value intact.

**Edit `test_io.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_io.cpp
#include "io.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 a(42), b(42);
    std::array<int, 7> counts{};
    for (int i = 0; i < 6000; ++i) {
        int face = roll(a);
        assert(face >= 1 && face <= 6 && face == roll(b));
        ++counts[face];
    }
    for (int face = 1; face <= 6; ++face) assert(counts[face] > 500);
    Action action = Action::Bank;
    assert(!parse_action("roll", action) && action == Action::Bank);
    assert(parse_action("r", action) && action == Action::Roll);
    assert(parse_action("b", action) && action == Action::Bank);
    assert(!parse_action("", action));
}
```

The test distinguishes invalid text from an illegal game action. The text b parses successfully even when banking will later be forbidden by the rules. Parsing does not know the pot.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_io.cpp "assert(!parse_action(\"\", action));"
```

## Test the fixed policy boundary

Check pot 0, pot 3, and pot 4. These cases straddle the bank-at-4 threshold.

**Edit `test_io.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_io.cpp
#include "io.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 a(42), b(42);
    std::array<int, 7> counts{};
    for (int i = 0; i < 6000; ++i) {
        int face = roll(a);
        assert(face >= 1 && face <= 6 && face == roll(b));
        ++counts[face];
    }
    for (int face = 1; face <= 6; ++face) assert(counts[face] > 500);
    Action action = Action::Bank;
    assert(!parse_action("roll", action) && action == Action::Bank);
    assert(parse_action("r", action) && action == Action::Roll);
    assert(parse_action("b", action) && action == Action::Bank);
    assert(!parse_action("", action));
    Game g; assert(fixed_action(g) == Action::Roll);
    g.pot = 3; assert(fixed_action(g) == Action::Roll);
    g.pot = 4; assert(fixed_action(g) == Action::Bank);
    std::cout << "input and dice ok\n";
}
```

Zero and three require Roll; four requires Bank. This catches a strict-greater-than comparison, which would wait one point too long.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_io.cpp "std::cout << \"input and dice ok\\n\";"
```

## Advance one random engine

Create `io.hpp` and add only `roll` first. The game rules take a face as input; this adapter produces one. Keep the random engine outside the function so successive calls continue the same sequence.

**Edit `io.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=io.hpp
#ifndef DICE_IO_HPP
#define DICE_IO_HPP
#include "game.hpp"
#include <random>
#include <string>
inline int roll(std::mt19937& rng) {
    return std::uniform_int_distribution<int>(1, 6)(rng);
}
#endif
```

`std::mt19937& rng` borrows and advances the engine. `std::uniform_int_distribution<int>(1, 6)` constructs a mapping to the inclusive integer range. The final `(rng)` invokes that mapping using the engine. Passing rng by value would repeatedly start from a copy of its old state.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ io.hpp"
```

## Turn text into an action

Add `parse_action` after roll. It has two results: whether parsing succeeded and, on success, which action was read. Return the boolean; write the action through a mutable reference.

**Edit `io.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=io.hpp
#ifndef DICE_IO_HPP
#define DICE_IO_HPP
#include "game.hpp"
#include <random>
#include <string>
inline int roll(std::mt19937& rng) {
    return std::uniform_int_distribution<int>(1, 6)(rng);
}
inline bool parse_action(const std::string& text, Action& action) {
    if (text == "r") { action = Action::Roll; return true; }
    if (text == "b") { action = Action::Bank; return true; }
    return false;
}
#endif
```

`const std::string& text` borrows text without copying or changing it. `Action& action` is deliberately mutable. For text r, assign Roll and return true immediately. For any unrecognized text, return false without writing to action. This keeps a typo from silently becoming a valid move.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ io.hpp"
```

## Write the opponent rule in plain sight

Add the fixed policy: bank once the pot reaches the threshold, otherwise roll. The default argument makes the threshold 4 when a caller omits it.

**Edit `io.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=io.hpp
#ifndef DICE_IO_HPP
#define DICE_IO_HPP
#include "game.hpp"
#include <random>
#include <string>
inline int roll(std::mt19937& rng) {
    return std::uniform_int_distribution<int>(1, 6)(rng);
}
inline bool parse_action(const std::string& text, Action& action) {
    if (text == "r") { action = Action::Roll; return true; }
    if (text == "b") { action = Action::Bank; return true; }
    return false;
}
inline Action fixed_action(const Game& g, int threshold = 4) {
    return g.pot >= threshold ? Action::Bank : Action::Roll;
}
#endif
```

`condition ? first : second` returns first when true and second otherwise. At pot 3 this returns Roll; at 4 it returns Bank. The policy chooses an action but does not apply it, draw a die, or print anything. That separation lets tests and training reuse it.

Type the three short functions, then compile and run the tests. In the loop, `++i` increments a counter; `++counts[face]` increments a histogram bin. Empty braces initialize all counts to zero. **Repair exercise:** change the distribution upper bound to 5 and explain which assertion detects it. **Transfer:** random card draws need a shrinking deck, not independent die sampling.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_io.cpp -o test_io"
run "./test_io" stdout="input and dice ok"
```

## Try it

Seed second with 43 in explore_random.cpp. Compare the equality outputs. Restore 42, then call second() one extra time before comparing; equal seeds alone do not help if streams are advanced differently.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — A threshold with an exact boundary

**No solution is shown.** Create `practice_03.cpp` yourself. Read a nonnegative pot. Print bank at pot 5 or above, otherwise roll. This policy has threshold 5, not our training baseline of 4. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_03.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 5 | result=bank |
| 4 | result=roll |

```hints
nudge: Check the value exactly on the threshold.
concept: At least five includes five itself.
shape: Read pot and branch using an inclusive comparison.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_03.cpp -o practice"
run "./practice" stdin="5\n" stdout="result=bank\n" without="result=roll\n"
run "./practice" stdin="4\n" stdout="result=roll\n" without="result=bank\n"
```

