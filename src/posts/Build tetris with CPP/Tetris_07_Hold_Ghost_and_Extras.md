# Tetris Module 7: Hold Piece, Ghost Piece & Extras

## Why this module matters

These are the features that separate a "technically complete Tetris" from one that feels like a real, modern implementation. Neither is conceptually hard, but both surface real design questions — hold piece raises an ownership question (Series 1 Module 6's territory), and ghost piece raises a "how much should I compute vs. cache" question that's a genuine, recurring theme in game programming.

---

## 1. Hold piece: the mechanic

Pressing a hold key swaps the currently-falling piece into a "held" slot, and either brings the previously-held piece into play (if one exists) or spawns a fresh piece from the queue (if the hold slot was empty). Standard Tetris also restricts this to **once per piece** — you can't hold, get the swap, hold again, get the swap back, repeatedly, without ever actually placing anything.

```
Hold, first time this piece:           Hold, held slot already has a piece:

current: T-piece         current: (empty, held slot was empty)     current: T-piece      current: S-piece (was held)
held: (empty)      -->   held: T-piece                             held: S-piece   -->   held: T-piece

                          then spawn a fresh piece from the queue                          (swapped directly, no queue spawn)
```

### The ownership question

`currentPiece` and `heldPiece` both need to be `unique_ptr<Tetromino>` (Series 1 Module 6 — exactly one owner, and the concrete type isn't known until runtime, same reasoning as Module 2's `PieceFactory`). A hold operation needs to **swap** which `unique_ptr` owns which piece — and this is precisely what `std::swap` (or `std::move` in both directions) is for:

```cpp
class Game {
private:
    std::unique_ptr<Tetromino> currentPiece;
    std::unique_ptr<Tetromino> heldPiece;
    bool holdUsedThisPiece;
    // ...

public:
    void holdCurrentPiece() {
        if (holdUsedThisPiece) return;   // enforce the once-per-piece rule

        if (heldPiece == nullptr) {
            heldPiece = std::move(currentPiece);
            spawnNextPiece();             // no piece was waiting in hold, so pull a fresh one
        } else {
            std::swap(currentPiece, heldPiece);   // std::swap on unique_ptr moves both directions internally
            resetPiecePosition(*currentPiece);      // the piece coming OUT of hold needs to go back to spawn position
        }

        holdUsedThisPiece = true;
    }
};
```

**Why `std::swap` works cleanly on two `unique_ptr`s**: `unique_ptr` can't be copied, but it *is* movable (Series 1 Module 6), and `std::swap`'s generic implementation is built entirely out of moves internally (move one into a temporary, move the second into the first's old slot, move the temporary into the second) — so it works correctly and efficiently for any movable type, `unique_ptr` included, without you writing any manual move logic yourself here.

**`holdUsedThisPiece` resets to `false`** the moment a piece locks and a genuinely new piece spawns (add this to your `lockPiece`/`spawnNextPiece` flow from Module 3/6) — the restriction is "once per *piece*," not "once ever."

---

## 2. Ghost piece: showing where a piece will land

A "ghost piece" is a faint preview, rendered at the position the current piece would land if dropped straight down right now — a real usability feature (shows the player their landing spot without them having to track it mentally).

```cpp
Tetromino computeGhostPosition(const Board& board, const Tetromino& piece) {
    // work on a COPY, never mutate the real falling piece
    auto ghost = piece.clone();   // see note below on why this needs a clone() method

    while (true) {
        ghost->move(0, 1);
        if (!isValidPosition(board, *ghost)) {
            ghost->move(0, -1);   // step back to the last valid position
            break;
        }
    }
    return *ghost;
}
```

**Why this needs a `clone()` method you haven't built yet**: `computeGhostPosition` must simulate dropping the piece *without* touching the real `currentPiece` object (the player hasn't actually dropped it — they're still controlling it). But `Tetromino` is an abstract base class with concrete subclasses (`TPiece`, `IPiece`, etc.) — you can't just copy-construct through a `Tetromino&` reference (that would slice, exactly like Series 1 Module 4's slicing trap), and you don't know the concrete type at the call site. The standard fix is a **virtual clone method**:

```cpp
class Tetromino {
public:
    // ... existing members ...
    virtual std::unique_ptr<Tetromino> clone() const = 0;
};

class TPiece : public Tetromino {
public:
    // ... existing members ...
    std::unique_ptr<Tetromino> clone() const override {
        return std::make_unique<TPiece>(*this);   // uses TPiece's compiler-generated copy constructor --
                                                      // safe here since TPiece has no owned heap resources
    }
};
```

This pattern (a virtual `clone()` returning `unique_ptr<Base>`, implemented identically in every subclass by calling that subclass's own copy constructor) is a well-known, genuinely useful idiom for exactly this situation: copying a polymorphic object through a base pointer/reference without slicing. It's worth recognizing by name — you'll see it called the "virtual constructor idiom" or "clone pattern" in other C++ material.

### Trade-off: recompute the ghost every render vs. cache it

```cpp
// Option A: recompute every frame, right before rendering
void render() {
    Tetromino ghost = computeGhostPosition(board, *currentPiece);
    // ... draw board, then ghost, then currentPiece on top ...
}

// Option B: cache it, only recompute when currentPiece moves/rotates/locks
class Game {
    Tetromino cachedGhost;  // or std::optional<Tetromino>-like handling
    bool ghostDirty = true;

    void onPieceMoved() { ghostDirty = true; }   // call this from every move/rotate path

    void render() {
        if (ghostDirty) {
            cachedGhost = computeGhostPosition(board, *currentPiece);
            ghostDirty = false;
        }
        // ... draw using cachedGhost ...
    }
};
```

| | Recompute every frame | Cache with dirty-flag invalidation |
|---|---|---|
| Correctness risk | None — always reflects current truth | Real risk: forget to set `ghostDirty = true` on some code path that moves the piece, and the ghost silently goes stale |
| Performance cost | `computeGhostPosition` is O(board height) at worst — for a ~20-row board at 60 renders/sec, this is genuinely trivial | Marginally less work, but the saved cost here is negligible given the scale |
| Code complexity | Lower — one function call, no state to keep in sync | Higher — every mutation path must remember to invalidate |

**Recommendation for this project, stated plainly**: recompute every frame (Option A). This mirrors Series 1 Module 10's benchmarking lesson directly — Big-O analysis says "O(board height) per frame" sounds like it might matter, but at Tetris's actual scale (a ~20-row board, 60 frames/sec) it's a trivial amount of real work, and the caching approach's correctness risk (a stale ghost from a missed invalidation) is a real, easy-to-introduce bug for essentially no measurable performance benefit. This is a good, concrete instance of "don't add caching complexity until you've actually measured that you need it" — a genuinely important habit beyond just this one feature.

---

## Practice Problems

1. **Implement and test hold**: Wire up `holdCurrentPiece`, confirm the first hold on a fresh game correctly moves the current piece to the hold slot and spawns a new one, and that a second hold (with something already held) correctly swaps both pieces, with the piece coming out of hold reset to spawn position (not wherever it happened to be when it went into hold).

2. **Enforce the once-per-piece rule**: Confirm that calling `holdCurrentPiece` twice in a row (before the current piece locks) only performs the swap once — the second call should do nothing. Confirm it becomes usable again after the current piece locks and a new one spawns.

3. **Implement `clone()` for all seven pieces**: Add the virtual `clone()` override to every concrete piece class (it's the same one-line pattern for all seven, just with each piece's own type). Write a quick test: clone a piece, mutate the original (move/rotate it), and confirm the clone's state is completely unaffected — proving it's a genuine independent copy, not sharing state.

4. **Ghost piece rendering**: Implement `computeGhostPosition` and render it (a distinct visual style — different character or color — from the actual falling piece) beneath the current piece. Confirm it correctly tracks the landing position as you move the current piece left/right, and correctly updates after a rotation.

5. **Ghost piece edge case**: Position a piece directly above a jagged, unevenly-stacked section of locked pieces (not a flat surface) and confirm the ghost correctly lands on the actual highest point of collision for that piece's specific shape, not just "the top of the tallest stack anywhere on the board."

6. **Measure the "don't cache" claim yourself**: Time `computeGhostPosition` directly (Series 1 Module 6's `<chrono>` pattern again) called 10,000 times in a tight loop, and compute what fraction of a single 16ms frame budget (Module 1's ~60Hz tick) that represents. Use this measurement to argue, with an actual number rather than just the module's claim, whether caching would have been worth the added complexity for this specific feature on this specific project.

---

## Files for this module

```
Tetromino.h / .cpp        — update: add pure virtual clone() to the base class
TPiece.h/.cpp, IPiece.h/.cpp, etc. — update: add clone() override to all seven concrete pieces
Ghost.h / .cpp            — computeGhostPosition
Game.h / Game.cpp         — update: add heldPiece, holdUsedThisPiece members and holdCurrentPiece();
                             update render() to draw the ghost piece; update lock/spawn flow to
                             reset holdUsedThisPiece
```

Updated compile command: same as Module 6, with `Ghost.cpp` added to the file list.

**Checkpoint**: at this point the game should feel genuinely comparable to a real, modern Tetris implementation — hold piece, ghost piece, correct level-based speed, and a working state machine all functioning together.

---

**Next: Module 8 — Saving High Scores (File I/O)**, where the game gains persistence across runs. Say "next module" when ready.
