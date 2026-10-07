---
title: 0.3 — TypeScript: Types Checked Before the Program Runs
track: Build Your Own Game Studio
runtime: none
concepts: npm-install, typescript, types
problem: In JavaScript, calling greet(42) instead of greet('Studio') runs without complaint and goes wrong later, somewhere else. In a program of thousands of lines, how do you catch that kind of mistake before it runs?
---

JavaScript checks nothing until a line runs. Pass a number where a string was meant and nothing stops you; the mistake shows up later, as wrong output or a crash, somewhere far from the cause. **TypeScript** is JavaScript with **types** written in: you say what kind of value each variable and parameter holds, and a program called the **type checker** reads your code, without running it, and reports every place a value of the wrong kind can arrive. The studio will be thousands of lines; the type checker is what keeps a change in one file from silently breaking another.

TypeScript doesn't run. Tools turn it into plain JavaScript by deleting the types, and JavaScript runs.

## Installing a tool

Type:

```powershell
npm install --save-dev --save-exact typescript@7.0.2
```

npm downloads TypeScript and changes `package.json`:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "hello": "node hello.js"
  },
  "devDependencies": {
    "typescript": "7.0.2"
  }
}
```

- `npm install typescript@7.0.2` downloads that exact version of the **package** (a library or tool someone published) from the npm registry, into a new folder, `node_modules/typescript`. TypeScript 7 is written in Go, so npm also downloads one ready-built program for your kind of computer (on Windows, `node_modules/@typescript/typescript-win32-x64`).
- `--save-dev` records it in `"devDependencies"`: what's needed to *develop* the project, not to run the finished app. (`"dependencies"`, coming later, holds what the app needs when it runs.)
- `--save-exact` records `"7.0.2"`. Without it, npm writes `"^7.0.2"`, meaning "7.0.2 or any newer 7.x", so two computers could install different versions. Exact versions mean everyone following this series has the same tools.
- npm also writes **`package-lock.json`**: the exact version of *everything* installed, including the packages TypeScript itself needs, with a checksum of each. `npm install` with no name, on another computer, reads it and installs exactly the same files. Commit it; never edit it by hand.
- `node_modules` is ignored by `.gitignore`: it can always be made again from `package-lock.json`.

```check
contains package.json "\"typescript\": \"7.0.2\"" -- npm install --save-dev --save-exact typescript@7.0.2
file package-lock.json
run "npx tsc --version" stdout="Version 7.0.2"
```

`npx tsc --version` runs the tool: `npx` finds a program installed in `node_modules` (here `tsc`, "TypeScript compiler") and runs it.

## Telling TypeScript about the project

Create `tsconfig.json`:

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src"]
}
```

- The file is one JSON object with two keys. `"compilerOptions"` holds an object of settings for how the code is checked; `"include"` says which files to check.
- `"include": ["src"]`: check every TypeScript file in the `src` folder.
- `"strict": true` turns on all of TypeScript's strict checks. The most important: a variable that might be `undefined` or `null` must be checked before it's used.
- `"noEmit": true`: only *check*. Turning TypeScript into JavaScript is done by the tools in the next lessons (Vitest and Vite), so `tsc` writes no files.
- `"target": "ES2022"`: the code may use JavaScript features up to the 2022 edition of the language standard (called ECMAScript, hence ES).
- `"module": "ESNext"` and `"moduleResolution": "Bundler"`: files use `import` and `export`, and an import like `'./greet'` (no ending) finds `greet.ts` the way bundling tools such as Vite do.
- `"lib"`: which built-in things exist. `ES2022` is the language itself; `DOM` adds what a web page has, such as `document`, which the studio's window will use.

```check
contains tsconfig.json "\"strict\": true"
contains tsconfig.json "\"include\": [\"src\"]"
```

## Rename greet.js

Rename `src/greet.js` to `src/greet.ts`:

```powershell
git mv src/greet.js src/greet.ts
```

- `git mv` renames the file on disk and tells Git it's the same file under a new name, so its history follows it.
- The file still holds JavaScript. Every JavaScript program is also a TypeScript program; the types are what you add next.

```check
file src/greet.ts
missing src/greet.js -- git mv src/greet.js src/greet.ts
```

## The first TypeScript

Change `src/greet.ts` to:

```ts file=src/greet.ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

- `name: string` is a **type annotation**: the parameter `name` may only hold a string.
- `): string` after the brackets annotates the **return type**: every `return` must hand back a string.
- `` `Hello, ${name}!` `` is a **template literal**: a string in backticks, where `${…}` is replaced by the value of the expression inside. It's the same string as `'Hello, ' + name + '!'`, easier to read.

Run the type checker:

```powershell
npx tsc
```

It prints nothing. Silence means no errors.

```check
contains src/greet.ts "name: string"
run "npx tsc" label="the type checker finds no errors"
```

## What the checker catches

Create `src/oops.ts`, a call with the wrong kind of value:

```ts file=src/oops.ts
import { greet } from './greet';

greet(42);
```

```predict
question: What does npx tsc report?
choice: Nothing: 42 can be turned into the string "42"
choice: An error on the line greet(42)
choice: An error in greet.ts, where the string is built
answer: An error on the line greet(42)
explain: greet's parameter is declared name: string, and 42 is a number. The checker reports it where the wrong value is passed, which is where the mistake is: src/oops.ts:3:7 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

Run `npx tsc`:

```text
src/oops.ts:3:7 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.

3 greet(42);
        ~~
```

- `src/oops.ts:3:7` is the file, line 3, column 7: where the 42 is.
- `TS2345` is the error's number; searching for it finds explanations online.
- `tsc` ends with **exit code** 1 instead of 0. Every program hands the shell a number when it ends: 0 means success, anything else failure. Scripts and checks read it.
- When its output goes to a file or another program instead of a terminal, `tsc` writes the same error in a shorter form: `src/oops.ts(3,7): error TS2345: …`.
- Plain JavaScript would have run this and printed `Hello, 42!`. That looks harmless here; in the studio, a number where a node's name was meant would break the scene tree much later, far from this line.

```check
run "npx tsc" exit=1 stdout="TS2345" label="the checker reports the wrong argument"
```

## Delete the mistake

Delete `src/oops.ts` (right-click it in the file tree, or `Remove-Item src/oops.ts` in the terminal), and run `npx tsc` again: no errors.

```check
missing src/oops.ts
run "npx tsc"
```

## A script for the checker, and goodbye to hello.js

`hello.js` was Node running JavaScript on its own. From now on the code is TypeScript, and the tools in the next lessons run it, so delete `hello.js`. Change `package.json`'s scripts:

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
    "typescript": "7.0.2"
  }
}
```

- `npm run typecheck` now runs `tsc`. Inside a script, npm finds programs in `node_modules` by itself, so there's no `npx`.

```check
missing hello.js
run "npm run typecheck"
```

## Commit, and tick the story

Change the second story in `BACKLOG.md` to `[x]` (*my code type-checked*), then:

```powershell
git add .
git commit -m "TypeScript: greet is typed and checked"
```

```check
contains BACKLOG.md "- [x] As a developer, I want my code type-checked"
git-clean
git-tracked package-lock.json
```

## Challenge: make the checker catch something

**Optional, ★★.** Write `src/shout.ts` exporting `shout(text: string): string` that returns the text in capitals followed by `!`. Then, on purpose, make three different mistakes, one at a time, and read what `npx tsc` says for each: call it with no argument; return a number instead; and call a method that strings don't have, such as `text.toUpperCas()`. Delete the mistakes when you're done.

```hints
nudge: Strings have a method that makes capitals; type text. and look at what your editor suggests.
concept: Each mistake breaks a different promise the types make: the number of arguments, the return type, and which properties a string has.
shape: ~~~ts
export function shout(text: string): string {
  return text.toUpperCase() + '!';
}
~~~
```
