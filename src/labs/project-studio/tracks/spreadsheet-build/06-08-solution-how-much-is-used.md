---
title: 6.8 — Solution: How Much of the Sheet Is Used?
runtime: none
experiments: Why it's fast
teaches: bounding boxes, iterating maps
uses: classes, maps, sparse storage, addresses, tests
---

One solution to the challenge, and why it's fast. **If yours passed, keep it**: compare as you read. In `src/sheet.ts`, the import gains `parseAddress`, and the class gains one method:

```typescript
import { formatAddress, parseAddress, type Address } from "./address.ts";
```

```typescript
  used(): { from: Address; to: Address } | null {
    let from: Address | null = null;
    let to: Address | null = null;
    for (const key of this.cells.keys()) {
      const address = parseAddress(key);
      if (address === null) {
        continue;
      }
      if (from === null || to === null) {
        from = address;
        to = address;
      } else {
        from = { column: Math.min(from.column, address.column), row: Math.min(from.row, address.row) };
        to = { column: Math.max(to.column, address.column), row: Math.max(to.row, address.row) };
      }
    }
    if (from === null || to === null) {
      return null;
    }
    return { from, to };
  }
```

## How it works {#how}

- **`from` and `to` start as `null`**: before any cell is seen, there's no rectangle. Their type, `Address | null`, says so, and TypeScript makes every use of them check first.
- **`for (const key of this.cells.keys())`** visits each stored cell once. The keys are text, `"B3"`, so **`parseAddress`** turns each back into an `Address`. It can't fail for a key the sheet wrote itself, but its type says it might return `null`, and `continue` (skip to the next pass of the loop) deals with that honestly instead of pretending.
- **The first cell is the whole rectangle**: `from` and `to` are both that cell.
- **Every later cell stretches it**: `from` takes the smaller column and the smaller row, `to` the larger of each. `Math.min` and `Math.max` give the smaller and larger of two numbers.
- **After the loop**, an empty sheet still has `from === null`, so the answer is `null`; otherwise `{ from, to }`.

The "shrinks" test passes with no extra code: `set` deletes an emptied cell from the map (lesson 6.4), so the loop never sees it.

## Why it's fast

The loop runs once **per stored cell**, not per position on the sheet. That's sparse storage (lesson 6.4) paying off. Predict how much work the other way would be:

```predict
question: A version that checked every position from A1 to the far cell (column 18,277, row 999,999 counted from 0) would check how many positions?
answer: 18278000000
explain: 18,278 columns times 1,000,000 rows: eighteen billion checks, minutes of a frozen page, to find two cells. The loop over stored cells does two passes. How long code takes as its input grows is called its **complexity**; Module 12 measures it properly.
verify: node -e "console.log(18278 * 1000000)"
```

Run the far-apart test on its own and look at its time in Vitest's report: well under a millisecond.

## Your turn: a bounding box for anything

The same idea, outside the sheet. In `playground/js/box.mjs`, export `boundingBox(points)`: given an array of points like `{ x: 3, y: 1 }`, return `{ minX, minY, maxX, maxY }`, the smallest box holding them all, or `null` for an empty array. Test it in `playground/js/box.check.mjs` (Node's test runner), including the empty array and points with negative coordinates. Commit.

```check
run "node --test playground/js/box.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/box.mjs').then((m) => console.log(JSON.stringify([m.boundingBox([]), m.boundingBox([{ x: 3, y: 1 }]), m.boundingBox([{ x: 3, y: 1 }, { x: -2, y: 5 }, { x: 0, y: -4 }])])))\"" stdout="[null,{\"minX\":3,\"minY\":1,\"maxX\":3,\"maxY\":1},{\"minX\":-2,\"minY\":-4,\"maxX\":3,\"maxY\":5}]" label="boundingBox is right for none, one and three points" -- Start from the first point, not from 0: a box starting at 0 is wrong for negative points.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/box.check.mjs $d; Set-Content (Join-Path $d 'box.mjs') 'export function boundingBox(p) { if (p.length === 0) { return null; } let b = { minX: 0, minY: 0, maxX: 0, maxY: 0 }; for (const q of p) { b = { minX: Math.min(b.minX, q.x), minY: Math.min(b.minY, q.y), maxX: Math.max(b.maxX, q.x), maxY: Math.max(b.maxY, q.y) }; } return b; }'; node --test (Join-Path $d 'box.check.mjs')" exit=1 label="your tests catch a box that starts at 0" -- Test points that are all away from 0, or all negative.
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: It's `used()` with x and y instead of columns and rows.
concept: The trap is the starting value. Starting the box at 0 makes a box that always includes the point (0, 0), which is wrong for points like (3, 1). Starting from the first point, as `used()` does, is always right.
shape: Return `null` for no points; start the box at the first point; stretch it with `Math.min` and `Math.max` for each point after.
answer: ~~~javascript
export function boundingBox(points) {
  if (points.length === 0) {
    return null;
  }
  let box = { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y };
  for (const p of points) {
    box = {
      minX: Math.min(box.minX, p.x),
      minY: Math.min(box.minY, p.y),
      maxX: Math.max(box.maxX, p.x),
      maxY: Math.max(box.maxY, p.y),
    };
  }
  return box;
}
~~~
```
