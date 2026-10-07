---
title: 0.2 — Node, package.json and Modules
track: Build Your Own Game Studio
runtime: none
concepts: node, npm, modules
problem: JavaScript was made to run inside a web page. How does it run on its own, as a program on your computer, and how is a program split into files that use each other?
---

The studio is written in JavaScript (and, from the next lesson, TypeScript). Inside a browser, the browser runs JavaScript. Outside one, a program called **Node** does: it's the same JavaScript engine Chrome uses (named V8), with extra parts for files, processes and the network. Every tool in this series, the type checker, the test runner, the bundler and Electron itself, is a JavaScript program that Node runs.

## Is Node installed?

Type:

```powershell
node --version
```

```text
v24.11.0
```

- `node` is a program on your computer; `--version` asks it to print its version and stop.
- You need version **22 or newer** (the first number). If the shell says *node is not recognized*, or the number is lower, install the **LTS** ("long-term support") version from nodejs.org. Build a Spreadsheet, lesson 0.3, walks through it.
- Installing Node also installs **npm**, the program that installs JavaScript libraries. Check it with `npm --version`.

```check
run "node -e \"process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)\"" label="Node 22 or newer is installed" -- Install the LTS version of Node from nodejs.org, then open a new terminal.
```

## A program Node runs

Create `hello.js` in the project folder:

```js file=hello.js
console.log('Hello from Node ' + process.version);
```

Run it:

```powershell
node hello.js
```

```text
Hello from Node v24.11.0
```

- `node hello.js` starts Node, which reads the file, runs it top to bottom, and stops when nothing is left to do.
- `console` is an object Node gives every program; its `log` method writes a line of text to the terminal.
- `process` is another object Node gives every program: it describes the running program. `process.version` is a string, the version of Node running it.
- `+` with a string on either side joins strings: `'Hello from Node ' + 'v24.11.0'` is one string.
- `'Hello from Node '` is a **string**: text, written between quotes. JavaScript accepts `'single'` or `"double"` quotes; this series uses single quotes in code. `process.version` has no quotes because it's a name the program looks up, not text.
- The dots in `console.log` and `process.version` read a **property** of an object: `console.log` is the `log` that belongs to `console`. The brackets in `log(…)` **call** it, handing it what's between them.
- The `;` at the end marks the end of a **statement**, one instruction. Each statement in this series ends with one.

```check
run "node hello.js" stdout="Hello from Node v" -- Create hello.js, save it, then run node hello.js.
```

## package.json: what the project is

Every Node project has a `package.json` in its top folder: one JSON object that tells npm and the other tools what this project is. Create it:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "hello": "node hello.js"
  }
}
```

- **JSON** is a text format for data: `{ }` is an object of `"key": value` pairs, `[ ]` a list, strings in double quotes. Every key here is a string; the values are strings, `true`, and one nested object.
- `"name"` and `"version"`: what the project is called, and which version it is. `0.1.0` reads *major.minor.patch*; 0 as the major number means "not finished yet".
- `"private": true` stops npm from ever publishing this project to the public npm registry by mistake.
- `"type": "module"` tells Node that `.js` files in this project use **ES modules**, the `import` and `export` keywords in the next step. (Without it, Node uses its older module system, which spells them `require` and `module.exports`.)
- `"scripts"` is an object of named commands. Its key `"hello"` maps to the command `node hello.js`.

Run the script by its name:

```powershell
npm run hello
```

```text
> studio@0.1.0 hello
> node hello.js

Hello from Node v24.11.0
```

- `npm run hello` looks up `"hello"` in `"scripts"` and runs its command. The two lines starting `>` are npm saying what it is running.
- Scripts are why a project's commands don't live in anyone's memory: `npm run` with no name lists them all.

```check
run "npm run hello" stdout="Hello from Node v" -- Save package.json, then run npm run hello.
```

## Splitting a program into modules

A file that exports values is a **module**: other files can import what it exports, and nothing else. Make a folder `src` and create `src/greet.js`:

```js file=src/greet.js
export function greet(name) {
  return 'Hello, ' + name + '!';
}
```

- `function greet(name) { … }` makes a **function** named `greet` with one **parameter**, `name`. Calling `greet('Studio')` runs the body with `name` set to `'Studio'`.
- `return` ends the call and hands back a value, here the joined string `'Hello, Studio!'`.
- `export` in front makes `greet` available to other modules. Without it, the function exists only inside this file.

Nothing uses it yet, but Node can load it and call it from the command line:

```powershell
node -e "import('./src/greet.js').then((m) => console.log(m.greet('Studio')))"
```

- `node -e "…"` runs the quoted text as a program, without a file.
- `import('./src/greet.js')` (with brackets) loads a module while the program runs and gives back a **promise**: a value that arrives later. `.then((m) => …)` runs the arrow function when it arrives, with `m`, an object holding the module's exports. `m.greet` is your function.

```check
run "node -e \"import('./src/greet.js').then((m) => console.log(m.greet('Studio')))\"" stdout="Hello, Studio!" -- export function greet(name) in src/greet.js, returning 'Hello, ' + name + '!'
```

## Importing a module

Now use it from `hello.js`:

```js file=hello.js
import { greet } from './src/greet.js';

console.log('Hello from Node ' + process.version);
console.log(greet('Studio'));
```

- `import { greet } from './src/greet.js'` runs `src/greet.js` (once, the first time anything imports it) and binds the name `greet` in this file to the function it exported.
- `'./src/greet.js'` is a path relative to this file: `./` means "the folder this file is in". In Node the `.js` ending must be written.
- Imports always come first in a file: Node loads every imported module before running the rest.

Run `npm run hello` again:

```text
Hello from Node v24.11.0
Hello, Studio!
```

```check
run "npm run hello" stdout="Hello, Studio!" -- export function greet in src/greet.js, import { greet } from './src/greet.js' in hello.js.
```

## What `"type": "module"` does

An experiment: in `package.json`, change `"type": "module"` to `"type": "commonjs"`, save, and run `npm run hello`.

```predict
question: What happens?
choice: The same output: "type" only matters for libraries
choice: An error at the import line
choice: It runs, but greet is undefined
answer: An error at the import line
explain: With "type": "commonjs", Node reads hello.js with its older module system, where import is not a keyword it accepts at the top of a file. It stops before running anything, with SyntaxError: Cannot use import statement outside a module.
```

- Node first prints a **warning** that suggests the fix (*To load an ES module, set "type": "module"*), then the **error**, `SyntaxError: Cannot use import statement outside a module`, with the line it stopped at and `^^^^^^` under the word it didn't accept.
- Change it back to `"module"`, save, and run it again: both lines print.

```check
contains package.json "\"type\": \"module\"" -- Change "commonjs" back to "module".
run "npm run hello" stdout="Hello, Studio!"
```

## Commit

```powershell
git add .
git commit -m "A first Node program, package.json, and a module"
```

```check
git-clean -- git add . then git commit
git-tracked package.json
git-tracked src/greet.js
```

## Challenge: a second export

**Optional, ★.** Export a second function from `src/greet.js`, `farewell(name)`, that returns `Goodbye, <name>.`, and print it from `hello.js` too. Then predict: what happens if you import `farewell` but forget the `export` in front of it? Try it, read the error, and fix it.

```hints
nudge: A module can export as many things as it likes; an import can name several, between the braces.
concept: Only exported names can be imported. Importing a name the module doesn't export is an error when the module loads, before any line runs.
shape: export function farewell(name) { return 'Goodbye, ' + name + '.'; } — and import { greet, farewell } from './src/greet.js'
```
