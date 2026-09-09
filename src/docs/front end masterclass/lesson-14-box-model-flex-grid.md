# Lesson 14 — The Box Model, and Flexbox/Grid

## What you'll learn
- The box model — what `width`/`height` actually measure, and where padding/border/margin fit around that
- `box-sizing: border-box` — the single line that fixes the most common CSS sizing confusion
- Flexbox — one-dimensional layout (a row or a column of boxes that need to align/distribute/wrap)
- Grid — two-dimensional layout (rows AND columns at once)

## What you'll build
A small card layout (like a row of product cards) — built once with Flexbox,
then rebuilt with Grid, so you feel the difference directly.

## The question
When you write `width: 200px` on a `<div>` with `padding: 20px` and
`border: 2px solid black`, is the element actually 200px wide on screen, or
something else?

## 1. Predict

Add up the numbers before testing: `width: 200px`, `padding: 20px` on all
four sides, `border: 2px solid black` on all four sides. Predict the box's
total rendered width.

## 2. Try it

```html
<div style="width: 200px; padding: 20px; border: 2px solid black;">
  Box
</div>
```

### What this code does

**`width: 200px`**
- By default (the `content-box` model), `width` sets the size of only the
  **content area** — not including padding or border. This is CSS's
  original, historical default, and it's the reason the Predict question
  has a non-obvious answer.

**`padding: 20px`**
- Adds 20px of space **inside** the border, on all four sides, around the
  content. Padding is added **on top of** the content width, not counted
  within it, under the default box model.

**`border: 2px solid black`**
- Adds a 2px visible edge **outside** the padding. Also added on top of
  width, not counted within it, by default.

**Total rendered width, default box model**: `200 (content) + 20 + 20
(left+right padding) + 2 + 2 (left+right border) = 244px` — not 200px. This
is almost never what a beginner expects, and it's the single most common
source of "why doesn't my layout add up" confusion in CSS.

## 3. Why — `box-sizing: border-box`

```css
* {
  box-sizing: border-box;
}
```

**`box-sizing: border-box`**
- Changes what `width` measures: now `width` includes padding and border
  *within* it, rather than adding them on top. With this rule, the same
  `div` from above renders at exactly `200px` total — padding and border
  eat into the content area instead of expanding the box.
- **`*` selector** — applies to every element on the page. Setting
  `box-sizing: border-box` globally, near the top of your stylesheet, is
  such a common, low-risk fix that it's standard practice in nearly every
  real project — worth adopting as a default habit from here on, in every
  project in this series going forward.

### Mental model

```
content-box (default):     border-box (recommended):
width = content only       width = content + padding + border
[content][pad][border]     [——————— width ———————]
        ↑ adds to total    [content][pad][border] ← fits inside width
```

## 4. Change one thing

```diff
 <style>
+  * { box-sizing: border-box; }
 </style>
 <div style="width: 200px; padding: 20px; border: 2px solid black;">
   Box
 </div>
```

**What changed:** one global rule.
**What did not change:** the `div`'s own `width`/`padding`/`border` values.
**Predict, then verify**: the box now renders at exactly 200px total, with
the *content area itself* shrinking to `200 - 40 - 4 = 156px` to make room
for padding and border inside the same fixed 200px.

## 5. Put it in the project — Flexbox

```html
<div class="card-row">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

```css
* { box-sizing: border-box; }

.card-row {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: stretch;
}

.card {
  flex: 1;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
```

**`display: flex`**
- Turns `.card-row` into a **flex container** — every *direct* child
  (`.card`) becomes a **flex item**, laid out along one axis (a row, by
  default) instead of each stacking on its own line the way plain `<div>`s
  normally do.

**`gap: 16px`**
- Adds consistent spacing **between** flex items, without needing margin on
  each individual card (and without the classic "extra margin on the last
  item" problem margin-based spacing used to require workarounds for).

**`justify-content: space-between`**
- Controls alignment along the **main axis** (horizontal, for a default
  row). `space-between` pushes the first item to the start, the last to the
  end, and distributes remaining space evenly between the others.

**`align-items: stretch`** (the default, shown explicitly here)
- Controls alignment along the **cross axis** (vertical, for a default
  row). `stretch` makes every card the same height — the height of the
  tallest card's content — even though none of them have an explicit
  `height` set.

**`flex: 1`** (on `.card`)
- Shorthand telling each card to **grow and shrink equally**, sharing
  available space evenly among however many cards exist — add a fourth
  card, and all four automatically become narrower, without you touching
  any width value directly.

## Grid — the same layout, a different tool

```css
.card-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

**`display: grid`**
- Turns `.card-row` into a **grid container** — but unlike flex, grid
  thinks in terms of an explicit row/column structure you define upfront,
  not just "items flowing along one axis."

**`grid-template-columns: repeat(3, 1fr)`**
- Defines exactly 3 columns, each `1fr` ("one fraction unit" — divide
  available space into equal shares). `repeat(3, 1fr)` is shorthand for
  `1fr 1fr 1fr`.
- **When would you reach for Grid instead of Flex?** Flexbox is naturally
  suited to *one* dimension at a time (a row, or a column) with items that
  can wrap and reflow; Grid is naturally suited to a genuine two-dimensional
  layout (rows *and* columns intentionally aligned together, e.g. a photo
  gallery or dashboard where things need to line up both across and down).
  For a single row of cards like this one, either works nearly identically
  — this example is deliberately simple so the *syntax difference* is
  visible without the *use case* difference muddying it.

## 6. Trap

Predict, then test: remove `flex: 1` from `.card`, but leave everything
else. What happens to each card's width?

Without `flex: 1` (or any `flex`/`width` value), each flex item defaults to
however wide its own content naturally makes it — cards with different text
lengths end up visibly different widths, and `justify-content:
space-between` still works, but now distributes *uneven* leftover space
around uneven-sized boxes rather than three equal columns. **The trap: flex
items don't automatically become equal-width just because they're in a flex
container** — `flex: 1` (or an equivalent width rule) is what actually
causes equal sharing; `display: flex` alone only establishes the axis and
alignment behavior.

## 7. Exercise

- **Predict:** What does `justify-content: center` do differently from
  `space-between` in the card row?
- **Modify:** Change `grid-template-columns: repeat(3, 1fr)` to
  `1fr 2fr 1fr` — predict which card becomes widest before testing.
- **Break:** Remove `box-sizing: border-box` from just this page and add
  visible padding/border back to `.card` — does the row still fit as
  cleanly, or does it overflow?

## What to remember
- `width` measures content-only by default; `box-sizing: border-box` makes
  it measure total size instead — set this globally as a habit.
- Flexbox: one axis, items that grow/shrink/wrap; `flex: 1` for equal
  sharing, `justify-content`/`align-items` for alignment along each axis.
- Grid: explicit rows and columns at once, `fr` units for proportional
  sharing — reach for it when things need to align in two dimensions
  together, not just flow along one.

## Next lesson
Lesson 15 puts these boxes in motion — `transition` and cubic-bezier easing
curves, where "math applied to CSS" starts for real.
