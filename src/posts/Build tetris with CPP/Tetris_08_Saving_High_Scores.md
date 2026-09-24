# Tetris Module 8: Saving High Scores (File I/O)

## Why this module matters

Every run of the game so far starts from zero and forgets everything when it exits — no memory of past games. This module adds the last genuinely new C++ concept in the series: file I/O, including the real-world messiness of formats and error handling that a purely in-memory program never has to face.

---

## 1. `<fstream>` basics

```cpp
#include <fstream>
#include <string>

void writeExample() {
    std::ofstream out("scores.txt");   // opens for writing, creates the file if it doesn't exist,
                                          // TRUNCATES (erases) it if it does
    if (!out) {
        // handle failure -- see section 3
        return;
    }
    out << "Alice 15000\n";
    out << "Bob 12500\n";
}   // <- out's destructor closes the file automatically (RAII, Series 1 Module 3, one more time)

void readExample() {
    std::ifstream in("scores.txt");
    if (!in) {
        return;
    }
    std::string name;
    int score;
    while (in >> name >> score) {
        std::cout << name << ": " << score << "\n";
    }
}
```

`std::ofstream`/`std::ifstream` are RAII wrappers around the OS-level file handle, exactly the same pattern as `unique_ptr` wrapping heap memory or `RawModeGuard` (Module 1) wrapping terminal mode — acquire the resource in the constructor, guarantee release in the destructor. You could go out of your way to call `.close()` manually, but it's rarely necessary; letting the destructor handle it when the stream goes out of scope is the idiomatic approach, and it's correct even on early returns or exceptions, same as every other RAII example in this series.

---

## 2. Choosing a serialization format

Before writing any real save/load code, you need to decide **how** the data is represented on disk. Three reasonable options for something as simple as a high-score list:

| Format | Example | Pros | Cons |
|---|---|---|---|
| Plain text, whitespace-separated | `Alice 15000\nBob 12500\n` | Trivial to read/write with `<<`/`>>`, human-readable/editable, easy to debug by opening the file in a text editor | Breaks if a name contains a space; no structure beyond what you parse by convention |
| CSV-style (one delimiter, escaped) | `Alice,15000\nBob,12500\n` | Handles spaces in names correctly, still human-readable, standard-ish format | Slightly more parsing code (splitting on a delimiter, handling the delimiter appearing in data) |
| Binary (raw struct bytes) | *(not human-readable)* | Fast, compact, no parsing needed | Not human-readable/debuggable directly, not portable across platforms/compilers without care (struct padding — Series 1 Module 2 — differs by platform/compiler, so writing a raw struct's bytes on one machine and reading them on another can silently misalign) |

**We're using plain text for this project**, specifically because a high-score file is tiny (a handful of entries), read/written infrequently (not a performance-sensitive hot path), and the human-readability genuinely helps while you're developing and debugging — you can just `cat scores.txt` to sanity-check what got saved. Binary formats earn their complexity when you're serializing large amounts of data frequently (a real game's save-game system, not a top-10 high-score list) — worth recognizing this as the same "don't add complexity you haven't measured a need for" instinct from Module 7's ghost-piece caching discussion.

### A concrete format: one entry per line, name and score space-separated

```
Alice 15000
Bob 12500
Charlie 9800
```

This has the "breaks on spaces in names" limitation from the table above — practice problem 5 has you fix that by switching to a comma-delimited format instead, once you've felt the simpler version's limitation directly.

---

## 3. Error handling around file I/O

File operations can fail for reasons entirely outside your program's control — the file doesn't exist yet (first run), the directory isn't writable, the disk is full. **Never assume a file operation succeeded.**

```cpp
#include <fstream>
#include <stdexcept>

struct HighScoreEntry {
    std::string name;
    int score;
};

std::vector<HighScoreEntry> loadHighScores(const std::string& filename) {
    std::vector<HighScoreEntry> entries;
    std::ifstream in(filename);

    if (!in) {
        // file doesn't exist yet -- this is a NORMAL case (first run of the game ever),
        // not an error -- return an empty list, don't throw
        return entries;
    }

    std::string name;
    int score;
    while (in >> name >> score) {
        entries.push_back({name, score});
    }

    if (in.bad()) {
        // .bad() indicates a genuine I/O failure (not just "reached end of file" or a
        // format mismatch) -- this IS worth surfacing as a real error
        throw std::runtime_error("I/O error while reading high score file: " + filename);
    }

    return entries;
}
```

**The important distinction here**: a missing file on first run is an *expected, normal* condition — the correct response is "start with an empty list," not an error message or a crash. A genuine I/O failure partway through reading (disk error, permissions revoked mid-read, etc.) is a *real* error worth surfacing loudly. Conflating these two (treating "file doesn't exist yet" as a crash-worthy error, or silently swallowing a genuine I/O failure as if it were nothing) are both common, real mistakes — this function's structure deliberately keeps them separate.

```cpp
void saveHighScores(const std::string& filename, const std::vector<HighScoreEntry>& entries) {
    std::ofstream out(filename);
    if (!out) {
        throw std::runtime_error("Could not open high score file for writing: " + filename);
    }
    for (const auto& entry : entries) {
        out << entry.name << " " << entry.score << "\n";
    }
    if (!out) {   // check AGAIN after writing -- a write can fail partway through (disk full, etc.)
        throw std::runtime_error("Error occurred while writing high score file: " + filename);
    }
}
```

Checking the stream's state (`if (!out)`, which checks `std::ios::failbit`/`badbit`) **both before and after** writing matters — a stream can open successfully but still fail partway through a write operation (disk fills up mid-write, for instance), and only checking once, upfront, would miss that.

---

## 4. Maintaining a sorted top-N list

```cpp
#include <algorithm>

void insertHighScore(std::vector<HighScoreEntry>& entries, const HighScoreEntry& newEntry, int maxEntries = 10) {
    entries.push_back(newEntry);

    std::sort(entries.begin(), entries.end(),
        [](const HighScoreEntry& a, const HighScoreEntry& b) {
            return a.score > b.score;   // descending: highest score first
        });

    if (static_cast<int>(entries.size()) > maxEntries) {
        entries.resize(maxEntries);   // drop everything beyond the top N
    }
}
```

The **lambda** (`[](const HighScoreEntry& a, const HighScoreEntry& b) { return a.score > b.score; }`) is a small, inline, anonymous function passed directly as `std::sort`'s comparison rule — this is the standard modern-C++ way to customize sorting behavior without writing a separate named function or overloading `operator<` on `HighScoreEntry` itself (which would force one single global notion of "less than" onto the struct, when you might reasonably want different orderings in different contexts). This is worth recognizing as a genuinely common, idiomatic pattern you'll see constantly in real C++ code working with `<algorithm>`.

### Trade-off: re-sort-and-truncate on every insert vs. a structure that stays sorted

For a top-10 list with occasional insertions (once per game, not thousands of times per second), `push_back` + `std::sort` + `resize` on every insert is simple and entirely fast enough — this is the same "don't over-engineer for a scale you don't have" lesson as sections above. A genuinely high-frequency leaderboard (thousands of score submissions per second, a real online game's global leaderboard) would reasonably reach for something like a **min-heap of size N** (`std::priority_queue`, briefly: only replace the smallest entry if a new score beats it, avoiding a full re-sort every time) — worth knowing this exists as the "right tool at a different scale," without needing to build it for this project.

---

## Practice Problems

1. **Round-trip test**: Write a few `HighScoreEntry` values, save them with `saveHighScores`, then load them back with `loadHighScores`, and confirm the loaded data exactly matches what was saved.

2. **First-run behavior**: Delete (or rename) any existing score file, call `loadHighScores` on a filename that doesn't exist, and confirm it returns an empty vector without throwing or crashing — the "normal, expected" case from section 3.

3. **Genuine I/O failure**: Simulate a real failure — e.g., attempt to `saveHighScores` to a path in a directory you don't have write permission to, or an invalid path — and confirm your error handling actually throws/reports as expected rather than silently doing nothing or crashing uninformatively.

4. **Top-10 truncation**: Insert 15 scores via `insertHighScore` (with `maxEntries = 10`), confirming that after each insert the list never exceeds 10 entries, stays correctly sorted descending, and that a very low score inserted after the list is already full correctly does NOT appear in the final saved file (it should have been truncated away).

5. **Switch to comma-delimited format**: Rework the save/load format to `name,score` per line instead of space-separated, and update parsing accordingly (this fixes the "names with spaces" limitation flagged in section 2 — test it directly with a name like "Mary Jane" to confirm it now round-trips correctly, which the original space-separated format would have broken).

6. **Full integration**: Wire this into `Game`'s `GAME_OVER` state (Module 6) — on entering game-over, prompt for a name (a simple text input, doesn't need to be fancy) if the score qualifies for the top 10, insert it, and save. On game start (or app launch), load the existing high scores and make them visible somewhere (the menu screen is a reasonable place) rather than just holding them silently in memory.

---

## Files for this module

```
HighScore.h / .cpp  — HighScoreEntry struct, loadHighScores, saveHighScores, insertHighScore
Game.h / Game.cpp   — update: load high scores on startup, check/insert/save on game-over,
                       render the score list somewhere (menu screen is a reasonable choice)
```

Updated compile command: same as Module 7, with `HighScore.cpp` added.

**Checkpoint**: scores should now persist across separate runs of the program — play a game, get a score, close the program entirely, relaunch it, and confirm the previous score is still there.

---

**Next: Module 9 — Capstone: Polish & Full Integration**, the final module, where every piece from this series gets assembled, tested end-to-end, and cleaned up into a genuinely complete, shippable terminal Tetris. Say "next module" when ready.
