---
title: Finish — release, debug and explain your C++
runtime: none
support: tests/test_complete_game.cpp, tests/minitest.h
---

You now have a terminal game with holding, category scoring, both bonus systems, Joker placement, multiplayer results and replay. Finishing means checking the interactions and explaining the program, not just compiling its last file.

## Check the build boundary

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

## Run the acceptance tests

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

## Play a release checklist

Run `./game --fast` and then `./game` for animated play. On Windows use the executable name your compiler produced. Keep evidence in a short learning log:

- Play with one player and then two. Verify each player gets their own scorecard and everyone finishes before results appear.
- Reroll twice and confirm no fourth roll is offered. Hold positions 1 and 5 and confirm they remain unchanged.
- Enter a word, a blank category and an out-of-range category. Confirm reprompting. Send EOF during a turn and confirm a clean exit.
- Try a used category. Confirm rejection without consuming the turn or awarding a bonus.
- Confirm a tie lists every winner. Replay and confirm names survive while all score and bonus state resets.
- Compare an animated roll's final display to its menu. It must be the same hand that is scored.

The old keep-list parser is permissive: invalid tokens stop parsing and out-of-range positions are ignored. Treat that as a documented UI limitation until you complete the independent improvement below. It does not bypass scoring rules. The optional --rolls switch is a practice mode; the default is three rolls.

## Try it — Diagnose a lifetime defect without running it

The ranking result borrows pointers into the players vector. Inserting enough new players may reallocate that vector; destroying it always ends those players' lifetimes. Either can leave pointers unusable. Sorting the pointer list is safe while the original players stay put. Resizing is not the only possible problem: erasing, replacing or moving elements can change what a pointer designates.

On paper, return a pointer to a local Player from a function. Mark the exact closing brace where the Player is destroyed. Repair the design by returning an owned value, or by returning a pointer to a caller-owned player with a clearly limited borrowing lifetime. Never test undefined behavior by assuming a lucky output proves safety.

## Your turn — Ship one independent improvement

Replace the permissive keep-list parser with a strict one that rejects the entire line if any token is invalid. Preserve Enter for none and a for all. Do not change the current held set on rejection. Add tests for `1 5`, `1 x 5`, `0`, `6`, repeated positions and EOF in the caller. Then update the turn prompt and retry loop. Choose explicitly whether repeated positions are harmless or rejected, document that decision, and test it.

```hints
nudge: Who should decide that a line is invalid, and who should ask the player again?
concept: Parse into a temporary vector; return success separately from the result. The caller owns interaction and retries.
shape: A bool-returning parser can accept a const string reference plus a vector<bool>& output. Validate every token before assigning output. Keep EOF handling in readLine's caller and never spin on an exhausted stream.
```

## Demonstrate understanding without a reference

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
