# Tetris Module 2: The Board & the Piece Hierarchy

## Why this module matters

This is where Series 1's OOP work — inheritance, polymorphism, virtual functions — gets applied to something with real design stakes: seven Tetromino shapes (I, O, T, S, Z, J, L) that all need to behave the same way (move, rotate, report their occupied cells) but each have genuinely different shape data. Whether that "different shape data" belongs in subclasses or in a lookup table is a real design decision, covered as this module's central trade-off.

---

## 1. The Board

```cpp
#pragma once
#include <vector>

class Board {
private:
    int width, height;
    std::vector<std::vector<int>> grid;   // 0 = empty, 1-7 = a locked piece's color id

public:
    Board(int w, int h) : width(w), height(h), grid(h, std::vector<int>(w, 0)) {}

    bool isEmpty(int x, int y) const {
        return grid[y][x] == 0;
    }

    bool inBounds(int x, int y) const {
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    void setCell(int x, int y, int colorId) {
        grid[y][x] = colorId;
    }

    int getCell(int x, int y) const {
        return grid[y][x];
    }

    int getWidth() const { return width; }
    int getHeight() const { return height; }
};
```

`grid` is a `vector<vector<int>>` — a direct reuse of Series 1's `DynamicArray` concept (heap-managed, resizable, RAII-cleaned-up), just using the standard library version instead of hand-rolling it again, since Series 1 already proved you understand what's underneath. `grid[y][x]` (row-major: outer index is the row/y-coordinate, inner is the column/x-coordinate) is the standard convention for 2D grids — worth fixing this convention firmly in your head now, since a swapped x/y is one of the most common and confusing bugs in grid-based code.

### Trade-off: `vector<vector<int>>` vs. a single flat `vector<int>`

| | `vector<vector<int>>` | Flat `vector<int>` with manual indexing (`grid[y*width + x]`) |
|---|---|---|
| Memory layout | Each row is a separate heap allocation — rows are NOT contiguous with each other | One single contiguous block for the entire grid |
| Cache locality | Worse — accessing adjacent rows means jumping between separate allocations | Better — the whole grid is one contiguous block, better cache behavior for scans |
| Code clarity | `grid[y][x]` reads naturally | `grid[y*width + x]` requires manual index math everywhere |
| Appropriate for this project? | Yes — Tetris's grid is small (~10x20) and not performance-critical; clarity wins here | Better suited to large grids or performance-critical code (e.g., image processing, large simulations) |

We're using `vector<vector<int>>` deliberately for clarity, but you should recognize this as the same "readability vs. performance" axis that's shown up in trade-off tables since Series 1 — the right answer depends on scale, and a 10x20 Tetris board is nowhere near the scale where the flat-array version's cache benefit would matter.

---

## 2. The `Tetromino` base class

Each Tetromino needs: a set of occupied cell coordinates (relative to some origin point), a current rotation state, a position on the board, and a color. The seven pieces differ only in their shape data and color — everything else (moving, tracking rotation state, reporting absolute cell positions) is identical, which is exactly the situation virtual functions and inheritance were built for (Series 1, Module 4).

```cpp
#pragma once
#include <vector>
#include <utility>

class Tetromino {
protected:
    int x, y;              // position of the piece's origin on the board
    int rotationState;      // 0-3, which of the 4 rotation orientations is active
    int colorId;

    // each concrete piece provides its own 4 rotation states,
    // each state being a list of 4 (dx, dy) offsets from the origin
    virtual const std::vector<std::vector<std::pair<int,int>>>& rotationStates() const = 0;

public:
    Tetromino(int startX, int startY, int color)
        : x(startX), y(startY), rotationState(0), colorId(color) {}

    virtual ~Tetromino() {}   // Series 1 Module 4: virtual destructor, non-negotiable for a base class

    // returns the ABSOLUTE board coordinates this piece currently occupies
    std::vector<std::pair<int,int>> occupiedCells() const {
        std::vector<std::pair<int,int>> cells;
        for (const auto& offset : rotationStates()[rotationState]) {
            cells.push_back({x + offset.first, y + offset.second});
        }
        return cells;
    }

    void move(int dx, int dy) { x += dx; y += dy; }

    void rotateClockwise() {
        rotationState = (rotationState + 1) % 4;
    }

    void rotateCounterclockwise() {
        rotationState = (rotationState + 3) % 4;   // +3 mod 4 is the same as -1 mod 4, avoids negative results
    }

    int getColorId() const { return colorId; }
};
```

`rotationStates()` is a **pure virtual function** (Series 1 Module 4) — `Tetromino` itself has no sensible shape data of its own, so it's correctly abstract. `occupiedCells()`, `move()`, and the two rotate methods are ordinary (non-virtual) methods, because their logic is identical for every piece type — there's nothing to override, so making them virtual would add vtable indirection for no benefit.

**Why `rotationState = (rotationState + 3) % 4` instead of `rotationState - 1`?** In C++, the result of `%` on a negative left operand is implementation-defined-adjacent territory people get wrong constantly (`-1 % 4` is `-1` in C++, not `3` as you might expect from pure math modular arithmetic) — Series 1 Module 2's signed-integer discussion applies directly here. Adding 3 instead of subtracting 1 sidesteps the whole issue by staying non-negative.

---

## 3. A concrete piece: the T-piece

```cpp
#pragma once
#include "Tetromino.h"

class TPiece : public Tetromino {
private:
    static const std::vector<std::vector<std::pair<int,int>>> ROTATIONS;

protected:
    const std::vector<std::vector<std::pair<int,int>>>& rotationStates() const override {
        return ROTATIONS;
    }

public:
    TPiece(int startX, int startY) : Tetromino(startX, startY, /*colorId=*/3) {}
};

// TPiece.cpp
const std::vector<std::vector<std::pair<int,int>>> TPiece::ROTATIONS = {
    { {0,0}, {-1,0}, {1,0}, {0,-1} },   // rotation 0: spawn orientation (pointing up)
    { {0,0}, {0,-1}, {0,1}, {1,0} },     // rotation 1: pointing right
    { {0,0}, {-1,0}, {1,0}, {0,1} },     // rotation 2: pointing down
    { {0,0}, {0,-1}, {0,1}, {-1,0} }     // rotation 3: pointing left
};
```

```
T-piece rotation 0 (offsets from origin, y increases downward):

   (-1,0) (0,0) (1,0)
            (0,-1)

visually:
      #
    # # #
```

`ROTATIONS` is `static const` — one shared copy of the shape data exists for the whole class, not duplicated per instance (every `TPiece` object has the exact same rotation data; there's no reason to store four separate copies of it per object). Note it's defined in the `.cpp` file, not the header — this is Series 1 Module 4.5's One Definition Rule in action: a `static` member's actual storage needs exactly one definition somewhere, and putting it in the header (without `inline`, pre-C++17 style) would violate ODR the instant two `.cpp` files included `TPiece.h`. (If you're on C++17 or later, `static inline const std::vector<...> ROTATIONS = {...};` directly in the header is also valid and slightly more convenient — worth knowing both approaches exist.)

You'll write the other six pieces (I, O, S, Z, J, L) yourself in the practice problems — the pattern is identical, only the coordinate data and color change.

---

## 4. Trade-off: inheritance-per-piece vs. a single data-driven `Piece` class

This module built seven subclasses. That's not the only reasonable design — worth examining honestly:

```cpp
// Alternative: ONE Piece class, shape selected by an enum + a static lookup table
enum class PieceType { I, O, T, S, Z, J, L };

class Piece {
private:
    PieceType type;
    int x, y, rotationState, colorId;
    static const std::vector<std::vector<std::vector<std::pair<int,int>>>>& allRotationTables();
    // allRotationTables()[static_cast<int>(type)] gives this piece's rotation data

public:
    Piece(PieceType t, int startX, int startY);
    // ... same occupiedCells/move/rotate methods, no virtual functions needed at all ...
};
```

| | Inheritance-per-piece (what we built) | Data-driven single class |
|---|---|---|
| Adding a new piece type | Write a new subclass | Add a new table entry |
| Runtime overhead | Virtual call for `rotationStates()` (Series 1 Module 4: vtable indirection) | None — no virtual functions needed at all |
| Code organization | Each piece's data lives in its own small, focused file | All shape data lives in one (larger) table |
| Fits Series 1's OOP lessons directly | Yes — deliberately chosen for that reason | Also valid OOP (encapsulation, single responsibility), just without inheritance |
| What a real, performance-conscious game engine would likely do | Less common — pure data with no polymorphism, for a case this simple | More common — Tetris pieces are "the same kind of thing with different data," which is usually a sign that data-driven design fits better than inheritance |

**Honest assessment**: the data-driven version is arguably the *better* engineering choice here — Series 1 Module 4's trade-off table already flagged that virtual functions cost something and are best reserved for cases where you genuinely don't know the type until runtime; here, all seven piece types are known upfront, so templates or plain data would both outperform inheritance with no loss of correctness. We built it with inheritance anyway because this series is specifically about applying Series 1's OOP tools in a real context — but recognizing when inheritance is *not* actually the best tool, even in an OOP-focused series, is itself an important lesson. Practice problem 6 has you build the data-driven alternative directly, so you can compare both with your own hands rather than just reading the table.

---

## Practice Problems

1. **Complete the seven pieces**: Implement `IPiece`, `OPiece`, `SPiece`, `ZPiece`, `JPiece`, `LPiece` following the `TPiece` pattern, each with correct rotation-state offset data and a distinct `colorId` (1 through 7). Look up standard Tetromino rotation data (the "Super Rotation System" offsets are the real-world standard) if you want visually correct rotations, or work out your own consistent 4-state offsets by hand — either is fine for learning purposes, as long as all 4 rotations of each piece are self-consistent.

2. **Render the board and a piece**: Write a function that takes a `Board` and a `Tetromino*`, and produces a text grid (`#` for occupied cells, `.` for empty) combining the locked board state with the currently-falling piece's `occupiedCells()`. Confirm it looks visually correct for at least 3 different piece types in their default rotation.

3. **Rotate and observe**: Spawn a `TPiece`, print its `occupiedCells()`, call `rotateClockwise()` four times in a row, and confirm the fourth call returns it to the exact same cells as the start (rotation state cycling correctly through the modulo).

4. **Polymorphic piece factory**: Write a function `std::unique_ptr<Tetromino> createPiece(int typeIndex, int startX, int startY)` that returns the right subclass based on `typeIndex` (0-6) — this is your first real use of `unique_ptr` (Series 1 Module 6) for genuine runtime-determined ownership, since you won't know which concrete piece type you're creating until the random piece generator (Module 4) picks one.

5. **Vtable cost, informally observed**: Add a call counter (a `static int` incremented inside `rotationStates()`) and call `occupiedCells()` in a tight loop (100,000+ times) on a single piece, timing it with `<chrono>` (Series 1 Module 6 reused the same tool). Don't expect a dramatic difference at this scale — the point of this exercise is to see that the overhead, while real in principle (section 4's trade-off), is genuinely negligible for a program calling this a handful of times per game tick, not millions of times per second. This is a useful, honest correction to over-worrying about virtual function cost in code that isn't actually performance-critical.

6. **Build the data-driven alternative**: Implement the single-`Piece`-class, enum-plus-lookup-table version sketched in section 4. Get it to produce identical `occupiedCells()` output to your inheritance-based version for the same piece type/rotation/position, then decide for yourself, in a short written comment, which design you'd actually choose for a real project and why — there's no single correct answer, but you should be able to argue for your choice using this module's trade-off table.

---

**Next: Module 3 — Movement & Collision Detection**, where pieces actually start falling and interacting with the board and each other. Say "next module" when ready.
