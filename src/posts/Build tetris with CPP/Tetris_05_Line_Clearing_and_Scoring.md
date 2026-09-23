# Tetris Module 5: Line Clearing & Scoring

## Why this module matters

Right now pieces lock into the board and just... stay there, filling up forever until the board overflows. This module adds the mechanic that makes Tetris a game rather than a stacking toy: detecting completed rows, removing them, and shifting everything above down — the exact same "compact the array" logic as Series 1's `DynamicArray` removal operations, just applied row-by-row to a 2D grid instead of element-by-element to a 1D array.

---

## 1. Detecting full rows

A row is "full" when every cell in it is occupied (non-zero).

```cpp
bool isRowFull(const Board& board, int row) {
    for (int x = 0; x < board.getWidth(); x++) {
        if (board.isEmpty(x, row)) return false;
    }
    return true;
}

std::vector<int> findFullRows(const Board& board) {
    std::vector<int> fullRows;
    for (int y = 0; y < board.getHeight(); y++) {
        if (isRowFull(board, y)) {
            fullRows.push_back(y);
        }
    }
    return fullRows;
}
```

This only needs checking **after a piece locks** — locking is the only event that can complete a row, so calling `findFullRows` on every single game tick would be wasted work (Series 1 Module 10's Big-O habit: know when work is actually necessary, not just correct).

---

## 2. Clearing rows and shifting everything down

Once you know which rows are full, they need to disappear, and everything above each cleared row needs to drop down by one row per row cleared beneath it.

```cpp
void clearRow(Board& board, int row) {
    // shift every row above `row` down by one
    for (int y = row; y > 0; y--) {
        for (int x = 0; x < board.getWidth(); x++) {
            board.setCell(x, y, board.getCell(x, y - 1));
        }
    }
    // the top row has nothing above it to shift down into it -- clear it to empty
    for (int x = 0; x < board.getWidth(); x++) {
        board.setCell(x, 0, 0);
    }
}

int clearFullRows(Board& board) {
    std::vector<int> fullRows = findFullRows(board);
    for (int row : fullRows) {
        clearRow(board, row);
    }
    return static_cast<int>(fullRows.size());   // how many rows were cleared -- feeds scoring
}
```

```
Before clearing row 3 (full):

row 0: . . . .
row 1: . # . .
row 2: # # . #
row 3: # # # #   <- full, about to clear
row 4: # # # #

After clearRow(board, 3):

row 0: . . . .
row 1: . . . .   <- was row 0, shifted down
row 2: . # . .   <- was row 1, shifted down
row 3: # # . #   <- was row 2, shifted down (row 3's old content is gone)
row 4: # # # #   <- untouched, nothing above it to shift into it
```

**Why iterate `y` downward, from `row` toward `0`, instead of upward?** This is worth sitting with — it's the same category of bug as Series 1 Module 3's array-shifting logic. If you copied row-by-row from top to bottom (`y` increasing), you'd overwrite a row's contents with itself before you'd finished reading its *original* contents into the row below it, corrupting data. Iterating from `row` upward to `0` (i.e., `y` decreasing) means each destination row (`y`) is written using source row (`y-1`)'s *still-original* contents, since you haven't touched row `y-1` yet at that point in the loop. **Always think carefully about iteration direction whenever an in-place shift reads and writes overlapping regions of the same structure** — this exact mistake (wrong direction in an overlapping copy) is a classic, easy-to-make bug across many contexts, not just this one.

### Handling multiple simultaneous full rows correctly

If more than one row is full at once (up to 4, in a single "Tetris" clear), `clearFullRows` calls `clearRow` once per full row, in the order `findFullRows` found them (top to bottom). Walk through why this still works correctly even though each `clearRow` call shifts the board's row indices: after the *first* row is cleared, everything above it has shifted down by one, meaning a full row that used to be at some index above the first cleared row is now at index-plus-one... wait — **this is actually a subtle bug waiting to happen, and it's exactly the kind of thing practice problem 1 has you find and fix.** Trace it carefully yourself before reading the fix; it's a genuinely good exercise in reasoning about index invalidation after a mutation, a close cousin of Series 1's "iterator invalidation" concerns with certain container operations.

---

## 3. Scoring

Standard Tetris scoring rewards clearing multiple rows simultaneously far more than clearing them one at a time — clearing 4 rows at once ("Tetris") is worth much more than 4 separate single-row clears, which is precisely the incentive that makes the game strategically interesting (stacking up and waiting for a big clear vs. clearing greedily).

```cpp
int scoreForClear(int rowsCleared, int level) {
    static const int basePoints[5] = {0, 40, 100, 300, 1200};   // index = rows cleared (0-4)
    if (rowsCleared < 0 || rowsCleared > 4) return 0;            // defensive bound check
    return basePoints[rowsCleared] * (level + 1);
}
```

```
rowsCleared=1 (single):  40 * (level+1)
rowsCleared=2 (double): 100 * (level+1)
rowsCleared=3 (triple): 300 * (level+1)
rowsCleared=4 (tetris): 1200 * (level+1)   <- disproportionately more than 4x a single, by design
```

This scoring table is loosely based on the real, well-known Tetris Guideline scoring values — worth using genuine reference numbers here rather than inventing arbitrary ones, since the specific ratios (a tetris being worth *far* more than 4 singles, not just proportionally more) are what create the actual strategic tension.

### A small `class GameStats` to hold running state

```cpp
class GameStats {
private:
    int score;
    int level;
    int linesCleared;   // cumulative total, drives level-up (Module 6)

public:
    GameStats() : score(0), level(0), linesCleared(0) {}

    void applyClear(int rowsCleared) {
        score += scoreForClear(rowsCleared, level);
        linesCleared += rowsCleared;
        // level-up logic itself belongs to Module 6 -- this method just tracks the raw numbers
    }

    int getScore() const { return score; }
    int getLevel() const { return level; }
    int getLinesCleared() const { return linesCleared; }
};
```

Notice `applyClear` deliberately does **not** handle leveling up itself, even though `linesCleared` is exactly what level progression depends on — that's Module 6's job. This is the same separation-of-concerns principle from Module 3 section 4: `GameStats` owns score/line tracking; level-progression *policy* (how many lines per level, what happens on level-up) is a distinct concern that'll live in its own place next module, rather than being crammed in here just because the raw data happens to live in this class.

---

## Practice Problems

1. **Find and fix the multi-row-clear bug**: Section 2 flagged a subtlety — work through it by hand first: build a board with rows 2 and 4 both full (row 3 not full, in between them), call `clearFullRows`, and trace/print the board state after *each* individual `clearRow` call inside the loop (not just the final result). Determine whether the second `clearRow` call ends up operating on the *correct* row index, given that the first call already shifted everything above it down by one. If it's wrong, fix `clearFullRows` (hint: think about whether processing rows top-to-bottom or bottom-to-top changes which indices are still valid after each individual clear).

2. **Single-row clear correctness**: Build a board with exactly one full row somewhere in the middle, with distinct, recognizable non-zero values above it (not all the same color id) so you can visually confirm shifting preserved relative order correctly, not just that cells became non-empty. Confirm the row above the cleared one now occupies the cleared row's old position, retaining its original color pattern.

3. **Tetris (4-line clear) test**: Construct a board with 4 consecutive full rows and confirm `clearFullRows` returns `4` and the board correctly ends up with those 4 rows entirely emptied and everything above shifted down by 4, not 1.

4. **Scoring verification**: Call `scoreForClear` for 1, 2, 3, and 4 rows at level 0, and confirm the ratios match section 3 (a tetris should be worth noticeably more than 4x a single — verify this numerically, don't just eyeball it).

5. **Integration**: Wire `clearFullRows` and `GameStats::applyClear` into your `gravityTick`/locking flow from Module 3 — after a piece locks, immediately check for and clear full rows, updating score. Confirm a full play sequence (drop several pieces, deliberately fill a row) results in the row clearing and the score increasing by the expected amount.

6. **Non-contiguous full rows**: Build a board where full rows exist at non-adjacent indices with genuinely different, non-full rows between and around them (e.g., full rows at 2, 5, and 6, with rows 0,1,3,4 partially filled) and confirm your (now hopefully fixed, from problem 1) `clearFullRows` handles this correctly — everything ends up in the right final position, not just the simple adjacent-rows case.

---

## Files for this module

```
Board.h            — add isRowFull needs board.getWidth()/getHeight()/isEmpty()/getCell()/setCell(),
                      all of which already exist from Module 2; no changes needed to Board itself
LineClear.h / .cpp — isRowFull, findFullRows, clearRow, clearFullRows, scoreForClear
GameStats.h / .cpp — the GameStats class from section 3
main.cpp           — update: call clearFullRows + GameStats::applyClear right after lockPiece
```

Updated compile command:
```bash
g++ -std=c++17 -fsanitize=address,undefined -g \
    main.cpp TerminalIO.cpp Tetromino.cpp TPiece.cpp IPiece.cpp OPiece.cpp \
    SPiece.cpp ZPiece.cpp JPiece.cpp LPiece.cpp PieceFactory.cpp \
    Collision.cpp SevenBagRandomizer.cpp PieceQueue.cpp \
    LineClear.cpp GameStats.cpp \
    -o tetris
```

**Checkpoint**: after this module, deliberately filling a row should make it visibly disappear with everything above dropping down, and you should be able to print/render a running score that increases correctly, including a noticeably bigger jump on a multi-row clear.

---

**Next: Module 6 — Game State & Level Progression**, where the level-up logic `GameStats` deliberately left out gets built, along with a proper menu/playing/paused/game-over state machine. Say "next module" when ready.
