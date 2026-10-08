---
title: 5.9 — Sprint 5 Review: Version 0.6.0
track: Build Your Own Game Studio
runtime: none
concepts: adr, retrospective, release
problem: The game view is an editor now: modes, a camera, tools and a grid. Which decisions are worth writing down, what does the retrospective say about the code that grew, and what does the next sprint need?
---

The sprint's close, as before. Sprint 5 added features and broke nothing a user relies on, so this is **0.6.0**.

## Version 0.6.0

```json file=package.json
{
  "name": "studio",
  "version": "0.6.0",
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

- Only `"version"` changes. Sprint 5 added no packages: transforms, picking and the camera are all our own code.

```check
contains package.json "\"version\": \"0.6.0\""
```

## A record of the decisions

Create `docs/adr/0006-edit-mode-and-the-view.md`:

```markdown file=docs/adr/0006-edit-mode-and-the-view.md
# 6. Edit mode, play mode, and a viewport that works in world positions

Status: accepted

### Context

Sprint 5 made the game view a place to edit: clicking, dragging, turning and stretching things, with a camera that pans and zooms. Until then the game ran all the time, so what the view showed was the game's state, not the scene: a player that had walked away was no longer where the scene said. And the view was the world, pixel for pixel, so a click was a world position.

### Decision

- The studio has two modes. In edit mode the game is drawn but doesn't run, so what you see is the scene's data. In play mode it runs; Stop builds it again from the scene.
- A node's placement is a transform: an x step, a y step and an origin. Drawing, picking, dragging and the camera all use it. Rotation is in degrees.
- The editor's camera is a view transform from world to screen, kept by the game view alone. Every pointer position is turned into a world position first; only drawing goes back to the screen.
- While dragging, only the engine's node changes: a draft, as in the inspector. Letting go makes one command, so one drag is one undo.
- Snapping rounds what a drag produces: positions to a 16 pixel grid, turns to 15 degrees, scales to quarters, which binary numbers hold exactly.

### Consequences

- Any change while playing builds the game again from the scene, so the game starts over.
- The inspector shows a dragged value only when the drag ends.
- Tools are chosen from the toolbar; there are no handles on the selected thing yet.
- The game view's pointer code is tested only end to end.
```

- The context says what forced the decisions: a running game shows game state, not the scene, and a camera separates the screen from the world.
- The decision has five parts, each a rule a later change must keep: two modes, transforms, world positions for everything but drawing, one command per drag, and snapping to values that binary numbers hold exactly.
- The consequences are the costs, written down so they're known, not discovered: an edit while playing restarts the game, the inspector lags behind a drag, there are no handles, and the pointer code has only end-to-end tests.

```check
contains docs/adr/0006-edit-mode-and-the-view.md "### Decision"
contains docs/adr/0006-edit-mode-and-the-view.md "### Consequences"
```

## Review and retrospective

Create `docs/sprints/sprint-5.md`:

```markdown file=docs/sprints/sprint-5.md
# Sprint 5

Goal: the game view is a place to edit: click to select, drag to move, turn and stretch, with a grid to snap to.

### Review

- Goal met: all four stories are done.
- The studio has edit and play modes. In edit mode you can click a thing to select it, drag it, turn it and stretch it with the rotate and scale tools, snap to a grid, and pan and zoom the view.
- npm run check: 128 unit tests and 12 end-to-end tests pass.

### Retrospective

- Went well: every new mouse interaction had its end-to-end test first, written from the story.
- Went well: one idea, the transform, does drawing, picking, dragging and the camera.
- Went well: second examples drove the general code twice: a turned box made picking use the box's own coordinates, and a turned parent made dragging use the parent's.
- Went badly at first: three end-to-end tests failed by timing out, waiting for a button that wasn't there. Checking the button exists first made each fail fast, and say why.
- Went badly: GameView has grown to 150 lines, most of them pointer handling that only the end-to-end tests check.
- Change next sprint: before adding to the game view again, move its pointer handling into a class of its own, with unit tests.
```

- The review counts what `npm run check` runs: 128 unit tests and 12 end-to-end tests.
- Sprint 4's retrospective asked for each mouse interaction's end-to-end test first. It was done, and it's the first "went well". The "went badly at first" is about what makes a red useful: a test that fails by running out of time says nothing; one that fails on a named check says what's missing.
- The "went badly" is honest about the cost of that sprint's speed: `GameView.tsx` is 152 lines, and its pointer handling (picking, three tools, panning, snapping) is only checked by starting the whole app. A bug in it shows up as a slow, vague end-to-end failure.
- So the change for next sprint is a refactor: move the pointer handling into a class of its own that a unit test can drive with made-up pointer events, as the store was in lesson 4.2.

```check
contains docs/sprints/sprint-5.md "### Review"
contains docs/sprints/sprint-5.md "### Retrospective"
```

## Sprint 6's stories

Everything so far happens in memory: close the studio and every change is gone, and the scene it opens is always the one built into the app. Sprint 6 makes the studio work with real files. Change `BACKLOG.md`:

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

- [ ] As a game maker, I want to save my scene, so that my changes are still there the next time I open the studio.
- [ ] As a game maker, I want to open a project folder, so that I can work on more than one game.
- [ ] As a game maker, I want to export my project as one zip file, so that I can back it up or send it to someone.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts: npm run check passes.
```

- All four Sprint 5 stories are ticked.
- Sprint 6's three stories: save, open a project folder, export a zip.
- Saving is harder than it sounds. The page the studio shows runs in Electron's **renderer** process, which, for safety, can't touch your files. Only the **main** process (lesson 0.6's `electron/main.js`) can. Sprint 6 is about getting a message safely from one to the other.

```check
contains BACKLOG.md "### Sprint 6: real files"
contains BACKLOG.md "- [x] As a game maker, I want moves to snap to a grid"
```

## Commit, and tag 0.6.0

```powershell
git add .
git commit -m "Sprint 5 review: version 0.6.0, ADR 6, retrospective, Sprint 6 stories"
git tag -a v0.6.0 -m "Sprint 5: the viewport"
```

```check
git-clean
git-tag v0.6.0
```

## Challenge: the pointer code, unit tested

**Optional, ★★★.** Do the retrospective's change now. Move the three pointer listeners and the wheel listener into a class, `ViewportInput`, in `src/editor/`, with methods `down(point, button)`, `move(point)`, `up()` and `wheel(point, deltaY)` that take plain values, not browser events. The game view's listeners become one line each. Then unit test it with a real `EditorStore` and a small tree of nodes: a drag of the player by `(37, 20)` with snap on records one command with `{ x: 432, y: 240 }`.

```hints
nudge: Everything the listeners share (view, pan, drag) becomes the class's fields; what they read (store, game.root) goes to its constructor.
concept: Taking plain values instead of events is what makes it testable: a test can call down(new Vec2(410, 230), 0) without a browser.
shape: class ViewportInput { view = IDENTITY; constructor(private readonly store: EditorStore, private readonly root: Node) {} down(point: Vec2, button: number): void { … } }
```
