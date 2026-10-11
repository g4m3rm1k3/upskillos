---
title: 10.4 — Acceptance Criteria
runtime: none
experiments: Is it done already?
teaches: acceptance criteria, Given When Then, boundary cases in requirements
uses: user stories, glossaries, units of measure, IF, comparison operators, markdown, git commit, playground
---

### The story so far

Lesson 10.3 wrote Crumb & Co.'s **backlog**, `docs/backlog.md`: five user stories, one per wish, in the client's order of priority. Each says who wants something, what, and why, in the bakery's words, and passes a 15-line linter that checks the *As …, I want …, so that …* shape. A story is a promise of a conversation about the details.

### What this lesson builds

The details. Under each story, its **acceptance criteria**: the examples that decide whether the story is done.

```text
 ### S2: Reorder warnings

 As a shop manager, I want to see which ingredients are below our reorder level, …

 - Given Riverside has 8 kg of flour and reorders at 10 kg,      the situation
   when the evening counts are in,                               what happens
   then flour says Order more.                                   what must be true after
```

Each criterion is concrete enough to check by hand today, and to turn into an automatic test in the next lesson.

## Given, when, then {#gwt}

An **acceptance criterion** is one example of the story working, in three parts:

| part | says | S1's egg criterion |
|---|---|---|
| **Given** | the situation beforehand, with real values | the brioche needs 7 eggs for 12 |
| **when** | the one thing the user does | Priya asks for 30 |
| **then** | what must be true afterwards, checkably | she needs 18 eggs, rounded up from 17.5 |

The rules that make them useful:

- **Real numbers, from the client.** "Given some flour" can't be checked; "Given 8 kg, reordering at 10 kg" can, and the numbers come from `answers.md`, not from you.
- **One behaviour each.** Two *then*s about different things are two criteria.
- **No screens, no code.** "Then flour says Order more", not "then a red `<span>` appears". The story's how is still negotiable.
- **Agreed with the client.** Criteria are written down after a conversation, and read back to the client: "So if the brioche needs 17.5 eggs, you want 18?" They're how the team and the client agree on what *done* means before any work starts.

## Criteria that find the hard cases {#hard-cases}

The easy example is never where the bugs are. For every story, look for the cases the answers made special:

| story | the easy case | the case that matters |
|---|---|---|
| S1 scaling | 1,000 g of flour × 2.5 = 2,500 g | 7 eggs × 2.5 = 17.5, which must become 18 |
| S2 warnings | Riverside's 8 kg against 10 kg | Old Town's 5,200 *grams* against 6 *kilograms* (10.2's experiment) |
| S2 warnings | well below the level | **exactly at** the level: Maya said "*below* which a shop orders more", so 10 kg against 10 kg says nothing |
| S3 import | a file with flour in grams | Riverside's file in kilograms, dated `03/02/2024`: 3 February, not 2 March |

A criterion that says nothing happens, "then butter says nothing", matters as much as one that says something: a warning on every row is as useless as none.

## Is it done already? {#experiment}

Before building anything for a story, check whether the product can already do it. Here's S2's first criterion, typed into the spreadsheet you built in Module 1. This step opens `playground/requirements/reorder.mjs`:

```javascript file=playground/requirements/reorder.mjs
import { Workbook } from "../../src/workbook.ts";

// Riverside's flour, as cells: B2 the count in kg, C2 the reorder level, D2 the warning.
const book = new Workbook();
book.set({ column: 1, row: 1 }, "8");
book.set({ column: 2, row: 1 }, "10");
book.set({ column: 3, row: 1 }, '=IF(B2<C2, "Order more", "")');
console.log(book.value({ column: 3, row: 1 }));
```

- **`import { Workbook } from "../../src/workbook.ts"`** uses the project's own engine (8.5) from the playground: `../../` goes up out of `requirements` and `playground`.
- **`{ column: 1, row: 1 }`** is B2: columns and rows are counted from 0 (6.3).
- **`=IF(B2<C2, "Order more", "")`** is the warning, written with Sprint 9's `IF`, comparison and text.

Before you run it, predict:

```predict
question: What does D2 show?
choice: Order more
choice: #NAME?
choice: Nothing
answer: Order more
explain: Everything the criterion needs exists: numbers in cells, `<`, text, and `IF`. So S2 needs no new code at all, only a sheet set up the right way. That's common: a story is a user's need, and sometimes the product already meets it. But the Old Town criterion still fails today: 5200 < 6 is FALSE. That one needs the grams decision from 10.2 built in.
verify: node playground/requirements/reorder.mjs
```

Run it: `node playground/requirements/reorder.mjs`.

```check
run "node playground/requirements/reorder.mjs" stdout="Order more" label="today's spreadsheet already gives Riverside its warning"
```

## Your turn: criteria for every story

Under each story in `docs/backlog.md`, after a blank line, add its acceptance criteria: list items of the form `- Given …, when …, then ….`, at least one per story. S1 must include the eggs; S2 must include Old Town's grams and a case where nothing is said. Use real numbers from `answers.md`. The linter must still pass. Commit.

```hints
nudge: Take each story's *I want*, and ask: what's an example of it working, with numbers from the answers? Then: what's the example most likely to go wrong?
concept: Keep each criterion to one situation, one action, one result. Use the glossary's words (reorder level, batch, makes) and its units. For the stories that aren't built yet (import, colours, phones), the criteria still say exactly what done means: a date the British way, the two brand colours, a phone width.
shape: Under `### S2: Reorder warnings` and its story: a blank line, then `- Given Riverside has 8 kg of flour and reorders at 10 kg, when the evening counts are in, then flour says Order more.`, and more lines like it.
answer: ~~~markdown
# Crumb & Co.: backlog

Release 1, in the order the client asked for. Each story is a heading, a blank line, the story, then its acceptance criteria.

### S1: Scale a recipe

As Priya, I want every ingredient worked out from how many I'm baking, so that planning the morning takes minutes instead of an hour.

- Given the brioche makes 12 with 1,000 g of flour, when Priya asks for 30, then she needs 2,500 g of flour.
- Given the brioche needs 7 eggs for 12, when Priya asks for 30, then she needs 18 eggs, rounded up from 17.5.

### S2: Reorder warnings

As a shop manager, I want to see which ingredients are below our reorder level, so that we order more before we run out.

- Given Riverside has 8 kg of flour and reorders at 10 kg, when the evening counts are in, then flour says Order more.
- Given Riverside has 12 kg of butter and reorders at 5 kg, when the evening counts are in, then butter says nothing.
- Given Old Town counted 5,200 g of flour and reorders at 6 kg, when the evening counts are in, then flour says Order more.

### S3: Import the old stock files

As Maya, I want the shops' old stock files brought in, so that nobody types four years of counts in again.

- Given Riverside's stock file for 03/02/2024 says flour 8, when it's imported, then the app has 8,000 g of flour at Riverside on 3 February 2024.

### S4: Brand colours

As Maya, I want the app in Crumb & Co.'s colours, so that it feels like ours.

- Given any page of the app, when it opens, then the background is the cream #f6efe4 and the headings are the brown #3b2a20.

### S5: Counts on a phone

As a shop manager, I want to type the evening counts on my phone, so that I don't need a computer in the shop.

- Given a phone screen 375 pixels wide, when a manager opens the stock counts, then every count can be typed without scrolling sideways.
~~~
```

```check
run "node -e \"const lines = require('fs').readFileSync('docs/backlog.md', 'utf8').split(/\\r?\\n/); const missing = []; let story = null; let found = false; for (const l of [...lines, '### end']) { if (l.startsWith('### ')) { if (story !== null && !found) missing.push(story); story = l.slice(4); found = false; } else if (/^- Given .+, when .+, then .+/i.test(l)) found = true; } if (!lines.join(' ').toLowerCase().includes('old town')) missing.push('Old Town, in S2'); console.log(missing.length === 0 ? '[every story has criteria]' : '[no criteria: ' + missing.join('; ') + ']');\"" stdout="[every story has criteria]" label="every story has at least one Given, when, then criterion, and S2 covers Old Town" -- Under each story, lines like: - Given …, when …, then …. Include Old Town's grams in S2.
run "node playground/requirements/stories.mjs docs/backlog.md" stdout=" 0 problems]" label="the stories still pass the linter" -- Keep the story itself two lines below its heading.
git-clean -- Commit it: git add docs playground, then git commit.
```
