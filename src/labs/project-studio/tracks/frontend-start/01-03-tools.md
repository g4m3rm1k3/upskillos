---
title: 1.3 — Terminal, local server and Git
track: Frontend Developer Bootcamp — First Page and Developer Tools
trackOrder: 50.01
runtime: none
---

Outcome: serve your files over HTTP and explain where a command runs. A **terminal** accepts commands; the current directory is the folder commands act on. A **server** answers requests; your browser is a client. file:// opens a file directly, while http://localhost uses a server. Modules and fetch need the latter.

### The story so far

You can now open a static document directly. That is enough for early HTML, but later modules and API requests need an HTTP origin. We will add a local server while keeping your café source unchanged.

There are several tools, and each has one job. Node runs JavaScript outside the browser. npm installs packages and runs named scripts. Vite serves and builds the frontend. Git records source history. Your editor changes files. None of these is a substitute for the others.

## Describe your development tools

### Commands act in a place

Think of the terminal as a worker standing in one room. `npm install` means “read the package manifest in this room,” not “find the project I meant somewhere on the computer.” The current directory is the room; a path identifies a cupboard or document inside it.

On macOS/Linux, `pwd` prints that location. PowerShell’s `Get-Location` does the same job. `cd` changes it. A relative path such as `cafe/index.html` begins there; an absolute path begins at the filesystem root. Quotes keep a path containing spaces together as one command argument.

Before running anything, say aloud which folder will receive the result. This habit prevents a surprising number of installation problems.

Before trying this step, make a prediction.

```predict
question: Does saving a file publish it to the internet?
choice: No
choice: Yes
answer: No
explain: Saving changes the local file. Publishing is a separate deployment action.
```

Install Node.js 24.21.0 LTS (the course-tested version) and Git. The later React Router chapter requires at least Node 22.22; using this Node 24 release keeps the whole path on one supported toolchain. Reopen the terminal after installation. Run node --version, npm --version and git --version. If a command is missing, fix PATH or reopen the app before continuing. Run pwd in macOS/Linux or Get-Location in PowerShell and confirm this is frontend-portfolio. npm is the package manager bundled with Node. package.json records dependencies and named commands; JSON requires double quotes and forbids trailing commas.

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "vite": "8.3.4"
  }
}
```

### Read the manifest as a recipe

| Field | Example meaning |
|---|---|
| `private: true` | Prevent an accidental npm package publication. It does not encrypt your source. |
| `type: "module"` | Interpret `.js` files as ES modules in Node. |
| `scripts.dev` | The command npm runs when you type `npm run dev`. |
| `devDependencies` | Tools needed while developing/building, such as Vite. |

`package.json` is your requested recipe; `package-lock.json` records the resolved recipe, including packages your direct packages depend on. `node_modules` is the installed result. Share the recipes; recreate the installed result.

**Rule of thumb:** when a package cannot be found, check the project directory and installation before editing application logic. A missing dependency is not fixed by changing a variable name.

```check
contains package.json "\"dev\": \"vite --host 127.0.0.1\""
```

## Serve, inspect and stop

### Follow one browser request

```text
browser asks: GET /cafe/index.html
Vite looks in the portfolio folder
server answers: HTML bytes plus a status
browser parses HTML, then requests linked CSS and JavaScript
```

`localhost` refers to your own computer. A port, such as 5173, identifies which listening program should receive the request. It is like an apartment number after a street address. The analogy stops at networking details: ports are process endpoints, not separate physical machines.

A terminal running Vite stays busy because the server waits for further requests. This is not a frozen command. Use another terminal for other work or stop it with Ctrl+C. “Server ready” means it is listening; it does not mean your application has no bugs.

Run npm install once from the portfolio root. It creates node_modules and package-lock.json; the lock records exact resolved versions. Run npm run dev and open the URL printed in the terminal with /cafe/index.html at the end. If the port is occupied, use the actual printed URL. In DevTools, Network shows the HTML request and Elements shows the parsed document. Ctrl+C stops the server. Check my work starts its own short-lived server for page checks. Do not run a second manual server for checks.

```check
run "node --version" stdout="v"
```

## Keep generated files out of history

A **repository** records named snapshots called commits. Ignore installed packages and build output, not source or the lockfile. Create this file, run git init, then git status. Stage your files with git add . and inspect git diff --cached before a local git commit -m "Create café page". If Git requests identity, configure user.name and user.email locally for this practice repository. Publishing to a remote service is a separate later decision.

```text file=.gitignore
node_modules/
dist/
.env
.env.local
```

### Git is a history, not a second Save button

```text
working files → git add → staged snapshot → git commit → local history
local history → explicit push → remote repository
built dist files → explicit deployment → public website
```

The staging area lets you choose what the next snapshot includes. `git diff` compares unstaged edits; `git diff --cached` shows the staged change. A commit does not automatically send anything to another computer. A push does not necessarily deploy unless the remote project has automation configured.

**Rule of thumb:** make a commit describe one coherent change that you can explain and test. A typo and a complete framework rewrite do not belong in the same “fix stuff” snapshot. During exploration, work freely; review and organize the result before recording it.

```check
contains .gitignore "node_modules/"
```

## Your turn: make a useful project note

Create README.txt with three labeled lines: Purpose: (who the café serves), Run: npm run dev, and Stop: Ctrl+C. Add your own purpose sentence. A README is a handoff to the next person, including future you.

```check
contains README.txt "Run: npm run dev"
contains README.txt "Stop: Ctrl+C"
```

```hints
nudge: Imagine reopening this project next week.
concept: Name the command and the key sequence, not just “start the app”.
shape: Write the three labeled lines and verify the Run command from the root folder.
```

## Diagnose, explain and review

Request /cafe/not-here.html. Inspect its response rather than guessing from the page alone. Restore /cafe/index.html. Make a temporary paragraph edit; git diff shows it. Undo only that edit in your editor. Explain the difference between Save, Commit and Publish. Never commit credentials. The README checks establish text only; run and stop the server yourself.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain why copying node_modules is different from copying package-lock.json. Then diagnose this case: npm says installation succeeded, but another terminal says it cannot find Vite. Your first questions should be about current directory, Node/npm selection and which project was installed, before guessing at application defects.
