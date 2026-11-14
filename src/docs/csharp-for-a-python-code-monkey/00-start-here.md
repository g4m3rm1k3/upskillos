# C# for a Python code monkey: build Tetris, then useful desktop tools

Start with [setup](01-setup.md), then [a running window](02-a-window.md). You need Python experience with variables, functions, lists, loops, and conditions. You do not need prior C#, XAML, desktop development, or game development.

The first project is a C# / WinUI 3 falling-block game without a game engine. Every checkpoint is a complete program. The lessons begin with code you can run, explain what it does, ask you to predict behavior, and introduce the next requirement before refactoring.

You will first keep the game in the window. Later you will extract its rules into a class and run them without a window. We introduce structure when you have seen the problem it solves.

## How to use this series

Read the setup once. Run each checkpoint before reading its explanation. Then make the small change in the exercise, predict the result, and run it again. If the result differs from your prediction, trace the relevant variables before looking at the answer. Keep your edits in the earlier checkpoint: later checkpoints are separate recovery points.

Commands in these lessons start from the repository root. The source project is `src/docs/csharp-for-a-python-code-monkey/tetris/`. Windows desktop programs run locally, outside Studio's browser code runner. Studio displays the lessons; it does not execute WinUI.

| Read in order | Runnable stage | New behavior |
|---|---|---|
| [Setup and the project files](01-setup.md) | — | Understand the tools and run commands |
| [A running window](02-a-window.md) | 01 | Open a native window |
| [Draw one block](03-draw-a-block.md) | 02 | Turn a grid position into a rectangle |
| [Move the block](04-input-and-state.md) | 03 | Keyboard events change state |
| [Make it fall](05-time-and-events.md) | 04 | A timer advances the simulation |
| [Four cells and rotation](06-pieces-and-rotation.md) | 05 | Represent and rotate a piece |
| [Remember landed pieces](07-stacking.md) | 06 | Store a board and reject collisions |
| [Clear completed rows](08-clearing-rows.md) | 07 | Compact an array without losing rows |
| [Seven different pieces](09-seven-pieces.md) | 08 | Shapes, copying, a queue, and shuffle |
| [Finish the playable game](10-scoring-and-lifecycle.md) | 09 | Score, drop, pause, restart, and game over |
| [Extract the rules and check them](11-refactor-and-check.md) | 10 | Separate C# computation from WinUI |

To play the completed version:

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1
```

Arrows move and rotate; Down soft-drops; Space hard-drops; P pauses; R restarts. Clicking the board restores keyboard focus. Switching away pauses the game; press P to resume when you return.

This is a learning implementation. It has all seven pieces, a seven-piece random bag, row clearing, score, and increasing fall speed. It uses simple horizontal rotation kicks and immediate locking on a blocked downward step. It does not implement official SRS, lock delay, hold, next-piece preview, or competitive timing rules. Those are possible later requirements, not hidden prerequisites.

## The system you are building

```text
Keyboard event / timer tick
          |
          v
Try a change against the game rules
          |
          v
Update board / falling piece / score
          |
          v
Draw rectangles and status text
```

The board is data. The rectangles are a view of that data. WinUI receives Windows input and paints the view. C# implements the rules. The runtime executes your compiled program. We will trace those boundaries repeatedly.

## After Tetris: your XML-to-SQLite editor

The next project will read your XML, display its records in an editable table, validate edits, save them to SQLite, then reopen the database and edit stored records. Importing a local XML document is parsing; downloading XML first adds a separate HTTP operation.

That project has not been implemented here. Its field mappings, keys, relationships, and XML export requirements will come from your actual sample. We will start with reading one real record, then a table, then editing, then SQL persistence. We will carry over the separation between input, rules, storage, and display learned in Tetris. WinForms can be introduced there as a deliberate comparison with WinUI.

Graphics follow-ups can grow from this game's coordinates into vectors, transforms, picking, and drawing geometry for CAD/CAM/simulation. Networking and heavier architectural patterns belong in later small projects where their behavior can be observed.
