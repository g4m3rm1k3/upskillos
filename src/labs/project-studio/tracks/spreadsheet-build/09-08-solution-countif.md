---
title: 9.8 — Solution: COUNTIF and SUMIF
runtime: none
experiments: Longest first
teaches: regex alternation order, default values in destructuring
uses: criteria, resource limits, regular expressions, functions as values, closures, comparison operators, mixed-type ordering, lazy evaluation, destructuring, array filter, input limits, denial of service, playground
---

### The story so far

The challenge (9.7) asked for `COUNTIF` and `SUMIF`: a range, a **criterion** like `">10"` or `"apple"`, and for `SUMIF` an optional second range to add up. It also asked for a limit: a range of more than 100,000 cells refused when the formula is read, because anyone a sheet is shared with chooses its formulas. Five supplied tests checked it, and the sprint was merged into `main` and pushed.

### What this lesson builds

Nothing new in the project: one solution, and the reasoning behind each part. If yours passed, keep it, and compare:

| file | what changes |
|---|---|
| `functions.ts` | `criterion` turns a criterion into a test function; `countIf` and `sumIf` use it, and are registered |
| `parser.ts` | three lines where a `range` node is made: work out its size, and throw if it's over 100,000 |

## Longest first {#longest-first}

The criterion's operator is found with a regular expression. Try the trap in the playground first. This step opens `playground/js/criteria.mjs`:

```javascript file=playground/js/criteria.mjs
const shortFirst = /^(<|<=|>|>=|<>|=)?(.*)$/;
const longFirst = /^(<=|>=|<>|<|>|=)?(.*)$/;
console.log(shortFirst.exec("<=10").slice(1));
console.log(longFirst.exec("<=10").slice(1));
console.log(longFirst.exec("apple").slice(1));
```

- **`( … | … )`** is **alternation**: any one of the choices. The `?` after it makes the whole group optional.
- **`(.*)`** is everything else. **`.exec(text)`** gives the whole match, then each group in order; `.slice(1)` keeps just the groups.

Before you run it, predict:

```predict
question: What does `shortFirst` give as the operator for `"<=10"`?
choice: <
choice: <=
answer: <
explain: Alternation tries the choices in the order they're written, and takes the first that lets the whole pattern match. `<` matches, and `(.*)` happily takes `=10`, so the match succeeds without ever trying `<=`. The criterion would become "less than the text `=10`".
verify: node -e "console.log(new RegExp('^(<|<=)?(.*)' + String.fromCharCode(36)).exec('<=10')[1])"
```

Run it: `node playground/js/criteria.mjs`.

```text
[ '<', '=10' ]
[ '<=', '10' ]
[ undefined, 'apple' ]
```

Writing the two-character operators first fixes it. And with no operator, the group is `undefined`: the solution reads that as `=`.

```check
run "node playground/js/criteria.mjs" stdout="[ '<=', '10' ]" label="the longer operators, tried first, are found whole"
```

## A criterion becomes a function {#criterion}

`criterion` does the work once, before any cell is checked, and gives back a function that checks one value:

```typescript
// A criterion like ">10", "<>apple" or 4, turned into a test for one value.
function criterion(rule: Value): ((value: Value) => boolean) | ErrorValue {
  if (typeof rule === "object") {
    return rule;
  }
  const match = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(rule));
  const op = (match?.[1] ?? "=") as Comparison;
  const text = match?.[2] ?? "";
  const target = text.trim() !== "" && !Number.isNaN(Number(text)) ? Number(text) : text;
  return (value) =>
    typeof value !== "object" && (value !== "" || target === "") && compare(op, value, target);
}
```

**`criterion`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `rule` | the criterion's value | `">10"`, `"apple"`, `12` |
| returns | a function: given a cell's value, does it pass? | for `">10"`: `(value) => … compare(">", value, 10)` |
| or returns | the criterion's own error, passed on | `=COUNTIF(B1:B5, 1/0)` |

- **`String(rule)`** lets a plain number like `12` go through the same regular expression as text: it becomes `"12"`, with no operator, so `=`.
- **`match?.[1] ?? "="`**: no operator means *equal to*. (`match` can't really be `null`, since `(.*)` matches anything, but TypeScript can't know that.)
- **`target`** is a number if the rest looks like one, with the same test as `literalValue` (5.3): `">10"` compares with the number 10, not the text `"10"`, which would rank above every number.
- **The function it returns** is a closure over `op` and `target`. It says no to errors, and no to empty cells unless the criterion is empty too; then `compare` (9.5) does the rest, ignoring capitals.

The trace, for `">10"` and column B's values:

| value | `typeof value !== "object"` | not empty | `compare(">", value, 10)` | passes |
|---|---|---|---|---|
| 4 | yes | yes | false | no |
| 12 | yes | yes | true | **yes** |
| 7 | yes | yes | false | no |
| 15 | yes | yes | true | **yes** |
| 3 | yes | yes | false | no |

So `COUNTIF(B1:B5, ">10")` is 2.

## COUNTIF {#countif}

With the test as a function, counting is `filter` (8.4) and a length:

```typescript
function countIf(args: Argument[]): Value {
  const [range, rule] = args;
  if (range === undefined || rule === undefined || args.length > 2) {
    return { error: "#VALUE!" };
  }
  const test = criterion(rule.value());
  if (typeof test === "object") {
    return test;
  }
  return range.values().filter(test).length;
}
```

**`countIf`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `args` | two `Argument`s: a range and a criterion | `A1:A5`, `"<>apple"` |
| returns | how many of the range's values pass | `Banana` and `cherry`: `2` (A5 is empty, so it doesn't count) |
| or returns | `#VALUE!` for the wrong number of arguments; the criterion's error | `=COUNTIF(B1:B5)` |

`rule.value()` and `range.values()`: the criterion is one value, the range is all of them. That's 9.6's `Argument` doing what it was made for.

## SUMIF {#sumif}

`SUMIF` checks one range and adds up another, position by position:

```typescript
function sumIf(args: Argument[]): Value {
  const [range, rule, sumRange = range] = args;
  if (range === undefined || rule === undefined || sumRange === undefined || args.length > 3) {
    return { error: "#VALUE!" };
  }
  const test = criterion(rule.value());
  if (typeof test === "object") {
    return test;
  }
  const checked = range.values();
  const added = sumRange.values();
  if (checked.length !== added.length) {
    return { error: "#VALUE!" };
  }
  let total = 0;
  for (let i = 0; i < checked.length; i++) {
    const value = added[i];
    if (!test(checked[i] ?? "")) {
      continue;
    }
    if (typeof value === "object") {
      return value;
    }
    if (typeof value === "number") {
      total += value;
    }
  }
  return total;
}
```

**`sumIf`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `args` | a range, a criterion, and optionally the range to add up | `A1:A5`, `"apple"`, `B1:B5` |
| returns | the total of the numbers whose partner passed | B1 + B3 = 4 + 7 = `11` |
| or returns | `#VALUE!` for the wrong arguments or two ranges of different sizes; an error from a cell it adds | `=SUMIF(A1:A5, "apple", B1:B3)` |

- **`[range, rule, sumRange = range]`** is a **default value in destructuring**: with only two arguments, `sumRange` is `range` itself, so `=SUMIF(B1:B5, ">5")` adds up the numbers it checked.
- **`checked[i] ?? ""`**: TypeScript can't know that `i` is inside the list, so the `?? ""` gives it a value for the impossible case.
- **An error is passed on only if its row passed**: a `#DIV/0!` in a row nobody asked for doesn't spoil the total. That's why the error check comes after the `continue`.

## A limit, where ranges are read {#limit}

In `src/parser.ts`, where a `range` node is made, before returning it:

```typescript
      const size = (Math.abs(to.address.column - token.address.column) + 1) * (Math.abs(to.address.row - token.address.row) + 1);
      if (size > 100000) {
        throw new FormulaError("A range can hold at most 100,000 cells", token.start);
      }
```

**What it works out, and what it does:**

| | what it is | example |
|---|---|---|
| the size | columns across × rows down | `A1:B50001`: 2 × 50,001 = 100,002 |
| over 100,000 | throw a `FormulaError`, so the cell shows `#ERROR!` | `=SUM(A1:ZZZ1000000)`: 18,278 × 1,000,000 |
| 100,000 or fewer | the range node, as before | `A1:A100000` |

- **`Math.abs( … ) + 1`**: `A10:A1` names the same ten cells as `A1:A10`, so the difference's direction doesn't matter, and both corners count.
- **Why in the parser**: the size is known from the two corners alone, so the formula is refused before a single cell is listed, read, or added to the graph. Checking in `SUM` would be too late: `references` would already have tried to list 18 billion cells for the graph.

That's the shape of most resource limits: check the size of the request from its description, cheaply, before doing any of the work it asks for.

## Your turn: wildcards, in the playground

Excel's `COUNTIF` also accepts **wildcards** in text criteria: `*` matches any run of characters, even none, and `?` matches exactly one, so `"app*"` matches *Apple* and *applesauce*. In `playground/js/wildcard.mjs`, write and export `matches(pattern, text)`: does the whole of `text` match `pattern`, ignoring capitals? Every other character in the pattern means itself, even ones that are special in regular expressions, like `.`. Commit.

| call | returns |
|---|---|
| `matches("app*", "Apple")` | `true` |
| `matches("a?c", "abc")`, `matches("a?c", "abbc")` | `true`, `false` |
| `matches("1.5", "105")` | `false`: the `.` is a real dot |
| `matches("*", "")` | `true` |
| `matches("app*", "Pineapple")` | `false`: the whole text must match |

```hints
nudge: Turn the pattern into a regular expression: `*` becomes `.*`, `?` becomes `.`, and the whole thing must match from start to end.
concept: Before turning `*` and `?` into regular-expression syntax, **escape** every other special character by putting a backslash before it, so `1.5` becomes `1\.5`. `new RegExp(source, "i")` builds a regular expression from text, ignoring capitals; `^` and `$` anchor it to the start and end.
shape: `const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");` then `replaceAll("*", ".*")` and `replaceAll("?", ".")`, then `` new RegExp(`^${regex}$`, "i").test(text) ``.
answer: ~~~javascript
export function matches(pattern, text) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = escaped.replaceAll("*", ".*").replaceAll("?", ".");
  return new RegExp(`^${regex}$`, "i").test(text);
}
~~~
```

```check
run "node -e \"import('./playground/js/wildcard.mjs').then(({ matches }) => console.log('[' + [matches('app*', 'Apple'), matches('a?c', 'abc'), matches('a?c', 'abbc'), matches('1.5', '105'), matches('*', ''), matches('app*', 'Pineapple')].join('|') + ']'))\"" stdout="[true|true|false|false|true|false]" label="matches handles * and ?, treats other characters literally, and matches the whole text" -- Escape the special characters first, then turn * into .* and ? into ., and anchor with ^ and $.
git-clean -- Commit it: git add playground, then git commit.
```
