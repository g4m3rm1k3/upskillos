---
title: 0.4 — Tests First, with Vitest
track: Build Your Own Game Studio
runtime: none
concepts: testing, tdd, vitest
problem: The type checker knows greet returns a string, but not whether it's the right string. How do you know a function does what it should, and goes on doing it after every change you make for the next six months?
---

Types say what *kind* of value comes back. A **test** says what value: it calls your code with a known input and compares the answer with the one you expect. A **test runner** finds every test in the project, runs them all, and reports which failed and why, in a second or two.

Why bother, when you could run the program and look?

- **Every change can break something that worked.** Something that worked and stops working is called a **regression**. In six months the studio will have hundreds of functions; nobody can try them all by hand after every change. The test runner can, in seconds.
- **A test is a description you can run.** Its name says what the code should do; its body proves it does. When a test fails, you know exactly what broke.
- **A test lets you change code without fear.** If the tests still pass after you tidy something up, you didn't break anything they cover.

This lesson also writes a test **before** the code it tests. That habit, called **test-driven development** (TDD), has three beats, and you'll do all three here:

1. **Red**: write a test for something the code doesn't do yet, and watch it fail. The failing test proves the test can fail: a test that never fails tests nothing.
2. **Green**: write the least code that makes it pass. Not the cleverest, not the most general: the least. You're only answering the test.
3. **Refactor**: now that the tests pass, tidy the code (and the tests) without changing what they do, and run the tests again to prove it.

Then the next test, and round again. Each round is small: one behaviour at a time.

## Install Vitest

```powershell
npm install --save-dev --save-exact vitest@5.0.3
```

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vitest": "5.0.3"
  }
}
```

- **Vitest** is a test runner. It reads TypeScript directly: it removes the types as it loads each file, so tests run without a separate build step.
- npm adds it to `"devDependencies"` and to `package-lock.json`, with the dozens of packages Vitest itself uses. `npm ls vitest` shows the one you installed.

```check
contains package.json "\"vitest\": \"5.0.3\"" -- npm install --save-dev --save-exact vitest@5.0.3
run "npx vitest --version" stdout="vitest/5.0.3"
```

## A first test

Create `src/greet.test.ts`:

```ts file=src/greet.test.ts
import { expect, test } from 'vitest';
import { greet } from './greet';

test('greets by name', () => {
  expect(greet('Studio')).toBe('Hello, Studio!');
});
```

- `import { expect, test } from 'vitest'`: an import without `./` names a package in `node_modules`, here Vitest's own module.
- `test(name, fn)` **registers** a test: it stores the name (a string, shown in the report) and the function `fn` in Vitest's list. Nothing runs yet; Vitest calls each function later, one at a time.
- `() => { … }` is an **arrow function**: a function with no name, written where it's used. `test` receives it as a value, like any other argument.
- `expect(value)` wraps the value your code produced; `.toBe(expected)` compares it with `===`, strict equality: same type and same value. If they differ it **throws** an error, which stops the function and marks the test failed. A check like this is called an **assertion**: the test asserts that something is true.
- The name, `'greets by name'`, is a short sentence about what the code does, not about how. When this test fails one day, the report will read "greets by name: failed", which tells you what broke before you open any file.
- Files ending `.test.ts` are found by Vitest automatically.
- This first test is written **after** the code: `greet` already works. A test like this pins down what working code does today, so a later change can't break it without you hearing about it. From the next step on, the tests come first.

Run every test once:

```powershell
npx vitest run src
```

```text
 ✓ src/greet.test.ts (1 test) 2ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

- `run` runs the tests once and exits. Without it, Vitest keeps watching your files and runs the tests again whenever you save. `src` limits it to tests in `src` (lesson 0.7 adds tests that live elsewhere).

```check
run "npx vitest run src" stdout="1 passed" -- Save src/greet.test.ts, then npx vitest run src
```

## Red: a test for what greet doesn't do yet

What should `greet('')` return, when there's no name? `Hello, !` is clearly wrong. An empty string is an **edge case**: a value at the edge of what a function can be given, like an empty list, a zero, or the largest number allowed. Code is usually written with the ordinary values in mind, so bugs gather at the edges, and good tests go looking for them.

Decide the right answer first, as a test, before changing any code. Add a second test:

```ts file=src/greet.test.ts
import { expect, test } from 'vitest';
import { greet } from './greet';

test('greets by name', () => {
  expect(greet('Studio')).toBe('Hello, Studio!');
});

test('greets nobody in particular when there is no name', () => {
  expect(greet('')).toBe('Hello!');
});
```

```predict
question: What does npx vitest run src report?
choice: 2 passed: greet already returns a string for ''
choice: 1 passed, 1 failed: the new test gets 'Hello, !'
choice: An error: '' isn't a name
answer: 1 passed, 1 failed: the new test gets 'Hello, !'
explain: '' is a string, so the type checker and the code accept it; greet puts it between "Hello, " and "!" and returns "Hello, !". toBe compares that with "Hello!", they differ, and the test fails. That's the point of red: the test describes behaviour the code doesn't have yet.
```

Run the tests:

```text
 FAIL  src/greet.test.ts > greets nobody in particular when there is no name
AssertionError: expected 'Hello, !' to be 'Hello!' // Object.is equality

Expected: "Hello!"
Received: "Hello, !"
```

- Vitest names the failing test, then shows **Expected** (your test's answer) and **Received** (what the code returned). Reading those two lines is most of debugging a failed test.
- The run ends with exit code 1, so anything running the tests (a script, a check, a build server) knows they failed.

```check
run "npx vitest run src" exit=1 stderr="expected 'Hello, !' to be 'Hello!'" label="the new test fails, with greet('') returning 'Hello, !'"
```

## Green: make it pass

Write the least code that passes. Change `src/greet.ts`:

```ts file=src/greet.ts
export function greet(name: string): string {
  if (name === '') {
    return 'Hello!';
  }
  return `Hello, ${name}!`;
}
```

- `if (condition) { … }` runs the lines inside the braces only when the condition is true.
- `name === ''` is true when the name is the empty string. Then `return 'Hello!'` hands back the answer and leaves the function at once, so the last line doesn't run.
- For any other name the `if` is skipped, and the last line returns the greeting as before.
- It's plain and obvious, and that's the point of green: the simplest code you can see is right.

Run the tests: `2 passed`. Both: the new test, and the first one, which proves the old behaviour still works.

```check
run "npx vitest run src" stdout="2 passed"
run "npx tsc"
```

## Refactor: tidy while green

The tests pass, so this is the moment to tidy. Five lines for "a greeting, or `Hello!` if there's no name" is more than it needs. Change `src/greet.ts`:

```ts file=src/greet.ts
export function greet(name: string): string {
  return name ? `Hello, ${name}!` : 'Hello!';
}
```

- `condition ? a : b` is the **conditional operator**: if the condition is true it evaluates to `a`, otherwise to `b`. It's an `if` that gives a value, so one `return` does the whole job.
- A string used as a condition is true unless it's empty: `''` is **falsy**, any other string is **truthy**. So `name ? …` asks "is there a name?", which is the same question as `name !== ''`.
- Both branches are strings, so the return type `string` still holds; the type checker agrees.
- This is a **refactoring**: the code is shaped differently, but for every name it returns exactly what it did before. You don't have to take that on trust. Run the tests again: still `2 passed`. If the tidy-up had changed what `greet` does for either name, a test would say so now.
- Not every green needs a refactor. When the code is already clear, say so and move on.

```check
run "npx vitest run src" stdout="2 passed" label="the tidier greet passes the same tests"
run "npx tsc"
```

## The test script

Make the tests a script, so nobody has to remember the command:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc",
    "test": "vitest run src"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vitest": "5.0.3"
  }
}
```

- `"test"` is a name npm treats specially: `npm test` runs it, without `run`. Every Node project's tests are started the same way.

```check
run "npm test" stdout="2 passed"
```

## Commit, and tick the story

Tick the third story in `BACKLOG.md` (*automated tests*), then:

```powershell
git add .
git commit -m "Vitest: greet's tests, and greeting nobody"
```

```check
contains BACKLOG.md "- [x] As a developer, I want automated tests"
git-clean
git-tracked src/greet.test.ts
```

## Challenge: red, green, refactor for a name with spaces

**Optional, ★★.** `greet('   ')` (only spaces) returns `Hello,    !`. Decide what it should return, write the test first and watch it fail, then change `greet` until both old tests and the new one pass. Then look at what you wrote: is there anything to tidy, with the tests still passing?

```hints
nudge: A string of spaces is truthy, so the condition lets it through. What would make it look empty?
concept: Red first: the test must fail before you change the code, or you can't tell it tests anything. Then the smallest change that passes. A greeting of only spaces is another edge case.
shape: Strings have a trim() method that removes spaces at both ends: name.trim() ? `Hello, ${name.trim()}!` : 'Hello!'
```
