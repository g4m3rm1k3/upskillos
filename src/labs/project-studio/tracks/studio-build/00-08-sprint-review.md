---
title: 0.8 — Sprint Review, Retrospective and a Release Tag
track: Build Your Own Game Studio
runtime: none
concepts: definition-of-done, adr, retrospective, git-tags
problem: Sprint 0's four stories are ticked. How does a team know the sprint really met its goal, remember why it chose these tools a year from now, and get better at the next sprint?
---

A sprint ends with two meetings, even when the team is one person:

- The **sprint review** looks at the *product*: does the program do what the sprint's goal said? It's shown working, not described.
- The **retrospective** looks at the *process*: what helped, what got in the way, and one thing to change in the next sprint.

This lesson also writes down the biggest decision of Sprint 0, which tools to use, and marks this version of the code with a name.

## One command for "done"

The definition of done says a story's tests pass and the app still starts. That's three commands now. Make them one script:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc",
    "test": "vitest run src",
    "e2e": "vite build && vitest run e2e",
    "check": "npm run typecheck && npm test && npm run e2e"
  },
  "devDependencies": {
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- A script can run other scripts. Each `&&` runs the next one only if the last succeeded, so `npm run check` stops at the first failure, and its exit code is that failure's.
- The order goes from fastest to slowest: type-checking takes a fraction of a second, unit tests a second, the end-to-end test a few seconds. A type error stops it before the slow part.
- The end-to-end test starts the app, so a passing `check` also covers *the app still starts*.

Run it:

```powershell
npm run check
```

```check
run "npm run check" stdout="1 passed" label="type-check, unit tests and the end-to-end test all pass"
```

## A record of the decision

Months from now, you, or an AI agent you've asked to change the studio, will wonder why it uses Electron and not something else. The answer will be in nobody's memory. An **architecture decision record** (ADR) is a short file that writes down one decision: what problem it answered, what was chosen, and what that costs. ADRs are numbered and never edited after they're accepted. A later decision that changes an old one gets a new record that says which one it replaces.

Make a folder `docs/adr` and create `docs/adr/0001-the-stack.md`:

```markdown file=docs/adr/0001-the-stack.md
# 1. The studio's stack

Status: accepted

### Context

The studio is a desktop program for making 2D games. It needs a window of its own, a way to draw a game quickly, access to files on disk, and tools that catch mistakes before they reach a user. One person builds it, a few hours at a time, on Windows and macOS.

### Decision

- Electron for the desktop app: one program for Windows, macOS and Linux, showing an ordinary web page.
- TypeScript, in strict mode, for all code in src and e2e.
- Vite to serve and build the page; Vitest for unit tests; Playwright for end-to-end tests.
- An exact version of every tool, locked in package-lock.json.
- React for the editor's panels and Phaser for drawing games are added when a story needs them, each with its own record.

### Consequences

- One language for the editor, the engine and the tests.
- Every change is checked by npm run check in a few seconds.
- An Electron app is large (about 100 MB) and uses more memory than a native program.
- Exact versions don't update themselves: updating a tool is a change on purpose, with npm run check after it.
```

- **Status** says whether the decision stands. Later records can make one *superseded*.
- **Context** is the problem and the limits, written before the answer, so a reader can judge whether the answer still fits.
- **Decision** is what was chosen, in plain statements.
- **Consequences** lists the costs as well as the gains. A record with no costs hasn't been thought through.
- The sections are `###` headings because the file has one title, `#`, and the sections sit inside it.

```check
contains docs/adr/0001-the-stack.md "### Context"
contains docs/adr/0001-the-stack.md "### Decision"
contains docs/adr/0001-the-stack.md "### Consequences"
```

## Review and retrospective

Make a folder `docs/sprints` and create `docs/sprints/sprint-0.md`. Write your own retrospective. This one is an example of the shape:

```markdown file=docs/sprints/sprint-0.md
# Sprint 0

Goal: an empty desktop app that opens, with tests, on any computer.

### Review

- Goal met: all four stories are done.
- npm start opens a window titled Studio that says Hello, Studio!
- npm run check type-checks, runs 2 unit tests and 1 end-to-end test, and passes.

### Retrospective

- Went well: every step ended with something that ran, so mistakes showed up at once.
- Went badly: the blank Electron window gave no error, and took a while to understand.
- Change next sprint: run npm run check before every commit.
```

- The review states what the program does *now*, checked by running it, so it's true on the day it's written.
- The retrospective is about how the work went, not what was built. The last line matters most: one specific change, small enough to actually do. A retrospective that changes nothing is a meeting with no point.

```check
contains docs/sprints/sprint-0.md "### Review"
contains docs/sprints/sprint-0.md "### Retrospective"
```

## The next sprint's stories

Before the sprint closes, write the next one's goal and stories into `BACKLOG.md`, under Sprint 0. Sprint 1 builds the engine that draws a game in the window:

```markdown file=BACKLOG.md
# Backlog

### Sprint 0: tools

Goal: an empty desktop app that opens, with tests, on any computer.

- [x] As a developer, I want every change recorded, so that I can see what changed and undo mistakes.
- [x] As a developer, I want my code type-checked, so that mistakes show up before the program runs.
- [x] As a developer, I want automated tests, so that I know a change didn't break what worked.
- [x] As a user, I want the studio to open in its own window, so that it works like any desktop program.

### Sprint 1: an engine

Goal: a scene of objects, drawn in the window, moving the same way on every computer.

- [ ] As a game maker, I want to see my scene drawn in the studio's window, so that I can see the game I'm making.
- [ ] As a game maker, I want a scene made of objects that hold other objects, so that a car can carry its wheels and its driver.
- [ ] As a player, I want things to move at the same speed on every computer, so that the game plays the same everywhere.
- [ ] As a player, I want the keyboard to control the game, so that I can play it.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

- The definition of done now names the command that checks it, so "done" can be checked by anyone, or by an agent.
- Sprint 1's stories say what a game maker or player gets, not how it's built. *Objects that hold other objects* will be a tree; *the same speed on every computer* will be a fixed time step. Those are the team's choices, made in the sprint.

```check
contains BACKLOG.md "### Sprint 1: an engine"
contains BACKLOG.md "npm run check passes"
```

## Commit, and tag the release

```powershell
git add .
git commit -m "Sprint 0 review: decision record, retrospective, Sprint 1 stories"
git tag -a v0.1.0 -m "Sprint 0: the tools, and a window"
```

- A **tag** is a name stuck to one commit, permanently. Branches move as you commit; a tag stays put. `git checkout v0.1.0` returns the project to exactly this point, whatever happens later.
- `-a` makes an **annotated** tag: it records who tagged it, when, and the message. Use annotated tags for releases.
- `v0.1.0` matches `"version"` in `package.json`. Each sprint ends with a tag, so you can always go back to the end of any sprint and run it.
- `git log --oneline --decorate` shows the tag beside its commit.

```check
git-clean
git-tag v0.1.0
```

## Challenge: checks on every push

**Optional, ★★★. Needs a GitHub account.** **Continuous integration** (CI) means a server runs your checks on every change you push, so nothing broken goes unnoticed, even when you forgot to run `npm run check`. Push the project to a new GitHub repository, then add a GitHub Actions **workflow**: a file in `.github/workflows/` that tells GitHub to install the project and run `npm run typecheck` and `npm test` on every push. Read the run's log on the repository's **Actions** tab, then push a change that breaks a test and watch it fail.

```hints
nudge: GitHub's documentation has a starter workflow for Node projects; search for "Building and testing Node.js".
concept: A workflow is a list of steps run on a fresh computer: get the code, install Node, npm ci (which installs exactly what package-lock.json says), then your scripts. The end-to-end test needs a screen, which the server doesn't have, so leave it out for now.
shape: A .github/workflows/check.yml with on: push, one job with runs-on: ubuntu-latest, and steps: actions/checkout, actions/setup-node with node-version 24, run: npm ci, run: npm run typecheck, run: npm test.
```
