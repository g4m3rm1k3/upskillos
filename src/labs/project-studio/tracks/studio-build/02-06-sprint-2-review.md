---
title: 2.6 — Sprint 2 Review: Version 0.3.0
track: Build Your Own Game Studio
runtime: none
concepts: adr, retrospective, release
problem: The game now starts from a scene file that's checked as it loads. Before Sprint 3 starts, what's the decision worth recording, and what will the next sprint deliver?
---

The same close as Sprints 0 and 1: version, decision record, review and retrospective, next stories, tag. Sprint 2 added features and broke nothing, so by semantic versioning (lesson 1.10) this is **0.3.0**.

## Version 0.3.0

```json file=package.json
{
  "name": "studio",
  "version": "0.3.0",
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

```check
contains package.json "\"version\": \"0.3.0\""
```

## A record of the decision

Create `docs/adr/0003-scenes-are-data.md`:

```markdown file=docs/adr/0003-scenes-are-data.md
# 3. Scenes are data, checked at the border

Status: accepted

### Context

A scene must be stored in a file people can read and keep in Git, and the editor (Sprint 4) will change scenes. The live tree can't be written as JSON: parent and child point at each other, and nodes hold things that aren't scene data, such as Input. Files come from outside the program and can be wrong in any way.

### Decision

- A scene is plain data: SceneData and NodeData (type, name, props, children), with a format version.
- Live nodes are built from the data by buildNode, using a Map of makers that a game extends with its own types.
- Props may set only a node's own number and vector fields, an allow list.
- Every scene file is checked by parseScene before anything uses it, and every error gives the path to the node.

### Consequences

- Scene files are small, readable and diffable.
- A wrong file gives a message that says where and what, instead of a crash somewhere else.
- There are two forms of a scene, data and nodes, and code must keep them in step: a new kind of prop means changing PropValue, parseScene and applyProps together.
```

```check
contains docs/adr/0003-scenes-are-data.md "### Decision"
contains docs/adr/0003-scenes-are-data.md "### Consequences"
```

## Review and retrospective

Create `docs/sprints/sprint-2.md`:

```markdown file=docs/sprints/sprint-2.md
# Sprint 2

Goal: the scene lives in a file the game starts from, checked when it's loaded.

### Review

- Goal met: all three stories are done.
- scenes/main.json holds a wall and the player. Changing it changes the game, with no change to the code.
- A broken scene file shows "The scene didn't load." and the path to the problem, in the window.
- npm run check: 53 unit tests and 2 end-to-end tests pass.

### Retrospective

- Went well: checking the file in one place (parseScene) kept buildNode simple.
- Went badly: the same scene had to be written in tests as objects, as JSON text and as a file, which made tests long.
- Change next sprint: write small helpers for test data (like box() and withCar()) as soon as the second test needs the same setup.
```

```check
contains docs/sprints/sprint-2.md "### Review"
contains docs/sprints/sprint-2.md "### Retrospective"
```

## Sprint 3's stories

Sprint 3 builds the part of the studio every change in the editor will go through: **commands**, which can be undone and redone. In any creative tool, from a text editor to Photoshop, Ctrl+Z is what lets people experiment without fear. Change `BACKLOG.md`:

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

- [x] As a game maker, I want my scene stored as plain text, so that I can read it, keep it in Git and see what changed.
- [x] As a game maker, I want the game to start from the scene file, so that changing the scene needs no change to the code.
- [x] As a game maker, I want a clear message when a scene file is wrong, so that I know what to fix instead of seeing a broken scene.

### Sprint 3: changes that can be undone

Goal: every change to a scene is a command that can be undone, redone, and written as a line of code.

- [ ] As a game maker, I want to undo any change to my scene, so that I can try things without fear.
- [ ] As a game maker, I want to redo what I undid, so that undoing too far costs nothing.
- [ ] As a game maker, I want to see each change I make as a line of code, so that I learn how to make the same change from a script.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

```check
contains BACKLOG.md "### Sprint 3: changes that can be undone"
contains BACKLOG.md "- [x] As a game maker, I want a clear message when a scene file is wrong"
```

## Commit, and tag 0.3.0

```powershell
git add .
git commit -m "Sprint 2 review: version 0.3.0, ADR 3, retrospective, Sprint 3 stories"
git tag -a v0.3.0 -m "Sprint 2: scenes as data"
```

```check
git-clean
git-tag v0.3.0
```

## Challenge: a scene's changes in Git

**Optional, ★.** Change the wall's colour in `scenes/main.json`, then run `git diff`. Git shows one line removed (`-`) and one added (`+`). Now imagine the same scene saved without pretty-printing, on one long line: what would `git diff` show? Commit the colour or put it back; leave the tree clean.

```hints
nudge: Git compares files line by line.
concept: One value per line means a change to one value is a change to one line. A whole scene on one line would show the entire file as changed for any edit.
shape: git diff scenes/main.json, then git restore scenes/main.json to put it back.
```
