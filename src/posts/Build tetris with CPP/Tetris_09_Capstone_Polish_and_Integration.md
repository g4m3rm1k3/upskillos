# Tetris Module 9: Capstone — Polish & Full Integration

## Why this module is different

Every earlier module added one feature to a growing codebase. This one adds nothing new conceptually — it's about making sure everything built across Modules 1-8 actually works together as one coherent program, finding the integration bugs that only show up when every system runs simultaneously (a piece falling *while* paused, holding *during* a line-clear animation, game-over triggering mid-rotation), and polishing the rendering into something genuinely pleasant to use.

---

## 1. `main.cpp`, fully wired

By this point, `main.cpp` should be thin — it owns the Module 1 game loop and a single `Game` object, and does little else:

```cpp
#include "TerminalIO.h"
#include "Game.h"
#include <chrono>
#include <thread>

int main() {
    RawModeGuard rawMode;   // Module 1 practice problem 6 -- RAII terminal setup/teardown
    hideCursor();

    Game game;
    game.loadHighScores();   // Module 8

    using clock = std::chrono::steady_clock;
    auto lastTick = clock::now();

    bool running = true;
    while (running) {
        auto now = clock::now();
        auto interval = game.currentTickInterval();   // Module 6 -- varies with level

        if (now - lastTick >= interval) {
            lastTick = now;

            char key = readKeyNonBlocking();
            if (key == 'q') {
                running = false;
            } else if (key != 0) {
                game.handleInput(key);
            }

            game.update();
            game.render();
        } else {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }

    showCursor();
    return 0;
}
```

If your `main.cpp` looks meaningfully different from this — especially if game logic has crept directly into `main()` rather than living inside `Game`'s methods — that's worth revisiting now. This is the payoff of Module 3 section 4's logic/rendering separation and Module 6's `Game` class encapsulation: `main.cpp` should read almost like a summary of the whole program, with all the real behavior delegated out.

---

## 2. Integration testing: the bugs that only appear once everything's connected

Individually-correct modules can still misbehave together. Specifically test these interaction points:

- **Pause during a line-clear moment**: pause the instant after a piece locks and rows are clearing. Confirm the clear still completes correctly and the game doesn't get stuck.
- **Hold immediately after unpausing**: confirm `holdUsedThisPiece`'s state survived the pause correctly (it shouldn't have been reset by pausing/unpausing, only by an actual new piece spawning).
- **Game-over during a hold swap**: if holding brings a piece out of the hold slot into an already-blocked spawn position, confirm this is correctly detected as game-over rather than leaving an invalid, overlapping piece on the board (revisit Module 4 problem 6 and Module 6 section 3's `spawnNextPiece` game-over check — make sure the piece-out-of-hold path goes through the same check, not just the piece-from-queue path).
- **Rapid input near a wall with rotation**: hold a movement key against a wall while also spamming rotate, checking for any sequence that lets a piece end up in an invalid position (a real, classic class of Tetris implementation bug).
- **High score save on an actual game-over from full gameplay** (not a synthetic test call) — play a full game to genuine game-over, confirm the save prompt/logic triggers correctly and the file updates.
- **Restart after game-over**, then play again to a second game-over, and confirm the second game's score is evaluated independently (no leftover state from the first game contaminating the second's high-score check).

This kind of testing — deliberately combining features to find the seams between them — is different from the unit-style practice problems in every earlier module, and it's a genuinely realistic taste of what integrating a multi-module system actually involves.

---

## 3. Rendering polish

A few upgrades worth making now that the game is functionally complete:

- **Box-drawing characters** instead of plain `#`/`.` for a cleaner look — Unicode characters like `█` (full block) render well in most modern terminals and look considerably better than ASCII.
- **Color**, via ANSI color escape codes (`\x1b[38;5;<n>m` for a 256-color foreground, `\x1b[0m` to reset) — give each piece type its own color, matching real Tetris conventions if you want (cyan I, yellow O, purple T, green S, red Z, blue J, orange L).
- **A visible border** around the play field, and clearly laid-out side panels for the hold slot, next-piece preview, score, level, and lines cleared.
- **A subtle "lock delay"**: real Tetris gives a brief window (a few hundred ms) after a piece would lock, during which the player can still slide it slightly before it actually locks — this is a genuine quality-of-life feature, and if you want to add it, it fits naturally into `gravityTick`'s logic from Module 3 (a small timer before committing to `lockPiece`, rather than locking the instant downward movement fails).

None of this changes the underlying architecture — it's entirely presentation-layer work, which is exactly the point of having kept rendering and logic separated since Module 3.

---

## 4. Final self-check

Before considering this project genuinely complete, verify honestly:

- [ ] No raw `new`/`delete` anywhere — `unique_ptr` and STL containers own everything (Series 1 Module 3/6, applied throughout)
- [ ] Every `Tetromino` subclass has a correct `clone()` (Module 7) and the base class has a virtual destructor (Series 1 Module 4, Module 2 of this series)
- [ ] `.h`/`.cpp` split is used consistently, with `#pragma once` (or guards) on every header (Series 1 Module 4.5)
- [ ] `isValidPosition` (Module 3) is the single, sole source of truth for collision — no duplicated ad-hoc bounds/overlap checks anywhere else in the codebase
- [ ] The game correctly handles: pause/unpause, hold (with the once-per-piece rule), ghost piece tracking, level-based speed increase, multi-row clears (including non-adjacent full rows — Module 5's flagged bug, fixed), game-over detection from both normal spawn AND hold-triggered spawn, and score persistence across separate program runs
- [ ] You compiled and ran with `-fsanitize=address,undefined` throughout development, and a final run under it shows no leaks or undefined behavior during normal play
- [ ] You can explain, for at least three separate design decisions across this series (the piece hierarchy's inheritance-vs-data-driven trade-off, the state machine's enum-vs-polymorphic trade-off, the ghost piece's recompute-vs-cache trade-off), which choice you made and why — not just that the code works, but that you understand the alternative you didn't take

---

## 5. Where to go from here

This series covered a complete, real Tetris — but there's real room to keep extending it, if you want more practice applying these same skills to new problems:

- **Full SRS wall-kick tables** (Module 3 briefly touched simplified kicks; the real specification has exact per-piece, per-rotation-transition offset tables)
- **Soft drop / hard drop** (accelerated or instant fall, common in modern Tetris — a natural extension of `gravityTick`)
- **A proper lock-delay system** (section 3), if you didn't build it already
- **Multiplayer** (two boards side by side, sending "garbage lines" to an opponent on multi-line clears — a substantial jump requiring networking, well beyond this series' scope, but a natural "what's next" if you want to keep going)
- **Porting to `ncurses`** for actual cross-platform support (Module 1 flagged this as the real-world standard choice over hand-rolled `termios`) — a good exercise in swapping out an implementation detail (Module 1's `TerminalIO`) without touching any of the logic layered on top of it, proving the separation-of-concerns work throughout this series actually paid off

## Update your README

Go back to the README from earlier and mark every module ✅ in the status table — this project (both the code and the accompanying lessons) is complete. If you'd like, I can regenerate the full README now reflecting the finished series, with the project structure updated to include every file from Modules 5-9.

---

That's the complete Terminal Tetris series — 10 files (roadmap + 9 modules) alongside the OOP+DSA series' 13. Between the two, you've now applied every major intermediate C++ concept — pointers, memory, bitwise operations, RAII, inheritance/polymorphism, templates, move semantics, smart pointers, and every core data structure — to two real, working programs, not just isolated exercises. If you want, I can build that final updated README now, or help debug/extend anything as you actually type and run the code.
