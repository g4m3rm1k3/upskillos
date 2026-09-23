# Lesson 18 — The Tilemap Data Model: Grids Instead of Individual Objects

## What you'll learn
- Why a tile-based level needs its own compact representation, not thousands of individual `GameObject`s
- Row-major indexing (`y * width + x`) as the standard way to flatten a 2D grid into a 1D list, and exactly why that formula, in that order
- A genuinely common, genuinely silent tilemap bug: swapping the index formula's terms works by accident on a square map and breaks — sometimes loudly, sometimes not — the moment the map isn't square
- Generalizing Lesson 5's single-row `slice_sheet` into a real multi-row tileset slicer, closing a gap left open since Phase 6

## What you'll build
`forge/tilemap.py` — a `TileMap` dataclass, a proper grid-based tileset
slicer, and a renderer that draws an entire level's background efficiently,
laid beneath whatever `RenderSprite`s already populate the scene.

## The question
Forge can currently place individual, hand-positioned `GameObject`s — fine
for a player, an enemy, a handful of props. A game's floor, walls, and
background are usually hundreds or thousands of small, repeating tiles.
Authoring a stone floor as a thousand individual `GameObject`s would be
absurd — a thousand Scene Tree rows, a thousand entries in every save
file, a thousand potential undo-stack entries for painting one wall. What
does a representation built specifically for "a grid of repeating tiles"
actually need to look like instead?

---

## 1. Predict

A tile-based level is naturally a 2D grid — row and column. Python has no
built-in 2D array type; the two most obvious options are a list of lists
(`tiles[y][x]`) or one flat list with an index formula
(`tiles[y * width + x]`). Before reading on: which do you expect is more
common in real tilemap formats (Tiled's own map format among them), and
why might a flat list, despite needing an index formula instead of two
plain indices, actually be the more practical choice for something meant
to be saved to a compact file format?

---

## 2. Try it

```python
from dataclasses import dataclass, field


@dataclass
class TileMap:
    width: int
    height: int
    tile_size: int
    tileset_path: str
    tiles: list[int] = field(default_factory=list)

    def get_tile(self, x: int, y: int) -> int:
        return self.tiles[y * self.width + x]

    def set_tile(self, x: int, y: int, tile_index: int) -> None:
        self.tiles[y * self.width + x] = tile_index


# a tiny 3-wide, 2-tall map, flattened row by row
tilemap = TileMap(
    width=3, height=2, tile_size=16, tileset_path="assets/tileset.png",
    tiles=[0, 0, 1,
           1, 1, 0],
)

print(tilemap.get_tile(2, 0))  # top-right tile
print(tilemap.get_tile(0, 1))  # bottom-left tile
```

Output:
```
1
1
```

### What this code does (mechanical explanation)

**`tiles: list[int] = field(default_factory=list)`**
Exactly Lesson 3's `default_factory` mechanism, applied to a plain list of
integers — each integer will represent *which tile* (an index into a
tileset's sliced-out tile images, built in Section 5) occupies one cell of
the grid; `-1` will be reserved to mean "empty," a convention established
once here and relied on throughout the rest of this lesson.

**`def get_tile(self, x: int, y: int) -> int:`**
Rather than exposing `tiles` as a raw flat list everywhere it's used, this
method is the **single place** the flattening formula appears for
reading — every other piece of code that wants "the tile at column `x`,
row `y`" calls this instead of computing the index itself. This matters
directly for Section 6's trap: centralizing the formula in exactly one
function means there's only one place it could possibly be gotten wrong,
rather than several scattered, independently-fragile copies of the same
arithmetic.

**`y * self.width + x`** — the formula itself
This is **row-major** indexing: walk along one entire row (`width` cells)
before moving to the next row. To find cell `(x, y)`'s position in the
flattened list, you first skip past `y` complete rows — each `width`
cells long, hence `y * self.width` — and then move `x` more cells into
the current row. This is why `width` (not `height`) appears in the
multiplication: you're counting *how many cells one row contains*, to
know how far to skip per row.

**`tilemap.get_tile(2, 0)`** → `1`
Column `2`, row `0` — using the formula: `0 * 3 + 2 = 2`, and
`tiles[2]` is `1` (the third value in the flat list, `[0, 0, 1, 1, 1,
0]`) — matching the top-right cell of the intended `3×2` grid laid out in
the comment above the literal list.

**`tilemap.get_tile(0, 1)`** → `1`
Column `0`, row `1`: `1 * 3 + 0 = 3`, and `tiles[3]` is `1` — the
bottom-left cell.

---

## 3. Why?

### Why a flat list, not a list of lists

```
list-of-lists:  tiles[y][x]
  - reads naturally, no formula needed
  - but: each row is a SEPARATE list object — resizing the grid, copying
    it, or comparing two maps for equality means recursing through every
    row individually
  - JSON round-trips fine (asdict/json handle nested lists), but the
    shape mirrors a 2D structure Python doesn't have a single true
    built-in type for, so it's really a list of independently-managed lists

flat list + formula:  tiles[y * width + x]
  - one single, flat, contiguous list — trivially compared, trivially
    resized to a known total length, trivially saved as one JSON array
  - requires a formula (this lesson's whole subject) instead of two
    plain indices
```

Real tilemap formats — Tiled's own map format included — commonly store
tile data as one flat, row-major sequence, precisely because the
one-dimensional shape is simpler to serialize, checksum, and manipulate in
bulk, at the cost of needing the index formula this lesson is entirely
about getting right.

### The mechanism, precisely

```
Grid layout (width=3, height=2):
  row 0:  (0,0) (1,0) (2,0)
  row 1:  (0,1) (1,1) (2,1)

Flattened, row by row:
  index:   0     1     2     3     4     5
  cell:  (0,0) (1,0) (2,0) (0,1) (1,1) (2,1)

Formula:  index = y * width + x
  (2, 0) → 0*3 + 2 = 2   ✓ matches position 2 above
  (0, 1) → 1*3 + 0 = 3   ✓ matches position 3 above
```

```
behavior:
  compile_time:
    - "none — this is pure arithmetic, not something a type checker verifies"
  runtime:
    - "the formula's correctness depends entirely on width being multiplied by the ROW coordinate (y), never the column coordinate (x) — getting this backwards is exactly Section 6's trap"
```

---

## 4. Change one thing — generalizing Lesson 5's slicer to a real grid

Lesson 5's `slice_sheet` only handled a single row of frames. A real
tileset is a full grid — multiple rows and columns of tiles packed
together.

```diff
-def slice_sheet(sheet: pygame.Surface, frame_w: int, frame_h: int) -> list[pygame.Surface]:
-    columns = sheet.get_width() // frame_w
-    return [
-        sheet.subsurface(pygame.Rect(i * frame_w, 0, frame_w, frame_h))
-        for i in range(columns)
-    ]
+def slice_sheet_grid(sheet: pygame.Surface, tile_w: int, tile_h: int) -> list[pygame.Surface]:
+    columns = sheet.get_width() // tile_w
+    rows = sheet.get_height() // tile_h
+    tiles = []
+    for row in range(rows):
+        for col in range(columns):
+            rect = pygame.Rect(col * tile_w, row * tile_h, tile_w, tile_h)
+            tiles.append(sheet.subsurface(rect))
+    return tiles
```

### What changed
A second loop, over `rows`, was added around the existing per-column
logic; each tile's `Rect` now also accounts for `row * tile_h` as its
y-offset, not just `col * tile_w` for x.

### What did not change
`sheet.subsurface(rect)` itself — identical mechanism to Lesson 5
(a shared-memory view, not a copy; Lesson 5's trap about not drawing
directly on these still applies unchanged here).

```
change_analysis:
  changed: "added an outer loop over rows, and each tile's Rect now includes a row-dependent y-offset"
  unchanged:
    - "subsurface as the actual slicing mechanism"
    - "the per-column x-offset calculation"
  behavioral_difference:
    - "slice_sheet_grid correctly handles tilesets with any number of rows, not just one"
  compiler_difference:
    - "none"
  runtime_difference:
    - "the returned list is now built in row-major order (row 0's tiles first, left to right, then row 1's, and so on) — matching, deliberately, the exact same row-major convention TileMap.tiles uses, so a tile index from TileMap.tiles maps directly onto this list's index with no further translation needed"
```

**Why row-major order here specifically matters:** this isn't a
coincidence — `slice_sheet_grid`'s output order was deliberately chosen to
match `TileMap.tiles`'s own row-major convention from Section 2. A tile
index of `5` means "the 6th tile in this list" in *both* places,
consistently, which is exactly what makes `tile_surfaces[tilemap.get_tile(x,
y)]` (Section 5) a correct, simple lookup with no additional translation
step required between the two.

---

## 5. Put it in the project

```python
# forge/tilemap.py
from dataclasses import dataclass, field
import pygame


@dataclass
class TileMap:
    width: int
    height: int
    tile_size: int
    tileset_path: str
    tiles: list[int] = field(default_factory=list)

    def get_tile(self, x: int, y: int) -> int:
        return self.tiles[y * self.width + x]

    def set_tile(self, x: int, y: int, tile_index: int) -> None:
        self.tiles[y * self.width + x] = tile_index

    @staticmethod
    def empty(width: int, height: int, tile_size: int, tileset_path: str) -> "TileMap":
        return TileMap(
            width=width, height=height, tile_size=tile_size,
            tileset_path=tileset_path,
            tiles=[-1] * (width * height),
        )


def slice_sheet_grid(sheet: pygame.Surface, tile_w: int, tile_h: int) -> list[pygame.Surface]:
    columns = sheet.get_width() // tile_w
    rows = sheet.get_height() // tile_h
    tiles = []
    for row in range(rows):
        for col in range(columns):
            rect = pygame.Rect(col * tile_w, row * tile_h, tile_w, tile_h)
            tiles.append(sheet.subsurface(rect))
    return tiles


def render_tilemap(surface: pygame.Surface, tilemap: TileMap,
                    tile_surfaces: list[pygame.Surface]) -> None:
    for y in range(tilemap.height):
        for x in range(tilemap.width):
            index = tilemap.get_tile(x, y)
            if index == -1:
                continue
            surface.blit(tile_surfaces[index], (x * tilemap.tile_size, y * tilemap.tile_size))
```

```python
# forge/viewport_widget.py — extending Lesson 7's version
    def _on_tick(self) -> None:
        dt = self.clock.tick(60)
        self.sprites.update(dt)
        self.surface.fill((30, 30, 40, 255))
        if self.tilemap is not None:
            render_tilemap(self.surface, self.tilemap, self.tile_surfaces)
        self.sprites.draw(self.surface)
        self.update()
```

### Code walkthrough — what's new

**`TileMap.empty(...)`, a `@staticmethod`**
Exactly Lesson 3's alternate-constructor pattern (`GameObject.from_dict`)
— a convenient way to create a brand-new, blank map of a given size,
pre-filled entirely with `-1` (empty) using `[-1] * (width * height)`,
Python's list-repetition operator. Note this is safe *specifically*
because `-1` is an immutable `int` — Lesson 3's mutable-default warning
about `[obj] * n` sharing one object across all positions applies to
*mutable* elements; a list of `int`s repeated this way has no aliasing
hazard, since integers can't be mutated in place at all.

**`render_tilemap(surface, tilemap, tile_surfaces)`**
A plain function, not a method on `TileMap` — deliberately, since drawing
requires `tile_surfaces` (actual `pygame.Surface`s, obtained via
`slice_sheet_grid`), which `TileMap` itself has no business holding
directly. This mirrors Lesson 6's `RenderSprite` boundary exactly:
`TileMap` stays plain data (serializable, no pygame dependency of its
own), while `render_tilemap` is the pygame-aware code that turns that
data into pixels — the same "data vs. rendering" split this project has
now applied to `GameObject`/`RenderSprite`, `AnimationClipData`/`hydrate`,
and now `TileMap`/`render_tilemap`, consistently.

**`if index == -1: continue`**
A `continue` statement — skips the rest of *this* loop iteration only,
moving on to the next `x` — used here to correctly leave empty cells
undrawn, rather than, say, drawing a placeholder tile `0` by mistake if
this check were omitted.

**`self.surface.fill(...)` before `render_tilemap(...)`, before `self.sprites.draw(...)`**
Draw order, exactly Lesson 17's rule, applied a second time: background
(the tilemap) drawn first, `RenderSprite`s drawn on top — a player or
enemy standing on a tile floor must visually appear *above* that floor,
which requires drawing the floor strictly earlier in the same frame.

### Why this design?
```
design_decision:
  problem: "how should a tile-based level be represented, separately from Forge's existing GameObject-per-object model?"
  available_choices:
    - "represent every tile as its own GameObject, reusing the existing model unchanged"
    - "a dedicated TileMap dataclass: a flat, row-major grid of integer tile indices plus a reference to one tileset image"
  selected_choice: "dedicated TileMap"
  reason: "a GameObject-per-tile approach would make every save file, Scene Tree listing, and undo action scale with the number of TILES rather than the number of meaningful, individually-placed objects — a fundamentally different, much larger scale of data that deserves its own compact representation"
  benefit: "a whole level's floor is one small, flat list of integers plus one tileset reference, rather than thousands of individual objects"
  cost: "TileMap is now a second, parallel way content can exist in a scene alongside GameObject, and every system that already understands GameObject (Inspector reflection, Scene Tree, selection) needs its own, separate handling for TileMap rather than getting it for free"
  future_revisit_condition: "if tiles ever need individual, per-cell behavior beyond visual appearance (a door tile that opens, for instance), that specific tile likely needs to become a real GameObject positioned on top of the tilemap, rather than trying to extend TileMap itself to carry behavior"
```

---

## 6. Trap

**Normal rule (Section 3):** `get_tile`/`set_tile` compute a flat-list
index as `y * self.width + x` — the row coordinate multiplied by the
grid's *width*.

**Apparently equivalent code** — a plausible, easy transcription mistake,
especially for anyone used to writing `(row, col)` pairs in a different
order in some other context:

```python
def get_tile(self, x: int, y: int) -> int:
    return self.tiles[x * self.height + y]   # width and height swapped!
```

**Surprising result, part one — a square map:** build and test this with
a `10×10` map (`width == height == 10`). Every lookup *succeeds* — no
crash, no `IndexError` — but every tile appears to be its own map's
mirror image, transposed across the diagonal, as if the entire level had
been reflected. If your test level happens to be symmetric (a common
placeholder pattern — a simple border of wall tiles around an open
floor), **this bug can be completely invisible**, because a
diagonally-mirrored symmetric shape looks identical to the original.

**Surprising result, part two — a non-square map:** the moment the map is
`20` wide and `10` tall (a far more typical shape for an actual level),
the same swapped formula either raises an `IndexError` for some
coordinates (since `x * height + y` can exceed the list's actual length
of `width * height` once `x` is large and `height` is small) or, for
coordinates that happen to stay in range, silently returns the **wrong
tile entirely** — a completely garbled-looking level, discovered only
once someone actually builds a realistically-shaped map instead of a
square test one.

**Exact reason:** swapping the multiplication term computes, in effect,
"as if `x` and `y` had been passed to the *correct* formula in reverse" —
`x * height + y` is exactly `get_tile`'s correct formula evaluated at the
*transposed* coordinate. For a square grid, every transposed coordinate
is still a *valid* coordinate (since rows and columns have the same
length), so the bug produces a plausible-looking, merely-mirrored result
instead of an outright crash — and a mirrored symmetric test level hides
the mistake entirely. Only a non-square grid exposes that the two axes
were never actually interchangeable to begin with.

**Project consequence:** **the strongest possible test for this class of
bug is a deliberately non-square, deliberately asymmetric map** — a
symmetric or square test case is close to the worst-case choice for
catching an axis-swap mistake, precisely because it's the one shape where
the bug can hide completely. This is a specific, concrete instance of a
more general habit worth adopting from here on: **when a bug could
plausibly involve two interchangeable-looking values (width/height, x/y,
rows/columns), test with a case where swapping them would visibly,
unambiguously produce a different, wrong answer** — not a case where the
swap happens to look the same either way.

---

## 7. Exercise

**Predict:** Given `TileMap.empty(width=5, height=3, ...)`, what is
`len(tiles)` immediately after construction, and what does
`get_tile(4, 2)` return before any `set_tile` call has been made? Compute
the exact index by hand using the formula, then check it's within
`len(tiles)`'s bounds.

**Modify:** Add a `TileMap.in_bounds(x, y) -> bool` method returning
whether `(x, y)` is a valid cell for this map's `width`/`height`, and
have `get_tile`/`set_tile` raise a clear `IndexError` with a descriptive
message (e.g. `f"({x}, {y}) is out of bounds for a {self.width}x{self.height} map"`)
when it isn't — rather than relying on Python's own list-indexing error,
which wouldn't mention the map's dimensions at all.

**Break:** Implement the swapped-formula version from Section 6 as a
*second*, deliberately broken method, `get_tile_broken`, on the same
class. Build one square, symmetric test map and one non-square,
asymmetric one. Confirm for yourself, by actually running both, that the
square/symmetric case gives no visible indication anything is wrong,
while the non-square/asymmetric case does.

**Trace:** `slice_sheet_grid`'s nested loop iterates `row` in the outer
loop and `col` in the inner loop, appending to `tiles` in that order.
Write out, for a `3`-column, `2`-row tileset, the exact order tiles are
appended in (as `(col, row)` pairs), and confirm this order is *row-major*
— matching `TileMap.tiles`'s own convention — rather than *column-major*
(all of column 0 first, then column 1, and so on).

---

## What to remember
1. A tile-based level needs a fundamentally different representation than individual `GameObject`s — a compact grid of tile indices, not thousands of separately-tracked objects.
2. Row-major flattening (`index = y * width + x`) requires multiplying the *row* coordinate by the grid's *width*, never the reverse — getting this backwards produces a transposed, not obviously-wrong result on a square grid, and an outright broken one on a non-square grid.
3. When two values are structurally similar and swappable-looking (width/height, x/y), test with a case where swapping them visibly changes the answer — a square or symmetric test case can hide exactly this class of bug.
4. `slice_sheet_grid` generalizes Lesson 5's single-row slicer to a real grid, and deliberately preserves the same row-major ordering `TileMap.tiles` uses, so a tile index means the same thing in both places without translation.
5. `TileMap`/`render_tilemap` follows the same data-vs-rendering boundary already established for `GameObject`/`RenderSprite` and `AnimationClipData`/`hydrate` — plain, serializable data, and a separate function that turns it into pixels.

## Next lesson
Lesson 19 builds the actual editor tool for this: clicking and dragging in
the Viewport to paint tiles directly onto a `TileMap`, including
converting a click's pixel position through **three** coordinate systems
in sequence (Qt widget pixels → pygame Surface pixels → tile grid
coordinates), and batching an entire paint stroke into a single, correct
undo step rather than one `QUndoCommand` per tile touched.
