# Terminal Tetris in C++ — Learn-by-Building Series

A playable terminal Tetris, built incrementally across a tutorial series that teaches intermediate C++ (pointers, RAII, move semantics, templates) and core data structures/OOP (inheritance, polymorphism, queues, generics) by applying them to one real, growing codebase instead of isolated toy examples.

This repo pairs with a companion series (not included here) that teaches C++ fundamentals — pointers, memory, bitwise operations, OOP, and DSA (linked lists, trees, hash maps, graphs, sorting) — from the ground up. This Tetris series assumes that foundation and reuses several of its structures directly (`Queue<T>`, `unique_ptr` ownership patterns, RAII).

## Who this is for

Intermediate C++ learners who know basic syntax/classes and want to see *why* the language's more advanced features (smart pointers, virtual functions, templates, the `.h`/`.cpp` split) exist, by watching a real program need them — not just reading isolated syntax examples.

## Platform

Linux/macOS. Raw terminal I/O is implemented directly via POSIX `termios` (see Module 1) rather than a portability library like `ncurses`, specifically so the series can teach what's happening at the terminal level. Windows support would need `conio.h`/Windows Console API equivalents in place of `TerminalIO.cpp` — contributions welcome if you build that out.

## Prerequisites

- `g++` or `clang++` supporting `-std=c++17` or later
- Recommended while developing: compile with `-fsanitize=address,undefined -g` to catch memory bugs immediately, with readable errors

## How to use this series

Each module is a standalone Markdown lesson (concept explanation, diagrams, code, trade-off discussions, and practice problems). Work through them in order — later modules assume the code and concepts from earlier ones already exist and compile. Type the code out yourself rather than copy-pasting; the practice problems at the end of each module are where the concepts actually land.

At the end of each module (from Module 5 onward) you'll find a **"Files for this module"** section listing exactly what to create/edit and the updated compile command, so your project directory and the lessons stay in sync.

## Project structure

```
tetris/
├── main.cpp                        — game loop entry point, wires every module together
├── TerminalIO.h / TerminalIO.cpp   — raw terminal mode, non-blocking input, ANSI rendering (Module 1)
├── Board.h                         — the playing field grid (Module 2; header-only, small enough to
│                                      not need a .cpp — see Module 4.5 for when splitting is worth it)
├── Tetromino.h / Tetromino.cpp     — abstract base class for all piece types (Module 2)
├── TPiece.h / TPiece.cpp           — concrete T-piece (Module 2)
├── IPiece.h / IPiece.cpp           — concrete I-piece (Module 2, practice problem 1)
├── OPiece.h / OPiece.cpp           — concrete O-piece (Module 2, practice problem 1)
├── SPiece.h / SPiece.cpp           — concrete S-piece (Module 2, practice problem 1)
├── ZPiece.h / ZPiece.cpp           — concrete Z-piece (Module 2, practice problem 1)
├── JPiece.h / JPiece.cpp           — concrete J-piece (Module 2, practice problem 1)
├── LPiece.h / LPiece.cpp           — concrete L-piece (Module 2, practice problem 1)
├── PieceFactory.h / PieceFactory.cpp — createPiece(typeIndex, x, y) returning unique_ptr<Tetromino>
│                                      (Module 2, practice problem 4)
├── Collision.h / Collision.cpp     — isValidPosition, tryMove, tryRotateClockwise/CCW,
│                                      tryRotateWithKicks, lockPiece, gravityTick (Module 3)
├── Queue.h                         — generic Queue<T> from the companion DSA series
│                                      (template class ⇒ header-only, per the One Definition Rule)
├── SevenBagRandomizer.h / .cpp     — fair piece randomization (Module 4)
└── PieceQueue.h / PieceQueue.cpp   — next-piece preview, wraps Queue<T> + SevenBagRandomizer (Module 4)
```

*(This list will grow as later modules — line clearing, scoring, game state, hold/ghost pieces, high scores — are added. Check back or watch this repo for updates.)*

## Building

As files accumulate, compile them all together, e.g.:

```bash
g++ -std=c++17 -fsanitize=address,undefined -g \
    main.cpp TerminalIO.cpp Tetromino.cpp TPiece.cpp IPiece.cpp OPiece.cpp \
    SPiece.cpp ZPiece.cpp JPiece.cpp LPiece.cpp PieceFactory.cpp \
    Collision.cpp SevenBagRandomizer.cpp PieceQueue.cpp \
    -o tetris
```

Run with:
```bash
./tetris
```

Press `q` to quit at any point (raw terminal mode is restored automatically on exit — see Module 1's `RawModeGuard`).

## What's runnable at each checkpoint

Because the game is built incrementally, here's what you should actually be able to compile and run after each module — useful as a sanity check before moving to the next lesson:

| After Module | What runs |
|---|---|
| 1 | A blank screen reading keypresses instantly, quitting cleanly on `q`. No game content yet. |
| 2 | A static render of the board plus one hardcoded piece sitting in place — confirms shapes and rendering line up, no movement yet. |
| 3 | A single piece actually falls under gravity and locks at the bottom — first point it feels like a real game. |
| 4 | Pieces now spawn via the 7-bag randomizer instead of always the same type — visible variety in what spawns. |

## Lessons

| # | Module | Status |
|---|---|---|
| 0 | Roadmap | ✅ |
| 1 | Terminal I/O & the Game Loop | ✅ |
| 2 | The Board & Piece Hierarchy | ✅ |
| 3 | Movement & Collision Detection | ✅ |
| 4 | The Piece Queue & 7-Bag Randomizer | ✅ |
| 5 | Line Clearing & Scoring | 🔜 |
| 6 | Game State & Level Progression | 🔜 |
| 7 | Hold Piece, Ghost Piece & Extras | 🔜 |
| 8 | Saving High Scores (File I/O) | 🔜 |
| 9 | Capstone: Polish & Full Integration | 🔜 |

## License

*(Add your preferred open-source license here — MIT is a common default for teaching material like this.)*

## Contributing

This started as a personal learning project. If you build along with it and spot an error, a clearer explanation, or want to contribute the Windows terminal I/O variant mentioned above, issues and PRs are welcome.
