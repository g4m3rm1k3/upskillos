---
title: 1.10 — Sprint 1 Review: Version 0.2.0
track: Build Your Own Game Studio
runtime: none
concepts: semantic-versioning, adr, retrospective, git-ranges
problem: Sprint 1 built an engine, and the window shows a square the keyboard moves. Before Sprint 2 starts, how is this version named, how is the biggest design decision recorded, and what should change in the way the work is done?
---

Sprint 1 ends as Sprint 0 did (lesson 0.8): a review of the product, a retrospective on the process, a record of the sprint's biggest decision, the next sprint's stories, and a tag. This time there's also a version number to choose.

## A new version number

Change `"version"` in `package.json`:

```json file=package.json
{
  "name": "studio",
  "version": "0.2.0",
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
  "dependencies": {
    "phaser": "4.2.1"
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

The three numbers follow **semantic versioning** (*semver*), the rule npm and most software use: *major.minor.patch*.

- **Patch** (0.1.**1**): bugs fixed, nothing new.
- **Minor** (0.**2**.0): new things added, and everything that worked before still works the same way. Sprint 1 added an engine, so this is a minor version.
- **Major** (**1**.0.0): something that used to work now works differently, so whoever uses it may have to change their code or files.
- While the major number is 0, nothing is promised yet: the project is still taking shape. 1.0.0 will be the first version you'd hand to someone else.
- The same rule is why `--save-exact` matters (lesson 0.3). `^7.0.2` accepts any 7.x, trusting that its makers followed semver perfectly. Exact versions trust nothing.

```check
contains package.json "\"version\": \"0.2.0\""
```

## A record of the decision

Sprint 1's biggest decision was that Phaser only paints: the tree, the loop and the input are the engine's own. Create `docs/adr/0002-phaser-only-paints.md`:

```markdown file=docs/adr/0002-phaser-only-paints.md
# 2. Phaser only paints

Status: accepted

### Context

Phaser has its own game objects, scenes, game loop and keyboard handling. The studio needs a scene tree it can save, edit and show in an editor, a fixed time step so games play the same on every computer, and an engine that can be tested without a browser.

### Decision

- The engine's own classes hold the game: Node and Node2D for the tree, FixedLoop for time, Input for the keyboard, Game to run a frame.
- Phaser is used only to paint, through the Painter interface, and to call the engine once per screen refresh.
- Only src/main.ts imports Phaser. The engine never does.

### Consequences

- The engine is tested by Vitest without a window, in well under a second.
- Changing to another graphics library would mean changing main.ts and the Painter, not the engine.
- The studio doesn't get Phaser's ready-made features (physics, animation, tilemaps) for free. Each one the studio needs is built in a later sprint, and understood.
```

- The last consequence is a real cost, written down honestly: later sprints build physics, tilemaps and animation that Phaser already has. The gain is that you'll understand every line of them.

```check
contains docs/adr/0002-phaser-only-paints.md "### Context"
contains docs/adr/0002-phaser-only-paints.md "### Consequences"
```

## Review and retrospective

Create `docs/sprints/sprint-1.md`. Write your own retrospective; this one shows the shape:

```markdown file=docs/sprints/sprint-1.md
# Sprint 1

Goal: a scene of objects, drawn in the window, moving the same way on every computer.

### Review

- Goal met: all four stories are done.
- npm start shows a light blue square in the middle of the game. The arrow keys and W-A-S-D move it at 200 pixels a second, the same speed diagonally.
- The engine: Vec2, Node, Node2D, FixedLoop at 60 steps a second, Input with actions, Game, drawTree.
- npm run check: 32 unit tests and 2 end-to-end tests pass.

### Retrospective

- Went well: tests first found real bugs before they shipped: NaN from the zero vector, a coin skipped while removing nodes, a press counted six times.
- Went badly: floating-point numbers made some tests fail for reasons that took a while to see.
- Change next sprint: when a test compares numbers that aren't whole, use toBeCloseTo from the start.
```

- The review lists bugs the tests found *before* they could reach a player. That's evidence the way of working pays off, so it belongs in the record.

```check
contains docs/sprints/sprint-1.md "### Review"
contains docs/sprints/sprint-1.md "### Retrospective"
```

## Sprint 2's stories

Sprint 2 turns the scene into **data**: a plain-text file that says what's in the scene, which the game reads when it starts. At the moment the scene is built by code in `main.ts`, so changing a level means changing the program. Saving from inside the studio comes later, once the studio has an editor (Sprint 4) and can write real files (Sprint 6). Change `BACKLOG.md`:

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

- [x] As a game maker, I want to see my scene drawn in the studio's window, so that I can see the game I'm making.
- [x] As a game maker, I want a scene made of objects that hold other objects, so that a car can carry its wheels and its driver.
- [x] As a player, I want things to move at the same speed on every computer, so that the game plays the same everywhere.
- [x] As a player, I want the keyboard to control the game, so that I can play it.

### Sprint 2: scenes as data

Goal: the scene lives in a file the game starts from, checked when it's loaded.

- [ ] As a game maker, I want my scene stored as plain text, so that I can read it, keep it in Git and see what changed.
- [ ] As a game maker, I want the game to start from the scene file, so that changing the scene needs no change to the code.
- [ ] As a game maker, I want a clear message when a scene file is wrong, so that I know what to fix instead of seeing a broken scene.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

- Again, the stories say what a game maker gets. *Plain text* will mean JSON, the format `package.json` uses; *a clear message* will mean checking the file's shape before trusting it. Those are choices for the sprint.

```check
contains BACKLOG.md "### Sprint 2: scenes as data"
contains BACKLOG.md "- [x] As a player, I want the keyboard to control the game"
```

## Commit, and tag 0.2.0

```powershell
git add .
git commit -m "Sprint 1 review: version 0.2.0, ADR 2, retrospective, Sprint 2 stories"
git tag -a v0.2.0 -m "Sprint 1: an engine, drawn by Phaser"
```

Then look at the whole sprint:

```powershell
git log --oneline v0.1.0..v0.2.0
git diff --stat v0.1.0 v0.2.0
```

- `v0.1.0..v0.2.0` is a **range**: the commits reachable from `v0.2.0` but not from `v0.1.0`. In other words, everything done in Sprint 1, newest first.
- `git diff --stat` between two tags lists every file that changed in between, with how many lines were added and removed. It's a sprint's work at a glance.

```check
git-clean
git-tag v0.2.0
```

## Challenge: two players

**Optional, ★★.** Make it a two-player game: the arrows move one player and W-A-S-D another, in a different colour, starting on the left of the game. Each player needs its own four actions, so `addMoveActions` and `Player` will need to know *which* actions to use. Change the tests first.

```hints
nudge: Give each player a prefix for its action names: 'p1-left', 'p2-left', and so on.
concept: Pass the prefix to both addMoveActions and the Player's constructor, so the same code serves both players with different keys.
shape: addMoveActions(input, 'p1', ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) and new Player('player2', input, 'p2'), with update reading `${this.prefix}-left`.
```
