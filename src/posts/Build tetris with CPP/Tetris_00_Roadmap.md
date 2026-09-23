# Terminal Tetris in C++: A Project-Driven Intermediate Series

## How this series relates to the first one

The OOP+DSA series taught you the pieces (pointers, RAII, inheritance, templates, containers) largely in isolation, each with its own small, purpose-built structure. This series builds one continuous, real program — a playable terminal Tetris — and pulls in those same tools plus a few genuinely new ones (raw terminal I/O, real-time game loops, timing) that a static console program never needs. Expect more cross-cutting design decisions and fewer clean, contained lessons — that's intentional; it's closer to what actual project work feels like.

## Platform note

Terminal Tetris needs to read keypresses without waiting for Enter, and needs precise timing — neither is available through standard C++ I/O (`std::cin` blocks and line-buffers by default). This series targets **Linux/macOS**, using POSIX `termios` and ANSI escape codes directly, which is what your container environment supports and teaches you exactly what's happening at the terminal level (no hidden library magic). If you're on Windows, the concepts transfer, but the raw I/O code in Module 1 will need `conio.h`/Windows Console API equivalents — I'll flag this at the point where it matters, and can write the Windows version separately if you need it. A cross-platform library like **ncurses** is the standard real-world choice for portability; Module 1 covers why we're doing it "by hand" instead and what ncurses buys you.

## Module Map

| # | Module | New C++ / Systems Concepts | Game Feature Built |
|---|--------|------------------------------|----------------------|
| 1 | Terminal I/O & the Game Loop | `termios` raw mode, non-blocking input, ANSI escape codes, fixed-timestep loops, `<chrono>` timing | A loop that reads keys instantly and renders at a steady rate — no game logic yet |
| 2 | The Board & Piece Hierarchy | 2D array representation, inheritance/polymorphism revisited, rotation via coordinate math | `Board` class + all 7 Tetromino shapes as a class hierarchy |
| 3 | Movement & Collision Detection | Bounds/overlap checking, `const` correctness under real use, separating logic from rendering | Pieces fall, move, and rotate without passing through walls or other pieces |
| 4 | The Piece Queue & 7-Bag Randomizer | `Queue<T>` (from Series 1) in a real role, `<random>` properly seeded | Next-piece preview, fair randomization (no absurd piece droughts) |
| 5 | Line Clearing & Scoring | Array compaction algorithms, the same "shift down" logic as Series 1's `DynamicArray` insert/remove | Full rows detected, cleared, and everything above drops correctly; scoring |
| 6 | Game State & Level Progression | A small state machine (menu/playing/paused/game-over) via enums + polymorphism or a switch-based design, comparing both | Level-based speed increase, pause, game-over handling |
| 7 | Hold Piece, Ghost Piece & Extras | Revisiting ownership (which piece object "belongs" where), ADT design for optional/extra features | Hold-piece slot, ghost-piece preview (the classic "shadow" at the bottom) |
| 8 | Saving High Scores (File I/O) | `<fstream>`, serialization basics, error handling around I/O | Persistent high-score file across runs |
| 9 | Capstone: Polish & Full Integration | Bringing every earlier piece together into one clean, playable build | The complete game |

Each module still follows the same format as Series 1: concept explanation with diagrams, compileable code, trade-off discussions, and practice problems — but because everything builds on one running program, later modules will assume the code from earlier ones exists and compiles.

## Toolchain

Same as before (`g++`/`clang++`, `-std=c++17` minimum, AddressSanitizer while developing). Module 1 will also introduce compiling with threading support (`-pthread`) if we end up needing a separate input-reading thread — I'll confirm exactly which approach we're using once we're there, since there's a real design choice between a threaded approach and a single-threaded polling approach, covered as a trade-off in Module 1 itself.

---

**Next up: Module 1 — Terminal I/O & the Game Loop.** This is pure infrastructure — no Tetris logic yet — but it's the foundation everything else runs on, so it's worth building carefully. Say "next module" (or just tell me to start) when ready.
