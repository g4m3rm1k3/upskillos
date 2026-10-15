---
title: 5.1 — Files with a reason to exist
runtime: none
---

### The story so far

Your one-file game has three jobs: document structure, appearance and rules. Each can now be named and tested separately.

### What this lesson builds

Install the JavaScript tools, run a pure calculation outside the browser and import it from another file.

## Install and verify the tools

Install the current Node.js LTS from nodejs.org using its installer, then reopen the terminal. Node runs JavaScript outside the browser; npm manages packages. Run node --version and npm --version. This course reference was verified with the pinned package versions in package.json. You need no C++ compiler.

Open a terminal in tabletop-workshop. pwd (PowerShell: Get-Location) prints the current folder. cd changes folder; quote paths containing spaces. A command receives arguments separated by spaces. Ctrl+C stops a running server. Do not type the prompt prefix shown by your shell.



```check
run "node --version"
run "npm --version"
```

## Describe this project

JSON is a data format: quoted property names, colon-separated values, commas between entries, no comments. scripts names commands npm can run. private prevents accidental npm publication; type:module selects ES modules in .js files. .mjs also explicitly means a module. Pinning a version keeps the teaching example reproducible. npm install creates node_modules and a lockfile; keep the lockfile with your source but do not copy node_modules into releases.

```json file=package.json
{
  "name": "tabletop-workshop",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite --host 127.0.0.1", "build": "vite build --base=./", "test": "node --test tests/*.check.mjs" },
  "dependencies": { "three": "0.186.0" },
  "devDependencies": { "vite": "5.4.21" }
}
```

Run npm install here, then npm run dev. Open the localhost URL it prints. The dev server serves files over HTTP and resolves package imports. npm run build later creates dist; it does not publish anything. The reference uses Vite 5.4.21 and Three.js 0.186.0. They are a verified teaching combination, not a claim about the newest releases.

```check
file package.json
```

## Export one pure function

Move a reusable calculation into a module only after its responsibility is clear. `export function facePoints` gives other modules access by that exact name. It does not run the function. An importing file writes `import { facePoints } from './points.mjs'`: braces request a named export; ./ means the current directory and ../ its parent. The extension is part of the path. Import paths are relative to the importing file, not whichever folder your terminal happens to display.

Node runs this calculation without a document object. Keeping DOM calls out of it is what makes that possible. A module's top-level names are private unless exported. This is JavaScript's module system; no C++ header or class is required. Predict facePoints(2,6) before testing it, then deliberately misspell the import name to distinguish a linkage error from a wrong result.

```javascript file=practice/points.mjs
export function facePoints(face, wanted) {
  if (face === wanted) return wanted;
  return 0;
}
```

The command uses Node's module mode for inline code after -e. Double quotes group that code as one shell argument. The braces in import select a named export; they do not create a function body. Browser imports need the local server, not file:// URLs.

```check
run "node --input-type=module -e \"import {facePoints} from './practice/points.mjs'; console.log(facePoints(6,6));\"" stdout="6"
```

```predict
question: Does exporting a function call it?
choice: No
choice: Yes
answer: No
explain: It exposes the binding; only a call executes its body.
```


**Explore, then restore:** Run the import check from the project folder and expect 6. Change the arguments to 2,6 and expect 0. Restore them. Explain why copying the function into every file would make a later rule correction harder.

## Try it — Misspell a contract

Temporarily import facePoint instead of facePoints. The error identifies a missing named export. Restore the name. This is a module boundary failure; it is not a wrong arithmetic result.



## Your turn — Export your own rule

Write practice/doubles.mjs exporting doubles(a,b), returning a+b only when a and b match, otherwise zero.

Write practice/doubles.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {doubles} from './practice/doubles.mjs'; if(doubles(3,3)!==6 || doubles(2,3)!==0) throw Error('wrong rule'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Check the condition before calculating points.
concept: The export name must match the import exactly.
shape: Define a function with two parameters, branch on equality and return the result.
```
