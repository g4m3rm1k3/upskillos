---
title: 11.7 — Challenge: Moving Like Excel
runtime: none
teaches: keyboard interaction, default actions
uses: react, components, props, state, controlled inputs, keys that reset state, lifting state, component tests, testing library, jsdom, acceptance tests, definition of done, xss, tests, test-driven development, working from a brief, git merge, git push
---

### The story so far

Sprint 11 moved the spreadsheet's page to React. Lessons 11.1 to 11.4 learned the ideas on an order list: describing the page from state, re-rendering when state changes, controlled inputs, state kept where it's used, effects. 11.5 rebuilt the grid as components, and 11.6 the formula bar, the name box, the status line and the tracing marks, with tests that use the page the way a person does. All of it is on the `react` branch.

## The brief

> **From Priya, after trying the new version:** "In Excel I press Tab to go to the next column, and the arrows to go up and down. If I've typed in the wrong cell, Escape. Here I have to click every single cell, and I do a hundred a morning."
>
> **The feature:** in the formula bar,
>
> - **Tab** saves the draft and moves right; **Enter** and **↓** save it and move down; **↑** saves it and moves up.
> - **Escape** throws the draft away: the bar shows what the cell holds, and nothing is saved.
> - The selection **never leaves the sheet**: ↑ in row 1, or Tab in the last column, saves and stays put.
> - ← and → keep their usual job in a text box: moving the cursor within the draft.
>
> **Security:** whatever is typed and saved shows on the page as the text typed, never as HTML. React already makes sure of this; one of the tests proves it stays true.
>
> **Delivery:** with the supplied tests passing and nothing else broken, merged into `main`, pushed, and the `react` branch deleted. The production build must still work: `npm run build`.

The tests are supplied: click **Create provided src/ui/keyboard.test.tsx**:

```tsx file=src/ui/keyboard.test.tsx provided
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Workbook } from "../workbook.ts";
import { App } from "./App.tsx";

afterEach(cleanup);

// The bar is looked up every time: moving to another cell gives it a new key, so React replaces it.
function setup(book = new Workbook()) {
  render(<App book={book} columns={3} rows={3} />);
  return {
    book,
    bar: () => screen.getByLabelText("Formula"),
    selected: () => screen.getByLabelText("Selected cell").textContent,
    type: (text: string, key: string) => {
      fireEvent.change(screen.getByLabelText("Formula"), { target: { value: text } });
      fireEvent.keyDown(screen.getByLabelText("Formula"), { key });
    },
  };
}

describe("moving with the keyboard", () => {
  it("saves and moves right on Tab", () => {
    const { book, selected, type } = setup();
    type("5", "Tab");
    expect(book.text({ column: 0, row: 0 })).toBe("5");
    expect(selected()).toBe("B1");
  });

  it("saves and moves down on the down arrow, and up on the up arrow", () => {
    const { book, selected, type } = setup();
    type("1", "ArrowDown");
    type("2", "ArrowDown");
    expect(selected()).toBe("A3");
    type("3", "ArrowUp");
    expect(selected()).toBe("A2");
    expect(book.text({ column: 0, row: 2 })).toBe("3");
  });

  it("puts back what the cell held on Escape, without saving", () => {
    const book = new Workbook();
    book.set({ column: 0, row: 0 }, "7");
    const { bar, type } = setup(book);
    type("8", "Escape");
    expect(bar()).toHaveProperty("value", "7");
    expect(book.text({ column: 0, row: 0 })).toBe("7");
  });

  it("never moves the selection off the sheet", () => {
    const { selected, type } = setup();
    type("", "ArrowUp");
    expect(selected()).toBe("A1");
    type("", "Tab");
    type("", "Tab");
    type("", "Tab");
    expect(selected()).toBe("C1");
  });

  it("shows text typed as HTML as text, never as HTML", () => {
    const { type } = setup();
    type('<img src="x" onerror="alert(1)">', "Enter");
    expect(document.querySelector("tbody td")?.textContent).toBe('<img src="x" onerror="alert(1)">');
    expect(document.querySelector("tbody img")).toBeNull();
  });
});
```

`setup` renders a 3 × 3 sheet and returns small helpers. The bar is looked up afresh each time, because moving to another cell gives it a new key (11.6), so React replaces it.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| saves and moves right on Tab | Tab | the browser's own Tab, which moves the focus out of the bar to the next thing on the page, and saves nothing |
| saves and moves down on the down arrow, and up on the up arrow | the arrows, both ways | ↑ moving down, or an arrow moving without saving what was typed |
| puts back what the cell held on Escape, without saving | Escape | Escape saving the draft, or clearing the bar instead of restoring the cell's text |
| never moves the selection off the sheet | the edges | ↑ from A1 selecting row 0, which the name box would show as `A0`, with no cell outlined |
| shows text typed as HTML as text, never as HTML | the page's safety (3.5's cross-site scripting) | a cell that, given `<img src="x" onerror="alert(1)">`, runs the `onerror` code |

## How a professional would go about it

Read the tests, then decide **where each piece belongs**. The bar knows which key was pressed and what the draft is. The app knows the selection, the workbook and the sheet's size. So the bar can turn a key into a *move*, "one column right", "one row up", and hand it to the app along with the draft; the app saves, and moves, staying inside the sheet. Keys that move can share one code path, a small table from key to move, rather than a branch each.

Two browser details. Tab already does something: it moves the focus to the next control on the page. `event.preventDefault()` stops a browser's own action for an event. And Escape needs nothing from the app: the bar already has `text`, the cell's contents.

For the edges, a number kept between a lowest and a highest value is **clamped**: `Math.min(Math.max(value, low), high)`.

## Your turn: build it to the brief

Build it on `react`, test first. Then merge into `main`, push, and delete the branch:

```powershell
git add src
git commit -m "Moving like Excel: Tab, arrows and Escape"
git switch main
git merge react
git push
git branch -d react
```

```hints
nudge: Start with Tab: make the first test pass, then the arrows. Change `onSave` so it carries a move as well as the text.
concept: In `FormulaBar`, a `Record<string, { columns: number; rows: number }>` from key names to moves: `Tab` is `{ columns: 1, rows: 0 }`, `ArrowUp` is `{ columns: 0, rows: -1 }`. If the key has a move, `preventDefault()` and `onSave(draft, move)`; if it's Escape, `setDraft(text)`. In `App`, `save(text, move)` sets the cell, then selects the cell `move` away, each coordinate clamped between 0 and the sheet's size minus 1.
shape: `onSave: (text: string, move: { columns: number; rows: number }) => void` in `FormulaBarProps`; a `keyDown(event)` function in `FormulaBar`; `Math.min(Math.max(selected.column + move.columns, 0), columns - 1)` in `App`.
answer: Lesson 11.8 goes through one solution, piece by piece.
```

```check
run "npx vitest run src/ui/keyboard.test" stdout="5 passed" label="the five keyboard tests pass, the HTML one included" -- Turn each key into a move in FormulaBar; save and move, clamped, in App.
run "npx vitest run" stdout="114 passed | 4 todo" label="all 114 tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const bar = () => document.querySelector('#formula-bar'); const press = async (text, key) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(bar(), text); bar().dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); bar().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); await new Promise((r) => setTimeout(r, 50)); }; await press('5', 'Tab'); await press('=A1*2', 'ArrowDown'); await press('typo', 'Escape'); const name = document.querySelector('#name-box').textContent; const tds = document.querySelectorAll('tbody td'); return [name, tds[0].textContent, tds[1].textContent, bar().value, document.activeElement === bar()].join('|'); })()" "B2|5|10||true" server=vite errors=none label="in a real browser: Tab and the down arrow save and move, Escape throws a typo away, and the bar keeps the focus" -- preventDefault for Tab, so the focus stays in the bar.
run "npm run build" label="the production build works"
git-branch main
git-no-branch react -- After merging, delete the branch.
git-pushed
git-clean
```

## Sprint 11 is done

The spreadsheet's page is React now, and the engine never noticed. Instead of finding and changing the right parts of the page after every event, each component describes its part from the state, and React works out what changed. You've met the ideas every React codebase is built on: components and props, state and re-rendering, immutable updates, controlled inputs, state kept where it's used and lifted where it's shared, effects and refs, keys as identity, and component tests that use the page as a person would. Lesson 11.8 goes through one solution, and writes a hook of your own.
