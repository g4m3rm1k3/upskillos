# Tetris Module 3: Movement & Collision Detection

## Why this module matters

Right now a `Tetromino` can move and rotate freely, with no awareness of walls, the floor, or other locked pieces — it'll happily report coordinates outside the board or overlapping existing blocks. This module adds the one function that makes Tetris actually *Tetris*: collision detection, and the movement/locking logic built on top of it.

---

## 1. The core collision check

```cpp
bool isValidPosition(const Board& board, const Tetromino& piece) {
    for (const auto& cell : piece.occupiedCells()) {
        int cx = cell.first;
        int cy = cell.second;

        if (!board.inBounds(cx, cy)) return false;        // off the edge of the board
        if (!board.isEmpty(cx, cy)) return false;          // overlaps a locked piece
    }
    return true;
}
```

This single function is the foundation everything else in this module builds on: it takes a `Board` and a `Tetromino` **without mutating either** — `const Board&` and `const Tetromino&` — and just reports true/false. Every movement and rotation operation follows the same pattern: **tentatively apply the change, check validity, undo if invalid.** Keeping this check as one small, pure (no side effects), heavily-reused function is a deliberate design choice — every place that needs to know "can this piece be here?" calls this one function, rather than each caller re-implementing bounds/overlap logic slightly differently (and inevitably inconsistently).

---

## 2. Try-move pattern: attempt, check, revert

```cpp
bool tryMove(Board& board, Tetromino& piece, int dx, int dy) {
    piece.move(dx, dy);
    if (isValidPosition(board, piece)) {
        return true;   // move succeeded, piece is now in its new position
    }
    piece.move(-dx, -dy);   // revert — undo the tentative move
    return false;
}

bool tryRotateClockwise(Board& board, Tetromino& piece) {
    piece.rotateClockwise();
    if (isValidPosition(board, piece)) {
        return true;
    }
    piece.rotateCounterclockwise();   // revert
    return false;
}
```

This "attempt, check, revert" shape is worth recognizing as a pattern you'll see again in other contexts (it's structurally similar to how undo systems and transactional operations work generally) — mutate optimistically, validate, roll back on failure, rather than trying to predict validity *before* mutating (which usually means duplicating the mutation logic twice: once as a "what would this look like" simulation, once as the real mutation).

```
tryMove example: piece at x=5, attempting move(-1, 0) into a wall at x=0:

before:  piece.x = 5
move(-1,0): piece.x = 4   (tentative)
isValidPosition: true (assume board is otherwise empty)
result: move succeeds, piece stays at x=4

Now try move(-1,0) again from x=0:
move(-1,0): piece.x = -1   (tentative)
isValidPosition: false (out of bounds)
revert: move(1,0), piece.x back to 0
result: move fails, piece correctly stays at x=0
```

---

## 3. Locking a piece into the board

When a falling piece can no longer move down, it **locks** — its cells become permanent board state, and a new piece spawns.

```cpp
void lockPiece(Board& board, const Tetromino& piece) {
    for (const auto& cell : piece.occupiedCells()) {
        board.setCell(cell.first, cell.second, piece.getColorId());
    }
}
```

### Detecting "can no longer move down" — the gravity tick

```cpp
enum class TickResult { MOVED, LOCKED };

TickResult gravityTick(Board& board, Tetromino& piece) {
    if (tryMove(board, piece, 0, 1)) {
        return TickResult::MOVED;
    }
    lockPiece(board, piece);
    return TickResult::LOCKED;
}
```

Notice this reuses `tryMove` directly rather than writing separate "can this move down" logic — `tryMove` already does exactly the check-and-revert needed; if it returns `false`, that's precisely the "can't move down, must lock" condition, with no duplicated logic.

**`enum class` vs. plain `enum`**: `TickResult::MOVED` requires the `TickResult::` prefix, unlike a plain `enum`'s bare `MOVED`. This is deliberate scoping (an `enum class` doesn't leak its enumerator names into the surrounding scope, avoiding name collisions with, say, another enum that also wants a `MOVED` value) and is the modern-C++-recommended default over plain `enum` for exactly that reason.

---

## 4. Separating logic from rendering (a design principle worth naming explicitly)

Notice that nothing in this module's code prints anything, and nothing in Module 1's rendering code touches game logic. This separation is deliberate and matters: `isValidPosition`, `tryMove`, `lockPiece`, and `gravityTick` operate purely on `Board`/`Tetromino` state, with no dependency on `std::cout`, terminal escape codes, or anything from Module 1. This means:

- You can unit-test all of this module's logic without touching the terminal at all (practice problems below do exactly this).
- The rendering code from Module 1 can change completely (swap ANSI escape codes for `ncurses`, or even a future GUI) without touching any logic in this module.
- Bugs are easier to isolate: a wrong collision result is a logic bug (this module); a piece rendering in the wrong screen position is a rendering bug (Module 1) — the two categories can't get tangled together if the code itself keeps them apart.

This is the informal version of a real software engineering principle (separation of concerns / model-view separation) — worth internalizing now, since Module 6's state machine and Module 9's integration both depend on this boundary staying clean.

---

## 5. Wall kicks (a brief, honest preview)

Real Tetris (following the modern "Super Rotation System" standard) doesn't just fail a rotation outright when it would overlap something — it tries a small set of alternate offset positions ("kicks") before giving up, so a piece rotating near a wall can nudge itself sideways to complete the rotation instead of being blocked entirely. This is a genuinely fiddly, table-driven feature (a specific offset table per piece type per rotation transition) that's out of scope for this module's core teaching goal, but worth knowing exists — practice problem 6 has you implement a simplified version.

```cpp
bool tryRotateWithKicks(Board& board, Tetromino& piece, const std::vector<std::pair<int,int>>& kickOffsets) {
    piece.rotateClockwise();
    if (isValidPosition(board, piece)) return true;   // rotation worked with no kick needed

    for (const auto& kick : kickOffsets) {
        piece.move(kick.first, kick.second);
        if (isValidPosition(board, piece)) return true;   // this kick offset worked
        piece.move(-kick.first, -kick.second);              // revert this kick attempt, try the next
    }

    piece.rotateCounterclockwise();   // no kick worked, fully revert the rotation
    return false;
}
```

Same "attempt, check, revert" pattern from section 2, just applied repeatedly across a small list of candidate offsets instead of a single attempt.

---

## Practice Problems

1. **Test collision without any rendering**: Write a small test `main()` that constructs a `Board`, manually fills in a few cells with `setCell` to simulate locked pieces, spawns a piece at a colliding position, and confirms `isValidPosition` correctly returns `false`. Then spawn it somewhere clearly valid and confirm `true`. No terminal rendering needed for this — proving section 4's separation-of-concerns claim to yourself directly.

2. **Wall collision**: Spawn a piece near the left edge, call `tryMove` repeatedly with `dx = -1` until it stops succeeding, and confirm the piece's final x-coordinate keeps it fully in-bounds (check every cell, not just the origin — some rotation states have cells that extend further left/right than others).

3. **Full gravity-to-lock simulation**: Write a loop that repeatedly calls `gravityTick` on a single piece with an empty board below it, until it returns `TickResult::LOCKED`. Confirm the piece landed at the bottom of the board (not floating, not overlapping the floor) and that `board.isEmpty()` now returns `false` for every cell the piece occupied.

4. **Piece-on-piece stacking**: Lock one piece near the bottom of the board, then spawn a second piece directly above it and run gravity ticks until it locks. Confirm the second piece stops exactly on top of the first, not overlapping it and not floating above it with a gap.

5. **Rotation against a wall**: Position a piece (an I-piece is a good test case — it's long) right against the left or right wall in an orientation where rotating would push part of it out of bounds. Confirm `tryRotateClockwise` correctly fails (returns `false`) and leaves the piece's rotation state unchanged (verify by checking `occupiedCells()` before and after the failed attempt are identical).

6. **Implement a simplified wall-kick table**: Using `tryRotateWithKicks` from section 5, define a small kick-offset list (e.g., try `{1,0}`, `{-1,0}`, `{0,-1}` in order) and confirm a piece that would fail a plain rotation near a wall now succeeds by nudging sideways. This doesn't need to match the official SRS kick tables exactly — the goal is understanding the "try a short list of alternate positions before giving up" mechanism, not achieving tournament-accurate rotation behavior.

---

**Next: Module 4 — The Piece Queue & 7-Bag Randomizer**, where Series 1's `Queue<T>` gets a genuine, motivated use: fair piece randomization and a next-piece preview. Say "next module" when ready.
