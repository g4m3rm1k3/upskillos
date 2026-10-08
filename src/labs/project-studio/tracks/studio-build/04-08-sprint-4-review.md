---
title: 4.8 — Sprint 4 Review: Version 0.5.0
track: Build Your Own Game Studio
runtime: none
concepts: adr, retrospective, release
problem: The window is an editor now, with panels that all read and change one store. What's the decision worth writing down, and what does the next sprint do with the game view in the middle?
---

The sprint's close, as before. Sprint 4 added features and broke nothing, so this is **0.5.0**.

## Version 0.5.0

```json file=package.json
{
  "name": "studio",
  "version": "0.5.0",
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
    "phaser": "4.2.1",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
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

- Only `"version"` changes. React's four packages and the plugin arrived in lesson 4.1.

```check
contains package.json "\"version\": \"0.5.0\""
```

## A record of the decision

Create `docs/adr/0005-one-store-react-draws-it.md`:

```markdown file=docs/adr/0005-one-store-react-draws-it.md
# 5. One store for the editor's state; React draws it

Status: accepted

### Context

Sprint 4 turned the window into an editor with several panels: a scene tree, an inspector, a console and the game view. They all show the same scene, history, problem and selection, and any of them can change it. Lesson 3.7 drew the page by hand in main.ts, which had grown to 145 lines and would have grown with every panel.

### Decision

- The editor's state lives in one object, the EditorStore: the scene, its history, the problem message and the selection. It's plain TypeScript, with no React in it, and is unit-tested.
- Every change goes through the store's methods, and from there through the Scene API's commands, so it can be undone and is logged as code.
- The store calls its listeners after every change. React components read the store through one hook, useStore, and React redraws them.
- A component keeps only state that nothing else needs, such as a draft being typed.
- The inspector is drawn from a registry of node types; a test holds the registry to the engine's classes.
- The game loop writes values that change every frame straight into an element React leaves alone; React draws what changes when the user acts.

### Consequences

- A new panel reads the store and calls its methods; it never needs to know about the other panels.
- Every panel is drawn again after every change. That's fine at this size; a big editor would need components that draw again only when what they show has changed.
- The selection is a path, so renaming the selected node from the console loses the selection.
- Unit tests check what components draw, not clicks and typing; those are only tested end to end, in the real app.
```

- The decision isn't "use React": that was ADR 1's stack. It's how the editor is put together with it: one store that owns the state, panels that only read it and ask it for changes, and the line between what React draws and what the game loop writes.
- The consequences are honest about the costs: every panel draws again after every change, and a renamed node loses its selection. Each may need fixing one day; the ADR says they were known, not missed.

```check
contains docs/adr/0005-one-store-react-draws-it.md "### Decision"
contains docs/adr/0005-one-store-react-draws-it.md "### Consequences"
```

## Review and retrospective

Create `docs/sprints/sprint-4.md`:

```markdown file=docs/sprints/sprint-4.md
# Sprint 4

Goal: the studio's window is an editor: the scene's tree, the game view and an inspector, side by side.

### Review

- Goal met: all three stories are done.
- The window is laid out in panels; clicking a node in the tree selects it; the inspector shows its properties and changes them, each change a command that's logged as code and can be undone.
- npm run check: 99 unit tests and 7 end-to-end tests pass.

### Retrospective

- Went well: the store was tested on its own, with a fake check, and a gap in lesson 3.7's change was found and closed by a regression test.
- Went well: each story's acceptance test was written first, and failed until the story was done.
- Went well: the registry's test caught the player's colour default before the inspector showed it wrong.
- Went badly: the inspector's key={value} bug can't be seen by a unit test, which only draws once; only the end-to-end test caught it.
- Change next sprint: write the end-to-end test for each new kind of mouse work first, since the viewport is almost all clicking and dragging.
```

- The last line sets up Sprint 5. The viewport is mouse work: clicking, dragging, turning. Mouse work can only be tested end to end, so those tests come first.

```check
contains docs/sprints/sprint-4.md "### Review"
contains docs/sprints/sprint-4.md "### Retrospective"
```

## Sprint 5's stories

So far the game view only shows the game. In every engine's editor, the view in the middle is also where you edit: click a thing to select it, drag it to move it, turn it and stretch it with handles. That view is called the **viewport**. Change `BACKLOG.md`:

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

- [ ] As a game maker, I want to click a thing in the game view to select it, so that I can pick what I see without searching the tree.
- [ ] As a game maker, I want to drag the selected thing to move it, so that I can place things by eye.
- [ ] As a game maker, I want to rotate and scale things, so that a wall can lean and a box can be any size.
- [ ] As a game maker, I want moves to snap to a grid, so that things line up exactly.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

- Rotation and scale are new to the engine: nodes have had only a position since lesson 1.3. Sprint 5 adds them to `Node2D`, to the drawing, and to the registry, whose test will insist on all three.
- Snapping means a dragged position is rounded to the nearest point on a grid, say every 16 pixels, so walls meet exactly.

```check
contains BACKLOG.md "### Sprint 5: the viewport"
contains BACKLOG.md "- [x] As a game maker, I want to see and change the selected node's properties"
```

## Commit, and tag 0.5.0

```powershell
git add .
git commit -m "Sprint 4 review: version 0.5.0, ADR 5, retrospective, Sprint 5 stories"
git tag -a v0.5.0 -m "Sprint 4: an editor"
```

```check
git-clean
git-tag v0.5.0
```

## Challenge: a renamed node stays selected

**Optional, ★★.** ADR 5 says renaming the selected node from the console loses the selection. Fix it in the store, test first: after a change, if the selected path is gone but the change was a rename of exactly that path, select the new path. What does the store need to know about the change, and where could it get it without the console telling it?

```hints
nudge: The scene script's renameNode knows the old path and the new name; the store makes the script.
concept: The store can wrap the script it hands to runCode, so a rename made from code still passes through the store.
shape: A new path is the old path with its last part replaced: path.slice(0, path.lastIndexOf('/') + 1) + newName.
```
