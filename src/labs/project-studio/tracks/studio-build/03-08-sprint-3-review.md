---
title: 3.8 — Sprint 3 Review: Version 0.4.0
track: Build Your Own Game Studio
runtime: none
concepts: adr, retrospective, release
problem: Every change to a scene is now a command that can be undone, redone and read as code. What's the decision worth writing down, and what does the next sprint build on top of it?
---

The sprint's close, as before. Sprint 3 added features without breaking anything, so this is **0.4.0**.

## Version 0.4.0

```json file=package.json
{
  "name": "studio",
  "version": "0.4.0",
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
contains package.json "\"version\": \"0.4.0\""
```

## A record of the decision

Create `docs/adr/0004-every-change-is-a-command.md`:

```markdown file=docs/adr/0004-every-change-is-a-command.md
# 4. Every change is a command, undone by snapshots

Status: accepted

### Context

The editor must let a game maker undo and redo any change, and show each change as a line of code they could have written. Lesson 3.3 tried commands with a hand-written undo for each one; one of them put a deleted node back in the wrong place, and each new kind of change would need another undo function.

### Decision

- The scene data is changed only through the Scene API (findNode, setProp, addNode, deleteNode, renameNode).
- Each change runs as a command through History: a label, a line of code, and an edit function.
- A command is undone by restoring a JSON snapshot of the scene taken before it, and redone by restoring the snapshot taken after it. A change that throws part way is rolled back.
- The code log is derived from the done stack, and replaying it on the original scene must give the same scene (a test checks this).
- After every change the live nodes are rebuilt from the data; a change the engine can't build is undone, with the reason shown.

### Consequences

- Any change, including ones not written yet, can be undone, with no undo code of its own.
- Each step keeps two copies of the scene, which costs memory on very large scenes.
- References to scene data objects go stale after an undo, so code must look nodes up by path each time.
```

```check
contains docs/adr/0004-every-change-is-a-command.md "### Decision"
contains docs/adr/0004-every-change-is-a-command.md "### Consequences"
```

## Review and retrospective

Create `docs/sprints/sprint-3.md`:

```markdown file=docs/sprints/sprint-3.md
# Sprint 3

Goal: every change to a scene is a command that can be undone, redone, and written as a line of code.

### Review

- Goal met: all three stories are done.
- The console runs Scene API lines; each change appears in the log as code, and Undo, Redo, Ctrl+Z and Ctrl+Shift+Z work.
- A change the engine refuses is undone automatically, with the reason shown.
- npm run check: 71 unit tests and 4 end-to-end tests pass.

### Retrospective

- Went well: replacing undo-by-commands with snapshots kept lesson 3.3's tests unchanged, and they proved the new code did everything the old code did.
- Went badly: main.ts has grown to 145 lines and mixes the game, the console and the page.
- Change next sprint: give the editor's user interface its own files, so main.ts only starts things.
```

- The retrospective's last line sets up the next sprint. A file doing several jobs is hard to change safely; Sprint 4 brings in React, which is built around splitting a user interface into small parts.

```check
contains docs/sprints/sprint-3.md "### Review"
contains docs/sprints/sprint-3.md "### Retrospective"
```

## Sprint 4's stories

Sprint 4 turns the window into an **editor**: panels around the game view, as in any game engine you may have seen (Godot, Unity, GameMaker), where you click a thing in a tree of the scene and change its settings in an **inspector**. Change `BACKLOG.md`:

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

- [x] As a game maker, I want to undo any change to my scene, so that I can try things without fear.
- [x] As a game maker, I want to redo what I undid, so that undoing too far costs nothing.
- [x] As a game maker, I want to see each change I make as a line of code, so that I learn how to make the same change from a script.

### Sprint 4: an editor

Goal: the studio's window is an editor: the scene's tree, the game view and an inspector, side by side.

- [ ] As a game maker, I want the editor laid out in panels around the game view, so that everything I need is in one window.
- [ ] As a game maker, I want to see my scene's tree and click a node to select it, so that I can find anything in the scene.
- [ ] As a game maker, I want to see and change the selected node's properties, so that I can edit without typing code.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

```check
contains BACKLOG.md "### Sprint 4: an editor"
contains BACKLOG.md "- [x] As a game maker, I want to redo what I undid"
```

## Commit, and tag 0.4.0

```powershell
git add .
git commit -m "Sprint 3 review: version 0.4.0, ADR 4, retrospective, Sprint 4 stories"
git tag -a v0.4.0 -m "Sprint 3: changes that can be undone"
```

```check
git-clean
git-tag v0.4.0
```

## Challenge: your own script

**Optional, ★★.** Write a scene change of three or more lines in the console, one line at a time, then copy the whole log into a new file, `scripts/recolour.js`, and commit it. Start the app again (the scene is back as the file has it), paste the file's lines into the console one at a time, and check the scene ends up the same. You've written your first studio script, and the editor taught you its API.

```hints
nudge: Every line in the log is a complete Scene API call. Run them in the same order.
concept: Replay: the same lines on the same starting scene give the same scene (lesson 3.6's replay test proves it for the code the editor writes).
shape: scene.setProp("level/wall", "color", 16766720); and two more lines like it, saved in scripts/recolour.js.
```
