---
title: 10.1 — A Brief from a Bakery
runtime: none
experiments: Code finds questions too
teaches: client briefs, requirements, ambiguity, questions for a client
uses: object entries, for of loops, floating point, markdown, git commit, playground
---

### The story so far

Module 1 (Sprints 0 to 9) built a spreadsheet from nothing: a grid on the page, a formula language with a lexer, parser and evaluator, a dependency graph that recalculates only what an edit affects, ranges, and a library of functions up to `IF`, `COUNTIF` and `SUMIF`. Every lesson told you what to build. That's the part of the job that's easiest to teach, and the smaller part of it.

### What this lesson builds

From this module on, the work comes from **clients**: people with a problem, who describe it in their own words, never in yours. The first is a bakery. This lesson starts a folder for everything they tell you and everything you ask them:

```text
 docs/crumb/
 ├── brief.md        what the client wrote (supplied)
 └── questions.md    what you need to ask before building anything (you write it)
```

No code in the project changes. The only code is one playground experiment, and it finds a question too.

## The brief {#brief}

A **brief** is the client's description of what they need. Click **Create provided docs/crumb/brief.md** and read it, all of it, before going on:

```markdown file=docs/crumb/brief.md provided
# Crumb & Co.: what we need

*From Maya Okafor, owner, Crumb & Co.*

Hi! We're Crumb & Co., three bakeries: Riverside, Old Town and the Station kiosk. We heard you're building a spreadsheet, and we're drowning in ours.

Every shop keeps its own Excel files: the recipes, the stock counts, and the wholesale orders from the cafés we supply. Every morning Priya, our head baker, works out how much of everything to make and what to order, and it takes her about an hour. Half the time someone has changed a recipe in one shop's file and not the others.

What we'd love:

1. Our recipes in one place, so when Priya types how many she wants to bake, it works out the ingredients.
2. To know when we're running low on flour, butter and so on, before we run out.
3. Our old files brought over. We don't want to type four years of stuff in again.
4. It should look like us: our colours, not grey boxes.
5. The shop managers are on their feet all day, so it has to work on their phones.

It needs to be simple. Priya is a brilliant baker, but she isn't a computer person. And we'd like it before the Christmas rush.
```

```check
file docs/crumb/brief.md
```

## Reading for what's missing {#vague}

A brief like this is normal, and it's useless to build from as it stands. Maya knows exactly what she means by "running low", and hasn't written it down, because to her it's obvious. Every word that could mean two things is a decision someone will make. If you make it, by guessing while you code, the client finds out at the demo, when it's expensive to change.

So read the brief again, looking for words that could mean two things:

| the brief says | it could mean | so the question is |
|---|---|---|
| "types how many she wants" | loaves? batches? trays? | What does Priya count in? |
| "running low" | below a fixed amount? less than tomorrow needs? | What counts as low, and is it the same for every shop? |
| "our old files" | the recipes? the stock? four years of orders? | Which files, in what format, and which parts are still used? |
| "look like us" | colours? a logo? a font? | Do you have brand colours? |
| "simple" | few screens? no typing formulas? | What does Priya do today, step by step? |
| "before the Christmas rush" | all of it? | If only one thing is ready, which? |

The last row is the most useful question in requirements work. Five wishes and a deadline is a client who hasn't decided what matters most, and the answer decides what you build first.

Questions come in a few kinds, and a good list has some of each:

| kind | asks | example |
|---|---|---|
| **what exactly** | for numbers, units, names | "What units do the shops count flour in?" |
| **who** | who does it, who is allowed | "Who can change a recipe?" |
| **what if** | about the unusual case | "What if a batch needs half an egg?" |
| **what's out** | what this release is *not* | "Are the wholesale orders part of this?" |
| **what first** | about priorities | "Which matters most by Christmas?" |

## Code finds questions too {#experiment}

Some questions only appear when you try to build the thing. Here's the first wish, as code, in the playground. This step opens `playground/requirements/scale.mjs`:

```javascript file=playground/requirements/scale.mjs
const brioche = { makes: 12, ingredients: { "flour (g)": 1000, "butter (g)": 500, eggs: 7, "sugar (g)": 100 } };

function scale(recipe, wanted) {
  const factor = wanted / recipe.makes;
  const scaled = {};
  for (const [name, amount] of Object.entries(recipe.ingredients)) {
    scaled[name] = amount * factor;
  }
  return scaled;
}

console.log(scale(brioche, 30));
```

**`scale`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `recipe` | how many it makes, and how much of each ingredient | the brioche: makes 12 |
| input `wanted` | how many Priya wants | `30` |
| returns | each ingredient × `wanted` ÷ `makes` | flour: 1000 × 30 ÷ 12 |

- **`Object.entries`** (lesson 7.4) gives each ingredient as a `[name, amount]` pair.
- **`factor`** is 30 ÷ 12 = 2.5: thirty is two and a half batches.

Before you run it, predict:

```predict
question: How many eggs does `scale` say Priya needs for 30?
choice: 17
choice: 17.5
choice: 18
answer: 17.5
explain: 7 × 2.5 is 17.5, and the code does exactly that arithmetic. It doesn't know an egg can't be split, because nobody told it. Whether 17.5 means 17, 18, or 17 and a splash of milk is the baker's decision, not yours.
verify: node -e "console.log(String(7 * 30 / 12))"
```

Run it: `node playground/requirements/scale.mjs`.

```text
{ 'flour (g)': 2500, 'butter (g)': 1250, eggs: 17.5, 'sugar (g)': 250 }
```

That's a question for the list: *when a batch needs part of an egg, what do you do?* Trying to build the smallest piece of a wish, before the requirements are settled, is a cheap way to find what's missing from them.

```check
run "node playground/requirements/scale.mjs" stdout="eggs: 17.5" label="scaling the brioche to 30 asks for 17.5 eggs"
```

## Your turn: the questions

Write `docs/crumb/questions.md`: the questions you'd ask Maya, Priya and the shop managers before building anything. At least ten questions, each on its own line ending with `?`, grouped under at least four `### ` headings (the wishes are a good start). Include at least one of each kind from the table above, and the egg question. Then commit everything, the brief and the playground included. (Three `#`s rather than two: the lesson pages use `## ` lines for their own steps, so the files supplied here use `### ` too, and it's easiest to match.)

The next lesson supplies the client's answers. Write your questions first: comparing them with what the client says is how you learn to ask better ones.

```hints
nudge: Go through the brief wish by wish. For each, ask: what number or unit is missing? Who does this? What's the unusual case? Then add the questions about the whole release: what's out, and what comes first.
concept: Group by subject, one `### ` heading each: Recipes, Stock, Old files, Looks and phones, Priorities. Under each, a list of questions, one per line, each ending with `?`. A question that can be answered with a number or a name ("What units…?") is worth more than one that invites a speech ("Any thoughts on stock?").
shape: `# Questions for Crumb & Co.`, then `### Recipes` with lines like `- How many does each recipe make as written?`, and so on for the other headings.
answer: ~~~markdown
# Questions for Crumb & Co.

### Recipes
- How many does each recipe make as written?
- When a batch needs part of an egg, do you round up, round down, or something else?
- Who is allowed to change a recipe?
- How often do recipes change?

### Stock
- What counts as "running low"? Is it the same for every shop?
- Does every shop count the same ingredients, in the same units?
- How often is stock counted, and by whom?

### Old files
- How many files are there, and can they be saved as CSV?
- Which parts of four years of data do you actually still use?

### Looks and phones
- Who uses a phone, and for what?
- Do you have brand colours and a logo we can use?

### Priorities
- If only one thing is ready by Christmas, which should it be?
- What isn't part of this release?
~~~
```

```check
run "node -e \"const t = require('fs').readFileSync('docs/crumb/questions.md', 'utf8').split(/\\r?\\n/); const q = t.filter((l) => l.trim().endsWith('?')).length; const h = t.filter((l) => l.startsWith('### ')).length; const egg = t.join(' ').toLowerCase().includes('egg'); console.log(q >= 10 && h >= 4 && egg ? '[enough]' : '[' + q + ' questions, ' + h + ' headings' + (egg ? '' : ', no egg question') + ']')\"" stdout="[enough]" label="at least ten questions, under at least four headings, the egg question included" -- One question per line, ending with ?, under ### headings; ask what happens when a batch needs part of an egg.
git-clean -- Commit it: git add docs playground, then git commit.
```
