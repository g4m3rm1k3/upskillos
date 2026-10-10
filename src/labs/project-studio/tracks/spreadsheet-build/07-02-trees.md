---
title: 7.2 — Formulas, Part 2: A Tree, and Working It Out
runtime: none
experiments: Arithmetic; Branches, and recursion
teaches: trees, recursion, base cases, call stack, recursive types, dependency injection, errors as values, switch
uses: discriminated unions, union types, narrowing, type-only imports, tests, vitest, playground, stack traces
---

Tokens are a flat list: `A1`, `+`, `B1`, `*`, `2`. A formula isn't flat. In `A1+B1*2`, the `*` joins `B1` and `2`, and the `+` joins `A1` and **the result of that multiplication**. A structure where things contain other things is a **tree**:

```text
        +
       / \
     A1   *
         / \
       B1   2
```

Read it from the bottom up: the multiplication is worked out first because it's lower down, and its result becomes the right side of the addition. **Order of operations is the shape of the tree.** Brackets just build a different tree: `(A1+B1)*2` puts the `+` under the `*`.

This lesson defines that tree and writes the code that works one out. The next lesson builds trees from tokens. Doing it in this order means you can test the calculation with hand-made trees before the parser exists, so each piece is tested on its own.

## Values: what a cell can hold

A cell's value is a number, some text, or an error. This step opens `src/values.ts`:

```typescript file=src/values.ts
export type ErrorCode = "#DIV/0!" | "#VALUE!" | "#ERROR!";

export interface ErrorValue {
  error: ErrorCode;
}

export type Value = number | string | ErrorValue;
```

- **`ErrorCode`** is the list of errors a cell can show, the same names Excel uses: `#DIV/0!` for division by zero, `#VALUE!` for arithmetic on text (`="Coffee"*2`). `#ERROR!` (Google Sheets' name) is for a formula that can't be read at all.
- **An error is a value**, an object like `{ error: "#DIV/0!" }`, not an exception. That's a design decision, and it's the key one in this lesson. In a spreadsheet, an error in one cell must not stop the others: D2 can show `#DIV/0!` while D3 shows `7`, and a formula that uses D2 should show D2's error too. Values flow from cell to cell; exceptions jump out of the whole calculation. So errors travel as values.
- **`Value = number | string | ErrorValue`** is a union of three types. Code tells them apart with `typeof`: `typeof value === "number"`, `"string"`, and for the error object, `"object"`.

```check
file src/values.ts
contains src/values.ts "export type Value = number | string | ErrorValue;"
```

## The tree's type

This step opens `src/expression.ts`:

```typescript file=src/expression.ts
import type { Address } from "./address.ts";

export type Operator = "+" | "-" | "*" | "/";

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "cell"; address: Address }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression };
```

An `Expression` is one node of the tree, and there are three kinds:

- **`number`**: a constant, like the `2`. It has no children; it's a **leaf**.
- **`cell`**: a reference to a cell, like `B1`. Also a leaf.
- **`binary`**: an operator with two sides, its children. ("Binary" means "with two parts".)

Look at `left: Expression; right: Expression`. The type **refers to itself**: a binary expression contains two expressions, each of which may be another binary expression, containing two more, and so on. That's how one type describes a tree of any size. A type defined in terms of itself is a **recursive type**.

(This is the same discriminated-union pattern as `Token` in lesson 7.1: one `kind` field, and different fields for each kind.)

`import type` imports only a type. It disappears from the JavaScript (lesson 6.4).

```check
file src/expression.ts
```

## Tests with hand-built trees

The tests are supplied: click **Create provided src/evaluate.test.ts** and read them:

```typescript file=src/evaluate.test.ts provided
import { describe, expect, it } from "vitest";
import type { Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import type { Expression } from "./expression.ts";
import type { Value } from "./values.ts";

// The tree for 2 + 3 * 4, built by hand: the multiplication is a branch of the addition.
const twoPlusThreeTimesFour: Expression = {
  kind: "binary",
  op: "+",
  left: { kind: "number", value: 2 },
  right: {
    kind: "binary",
    op: "*",
    left: { kind: "number", value: 3 },
    right: { kind: "number", value: 4 },
  },
};

const noCells = (): Value => "";

describe("evaluate", () => {
  it("gives a number its own value", () => {
    expect(evaluate({ kind: "number", value: 7 }, noCells)).toBe(7);
  });

  it("works out the branches before the operator that joins them", () => {
    expect(evaluate(twoPlusThreeTimesFour, noCells)).toBe(14);
  });

  it("asks valueAt for the value of a cell", () => {
    const cells = (address: Address): Value => (address.column === 1 && address.row === 1 ? 3.5 : 2);
    const b2TimesC2: Expression = {
      kind: "binary",
      op: "*",
      left: { kind: "cell", address: { column: 1, row: 1 } },
      right: { kind: "cell", address: { column: 2, row: 1 } },
    };
    expect(evaluate(b2TimesC2, cells)).toBe(7);
  });

  it("counts an empty cell as 0, and text as an error", () => {
    const onePlusA1: Expression = {
      kind: "binary",
      op: "+",
      left: { kind: "number", value: 1 },
      right: { kind: "cell", address: { column: 0, row: 0 } },
    };
    expect(evaluate(onePlusA1, () => "")).toBe(1);
    expect(evaluate(onePlusA1, () => "Coffee")).toEqual({ error: "#VALUE!" });
  });

  it("gives #DIV/0! for division by zero, and passes errors on", () => {
    const divide: Expression = { kind: "binary", op: "/", left: { kind: "number", value: 1 }, right: { kind: "number", value: 0 } };
    expect(evaluate(divide, noCells)).toEqual({ error: "#DIV/0!" });
    const plusOne: Expression = { kind: "binary", op: "+", left: divide, right: { kind: "number", value: 1 } };
    expect(evaluate(plusOne, noCells)).toEqual({ error: "#DIV/0!" });
  });
});
```

### The decision these tests make: valueAt

`evaluate` takes the tree and a second argument, **`valueAt`**: a function that, given an address, returns that cell's value. The evaluator never looks at a sheet itself. It asks.

Why? Because then the evaluator works with any source of cell values. In the tests, the source is a one-line function: `noCells` says every cell is empty; `cells` says B2 is 3.5 and everything else is 2. In the real program (lesson 7.4) it will be the sheet. The evaluator can be tested completely without building a sheet, and it can't depend on how the sheet stores things. Passing in what a function needs, instead of letting it reach out for it, is called **dependency injection**; you'll see it again with the server in phase 5.

The other decisions are in the test names: an empty cell counts as 0 (as in Excel), text in arithmetic is `#VALUE!`, and an error **passes on** to every formula that uses it.

```check
file src/evaluate.test.ts
run "npx vitest run evaluate" exit=1 stderr="evaluate.ts" label="the evaluate tests fail: evaluate.ts doesn't exist yet (red)"
```

## Arithmetic {#calculate}

The evaluator is built from the bottom up: first the arithmetic, then the leaves of the tree, then the branches. Before the code, a question about JavaScript:

```predict
question: What does JavaScript give for `1 / 0`?
choice: An error
choice: 0
choice: Infinity
answer: Infinity
explain: JavaScript's numbers follow the IEEE 754 standard (the floating point of lesson 0.3), which defines dividing by zero as `Infinity`. Nothing stops, nothing warns. A spreadsheet that showed `Infinity` would be hiding a mistake, so the arithmetic below checks for it.
verify: node -e "console.log(1 / 0)"
```

This step opens `src/evaluate.ts`, with the one function that does arithmetic:

```typescript file=src/evaluate.ts
import type { Operator } from "./expression.ts";
import type { Value } from "./values.ts";

function calculate(op: Operator, left: number, right: number): Value {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? { error: "#DIV/0!" } : left / right;
  }
}
```

- **`calculate`** does the actual arithmetic, including the one rule arithmetic itself adds: dividing by zero gives `#DIV/0!`. (Without that check, JavaScript would give `Infinity`, and a spreadsheet showing `Infinity` would be hiding a mistake.)
- **`switch (op)`** picks the case that matches `op`, like an `if`/`else if` chain on one value. Each `case` returns, so no case runs into the next.
- **There's no `return` after the `switch`**, and TypeScript doesn't complain, because `op` is an `Operator` and the four cases cover all four. Delete one case and run the check: TypeScript reports *Function lacks ending return statement*. Put it back.

Try the other edge cases in Node's prompt: `-1 / 0`, `0 / 0`, and `Number.isNaN(0 / 0)`.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/evaluate.ts" label="evaluate.ts type-checks on its own" -- Every operator needs its case, and every case returns.
contains src/evaluate.ts "#DIV/0!" label="dividing by zero gives #DIV/0!" -- Check right === 0 before dividing.
```

## Leaves: the base cases {#leaves}

Now `evaluate` itself, starting with the leaves: a number is its own value, and a cell's value comes from `valueAt`. This step adds to `src/evaluate.ts`:

```typescript file=src/evaluate.ts
import type { Address } from "./address.ts";
import type { Expression, Operator } from "./expression.ts";
import type { Value } from "./values.ts";

export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "cell":
      return valueAt(expression.address);
  }
}

function calculate(op: Operator, left: number, right: number): Value {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? { error: "#DIV/0!" } : left / right;
  }
}
```

- **`switch (expression.kind)`** picks the case for this kind of node, like an `if`/`else if` chain on one value. Inside `case "number":`, TypeScript knows the node has a `value`, and inside `case "cell":` an `address` (the discriminated union again).
- **`valueAt: (address: Address) => Value`** is the type of a function: it takes an address and gives a value. The evaluator calls it and trusts the answer.

The project's `npx tsc` now complains that `evaluate` doesn't always return: `binary` isn't handled yet. That's the next step, and it's TypeScript checking that every kind is covered.

```check
run "npx vitest run evaluate -t \"its own value\"" stdout="1 passed" label="a number evaluates to itself"
run "node -e \"import('./src/evaluate.ts').then(({ evaluate }) => console.log(evaluate({ kind: 'cell', address: { column: 0, row: 0 } }, () => 42)))\"" stdout="42" label="a cell asks valueAt for its value" -- The cell case returns valueAt(expression.address).
```

## Branches, and recursion {#binary}

A `binary` node has two branches, and each branch is a whole tree of its own. This step adds the `binary` case:

```typescript file=src/evaluate.ts
import type { Address } from "./address.ts";
import type { Expression, Operator } from "./expression.ts";
import type { Value } from "./values.ts";

export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "cell":
      return valueAt(expression.address);
    case "binary": {
      const left = evaluate(expression.left, valueAt);
      if (typeof left !== "number") {
        return left;
      }
      const right = evaluate(expression.right, valueAt);
      if (typeof right !== "number") {
        return right;
      }
      return calculate(expression.op, left, right);
    }
  }
}

function calculate(op: Operator, left: number, right: number): Value {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? { error: "#DIV/0!" } : left / right;
  }
}
```

### Recursion: a function that calls itself

Look at the `binary` case: to work out a binary expression, `evaluate` calls **`evaluate`**, on the left side and then on the right side. A function that calls itself is **recursive**.

Why does that work, and why doesn't it go on forever? Because of two facts together:

1. **Each call is on a smaller tree.** The left side of a node is a smaller part of the tree than the node itself.
2. **The smallest trees are answered directly, without calling again.** A `number` or a `cell` is a leaf, and its case just returns a value. These are the **base cases**.

Every chain of calls goes down the tree, getting smaller, until it reaches leaves, where it stops. So the recursion always ends. A recursive function is correct when the base cases are right, **and** the recursive case is right **assuming the calls it makes are right**. For `binary`: if `evaluate` gives the correct value of the left side and the right side, then calculating them with the operator gives the correct value of the whole. Check those two things, and you've checked every tree of every size. You don't have to trace big trees in your head.

You can trace a small one, though, to see it happen. For `2 + 3 * 4`:

```text
evaluate(+)                     → needs its left and right
  evaluate(2)                   → 2                      (a leaf: base case)
  evaluate(*)                   → needs its left and right
    evaluate(3)                 → 3
    evaluate(4)                 → 4
                                  calculate("*", 3, 4) = 12
                                  calculate("+", 2, 12) = 14
```

While `evaluate(4)` runs, the calls for `*` and `+` are both still waiting for their answers. The computer keeps a list of the calls that are waiting, called the **call stack**: each new call goes on top, and each return takes the top one off. It's the same stack you saw in Node's error messages in lesson 0.4 (the `at …` lines) and in the debugger's *Call Stack* pane in lesson 6.5.

(Python works the same way, so you could write this evaluator in Python with the same shape. Recursion isn't a JavaScript feature; it's a way of solving a problem that contains smaller copies of itself.)

### Errors pass on

- **Errors pass on** because the `binary` case checks after each side: if the left side isn't a number, it's an error, and that error is returned as the answer, without even working out the right side. The first error found is the one the cell shows, the way Excel does it.
- **The `{ }` after `case "binary":`** give that case its own block, so its `const` variables don't clash with other cases.

To watch the recursion happen, add `console.log("evaluate", expression.kind);` as the first line of `evaluate`, and run `npx vitest run evaluate -t "branches"`. The order of the lines is the trace above. Then take the line out.

One rule is still missing. Predict:

```predict
question: With the code as it is now, what does `1 + A1` give when A1 is empty, so that `valueAt` returns `""`?
choice: 1
choice: ""
choice: {"error":"#VALUE!"}
answer: ""
explain: The right side's value is `""`, which isn't a number, so the `binary` case returns it as if it were an error: the empty text becomes the formula's answer. Empty cells should count as 0, and other text should be `#VALUE!`. That's the next step.
verify: node -e "import('./src/evaluate.ts').then(({ evaluate }) => { const n = (value) => ({ kind: 'number', value }); const b = (op, left, right) => ({ kind: 'binary', op, left, right }); const a1 = { kind: 'cell', address: { column: 0, row: 0 } }; console.log(JSON.stringify(evaluate(b('+', n(1), a1), () => ''))); })"
```

```check
run "npx vitest run evaluate" exit=1 stdout="4 passed" label="four of the five evaluate tests pass" -- Work out the left, return it if it isn't a number; the same for the right; then calculate.
run "node -e \"import('./src/evaluate.ts').then(({ evaluate }) => { const n = (value) => ({ kind: 'number', value }); const b = (op, left, right) => ({ kind: 'binary', op, left, right }); const a1 = { kind: 'cell', address: { column: 0, row: 0 } }; console.log(evaluate(b('-', n(10), n(4)), () => 0)); })\"" stdout="6" label="10 - 4 gives 6: left and right in the right order" -- calculate(expression.op, left, right): left first.
```

## Text and empty cells: toNumber {#to-number}

The last rule: before arithmetic, a value becomes a number or an error. This step adds `toNumber` and uses it on both sides:

```typescript file=src/evaluate.ts
import type { Address } from "./address.ts";
import type { Expression, Operator } from "./expression.ts";
import type { ErrorValue, Value } from "./values.ts";

export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "cell":
      return valueAt(expression.address);
    case "binary": {
      const left = toNumber(evaluate(expression.left, valueAt));
      if (typeof left !== "number") {
        return left;
      }
      const right = toNumber(evaluate(expression.right, valueAt));
      if (typeof right !== "number") {
        return right;
      }
      return calculate(expression.op, left, right);
    }
  }
}

function toNumber(value: Value): number | ErrorValue {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value === "" ? 0 : { error: "#VALUE!" };
  }
  return value;
}

function calculate(op: Operator, left: number, right: number): Value {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? { error: "#DIV/0!" } : left / right;
  }
}
```

- **`toNumber`** is where the value rules live: a number stays a number; empty text becomes 0; other text becomes `#VALUE!`; an error stays the same error. Its return type, `number | ErrorValue`, says that arithmetic only ever continues with a number or an error.
- **`ErrorValue`** joins the import, because `toNumber`'s return type names it.

```check
run "npx vitest run evaluate" stdout="5 passed" label="the 5 evaluate tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { evaluate } = await import('/src/evaluate.ts'); const n = (value) => ({ kind: 'number', value }); const b = (op, left, right) => ({ kind: 'binary', op, left, right }); const tree = b('-', b('/', n(10), n(4)), b('*', n(2), { kind: 'cell', address: { column: 0, row: 0 } })); return JSON.stringify([evaluate(tree, () => 0.25), evaluate(tree, () => 'x'), evaluate(b('/', n(1), b('-', n(2), n(2))), () => '')]); })()" "[2,{\"error\":\"#VALUE!\"},{\"error\":\"#DIV/0!\"}]" server=vite label="evaluate works out 10/4 - 2*A1, rejects text, and catches dividing by 2-2"
```

## Commit

```powershell
git add src/values.ts src/expression.ts src/evaluate.ts src/evaluate.test.ts
git commit -m "Add expression trees and the evaluator"
```

```check
git-tracked src/evaluate.ts
git-clean
```

## Your turn: rules for a feature flag

A product team ships features behind **feature flags**: a new screen is shown only to the people a rule picks out. A rule like *admins, or staff who aren't on mobile* is a tree:

```text
        or
       /  \
  admin    and
          /   \
      staff    not
                |
              mobile
```

Write `playground/js/logic.mjs`, exporting `evaluateLogic(tree, valueOf)`. A tree node is one of:

- `{ kind: "bool", value }`: `true` or `false`;
- `{ kind: "var", name }`: ask `valueOf(name)`, which gives `true` or `false`;
- `{ kind: "not", operand }`;
- `{ kind: "and", left, right }` and `{ kind: "or", left, right }`.

It's `evaluate` again, with different kinds. Test it in `playground/js/logic.check.mjs`, including a tree where `and` and `or` give different answers. Commit.

```hints
nudge: Which kinds are leaves (base cases), and which contain smaller trees?
concept: `bool` and `var` are the base cases: answer directly. `not`, `and` and `or` call `evaluateLogic` on their parts, then combine the answers with `!`, `&&` and `||`. Pass `valueOf` along on every call, as `evaluate` passes `valueAt`.
shape: `export function evaluateLogic(tree, valueOf) { switch (tree.kind) { case "bool": … case "var": … case "not": … case "and": … case "or": … } }`
answer: ~~~javascript
export function evaluateLogic(tree, valueOf) {
  switch (tree.kind) {
    case "bool":
      return tree.value;
    case "var":
      return valueOf(tree.name);
    case "not":
      return !evaluateLogic(tree.operand, valueOf);
    case "and":
      return evaluateLogic(tree.left, valueOf) && evaluateLogic(tree.right, valueOf);
    case "or":
      return evaluateLogic(tree.left, valueOf) || evaluateLogic(tree.right, valueOf);
  }
}
~~~
```

```check
run "node --test playground/js/logic.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/logic.mjs').then(({ evaluateLogic }) => { const v = (name) => ({ kind: 'var', name }); const rule = { kind: 'or', left: v('admin'), right: { kind: 'and', left: v('staff'), right: { kind: 'not', operand: v('mobile') } } }; const people = [{ admin: true, staff: false, mobile: true }, { admin: false, staff: true, mobile: false }, { admin: false, staff: true, mobile: true }, { admin: false, staff: false, mobile: false }]; console.log(JSON.stringify(people.map((p) => evaluateLogic(rule, (name) => p[name])))); })\"" stdout="[true,true,false,false]" label="the feature-flag rule picks out the right people" -- or and and combine their two sides; not flips its one operand; var asks valueOf.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/logic.check.mjs $d; Set-Content (Join-Path $d 'logic.mjs') 'export function evaluateLogic(t, v) { switch (t.kind) { case `bool`: return t.value; case `var`: return v(t.name); case `not`: return !evaluateLogic(t.operand, v); default: return evaluateLogic(t.left, v) && evaluateLogic(t.right, v); } }'; node --test (Join-Path $d 'logic.check.mjs')" exit=1 label="your tests catch an evaluator that treats or as and" -- Test an or where only one side is true.
git-clean -- Commit it: git add playground, then git commit.
```
