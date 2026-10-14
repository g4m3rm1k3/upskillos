---
title: 7.5 — Ship behavior you can explain
runtime: none
teaches: acceptance testing, strict parsing, ownership, release evidence
experiments: Predict, trace, change, check
support: tests/test_complete_game.cpp, tests/minitest.h
---

### The story so far

The completed model, menu and random sampling now work together. The release step is about observing and explaining their boundaries, not copying another implementation.

### What this lesson builds

Run the acceptance suite, handle invalid keep lists atomically, and demonstrate an independent C++ design change.

## Check the build boundary {#step-1}

**Build:** one explicit source list for the final executable.


Your project should have one entry point in this build. Do not include single_file.cpp or scratch experiments. Create the response file below if yours is missing a source; keep additional sources only if your own extensions need them.

```text file=sources.txt
main.cpp
Game.cpp
Turn.cpp
Input.cpp
Scorecard.cpp
Scoring.cpp
Dice.cpp
Die.cpp
Terminal.cpp
Player.cpp
Ranking.cpp
```

A `.h` file supplies declarations to compilation. A `.cpp` supplies definitions to an object file. Linking connects references to definitions. A class supplies encapsulation regardless of which files hold it. Explain those three different jobs without saying that headers run first.

## Run the acceptance tests {#step-2}

Use the support button for the acceptance test and the tiny test harness. The test calls real game functions with scripted input and verifies completion and failure paths. It does not simulate terminal drawing or prove that the lessons were understood.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build the final game"
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/test_complete_game.cpp Game.cpp Turn.cpp Input.cpp Player.cpp Ranking.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_complete_game" label="Build acceptance tests"
run "./test_complete_game" stdout="PASS" label="Game acceptance passes"
```

Also rerun test_complete_rules from the rule lesson. Build your earlier independent tests against the final source to find assumptions that changed. For example, a Joker-aware menu must no longer promise every untaken category is legal.

```predict
question: Rule tests pass but the game menu offers a forbidden Joker category. Is the game finished?
choice: No — the integration still misleads the player
choice: Yes — only the model matters
answer: No — the integration still misleads the player
explain: A correct domain model prevents an illegal record, but users still need an accurate menu and a useful rejection message.
```

## Play a release checklist {#step-3}

Run `./game --fast` and then `./game` for animated play. On Windows use the executable name your compiler produced. Keep evidence in a short learning log:

- Play with one player and then two. Verify each player gets their own scorecard and everyone finishes before results appear.
- Reroll twice and confirm no fourth roll is offered. Hold positions 1 and 5 and confirm they remain unchanged.
- Enter a word, a blank category and an out-of-range category. Confirm reprompting. Send EOF during a turn and confirm a clean exit.
- Try a used category. Confirm rejection without consuming the turn or awarding a bonus.
- Confirm a tie lists every winner. Replay and confirm names survive while all score and bonus state resets.
- Compare an animated roll's final display to its menu. It must be the same hand that is scored.

The old keep-list parser is permissive: invalid tokens stop parsing and out-of-range positions are ignored. Treat that as a documented UI limitation until you complete the independent improvement below. It does not bypass scoring rules. The optional --rolls switch is a practice mode; the default is three rolls.

## Try it — Diagnose a lifetime defect without running it {#step-4}

The ranking result borrows pointers into the players vector. Inserting enough new players may reallocate that vector; destroying it always ends those players' lifetimes. Either can leave pointers unusable. Sorting the pointer list is safe while the original players stay put. Resizing is not the only possible problem: erasing, replacing or moving elements can change what a pointer designates.

On paper, return a pointer to a local Player from a function. Mark the exact closing brace where the Player is destroyed. Repair the design by returning an owned value, or by returning a pointer to a caller-owned player with a clearly limited borrowing lifetime. Never test undefined behavior by assuming a lucky output proves safety.

## Parse an entire keep list before changing state {#strict-parser}

**Understand:** the inherited parseKeepers stops at a token it cannot read. With `1 x 5`, that can silently keep only die 1. Your new parser will reject the entire line instead, and leave the caller's previous hold set untouched.

Use a temporary vector<bool>(count, false) for candidate state. Read one string token at a time, parse each token as exactly one integer (the same trailing-character rule from readChoice), validate its one-based position, then set candidate[position - 1]. Only assign the output vector after every token is valid. Duplicate positions are harmless: setting the same bool twice still keeps one die.

| Text | Required result |
|---|---|
| blank | success: keep none |
| a or A, with outer whitespace | success: keep all |
| 1 5 | success: first and fifth |
| 1 1 | success: first only |
| 1 x 5, 0, 6 for five dice | failure: original output unchanged |

`while (stream >> token)` ends at exhausted text; parsing each token through a second stream distinguishes an invalid token from the ordinary end of the outer stream. The caller still owns getline and EOF handling. A parser should not retry or read the terminal by itself.

## Read the independent acceptance cases {#acceptance-cases}

**Build:** install this test, then read each input and expected outcome before implementing the function. The test has main; your practice file supplies the requested function. Add an example of your own after these cases pass.

```cpp file=tests/finish_task_05.cpp provided
#include <iostream>
#include <string>
#include <vector>
#include <cstddef>
bool strictKeepers(const std::string& line, std::size_t count, std::vector<bool>& output);
int main() {
    std::vector<bool> held(5, true);
    if (strictKeepers("1 x 5", 5, held) || held != std::vector<bool>(5, true)) return 1;
    if (strictKeepers("0", 5, held) || strictKeepers("6", 5, held)) return 1;
    if (strictKeepers("1abc", 5, held) || strictKeepers("a 1", 5, held)) return 1;
    if (!strictKeepers("1 5", 5, held) || held != std::vector<bool>({true,false,false,false,true})) return 1;
    if (!strictKeepers("1 1", 5, held) || held != std::vector<bool>({true,false,false,false,false})) return 1;
    if (!strictKeepers("", 5, held) || held != std::vector<bool>(5, false)) return 1;
    if (!strictKeepers(" A ", 5, held) || held != std::vector<bool>(5, true)) return 1;
    std::cout << "PASS: independent\n";
    return 0;
}
```

## Your turn — Reject partial keep lists {#step-5}

**Build, on your own:** Define bool strictKeepers(const std::string& line, std::size_t count, std::vector<bool>& output) using the table above. It must validate atomically and accept duplicate positions harmlessly. Keep the function separate in practice/strict_keepers.cpp while developing it.

Write practice/strict_keepers.cpp. Keep the test unchanged. If it fails, identify the first unsatisfied case and trace it by hand before editing.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_task_05.cpp practice/strict_keepers.cpp  -o exercise_result" label="Build exercise_result" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: independent" label="Observe the result"
```

```hints
nudge: A valid prefix is not a valid whole request.
concept: Candidate state separates parsing from mutation. Failure must preserve the previously held set.
shape: Use a local vector, validate each token and bounds, then assign output once after the loop. Treat a/A as an entire request, not one position.
```

## Demonstrate understanding without a reference {#step-6}

Return to a blank scratch file and implement a small score tracker with a const query, a validated mutating method and value-owned storage. Test copies are independent. Split its public declaration and definitions after it works. Then explain these statements with one example each:

| Question | Evidence of understanding |
|---|---|
| What does const protect? | Distinguish const value, const reference, pointer-to-const and const member function |
| Copy, reference or pointer? | Justify a returned score by value, mutation by reference and an optional non-owning selection by pointer |
| What does a pointer own? | Explain that a raw pointer alone establishes no ownership and identify its target's lifetime |
| Why have a header? | Reproduce an undeclared-name compile failure and a missing-definition link failure, then fix each |
| Why have a class? | State its invariant and show an invalid transition is rejected without changing state |
| Why split modules? | Identify the single authority for game rules and avoid calculating bonuses in the UI |
| What is still to learn? | Templates, iterators/algorithms, exception guarantees, smart-pointer ownership, C++20 modules and concurrency deserve further practice |

You have completed this game's core curriculum when you can build and play it, pass its rule and interaction tests, implement your independent change and explain the table above. This is a substantial C++ foundation; mastering the whole language requires further projects. Keep your original single-file game and compare the designs: each new abstraction should solve a problem you can now name.

## Optional extension — Wire your strict parser into the game {#strict-integration}

Your tested parser is an independent deliverable. To integrate it, declare it in Input.h, move the body to Input.cpp and change Turn's keeper prompt to retry when it returns false. Keep readLine's false return as the EOF exit; do not retry EOF. Leave parseKeepers available for earlier tests until you intentionally migrate their contract.

Add an interaction test: 1 x 5 must print an error and ask again; 1 5 must proceed; EOF during that retry must return false from playTurn. Do this on a copy until those interaction checks pass. The core game remains playable if you defer this extension.
