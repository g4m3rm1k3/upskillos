---
title: 10.3 — User Stories
runtime: none
experiments: A linter for stories
teaches: user stories, INVEST, splitting stories, linters
uses: client briefs, requirements, glossaries, regular expressions, flatMap, nullish coalescing, template literals, markdown, git commit, playground
---

### The story so far

Lessons 10.1 and 10.2 turned Crumb & Co.'s vague brief into something firmer: your questions, the client's answers (eggs round up; Riverside counts in kilograms, Old Town in grams; the wholesale orders are out of this release; recipes matter most), and a glossary that fixes what each bakery word means in the app, with every amount kept in grams inside it.

### What this lesson builds

The **backlog**: the list of everything the client wants, written as **user stories**, in the order they want it. It's the document the rest of the release is planned and built from.

```text
 docs/backlog.md

 ### S1: Scale a recipe
                                    who wants it
 As Priya, I want every ingredient worked out from how many I'm baking,
                  └───────────────── what they want ─────────────────┘
 so that planning the morning takes minutes instead of an hour.
         └────────────────── why ──────────────────────────────┘
```

And in the playground, a 15-line program that checks the stories' shape: a **linter**.

## What a story is {#stories}

A **user story** is one thing a user wants, in one sentence of three parts:

| part | says | why it's there |
|---|---|---|
| **As** Priya | who wants it | a feature for *someone*: Priya's needs aren't a shop manager's |
| **I want** every ingredient worked out | what they want to be able to do | in the user's words, not the code's: no "database", no "API" |
| **so that** planning takes minutes | why it matters to them | the reason decides what "done" looks like, and what to build first |

A story isn't a specification. It's small enough to fit on a card, and it's a promise to have a conversation about the details, which is what the next lesson's acceptance criteria record.

Good stories have six properties, remembered as **INVEST**:

| letter | means | a story that fails it |
|---|---|---|
| **I**ndependent | can be built in any order | "As Priya, I want the second half of the recipe screen…" |
| **N**egotiable | the details can still be discussed | one that dictates the exact screen layout |
| **V**aluable | someone outside the team would care | "As a developer, I want a database…" |
| **E**stimable | the team can guess its size | "As Maya, I want it all to be easy" |
| **S**mall | fits in a few days | "As Maya, I want the old files brought in" (all forty of them) |
| **T**estable | there's a way to tell it's done | "…so that it feels nice" |

## Some stories to check {#examples}

Here are four stories, some good and some not. Click **Create provided playground/requirements/examples.md**:

```markdown file=playground/requirements/examples.md provided
# Some stories to check

### Mornings

As Priya, I want recipes to scale and warnings when stock is low, so that mornings take less time.

### Phones

The app should work on phones.

### Database

As a user, I want a database, so that it is better.

### Reorder warnings

As a shop manager, I want to see which ingredients are below their reorder level, so that we order more before we run out.
```

Each story is a `### ` heading, a blank line, then the story. Before the linter in the next step, decide which you'd send back, and why.

```check
file playground/requirements/examples.md
```

## A linter for stories {#linter}

A **linter** is a program that checks text, usually code, for problems of *shape*, without running it. This one checks that every story is written as a story, and that it asks for one thing. This step opens `playground/requirements/stories.mjs`:

```javascript file=playground/requirements/stories.mjs
import { readFileSync } from "node:fs";

const shape = /^As (.+?), I want (.+?), so that (.+)\.$/;
const lines = readFileSync(process.argv[2], "utf8").split(/\r?\n/);
const headings = lines.flatMap((line, i) => (line.startsWith("### ") ? [i] : []));
let problems = 0;
for (const i of headings) {
  const story = shape.exec(lines[i + 2] ?? "");
  const problem = story === null ? "not written as a story" : story[2].includes(" and ") ? "two stories in one" : null;
  if (problem !== null) {
    console.log(`${lines[i]}: ${problem}`);
    problems++;
  }
}
console.log(`[${headings.length} stories, ${problems} problems]`);
```

**What it reads, and what it prints:**

| | what it is | example |
|---|---|---|
| input | a Markdown file, named on the command line (`process.argv[2]`, lesson 8.1) | `playground/requirements/examples.md` |
| prints | one line per story with a problem, then a count | `### Phones: not written as a story` |

- **`shape`** is a regular expression for the three parts. Each `(.+?)` captures one part, so `story[2]` is the *I want* part. `\.$` insists on a full stop at the very end.
- **`flatMap`** (9.2) turns each line into either `[i]`, its position, if it's a heading, or `[]`: the result is the position of every heading.
- **`lines[i + 2] ?? ""`**: the story is two lines below its heading. `??` gives `""` if the file ends first, which simply fails the shape.
- **`" and "`** in the *I want* part usually means two stories glued together.

Before you run it, predict:

```predict
question: Does the linter flag the *Database* story?
choice: Yes
choice: No
answer: No
explain: "As a user, I want a database, so that it is better." has all three parts, a full stop, and no "and". It's still a bad story: "a user" could be anyone, nobody outside the team wants a database, and "better" can't be tested. A linter checks shape, never value. That's true of every linter, including the ones for code.
verify: node -e "console.log(new RegExp('^As (.+?), I want (.+?), so that (.+)[.]' + String.fromCharCode(36)).test('As a user, I want a database, so that it is better.') ? 'No' : 'Yes')"
```

Run it: `node playground/requirements/stories.mjs playground/requirements/examples.md`.

```text
### Mornings: two stories in one
### Phones: not written as a story
[4 stories, 2 problems]
```

| story | linter | the story's real problem |
|---|---|---|
| Mornings | two stories in one | scaling and warnings are separate stories, built and delivered separately |
| Phones | not written as a story | who wants it, and why? A manager entering counts and Priya reading recipes need different things |
| Database | passes | not valuable to anyone outside the team, and not testable |
| Reorder warnings | passes | none: who, what and why, one thing, testable |

```check
run "node playground/requirements/stories.mjs playground/requirements/examples.md" stdout="[4 stories, 2 problems]" label="the linter finds two of the four problems"
```

## Splitting stories {#splitting}

"Our old files brought over" is too big for one story: forty files, two units, three shops. Big stories are split, and **how** matters:

| split | example | good? |
|---|---|---|
| by layer | "the database part", "the screen part" | **no**: neither is useful to anyone on its own, so neither can be shown to the client |
| by case | Riverside's files (kilograms) first, then Old Town's (grams) | yes: each is a working import someone can use |
| by happy path first | files with good data first; files with mistakes in them next | yes: the common case ships sooner |
| by what's needed now | this year's stock counts first, four years of history later | yes, and ask: is the history needed at all? |

The good splits are **vertical**: each slice goes all the way through the app, so it can be shown, tested and used.

## Your turn: the backlog

Write `docs/backlog.md`: at least five stories covering the client's wishes, in the order the client asked for (10.2's *Priorities and dates*). Each is a `### ` heading with an id and a short name (`### S1: Scale a recipe`), a blank line, then the story. Use the glossary's words. Then run the linter on it until it reports no problems, and commit.

```hints
nudge: One story per wish in the brief, at least, ordered by the answers' priorities: recipes first, then reorder warnings, then the old files, then colours and phones.
concept: Pick the *who* carefully: Priya scales recipes, a shop manager enters counts and sees warnings, Maya wants the old files and the colours. Keep each *I want* to one thing, with no "and": "every ingredient worked out from how many I'm baking" rather than "to type a number and see the ingredients".
shape: A `# Crumb & Co.: backlog` title, a sentence about the order, then `### S1: Scale a recipe`, a blank line, `As Priya, I want …, so that ….`, and so on to S5.
answer: ~~~markdown
# Crumb & Co.: backlog

Release 1, in the order the client asked for. Each story is a heading, a blank line, then the story.

### S1: Scale a recipe

As Priya, I want every ingredient worked out from how many I'm baking, so that planning the morning takes minutes instead of an hour.

### S2: Reorder warnings

As a shop manager, I want to see which ingredients are below our reorder level, so that we order more before we run out.

### S3: Import the old stock files

As Maya, I want the shops' old stock files brought in, so that nobody types four years of counts in again.

### S4: Brand colours

As Maya, I want the app in Crumb & Co.'s colours, so that it feels like ours.

### S5: Counts on a phone

As a shop manager, I want to type the evening counts on my phone, so that I don't need a computer in the shop.
~~~
```

```check
run "node playground/requirements/stories.mjs docs/backlog.md" stdout=" 0 problems]" label="every story in the backlog passes the linter" -- Each story: a ### heading, a blank line, then As …, I want …, so that …. ending in a full stop, with no "and" in what's wanted.
run "node -e \"const t = require('fs').readFileSync('docs/backlog.md', 'utf8').split(/\\r?\\n/); const n = t.filter((l) => l.startsWith('### ')).length; console.log(n >= 5 ? '[enough]' : '[' + n + ' stories]')\"" stdout="[enough]" label="at least five stories" -- One ### heading per story.
git-clean -- Commit it: git add docs playground, then git commit.
```
