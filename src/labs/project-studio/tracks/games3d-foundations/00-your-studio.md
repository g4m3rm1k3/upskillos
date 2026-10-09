---
title: A 3D studio you build, then use to make games
track: Build a 3D Game Studio — Foundations
trackOrder: 32
runtime: dotnet
pedagogy: typed
typedDiff: true
console: true
---

You will build a desktop app for making 3D games. First it becomes a small scene editor: an object list, a 3D view and controls for changing positions. Later you add saving, undo, Play/Stop and export. You then make games with it, adding features when those games need them: a track editor for racing, collision tools for platforming, navigation for strategy and databases for an RPG.

The Foundations lessons build scene data, tests, a native 3D window, position editing, creation/deletion, undo/redo and versioned save/open. An early Q-learning playground lets you train and inspect a beacon bot before building the full game runtime. It is a separate prototype, not yet a game made with the editor. Play/Stop isolation, editor-authored games and export come later. The series is in development. The earlier Circuit Clash C# course remains a separate reference and keeps its existing progress.

## Describe what the first app must do

An **editor** changes authored content: where a platform starts, what it is called and which behavior it has. A **runtime** reads that content and executes a game. A **game project** supplies that game's scenes, assets and rules. Project Studio is the learning workspace where you write these programs; the 3D studio is the app you are building inside your own project folder.

Our first requirement is observable: select Crate in a list, move it right by one quarter of a world unit, and see the inspector and cube agree. Changing Crate must not move Beacon. Selection alone must not change either position. These statements become tests, rather than a vague requirement to make a good editor.

Write those three cases in your own words. Why does a screenshot alone fail to establish that Beacon's stored position stayed unchanged? It only shows one view at one time; the data tests will inspect both objects directly.

## Check the entry skills

Assume only some introductory programming. You should be able to explain a variable, an if statement, a loop and a function. C#, a terminal, classes, 3D mathematics and testing are taught here.

Recovery exercise: a counter starts at zero; a loop increments it three times; an if statement prints a message when the final value is three. Sketch this in any language you know and explain each operation. If you cannot explain it, practice those four ideas before setup. No other Project Studio series is required.

Desktop execution needs a local .NET SDK and a graphics display. Browser Project Studio can show the lessons and references but cannot launch this native app. Start with an empty folder named Studio3DLearning; all later terminal commands run there, not in the UpSkillOS repository.

## Predict the boundary between editing and playing

```predict
question: A character moves during Play. Should Stop keep that movement in the authored scene?
choice: Always keep the movement
choice: Restore the authored scene unless the user explicitly applies changes
answer: Restore the authored scene unless the user explicitly applies changes
explain: Playing explores temporary game state. Silently saving those changes would move starting positions whenever you test a game. Later lessons will create independent play state; the first editor does not have Play yet.
```

An architectural boundary is a deliberate separation of responsibilities. We will introduce boundaries when a small example demonstrates the need, starting with scene data that can be tested without a window. We use a graphics library for windows and drawing; we write the editor and game rules ourselves.

## Independent task: define an editing requirement

Choose a future feature, such as renaming an object or undoing a move. Write its input, expected result, one invalid input and the state that must remain unchanged. Do not implement it yet. Compare the requirement with your observations when that feature is built.

```hints
nudge: Pick one action a person could perform in the inspector. What could another person observe afterward?
concept: An acceptance criterion states an outcome, not a preferred class name or library. Invalid input also needs an outcome.
shape: For renaming, give a selected object and a proposed name, describe success for a useful name, rejection for an empty name, and preservation of the object's identity and position.
```

This lesson has no executable check: the evidence is your written cases and explanation. Later automated checks establish specific behaviors, not that the whole studio is complete or that the lessons have been tested with beginners.
