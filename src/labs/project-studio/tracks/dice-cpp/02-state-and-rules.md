---
title: 2 — Make the rules deterministic
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

With score 4 and pot 6, rolling 2 wins immediately. Rolling 1 instead loses only the pot: the banked 4 survives. We need those transitions to be testable without hoping for a lucky die. **Outcome:** represent a game and implement a deterministic transition function.

`score + pot → roll / bank → new score, pot, turn, winner`

## See a copy and a reference behave differently

When a function changes a C++ value, does the caller see it? Before designing Game, isolate the difference between a copy and a reference using two integers.

```predict
question: Will adding 3 through alias also change pot?
choice: Yes
choice: No
answer: Yes
explain: alias names pot itself. Only copy has independent storage.
```

```cpp file=explore_reference.cpp
#include <iostream>
int main() {
    int pot = 4;
    int copy = pot;
    int& alias = pot;
    copy += 2;
    alias += 3;
    std::cout << pot << " " << copy << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_reference.cpp -o explore
./explore
```

Expected output:

```text
7 6
```

### How it works

Assignment to a new ordinary int copies a value. Declaring `int& alias = pot` instead creates another name for the same storage; it does not create another independent integer.

| line | pot | copy | what alias refers to |
|---|---|---|---|
| initialize | 4 | 4 | pot |
| copy += 2 | 4 | 6 | pot |
| alias += 3 | 7 | 6 | pot |

This is the reason apply will accept Game& while queries can use const Game&. A Python assignment normally attaches a name to an object; C++ variable declarations choose value or reference semantics explicitly.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_reference.cpp -o explore"
run "./explore" stdout="7 6"
```

## Test a roll without banking

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The examples cover roll, bank, bust, exact victory, overshoot, both seats, and rejected input. `&&` means both conditions must hold. `try` runs code that may throw; `catch` handles the named error type.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

A new game has score 0 and pot 0. Rolling 4 must change only the pot. The first assertion separately rules out banking an empty pot.

**Edit `test_rules.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_rules.cpp
#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
}
```

The three comparisons after the roll protect three different fields: pot becomes 4, score stays 0, and turn stays 0. If you asserted only the pot, accidentally banking the points could go unnoticed.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_rules.cpp "assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);"
```

## Test banking as a separate transition

Now add a bank action to the same trace. There is already 4 in the pot from the previous step; do not reset the game.

**Edit `test_rules.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_rules.cpp
#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
    apply(g, Action::Bank);
    assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);
}
```

After banking, score[0] is 4, pot is 0, and turn is 1. This assertion checks that saving points and passing the turn happen together.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_rules.cpp "assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);"
```

## Test a bust and a later win

Player 1 rolls 5, then 1. The first roll creates a pot; the second destroys it. Player 0 then rolls 6 and 2 on top of the banked 4.

**Edit `test_rules.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_rules.cpp
#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
    apply(g, Action::Bank);
    assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);
    apply(g, Action::Roll, 5);
    apply(g, Action::Roll, 1);
    assert(g.score[1] == 0 && g.pot == 0 && g.turn == 0);
    apply(g, Action::Roll, 6);
    apply(g, Action::Roll, 2);
    assert(g.winner == 0 && !legal(g, Action::Roll));
}
```

Trace the total: 4 + 6 is 10, so play continues; 4 + 8 is 12, so player 0 wins. A finished game must reject even a roll. The test protects permanent score from the bust.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_rules.cpp "assert(g.winner == 0 && !legal(g, Action::Roll));"
```

## Test the boundary from both seats

Create two independent games. One reaches exactly 12; the other passes 12 from player 1. Independent variables prevent the previous finished game from affecting these cases.

**Edit `test_rules.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_rules.cpp
#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
    apply(g, Action::Bank);
    assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);
    apply(g, Action::Roll, 5);
    apply(g, Action::Roll, 1);
    assert(g.score[1] == 0 && g.pot == 0 && g.turn == 0);
    apply(g, Action::Roll, 6);
    apply(g, Action::Roll, 2);
    assert(g.winner == 0 && !legal(g, Action::Roll));
    Game exact; exact.score[0] = 6;
    apply(exact, Action::Roll, 6);
    assert(exact.winner == 0);
    Game over; over.score[1] = 9; over.turn = 1;
    apply(over, Action::Roll, 6);
    assert(over.winner == 1);
}
```

`exact.score[0] = 6` sets up the boundary directly. `over.turn = 1` asks the rule to use the other score slot. These catch `>` in place of `>=` and a hard-coded player-0 winner.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_rules.cpp "assert(over.winner == 1);"
```

## Test an illegal bank

A rejected action must throw an error and leave the game unchanged. Start a boolean flag at false, call the bad action inside `try`, and set the flag only in the matching `catch`.

**Edit `test_rules.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_rules.cpp
#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
    apply(g, Action::Bank);
    assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);
    apply(g, Action::Roll, 5);
    apply(g, Action::Roll, 1);
    assert(g.score[1] == 0 && g.pot == 0 && g.turn == 0);
    apply(g, Action::Roll, 6);
    apply(g, Action::Roll, 2);
    assert(g.winner == 0 && !legal(g, Action::Roll));
    Game exact; exact.score[0] = 6;
    apply(exact, Action::Roll, 6);
    assert(exact.winner == 0);
    Game over; over.score[1] = 9; over.turn = 1;
    apply(over, Action::Roll, 6);
    assert(over.winner == 1);
    Game bad;
    bool rejected = false;
    try { apply(bad, Action::Bank); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected && bad.turn == 0);
}
```

If no exception is thrown, the flag stays false. If the wrong kind is thrown, it escapes this catch. `assert(rejected && bad.turn == 0)` requires both the right failure and no turn change.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_rules.cpp "assert(rejected && bad.turn == 0);"
```

## Test an impossible die face

Reset the flag before trying face 7. Reusing the true flag from the bank test would let a missing exception pass unnoticed.

**Edit `test_rules.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_rules.cpp
#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
    apply(g, Action::Bank);
    assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);
    apply(g, Action::Roll, 5);
    apply(g, Action::Roll, 1);
    assert(g.score[1] == 0 && g.pot == 0 && g.turn == 0);
    apply(g, Action::Roll, 6);
    apply(g, Action::Roll, 2);
    assert(g.winner == 0 && !legal(g, Action::Roll));
    Game exact; exact.score[0] = 6;
    apply(exact, Action::Roll, 6);
    assert(exact.winner == 0);
    Game over; over.score[1] = 9; over.turn = 1;
    apply(over, Action::Roll, 6);
    assert(over.winner == 1);
    Game bad;
    bool rejected = false;
    try { apply(bad, Action::Bank); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected && bad.turn == 0);
    rejected = false;
    try { apply(bad, Action::Roll, 7); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected && bad.pot == 0);
    std::cout << "rules ok\n";
}
```

The final output is printed only after every assertion survives. The implementation steps that follow will compile and execute this complete contract.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_rules.cpp "std::cout << \"rules ok\\n\";"
```

## Give a game its own data

Two separate Python lists could represent the scores, but the turn and pot belong with them. Create `game.hpp` with a `Game` struct so a complete position can be passed as one value. Type only the fields and action names in this step.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
#endif
```

`std::array<int, 2>` owns two adjacent integers. Braces initialize both to zero. `turn = 0` selects the first slot; `winner = -1` reserves a value that is neither player. `constexpr` makes TARGET a compile-time constant. `enum class` creates a separate action type, so a die face is not accidentally passed as a move. The header guard keeps a second include from defining Game twice.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ game.hpp"
```

## Ask whether play has finished

Add `finished` after the struct, before `#endif`. It answers a question without changing the game. In Python you might read `game.winner != -1`; here the function promises a `bool`, either true or false.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
#endif
```

`const Game& g` borrows the caller's game. The `&` avoids copying its fields; `const` prevents this function from changing them. `return` hands back the comparison. With winner -1 it returns false; with winner 0 it returns true. `inline` permits this header definition in multiple compiled source files.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ game.hpp"
```

## Decide whether an action is allowed

Add `legal` below `finished`. Read its expression in two pieces: the game is not finished, and the proposed action is allowed. A roll is allowed on any live turn; a bank also needs a positive pot.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
inline bool legal(const Game& g, Action action) {
    return !finished(g) && (action == Action::Roll ||
           (action == Action::Bank && g.pot > 0));
}
#endif
```

`&&` requires both sides; `||` accepts either branch. Parentheses group the two action cases under the unfinished-game condition. Trace pot 0 with Bank: the roll branch is false and `g.pot > 0` is false, so legal returns false. A positive pot must still not permit actions after victory.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ game.hpp"
```

## Pass the turn without erasing saved points

Add `pass_turn` below `legal`. Unlike the query functions, it must modify the caller. Its parameter is `Game&`, without const, and its return type is `void` because it reports no value.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
inline bool legal(const Game& g, Action action) {
    return !finished(g) && (action == Action::Roll ||
           (action == Action::Bank && g.pot > 0));
}
inline void pass_turn(Game& g) {
    g.pot = 0;
    g.turn = 1 - g.turn;
}
#endif
```

The pot is temporary; banked scores survive turn changes. Set pot to zero and compute `1 - g.turn`: 1 - 0 gives 1, while 1 - 1 gives 0. Do not reset the score array. This same operation will be used after both a bank and a bust. The rule tests will execute after apply is added.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
contains game.hpp "struct Game"
```

## Reject an illegal move, then bank

Start `apply` before the closing header guard. For now implement banking only; rolling is completed in the next steps. First reject illegal actions so a bad bank cannot alter any fields.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
inline bool legal(const Game& g, Action action) {
    return !finished(g) && (action == Action::Roll ||
           (action == Action::Bank && g.pot > 0));
}
inline void pass_turn(Game& g) {
    g.pot = 0;
    g.turn = 1 - g.turn;
}
inline void apply(Game& g, Action action, int face = 1) {
    if (!legal(g, action)) throw std::invalid_argument("illegal action");
    if (action == Action::Bank) {
        g.score[g.turn] += g.pot;
        pass_turn(g);
        return;
    }
}
#endif
```

`throw std::invalid_argument` exits with a named error. In the bank branch, `g.score[g.turn] += g.pot` adds to the active player's permanent score. Call pass_turn only after reading the pot: it clears that value. `return;` prevents a bank from falling through into the roll logic. The unused-face warning at this intermediate stage disappears when we implement rolling.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ game.hpp"
```

## Make a one mean bust

Continue below the bank branch. Reject die faces outside 1–6 before changing state. Then handle face 1 as a separate early exit.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
inline bool legal(const Game& g, Action action) {
    return !finished(g) && (action == Action::Roll ||
           (action == Action::Bank && g.pot > 0));
}
inline void pass_turn(Game& g) {
    g.pot = 0;
    g.turn = 1 - g.turn;
}
inline void apply(Game& g, Action action, int face = 1) {
    if (!legal(g, action)) throw std::invalid_argument("illegal action");
    if (action == Action::Bank) {
        g.score[g.turn] += g.pot;
        pass_turn(g);
        return;
    }
    if (face < 1 || face > 6) throw std::invalid_argument("bad die");
    if (face == 1) { pass_turn(g); return; }
}
#endif
```

Trace score 4, pot 6, face 1. pass_turn clears the 6 and switches player; the banked 4 is untouched. Returning here is essential: otherwise the later addition would put the busting 1 into the next player's pot. Ordinary rolls still do nothing until the next edit.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ game.hpp"
```

## Add a safe roll and detect victory

Add `apply` before the final `#endif`. Its default `face = 1` lets a bank call omit the unused die. `throw` stops this call with an error rather than silently accepting an impossible move. `return;` ends a void function immediately. `+=` adds to a field.

```predict
question: Score 4, pot 6, then roll 1. What is the banked score?
choice: 4
choice: 0
answer: 4
explain: Bust clears the pot, not previously banked points.
```

Type the highlighted changes yourself in the named file. The comparison below updates against your saved work; green lines are additions and red lines are deletions.

**Edit `game.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
inline bool legal(const Game& g, Action action) {
    return !finished(g) && (action == Action::Roll ||
           (action == Action::Bank && g.pot > 0));
}
inline void pass_turn(Game& g) {
    g.pot = 0;
    g.turn = 1 - g.turn;
}
inline void apply(Game& g, Action action, int face = 1) {
    if (!legal(g, action)) throw std::invalid_argument("illegal action");
    if (action == Action::Bank) {
        g.score[g.turn] += g.pot;
        pass_turn(g);
        return;
    }
    if (face < 1 || face > 6) throw std::invalid_argument("bad die");
    if (face == 1) { pass_turn(g); return; }
    g.pot += face;
    if (g.score[g.turn] + g.pot >= TARGET) g.winner = g.turn;
}
#endif
```

Now add the face to the pot, then test score plus pot against TARGET. `>=` handles both exact arrival and overshoot. Set winner to the active player, not a hard-coded zero. A roll can win immediately without a later bank.

Build and run `test_rules.cpp` using the check commands. The test injects faces directly; real randomness comes next. Our invariant: before victory, scores and score-plus-pot are below 12. Only a roll can cross the target because a previous roll would already have ended the game.

**Debugging task:** remove `&` from `apply(Game& g, ...)`. The code compiles but the first pot assertion fails because the function modified a copy. Restore it. **Transfer:** a card game can also take an explicit drawn card as input; shuffling belongs outside its rule function.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_rules.cpp -o test_rules"
run "./test_rules" stdout="rules ok"
```

## Try it

In explore_reference.cpp remove & from alias. Predict the new pot, then run: it stays 4 while copy is 6. Restore &, trace again, and identify which assignment changes the original storage.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Bank without losing the old score

**No solution is shown.** Create `practice_02.cpp` yourself. Read a banked score and a positive pot. Print their sum as the new banked score. Use numeric input; do not call apply for this exercise. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_02.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 4 3 | result=7 |
| 2 6 | result=8 |

```hints
nudge: The new score includes the old points.
concept: Assignment and addition-assignment do different things.
shape: Read two integers, add pot to score, print score.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_02.cpp -o practice"
run "./practice" stdin="4 3\n" stdout="result=7\n" without="result=8\n"
run "./practice" stdin="2 6\n" stdout="result=8\n" without="result=7\n"
```

