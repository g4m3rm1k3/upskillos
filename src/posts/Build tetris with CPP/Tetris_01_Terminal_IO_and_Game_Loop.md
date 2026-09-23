# Tetris Module 1: Terminal I/O & the Game Loop

## Why this module comes first

Before any Tetris logic exists, you need a program that can (a) read keypresses the instant they happen, without waiting for Enter, and (b) update and redraw the screen at a steady rate regardless of when/whether a key was pressed. Neither is default C++ behavior. Get this infrastructure solid first, and every later module is just "logic that plugs into this loop."

---

## 1. Why `std::cin` doesn't work for games

```cpp
char c;
std::cin >> c;   // BLOCKS until Enter is pressed, and requires Enter at all
```

Terminals normally operate in **canonical (line-buffered) mode**: your keystrokes are held by the terminal driver until you press Enter, then handed to your program as a complete line. This is great for normal command-line tools, useless for a game — you need `w`/`a`/`s`/`d`/arrow-keys to register the instant they're pressed, and you need the program to keep running (falling pieces, timers) even when no key is being pressed at all.

---

## 2. Raw mode with `termios`

POSIX systems (Linux, macOS) expose terminal configuration through `<termios.h>`. Switching to **raw mode** disables line buffering and, critically, disables *echo* (so keypresses don't get printed) and *canonical processing* (so you get every keystroke immediately, not batched into lines).

```cpp
#include <termios.h>
#include <unistd.h>

termios originalSettings;

void enableRawMode() {
    tcgetattr(STDIN_FILENO, &originalSettings);   // save current settings so we can restore them later

    termios raw = originalSettings;
    raw.c_lflag &= ~(ECHO | ICANON);   // turn off echo and canonical (line-buffered) mode
    raw.c_cc[VMIN] = 0;                 // read() returns immediately, even with 0 bytes available
    raw.c_cc[VTIME] = 0;                // no timeout wait

    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

void disableRawMode() {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &originalSettings);   // restore the terminal to normal on exit
}
```

**Why save and restore the original settings**: raw mode is a *global* change to how your terminal session behaves. If your program crashes or exits without restoring it, the user's shell is left in raw mode — no echo, weird line behavior — until they run `reset` or close the terminal. This is exactly RAII thinking from Series 1: "acquire" raw mode, guarantee you "release" it back, no matter how the program exits. Practice problem 6 has you actually wrap this in an RAII class rather than free functions, for exactly that reason.

`ECHO` and `ICANON` are **bitflags** — this is Series 1 Module 2's bitwise operations doing real work: `&= ~(ECHO | ICANON)` clears exactly those two bits in `c_lflag` while leaving every other flag untouched, using the same "clear a bit" pattern (`value & ~mask`) you wrote by hand back then.

### Non-blocking reads

With `VMIN = 0, VTIME = 0` set above, `read()` returns immediately whether or not a key was pressed:

```cpp
#include <cstdio>

char readKeyNonBlocking() {
    char c = 0;
    read(STDIN_FILENO, &c, 1);   // returns 0 bytes read if nothing available -- c stays 0
    return c;                     // 0 means "no key was pressed this check"
}
```

This is the mechanism that lets the game loop check "was a key pressed?" without ever stalling — a completely different approach from `std::cin`'s blocking wait.

---

## 3. Rendering: ANSI escape codes

Terminals understand a set of special byte sequences (starting with the ESC character, `\x1b` or `\033`) for cursor movement, clearing, and (on most modern terminals) color:

```cpp
void clearScreen() {
    std::cout << "\x1b[2J";     // clear entire screen
    std::cout << "\x1b[H";      // move cursor to top-left (row 1, col 1)
}

void moveCursor(int row, int col) {
    std::cout << "\x1b[" << row << ";" << col << "H";
}

void hideCursor() { std::cout << "\x1b[?25l"; }
void showCursor() { std::cout << "\x1b[?25h"; }
```

For a game loop redrawing every frame, calling `clearScreen()` every frame causes visible flicker (blank-then-redraw). A better approach: move the cursor to the top-left and redraw over the existing content without clearing first, since the new frame typically overwrites the same cell positions as the old one:

```cpp
void render(const std::string& frame) {
    moveCursor(1, 1);   // reposition, don't clear
    std::cout << frame;
    std::cout.flush();   // std::cout is normally buffered -- force it out NOW, this frame
}
```

**Why `.flush()` matters here**: `std::cout` buffers output for efficiency by default, meaning what you "print" doesn't necessarily reach the terminal immediately. For a game loop rendering frame-by-frame, you need each frame to actually appear on screen before the next timing tick — an unflushed buffer could leave frames sitting unshown, or shown late and out of sync with your timing. This is a genuinely different concern from a normal console program, where letting the OS decide when to flush a buffer rarely matters.

---

## 4. The game loop: fixed timestep

A naive loop just runs as fast as possible — but that makes game speed depend on how fast the CPU happens to run it, which is wrong (Tetris pieces should fall at a fixed real-world rate, not "as fast as this particular machine can loop"). The standard fix is a **fixed timestep** loop using `<chrono>`:

```cpp
#include <chrono>
#include <thread>

int main() {
    enableRawMode();
    hideCursor();

    using clock = std::chrono::steady_clock;
    auto lastTick = clock::now();
    const auto tickInterval = std::chrono::milliseconds(16);   // ~60 updates/sec

    bool running = true;
    while (running) {
        auto now = clock::now();
        if (now - lastTick >= tickInterval) {
            lastTick = now;

            char key = readKeyNonBlocking();
            if (key == 'q') running = false;
            // ... later modules: pass `key` into game logic, update game state ...

            // ... later modules: render the current game state here ...
        } else {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));   // don't busy-spin the CPU
        }
    }

    showCursor();
    disableRawMode();
    return 0;
}
```

```
Fixed-timestep loop, conceptually:

time:  0ms   16ms   32ms   48ms   64ms
       |------|------|------|------|
       tick1  tick2  tick3  tick4

Each tick: read input, update state, render.
Between ticks: sleep briefly rather than spin, to avoid pegging a CPU core at 100%.
```

**Why not just `while(true) { ...no sleep at all... }`?** Without any pacing, the loop runs millions of times per second, checking `now - lastTick` almost constantly and burning an entire CPU core for no benefit — the useful work only actually happens once every 16ms regardless. The `sleep_for(1ms)` in the `else` branch keeps CPU usage sane while still checking often enough that the loop doesn't overshoot the tick interval by much.

### Trade-off: polling loop vs. a dedicated input thread

The loop above **polls** for input once per tick — simple, single-threaded, but a very fast key-repeat (holding a key down) could register at most once per 16ms tick, which for a 60Hz tick rate is generally fine, but worth knowing as a real limitation.

| | Single-threaded polling (what we're building) | Separate input-reading thread |
|---|---|---|
| Complexity | Low — one loop, no synchronization needed | Higher — needs a thread-safe queue/flag to hand keypresses from the input thread to the main loop |
| Input responsiveness | Bounded by tick rate (fine at 60Hz for a game like Tetris) | Can capture every keypress the instant it happens, independent of tick rate |
| Risk | None (no concurrency bugs possible) | Race conditions if the shared data isn't properly synchronized (a real topic, out of scope for this series — mentioned so you know it exists) |

For Tetris specifically, single-threaded polling at 60Hz is genuinely the right choice — the added complexity of threading buys essentially no perceptible benefit for this game's input demands. This table exists so the choice is a deliberate one, not an accident of what happened to be simplest to write.

---

## Practice Problems

1. **Confirm raw mode works**: Write a minimal program that enables raw mode, loops reading and printing keypresses (printing their character and ASCII value) until 'q' is pressed, then disables raw mode. Confirm keys register instantly with no Enter needed, and that nothing is echoed to the screen while typing.

2. **Break it on purpose, then fix it**: Comment out `disableRawMode()` before your program's `return`, run it, and observe your terminal's broken state afterward (try typing — no echo, weird behavior). Run `reset` to fix your terminal manually. Then fix the program properly so this can't happen even on a crash — hint for problem 6 below.

3. **Flicker demonstration**: Write a small render loop that calls `clearScreen()` (the full clear, not the flicker-free version) every frame while printing an incrementing counter. Watch for visible flicker at a fast tick rate. Switch to the `moveCursor(1,1)` + overwrite approach and confirm the flicker disappears.

4. **Measure actual tick timing**: Add a debug counter that increments every tick and prints "ticks per second" once per real second (using `<chrono>` to measure elapsed real time). Confirm it's close to 60 (or whatever `tickInterval` you set). Try changing `tickInterval` to 33ms (~30Hz) and confirm the measured rate changes accordingly.

5. **CPU usage comparison**: Run your loop with the `sleep_for(1ms)` line commented out (pure busy-spin) and check CPU usage with a tool like `top` in another terminal. Then re-enable the sleep and compare. This should make the "why not just spin" trade-off concrete rather than theoretical.

6. **RAII-ify raw mode**: Wrap `enableRawMode`/`disableRawMode` in a small class, `RawModeGuard`, whose constructor enables raw mode and whose destructor disables it — direct reuse of Series 1 Module 3's RAII pattern. Confirm that even if you `return` early from a function using this guard (simulating an early-exit/error path), the terminal still gets restored correctly, which the free-function version can't guarantee as robustly.

---

**Next: Module 2 — The Board & Piece Hierarchy**, where actual Tetris content starts: representing the playing field and building the seven Tetromino shapes as a class hierarchy. Say "next module" when ready.
