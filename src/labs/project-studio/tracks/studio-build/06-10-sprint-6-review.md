---
title: 6.10 — Sprint 6 Review: Version 0.7.0
track: Build Your Own Game Studio
runtime: none
concepts: adr, retrospective, release, security-boundaries
problem: The studio works with real files now, across two processes. Which decisions shape everything that comes after, what did the sprint teach about how to work, and what does Sprint 7 need?
---

The sprint's close, as before. Sprint 6 added features; a user's old scene files still open, and nothing they relied on was taken away. One thing did change for a developer: `npm run dev` no longer runs the studio in a browser. That's not part of what users get, so this is **0.7.0**.

## Version 0.7.0

```json file=package.json
{
  "name": "studio",
  "version": "0.7.0",
  "private": true,
  "type": "module",
  "main": "electron/main.ts",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc && tsc -p electron",
    "test": "vitest run src electron",
    "e2e": "vite build && vitest run e2e",
    "check": "npm run typecheck && npm test && npm run e2e"
  },
  "dependencies": {
    "phaser": "4.2.1",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- Only `"version"` changes. Sprint 6 added one package, in lesson 6.2: `@types/node`, types only. The zip writer, the file system port and the bridge are all our own code.

```check
contains package.json "\"version\": \"0.7.0\""
```

## A record of the decisions

Create `docs/adr/0007-the-main-process-owns-the-files.md`:

```markdown file=docs/adr/0007-the-main-process-owns-the-files.md
# 7. The main process owns the files; the page asks through a narrow bridge

Status: accepted

### Context

Until Sprint 6 the studio's scene was built into the page, and nothing was ever saved. Saving, opening and exporting need the disk, and in Electron only the main process can reach it. The page runs code the studio doesn't control (game scripts from Sprint 7), so whatever the page may ask the main process to do, any script in it may ask too.

### Decision

- The main process owns every file. The page asks for four things through window.studio, made by the preload: load, save, open, exportZip. It never names a path: the main process decides where, from the open project or from a dialog the user answers.
- The main process checks what arrives from the page before using it.
- The main process is TypeScript, run by Electron's Node with types stripped, so its files use only erasable syntax; electron/tsconfig.json makes the checker enforce that. The preload is plain CommonJS.
- Main-process code reaches the disk through the Files port. Tests use MemoryFiles, a fake, and one contract test suite holds the fake and the real disk to the same behaviour.
- A save writes to a separate file and renames it over the scene, so a failed save leaves the old scene whole.
- Opening a project reloads the page, which loads the new project as it does at startup.
- Exports are zips written by our own code: stored, not compressed; hidden files left out; every file dated 1 January 1980, so the same project always gives the same bytes.
- Each story is built on its own branch and merged when its acceptance test passes.

### Consequences

- The studio runs only in Electron; npm run dev's browser page stops at window.studio.
- Opening a project drops changes that weren't saved, without asking.
- Exports are as big as the files in them.
- A handler in main.ts is tested only end to end, so any decision in one belongs in a tested function instead.
```

- The context names the force behind every decision: the page will run code the studio doesn't control, so the bridge must be safe against *any* caller, not just the studio's own.
- The decision has eight parts. The first two are the security boundary: what the page may ask, and that it's checked. The rest say how files are handled, tested, saved, opened and exported, and how the work was done.
- The consequences are the costs, written down so they're known: no browser page, no warning before losing changes, no compression, and a rule for keeping `main.ts` humble.

```check
contains docs/adr/0007-the-main-process-owns-the-files.md "### Decision"
contains docs/adr/0007-the-main-process-owns-the-files.md "### Consequences"
```

## Review and retrospective

Create `docs/sprints/sprint-6.md`:

```markdown file=docs/sprints/sprint-6.md
# Sprint 6

Goal: a project is a folder on your disk; the studio opens it, saves to it, and exports it as one file.

### Review

- Goal met: all three stories are done.
- The studio opens a project folder, from the command line or a dialog; saves its scene with Save or Ctrl+S; and exports the project as a zip that any computer can open.
- Before the stories, the game view's pointer code moved into ViewportInput, under unit tests.
- npm run check: 166 unit tests and 16 end-to-end tests pass.

### Retrospective

- Went well: last sprint's change was done first. Characterisation tests pinned the pointer code before it moved, and they found a bug (a drag back to its start made an empty undo step), which was fixed after the move, as a change of its own.
- Went well: the main process's code was built test first without touching the disk, through a fake; the contract tests then caught a real difference between the fake and the disk (writing into a missing folder).
- Went well: a branch per story kept main passing while each story's acceptance test was red.
- Went badly: the Open and Export handlers in main.ts hold decisions (cancelled, not a project, failed) that only the end-to-end tests reach, and those tests stub the dialogs.
- Change next sprint: when a main-process handler needs a decision, it goes into a function in electron/ with unit tests first, and the handler only calls it.
```

- The review counts what `npm run check` runs: 166 unit tests and 16 end-to-end tests. 38 of the unit tests are new this sprint (there were 128), and 10 of those are the pointer code's.
- The first "went well" is the one this course is most about: a refactor done safely, and a bug found by the tests written to make it safe, but not fixed until the refactor was finished.
- The "went badly" is honest about where testing is thin: the main process's handlers. The change for next sprint is the same move as lesson 6.1's, applied before the code grows instead of after.

```check
contains docs/sprints/sprint-6.md "### Review"
contains docs/sprints/sprint-6.md "### Retrospective"
```

## Sprint 7's stories

Sprint 7 gives game objects behaviour: scripts, written and run inside the studio. Change `BACKLOG.md`:

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

- [x] As a game maker, I want the editor laid out in panels around the game view, so that everything I need is in one window.
- [x] As a game maker, I want to see my scene's tree and click a node to select it, so that I can find anything in the scene.
- [x] As a game maker, I want to see and change the selected node's properties, so that I can edit without typing code.

### Sprint 5: the viewport

Goal: the game view is a place to edit: click to select, drag to move, turn and stretch, with a grid to snap to.

- [x] As a game maker, I want to click a thing in the game view to select it, so that I can pick what I see without searching the tree.
- [x] As a game maker, I want to drag the selected thing to move it, so that I can place things by eye.
- [x] As a game maker, I want to rotate and scale things, so that a wall can lean and a box can be any size.
- [x] As a game maker, I want moves to snap to a grid, so that things line up exactly.

### Sprint 6: real files

Goal: a project is a folder on your disk; the studio opens it, saves to it, and exports it as one file.

- [x] As a game maker, I want to save my scene, so that my changes are still there the next time I open the studio.
- [x] As a game maker, I want to open a project folder, so that I can work on more than one game.
- [x] As a game maker, I want to export my project as one zip file, so that I can back it up or send it to someone.

### Sprint 7: scripts

Goal: a node can have a script that gives it behaviour, written in the studio and run safely.

- [ ] As a game maker, I want to give a node a script, so that it can do things of its own, like move when a key is pressed.
- [ ] As a game maker, I want to write scripts in an editor inside the studio, with colours and suggestions, so that I don't need another program.
- [ ] As a game maker, I want a script's errors shown with the line they happened on, so that I can find and fix them.
- [ ] As a player, I want a game's scripts kept away from the studio and my files, so that a broken or harmful script can't do damage.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

- Sprint 6's three stories are ticked.
- Sprint 7's four stories: a node can have a script; scripts are written in an editor inside the studio; a script's errors say where they are; and a game's scripts can't harm the studio or your files.
- The last story is why this sprint's security boundary matters. A script is code someone else may have written. Lesson 6.2 kept the page away from your files; Sprint 7 keeps scripts away from the page.

```check
contains BACKLOG.md "### Sprint 7: scripts"
contains BACKLOG.md "- [x] As a game maker, I want to export my project as one zip file"
```

## Commit, and tag 0.7.0

```powershell
git add .
git commit -m "Sprint 6 review: version 0.7.0, ADR 7, retrospective, Sprint 7 stories"
git tag -a v0.7.0 -m "Sprint 6: real files"
```

```check
git-clean
git-tag v0.7.0
```

The review is on `main`, not a branch: it changes no code, and there's no test to be red while it's written.

## Challenge: a warning before losing changes

**Optional, ★★★.** The ADR lists a cost: Open drops unsaved changes without asking. Fix it. If lesson 6.6's challenge (a `dirty` flag in the store) isn't done, do it first. Then, before `studio.open()`, the toolbar asks with `window.confirm('Discard unsaved changes?')` when the scene is dirty, and does nothing if the answer is no. Which part can be unit tested, and which only end to end?

```hints
nudge: Put the decision in the store: store.mayDiscard(ask: (question: string) => boolean): boolean returns true when the scene isn't dirty, and otherwise returns what ask says.
concept: Passing ask in, instead of calling window.confirm inside the store, is the same seam as save(write): a unit test passes a stub that answers yes or no.
```
