---
title: 10.2 — Answers, and the Words They Use
runtime: none
experiments: Same word, different units
teaches: glossaries, units of measure, normalising at the edges
uses: client briefs, requirements, questions for a client, destructuring, for of loops, reduce, markdown, git commit, playground
---

### The story so far

Lesson 10.1 brought the first client, Crumb & Co., a bakery with three shops. Their brief (`docs/crumb/brief.md`) lists five wishes and a deadline, and almost every word in it could mean two things. You wrote `docs/crumb/questions.md`: what to ask before building anything, including the question the scaling experiment found, what to do with 17.5 eggs.

### What this lesson builds

The client's answers arrive, and with them the bakery's own words. This lesson adds two files:

```text
 docs/crumb/
 ├── brief.md
 ├── questions.md
 ├── answers.md      notes from the call with Maya, Priya and Dev (supplied)
 └── glossary.md     every bakery word, and exactly what it means in the app (you write it)
```

## The answers {#answers}

These are notes from a call. Click **Create provided docs/crumb/answers.md** and read them alongside your questions:

```markdown file=docs/crumb/answers.md provided
# Crumb & Co.: answers to your questions

*Notes from a call with Maya (owner), Priya (head baker) and Dev (Riverside manager).*

### Recipes and batches

- Every recipe is written for the batch it's tested at: the brioche makes 12, the sourdough 20, the croissants 48. Priya types how many she wants, and everything scales in proportion.
- **Eggs are whole.** If a batch needs 17.5 eggs, Priya uses 18. "Never round down on eggs, the dough comes out dry."
- Flour, butter, sugar and the rest are weighed in grams, and Priya is happy with whole grams.
- Butter comes in 250 g blocks, flour in 16 kg sacks. Ordering is in whole blocks and sacks.
- Recipes change about once a month, and only Priya changes them.

### Stock

- Each shop counts its stock every evening and types the counts into its own file.
- **Riverside counts flour in kilograms; Old Town counts it in grams.** "We've always done it that way."
- A *reorder level* is the amount below which a shop orders more. It's different for each ingredient and each shop: Riverside reorders flour at 10 kg, Old Town at 6 kg.
- The Station kiosk doesn't bake. It sells what the other two send, so it has no flour or butter, only boxes and cups.

### The old files

- About 40 Excel files. They can all be saved as CSV.
- Dates are written the British way, `DD/MM/YYYY`.
- The wholesale orders are a mess: the cafés' names are spelt several ways.

### Looks and phones

- Brand colours: a dark brown, `#3b2a20`, and a cream, `#f6efe4`. There's a logo.
- The managers use their phones to type in the evening counts. Priya works on a laptop in the bakery office.

### Priorities and dates

- **Most important:** Priya's morning hour. If only one thing is ready, it's the recipes.
- Then the reorder warnings, then the old files.
- The colours "would be lovely, but don't let them hold anything up".
- The wholesale orders aren't part of this release. "Let's get the shops right first."
- The Christmas rush starts on 1 December.
```

```check
file docs/crumb/answers.md
```

## Comparing {#compare}

Go through your `questions.md` and, for each question, find its answer. Three things usually come out of this:

| what you find | example here | what it tells you |
|---|---|---|
| answers to questions you asked | eggs are rounded up; recipes change once a month | the brief really was missing these |
| answers to questions you **didn't** ask | the Station kiosk doesn't bake; Riverside and Old Town count flour in different units | the questions that matter most are often ones only the client could think of, which is why calls beat emails |
| questions still unanswered | what if two people change a recipe at once? | they go on the list for the next call |

Notice **"the wholesale orders aren't part of this release"**. A thing that's explicitly *out* is as useful as a thing that's in: it's work you won't do, and a conversation you won't have at the demo.

## Same word, different units {#experiment}

"Riverside counts flour in kilograms; Old Town counts it in grams." It sounds like a detail. Here's what it does to the second wish, the reorder warning. This step opens `playground/requirements/flour.mjs`:

```javascript file=playground/requirements/flour.mjs
const counts = [
  { shop: "Riverside", flour: 8, reorderAt: 10 },
  { shop: "Old Town", flour: 5200, reorderAt: 6 },
];

for (const { shop, flour, reorderAt } of counts) {
  console.log(shop, flour < reorderAt ? "order more" : "fine");
}
console.log("total flour:", counts.reduce((sum, count) => sum + count.flour, 0));
```

Each shop's numbers are exactly what it would type: Riverside's 8 means 8 kg; Old Town's 5200 means 5,200 g, which is 5.2 kg. Both reorder levels are as Maya said them, 10 kg and 6 kg.

- **`for (const { shop, flour, reorderAt } of counts)`** destructures each object (lesson 6.3) as the loop takes it.
- **`reduce`** (9.2) adds up the flour.

Before you run it, predict:

```predict
question: Does the check tell Old Town to order more flour?
choice: Yes
choice: No
answer: No
explain: It compares 5200 with 6, and 5200 isn't less than 6. But 5,200 g is 5.2 kg, which *is* less than 6 kg: Old Town is running low, and the warning, the whole point of the feature, stays silent. The numbers are right; their units are different, and nothing in the code knows.
verify: node -e "console.log(5200 < 6 ? 'Yes' : 'No')"
```

Run it: `node playground/requirements/flour.mjs`.

```text
Riverside order more
Old Town fine
total flour: 5208
```

| line | the code says | the truth |
|---|---|---|
| Riverside | order more | right: 8 kg is under 10 kg |
| Old Town | fine | **wrong**: 5.2 kg is under 6 kg |
| total | 5208 | meaningless: it adds kilograms to grams. The real total is 13.2 kg |

```check
run "node playground/requirements/flour.mjs" stdout="Old Town fine" label="the check misses Old Town, because its count is in grams"
```

## One unit inside {#units}

The fix isn't in the comparison. It's a decision, made once: **inside the app, every amount is in one unit**, grams. Riverside's 8 becomes 8,000 when it's read in, and a reorder level of 10 kg becomes 10,000. Converting happens only at the **edges**, where amounts come in (typing, importing the old files) and go out (showing them to a person).

| where | unit |
|---|---|
| Riverside's old file, and what Dev types | kilograms |
| Old Town's old file | grams |
| **everywhere inside the app** | **grams** |
| what a manager sees | whatever their shop prefers |

This is common enough to have a name, **normalising at the edges**, and you'll meet it again with dates (`DD/MM/YYYY` in the files, one format inside), text (the cafés' names spelt several ways), and money. Decisions like this are written down where everyone can find them, which is what the glossary is for.

## Your turn: the glossary

A **glossary** lists the client's words and exactly what each means in the app. It stops "batch" meaning one thing to you and another to Priya, and it's where decisions like *amounts are in grams* live. Teams that keep one use the same words in conversation, in the docs and in the code: a `reorderLevel` in the code is a *reorder level* in the glossary.

Write `docs/crumb/glossary.md`: a sentence saying amounts are kept in grams inside the app, then at least six terms, each on a line of the form `- **Term**: what it means.` Include *reorder level* and *batch*. Commit.

```hints
nudge: Read `answers.md` again, and note every word the bakery uses that you'd have had to ask about: makes, batch, reorder level, shop, pack, wholesale order.
concept: Each definition says what the word means *for this app*, with a real example: "The brioche makes 12", "Riverside reorders flour at 10 kg". Write down what's out of scope too: "Wholesale order: … Not part of release 1."
shape: `# Crumb & Co.: glossary`, a sentence about grams, then lines like `- **Reorder level**: the amount of an ingredient below which a shop orders more.`
answer: ~~~markdown
# Crumb & Co.: glossary

The words the bakery uses, and what they mean in the app. Amounts are kept in grams everywhere inside the app; kilograms are only for reading in and showing.

- **Recipe**: the ingredients for one tested batch, and how many that batch makes.
- **Makes**: how many items a recipe produces as written. The brioche makes 12.
- **Batch**: one run of a recipe, scaled to how many Priya wants that morning.
- **Shop**: Riverside, Old Town or the Station kiosk. Only Riverside and Old Town bake.
- **Stock count**: the amount of an ingredient a shop has, counted every evening.
- **Reorder level**: the amount of an ingredient below which a shop orders more. Each shop sets its own, per ingredient.
- **Pack**: the size an ingredient is bought in: butter in 250 g blocks, flour in 16 kg sacks.
- **Wholesale order**: an order from a café Crumb & Co. supplies. Not part of release 1.
~~~
```

```check
run "node -e \"const text = require('fs').readFileSync('docs/crumb/glossary.md', 'utf8'); const n = text.split(/\\r?\\n/).filter((l) => /^- \\*\\*.+\\*\\*: /.test(l)).length; const missing = ['reorder level', 'batch', 'gram'].filter((w) => !text.toLowerCase().includes(w)); console.log(n >= 6 && missing.length === 0 ? '[enough]' : '[' + n + ' terms; missing: ' + missing.join(', ') + ']')\"" stdout="[enough]" label="at least six terms, each written - **Term**: meaning, including reorder level, batch, and the grams decision" -- One term per line: - **Term**: what it means. Define reorder level and batch, and say amounts are kept in grams.
git-clean -- Commit it: git add docs playground, then git commit.
```
