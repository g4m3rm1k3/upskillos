---
title: 1.3 — Terminal, local server and Git
track: Frontend Developer Bootcamp — First Page and Developer Tools
trackOrder: 50.01
runtime: none
reference: optional
---

Outcome: serve your files over HTTP and explain where a command runs. A **terminal** accepts commands; the current directory is the folder commands act on. A **server** answers requests; your browser is a client. file:// opens a file directly, while http://localhost uses a server. Modules and fetch need the latter.

## Describe your development tools

Before trying this step, make a prediction.

```predict
question: Does saving a file publish it to the internet?
choice: No
choice: Yes
answer: No
explain: Saving changes the local file. Publishing is a separate deployment action.
```

Install a supported Node.js LTS version (22.12 or newer on that release line) and Git. Reopen the terminal after installation. Run node --version, npm --version and git --version. If a command is missing, fix PATH or reopen the app before continuing. Run pwd in macOS/Linux or Get-Location in PowerShell and confirm this is frontend-portfolio. npm is the package manager bundled with Node. package.json records dependencies and named commands; JSON requires double quotes and forbids trailing commas.

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

```check
contains package.json "\"dev\": \"vite --host 127.0.0.1\""
```

## Serve, inspect and stop

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
