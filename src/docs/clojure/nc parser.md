# Build a Fanuc Macro Expression Parser, Step by Step

By the end you will have written, understood, tested and then cleaned up a parser that does two things:

```js
evaluate('#1+[#2*COS[30]]', vars)        // -> a number (or null, "vacant")
readWords('G10L2P#23X[#1+1.]', vars)     // -> [{letter:'G', value:10}, {letter:'L', value:2}, ...]
```

It is your original code, rebuilt one piece at a time. Each lesson adds a small piece, runs it, and explains what happened. Lessons 8 to 10 review the finished parser, rewrite it more cleanly, and answer your TypeScript question with a real conversion. Lesson 11 is a capstone where you extend it yourself.

**Every code block and every output block in this document was produced by running the code** (Node 22). If your output differs from "Expected output", the difference is the lesson: find it before moving on.

**About this edition.** This is the same course with much more teaching in it. Every lesson now has the same shape:

1. **Idea**: why the code looks the way it does.
2. **Code**, then a **Line by line** walk-through of what you just typed.
3. **Try it**, with expected output. Predict first.
4. **Check yourself**.
5. **Go deeper**: *Break it* experiments (change one thing on purpose and watch exactly how it fails), then **exercises with worked solutions**.

New in this edition: a JavaScript primer, the grammar written as a spec, and a hand-tracing method (all in Lesson 0); a reusable `trace.mjs` tool (Lesson 3); and Lesson 11, a capstone where you extend the finished parser yourself.

**Two corrections.** Re-running everything turned up two things in the earlier edition that were wrong or incomplete:

- Lesson 5 claimed that looking for `SQR` instead of `SQR[` would break `SQRT[...]`. That is only true if `SQR` comes first in the table. In your table `SQRT` comes first, so it works by luck. Lesson 5 now shows both orderings and explains the real lesson.
- The refactored parser in Lesson 9 silently accepted `POW[2,3,4]` and `ATAN[1,2,3]` (extra arguments were ignored). The old parser rejected them. The characterization test did not catch it because no test case had too many arguments. Lesson 9 now fixes it and uses the bug to teach what a characterization test can and cannot promise.

As before, every code block and every output block was produced by running the code (Node 22). In this edition the new output blocks were captured by a script that runs each snippet and pastes the real output in, so they cannot drift from the code.

## Contents

| # | Lesson | What you add |
|---|---|---|
| 0 | The idea before the code | The mental model, a JavaScript primer, the grammar as a spec, hand tracing. Almost nothing to build. |
| 1 | A cursor over the text | `peek`, `eat`, `expect`, `number` |
| 2 | Values: brackets, variables, signs | `primary`, `unary`, `evaluate` |
| 3 | Precedence: `*` before `+` | `product`, `sum`, and the `trace.mjs` tool |
| 4 | Comparisons and "vacant" | `compare` |
| 5 | Functions | `SIN[...]`, `POW[...]`, `ATAN[...]` |
| 6 | Reading address words | `wordValue`, `readWords` |
| 7 | Plugging into the comment scanner | whitespace, `;`, and the pipeline |
| 8 | Review: what is wrong with it | a bug hunt with evidence |
| 9 | Refactor: cleaner and more maintainable | tables instead of copy-paste, tested against the original |
| 10 | Should this be TypeScript? | a real conversion, type-checked |
| 11 | Capstone: assignment statements | you extend the parser: `#100=#1+2` |

## How to use this document

- Make a folder, say `macro-course/`, and work inside it. You need Node 18 or newer.
- Save code under the file name shown above each block. Type it rather than pasting if you can; typing forces you to read every line.
- Run files with `node filename.mjs`.
- After each lesson there is a **Checkpoint** (a line count for `macro.mjs`) and a **Check yourself** question with a collapsed answer. Predict first, then open the answer.
- When you come back with questions, name the lesson number and paste what you ran. That makes it easy to find where things diverged.

**One contract to know up front.** `vars` is any object with a `get(n)` method that returns a number, or `null` when variable `n` is *vacant* (never set). In Fanuc, vacant is not the same as 0, and the parser has to keep them apart. In every test below we use:

```js
const table = { 1: 5, 2: -3.5 };               // #1 = 5, #2 = -3.5
const vars = { get: (n) => table[n] ?? null };  // anything not in the table is vacant
```

### How to study this so it sticks

Reading code is not the same as being able to write it. The loop that works:

1. **Read the idea** and cover the code. Say in your own words what the new function must do.
2. **Type the code.** Then read the *Line by line* section and check that you could explain each line to someone else.
3. **Predict, then run.** Write your prediction down *before* you run a try-file. A wrong prediction is the most valuable thing that can happen: it is a gap in your mental model, caught early.
4. **Break it.** Change one thing and run again. Understanding a design means knowing what it is protecting you from.
5. **Do the exercises without peeking** at the solution. Struggle for ten minutes first; that is where the learning is.

If you only have one evening, do Lessons 0 to 3 slowly rather than all of them fast. Lessons 0 to 3 contain the whole idea; the rest are applications of it.

---

## Lesson 0: The idea before the code

### The problem

Turn the text `#1+[#2*COS[30]]` into a number. Three things make this harder than it looks:

1. **Reading**: walk through the characters left to right, knowing where you are.
2. **Precedence**: in `1+2*3` the `*` must happen before the `+`.
3. **Nesting**: brackets can contain expressions that contain brackets, as deep as the programmer likes.

### The technique: one function per precedence level

This is called *recursive descent*. Each precedence level becomes one function. A function for a loose level (like `+`) gets its operands by calling the function for the next tighter level (like `*`). Here is the whole parser as a ladder:

```
compare    EQ NE GT GE LT LE          loosest: decided last
  sum      +  -  OR XOR
    product   *  /  AND MOD
      unary      -x   +x
        primary     5    #1    [ expr ]    SIN[ expr ]       tightest: decided first
                                  │
                                  └── goes back up to compare
```

Why does this give correct precedence? Take `1+2*3`. `sum` needs its operands, so it asks `product`. `product` reads `1`, sees no `*`, and hands back `1`. `sum` sees a `+` and asks `product` again. This time `product` reads `2`, sees `*`, reads `3`, and returns `6` *before `sum` ever sees that `*`*. So `sum` computes `1+6`. Tighter operators win because they sit lower on the ladder and finish first.

Why is it *recursive*? Look at the arrow on the right. When `primary` finds a `[`, the contents are a complete expression, so it calls `compare` again, starting a whole new trip down the ladder. That one arrow is what lets brackets nest to any depth.

### What every function returns

A **value**: a number, or `null` for vacant. Keep that in mind; it is the reason for a helper called `num` in Lesson 2.

### The plan

We build bottom-up: the cursor (Lesson 1), then the tightest level `primary` (2), and then work *up* the ladder: `product` and `sum` (3), `compare` (4). Functions (5) are extra things `primary` can recognize. Lesson 6 reuses the same cursor for a different job: reading whole lines of address words.


### 0.1 The JavaScript this parser leans on

The parser is short because it uses a handful of JavaScript features very heavily. If one of these is unfamiliar, the code will look like magic; so meet them first, in isolation. This is not a JavaScript course, only the parts you will meet.

Create `prim.mjs` anywhere (it does not use the parser):

```js
// Run this file; every line prints one fact the parser depends on.
console.log("startsWith('12', 0)   ->", '12.5+3'.startsWith('12', 0));
console.log("startsWith('+', 4)    ->", '12.5+3'.startsWith('+', 4));
console.log("startsWith('+', 3)    ->", '12.5+3'.startsWith('+', 3));
console.log("slice(4)              ->", JSON.stringify('12.5+3'.slice(4)));
console.log("match unanchored      ->", 'X5'.match(/\d+/)?.[0]);
console.log("match anchored ^      ->", 'X5'.match(/^\d+/));
console.log('null ?? 0             ->', null ?? 0);
console.log('0 ?? 5                ->', 0 ?? 5);
console.log('0 || 5                ->', 0 || 5);
console.log("Number('5.')          ->", Number('5.'));
console.log("Object.entries        ->", JSON.stringify(Object.entries({ SIN: 1, COS: 2 })));
console.log('6 & 3, 4 | 1, 5 ^ 1   ->', 6 & 3, 4 | 1, 5 ^ 1);
console.log('7 % 3, -7 % 3         ->', 7 % 3, -7 % 3);

const counter = { n: 0, bump() { return ++this.n; } };
const detached = counter.bump;
try { detached(); } catch (e) { console.log('detached method     -> ERROR:', e.message); }
console.log('called as counter.bump() ->', counter.bump());
```

Run `node prim.mjs`. **Output:**

```text
startsWith('12', 0)   -> true
startsWith('+', 4)    -> true
startsWith('+', 3)    -> false
slice(4)              -> "+3"
match unanchored      -> 5
match anchored ^      -> null
null ?? 0             -> 0
0 ?? 5                -> 0
0 || 5                -> 5
Number('5.')          -> 5
Object.entries        -> [["SIN",1],["COS",2]]
6 & 3, 4 | 1, 5 ^ 1   -> 2 5 4
7 % 3, -7 % 3         -> 1 -1
detached method     -> ERROR: Cannot read properties of undefined (reading 'n')
called as counter.bump() -> 1
```

What each line is teaching, and where the parser uses it:

| Fact | Why the parser needs it |
|---|---|
| `text.startsWith(word, pos)` checks for `word` **at position `pos`** without copying the string. | This is `peek`. It is how the parser asks "is the next thing a `+`?" without moving. |
| `text.slice(pos)` gives "everything from `pos` on". | The leftover text, used for error messages and for regex matching at the cursor. |
| A regex starting with `^` can only match at the very start of the string. Without it, `'X5'.match(/\d+/)` finds the `5` *later in the string* and the parser would silently skip over the `X`. | `number()` slices from the cursor and anchors with `^`, so it can only read a number exactly where the cursor is. |
| `a ?? b` means "`b` only if `a` is `null` or `undefined`". `a \|\| b` means "`b` if `a` is *any* falsy value", including `0` and `NaN`. | `num(v) = v ?? 0`. Only vacant (`null`) should become 0. With `\|\|`, a `NaN` from bad math would *also* be quietly turned into `0` and hide the error. Use `??` when you mean "missing", not "falsy". |
| `Number('5.')` is `5`. | G-code writes `5.` for "five, as a decimal"; JavaScript's `Number` accepts it. |
| `Object.entries(obj)` gives `[key, value]` pairs. | The function table is looped over as `for (const [name, fn] of Object.entries(FUNCTIONS))`. |
| `&`, `\|`, `^` are *bitwise* operators on 32-bit integers. | They implement `AND`, `OR`, `XOR`. |
| `%` keeps the sign of the left operand (`-7 % 3` is `-1`). | `MOD`. Worth knowing: it is a remainder, not a mathematical modulo. |
| A method pulled off its object loses `this`. | This is *why* the original parser calls `p.peek(...)` instead of `this.peek(...)`: `p` is a variable captured by every function, so it can never be lost. Lesson 9 shows the class alternative and the price it pays (`next.call(this)`). |

Notice that last row in the output: pulling `bump` out of `counter` and calling it plain fails. Remember that; it comes back in Lesson 9.

### 0.2 The grammar, written as a spec

Before any code, here is the whole language the parser understands, in a compact notation. Read `:=` as "is", `|` as "or", `[ ... ]` as "optional", and `{ ... }` as "zero or more times". Quoted things are literal text.

```text
compare   := sum     [ ( 'EQ' | 'NE' | 'GT' | 'GE' | 'LT' | 'LE' ) sum ]
sum       := product { ( '+' | '-' | 'OR' | 'XOR' ) product }
product   := unary   { ( '*' | '/' | 'AND' | 'MOD' ) unary }
unary     := ( '-' | '+' ) unary
           | primary
primary   := '[' compare ']'
           | '#' varindex
           | FUNCTION '[' compare { ',' compare } ']'     (and ATAN[a]/[b])
           | number
varindex  := '[' compare ']' | '#' varindex | number
number    := digits [ '.' [ digits ] ]  |  '.' digits
```

**The rule that makes this a parser, not just a grammar:** *each rule becomes one function, and the function's body is the rule's right-hand side read left to right.* The three notations translate like this:

| Grammar | Code shape |
|---|---|
| `A \| B` | `if (eat(A-start)) {...} else {...}`: look at the next characters to decide which branch |
| `[ X ]` (optional) | `if (eat('X')) {...}` |
| `{ X }` (repeat) | `for (;;) { if (!eat('X')) return ...; ... }` |
| a rule name on the right | a call to that rule's function |

So `sum := product { ('+' \| '-') product }` is literally "call `product`, then loop: if the next thing is `+` or `-`, call `product` again". You will see that in Lesson 3; the code will feel like the grammar typed out.

Two things in the grammar are worth pausing on:

- **`unary` calls `unary`** (`- unary`). That is recursion through a *prefix*: it is why `--5` works. Nothing special was added for it.
- **`primary` calls `compare`** (inside `'[' compare ']'`). That is recursion back to the *top* of the ladder, which is why brackets nest. Every deep structure in a parser comes from a rule that eventually refers back to itself.

### 0.3 Parse by hand before you code

The most useful skill in this whole course is *being the parser* with a pencil. Do it now, for real, before looking at the answer. You need nothing but this rule:

> **A function never looks past what it needs.** `product` reads a `unary`, then asks "is the next thing `*`, `/`, `AND` or `MOD`?" If not, it stops and hands its value back to whoever called it, *without consuming* the next character. The caller then gets to decide what that character means.

**Worked example: `1+2*3`.** Keep a stack of "who is waiting for whom", and a cursor `^`.

| Step | Cursor | What happens | Stack (top on the right) |
|---|---|---|---|
| 1 | `^1+2*3` | `compare` needs a `sum`; `sum` needs a `product`; `product` needs a `unary`; `unary` needs a `primary` | compare, sum, product, unary, primary |
| 2 | `^1+2*3` | `primary` reads the number **1**, returns it | (unwinds to product) |
| 3 | `1^+2*3` | `product`: next is `+`, not a product operator, so return 1 | compare, sum |
| 4 | `1^+2*3` | `sum`: next is `+`. Eat it. Need another `product` | compare, sum, product, ... |
| 5 | `1+^2*3` | the new `product` reads 2 via `unary`/`primary`; next is `*`, which **is** its operator, so eat it | compare, sum, product |
| 6 | `1+2*^3` | `product` reads 3 and computes `2*3 = 6`. Next is end of text; return **6** | compare, sum |
| 7 | `1+2*3^` | `sum` computes `1 + 6 = 7`. No more operators; return 7 | compare |
| 8 | `1+2*3^` | `compare`: no comparison operator; return **7** | (done) |

Notice step 3 vs step 6: the same `product` function declined the `+` at step 3 and accepted the `*` at step 5. Precedence is nothing more than *which function is standing there when the operator appears*.

**Now you do one: `#1+[#2*COS[30]]`** with `#1 = 5` and `#2 = -3.5`. The shape to find: the outermost expression is a sum. Its second operand is a bracket, and inside the bracket is a product whose second operand is a function call, whose argument is a *whole new expression* (`30`). That is three levels of the ladder nested inside each other. Try the table yourself first.

<details><summary>Answer</summary>

1. The top-level trip down the ladder reaches `primary`, which sees `#`, reads the number `1`, and looks up variable 1: **5**. `product` sees `+` (not its operator) and returns 5. `sum` eats the `+` and asks `product` for the next operand.
2. That `product` reaches `primary`, which sees `[`: *this is the recursion*. It calls `compare` fresh on `#2*COS[30]]`.
   - A brand new ladder trip. `primary` reads `#2` → **-3.5**. `product` sees `*`, eats it, and asks `unary` for the next operand.
   - `primary` sees `COS[`. It calls `compare` fresh *again* on `30]`: a third ladder trip, which returns **30** and stops at the `]`. `primary` expects and eats the `]`, then returns `cos(30°)` = about **0.866**.
   - `product` computes `-3.5 * 0.866` = about **-3.031**, sees `]` (not its operator), and returns.
   - `sum` and `compare` inside the bracket also see `]` and return -3.031. The outer `primary` expects and eats the `]`.
3. Back in the top-level `sum`: `5 + (-3.031)` = **1.9689...**

Run it to check: `evaluate('#1+[#2*COS[30]]', vars)` gives `1.9689110867544644`. (You can run it yourself after Lesson 5, once functions exist. Until then, trust the hand trace.)

</details>

If you got the shape right but stumbled on the bookkeeping, that is normal. The tracer you build in Lesson 3 prints the same call structure for any expression, so you can compare your hand trace with the machine's.

---

## Lesson 1: A cursor over the text

**Goal:** a small object that knows *where it is* in the text and can look at, or consume, what comes next.

### The idea

Everything the parser does is: "look at what is here; if it is what I want, step past it." So the parser's only state is a position, `pos`, plus three tiny operations:

| Operation | Looks | Moves `pos` | If it does not match |
|---|---|---|---|
| `peek(w)` | yes | never | returns `false` |
| `eat(w)` | yes | only on a match | returns `false` |
| `expect(w)` | yes | only on a match | **throws an error** |

A failed `eat` costs nothing (`pos` stays put), which is what lets a grammar rule *try* one option and then another.

Add `number()` too: it reads a G-code style number starting at the cursor.

### Code

Create `macro.mjs`:

```js

export function parser(text, vars) {
  const p = {
    pos: 0,

    peek(word) {
      return text.startsWith(word, p.pos);
    },

    eat(word) {
      if (p.peek(word)) {
        p.pos += word.length;
        return true;
      }
      return false;
    },

    expect(word) {
      if (!p.eat(word)) {
        throw new Error(`expected ${word} at "${text.slice(p.pos) || 'end'}" in ${text}`);
      }
    },

    number() {
      const m = text.slice(p.pos).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!m) throw new Error(`expected a number at "${text.slice(p.pos) || 'end'}" in ${text}`);
      p.pos += m[0].length;
      return Number(m[0]);
    },
  };
  return p;
}
```

Notes on what you just typed:

- `parser(text, vars)` returns an object `p`. The methods call each other as `p.peek(...)` instead of using `this`. This keeps them safe to pass around, and it is how your original is written. (Lesson 9 compares this style with a class.)
- `vars` is not used yet. We take it now so the function's shape never changes later.
- The number regex `^(?:\d+\.?\d*|\.\d+)` has two branches because G-code allows `5.` (digits, then an optional dot, then optional digits) and `.25` (a leading dot must be followed by digits). The `^` anchors it to the start of the slice, so it can only match exactly where the cursor is.

### Line by line

Read this with the code open next to it.

```js
export function parser(text, vars) {
```
A *factory*: calling `parser('12.5+3')` builds and returns a fresh parser. `text` and `vars` are **captured**: every function defined inside can see them, and they live as long as the parser does. That capture is the whole trick of the closure style. There is no `this.text`; there is just `text`.

```js
  const p = {
    pos: 0,
```
The *entire mutable state of the parser* is this one number: how many characters have been consumed. Everything else is read-only. When something goes wrong in a parser, the first question is always "what was `pos`?"

```js
    peek(word) { return text.startsWith(word, p.pos); },
```
Look, don't move. Note `text.startsWith(word, p.pos)` rather than `text.slice(p.pos).startsWith(word)`: same answer, no copy of the rest of the string each time.

```js
    eat(word) {
      if (p.peek(word)) { p.pos += word.length; return true; }
      return false;
    },
```
Look, and move **only if it matched**. The `true`/`false` return is what lets callers write `if (p.eat('+')) ...`. The key property: *a failed `eat` changes nothing*. That is what makes "try this, else try that" safe.

```js
    expect(word) {
      if (!p.eat(word)) throw new Error(`expected ${word} at "${text.slice(p.pos) || 'end'}" in ${text}`);
    },
```
`eat` for things that are **required**. The error shows what was wanted, the unread text, and the whole input. `|| 'end'` is there because an empty string would print `at ""`, which is confusing; `at "end"` is clear.

```js
    number() {
      const m = text.slice(p.pos).match(/^(?:\d+\.?\d*|\.\d+)/);
```
Slice from the cursor, then match a number **at the very start** (the `^`). The regex has two branches separated by `|`:

| Branch | Reads | Examples it matches |
|---|---|---|
| `\d+\.?\d*` | digits, optional dot, optional more digits | `10` `5.` `12.5` `0.001` |
| `\.\d+` | a dot followed by at least one digit | `.25` `.5` |

`(?:...)` is a *non-capturing group*: it only groups the two branches so the `^` applies to both. A lone `.` matches neither branch, so it is not a number.

```js
      if (!m) throw new Error(...);
      p.pos += m[0].length;
      return Number(m[0]);
```
`m` is `null` when nothing matched; `m[0]` is the matched text. Advance by its length, convert to a real number. Three lines: **check, advance, return**. Nearly every parsing function in the course has this rhythm.

```js
  return p;
```
The factory hands back the object. In the next lessons you will add more methods to `p`, and they will call each other as `p.something()`.

### Try it

Create `try1.mjs`:

```js
import { parser } from './macro.mjs';

const p = parser('12.5+3');
console.log('start        pos =', p.pos);
console.log("peek('12')   ->", p.peek('12'), ' pos =', p.pos);
console.log('number()     ->', p.number(), ' pos =', p.pos);
console.log("eat('-')     ->", p.eat('-'), ' pos =', p.pos);
console.log("eat('+')     ->", p.eat('+'), ' pos =', p.pos);
console.log('number()     ->', p.number(), ' pos =', p.pos);

console.log('\n-- G-code style numbers --');
for (const s of ['10', '5.', '.25', '0.001']) console.log(JSON.stringify(s), '->', parser(s).number());

console.log('\n-- the question from the previous message --');
const q = parser('12.5.3');
console.log('number() ->', q.number(), ' pos =', q.pos, ' left over:', JSON.stringify('12.5.3'.slice(q.pos)));

console.log('\n-- failures --');
for (const s of ['X5', '-5']) {
  try { parser(s).number(); } catch (e) { console.log(e.message); }
}
```

Run `node try1.mjs`.

**Expected output:**

```text
start        pos = 0
peek('12')   -> true  pos = 0
number()     -> 12.5  pos = 4
eat('-')     -> false  pos = 4
eat('+')     -> true  pos = 5
number()     -> 3  pos = 6

-- G-code style numbers --
"10" -> 10
"5." -> 5
".25" -> 0.25
"0.001" -> 0.001

-- the question from the previous message --
number() -> 12.5  pos = 4  left over: ".3"

-- failures --
expected a number at "X5" in X5
expected a number at "-5" in -5
```

### What happened

- `peek('12')` was `true` but `pos` stayed at 0. Looking is free.
- `number()` consumed `12.5` and moved `pos` to 4. `eat('-')` failed and `pos` stayed at 4. `eat('+')` succeeded and moved to 5.
- **The question I left you last time:** `parser('12.5.3').number()` returns `12.5` with `pos` at 4, and `.3` is left over. That is correct behavior for a function whose job is to read *one* number. Deciding what leftover text means is someone else's job. You will meet that someone in Lesson 2.
- `-5` fails: `number()` does not understand signs. A minus sign is an operator, and operators belong to a higher rung of the ladder (`unary`, Lesson 2).

**Checkpoint:** `macro.mjs` is 32 lines.

### Check yourself

Without running it: what does `parser('5.').number()` return, and where does `pos` end up?

<details><summary>Answer</summary>

It returns `5` and `pos` is 2. The first regex branch matches `5.` (digits, optional dot, zero digits), and `Number('5.')` is `5`. The dot is consumed even though it adds nothing to the value.

</details>


### Go deeper

#### Break it

Create `break1.mjs`:

```js
import { parser } from './macro.mjs';

// 1. The empty string matches everywhere
const a = parser('abc');
console.log("eat('') ->", a.eat(''), ' pos =', a.pos);

// 2. What the ^ buys you
console.log('unanchored:', 'X5'.match(/\d+/)?.[0], '| anchored:', 'X5'.match(/^\d+/));

// 3. Two numbers in a row
const b = parser('12.5.3');
console.log('two reads:', b.number(), b.number(), ' pos =', b.pos);

// 4. What number() will and will not read
for (const s of ['.', '007', '1e3']) {
  try {
    const q = parser(s);
    console.log(JSON.stringify(s).padEnd(6), '->', q.number(), ' left over:', JSON.stringify(s.slice(q.pos)));
  } catch (e) {
    console.log(JSON.stringify(s).padEnd(6), '-> ERROR:', e.message);
  }
}
```

Run `node break1.mjs`. **Output:**

```text
eat('') -> true  pos = 0
unanchored: 5 | anchored: null
two reads: 12.5 0.3  pos = 6
"."    -> ERROR: expected a number at "." in .
"007"  -> 7  left over: ""
"1e3"  -> 1  left over: "e3"
```

What each experiment shows:

1. **`eat('')` is always `true` and never moves.** Every string starts with the empty string. This is harmless here, but it is the classic bug when a table of words contains an empty entry by accident: that entry "matches" forever.
2. **Without `^`, a regex *searches*; with `^`, it *reads*.** The unanchored version found a `5` hiding after the `X`. A parser that searches instead of reading will happily skip over garbage and report success. The anchor is a correctness feature, not a style choice.
3. **`number()` reads one number and stops.** `12.5.3` is two numbers back to back, `12.5` and `.3`. Whether that is *legal* is not `number`'s business; it is the caller's. (In Lesson 6 you will see `X1.5.5` rejected, and exactly who rejects it.)
4. **What counts as a number is decided entirely by the regex.** `.` is rejected (needs a digit), `007` is read as `7`, and `1e3` reads as `1` with `e3` left over, because G-code has no exponent notation. If you ever want `1e3` to work, the regex is the only place to change.

#### Exercises

**1.1 Write `eatAny`.** Lesson 9 uses a helper `eatAny(words)` that tries each word in order and returns the one that matched, or `null`. Write it as a method on `p` (inside the object, after `expect`). Test: with the text `GE5`, `eatAny(['EQ','GE','GT'])` should return `'GE'` and leave `pos` at 2; a second call should return `null` and leave `pos` alone.

<details><summary>Solution</summary>

Inside the `p` object:

```js
    eatAny(words) {
      for (const w of words) if (p.eat(w)) return w;
      return null;
    },
```

It is just `eat` in a loop. Because a failed `eat` moves nothing, trying words one after another is safe. The `ex1.mjs` script below attaches it from outside so you can test without editing `macro.mjs`:

Create `ex1.mjs`:

```js
import { parser } from './macro.mjs';

const p = parser('GE5');
// Exercise 1.1: add eatAny to the parser object
p.eatAny = (words) => {
  for (const w of words) if (p.eat(w)) return w;
  return null;
};

console.log("eatAny(['EQ','GE','GT']) ->", p.eatAny(['EQ', 'GE', 'GT']), ' pos =', p.pos);
console.log("eatAny(['EQ','GE','GT']) ->", p.eatAny(['EQ', 'GE', 'GT']), ' pos =', p.pos);
```

Run `node ex1.mjs`. **Output:**

```text
eatAny(['EQ','GE','GT']) -> GE  pos = 2
eatAny(['EQ','GE','GT']) -> null  pos = 2
```

The **order of the words matters**. `['GE', 'GT']` and `['GT', 'GE']` behave the same here because neither is a prefix of the other. If one *were* a prefix of the other (say `/` and `//`), the shorter one listed first would win and the longer one would never be seen. You will hit exactly that in Exercise 9.2.

</details>

**1.2 Predict.** `parser('.5.')`: you call `number()` once. What does it return and where does `pos` end up?

<details><summary>Answer</summary>

It returns `0.5` and `pos` is `2`. The second branch `\.\d+` reads `.5`; the final `.` is left over. (Verified by running it.)

</details>

---

## Lesson 2: Values: brackets, variables and signs

**Goal:** make `primary` (the tightest rung) and `unary` (the next rung up), plus an `evaluate` function so tests are one-liners.

### Three new ideas

**1. Brackets are where the recursion lives.** When `primary` sees `[`, it needs "a complete expression". That should be `compare` (the top of the ladder). But we have not built the middle rungs yet. So we use a **stub**: a temporary stand-in that lets us run what we have. For now `compare` just calls `unary`. We will replace it in Lessons 3 and 4. Stubbing the top of a structure you have not built yet is a standard way to build incrementally.

**2. Variables and "vacant".** `#1` looks up variable 1. `#[#3]` looks up the variable *whose number is the value of `#3`*, so the index itself can be an expression. A variable that was never set is vacant (`null`), not 0.

**3. `num`.** Arithmetic on vacant should treat it as 0. Rather than sprinkle `?? 0` everywhere, one tiny helper does it: `num(v)` is `v ?? 0`. From now on the rule is: **raw values may be `null`; wrap in `num()` at the moment you do arithmetic.**

### Code

At the **top** of `macro.mjs`, above `parser`:

```js
const num = (v) => v ?? 0;
```

Inside the `p` object, after `number()`, add `primary`, `unary` and the stub:

```js
    primary() {
      if (p.eat('[')) {
        const v = p.compare();
        p.expect(']');
        return v;
      }
      if (p.eat('#')) {
        let n;
        if (p.eat('[')) {
          n = p.compare();
          p.expect(']');
        } else {
          n = p.number();
        }
        return vars.get(Math.round(num(n)));
      }
      return p.number();
    },

    unary() {
      if (p.eat('-')) return -num(p.unary());
      if (p.eat('+')) return num(p.unary());
      return p.primary();
    },
    // TEMPORARY top of the grammar. Replaced in Lesson 3.
    compare() {
      return p.unary();
    },
```

After the closing `}` of `parser`, add `evaluate`:

```js
export function evaluate(text, vars) {
  const p = parser(text, vars);
  const value = p.compare();
  if (p.pos < text.length) throw new Error(`cannot read "${text.slice(p.pos)}" in ${text}`);
  return value;
}
```

`evaluate` runs the ladder from the top, then checks that the whole text was consumed. That check is the "someone else" from Lesson 1: if anything is left over, the text had something the grammar could not read, and we say exactly where.

### Line by line

```js
const num = (v) => v ?? 0;
```
One tiny function standing for a rule: **vacant is `null`, and arithmetic sees `null` as 0.** The rest of the parser never needs to think about `null` again, except in the places that deliberately do (`compare`, Lesson 4).

```js
primary() {
  if (p.eat('[')) {
    const v = p.compare();
    p.expect(']');
    return v;
  }
```
The *recursion*. A bracket promises "a complete expression follows, then `]`". `compare()` reads the complete expression (for now the stub just calls `unary`). `expect(']')` checks the promise was kept. The value is returned **as is**, with no `num(...)`: `[#9]` must still be vacant, because `primary` passes values along; it does not do arithmetic.

```js
  if (p.eat('#')) {
    let n;
    if (p.eat('[')) { n = p.compare(); p.expect(']'); }
    else { n = p.number(); }
    return vars.get(Math.round(num(n)));
  }
```
A variable. After `#` comes either `[expr]` (so `#[#3]` works) or a plain number. The index is *computed*, then `Math.round` forces it to a whole number (`#2.6` would otherwise ask for variable 2.6), and `num` turns a vacant index into 0. Then `vars.get` answers with a number or `null`.

```js
  return p.number();
}
```
**The fallback is the last line, not an `if`.** If it was not a bracket and not a variable, it had better be a number; if it is not, `number()` throws a useful error. This "try the specific things, then default to the general one and let it fail loudly" shape is typical.

```js
unary() {
  if (p.eat('-')) return -num(p.unary());
  if (p.eat('+')) return num(p.unary());
  return p.primary();
},
```
Note `p.unary()` inside `unary`: the function calls **itself**, which is how `---5` works with no extra code. A sign is arithmetic, so it goes through `num(...)`: applying `-` or `+` to a vacant value gives a number (`+#9` is `0`, not vacant). Only a value that passes through *untouched* may stay vacant.

```js
compare() { return p.unary(); },
```
The stub. It exists only so that `primary` has a `compare` to call.

```js
export function evaluate(text, vars) {
  const p = parser(text, vars);
  const value = p.compare();
  if (p.pos < text.length) throw new Error(`cannot read "${text.slice(p.pos)}" in ${text}`);
  return value;
}
```
Run the ladder from the top, then insist that **every character was consumed**. This single `if` is what turns "reads a prefix of the text" into "accepts exactly the text". Without it, `5]` would quietly evaluate to `5`.

### Try it

Create `try2.mjs`:

```js
import { evaluate } from './macro.mjs';

const table = { 1: 5, 2: -3.5, 3: 1 };
const vars = { get: (n) => table[n] ?? null }; // null = vacant

const show = (expr) => {
  try { console.log(expr.padEnd(8), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(8), '-> ERROR:', e.message); }
};
['5', '-5', '--5', '[7]', '[[7]]', '#1', '-#2', '#[1]', '#[#3]', '#9', '-#9', '[5', '5]', '1+2'].forEach(show);
```

**Expected output:**

```text
5        -> 5
-5       -> -5
--5      -> 5
[7]      -> 7
[[7]]    -> 7
#1       -> 5
-#2      -> 3.5
#[1]     -> 5
#[#3]    -> 5
#9       -> null
-#9      -> -0
[5       -> ERROR: expected ] at "end" in [5
5]       -> ERROR: cannot read "]" in 5]
1+2      -> ERROR: cannot read "+2" in 1+2
```

### What happened

Read the output line by line; each one is teaching something.

- `--5` is `5`. `unary` eats a `-` and calls *itself* for the rest, so signs stack: `-(-(5))`.
- `[[7]]` is `7`. Two trips back to the top of the ladder.
- `#9` is `null`: vacant stays vacant when you merely *read* it.
- `-#9` is `-0`. Negating vacant went through `num` (so `0`), and then JavaScript negated zero into *negative zero*. It prints oddly but `-0 === 0` is `true`, so it is harmless. We will note it in Lesson 8 and decide not to fix it.
- `[5` fails with `expected ] at "end"`. `expect(']')` found nothing. The message tells you what it wanted and where it was.
- `5]` fails with `cannot read "]"`. The ladder finished happily after `5`, but `evaluate`'s leftover check noticed unread text.
- `1+2` fails with `cannot read "+2"`. There is no `+` rung yet. This failure is our to-do list for Lesson 3.

**Checkpoint:** `macro.mjs` is 70 lines.

### Check yourself

Predict `evaluate('--#2', vars)` and `evaluate('#[#[3]]', vars)` with `#2 = -3.5`, `#1 = 5`, `#3 = 1`.

<details><summary>Answer</summary>

`--#2` is `-3.5`: two negations cancel, leaving `#2` itself. `#[#[3]]` is `5`: the inner `#[3]` is variable 3, whose value is `1`; so the outer is `#[1]`, which is `5`. (Verified by running both.)

</details>


### Go deeper

#### Break it

Create `break2.mjs`:

```js
import { evaluate } from './macro.mjs';
const table = { 1: 5, 2: -3.5, 3: 1 };
const vars = { get: (n) => table[n] ?? null };
const show = (expr) => {
  try { console.log(expr.padEnd(9), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(9), '-> ERROR:', e.message); }
};
['#-1', '#', '[]', '- 5', '+-5', '[#1]#2', '#1.4', '#1.5', '#0.5', '#[2.6-1]'].forEach(show);
```

Run `node break2.mjs`. **Output:**

```text
#-1       -> ERROR: expected a number at "-1" in #-1
#         -> ERROR: expected a number at "end" in #
[]        -> ERROR: expected a number at "]" in []
- 5       -> ERROR: expected a number at " 5" in - 5
+-5       -> -5
[#1]#2    -> ERROR: cannot read "#2" in [#1]#2
#1.4      -> 5
#1.5      -> -3.5
#0.5      -> 5
#[2.6-1]  -> -3.5
```

Reading the output:

- **`#-1`, `#`, `[]`**: all fail with `expected a number`. After `#` the parser insists on a number or bracket. A sign *inside* the variable number is not allowed (`#-1` is not "variable minus one"); that would need `#[-1]`.
- **`- 5`**: spaces are not skipped. `unary` eats the `-`, then `number()` meets a space. (Lesson 7 deals with this; Lesson 9 fixes it for good.)
- **`+-5`** is `-5`: a `+` then a `-` then 5. Signs stack from the outside in.
- **`[#1]#2`**: two complete values side by side. Nothing in the grammar allows that, so `evaluate`'s leftover check complains about `#2`.
- **`#1.4`, `#1.5`, `#0.5`, `#[2.6-1]`: variable numbers get rounded.** `#1.4` is variable 1 (value 5), `#1.5` is variable **2** (value -3.5), and `#0.5` is variable **1**: `Math.round(0.5)` is 1. This is a real design decision hiding in `Math.round`. Some controllers alarm on a non-integer variable number; this code quietly rounds. Whether that matches your machine is something to check, not assume. (It is listed again in Lesson 8 under "Noticed".)

#### Exercises

**2.1 Predict, then check.** With `#1 = 5`, `#2 = -3.5`, `#3 = 1` (and `#9` vacant): what are `-[#1]`, `-[[#2]]` and `+#9`? Is the last one vacant? (Cover the answer first.)

<details><summary>Answer</summary>

`-[#1]` is `-5`: the bracket yields 5, then the sign negates it. `-[[#2]]` is `3.5`: two bracket levels return `-3.5` untouched, and the sign flips it. `+#9` is `0`, **not** vacant: `unary` passes its operand through `num`, so applying a sign to a vacant value produces a number. (All three verified by running.)

</details>

**2.2 Make `evaluate` report *where*.** Change the leftover-text error so it also gives the 1-based column: `cannot read "]" at column 2 in 5]`. You only need to change one line.

<details><summary>Solution</summary>

In `evaluate`, change the error to:

```js
  if (p.pos < text.length) throw new Error(`cannot read "${text.slice(p.pos)}" at column ${p.pos + 1} in ${text}`);
```

`p.pos` is the number of characters consumed, so the first unread character is at 0-based index `p.pos`, i.e. 1-based column `p.pos + 1`. Test:

```js
import { evaluate } from './macro_col.mjs';
const vars = { get: () => null };
for (const s of ['5]', '12 3']) {
  try { evaluate(s, vars); } catch (e) { console.log(e.message); }
}
```

Output (with `macro_col.mjs` being your `macro.mjs` plus the changed line):

```text
cannot read "]" at column 2 in 5]
cannot read " 3" at column 3 in 12 3
```

The second case is a good illustration of Lesson 7's point: the space is not part of any number, so the parser reads `12` and stops *at the space*, column 3.

</details>

---

## Lesson 3: Precedence: `*` before `+`

**Goal:** add the `product` rung (`* / AND MOD`) and the `sum` rung (`+ - OR XOR`), and replace the stub.

### The idea

Every rung that handles left-to-right binary operators has the same shape:

```
value = (ask the next-tighter rung)
loop:
    if the next thing is one of my operators:
        value = value OP (ask the next-tighter rung)
    else:
        return value
```

The `for (;;)` loop is what makes these **left-associative**: `10-2-3` becomes `(10-2)-3 = 5`, not `10-(2-3) = 11`. Each pass of the loop folds the next operand into the running `value`.

Note where Fanuc puts the word operators: `AND` and `MOD` share a rung with `*` and `/`; `OR` and `XOR` share a rung with `+` and `-`. The ladder in Lesson 0 reflects that.

### Code

Add both methods to `p` (anywhere after `unary`):

```js
    sum() {
      let value = p.product();
      for (;;) {
        if (p.eat('+')) value = num(value) + num(p.product());
        else if (p.eat('-')) value = num(value) - num(p.product());
        else if (p.eat('OR')) value = num(value) | num(p.product());
        else if (p.eat('XOR')) value = num(value) ^ num(p.product());
        else return value;
      }
    },

    product() {
      let value = p.unary();
      for (;;) {
        if (p.eat('*')) value = num(value) * num(p.unary());
        else if (p.eat('/')) {
          const d = num(p.unary());
          if (d === 0) throw new Error(`divide by zero in ${text}`);
          value = num(value) / d;
        } else if (p.eat('AND')) value = num(value) & num(p.unary());
        else if (p.eat('MOD')) value = num(value) % num(p.unary());
        else return value;
      }
    },
```

Then **replace** the stub with one that points at the new top:

```js
    // TEMPORARY top of the grammar. Replaced in Lesson 4.
    compare() {
      return p.sum();
    },
```

Three details:

- `/` checks for a zero divisor and throws. Without the check JavaScript would silently return `Infinity`.
- Every operand goes through `num(...)`, so vacant behaves as 0.
- `AND`, `OR`, `XOR` use JavaScript's bitwise operators, which work on 32-bit integers. `6AND3` is `2`.

### Line by line

Take `product`; `sum` is identical in shape.

```js
product() {
  let value = p.unary();
```
**Get the first operand from the next-tighter rung.** There is always a first operand, so this is unconditional. `value` is the "running total so far".

```js
  for (;;) {
```
An endless loop. It only ends through a `return`. Read it as "keep folding operands into `value` until something that is not my operator shows up".

```js
    if (p.eat('*')) value = num(value) * num(p.unary());
```
Two things happen in this one line, **in this order**: `p.eat('*')` consumes the operator; then `p.unary()` reads the right-hand operand. Only then is the multiplication performed and stored back into `value`. Because the result goes back into `value` and the loop continues, the *next* operator sees an operand that is the accumulated result: that is left-associativity.

```js
    else if (p.eat('/')) {
      const d = num(p.unary());
      if (d === 0) throw new Error(`divide by zero in ${text}`);
      value = num(value) / d;
    }
```
Division needs a check in between reading the operand and using it, so it gets a block. If you wrote `value = num(value) / num(p.unary())` you would lose the chance to check the divisor.

```js
    else return value;
  }
}
```
**The only exit.** When none of this rung's operators is next, hand the value back *without consuming anything*. Whatever character stopped us is now the caller's problem. This is the single most important line for understanding precedence, because it is what lets `product` decline the `+` in `1+2*3` and let `sum` have it.

**How `value` evolves for `10-2-3`:**

| Loop pass | Next text | Operator found | Operand read | `value` after |
|---|---|---|---|---|
| (before loop) | `10-2-3` | none yet | `10` (first operand) | 10 |
| 1 | `-2-3` | `-` | `2` | `10 - 2 = 8` |
| 2 | `-3` | `-` | `3` | `8 - 3 = 5` |
| 3 | (end) | none: **return** | | **5** |

The word operators work identically, which is why the ladder diagram in Lesson 0 puts `AND`/`MOD` beside `*`/`/` and `OR`/`XOR` beside `+`/`-`: they share a function.

### Try it

Create `try3.mjs`. The second half **traces** the parser: it wraps each rung so you can watch the ladder work.

```js
import { evaluate, parser } from './macro.mjs';
const table = { 1: 5, 2: -3.5 };
const vars = { get: (n) => table[n] ?? null };
const show = (expr) => {
  try { console.log(expr.padEnd(10), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(10), '-> ERROR:', e.message); }
};
['1+2*3', '10-2-3', '2*3+4*5', '[1+2]*3', '-2*3', '10/4', '10/0', '7MOD3', '6AND3', '4OR1', '5XOR1', '#1+#2*2', '#9+1', '1+2EQ3'].forEach(show);

console.log('\n--- trace of 1+2*3 ---');
const p = parser('1+2*3', vars);
let depth = 0;
for (const name of ['compare', 'sum', 'product', 'unary', 'primary']) {
  const original = p[name];
  p[name] = () => {
    console.log(`${'  '.repeat(depth)}${name}  (next: "${'1+2*3'.slice(p.pos)}")`);
    depth++;
    const result = original();
    depth--;
    console.log(`${'  '.repeat(depth)}└ ${name} = ${result}`);
    return result;
  };
}
p.compare();
```

**Expected output:**

```text
1+2*3      -> 7
10-2-3     -> 5
2*3+4*5    -> 26
[1+2]*3    -> 9
-2*3       -> -6
10/4       -> 2.5
10/0       -> ERROR: divide by zero in 10/0
7MOD3      -> 1
6AND3      -> 2
4OR1       -> 5
5XOR1      -> 4
#1+#2*2    -> -2
#9+1       -> 1
1+2EQ3     -> ERROR: cannot read "EQ3" in 1+2EQ3

--- trace of 1+2*3 ---
compare  (next: "1+2*3")
  sum  (next: "1+2*3")
    product  (next: "1+2*3")
      unary  (next: "1+2*3")
        primary  (next: "1+2*3")
        └ primary = 1
      └ unary = 1
    └ product = 1
    product  (next: "2*3")
      unary  (next: "2*3")
        primary  (next: "2*3")
        └ primary = 2
      └ unary = 2
      unary  (next: "3")
        primary  (next: "3")
        └ primary = 3
      └ unary = 3
    └ product = 6
  └ sum = 7
└ compare = 7
```

### How to read the trace

Indentation is depth in the call stack. A line like `product (next: "2*3")` means "`product` was just called, and the unread text is `2*3`". The `└ product = 6` line shows what it handed back.

Follow `1+2*3`:

1. `compare` calls `sum`, which calls `product`, which calls `unary`, which calls `primary`. It reads `1`.
2. Back in `sum`: the next character is `+`, so `sum` calls `product` *again*.
3. This second `product` calls `unary` for `2`, sees `*`, and calls `unary` again for `3`. It returns **6**.
4. `sum` computes `1 + 6 = 7`.

The `*` was resolved *inside* the second `product`, before `sum` ever got to look at it. That is all precedence is.

Also notice the last test, `1+2EQ3`, fails with `cannot read "EQ3"`. That is our to-do list for Lesson 4. And `#9+1` is `1`: vacant acts as 0 in arithmetic.

**Checkpoint:** `macro.mjs` is 95 lines.

### Check yourself

What does `2-3-4` give? What would it give if `sum` combined right-to-left instead?

<details><summary>Answer</summary>

Left-to-right gives `(2-3)-4 = -5` (verified by running it). Right-to-left would give `2-(3-4) = 3`. The `for (;;)` loop that folds into a running `value` is what produces the left-to-right behavior.

</details>


### Go deeper

#### A reusable tracer: `trace.mjs`

The tracer in `try3.mjs` is too useful to bury in one test file, so here it is as a module you can use for the rest of the course. Save as `trace.mjs`:

```js
// trace.mjs: wrap the grammar rungs of a parser so every call and return is printed.
import { parser } from './macro.mjs';

export function traced(text, vars, rungs = ['compare', 'sum', 'product', 'unary', 'primary']) {
  const p = parser(text, vars);
  let depth = 0;
  for (const name of rungs) {
    const original = p[name];
    p[name] = () => {
      console.log(`${'  '.repeat(depth)}${name}  (next: "${text.slice(p.pos)}")`);
      depth++;
      const result = original();
      depth--;
      console.log(`${'  '.repeat(depth)}└ ${name} = ${result}`);
      return result;
    };
  }
  return p;
}
```

How it works, because it is a nice small example of *wrapping*: for each rung name, it takes the original method, and replaces `p[name]` with a function that prints "entering", calls the original, prints "returning", and passes the result along. Because every rung calls the others as `p.something()` (not as a captured local variable), replacing the property on `p` is enough to intercept every call. This is another benefit of the `p.` style from Lesson 1.

Create `try3b.mjs`:

```js
import { traced } from './trace.mjs';
const vars = { get: () => null };

console.log('=== 2*[3+4]  (a bracket: watch the recursion) ===');
traced('2*[3+4]', vars).compare();

console.log('\n=== 10-2-3  (watch ONE sum call ask product three times) ===');
traced('10-2-3', vars).compare();
```

Run `node try3b.mjs`. **Output:**

```text
=== 2*[3+4]  (a bracket: watch the recursion) ===
compare  (next: "2*[3+4]")
  sum  (next: "2*[3+4]")
    product  (next: "2*[3+4]")
      unary  (next: "2*[3+4]")
        primary  (next: "2*[3+4]")
        └ primary = 2
      └ unary = 2
      unary  (next: "[3+4]")
        primary  (next: "[3+4]")
          compare  (next: "3+4]")
            sum  (next: "3+4]")
              product  (next: "3+4]")
                unary  (next: "3+4]")
                  primary  (next: "3+4]")
                  └ primary = 3
                └ unary = 3
              └ product = 3
              product  (next: "4]")
                unary  (next: "4]")
                  primary  (next: "4]")
                  └ primary = 4
                └ unary = 4
              └ product = 4
            └ sum = 7
          └ compare = 7
        └ primary = 7
      └ unary = 7
    └ product = 14
  └ sum = 14
└ compare = 14

=== 10-2-3  (watch ONE sum call ask product three times) ===
compare  (next: "10-2-3")
  sum  (next: "10-2-3")
    product  (next: "10-2-3")
      unary  (next: "10-2-3")
        primary  (next: "10-2-3")
        └ primary = 10
      └ unary = 10
    └ product = 10
    product  (next: "2-3")
      unary  (next: "2-3")
        primary  (next: "2-3")
        └ primary = 2
      └ unary = 2
    └ product = 2
    product  (next: "3")
      unary  (next: "3")
        primary  (next: "3")
        └ primary = 3
      └ unary = 3
    └ product = 3
  └ sum = 5
└ compare = 5
```

The first trace is Lesson 0's "recursion arrow" made visible: the `primary` that sees `[3+4]` calls `compare`, and you can watch an entire second ladder (`compare > sum > product > unary > primary`) hanging *inside* it, indented one level deeper. The second trace shows the loop: `sum` is entered once, but `product` is entered **three** times beneath it, one for `10`, one for `2`, one for `3`.

**Use it on your own mistakes.** When an expression gives a surprising answer, trace it. The trace is the parser telling you, step by step, what it thought it was doing.

#### Break it

Precedence and associativity feel like facts about arithmetic. They are really facts about *how the functions are wired*. Prove it by changing the wiring. Make three copies of `macro.mjs` and, in each copy, replace the whole `sum()` method:

**`macro_noloop.mjs`: a single `if` instead of a loop**
```js
    sum() {
      let value = p.product();
      if (p.eat('+')) value = num(value) + num(p.product());
      else if (p.eat('-')) value = num(value) - num(p.product());
      return value;
    },
```

**`macro_right.mjs`: recurse instead of looping**
```js
    sum() {
      const left = p.product();
      if (p.eat('+')) return num(left) + num(p.sum());
      if (p.eat('-')) return num(left) - num(p.sum());
      return left;
    },
```

**`macro_flat.mjs`: put `*` on the same rung as `+`, and never call `product`**
```js
    sum() {
      let value = p.unary();
      for (;;) {
        if (p.eat('+')) value = num(value) + num(p.unary());
        else if (p.eat('-')) value = num(value) - num(p.unary());
        else if (p.eat('*')) value = num(value) * num(p.unary());
        else return value;
      }
    },
```

Create `break3.mjs`:

```js
import * as good from './macro.mjs';
import * as noLoop from './macro_noloop.mjs';
import * as right from './macro_right.mjs';
import * as flat from './macro_flat.mjs';

const vars = { get: () => null };
const run = (m, expr) => { try { return m.evaluate(expr, vars); } catch (e) { return 'ERROR ' + e.message; } };

for (const expr of ['10-2-3', '2-3-4', '1+2*3']) {
  console.log(`--- ${expr}`);
  console.log('  real sum (loop)      :', run(good, expr));
  console.log('  one if, no loop      :', run(noLoop, expr));
  console.log('  right-recursive      :', run(right, expr));
  console.log('  + - * on ONE rung    :', run(flat, expr));
}
```

Run `node break3.mjs`. **Output:**

```text
--- 10-2-3
  real sum (loop)      : 5
  one if, no loop      : ERROR cannot read "-3" in 10-2-3
  right-recursive      : 11
  + - * on ONE rung    : 5
--- 2-3-4
  real sum (loop)      : -5
  one if, no loop      : ERROR cannot read "-4" in 2-3-4
  right-recursive      : 3
  + - * on ONE rung    : -5
--- 1+2*3
  real sum (loop)      : 7
  one if, no loop      : 7
  right-recursive      : 7
  + - * on ONE rung    : 9
```

What you are looking at:

- **No loop:** `10-2-3` fails. One `if` handles one operator, so the second `-` is left over and `evaluate` complains. The loop is what lets a rung take *any number* of operators.
- **Right-recursive:** `10-2-3` gives **11** (that is `10-(2-3)`), and `2-3-4` gives 3. It "works" and is *wrong*, and silently wrong is the dangerous kind. Recursion on the right-hand side groups to the right; the loop groups to the left. (`1+2*3` is still 7 because `product` is still a tighter rung.)
- **One rung for everything:** `1+2*3` gives **9**. With `*` and `+` on the same rung they are handled strictly left to right, as `(1+2)*3`. Precedence *is* the number of rungs and which operators share one.

#### Exercises

**3.1 Predict.** With no variables involved, work these out by hand, then run them. Pay attention to which rung each operator lives on.

| Expression | Your prediction |
|---|---|
| `2*3MOD4` | |
| `2+3MOD4` | |
| `1+2AND3` | |
| `5OR2AND3` | |
| `8/2/2` | |
| `2--3` | |
| `-2MOD3` | |
| `2- -3` | |

<details><summary>Answers and reasoning</summary>

| Expression | Result | Why |
|---|---|---|
| `2*3MOD4` | **2** | `*` and `MOD` share a rung: left to right, `(2*3) MOD 4 = 6 MOD 4`. |
| `2+3MOD4` | **5** | `MOD` is tighter than `+`: `2 + (3 MOD 4) = 2 + 3`. |
| `1+2AND3` | **3** | `AND` lives with `*`, so it binds tighter than `+`: `1 + (2 AND 3) = 1 + 2`. (This is a classic surprise if you expect `AND` to be "low".) |
| `5OR2AND3` | **7** | `AND` before `OR`: `5 OR (2 AND 3) = 5 OR 2 = 7`. |
| `8/2/2` | **2** | Left-associative: `(8/2)/2`, not `8/(2/2) = 8`. |
| `2--3` | **5** | First `-` is binary, second `-` is a unary sign on `3`: `2 - (-3)`. |
| `-2MOD3` | **-2** | The sign belongs to `unary`, which is tighter than `MOD`: `(-2) MOD 3`. JavaScript's `%` keeps the sign of the left side, so `-2`. |
| `2- -3` | **error** | The space. Before Lesson 9 the parser does not skip spaces, so `unary` meets `" "` where it expects a number. |

All verified by running.

</details>

**3.2 Add a power operator `**` (a puzzle).** Fanuc has no `**`, but adding one is the best way to feel how rungs work. Mathematically `-2**2` is `-4` (power binds tighter than a sign) and `2**3**2` is `2**(3**2) = 512` (power is *right*-associative, the opposite of `-`). Where in the ladder does the new rung go, and what shape does it have?

*Hint: it sits between `unary` and `primary`. A right-associative rule recurses on its right-hand side instead of looping.*

<details><summary>Solution</summary>

Add a `power` rung, and make `unary` call `power` instead of `primary`:

```js
    unary() {
      if (p.eat('-')) return -num(p.unary());
      if (p.eat('+')) return num(p.unary());
      return p.power();            // was p.primary()
    },

    power() {
      const base = p.primary();
      if (p.eat('**')) return num(base) ** num(p.unary());
      return base;
    },
```

Create `ex3.mjs`:

```js
import { evaluate } from './macro_power.mjs';
const vars = { get: () => null };
for (const e of ['2**3', '2**3**2', '-2**2', '2**-1', '2*3**2', '2**3*2']) console.log(e.padEnd(8), '->', evaluate(e, vars));
```

Run `node ex3.mjs`. **Output:**

```text
2**3     -> 8
2**3**2  -> 512
-2**2    -> -4
2**-1    -> 0.5
2*3**2   -> 18
2**3*2   -> 16
```

Why each answer comes out right:

- **`-2**2` is -4**: `unary` eats the `-` first, then calls itself, which reaches `power`, which computes `2**2 = 4`; the `-` is applied to that. The sign wraps the power.
- **`2**3**2` is 512**: after `**`, the right-hand side is read by `p.unary()`, which goes back down to `power` and reads `3**2` first. Recursing on the right is exactly what produced `10-(2-3)` in the broken `macro_right.mjs`, but here it is the behavior we *want*.
- **`2**-1` works**: because the right-hand side goes through `unary`, a sign is allowed there.
- **`2*3**2` is 18**: `product` asks `unary` for each operand, and `power` is inside `unary`, so `3**2` is finished before `*` sees it.
- **Why `**` does not collide with `*`:** `power` runs *inside* the operand, so by the time `product` looks for a `*`, any `**` has already been consumed. If it were the other way around, `product` would eat one `*` of `**` and fail. **Which function is standing there when the character appears** decides everything (Lesson 0.3).

</details>

---

## Lesson 4: Comparisons and "vacant"

**Goal:** add the top rung, `compare`, for `EQ NE GT GE LT LE`. Each yields `1` (true) or `0` (false), as in Fanuc.

### Two new ideas

**1. Comparisons must see the raw values.** Every earlier rung wraps operands in `num(...)`. `compare` deliberately does not for `EQ` and `NE`, because for those, *vacant is not equal to 0*. If we had converted first, `#9EQ0` would be true, and that is wrong.

**2. Tolerance.** Computers cannot store `0.1` exactly, and `0.1+0.2` is `0.30000000000000004`. A machinist writing `[#1+#2 EQ 0.3]` expects true. So values within `1e-9` count as equal. (This is a design choice in this code. Pick a tolerance that suits your machine's resolution.)

### Code

**Replace** the stub with the real thing:

```js
    compare() {
      const left = p.sum();
      for (const op of ['EQ', 'NE', 'GT', 'GE', 'LT', 'LE']) {
        if (p.eat(op)) {
          const right = p.sum();
          const equal = left === right || (left !== null && right !== null && Math.abs(left - right) < 1e-9);
          if (op === 'EQ') return equal ? 1 : 0;
          if (op === 'NE') return equal ? 0 : 1;
          const a = num(left);
          const b = num(right);
          return { GT: a > b, GE: a >= b - 1e-9, LT: a < b, LE: a <= b + 1e-9 }[op] ? 1 : 0;
        }
      }
      return left;
    },
```

It evaluates the left side once, tries each operator in turn, and if one matches it evaluates the right side. `compare` happens at most once per expression: there is no chaining.

### Line by line

```js
compare() {
  const left = p.sum();
```
Evaluate the left side **once**, and keep the *raw* value (it may be `null`). Everything below depends on not having converted it yet.

```js
  for (const op of ['EQ', 'NE', 'GT', 'GE', 'LT', 'LE']) {
    if (p.eat(op)) {
```
Try each operator. Unlike `+` versus `++` problems you might imagine, none of these six is a prefix of another, so their order does not matter. (Contrast the function-name problem in Lesson 5 and the `/` versus `//` trap in Lesson 9.)

```js
      const right = p.sum();
      const equal = left === right || (left !== null && right !== null && Math.abs(left - right) < 1e-9);
```
The heart of the lesson. Read it as two ways to be equal:

1. `left === right`: exactly identical. This is the **only** way two vacants are equal (`null === null`), and also catches identical numbers.
2. Both are real numbers *and* within `1e-9` of each other: the tolerance.

If exactly one side is `null`, neither clause can be true: vacant is never equal to a number, including 0.

| `left` | `right` | `equal` | Because |
|---|---|---|---|
| `null` | `null` | true | clause 1 |
| `null` | `0` | **false** | clause 1 fails, clause 2 needs both non-null |
| `0.30000000000000004` | `0.3` | true | clause 2: difference ≈ 5e-17 |
| `5` | `5.01` | false | difference 0.01 is bigger than `1e-9` |

```js
      if (op === 'EQ') return equal ? 1 : 0;
      if (op === 'NE') return equal ? 0 : 1;
```
Comparisons return **numbers**, `1` and `0`, not `true`/`false`: Fanuc has no booleans, and the result must be usable in later arithmetic like `[#1GT3]*10`.

```js
      const a = num(left);
      const b = num(right);
      return { GT: a > b, GE: a >= b - 1e-9, LT: a < b, LE: a <= b + 1e-9 }[op] ? 1 : 0;
```
Now, and only now, vacant becomes 0. The object literal computes all four answers up front and `[op]` picks the one wanted. It works, but it is a little clever for what it does; Lesson 9 replaces it with a table of functions. Keep an eye on the constants: `GE` and `LE` carry `1e-9`, `GT` and `LT` do not. That asymmetry is a bug, and Lesson 8 shows why.

```js
    }
  }
  return left;
}
```
**No operator found: return the left value untouched.** This is the exit that makes `compare` transparent for ordinary expressions: for `1+2` it just passes `3` upward, and for `#9` it passes `null` upward unchanged.

### Try it

Create `try4.mjs`:

```js
import { evaluate } from './macro.mjs';
const table = { 1: 5 };
const vars = { get: (n) => table[n] ?? null };
const show = (expr) => {
  try { console.log(expr.padEnd(14), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(14), '-> ERROR:', e.message); }
};
['5EQ5', '#1GT3', '#1LT3', '[#1+1]EQ6', '0.1+0.2EQ0.3', '#9EQ0', '#9EQ#9', '#9NE0', '#9GE0', '#9GT0', '1LT2LT3'].forEach(show);
console.log('JS says 0.1+0.2 === 0.3 ->', 0.1 + 0.2 === 0.3, '(and the sum is', 0.1 + 0.2 + ')');
```

**Expected output:**

```text
5EQ5           -> 1
#1GT3          -> 1
#1LT3          -> 0
[#1+1]EQ6      -> 1
0.1+0.2EQ0.3   -> 1
#9EQ0          -> 0
#9EQ#9         -> 1
#9NE0          -> 1
#9GE0          -> 1
#9GT0          -> 0
1LT2LT3        -> ERROR: cannot read "LT3" in 1LT2LT3
JS says 0.1+0.2 === 0.3 -> false (and the sum is 0.30000000000000004)
```

### What happened

- `0.1+0.2EQ0.3` is `1`, even though plain JavaScript says `0.1+0.2 === 0.3` is `false`. That is the tolerance working.
- `#9EQ0` is `0` but `#9EQ#9` is `1`. Vacant equals vacant, and vacant does not equal zero.
- `#9GE0` is `1` and `#9GT0` is `0`. The *ordering* comparisons use `num`, so vacant acts as 0 there. Same operand, different treatment, depending on the operator.
- `1LT2LT3` fails: after `1LT2` produces `1`, `evaluate` finds `LT3` unread. A chain like that has no meaning here, and the error says so.

Look back at the `{ GT: ..., GE: ..., LT: ..., LE: ... }[op]` line: it builds all four answers and picks one. That works but is a little odd, and notice that `GE` and `LE` get the tolerance while `GT` and `LT` do not. **Hold that thought for Lesson 8.**

**Checkpoint:** `macro.mjs` is 106 lines. The ladder is now complete.

### Check yourself

With `#9` vacant, predict `#9LE0` and `#9LT0`.

<details><summary>Answer</summary>

`#9LE0` is `1` (0 is less than or equal to 0) and `#9LT0` is `0` (0 is not less than 0). Both treat vacant as 0, as `#9GE0` and `#9GT0` did.

</details>


### Go deeper

#### Break it

Copy `macro.mjs` to `macro_eps0.mjs` and replace every `1e-9` in `compare` with `0` (three places). Then see what tolerance was protecting you from:

Create `break4.mjs`:

```js
import * as good from './macro.mjs';
import * as strict from './macro_eps0.mjs';

const table = { 1: 0.1, 2: 0.2 };
const vars = { get: (n) => table[n] ?? null };
const run = (m, e) => { try { return m.evaluate(e, vars); } catch (x) { return 'ERROR'; } };

for (const e of ['0.1+0.2EQ0.3', 'SIN[30]EQ0.5', 'COS[90]EQ0', '#1+#2EQ0.3', '#1+#2LE0.3']) {
  console.log(e.padEnd(14), 'tolerance 1e-9:', run(good, e), '  tolerance 0:', run(strict, e));
}
```

Run `node break4.mjs`. **Output:**

```text
0.1+0.2EQ0.3   tolerance 1e-9: 1   tolerance 0: 0
SIN[30]EQ0.5   tolerance 1e-9: 1   tolerance 0: 0
COS[90]EQ0     tolerance 1e-9: 1   tolerance 0: 0
#1+#2EQ0.3     tolerance 1e-9: 1   tolerance 0: 0
#1+#2LE0.3     tolerance 1e-9: 1   tolerance 0: 0
```

With no tolerance, every one of these "obviously true" comparisons is false, except that `GE` happens to survive (not shown) because `0.30000000000000004 >= 0.3` is true by accident of which way the rounding error went. That asymmetry, where the *same* floating-point noise helps one operator and hurts another, is exactly why a tolerance has to be applied **consistently** or not at all. Keep that sentence in mind for Lesson 8.

The tolerance size is a judgment call. `1e-9` is far smaller than any real machining resolution (typically 1e-3 or 1e-4 in the units used), so it only absorbs floating-point noise, not genuine differences. If your control rounds to the least input increment, your tolerance may reasonably be bigger.

#### Exercises

**4.1 Vacant drill.** With `#9` and `#8` both vacant, predict each result, then run:

| Expression | Prediction |
|---|---|
| `#9NE#9` | |
| `#9EQ0` | |
| `#9GE#8` | |
| `[#9]EQ[#8]` | |
| `#9EQ-#9` | |
| `#9LT#8` | |

<details><summary>Answers</summary>

| Expression | Result | Why |
|---|---|---|
| `#9NE#9` | **0** | vacant equals vacant, so "not equal" is false |
| `#9EQ0` | **0** | vacant is not equal to zero |
| `#9GE#8` | **1** | ordering operators use `num`: `0 >= 0` |
| `[#9]EQ[#8]` | **1** | brackets pass the vacant through untouched, so still vacant equals vacant |
| `#9EQ-#9` | **0** | the surprise: `-#9` goes through `unary`, which applies `num`, so it is the *number* `-0`, not vacant. Vacant is not equal to a number |
| `#9LT#8` | **0** | `0 < 0` is false |

All verified. The fifth one is the lesson in miniature: any arithmetic, even a sign, turns vacant into a real number.

</details>

**4.2 Find the inconsistency before Lesson 8 tells you.** Predict `1.0000000001EQ1` and `1.0000000001GT1`. Both ask about the same two numbers, which differ by 1e-10, far less than the tolerance. Should the answers agree? Do they?

<details><summary>Answer</summary>

They should agree (if the two numbers are "equal", then neither is "greater"), but they do not. `1.0000000001EQ1` is `1` (equal, thanks to the tolerance) **and** `1.0000000001GT1` is also `1` (greater, because `GT` was written as plain `a > b` with no tolerance). The same pair of numbers is simultaneously equal and greater. Lesson 8 lists this as finding 2 and Lesson 9 fixes it.

</details>

---

## Lesson 5: Functions

**Goal:** teach `primary` to recognize `SIN[...]`, `SQRT[...]`, `POW[a,b]` and the three forms of `ATAN`.

### Three new ideas

**1. A table instead of an `if` per function.** `FUNCTIONS` maps a name to a JavaScript function. One loop handles all of them.

**2. Fanuc trig uses degrees; JavaScript uses radians.** Two helpers, `rad` and `deg`, convert. `SIN[30]` becomes `Math.sin(rad(30))`.

**3. Why the bracket is part of the name we look for.** The loop peeks for `SQR[` (not `SQR`). Function names can be prefixes of other names: `SQR` is the front of `SQRT`. If the loop looked for plain `SQR` and then demanded a `[`, whether `SQRT[16]` worked would depend on **which of the two comes first in the table**. With `SQRT` first it would work, by luck; with `SQR` first it would fail on the `T`. (You will see both happen in *Break it* below.) Including the `[` in what we look for makes the match unambiguous, so the order of the table stops mattering. A good rule: *make the thing you match specific enough that no other entry can match the same text.*

`ATAN` and `POW` do not fit the one-argument table, so `primary` handles them separately, *before* the loop. `ATAN` has three spellings: `ATAN[a]`, `ATAN[a,b]` and Fanuc's `ATAN[a]/[b]` (which means "atan2", not "divide").

### Code

At the top of the file (below `num`), add the helpers and table:

```js
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const FUNCTIONS = {
  SIN: (a) => Math.sin(rad(a)),
  COS: (a) => Math.cos(rad(a)),
  TAN: (a) => Math.tan(rad(a)),
  ASIN: (a) => deg(Math.asin(a)),
  ACOS: (a) => deg(Math.acos(a)),
  SQRT: Math.sqrt,
  SQR: Math.sqrt,
  ABS: Math.abs,
  ROUND: (a) => Math.sign(a) * Math.round(Math.abs(a)),
  FIX: (a) => Math.sign(a) * Math.floor(Math.abs(a)),
  FUP: (a) => Math.sign(a) * Math.ceil(Math.abs(a)),
  LN: Math.log,
  EXP: Math.exp,
  ADP: (a) => a,
  BIN: (a) => a,
  BCD: (a) => a,
};
```

In `primary`, insert this block **just before** the final `return p.number();`:

```js
      if (p.eat('ATAN')) {
        p.expect('[');
        const a = num(p.compare());
        if (p.eat(',')) {
          const b = num(p.compare());
          p.expect(']');
          return deg(Math.atan2(a, b)); // ATAN[a,b]
        }
        p.expect(']');
        if (p.eat('/[')) {
          const b = num(p.compare());
          p.expect(']');
          return deg(Math.atan2(a, b)); // ATAN[a]/[b]
        }
        return deg(Math.atan(a));
      }
      if (p.eat('POW[')) {
        const a = num(p.compare());
        p.expect(',');
        const b = num(p.compare());
        p.expect(']');
        return a ** b;
      }
      for (const [name, fn] of Object.entries(FUNCTIONS)) {
        if (p.peek(`${name}[`)) {
          p.pos += name.length + 1;
          const v = fn(num(p.compare()));
          p.expect(']');
          return v;
        }
      }
```

Two things worth understanding here:

- `ROUND` is `Math.sign(a) * Math.round(Math.abs(a))`. JavaScript's own `Math.round(-2.5)` gives `-2` (it rounds halves toward positive infinity), but this code rounds halves *away from zero*. Working on the absolute value and restoring the sign gives that behavior.
- `FIX` truncates toward zero and `FUP` rounds away from zero, with the same sign trick.

### Line by line

**The helpers and the table.**

```js
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
```
Degrees to radians and back. `SIN: (a) => Math.sin(rad(a))` reads "convert the angle to radians, then call JavaScript's sine". The *inverse* functions go the other way: `ASIN: (a) => deg(Math.asin(a))` returns an angle, so it converts the result.

```js
SQRT: Math.sqrt,
SQR: Math.sqrt,
```
A table entry can be any function, including a built-in one passed by name. Two names, one function: Fanuc accepts both spellings.

```js
ROUND: (a) => Math.sign(a) * Math.round(Math.abs(a)),
```
Round the *size*, then put the sign back. This makes halves round away from zero: `ROUND[-2.5]` is `-3`, where bare `Math.round(-2.5)` would give `-2`.

**The `ATAN` block** (before the table loop, because `ATAN` can take different shapes):

```js
if (p.eat('ATAN')) {
  p.expect('[');
  const a = num(p.compare());
```
Eat the name, require the bracket, read the first argument as a full expression (that is the recursion).

```js
  if (p.eat(',')) {              // ATAN[a,b]
    const b = num(p.compare());
    p.expect(']');
    return deg(Math.atan2(a, b));
  }
```
A comma means two arguments: the "atan2" form.

```js
  p.expect(']');                  // close the first bracket
  if (p.eat('/[')) {              // ATAN[a]/[b]
    const b = num(p.compare());
    p.expect(']');
    return deg(Math.atan2(a, b));
  }
  return deg(Math.atan(a));       // ATAN[a]
}
```
Otherwise close the bracket and look for the odd Fanuc spelling `/[`. Note that it looks for the **two characters together**: `/` alone is ordinary division, handled later by `product`. Only `/[` triggers atan2. If neither extra form is there, it is plain `atan`.

**The `POW` block:**

```js
if (p.eat('POW[')) {
  const a = num(p.compare());
  p.expect(',');
  const b = num(p.compare());
  p.expect(']');
  return a ** b;
}
```
Same pattern: eat, first argument, comma, second argument, close. Here the bracket is included in the string given to `eat`, so there is no separate `expect('[')`.

**The table loop:**

```js
for (const [name, fn] of Object.entries(FUNCTIONS)) {
  if (p.peek(`${name}[`)) {
    p.pos += name.length + 1;
    const v = fn(num(p.compare()));
    p.expect(']');
    return v;
  }
}
```
For each entry: *peek* for the name plus bracket (not eating yet). If it is there, step over `name.length + 1` characters (the `+ 1` is the bracket), read the argument, call the table's function on it, check the closing bracket. If no entry matches, fall out of the loop and on to `return p.number()`, which is why `FOO[1]` ends up with "expected a number".

**Where the new block goes in `primary`:** after `[` and `#`, before the final `number()`. The order *between* `[`, `#`, `ATAN`, `POW` and the loop does not matter: they begin with different characters or different spellings. The only thing that must come last is `number()`, the catch-all.

### Try it

Create `try5.mjs`:

```js
import { evaluate } from './macro.mjs';
const table = { 1: 5 };
const vars = { get: (n) => table[n] ?? null };
const show = (expr) => {
  try { console.log(expr.padEnd(16), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(16), '-> ERROR:', e.message); }
};
['SIN[30]', 'SIN[30]EQ0.5', 'COS[90]', 'COS[90]EQ0', 'SQRT[16]', 'ABS[-3]', 'ROUND[2.5]', 'ROUND[-2.5]', 'FIX[-2.7]', 'FUP[2.1]',
 'POW[2,10]', 'ATAN[1]', 'ATAN[1]/[1]', 'ATAN[1,-1]', 'ATAN[1]/2', '#1*COS[60]', 'SIN[#1*6]', 'FOO[1]'].forEach(show);
```

**Expected output:**

```text
SIN[30]          -> 0.49999999999999994
SIN[30]EQ0.5     -> 1
COS[90]          -> 6.123233995736766e-17
COS[90]EQ0       -> 1
SQRT[16]         -> 4
ABS[-3]          -> 3
ROUND[2.5]       -> 3
ROUND[-2.5]      -> -3
FIX[-2.7]        -> -2
FUP[2.1]         -> 3
POW[2,10]        -> 1024
ATAN[1]          -> 45
ATAN[1]/[1]      -> 45
ATAN[1,-1]       -> 135
ATAN[1]/2        -> 22.5
#1*COS[60]       -> 2.5000000000000004
SIN[#1*6]        -> 0.49999999999999994
FOO[1]           -> ERROR: expected a number at "FOO[1]" in FOO[1]
```

### What happened

- `SIN[30]` is `0.49999999999999994`, not `0.5`. This is floating-point noise from converting to radians. It is also the reason Lesson 4's tolerance exists: `SIN[30]EQ0.5` is `1`. The two lessons support each other.
- `COS[90]` is `6.1e-17`, not `0`, and `COS[90]EQ0` is `1`. Same story.
- `ROUND[-2.5]` is `-3`, confirming the sign trick.
- `ATAN[1,-1]` is `135`: `atan2` keeps track of the quadrant, which plain `atan` cannot.
- `FOO[1]` fails with `expected a number at "FOO[1]"`. Correct, but a poor message: it does not say "unknown function". We will fix that in Lesson 9.

**Checkpoint:** `macro.mjs` is 158 lines.

### Check yourself

`ATAN[1]/2` gives `22.5` but `ATAN[1]/[2]` gives about `26.565`. Why?

<details><summary>Answer</summary>

In `ATAN[1]/2`, after reading `ATAN[1]` the code checks `eat('/[')`. The next two characters are `/2`, not `/[`, so it returns plain `atan(1) = 45`, and the ordinary `/2` is handled one rung up by `product`: `45/2 = 22.5`. With `/[2]` the `/[` matches, so the whole thing is `atan2(1, 2)`, about `26.565` degrees. A single bracket changes the meaning, which is exactly how Fanuc defines it.

</details>


### Go deeper

#### Break it

Copy `macro.mjs` to `macro_naive.mjs` and change the loop so it looks for the bare name and then demands the bracket separately:

```js
      for (const [name, fn] of Object.entries(FUNCTIONS)) {
        if (p.peek(name)) {            // was: p.peek(`${name}[`)
          p.pos += name.length;        // was: name.length + 1
          p.expect('[');               // new line
          const v = fn(num(p.compare()));
          p.expect(']');
          return v;
        }
      }
```

Make a second copy, `macro_naive2.mjs`, with the same change **and** the two entries `SQRT` and `SQR` swapped in `FUNCTIONS` (so `SQR` is listed first).

Create `break5.mjs`:

```js
import * as good from './macro.mjs';
import * as naive from './macro_naive.mjs';     // peek(name), SQRT listed before SQR
import * as naive2 from './macro_naive2.mjs';   // peek(name), SQR listed before SQRT

const vars = { get: () => null };
const run = (m, e) => { try { return m.evaluate(e, vars); } catch (x) { return 'ERROR ' + x.message; } };

console.log('real code          :', run(good, 'SQRT[16]'));
console.log('naive, SQRT first  :', run(naive, 'SQRT[16]'));
console.log('naive, SQR first   :', run(naive2, 'SQRT[16]'));
```

Run `node break5.mjs`. **Output:**

```text
real code          : 4
naive, SQRT first  : 4
naive, SQR first   : ERROR expected [ at "T[16]" in SQRT[16]
```

This is the lesson hiding inside "why is the bracket part of the name?". The naive version's correctness depends on **an invisible fact: the order of keys in an object**. Someone tidying the table into alphabetical order, with `SQR` before `SQRT`, would break `SQRT[...]` without touching any logic, and no test of `SQR` would notice. Whenever you match against a *list* with early exit, ask: **can an earlier entry match the front of a later one?** If yes, either order the list longest-first or make each entry unambiguous (as the `[` does).

#### Probing the edges

What happens with malformed or unusual calls? Gather evidence before assuming:

Create `probe5.mjs`:

```js
import { evaluate } from './macro.mjs';
const vars = { get: () => null };
const show = (expr) => {
  try { console.log(expr.padEnd(15), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(15), '-> ERROR:', e.message); }
};
['ATAN[1', 'ATAN1', 'ATAN[1,2,3]', 'POW[2,3,4]', 'POW[2]', 'POW[-8,1/3]',
 'ROUND[0.5]', 'ROUND[-0.4]', 'ATAN[1]/[1]+1', 'SIN[SIN[30]]'].forEach(show);
```

Run `node probe5.mjs`. **Output:**

```text
ATAN[1          -> ERROR: expected ] at "end" in ATAN[1
ATAN1           -> ERROR: expected [ at "1" in ATAN1
ATAN[1,2,3]     -> ERROR: expected ] at ",3]" in ATAN[1,2,3]
POW[2,3,4]      -> ERROR: expected ] at ",4]" in POW[2,3,4]
POW[2]          -> ERROR: expected , at "]" in POW[2]
POW[-8,1/3]     -> NaN
ROUND[0.5]      -> 1
ROUND[-0.4]     -> -0
ATAN[1]/[1]+1   -> 46
SIN[SIN[30]]    -> 0.008726535498373933
```

- `ATAN[1` and `ATAN1` give clear "expected" messages: the structure is checked at every step.
- `ATAN[1,2,3]` and `POW[2,3,4]` are **rejected** (`expected ] at ",3]"`): after two arguments, the parser demands `]`. Remember this; the refactored parser in Lesson 9 does *not* reject them until it is fixed, and that is a good story.
- `POW[-8,1/3]` is `NaN`: the cube root of -8 has no real answer via `**`, and the NaN just leaks out. Lesson 8 collects this under finding 1.
- `ROUND[-0.4]` is `-0`: the sign trick again produces negative zero. Harmless, like `-#9`.
- `ATAN[1]/[1]+1` is `46`: the atan2 form finishes (`45`), and the `+1` is an ordinary sum above it.
- `SIN[SIN[30]]` works because the argument is a full expression, and a function call is itself a `primary`: functions nest for free through the recursion.

#### Exercises

**5.1 Add a `SIGN` function.** `SIGN[x]` should give `-1`, `0` or `1`. How many lines do you change?

<details><summary>Solution</summary>

One line in `FUNCTIONS`:

```js
  SIGN: Math.sign,
```

That is the whole point of a table: no new `if`, no new parsing code.

Create `ex5.mjs`:

```js
import { evaluate } from './macro_sign.mjs';
const vars = { get: () => null };
for (const e of ['SIGN[-4]', 'SIGN[0]', 'SIGN[9]*3', 'SIGN[#9]']) console.log(e.padEnd(10), '->', evaluate(e, vars));
```

Run `node ex5.mjs`. **Output:**

```text
SIGN[-4]   -> -1
SIGN[0]    -> 0
SIGN[9]*3  -> 3
SIGN[#9]   -> 0
```

Note `SIGN[#9]` is `0`: the argument goes through `num`, so vacant arrives as 0.

</details>

**5.2 A function you *cannot* add with the table.** Try to add `MAX[a,b]` (the larger of two numbers) using only the `FUNCTIONS` table. What goes wrong, and what would you need to change?

<details><summary>Answer</summary>

Every function in the table is called as `fn(num(p.compare()))`: it receives exactly **one** argument, read by a single `compare()`, followed straight away by `expect(']')`. A comma would cause `expected ]`. Two-argument functions need to read `compare`, a comma, `compare`. That is why `POW` and `ATAN` were special-cased *outside* the table. It is also the design flaw Lesson 9 fixes: one `call` routine that reads a comma-separated argument list for *any* function, with two small tables (`ONE_ARG` and `TWO_ARG`) saying which names accept which count.

</details>

---

## Lesson 6: Reading address words

**Goal:** parse a whole line like `G10L2P#23X[#1+1.]` into `[{letter:'G', value:10}, ...]`.

### The idea

An NC line is a series of *words*: a letter followed by a value. The value is deliberately **not** a general expression. It is one of: a signed number (`-5`, `.5`), a variable (`#101`, `-#101`), or a bracketed expression (`[#1+1.]`). `X1+2` is not legal; you must write `X[1+2]`. That is why `wordValue` is tiny, and why it reuses `primary` for anything starting with `#` or `[`.

This is the payoff of the cursor design: `readWords` is a different job than `evaluate`, but it reuses the exact same `parser`, `primary`, and `compare`.

### Code

Add `wordValue` to `p`:

```js
    wordValue() {
      if (p.eat('-')) return -num(p.wordValue());
      if (p.eat('+')) return num(p.wordValue());
      if (p.peek('#') || p.peek('[')) return p.primary();
      return p.number();
    },
```

After `evaluate`, add:

```js
export function readWords(code, vars) {
  const words = [];
  const p = parser(code, vars);
  while (p.pos < code.length) {
    const letter = code[p.pos];
    if (!/[A-Z]/.test(letter)) throw new Error(`cannot read "${code.slice(p.pos)}"`);
    p.pos += 1;
    words.push({ letter, value: p.wordValue() });
  }
  return words;
}
```

`readWords` throws on anything that is not an uppercase letter where a word should start. It does not guess.

### Line by line

```js
wordValue() {
  if (p.eat('-')) return -num(p.wordValue());
  if (p.eat('+')) return num(p.wordValue());
```
Signs, handled by recursion exactly like `unary`. (Why a separate function instead of reusing `unary`? Because `unary` would go on to accept anything `primary` accepts, including function calls like `X-SIN[30]`. A word value is deliberately *narrower*.)

```js
  if (p.peek('#') || p.peek('[')) return p.primary();
```
Notice `peek`, not `eat`. `primary` needs to *see* the `#` or `[` itself to know what to do, so `wordValue` only checks which way to go and delegates without consuming. This **peek-then-delegate** pattern is common: decide who should handle it, hand over the cursor untouched.

```js
  return p.number();
}
```
Otherwise it must be a plain number. Together: a sign, then a variable, bracket or number; nothing else. That narrowness is the rule from the controller: `X1+2` is not legal.

```js
export function readWords(code, vars) {
  const words = [];
  const p = parser(code, vars);
  while (p.pos < code.length) {
```
Keep reading words until the cursor reaches the end. Here `p.pos` is read directly: it is the same state `evaluate` used.

```js
    const letter = code[p.pos];
    if (!/[A-Z]/.test(letter)) throw new Error(`cannot read "${code.slice(p.pos)}"`);
    p.pos += 1;
```
Grab the next character, insist it is a capital letter, then **advance past it**. The advance must come *before* reading the value, since `wordValue` starts at the cursor.

```js
    words.push({ letter, value: p.wordValue() });
  }
  return words;
}
```
Reads the value, makes the word, loops. The shorthand `{ letter, value: ... }` means `{ letter: letter, value: ... }`. Note what is **not** here: nothing about what the words *mean*. `readWords` returns plain data, so a later stage (the editor, the timing model) decides what `G10` or `X6` does.

### Try it

Create `try6.mjs`:

```js
import { readWords } from './macro.mjs';
const table = { 1: 5, 2: -3.5, 23: 3 };
const vars = { get: (n) => table[n] ?? null };
const show = (code) => {
  try { console.log(code.padEnd(18), '->', JSON.stringify(readWords(code, vars))); }
  catch (e) { console.log(code.padEnd(18), '-> ERROR:', e.message); }
};
['G10L2P#23X[#1+1.]', 'X-#2', 'G90G0X-.5', 'X#9', '', 'X10.Y', 'X5!', 'g1'].forEach(show);
```

**Expected output:**

```text
G10L2P#23X[#1+1.]  -> [{"letter":"G","value":10},{"letter":"L","value":2},{"letter":"P","value":3},{"letter":"X","value":6}]
X-#2               -> [{"letter":"X","value":3.5}]
G90G0X-.5          -> [{"letter":"G","value":90},{"letter":"G","value":0},{"letter":"X","value":-0.5}]
X#9                -> [{"letter":"X","value":null}]
                   -> []
X10.Y              -> ERROR: expected a number at "end" in X10.Y
X5!                -> ERROR: cannot read "!"
g1                 -> ERROR: cannot read "g1"
```

### What happened

- `G10L2P#23X[#1+1.]` gives four words. `P#23` looked up variable 23 (value 3), and `X[#1+1.]` is `5 + 1 = 6`.
- `G90G0X-.5` shows two `G` words in one line, and a negative number starting with a dot.
- `X#9` gives `{letter:'X', value:null}`: the word exists but its value is vacant. That is information a caller may need to act on.
- The three failures show three different complaints: a letter with no value (`X10.Y`), a character that is not part of any word (`!`), and a lowercase letter (`g1`; this reader expects its input already upper-cased).

**Checkpoint:** `macro.mjs` is 177 lines. This is the complete original parser. Appendix A has the full listing to compare against.

### Check yourself

Predict `readWords('X[#1]Y-#2', vars)` with `#1 = 5` and `#2 = -3.5`.

<details><summary>Answer</summary>

`[{letter:'X', value:5}, {letter:'Y', value:3.5}]`. For `Y-#2`, `wordValue` eats the `-`, calls itself for `#2` (which is `-3.5`), and negates it to `3.5`. (Verified by running it.)

</details>


### Go deeper

#### Break it

Feed `readWords` things that are *almost* right, and notice **who** complains in each case:

Create `break6.mjs`:

```js
import { readWords } from './macro.mjs';
const table = { 1: 5, 2: -3.5, 23: 3 };
const vars = { get: (n) => table[n] ?? null };
const show = (code) => {
  try { console.log(code.padEnd(14), '->', JSON.stringify(readWords(code, vars))); }
  catch (e) { console.log(code.padEnd(14), '-> ERROR:', e.message); }
};
['X1+2', 'X[1+2]', 'X1.5.5', 'X--5', 'XY5', 'X-', 'X', 'X#1.5', 'N100G1X1.F100.'].forEach(show);
```

Run `node break6.mjs`. **Output:**

```text
X1+2           -> ERROR: cannot read "+2"
X[1+2]         -> [{"letter":"X","value":3}]
X1.5.5         -> ERROR: cannot read ".5"
X--5           -> [{"letter":"X","value":5}]
XY5            -> ERROR: expected a number at "Y5" in XY5
X-             -> ERROR: expected a number at "end" in X-
X              -> ERROR: expected a number at "end" in X
X#1.5          -> [{"letter":"X","value":-3.5}]
N100G1X1.F100. -> [{"letter":"N","value":100},{"letter":"G","value":1},{"letter":"X","value":1},{"letter":"F","value":100}]
```

- **`X1+2`: "cannot read `+2`"**. `wordValue` read `1` and returned. The loop then looked at `+` and demanded a letter. So the complaint comes from `readWords`, not from the number reader. This is the controller's rule enforced by the *shape* of the code: nobody wrote a check for "no operators in word values"; they simply are not in the grammar of `wordValue`.
- **`X1.5.5`: "cannot read `.5`"**. This closes the question from Lesson 1: `number()` reads `1.5`, then `readWords` sees `.5` where it needs a letter. Same mechanism.
- **`X--5` is `5`**: stacked signs work in word values too.
- **`XY5`, `X-`, `X`**: each says "expected a number", at `Y5`, at the end, and at the end. In all three the letter was fine and its value was missing.
- **`X#1.5` is -3.5**: variable 1.5 rounds to variable 2 (Lesson 2's rounding again).
- **`N100G1X1.F100.`** has no spaces and parses fine: `1.` and `100.` end at the next capital letter, because the number regex cannot swallow letters. This is why word values and letters mix so easily in G-code.

#### Exercises

**6.1 Predict.** `readWords('X5.Y-.5Z#9')` with `#9` vacant. Three words: what are the letters and values?

<details><summary>Answer</summary>

`[{X, 5}, {Y, -0.5}, {Z, null}]`. `5.` is the number five (the dot is consumed, Lesson 1 exercise); `-.5` is a sign followed by `.5`; `#9` is vacant, so `Z` is `null`. (Verified.)

</details>

**6.2 Accept lowercase.** `readWords('g1x5.f100')` currently throws, because it only accepts `A-Z`. Make the reader accept lowercase by converting the input. Where should the conversion go, and what could go wrong with converting *everything*?

<details><summary>Solution</summary>

At the top of `readWords`, one line:

```js
export function readWords(code, vars) {
  code = code.toUpperCase();          // new line: must happen BEFORE the parser is created
  const words = [];
  const p = parser(code, vars);
  ...
```

Create `ex6.mjs`:

```js
import { readWords } from './macro_lower.mjs';
const vars = { get: () => null };
console.log(JSON.stringify(readWords('g1x5.f100', vars)));
```

Run `node ex6.mjs`. **Output:**

```text
[{"letter":"G","value":1},{"letter":"X","value":5},{"letter":"F","value":100}]
```

It has to be *before* `parser(code, vars)`, because the parser captures the text it is given. If you upper-cased only the letter test, the function names and `EQ`/`MOD` operators inside brackets would still be lowercase and fail.

What could go wrong: you are changing the meaning of every character in the line. That is fine for G-code, where case is irrelevant, but if a line ever carried text that *is* case-sensitive (a quoted message, a file name in a call), you would corrupt it. Better to do such normalising in the **comment scanner** or a "prepare" step where you know what is code and what is text; that is the argument for the pipeline in Lesson 7.

</details>

---

## Lesson 7: Plugging into the comment scanner

**Goal:** feed the parser real lines from the comment scanner we wrote earlier, and see what the two stages need from each other.

### The scanner (from earlier)

This is the final version from our earlier discussion, in a file of its own. It follows the Fanuc rules you described: a comment is `(`…first `)`, never nests, and `;` is *not* a comment. (I also made comments end at the end of the line. That part is my assumption; check it against your controller.)

Save as `lines.mjs`:

```js
/** Split text into lines, keeping each line's own ending so it can be rebuilt exactly. */
export function splitLines(source) {
  const lines = [];
  const re = /([^\r\n]*)(\r\n|\r|\n|$)/g;
  let m;
  while ((m = re.exec(source)) && m[0]) {
    lines.push({ raw: m[0], content: m[1], line: lines.length + 1 });
  }
  return lines;
}

/** Blank comments to spaces (positions preserved) and report lexical errors.
 *  Fanuc comments are `(...)`, end at the FIRST `)`, don't nest, and don't span lines. */
export function withCommentsBlanked(lines) {
  return lines.map((line) => {
    const problems = [];
    let code = '';
    let inComment = false;
    let openAt = -1;
    for (let col = 0; col < line.content.length; col++) {
      const char = line.content[col];
      if (!inComment) {
        if (char === '(') { inComment = true; openAt = col; code += ' '; }
        else {
          if (char === ')') problems.push({ col, message: 'Unmatched ")" outside a comment' });
          code += char;
        }
      } else {
        if (char === '(') problems.push({ col, message: '"(" inside a comment; the first ")" ends it' });
        if (char === ')') inComment = false;
        code += ' ';
      }
    }
    if (inComment) problems.push({ col: openAt, message: 'Comment not closed on this line' });
    return { ...line, code, problems };
  });
}
```

### First attempt: just connect them

Create `try7a.mjs`. The `(A(B)C)` line is there on purpose:

```js
import { splitLines, withCommentsBlanked } from './lines.mjs';
import { readWords } from './macro.mjs';

const program = `O1000 (DRILL CYCLE)
G90 G0 X10. Y[#1+2.] ;
G10L2P#23X[#1+1.]
G01 X-#2 F[#1*100] (FEED)
G0 Z5. ; RETRACT
(A(B)C)
`;
const table = { 1: 5, 2: -3.5, 23: 3 };
const vars = { get: (n) => table[n] ?? null };

for (const l of withCommentsBlanked(splitLines(program))) {
  try { console.log(l.line, JSON.stringify(readWords(l.code, vars))); }
  catch (e) { console.log(l.line, 'ERROR:', e.message.slice(0, 60)); }
}
```

**Expected output:**

```text
1 ERROR: cannot read "              "
2 ERROR: cannot read " G0 X10. Y[#1+2.] ;"
3 [{"letter":"G","value":10},{"letter":"L","value":2},{"letter":"P","value":3},{"letter":"X","value":6}]
4 ERROR: cannot read " X-#2 F[#1*100]       "
5 ERROR: cannot read " Z5. ; RETRACT"
6 ERROR: cannot read "     C)"
```

Almost everything fails, even line 1, which is just `O1000` and a comment. Why?

The scanner **blanks** comments to spaces to keep character positions unchanged. That is a good decision for the editor. But now `code` contains runs of spaces, and `readWords` expects the first character at every word to be a letter. Spaces appear in ordinary lines too (`G90 G0 X10.`). Line 3 passed only because it happens to contain no spaces at all.

The fix belongs *between* the two stages. **Fanuc ignores spaces**, so remove them before parsing. And `;` ends the block, so it is not part of any word.

### Second attempt: a `prepare` step

Create `try7b.mjs`:

```js
import { splitLines, withCommentsBlanked } from './lines.mjs';
import { readWords } from './macro.mjs';

const program = `O1000 (DRILL CYCLE)
G90 G0 X10. Y[#1+2.] ;
G10L2P#23X[#1+1.]
G01 X-#2 F[#1*100] (FEED)
G0 Z5. ; RETRACT
(A(B)C)
`;
const table = { 1: 5, 2: -3.5, 23: 3 };
const vars = { get: (n) => table[n] ?? null };

// Fanuc ignores spaces, and ";" ends the block. Neither belongs to a word.
const prepare = (code) => code.replace(/\s+/g, '').replace(/;$/, '');

for (const l of withCommentsBlanked(splitLines(program))) {
  const issues = l.problems.map((p) => `col ${p.col}: ${p.message}`);
  try {
    console.log(l.line, JSON.stringify(readWords(prepare(l.code), vars)));
  } catch (e) {
    console.log(l.line, 'ERROR:', e.message);
  }
  if (issues.length) console.log('  scanner:', issues.join(' | '));
}
```

**Expected output:**

```text
1 [{"letter":"O","value":1000}]
2 [{"letter":"G","value":90},{"letter":"G","value":0},{"letter":"X","value":10},{"letter":"Y","value":7}]
3 [{"letter":"G","value":10},{"letter":"L","value":2},{"letter":"P","value":3},{"letter":"X","value":6}]
4 [{"letter":"G","value":1},{"letter":"X","value":3.5},{"letter":"F","value":500}]
5 ERROR: cannot read ";RETRACT"
6 ERROR: expected a number at ")" in C)
  scanner: col 2: "(" inside a comment; the first ")" ends it | col 6: Unmatched ")" outside a comment
```

### What happened

- Lines 1 to 4 now parse. Line 2 ends with a `;` which `prepare` strips because it is the end-of-block marker.
- **Line 5 fails exactly as your controller would.** `G0 Z5. ; RETRACT` is not "a move plus a comment". It is a move, an end of block, and then the junk word `RETRACT`. You pointed out that `;` is not a comment in Fanuc; this is that fact showing up in the output: `cannot read ";RETRACT"`.
- **Line 6 is caught twice, independently.** The scanner reports its two problems (`(` inside a comment, and an unmatched `)`), and separately `readWords` fails on the leftover `C)`. Two safety nets that agree are better than one.

### Know the limits of `readWords`

It only knows address words. A line like `#1=5.`, `%`, or a block-skip `/G0X1.` is not a list of words, and `readWords` will throw on it. Whoever calls it must route those lines elsewhere first. That is a design boundary, not a bug, but you need to know where it is.


### Go deeper

#### How the scanner works

You were handed `lines.mjs` as a finished tool. Since the pipeline is only as trustworthy as its weakest stage, here is how it works.

**`splitLines`**

```js
const re = /([^\r\n]*)(\r\n|\r|\n|$)/g;
```
Read the regex in two halves. `([^\r\n]*)` is group 1, **the line's content**: any run of characters that are not a carriage return or newline. `(\r\n|\r|\n|$)` is group 2, **the line ending**: Windows `\r\n`, old-Mac `\r`, Unix `\n`, or the end of the whole text. The `g` flag plus `re.exec(...)` in a `while` loop walks through the text one line at a time, each match starting where the last ended. Keeping the original ending in `raw` is what lets the editor rebuild the file *exactly*.

```js
while ((m = re.exec(source)) && m[0]) {
```
The `&& m[0]` is the loop's brake. At the very end of the text, the regex can match an **empty string** (empty content, then `$`). Without the brake, an empty match would not advance and the loop would run forever. An empty `m[0]` means "nothing left": stop.

Create `break7a.mjs`:

```js
import { splitLines } from './lines.mjs';
const show = (s) => console.log(JSON.stringify(s).padEnd(12), '->', JSON.stringify(splitLines(s).map((l) => l.content)));
['a\r\nb\nc', 'a\n', '', '\n\n'].forEach(show);
```

Run `node break7a.mjs`. **Output:**

```text
"a\r\nb\nc"  -> ["a","b","c"]
"a\n"        -> ["a"]
""           -> []
"\n\n"       -> ["",""]
```

Look at the shapes: `'a\n'` is **one** line (the trailing newline is that line's ending, not a second empty line), `''` is zero lines, and `'\n\n'` is two empty lines. Test your tools on empty input and on trailing newlines; these are the two places line splitters usually break.

**`withCommentsBlanked`** is a tiny state machine with two states, *in code* and *in a comment*, and one rule per (state, character) pair:

| State | Character | What happens |
|---|---|---|
| in code | `(` | enter comment; remember the column; emit a space |
| in code | `)` | report "unmatched `)`"; emit it as ordinary text |
| in code | anything else | emit it unchanged |
| in comment | `(` | report "`(` inside a comment" (Fanuc does not nest); emit a space |
| in comment | `)` | leave the comment; emit a space |
| in comment | anything else | emit a space |
| (line ends) | still in comment | report "comment not closed on this line" |

It **blanks to spaces instead of deleting** so that every character keeps its column. The editor can then underline problems in the original text at the right place. The price, as Lesson 7 showed, is that the later stages must cope with the extra spaces.

#### Break it

Three things `prepare` does or does not handle:

Create `break7b.mjs`:

```js
import { splitLines, withCommentsBlanked } from './lines.mjs';
import { readWords } from './macro.mjs';

const vars = { get: () => null };
const prepare = (code) => code.replace(/\s+/g, '').replace(/;$/, '');

console.log(JSON.stringify(withCommentsBlanked(splitLines('G0 (HI) X1'))[0].code));
for (const code of ['G0 X1 ;', 'G0X1;G1X2', 'X1 2']) {
  try { console.log(JSON.stringify(code).padEnd(14), '->', JSON.stringify(readWords(prepare(code), vars))); }
  catch (e) { console.log(JSON.stringify(code).padEnd(14), '-> ERROR:', e.message); }
}
```

Run `node break7b.mjs`. **Output:**

```text
"G0      X1"
"G0 X1 ;"      -> [{"letter":"G","value":0},{"letter":"X","value":1}]
"G0X1;G1X2"    -> ERROR: cannot read ";G1X2"
"X1 2"         -> [{"letter":"X","value":12}]
```

- The first line shows the blanking: the comment `(HI)` has become spaces and `G0` and `X1` are in their original columns.
- **`G0X1;G1X2` fails**: `prepare` only strips a `;` at the **end**. A `;` in the middle is not removed, so the second block cannot be read. That is a real limitation of the one-line `prepare`; Exercise 7.1 fixes it.
- **`X1 2` becomes `X12`**: removing spaces *joins* the digits. That matches how Fanuc ignores spaces, and it is a correct reading of the rule, but notice it is not forgiving: a stray space inside a number silently changes the value instead of raising an error. Whether that is what you want depends on how much you trust the program text.

#### Exercises

**7.1 Several blocks on one line.** A `;` ends a block, so `G0X1;G1X2` is two blocks. Change the pipeline so each line produces a *list of word lists*, one per block.

<details><summary>Solution</summary>

Split on `;` after removing spaces, drop empty pieces, and read each piece:

Create `ex7.mjs`:

```js
import { readWords } from './macro2.mjs';
const table = { 1: 5 };
const vars = { get: (n) => table[n] ?? null };

// Split one line into blocks at ';', drop spaces, read each block.
const blocks = (code) => code.replace(/\s+/g, '').split(';').filter(Boolean);

for (const code of ['G0X1;G1X2', 'G0 X[#1+1] ; G1 X2 ;', ';;']) {
  console.log(JSON.stringify(code).padEnd(24), '->', JSON.stringify(blocks(code).map((b) => readWords(b, vars))));
}
```

Run `node ex7.mjs`. **Output:**

```text
"G0X1;G1X2"              -> [[{"letter":"G","value":0},{"letter":"X","value":1}],[{"letter":"G","value":1},{"letter":"X","value":2}]]
"G0 X[#1+1] ; G1 X2 ;"   -> [[{"letter":"G","value":0},{"letter":"X","value":6}],[{"letter":"G","value":1},{"letter":"X","value":2}]]
";;"                     -> []
```

(This uses `macro2.mjs` from Lesson 9 so the same code is robust to spaces; with the Lesson 6 `macro.mjs` it works too, because the spaces are already gone.) Notice that `;;` yields no blocks at all, and that a trailing `;` creates no empty block thanks to `.filter(Boolean)`. The design lesson: don't make the reader smarter about `;`; do the splitting *between* the stages, so `readWords` keeps doing one job.

</details>

**7.2 Think.** Why does the pipeline blank comments *first* and strip spaces *second*, and not the other way round?

<details><summary>Answer</summary>

Because stripping spaces first would destroy the information the scanner needs. A comment is `(` to the first `)`; with the spaces gone, `G0 (A B) X1` becomes `G0(AB)X1` and the scanner still works, but its reported **columns** no longer match the original line, so every error would be underlined in the wrong place. Stages should run in the order that preserves the most information for the longest: blank comments (keeping columns), then, only when you are about to parse, discard what the parser does not need.

</details>

---

## Lesson 8: Review: what is wrong with it

Now that you understand every line, you can judge it. Run this evidence-gathering script against your finished `macro.mjs`. Create `try8.mjs`:

```js
import { evaluate } from './macro.mjs';

const table = { 1: 5, 3: 1, 101: 2 };
const vars = { get: (n) => table[n] ?? null };

const show = (expr) => {
  try { console.log(expr.padEnd(18), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(18), '-> ERROR:', e.message); }
};

console.log('-- indirect variable: #3 is 1, so ##3 should mean #1 (= 5)');
show('##3');
console.log('\n-- math that has no answer');
['SQRT[-1]', 'ASIN[2]', 'LN[0]', '5MOD0', '5/0'].forEach(show);
console.log('\n-- one tolerance for EQ, none for GT/LT');
['1.0000000001EQ1', '1.0000000001GT1', '1LT1.0000000001'].forEach(show);
console.log('\n-- unknown function name');
show('FOO[1]');
console.log('\n-- negative zero');
console.log('-#9 is -0? ', Object.is(evaluate('-#9', vars), -0), '  and -0 === 0? ', -0 === 0);
```

**Output:**

```text
-- indirect variable: #3 is 1, so ##3 should mean #1 (= 5)
##3                -> ERROR: expected a number at "#3" in ##3

-- math that has no answer
SQRT[-1]           -> NaN
ASIN[2]            -> NaN
LN[0]              -> -Infinity
5MOD0              -> NaN
5/0                -> ERROR: divide by zero in 5/0

-- one tolerance for EQ, none for GT/LT
1.0000000001EQ1    -> 1
1.0000000001GT1    -> 1
1LT1.0000000001    -> 1

-- unknown function name
FOO[1]             -> ERROR: expected a number at "FOO[1]" in FOO[1]

-- negative zero
-#9 is -0?  true   and -0 === 0?  true
```

### Findings, most important first

**1. Math with no answer leaks out as `NaN` or `-Infinity`.** `SQRT[-1]`, `ASIN[2]`, `5MOD0` give `NaN`; `LN[0]` gives `-Infinity`. Meanwhile `5/0` correctly throws. That inconsistency is a hazard: `NaN` silently poisons every later calculation (`NaN+1` is `NaN`, and `NaN` is not even equal to itself), so the first sign of trouble could appear many lines later. A real controller alarms instead. Fix: reject any non-finite result at the point it is created.

**2. The tolerance is applied to some comparisons but not others.** `1.0000000001EQ1` says "equal", but `1.0000000001GT1` says "greater". Two operators contradict each other about the same pair of numbers. Fix: one tolerance rule, used by all six.

**3. Spaces break everything** (Lesson 7). The parser should ignore them itself, so no caller can forget.

**4. `##3` (indirect variable) is not supported.** `#[#3]` works, but the bare `##3` form fails. Fix: after `#`, accept another `#`.

**5. The same code is written several times.**
- The `sum` and `product` loops are the same loop with different operators.
- "Read `[`, evaluate, expect `]`" appears in `primary` twice (once for `[...]`, once for `#[...]`) and again for functions.
- Error messages are assembled by hand in four places.
- Functions are handled by *three* separate mechanisms (the table, `ATAN`, `POW`).

Duplicated code is where bugs breed, because fixing one copy leaves the others wrong. That is precisely what happened to the comment stripper in the earlier lessons.

**6. `FOO[1]` says "expected a number".** True, unhelpful. It should say "unknown function FOO".

**Noticed, and deliberately left alone:**
- `-#9` gives `-0`. Harmless (`-0 === 0`), invisible to anything but `Object.is`. Not every oddity deserves a change.
- `ADP`, `BIN`, `BCD` are identity stubs: they return their input. If your timing model never uses them, that is fine; if it does, they are silently wrong. I cannot tell from here, so I have left them as they were.
- `AND`/`OR`/`XOR` truncate to 32-bit integers. That matches how bitwise operators work in JavaScript, and I have not changed it.


### Go deeper

#### A repeatable way to review code

"Review" can feel like a vague talent. It is really a procedure you can follow:

1. **Write down the contract.** What does each function promise? ("`evaluate` returns a number, `null` for vacant, or throws.") A bug is a broken promise, so you need the promises first.
2. **Probe the boundaries.** Feed in: empty input, one character, one past the end, the biggest and smallest values, the *vacant* case, input with an operator missing, with an extra one. Boundaries are where code written for the typical case breaks.
3. **Record, don't judge yet.** Print input and output side by side (as `try8.mjs` does). Judging while probing makes you stop looking after the first surprise.
4. **Rank by damage.** From worst to mildest: *silently wrong answer* (nobody notices), then *crash with an unclear message*, then *clear error on valid input*, then *cosmetic*. NaN leaking out is worst because the answer is wrong and nothing says so.
5. **Decide each one explicitly: fix, defer, or leave, and write down why.** Lesson 8's "Noticed, and deliberately left alone" list is part of the review, not an afterthought. Unexamined oddities are worrying; examined and accepted ones are decisions.

#### One more finding, found by probing

Here is a probe the list above produces if you ask "what other inputs could give a surprising *finite* answer?":

Create `probe8.mjs`:

```js
import { evaluate } from './macro.mjs';
const vars = { get: () => null };
const show = (expr) => {
  try { console.log(expr.padEnd(10), '->', evaluate(expr, vars)); }
  catch (e) { console.log(expr.padEnd(10), '-> ERROR:', e.message); }
};
['TAN[45]', 'TAN[90]', 'TAN[89.9999]', 'COS[90]', '5MOD3MOD2'].forEach(show);
```

Run `node probe8.mjs`. **Output:**

```text
TAN[45]    -> 0.9999999999999999
TAN[90]    -> 16331239353195370
TAN[89.9999] -> 572957.7951043443
COS[90]    -> 6.123233995736766e-17
5MOD3MOD2  -> 0
```

**8.7 (new). `TAN[90]` is `16331239353195370`, not an error.** The tangent of 90° is mathematically undefined, and a real controller alarms. But `Math.tan(rad(90))` does not return `Infinity`: floating-point `π/2` is not *exactly* π/2, so the result is a huge but **finite** number. The `isFinite` check from Lesson 9 cannot see anything wrong, and a program using it would compute with a number about 1.6 × 10¹⁶. This is a useful thing to learn about validation: *finite is not the same as sensible*. Guarding it would need a rule specific to `TAN` (for example: reject when `|COS[a]|` is below a tolerance). Whether that is worth doing depends on whether a real program ever calls `TAN[90]`; that is a judgement for you, and Lesson 9 does not change it.

#### Exercises

**8.1 Triage.** For each of the six findings above, decide *fix now*, *fix later* or *leave*, and say what would change your mind. Think about the cost of being wrong in each.

<details><summary>One reasonable answer</summary>

1. **NaN/Infinity leaking: fix now.** Silent wrong answers are the worst class, and the fix is one check in one place.
2. **Inconsistent tolerance: fix now.** Two operators contradict each other on the same inputs; also a one-line-per-operator fix.
3. **Spaces: fix now.** A caller forgetting `prepare` breaks every line; the fix removes a whole class of caller mistakes.
4. **`##3`: fix when needed.** It is real Fanuc syntax, but if no program you run uses it, the cost of the bug is zero today. The fix falls out of the refactor for free, so do it then.
5. **Duplication: fix later, but soon.** No user sees it; it raises the cost and risk of every *future* change. It is the reason bugs 1 to 4 were hard to fix in one place.
6. **Unhelpful `FOO[1]` message: fix during the refactor.** Cheap, and it saves debugging time.

What would change your mind: if the parser only ever runs on programs you wrote and have checked, 4 and 6 matter less. If it runs on programs you didn't write, 1 and 3 matter more. Triage depends on *who feeds the parser*.

</details>

**8.2 Probe a family.** Write your own probe script for `ROUND`, `FIX` and `FUP` with inputs `2.5`, `-2.5`, `0.5`, `-0.5`, `0` and a vacant variable. Predict first. Do the three agree with each other where you would expect (`FIX` toward zero, `FUP` away from zero, `ROUND` half away from zero)?

<details><summary>Hint</summary>

Copy `probe8.mjs`, build the expression strings with a loop (`` `${fn}[${x}]` ``), and print a table with the three functions as columns. The interesting rows are the halves (`2.5`, `-2.5`, `0.5`, `-0.5`) and the vacant one, where you will also see `-0` appear. `-0` is harmless but visible, as in Lesson 2.

</details>

---

## Lesson 9: Refactor: cleaner and more maintainable

### Principles

1. **Data over code.** Operators and functions become tables. Adding one is one line, not a new `else if`.
2. **Say each thing once.** One loop for every left-to-right level; one place that builds error messages; one place that reads `[ ... ]`.
3. **Validate at the boundary.** Every operation checks that its result is a finite number, in one place.
4. **Change behavior only on purpose.** A refactor that silently changes results is just a new set of bugs. So we prove what changed.

### The new file

Save as `macro2.mjs` (keep your original `macro.mjs` beside it; you need both for the comparison):

```js
const num = (v) => v ?? 0; // vacant (null) counts as 0 in arithmetic
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const EPS = 1e-9;

// ---------- Operator tables: adding an operator is one line ----------
const ADDITIVE = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  OR: (a, b) => a | b,
  XOR: (a, b) => a ^ b,
};
const MULTIPLICATIVE = {
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  AND: (a, b) => a & b,
  MOD: (a, b) => a % b,
};

// Comparisons get the RAW values, because vacant (null) is not equal to 0.
const same = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) < EPS);
const COMPARISONS = {
  EQ: (a, b) => same(a, b),
  NE: (a, b) => !same(a, b),
  GT: (a, b) => num(a) > num(b) + EPS,
  GE: (a, b) => num(a) >= num(b) - EPS,
  LT: (a, b) => num(a) < num(b) - EPS,
  LE: (a, b) => num(a) <= num(b) + EPS,
};

// ---------- Function tables, split by number of arguments ----------
const ONE_ARG = {
  SIN: (a) => Math.sin(rad(a)),
  COS: (a) => Math.cos(rad(a)),
  TAN: (a) => Math.tan(rad(a)),
  ASIN: (a) => deg(Math.asin(a)),
  ACOS: (a) => deg(Math.acos(a)),
  ATAN: (a) => deg(Math.atan(a)),
  SQRT: Math.sqrt,
  SQR: Math.sqrt,
  ABS: Math.abs,
  ROUND: (a) => Math.sign(a) * Math.round(Math.abs(a)),
  FIX: (a) => Math.sign(a) * Math.floor(Math.abs(a)),
  FUP: (a) => Math.sign(a) * Math.ceil(Math.abs(a)),
  LN: Math.log,
  EXP: Math.exp,
  ADP: (a) => a,
  BIN: (a) => a,
  BCD: (a) => a,
};
const TWO_ARG = {
  POW: (a, b) => a ** b,
  ATAN: (a, b) => deg(Math.atan2(a, b)),
};

class Parser {
  constructor(text, vars) {
    this.text = text.replace(/\s+/g, ''); // Fanuc ignores spaces
    this.vars = vars;
    this.pos = 0;
  }

  // ----- cursor -----
  get rest() { return this.text.slice(this.pos); }
  get done() { return this.pos >= this.text.length; }
  where() { return `at "${this.rest || 'end'}"`; }
  fail(message) { throw new Error(`${message} in ${this.text}`); }

  peek(word) { return this.text.startsWith(word, this.pos); }
  eat(word) {
    if (!this.peek(word)) return false;
    this.pos += word.length;
    return true;
  }
  eatAny(words) {
    for (const word of words) if (this.eat(word)) return word;
    return null;
  }
  expect(word) {
    if (!this.eat(word)) this.fail(`expected ${word} ${this.where()}`);
  }
  number() {
    const m = this.rest.match(/^(?:\d+\.?\d*|\.\d+)/);
    if (!m) this.fail(`expected a number ${this.where()}`);
    this.pos += m[0].length;
    return Number(m[0]);
  }
  letter() {
    const ch = this.text[this.pos];
    if (!/[A-Z]/.test(ch)) this.fail(`cannot read "${this.rest}"`);
    this.pos += 1;
    return ch;
  }

  // ----- grammar, lowest precedence first -----
  compare() {
    const left = this.sum();
    const op = this.eatAny(Object.keys(COMPARISONS));
    if (!op) return left;
    return COMPARISONS[op](left, this.sum()) ? 1 : 0;
  }
  sum()     { return this.binary(this.product, ADDITIVE); }
  product() { return this.binary(this.unary, MULTIPLICATIVE); }

  // One loop for every left-associative level.
  binary(next, table) {
    let value = next.call(this);
    for (;;) {
      const op = this.eatAny(Object.keys(table));
      if (!op) return value;
      const result = table[op](num(value), num(next.call(this)));
      if (!Number.isFinite(result)) this.fail(op === '/' ? 'divide by zero' : `${op} gave ${result}`);
      value = result;
    }
  }

  unary() {
    if (this.eat('-')) return -num(this.unary());
    if (this.eat('+')) return num(this.unary());
    return this.primary();
  }

  primary() {
    if (this.eat('[')) {
      const v = this.compare();
      this.expect(']');
      return v;
    }
    if (this.eat('#')) return this.variable();
    const name = this.rest.match(/^[A-Z]+(?=\[)/)?.[0];
    if (name) return this.call(name);
    return this.number();
  }

  variable() { // after the '#': 101, [#1+1], or another #
    const index = this.peek('[') || this.peek('#') ? this.primary() : this.number();
    return this.vars.get(Math.round(num(index)));
  }

  call(name) {
    this.pos += name.length;
    this.expect('[');
    const args = [num(this.compare())];
    while (this.eat(',')) args.push(num(this.compare()));
    this.expect(']');
    if (name === 'ATAN' && args.length === 1 && this.eat('/[')) { // ATAN[a]/[b]
      args.push(num(this.compare()));
      this.expect(']');
    }
    if (!Object.hasOwn(ONE_ARG, name) && !Object.hasOwn(TWO_ARG, name)) this.fail(`unknown function ${name}`);
    const table = args.length === 1 ? ONE_ARG : TWO_ARG;
    if (args.length > 2 || !Object.hasOwn(table, name)) this.fail(`${name} cannot take ${args.length} argument(s)`);
    const result = table[name](...args);
    if (!Number.isFinite(result)) this.fail(`${name}[${args.join(',')}] gave ${result}`);
    return result;
  }

  // One address word's value: 10, -5, #101, -#101, [#1+2]
  wordValue() {
    if (this.eat('-')) return -num(this.wordValue());
    if (this.eat('+')) return num(this.wordValue());
    if (this.peek('#') || this.peek('[')) return this.primary();
    return this.number();
  }
}

export function evaluate(text, vars) {
  const p = new Parser(text, vars);
  const value = p.compare();
  if (!p.done) p.fail(`cannot read "${p.rest}"`);
  return value;
}

export function readWords(code, vars) {
  const p = new Parser(code, vars);
  const words = [];
  while (!p.done) {
    const letter = p.letter();
    words.push({ letter, value: p.wordValue() });
  }
  return words;
}
```

### A guided tour of what changed

**Operator tables (`ADDITIVE`, `MULTIPLICATIVE`, `COMPARISONS`).** The whole difference between `sum` and `product` is which table they use, so they become one-liners that call a shared `binary(next, table)`. Adding a new operator would be one line in a table.

**`binary`.** It is the Lesson 3 pattern written once: get the first operand from `next`, then loop while an operator from `table` follows. The finiteness check lives here, so `/`, `MOD` and anything added later are covered together. (`/` gets a friendlier message, "divide by zero".)

**`eatAny(words)`.** "Try each of these, tell me which matched." It replaces the hand-written `else if` chains.

**One place for failure.** `fail(message)` appends `in <text>`, `where()` formats the position, and in the TypeScript version (Lesson 10), `fail` is typed to return `never`, which tells the compiler that code after `if (!m) this.fail(...)` cannot run with `m` empty.

**`variable()` is just recursion.** After `#`, the index is either `[expr]`, another `#...`, or a plain number. Allowing "another `#`" is what makes `##3` work, and it is the same function reused, with no new special case. The `[...]` reading code that used to be duplicated is gone because `variable` calls `primary`, which already knows how to read brackets.

**`call(name)`.** One routine reads `NAME[args]` for every function. It collects a comma-separated list into `args` and *then* looks at how many there are. `ATAN[a]/[b]` is folded into the same path by appending the second argument. Two small tables (`ONE_ARG`, `TWO_ARG`) say what exists, and `ATAN` appears in both because it has a one-argument and a two-argument meaning. The last four lines of `call` are the checks, in order:

1. *Is the name in either table?* If not: `unknown function FOO`.
2. *Pick the table by argument count.* One argument uses `ONE_ARG`, anything else uses `TWO_ARG`.
3. *Does that table have this name, and are there at most two arguments?* If not: `POW cannot take 1 argument(s)`. **The `args.length > 2` test is essential**: without it, three arguments would pick `TWO_ARG`, find the name there, and call the function with the third argument silently ignored. (The first edition of this lesson omitted that test; see *The bug the test missed* below.)
4. *Run it and check the result is finite.*

About `Object.hasOwn(table, name)`: it asks "is `name` a key of this very table?", which is the safe way to test membership (the plain `table[name]` also sees inherited properties). In this parser the name has already been matched by `/^[A-Z]+(?=\[)/` in `primary`, so an inherited name like `constructor` (lowercase) can never reach `call` anyway. The guard's practical job today is turning an unknown name such as `FOO` into the clear message `unknown function FOO`, instead of the crash `table[name] is not a function` you would otherwise get. Think of it as cheap insurance in case `call` is ever reused with other input.

**Whitespace.** The constructor strips it once, so no caller can forget (Lesson 7). Error messages show the stripped text. A second cost: stripping *joins* what the spaces separated, so `2 3` is read as `23`. That matches Fanuc, which ignores spaces, but it will not warn you about a stray space inside a number.

**A trade-off worth knowing: class versus closure.** Your original builds one object `p` and methods call `p.something()`. I used a `class` here because the operator tables want to reference methods as values (`this.product`), and that requires `next.call(this)` so the method knows which parser it belongs to. The closure style avoids that, at the price of a less conventional shape. Neither is wrong; the class form is what most readers and tools expect.

### Proving what changed: a characterization test

How do you know the refactor did not break anything? Run the **old** and **new** implementations on the *same* inputs and print only the cases where they disagree. This is called a characterization test: it does not claim either version is right, it tells you exactly where they differ. Then you judge each difference.

Save as `compare.mjs`:

```js
import * as v1 from './macro.mjs';
import * as v2 from './macro2.mjs';

const table = { 1: 5, 2: -3.5, 3: 1, 23: 3, 101: 2 };
const vars = { get: (n) => table[n] ?? null };

const exprs = [
  '5', '-5', '--5', '[7]', '[[7]]', '#1', '-#2', '#[1]', '#[#3]', '#9',
  '1+2*3', '10-2-3', '2*3+4*5', '[1+2]*3', '-2*3', '10/4', '7MOD3', '6AND3', '4OR1', '5XOR1', '#1+#2*2', '#9+1',
  '5EQ5', '#1GT3', '#1LT3', '[#1+1]EQ6', '0.1+0.2EQ0.3', '#9EQ0', '#9EQ#9', '#9NE0', '#9GE0', '#9GT0',
  'SIN[30]', 'SIN[30]EQ0.5', 'COS[90]EQ0', 'SQRT[16]', 'ABS[-3]', 'ROUND[2.5]', 'ROUND[-2.5]', 'FIX[-2.7]', 'FUP[2.1]',
  'POW[2,10]', 'ATAN[1]', 'ATAN[1]/[1]', 'ATAN[1,-1]', 'ATAN[1]/2', '#1*COS[60]', 'SIN[#1*6]',
  // error cases both should reject
  '[5', '5]', '1LT2LT3', '10/0', 'FOO[1]', '', '1.2.3', 'POW[2]', '#', 'POW[2,3,4]', 'ATAN[1,2,3]',
  // the ones we EXPECT to differ
  '##3', '1 + 2', 'SQRT[-1]', 'ASIN[2]', 'LN[0]', '5MOD0', '1.0000000001GT1', '1LT1.0000000001', '[1+2]*[3 + 4]',
];
const words = [
  'G10L2P#23X[#1+1.]', 'X-#2', 'G90G0X-.5', 'X#9', '', 'X10.Y', 'X5!', 'g1', 'G01 X10. Y[#1 + 2]', 'X##3',
];

const run = (f) => {
  try { const r = f(); return Object.is(r, -0) ? '-0' : JSON.stringify(r) ?? String(r); }
  catch { return 'ERROR'; }
};
const rows = [
  ...exprs.map((e) => ['evaluate', e, run(() => v1.evaluate(e, vars)), run(() => v2.evaluate(e, vars))]),
  ...words.map((w) => ['readWords', w, run(() => v1.readWords(w, vars)), run(() => v2.readWords(w, vars))]),
];
const same = rows.filter((r) => r[2] === r[3]);
const diff = rows.filter((r) => r[2] !== r[3]);
console.log(`${rows.length} cases: ${same.length} identical, ${diff.length} different\n`);
for (const [kind, input, a, b] of diff) {
  console.log(`${kind.padEnd(9)} ${JSON.stringify(input).padEnd(22)} v1: ${a.slice(0, 34).padEnd(34)} v2: ${b.slice(0, 40)}`);
}
```

**Output:**

```text
78 cases: 67 identical, 11 different

evaluate  "##3"                  v1: ERROR                              v2: 5
evaluate  "1 + 2"                v1: ERROR                              v2: 3
evaluate  "SQRT[-1]"             v1: null                               v2: ERROR
evaluate  "ASIN[2]"              v1: null                               v2: ERROR
evaluate  "LN[0]"                v1: null                               v2: ERROR
evaluate  "5MOD0"                v1: null                               v2: ERROR
evaluate  "1.0000000001GT1"      v1: 1                                  v2: 0
evaluate  "1LT1.0000000001"      v1: 1                                  v2: 0
evaluate  "[1+2]*[3 + 4]"        v1: ERROR                              v2: 21
readWords "G01 X10. Y[#1 + 2]"   v1: ERROR                              v2: [{"letter":"G","value":1},{"letter":"X",
readWords "X##3"                 v1: ERROR                              v2: [{"letter":"X","value":5}]
```

(The harness prints `NaN` and `-Infinity` as `null` because that is how `JSON.stringify` renders them. They are the same two failures from Lesson 8.)

### Reading the 11 differences

| Input | Old | New | Why |
|---|---|---|---|
| `##3` | error | `5` | indirect variables now work |
| `1 + 2`, `[1+2]*[3 + 4]`, `G01 X10. Y[#1 + 2]` | error | works | spaces ignored, as Fanuc does |
| `X##3` | error | `X = 5` | indirect variable in a word |
| `SQRT[-1]`, `ASIN[2]`, `LN[0]`, `5MOD0` | silent `NaN`/`-Infinity` | error | math with no answer is rejected |
| `1.0000000001GT1`, `1LT1.0000000001` | `1` | `0` | `GT`/`LT` now respect the same tolerance as `EQ`, `GE`, `LE` |

Every one of them is a change we chose in Lesson 8. The other **67** cases (all the happy paths, every error case, vacant handling, every function, every word form) give identical results. Do not stop reading here, though: the next section explains why "67 identical" is a weaker statement than it sounds.

**This is the habit to keep:** before changing code, build a table of inputs and expected results; after changing it, diff. If a difference appears that you did not choose, you found a regression for free.

### The bug the test missed

The refactored parser in the first edition of this lesson had a bug, and the characterization test above said everything was fine. Here is exactly what happened, because it teaches what such a test can and cannot promise.

**The bug.** `call` chose the table by argument count (`args.length === 1 ? ONE_ARG : TWO_ARG`) and checked the name was in it, but never checked the count was *at most two*. With three arguments it picked `TWO_ARG`, found `POW` or `ATAN`, and called the function with the third argument silently ignored. So `POW[2,3,4]` evaluated to `8` and `ATAN[1,2,3]` to `26.565...`, where the old parser rejected both.

**Why the test missed it.** With the original list of 76 inputs, this is what you get with the buggy version:

```text
76 cases: 65 identical, 11 different
```

The same 11 expected differences, nothing else. The list had `POW[2]` (too *few* arguments) but nothing with too *many*, so the bug was invisible. Now add the two missing cases to the list (as the `compare.mjs` above now does) and run against the buggy version:

```text
78 cases: 65 identical, 13 different
evaluate  "POW[2,3,4]"           v1: ERROR                              v2: 8
evaluate  "ATAN[1,2,3]"          v1: ERROR                              v2: 26.56505117707799
```

Two *unexpected* differences appear (13 instead of 11). Fix `call` (the `args.length > 2` test, already in the code above) and they vanish: that is the "67 identical, 11 different" you see in the output earlier.

**The lesson, in three parts:**

1. **A characterization test only covers what you put in it.** "65 identical" never meant "the new code behaves like the old code". It meant "on these 76 inputs, they agree". The test is as good as the imagination behind its list.
2. **How to write a better list:** for every function or operator, cover *too few*, *just right* and *too many* arguments; cover each error path once; cover each boundary (empty, one character, vacant). The probes you wrote in Lesson 8 are exactly the kind of cases worth adding.
3. **A bug found is a case to keep.** `POW[2,3,4]` and `ATAN[1,2,3]` now live in the list forever; if someone later breaks argument counting again, the test catches it on day one.

### What a bigger redesign would look like (not needed yet)

If this parser grows, there are two natural next steps. Neither is required today:

- **A tokenizer first.** Turn the text into a list of tokens (`NUMBER 5`, `IDENT SIN`, `[`, `+` ...) and parse the list. That removes the prefix problems (like `SQR` vs `SQRT`) and the character-level `startsWith` calls for good.
- **Parse to a tree, then evaluate.** Right now the parser computes values as it reads. If your timing model re-evaluates the same expression many times (say, inside a loop), parsing once into a tree and evaluating that repeatedly is faster, and it lets you answer questions like "which variables does this block read?" without running anything.

### Go deeper

#### Break it

**The class-versus-closure trap.** Lesson 0.1 showed that a method pulled off its object loses `this`. The refactor's `binary(next, table)` receives a *method* (`this.product` or `this.unary`) as a plain function, which is exactly that situation, and the code deals with it by calling `next.call(this)`. See what happens if you write the "obvious" `next()` instead. Copy `macro2.mjs` to `macro2_nothis.mjs` and replace both `next.call(this)` with `next()`:

Create `ex9c.mjs`:

```js
import { evaluate } from './macro2_nothis.mjs';
try { console.log(evaluate('1+2', { get: () => null })); }
catch (e) { console.log(e.constructor.name + ':', e.message); }
```

Run `node ex9c.mjs`. **Output:**

```text
TypeError: Cannot read properties of undefined (reading 'binary')
```

`sum` hands `this.product` to `binary` as a plain function, and `binary` then calls it as `next()`. Called that way, `this` inside `product` is `undefined`, so the first thing `product` does, `this.binary(...)`, crashes with "reading 'binary'". This is the real price of the class style compared with the closure style from Lessons 1 to 6: with closures, every function reaches the parser through the captured `p`, so nothing can be detached from it. Neither style is wrong; the class form needs `.call(this)` (or arrow functions, or `.bind`) at exactly the places where a method is passed around as a value.

#### Exercises

**9.1 Add `//` (integer division) to the multiplicative table.** It is one line in `MULTIPLICATIVE`: `'//': (a, b) => Math.trunc(a / b)`. But *where* in the table? Predict what `7//2` gives if you put the new line **after** `'/'`, and if you put it **before**.

<details><summary>Answer</summary>

Create `ex9a.mjs`:

```js
import * as after from './macro2_div_after.mjs';    // '/' listed first, then '//'
import * as before from './macro2_div_before.mjs';  // '//' listed first, then '/'
const vars = { get: () => null };
const run = (m, e) => { try { return m.evaluate(e, vars); } catch (x) { return 'ERROR ' + x.message; } };
for (const e of ['7/2', '7//2']) {
  console.log(e.padEnd(5), "'/' first:", String(run(after, e)).padEnd(34), "'//' first:", run(before, e));
}
```

Run `node ex9a.mjs`. **Output:**

```text
7/2   '/' first: 3.5                                '//' first: 3.5
7//2  '/' first: ERROR expected a number at "/2" in 7//2 '//' first: 3
```

Placed after `/`, the new operator is never reached. `eatAny` tries the keys in order and `/` matches the first character of `//` and wins; the leftover `/2` then cannot be read. Placed before `/`, `//` is tried first, and for a single `/` it simply fails to match and falls through. **Rule: in any list tried in order with early exit, put the longer match before its own prefix.** This is the same trap as `SQR` versus `SQRT` in Lesson 5, now in a table instead of a loop, and it is why the order of `eatAny` lists is part of the design, not an accident.

</details>

**9.2 Add a two-argument function `MAX[a,b]`.** In Lesson 5 you saw the `FUNCTIONS` table could not do this. In the refactored parser, how many lines, and what happens with the wrong number of arguments?

<details><summary>Answer</summary>

One line in `TWO_ARG`: `MAX: (a, b) => Math.max(a, b),`. Everything else, including the error messages, is already general:

Create `ex9b.mjs`:

```js
import { evaluate } from './macro2_max.mjs';
const vars = { get: () => null };
for (const e of ['MAX[2,5]', 'MAX[-1,#9]', 'MAX[1]', 'MAX[1,2,3]', 'MIN[1,2]']) {
  try { console.log(e.padEnd(11), '->', evaluate(e, vars)); }
  catch (x) { console.log(e.padEnd(11), '-> ERROR:', x.message); }
}
```

Run `node ex9b.mjs`. **Output:**

```text
MAX[2,5]    -> 5
MAX[-1,#9]  -> 0
MAX[1]      -> ERROR: MAX cannot take 1 argument(s) in MAX[1]
MAX[1,2,3]  -> ERROR: MAX cannot take 3 argument(s) in MAX[1,2,3]
MIN[1,2]    -> ERROR: unknown function MIN in MIN[1,2]
```

`MAX[1]` and `MAX[1,2,3]` give clear count errors, `MIN[1,2]` (not defined) gives `unknown function MIN`, and a vacant argument is treated as 0, so `MAX[-1,#9]` is 0. The `MAX[1,2,3]` line only reads correctly thanks to the fix above: before it, the third argument was silently dropped. (We wrap `Math.max` in an arrow so it receives exactly two arguments; `Math.max` itself would happily take any number.)

</details>

**9.3 Extend the test.** Add your own cases to the characterization test. Here are fourteen candidates; predict which will differ between the old and new parser, then run:

Create `ex9d.mjs`:

```js
import * as v1 from './macro.mjs';
import * as v2 from './macro2.mjs';

const table = { 1: 5, 2: -3.5 };
const vars = { get: (n) => table[n] ?? null };
const run = (f) => {
  try { const r = f(); return Object.is(r, -0) ? '-0' : JSON.stringify(r); }
  catch (e) { return 'ERROR'; }
};

const mine = ['#1.5', '-[#9]', '1+', '+', '2 3', 'SIN[30', 'sin[30]', '5MOD3MOD2', '1E3', 'POW[2,#9]', 'ROUND[#9]', '#[]', '--', '2ANDOR3'];
for (const e of mine) {
  const a = run(() => v1.evaluate(e, vars));
  const b = run(() => v2.evaluate(e, vars));
  console.log((a === b ? 'same' : 'DIFF').padEnd(5), JSON.stringify(e).padEnd(12), 'v1:', a.padEnd(8), 'v2:', b);
}
```

Run `node ex9d.mjs`. **Output:**

```text
same  "#1.5"       v1: -3.5     v2: -3.5
same  "-[#9]"      v1: -0       v2: -0
same  "1+"         v1: ERROR    v2: ERROR
same  "+"          v1: ERROR    v2: ERROR
DIFF  "2 3"        v1: ERROR    v2: 23
same  "SIN[30"     v1: ERROR    v2: ERROR
same  "sin[30]"    v1: ERROR    v2: ERROR
same  "5MOD3MOD2"  v1: 0        v2: 0
same  "1E3"        v1: ERROR    v2: ERROR
same  "POW[2,#9]"  v1: 1        v2: 1
same  "ROUND[#9]"  v1: 0        v2: 0
same  "#[]"        v1: ERROR    v2: ERROR
same  "--"         v1: ERROR    v2: ERROR
same  "2ANDOR3"    v1: ERROR    v2: ERROR
```

You should find only **one** difference: `2 3` (the refactor ignores spaces, the original rejects them). That is a good result: it means all the other edge cases (lowercase, trailing operators, unterminated brackets, stacked word operators, even the `-0` outputs) are preserved exactly. If you had found a difference you could not explain, that is where to look for a regression.

**9.4 Find the next bug.** The `3`-argument bug survived the first edition because nobody wrote that input. List three more *categories* of input the characterization list does not yet cover, and one example of each. (There is no single right answer; this is the habit.)

<details><summary>Some candidates</summary>

- **Deep nesting**: `[[[[[1]]]]]` and a thousand brackets. (Does it overflow the stack, and is that a clean error?)
- **Very long numbers**: `99999999999999999999` and `0.000000000000001`. (Precision and the `1e-9` tolerance.)
- **Word operators next to function names**: `5ORABS[-1]`, `2ANDSQRT[4]`. (Does `eatAny` mis-split?)
- **Every operator with vacant on both sides**: `#8+#9`, `#8-#9`, `#8*#9`, `#8/#9` (divide by zero!), `#8MOD#9`.
- **Integer conversion in `AND`/`OR`/`XOR`**: `4294967296AND1` (a value beyond 32 bits is truncated). Lesson "Where to go next" flags this.

</details>

---

## Lesson 10: Should this be TypeScript?

Your original question. I tested it instead of guessing: I converted `macro2.mjs` to `macro2.ts` by adding annotations only (no logic changes), then ran the compiler in strict mode.

### The result

- **The conversion type-checks** under `strict`, with zero errors.
- **About 40 of the 182 lines change**, almost all of them signatures. The diff is below, in full.
- **It runs without a build step.** On Node 22, `node --experimental-strip-types file.ts` runs the TypeScript file directly (I verified it); the types are simply erased.

### What TypeScript catches that JavaScript lets through

I wrote three deliberate mistakes and compiled them:

```ts
const w = readWords('X1', vars);
console.log(w[0].valeu);                   // typo in a property name
readWords('X1');                           // forgot to pass vars
const total: number = evaluate('1', vars); // vacant (null) not handled
```

The compiler's real output:

```text
bad.ts(4,18): error TS2551: Property 'valeu' does not exist on type 'Word'. Did you mean 'value'?
bad.ts(5,1): error TS2554: Expected 2 arguments, but got 1.
bad.ts(6,7): error TS2322: Type 'Value' is not assignable to type 'number'.
  Type 'null' is not assignable to type 'number'.
```

The first is the same kind of mistake as the `conent`/`content` typo in your very first message. The third is the important one for *this* domain: `Value = number | null` makes the compiler force every caller to decide what to do about vacant. In plain JavaScript, forgetting that is a silent bug.

### The whole conversion

The new types at the top of the file are:

```ts
export type Value = number | null; // null = vacant
export interface Vars { get(n: number): Value }
export interface Word { letter: string; value: Value }
type Fn = (...args: number[]) => number;
```

And here is every line that changed, as a diff of `macro2.mjs` into `macro2.ts`:

```diff
@@ -1,3 +1,8 @@
-const num = (v) => v ?? 0; // vacant (null) counts as 0 in arithmetic
-const rad = (d) => (d * Math.PI) / 180;
-const deg = (r) => (r * 180) / Math.PI;
+export type Value = number | null; // null = vacant
+export interface Vars { get(n: number): Value }
+export interface Word { letter: string; value: Value }
+type Fn = (...args: number[]) => number;
+
+const num = (v: Value): number => v ?? 0; // vacant (null) counts as 0 in arithmetic
+const rad = (d: number) => (d * Math.PI) / 180;
+const deg = (r: number) => (r * 180) / Math.PI;
@@ -7 +12 @@
-const ADDITIVE = {
+const ADDITIVE: Record<string, Fn> = {
@@ -13 +18 @@
-const MULTIPLICATIVE = {
+const MULTIPLICATIVE: Record<string, Fn> = {
@@ -21,2 +26,2 @@
-const same = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) < EPS);
-const COMPARISONS = {
+const same = (a: Value, b: Value): boolean => (a === null || b === null ? a === b : Math.abs(a - b) < EPS);
+const COMPARISONS: Record<string, (a: Value, b: Value) => boolean> = {
@@ -32 +37 @@
-const ONE_ARG = {
+const ONE_ARG: Record<string, Fn> = {
@@ -51 +56 @@
-const TWO_ARG = {
+const TWO_ARG: Record<string, Fn> = {
@@ -57 +62,5 @@
-  constructor(text, vars) {
+  text: string;
+  vars: Vars;
+  pos = 0;
+
+  constructor(text: string, vars: Vars) {
@@ -60 +68,0 @@
-    this.pos = 0;
@@ -64,4 +72,4 @@
-  get rest() { return this.text.slice(this.pos); }
-  get done() { return this.pos >= this.text.length; }
-  where() { return `at "${this.rest || 'end'}"`; }
-  fail(message) { throw new Error(`${message} in ${this.text}`); }
+  get rest(): string { return this.text.slice(this.pos); }
+  get done(): boolean { return this.pos >= this.text.length; }
+  where(): string { return `at "${this.rest || 'end'}"`; }
+  fail(message: string): never { throw new Error(`${message} in ${this.text}`); }
@@ -69,2 +77,2 @@
-  peek(word) { return this.text.startsWith(word, this.pos); }
-  eat(word) {
+  peek(word: string): boolean { return this.text.startsWith(word, this.pos); }
+  eat(word: string): boolean {
@@ -75 +83 @@
-  eatAny(words) {
+  eatAny(words: string[]): string | null {
@@ -79 +87 @@
-  expect(word) {
+  expect(word: string): void {
@@ -82 +90 @@
-  number() {
+  number(): number {
@@ -88 +96 @@
-  letter() {
+  letter(): string {
@@ -96 +104 @@
-  compare() {
+  compare(): Value {
@@ -102,2 +110,2 @@
-  sum()     { return this.binary(this.product, ADDITIVE); }
-  product() { return this.binary(this.unary, MULTIPLICATIVE); }
+  sum(): Value    { return this.binary(this.product, ADDITIVE); }
+  product(): Value { return this.binary(this.unary, MULTIPLICATIVE); }
@@ -106 +114 @@
-  binary(next, table) {
+  binary(next: () => Value, table: Record<string, Fn>): Value {
@@ -117 +125 @@
-  unary() {
+  unary(): Value {
@@ -123 +131 @@
-  primary() {
+  primary(): Value {
@@ -135 +143 @@
-  variable() { // after the '#': 101, [#1+1], or another #
+  variable(): Value { // after the '#': 101, [#1+1], or another #
@@ -140 +148 @@
-  call(name) {
+  call(name: string): number {
@@ -159 +167 @@
-  wordValue() {
+  wordValue(): Value {
@@ -167 +175 @@
-export function evaluate(text, vars) {
+export function evaluate(text: string, vars: Vars): Value {
@@ -174 +182 @@
-export function readWords(code, vars) {
+export function readWords(code: string, vars: Vars): Word[] {
@@ -176 +184 @@
-  const words = [];
+  const words: Word[] = [];
```

### Reproduce it yourself

<details><summary>Commands and config I used</summary>

In a folder containing `macro2.ts` (your `macro2.mjs` plus the annotations in the diff above):

```bash
npm init -y
npm i typescript @types/node
```

`tsconfig.json`:

```json
{ "compilerOptions": { "strict": true, "noEmit": true, "target": "es2022", "module": "nodenext", "lib": ["es2023"], "types": ["node"], "allowImportingTsExtensions": true }, "files": ["macro2.ts", "usage.ts"] }
```

`usage.ts`, a tiny caller:

```ts
import { evaluate, readWords, type Vars } from './macro2.ts';
const table: Record<number, number> = { 1: 5 };
const vars: Vars = { get: (n) => table[n] ?? null };
const words = readWords('X[#1+1.]', vars);
console.log(words[0].value, evaluate('#1', vars));
```

Then:

```bash
npx tsc -p .                                    # type-check: prints nothing when clean
node --experimental-strip-types usage.ts        # run the .ts file directly (Node 22+)
```

The second command printed `6 5` when I ran it: the first word's value (`X[#1+1.]` with `#1 = 5`) and `evaluate('#1')`.

(`allowImportingTsExtensions` is needed because `usage.ts` imports `./macro2.ts` by its real file name, which is what Node's type stripping requires.)

</details>

### Recommendation

Convert, for this project. Three reasons that apply here specifically:

1. Your data has a real "maybe a number" shape (vacant), and TypeScript is exactly the tool for enforcing "maybe" at every call site.
2. The editor, the parser and the timing model all pass the same line and word objects around. A shared `SourceLine`, `Word` or `Vars` type means a change in one place shows up as an error in the others.
3. The cost is low: no logic changes, and Node 22 can run `.ts` files directly (older versions, or production builds, need a compile step with `tsc` or a bundler).

The honest alternative, if you want zero tooling for now: keep `.js`, add `// @ts-check` at the top and the JSDoc types you already have. You get the same editor squiggles without a build step, and can rename to `.ts` later. But since you asked directly: I would convert, and do it now, while the codebase is small.


### Go deeper

#### What the types buy you, concretely

Three of the new types do almost all the work:

- **`Value = number | null`** turns "remember vacant exists" from a habit into a rule the compiler enforces. Every place that receives a `Value` must either handle `null` or pass it along.
- **`fail(...): never`** says this function does not return normally (it always throws). That lets the compiler understand `if (!m) this.fail(...)` followed by `m[0]`: after the `if`, `m` cannot be `null`, so no extra check is needed.
- **`Record<string, Fn>`** says "an object mapping names to functions", which is what the operator and function tables are.

#### Exercises

**10.1 Write `requireNumber`.** In the timing model you will often have a `Value` and need a real number. Write `requireNumber(v: Value, what: string): number` that throws if `v` is vacant. Then see what TypeScript says if you *forget* the check.

<details><summary>Solution</summary>

Save as `req.ts` next to `macro2.ts`:

```ts
import { evaluate, type Value, type Vars } from './macro2.ts';

/** Turn "a number or vacant" into "a number", or fail loudly. */
export function requireNumber(v: Value, what: string): number {
  if (v === null) throw new Error(`${what} is vacant`);
  return v; // here TypeScript knows v is a number
}

const vars: Vars = { get: () => null };
console.log(requireNumber(evaluate('1+2', vars), 'result'));
try { requireNumber(evaluate('#9', vars), '#9'); } catch (e) { console.log((e as Error).message); }
```

It type-checks cleanly under `strict`, and `node --experimental-strip-types req.ts` prints:

```text
3
#9 is vacant
```

Now delete the `if (v === null) throw ...` line and compile again:

```text
req_bad.ts(5,3): error TS2322: Type 'Value' is not assignable to type 'number'.
  Type 'null' is not assignable to type 'number'.
```

The compiler will not let you return a `number | null` where a `number` is promised. Inside the `if`'s fall-through the compiler has *narrowed* `v` from `number | null` to `number`: it understands that the `null` case already threw. This kind of "the type changes as you check it" (called *narrowing*) is what makes `Value` pleasant rather than annoying.

</details>


---

## Lesson 11: Capstone: assignment statements

**Goal:** you extend the finished parser yourself. Real macro programs do not only *read* variables; they set them: `#100=#1+2`. This lesson gives the design and a worked solution, but the right way to use it is to try each step first.

### The design question

Everything so far is an *expression* (it produces a value) or a *word list*. An assignment is a different thing, a **statement**: it *does* something. Its grammar is one rule:

```text
statement := '#' varindex '=' compare      (an assignment)
           | compare                         (an expression)
```

Right away there is a trap. Both alternatives can begin with `#`. `#100=#1+2` is an assignment, but `#100+2` is an expression that happens to start the same way. The parser cannot know which it is looking at until *after* it has read the variable number and seen whether `=` follows.

So the approach is: read `#`, read the variable index, then **look**. If `=` follows, it is an assignment; otherwise this was an expression all along, and we go back and parse the whole line as one.

### Step 1: split `variable()` in two (try this yourself first)

Currently `variable()` reads the index *and* fetches the value. An assignment needs the index without the fetch. In `macro2.mjs` (copy it to `macro3.mjs`), replace `variable()` with these two methods:

```js
  varIndex() { // after the '#': 101, [#1+1], or another #
    const index = this.peek('[') || this.peek('#') ? this.primary() : this.number();
    return Math.round(num(index));
  }

  variable() {
    return this.vars.get(this.varIndex());
  }
```

`varIndex()` is the old body without the `vars.get`, and `variable()` is now one line: the same behavior, built from the new piece. **That is a refactor: no behavior change.** (Run your `compare.mjs`-style test against it to prove it.)

### Step 2: write `run`

Add after `readWords` in `macro3.mjs`:

```js
export function run(line, vars) {
  const p = new Parser(line, vars);
  if (p.eat('#')) {
    const n = p.varIndex();
    if (p.eat('=')) {
      const value = p.compare();
      if (!p.done) p.fail(`cannot read "${p.rest}"`);
      vars.set(n, value);
      return value;
    }
  }
  return evaluate(line, vars); // not an assignment: start over from the beginning
}
```

Read it carefully, because the shape is the lesson:

1. Build a parser. `eat('#')`: if the line does not start with `#`, it cannot be an assignment; fall straight through.
2. Read the variable index. Now `eat('=')`: if it is there, we *know* this is an assignment: read the right-hand side with `compare()`, insist the line is finished, **store**, and return the value.
3. If there was no `=`, or no `#` at all, we reach the last line and call `evaluate(line, vars)`. This creates a **brand-new parser** and reads the line from the very beginning. The first parser's progress is simply thrown away.

That last point is **backtracking**: try one reading, and if it does not pan out, discard it and try the other from the start. It is cheap here for two reasons. A parser's whole state is `pos`, so "starting over" costs nothing, and the work we threw away was only a few characters. You will meet the same idea in much bigger parsers.

### Step 3: try it

`vars` now needs a `set` as well as a `get`, so the example uses a `Map` behind both.

Create `try11.mjs`:

```js
import { run } from './macro3.mjs';

const store = new Map([[1, 5]]);
const vars = {
  get: (n) => store.get(n) ?? null,
  set: (n, v) => store.set(n, v),
};

const lines = ['#100=#1+2', '#100', '#101=#100*2', '#[#1+95]=7', '#100', '#102=#9', '#102EQ0',
               '#1=#1+1', '#1=#1+1', '#1+2', '#=5', '#100=', '#100=1+'];
for (const line of lines) {
  try { console.log(line.padEnd(12), '->', run(line, vars)); }
  catch (e) { console.log(line.padEnd(12), '-> ERROR:', e.message); }
}
console.log('store:', JSON.stringify([...store]));
```

Run `node try11.mjs`. **Output:**

```text
#100=#1+2    -> 7
#100         -> 7
#101=#100*2  -> 14
#[#1+95]=7   -> 7
#100         -> 7
#102=#9      -> null
#102EQ0      -> 0
#1=#1+1      -> 6
#1=#1+1      -> 7
#1+2         -> 9
#=5          -> ERROR: expected a number at "=5" in #=5
#100=        -> ERROR: expected a number at "end" in #100=
#100=1+      -> ERROR: expected a number at "end" in #100=1+
store: [[1,7],[100,7],[101,14],[102,null]]
```

Read the output slowly:

- `#100=#1+2` stores **7** (and returns it). `#100` then reads it back. `#101=#100*2` uses the value just stored: 14.
- `#[#1+95]=7` assigns to a *computed* variable: `#1` is 5, so variable 100 gets 7. This works because `varIndex` accepts exactly what `variable` always did.
- `#102=#9` stores `null`: assigning a vacant value is allowed, and `#102EQ0` is then `0` (vacant is not zero), so vacant-ness survives a round trip through storage.
- **`#1=#1+1`, run twice, gives 6 then 7.** The right-hand side is evaluated completely *before* `set` is called, so it sees the old value. In a language where evaluation order was different, this would be a classic bug.
- `#1+2` is **9**, and it is *not* an assignment (`#1` is 7 by now, after the two increments, so 7 + 2). `eat('=')` failed, so `run` fell back to `evaluate`. This is the backtracking path.
- The last three are errors from the existing machinery: `#=5` has no variable number, and `#100=` and `#100=1+` are missing operands. We wrote no new error handling for any of them; the grammar's shape produced the right complaints.

### Challenges (no worked solutions; try them)

1. **Reject assignment to variable 0.** In many controls `#0` is a special read-only "always vacant" variable. Where in `run` would the check go, and what error would you throw?
2. **Several statements per line.** Combine `run` with Exercise 7.1: split on `;`, then run each block, returning a list of results.
3. **Compound assignment.** Write a test proving that `#1=#1+1` is not affected by evaluation order, by making `vars.get` log every call. Does the parser read `#1` once or twice?
4. **Mixed lines.** What should `#1=5G0X#1` do? Is this one block with an assignment followed by words, and if so, who should split it? (Look at where a real controller puts the boundary; the grammar above says nothing about it.)

A good sign that you have understood the course: you can decide, for each challenge, **which stage** (scanner, `prepare`, `run`, `readWords`) should own the change, before writing a line.

---

## Where to go next

- Decide whether `AND`/`OR`/`XOR` need more than 32 bits for your machine. Today they truncate to 32-bit integers.
- Write a *second* characterization test comparing `macro2.mjs` against real output captured from your machine's controller for 20 or 30 expressions. That turns "I think it matches Fanuc" into evidence.
- Put the tokenizer idea (Lesson 9) to work if you start adding syntax like `IF`/`WHILE`/`GOTO`, which are statements, not expressions.
- Bring questions back here. The most useful way: name the lesson, paste the code you ran and the output you got.

## Glossary

| Term | Meaning |
|---|---|
| **Cursor** | A position in the text plus the operations that read and advance it. |
| **Recursive descent** | Parsing with one function per grammar rule; rules call each other, and nesting becomes recursion. |
| **Precedence** | Which operators bind first. Encoded here by how low on the ladder a rung sits. |
| **Left-associative** | `a-b-c` means `(a-b)-c`. Produced by the fold-into-a-running-value loop. |
| **Stub** | A temporary stand-in for code you have not written yet, so you can run what you have. |
| **Vacant** | Fanuc's "never set" variable state; `null` here. Equal to 0 in arithmetic, but *not* in `EQ`/`NE`. |
| **Characterization test** | Run old and new code on the same inputs and examine only the differences. |
| **Regression** | A change in behavior you did not intend. |
| **Rung** | One level of the precedence ladder; one grammar rule; one function. |
| **Backtracking** | Trying one reading of the input and, if it fails, discarding it and starting over with another. |
| **Narrowing** | TypeScript working out that a value has a more specific type after you checked it. |
| **Statement vs expression** | An expression produces a value (`#1+2`). A statement does something (`#100=#1+2`). |
| **Finite is not sensible** | A number can pass `isFinite` and still be meaningless (`TAN[90]`). |

---

## Appendix A: The complete `macro.mjs` (end of Lesson 6)

Compare your file against this one if something does not match.

```js
const num = (v) => v ?? 0;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const FUNCTIONS = {
  SIN: (a) => Math.sin(rad(a)),
  COS: (a) => Math.cos(rad(a)),
  TAN: (a) => Math.tan(rad(a)),
  ASIN: (a) => deg(Math.asin(a)),
  ACOS: (a) => deg(Math.acos(a)),
  SQRT: Math.sqrt,
  SQR: Math.sqrt,
  ABS: Math.abs,
  ROUND: (a) => Math.sign(a) * Math.round(Math.abs(a)),
  FIX: (a) => Math.sign(a) * Math.floor(Math.abs(a)),
  FUP: (a) => Math.sign(a) * Math.ceil(Math.abs(a)),
  LN: Math.log,
  EXP: Math.exp,
  ADP: (a) => a,
  BIN: (a) => a,
  BCD: (a) => a,
};

export function parser(text, vars) {
  const p = {
    pos: 0,

    peek(word) {
      return text.startsWith(word, p.pos);
    },

    eat(word) {
      if (p.peek(word)) {
        p.pos += word.length;
        return true;
      }
      return false;
    },

    expect(word) {
      if (!p.eat(word)) {
        throw new Error(`expected ${word} at "${text.slice(p.pos) || 'end'}" in ${text}`);
      }
    },

    number() {
      const m = text.slice(p.pos).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!m) throw new Error(`expected a number at "${text.slice(p.pos) || 'end'}" in ${text}`);
      p.pos += m[0].length;
      return Number(m[0]);
    },

    primary() {
      if (p.eat('[')) {
        const v = p.compare();
        p.expect(']');
        return v;
      }
      if (p.eat('#')) {
        let n;
        if (p.eat('[')) {
          n = p.compare();
          p.expect(']');
        } else {
          n = p.number();
        }
        return vars.get(Math.round(num(n)));
      }
      if (p.eat('ATAN')) {
        p.expect('[');
        const a = num(p.compare());
        if (p.eat(',')) {
          const b = num(p.compare());
          p.expect(']');
          return deg(Math.atan2(a, b)); // ATAN[a,b]
        }
        p.expect(']');
        if (p.eat('/[')) {
          const b = num(p.compare());
          p.expect(']');
          return deg(Math.atan2(a, b)); // ATAN[a]/[b]
        }
        return deg(Math.atan(a));
      }
      if (p.eat('POW[')) {
        const a = num(p.compare());
        p.expect(',');
        const b = num(p.compare());
        p.expect(']');
        return a ** b;
      }
      for (const [name, fn] of Object.entries(FUNCTIONS)) {
        if (p.peek(`${name}[`)) {
          p.pos += name.length + 1;
          const v = fn(num(p.compare()));
          p.expect(']');
          return v;
        }
      }
      return p.number();
    },

    unary() {
      if (p.eat('-')) return -num(p.unary());
      if (p.eat('+')) return num(p.unary());
      return p.primary();
    },

    compare() {
      const left = p.sum();
      for (const op of ['EQ', 'NE', 'GT', 'GE', 'LT', 'LE']) {
        if (p.eat(op)) {
          const right = p.sum();
          const equal = left === right || (left !== null && right !== null && Math.abs(left - right) < 1e-9);
          if (op === 'EQ') return equal ? 1 : 0;
          if (op === 'NE') return equal ? 0 : 1;
          const a = num(left);
          const b = num(right);
          return { GT: a > b, GE: a >= b - 1e-9, LT: a < b, LE: a <= b + 1e-9 }[op] ? 1 : 0;
        }
      }
      return left;
    },

    sum() {
      let value = p.product();
      for (;;) {
        if (p.eat('+')) value = num(value) + num(p.product());
        else if (p.eat('-')) value = num(value) - num(p.product());
        else if (p.eat('OR')) value = num(value) | num(p.product());
        else if (p.eat('XOR')) value = num(value) ^ num(p.product());
        else return value;
      }
    },

    product() {
      let value = p.unary();
      for (;;) {
        if (p.eat('*')) value = num(value) * num(p.unary());
        else if (p.eat('/')) {
          const d = num(p.unary());
          if (d === 0) throw new Error(`divide by zero in ${text}`);
          value = num(value) / d;
        } else if (p.eat('AND')) value = num(value) & num(p.unary());
        else if (p.eat('MOD')) value = num(value) % num(p.unary());
        else return value;
      }
    },

    wordValue() {
      if (p.eat('-')) return -num(p.wordValue());
      if (p.eat('+')) return num(p.wordValue());
      if (p.peek('#') || p.peek('[')) return p.primary();
      return p.number();
    },
  };
  return p;
}

export function evaluate(text, vars) {
  const p = parser(text, vars);
  const value = p.compare();
  if (p.pos < text.length) throw new Error(`cannot read "${text.slice(p.pos)}" in ${text}`);
  return value;
}

export function readWords(code, vars) {
  const words = [];
  const p = parser(code, vars);
  while (p.pos < code.length) {
    const letter = code[p.pos];
    if (!/[A-Z]/.test(letter)) throw new Error(`cannot read "${code.slice(p.pos)}"`);
    p.pos += 1;
    words.push({ letter, value: p.wordValue() });
  }
  return words;
}
```

## Appendix B: Files and commands

| File | Created in | Run |
|---|---|---|
| `macro.mjs` | Lessons 1 to 6 | (imported by the others) |
| `try1.mjs` ... `try6.mjs` | Lessons 1 to 6 | `node try1.mjs` etc. |
| `lines.mjs` | Lesson 7 | (imported) |
| `try7a.mjs`, `try7b.mjs` | Lesson 7 | `node try7a.mjs` |
| `try8.mjs` | Lesson 8 | `node try8.mjs` |
| `macro2.mjs` | Lesson 9 | (imported) |
| `compare.mjs` | Lesson 9 | `node compare.mjs` |
| `macro2.ts`, `usage.ts`, `tsconfig.json` | Lesson 10 (optional) | `npx tsc -p .` then `node --experimental-strip-types usage.ts` |
| `trace.mjs` | Lesson 3 | (imported; or `node try3b.mjs`) |
| `break1.mjs` ... `break7b.mjs`, `probe5.mjs`, `probe8.mjs` | "Go deeper" sections | `node break1.mjs` etc. |
| `macro_*.mjs` variants | "Break it" sections (copies of `macro.mjs` with one change) | imported by the `break` scripts |
| `ex1.mjs` ... `ex9d.mjs` | exercise solutions | `node ex1.mjs` etc. |
| `macro3.mjs`, `try11.mjs` | Lesson 11 | `node try11.mjs` |
| `prim.mjs` | Lesson 0 | `node prim.mjs` |

One caution about the test files: `try1.mjs` through `try6.mjs` all import `./macro.mjs`, but they were written for *the file as it stood at that lesson*. If you run `try2.mjs` against your finished `macro.mjs`, the output will differ (for instance `1+2` will work). That is expected. To reproduce a lesson's output exactly, run its test before moving on to the next lesson.

## Appendix C: A debugging playbook for parsers

When a parser gives a wrong answer or a strange error, work through these in order. They are ordered from cheapest to most expensive.

1. **Read the error message literally.** Ours say *what was expected* and *what text was left*. `expected ] at ",3]"` means: the parser had read up to a comma and was hoping for `]`. Half the time that is the whole answer.
2. **Find the smallest input that still fails.** Delete pieces of the expression until the problem disappears, then put back the last piece. A 5-character failing input is easier to trace than a 50-character one.
3. **Print `pos` and the unread text.** The parser's only state is `pos`. If you know where the cursor is and what remains, you know what the next function sees.
4. **Trace it** (Lesson 3, `trace.mjs`). Wrap the rungs and read the call tree. You will see exactly which function was standing where the surprising character appeared.
5. **Ask "which function owns this character?"** Most bugs are a character being consumed by the wrong rung, or *not* consumed when it should be. Precedence bugs and associativity bugs are always wiring bugs.
6. **Check the order of any list tried with early exit.** `eatAny`, the function loop, the comparison loop. Can an earlier entry match the front of a later one? (Lesson 5, Exercise 9.1.)
7. **Compare against a known-good version** with the characterization test (Lesson 9). A difference you did not choose is the bug.
8. **Suspect the surrounding pipeline.** Lesson 7's failures were not in the parser at all but in what it was fed.

## Appendix D: Pitfalls checklist for hand-written parsers

Distilled from everything above. Skim it before you change the parser.

| Pitfall | Where you met it | Defence |
|---|---|---|
| Matching a prefix of something longer (`SQR` / `SQRT`, `/` / `//`) | L5, Ex 9.1 | Match something specific enough (include the `[`); otherwise list longer matches first |
| Reading without anchoring (searching instead of reading) | L1 | Anchor regexes with `^` on a slice from the cursor |
| Forgetting to check all input was consumed | L2 | `evaluate` checks `pos` reached the end |
| Right-associative by accident | L3 | Fold into a running value in a loop; recurse right only on purpose (`**`) |
| Losing `this` when passing methods around | L0.1, L9 | Closure style, or `.call(this)` / arrow functions / `.bind` |
| Treating "vacant" and "zero" as the same | L4 | Keep raw values until the moment of arithmetic; `compare` sees raw |
| Applying a tolerance to some comparisons but not others | L8 | One rule, one constant, all six operators |
| Letting `NaN` or `Infinity` escape | L8 | Check `Number.isFinite` where results are created |
| "Finite" but absurd results (`TAN[90]`) | L8 | Rules specific to the function; finite is not sensible |
| A test list that does not cover too-few / too-many / error cases | L9 | Cover each boundary; add every bug you find to the list |
| Silent coercion (rounding `#1.5`, joining `2 3`) | L2, L7 | Decide on purpose and document it |