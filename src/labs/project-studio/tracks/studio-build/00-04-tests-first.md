---
title: 0.4 — Tests First, with Vitest
track: Build Your Own Game Studio
runtime: none
concepts: testing, tdd, vitest
problem: The type checker knows greet returns a string, but not whether it's the right string. How do you know a function does what it should, and goes on doing it after every change you make for the next six months?
---

Types say what *kind* of value comes back. A **test** says what value: it calls your code with a known input and compares the answer with the one you expect. A **test runner** finds every test in the project, runs them all, and reports which failed and why, in a second or two. Run it after every change and you know at once whether you broke something that worked.

This lesson also writes a test **before** the code it tests. That habit, called **test-driven development**, has three beats: write a test that fails (**red**), write just enough code to pass it (**green**), then tidy up while it stays green. The failing test proves the test can fail: a test that never fails tests nothing.

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
- `expect(value)` wraps the value your code produced; `.toBe(expected)` compares it with `===`, strict equality: same type and same value. If they differ it **throws** an error, which stops the function and marks the test failed.
- Files ending `.test.ts` are found by Vitest automatically.

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

What should `greet('')` return, when there's no name? `Hello, !` is clearly wrong. Decide the right answer first, as a test, before changing any code. Add a second test:

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

Change `src/greet.ts`:

```ts file=src/greet.ts
export function greet(name: string): string {
  return name ? `Hello, ${name}!` : 'Hello!';
}
```

- `condition ? a : b` is the **conditional operator**: if the condition is true it evaluates to `a`, otherwise to `b`.
- A string used as a condition is true unless it's empty: `''` is **falsy**, any other string is **truthy**. So `name ? …` asks "is there a name?".
- Both branches are strings, so the return type `string` still holds; the type checker agrees.

Run the tests: `2 passed`.

```check
run "npx vitest run src" stdout="2 passed"
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

## Challenge: red, green for a name with spaces

**Optional, ★★.** `greet('   ')` (only spaces) returns `Hello,    !`. Decide what it should return, write the test first and watch it fail, then change `greet` until both old tests and the new one pass.

```hints
nudge: A string of spaces is truthy, so the condition lets it through. What would make it look empty?
concept: Red first: the test must fail before you change the code, or you can't tell it tests anything. Then the smallest change that passes.
shape: Strings have a trim() method that removes spaces at both ends: name.trim() ? `Hello, ${name.trim()}!` : 'Hello!'
```
