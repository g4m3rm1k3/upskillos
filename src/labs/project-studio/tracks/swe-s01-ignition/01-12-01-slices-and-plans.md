---
title: "Slices and Plans: Specify, Explore, Decide, Then Edit"
runtime: none
---

"Add a hold piece to Blockfall." It's a one-line request, and a collaborator, a teammate or an AI agent, can start typing at once. They'll fill every gap the sentence leaves with an assumption. Which key? What's shown? Can you hold twice in a row? What does undo do to it? Do pieces even differ enough for holding to matter? Each assumption is reasonable, and some are wrong, and you discover which ones after the code exists, when changing them costs the most. This module is about directing work so that this doesn't happen: in small steps, each checked. This first lesson does everything that should come *before* an edit. You'll explore the code without touching it, write **acceptance criteria** that say what "done" means, weigh **options** and choose, and write a **plan** as small **vertical slices**. You'll make the hold piece in 01-12-02, from this plan.

**By the end you can:**

- Explore unfamiliar code read-only, and write down what you found before changing anything.
- Write acceptance criteria that are observable and checkable, including edge cases.
- Lay out options with their costs, choose one, and record why.
- Break a feature into small vertical slices, each ending in a check and a commit, and write it all as a plan someone can review.

**You need:** 01-04-05 (reading unfamiliar code), 01-08 (commits, `git grep`), 01-09-04 and 01-10-02 (Blockfall's rules, tests and history). Work inside `blockfall`.

## A one-line request

Before anything else, list what the request leaves open. Some questions a hold piece raises:

- Which key holds? Does it act once per press (01-07-01's `ONCE_PER_PRESS`)?
- What happens with an empty slot? With a full one?
- Where does a piece that comes out of the slot appear, and which way round?
- Can you hold, then hold again straight away, swapping back and forth forever?
- What does undo (`z`) do to the slot?
- How does the player see what's held?
- Is there anything to hold? What shapes are there?

```predict
question: An agent is given only "Add a hold piece to Blockfall" and starts coding at once. Which is likeliest?
choice: It asks about every open question first
choice: It picks an answer to each question itself, and some of its picks differ from what you wanted
choice: It refuses, because the request is incomplete
answer: It picks an answer to each question itself, and some of its picks differ from what you wanted
explain: A model continues the request with the likeliest implementation (01-11-01), and the likeliest answer to each open question comes from the many hold features in its training data, not from your game. Some match what you wanted and some don't, and you find out which by reading the code. The fix is to answer the questions before the code: that's what acceptance criteria are.
```

## Look before you change anything

The cheapest way to answer some of those questions is to read the code, and reading changes nothing. Explore first, read-only, and write down what you find. Inside `blockfall`:

```
git grep -n "newPiece"
git grep -n "ONCE_PER_PRESS"
git grep -n "#history"
git ls-files
```

```
game.js:14:    this.#piece = newPiece();
game.js:58:      this.#piece = newPiece();
rules.js:47:function newPiece() {
...
game.js:193:const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P", "x", "X"]);
...
game.js:53:      this.#history.push({ board: this.#board.slice(), piece: this.#piece });
...
game.js
index.html
module-test.html
rules.js
shapes.js
tests.html
tests.js
```

Then read what the lines point at (`rules.js`'s `newPiece`, `Game`'s `lockPiece` and `undo`). The facts that matter for a hold piece:

- **Every piece is a T.** `newPiece()` is the only thing that makes pieces, and it always makes a T. A piece is four frozen squares (01-04-04), with nothing recording its shape. Holding a T and getting a T back would change nothing a player could see.
- Keys go through `ACTIONS`, and the once-per-press ones are listed in `ONCE_PER_PRESS`.
- Undo's `#history` saves the board and the piece before each lock, and nothing else.
- `shapes.js` and `module-test.html` are 01-06-05's module experiment. The game doesn't load them.

Exploring also turns up things nobody asked about. `#history` saves the board but not the Rows count from 01-10-02. Check in the console on `index.html` (01-02-03): play 01-09-04's recipe that clears row 19 (Down, `x`, Up, Space, then Down, `x`, `x`, `x`, Right, Up, Space), then press `z`, and ask:

```
[game.board()[19], game.clearedCount()]
```

```
[991, 1]
```

The board is back to before the clear, and the count still says a row was cleared. That's a real bug, and it's *not* part of the hold piece. Write it down and leave it alone. Fixing it inside the hold change would mix two changes into one (01-08-01), and make both harder to review.

```check
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Exploring is read-only: blockfall should have no changes.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'x', 'x', 'x', 'ArrowRight', 'ArrowUp', ' ', 'z']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.board()[19], game.clearedCount()]; })()" [991,1] -- The bug found while exploring: undo restores the board but not the Rows count.
```

## Acceptance criteria

An **acceptance criterion** is one sentence that says what will be true when the work is done, in terms anyone can check by looking at the program from outside. Compare:

| Weak | Why | Better |
|---|---|---|
| "Hold works properly" | What would show it doesn't? | "With the slot empty, pressing c puts the falling piece in the slot, and the next piece comes in at the top" |
| "Holding is limited" | Limited how? | "Pressing c again before the piece locks does nothing" |
| "It's shown somewhere" | Where, and how would a check find it? | "The board shows 'Held: T', 'Held: I', or 'Held: -' when nothing is" |
| (nothing about what must not change) | The commonest regression is unmentioned | "Every existing test still passes, and no rule is broken after any key" |

Good criteria are **observable** (a person or a page check can see them), **specific** (one behaviour each), and **cover the edges**: the empty slot, the second press, the piece that comes back. Each one is a test you haven't written yet. In 01-12-02, every criterion becomes a check, and a criterion that can't be turned into one isn't finished.

## Options, and choosing

Exploring showed the real problem: there's nothing to hold. There are several ways forward, and each has a cost:

| Option | What it gives | Cost |
|---|---|---|
| Hold the T anyway | A working key, soon | Nothing a player can see changes: the feature has no point |
| Add a second shape first, pieces alternating | Holding means something; tests stay deterministic | One more slice before hold |
| Add several shapes, chosen at random | Closest to a real game | Randomness is a hidden input (01-09-03): every check needs a seed, and it's more to build now |
| Ask whoever asked | Their answer, not your guess | Waiting; worth it when the options change what they get |

The second is the cheapest option that makes hold worth having, and alternating pieces (T, I, T, I…) keep every test reproducible, with randomness left for later, with a seed. Write the choice down *with its reason*. A decision without a reason gets reopened by the next person who reads the code, and an agent that reads it later will follow the reason.

**Vertical slices.** Break the work into pieces that each deliver something you can see and check, end to end: input, logic, and what's drawn. A **vertical slice** is "the I piece exists and alternates with the T, and you can play it". A *horizontal* one is "all the data structures for shapes and holding", which can't be checked until the last layer exists. Vertical slices can each be tested, reviewed and committed on their own (01-08-01), and if the work stops halfway, what's done still works.

## The plan, written down

Write it all into a file in the repository: what was asked, what exploring showed, the criteria, the decisions and their reasons, the slices, and what's out of scope. Create `PLAN.md`:

```markdown file=blockfall/PLAN.md
# Plan: a hold piece

### The request

"Add a hold piece."

### What exploring the code showed

- Every piece is a T: `newPiece()` in rules.js makes one, and nothing else makes pieces. A piece is four frozen squares, with no name for its shape.
- Keys are looked up in `ACTIONS` in game.js; keys that act once per press are listed in `ONCE_PER_PRESS`.
- `Game` keeps `#history` for undo: before each lock it saves the board and the piece, and nothing else.
- `shapes.js` and `module-test.html` are 01-06-05's module experiment; the game doesn't load them.

### Acceptance criteria

1. Pieces alternate: the first is a T, the second an I (four squares in a row), then T, I, and so on.
2. With the hold slot empty, pressing c puts the falling piece in the slot, and the next piece comes in at the top.
3. With a piece held, pressing c swaps them: the held piece comes in at the top, in the orientation it starts in, and the falling piece goes into the slot.
4. Pressing c again before the piece locks does nothing.
5. The board shows what's held: "Held: T", "Held: I", or "Held: -" when nothing is.
6. Every existing test still passes, and no rule is broken after any key.

### Decisions

- A second shape comes first. With only the T, holding would swap a T for a T, and a player would see nothing change.
- Pieces alternate instead of coming at random, so that every test and check stays deterministic. Randomness can come later, with a seed.
- A held piece comes back at the top, in its starting orientation, like a new piece.

### Slices

1. A second shape: the I, and pieces alternating. Check: tests for the I and for the order, then play two pieces. Commit.
2. Holding: `Game.hold()`, the c key, once per piece, and the "Held:" text. Check: one end-to-end check for each of criteria 2 to 5. Commit.

### Out of scope

- Undoing a hold: z after a hold doesn't change what's held.

### Found while exploring (not part of this change)

- Undo after a cleared row puts the board back but not the Rows count: after clearing row 19 and pressing z, row 19 is 991 again and `clearedCount()` is still 1.
```

Save it, read it once as a stranger would, and commit it on its own, before any code:

```
git add PLAN.md
git commit -m "Plan the hold piece: criteria, decisions, two slices"
```

A written plan is the cheapest place to catch a wrong assumption: correcting a sentence costs less than correcting a feature. With an AI agent, ask for exactly this first: "explore the code without changing anything, then write a plan with acceptance criteria and slices". Read the plan, correct it, and only then let it edit. A plan in the repository also outlasts the conversation (01-11-02's memory): the next session, yours or an agent's, starts by reading it.

**What else, and why not.**

| Way to start a feature | Cost |
|---|---|
| Start coding from the request | Fastest start; assumptions surface as rework |
| A plan in your head | Nothing to write; nothing to review, and it changes without anyone noticing |
| A long design document | Thorough; slow, and goes stale as soon as the code moves |
| A short plan in the repo: criteria, decisions, slices | An hour's thought; reviewable, checkable, and read by the next session |

```check
file blockfall/PLAN.md -- Write PLAN.md in blockfall.
run "cd kit; .venv/Scripts/python -c \"import pathlib, re; t = pathlib.Path('../blockfall/PLAN.md').read_text(encoding='utf-8'); a = t.split('### Acceptance criteria')[1].split('###')[0]; print(len(re.findall(r'^\\d+\\. ', a, re.M)) >= 5, all(h in t for h in ['### Decisions', '### Slices', '### Out of scope', '### Found while exploring']))\"" stdout="True True" -- PLAN.md should have at least five numbered acceptance criteria, and sections for decisions, slices, what's out of scope and what exploring found.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:PLAN.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '', git('diff', '--stat', 'HEAD~1', '--', 'rules.js', 'game.js').stdout.strip() == '')\"" stdout="True True True" -- Commit the plan on its own, with no code changed.
```

## Your turn: plan the next feature

A second request arrives: "Show which piece is coming next." Plan it the same way, and don't change any code. Write `NEXT.md` in `blockfall`, with these sections, then commit it:

- **The request**, quoted.
- **What exploring the code showed**: at least two facts you found by reading, relevant to this feature. Assume the hold slices are done, so pieces alternate.
- **Acceptance criteria**: at least four, numbered, observable, including what must *not* change.
- **Decisions**, each with its reason.
- **Slices**: at least two, each with how it will be checked.
- **Out of scope**.

```hints
nudge: Start by exploring: where is the next piece made today, and when? If it only exists the moment it's needed, something has to know it in advance for it to be shown.
concept: Today lockPiece calls newPiece() at the moment of locking, so there's no "next" anywhere to show. Criteria should cover the first piece (before any lock), what happens after each lock, and the interactions the hold plan raised: does holding change the next piece? Does undo? The smallest visible slice is text ("Next: I"), like "Held:".
shape: Criteria such as: 1. Before any lock, the board shows "Next: I" while the T falls. 2. After each lock, "Next:" names the piece after the new one. 3. Holding doesn't change what's next. 4. Undo shows the next piece as it was before the lock it undid. 5. Every existing test still passes. Slices: Game.next() and the text, checked by criteria 1–2; then hold and undo, checked by 3–4.
answer: NEXT.md:
~~~markdown
# Plan: show the next piece

### The request

"Show which piece is coming next."

### What exploring the code showed

- `Game.lockPiece` makes the next piece only at the moment it's needed, so nothing knows the next piece in advance.
- After the hold slices, pieces alternate T, I, T, I, so the next one is always the other shape.
- `draw` writes text at the top left: "Pieces", "Rows" and "Held".

### Acceptance criteria

1. Before any lock, the board shows "Next: I" while the T falls.
2. After each lock, "Next:" names the piece that comes after the new one.
3. Holding doesn't change what's next.
4. Undo shows the next piece as it was before the lock it undid.
5. Every existing test still passes.

### Decisions

- `Game` keeps the next piece's shape, chosen when the current one comes in, so that it can be drawn.
- The preview is text, like "Held:", not a drawing of the shape: the smallest slice that shows the feature.

### Slices

1. `Game.next()` returns the coming shape, and "Next:" is drawn. Check: criteria 1 and 2 end to end. Commit.
2. Hold and undo leave the preview right. Check: criteria 3 and 4 end to end. Commit.

### Out of scope

- Drawing the next piece's squares.
~~~
Then git add NEXT.md and git commit -m "Plan the next-piece preview". The tempting slip is criteria like "the preview is correct", which no check can test, and leaving out what must not change; another is a single slice "build the preview", which can't be checked until it's all done.
```

```check
file blockfall/NEXT.md -- Write NEXT.md in blockfall.
run "cd kit; .venv/Scripts/python -c \"import pathlib, re; t = pathlib.Path('../blockfall/NEXT.md').read_text(encoding='utf-8'); a = t.split('### Acceptance criteria')[1].split('###')[0]; s = t.split('### Slices')[1].split('###')[0]; print(len(re.findall(r'^\\d+\\. ', a, re.M)) >= 4, len(re.findall(r'^\\d+\\. ', s, re.M)) >= 2, 'Check' in s, all(h in t for h in ['### The request', '### What exploring', '### Decisions', '### Out of scope']))\"" stdout="True True True True" -- NEXT.md should have at least four numbered criteria, two or more slices each with a check, and the other sections.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:NEXT.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit NEXT.md, with nothing else changed.
```

**What these checks establish, and what they don't.** They check the shape of the work: nothing was changed while exploring, the bug you found is real, and the plans have numbered criteria, decisions, slices with checks, and what's out of scope, committed before any code. They can't check the plans' quality: whether a criterion is really observable, whether a decision's reason holds, or whether a slice is small enough. A plan passes these checks with vague criteria, which is exactly the failure this lesson is about. The test of a plan comes in 01-12-02, when each criterion has to become a check. Any that can't was never finished.

## What you can do now

- A short request leaves gaps; a collaborator fills them with **assumptions**. Find the gaps before the code.
- **Explore read-only** first (`git grep`, reading, the console), write down what you find, and keep unrelated discoveries out of the change.
- **Acceptance criteria** are observable, specific, and cover edges and what must not change; each is a test not yet written.
- Lay out **options** with costs, **choose**, and record the **reason**.
- Plan in **vertical slices**, each ending in a check and a commit, and write the **plan** in the repository, reviewed before any edit.

```predict
question: You ask an agent to plan a change, and its plan has one slice: "Implement the feature and add tests". What would you ask it to change, and why?
explain: Ask it to split the work into vertical slices that each end in something checkable, for example "the data model with its unit tests" only if a user can see it working, otherwise "the smallest visible behaviour end to end, with its check", then the next. One slice can only be checked at the very end, so a wrong assumption surfaces after all the work is done, and the diff is one large review (01-08-02). Also ask for acceptance criteria per slice, so that each check is decided before the code that must pass it.
```

**Next:** 01-12-02 builds the hold piece from `PLAN.md`, slice by slice: each one test first where it can be, checked against its criteria, committed, and reviewed before the next. It also covers what to do when a collaborator says "done".
