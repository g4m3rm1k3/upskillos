# Scrap lessons

Paste Project Studio lessons here, written anywhere (a browser agent, by hand), and they show up in Project Studio without registering anything. This folder is separate from `tracks/`, so nothing here changes the built-in lessons, their progress or their tests.

## How to add lessons

1. Copy everything in [_AGENT-PROMPT.md](_AGENT-PROMPT.md) into the browser agent, fill in the topic at the top, and send it.
2. The agent replies with a folder plan and one block per file, each headed with its path, such as `Chess Engine/01 The Board/01-squares.md`.
3. Make those folders here and paste each block into its file.
4. In `npm run dev`, the page picks the files up when you save them. The desktop app and the built site need a rebuild.

## Where a file goes

| Path under `scrap/` | Series drop-down | Chapter drop-down |
|---|---|---|
| `my-lesson.md` | Scrap | Loose lessons |
| `Chess Engine/intro.md` | Scrap · Chess Engine | Chess Engine |
| `Chess Engine/01 The Board/01-squares.md` | Scrap · Chess Engine | 01 The Board |
| `Chess Engine/02 Moves/Generation/01-pawns.md` | Scrap · Chess Engine | 02 Moves / Generation |

- Lessons sort by file name, chapters by folder name, so number them: `01-…`, `02-…`.
- A `track:` line in a chapter's first lesson replaces the folder name in the Chapter drop-down.
- Every chapter in one series builds in **one project folder**.
- Files a lesson names in `support:` go in that chapter's `support/` folder, such as `Chess Engine/01 The Board/support/tests/test_board.py`.
- `README.md` and anything starting with `_` are ignored, so you can keep notes as `_notes.md`.
- A file that can't be read shows up as a lesson saying what's wrong with it. Fix the file and save.

## Keep the paths

A lesson's progress is saved under its folder path and file name. Renaming a folder or file starts that lesson's progress again, and renaming a series folder points it at a new project folder.

## Moving a lesson into the real course

When a scrap lesson is good, follow [docs/contributing/project-studio-series.md](../../../../docs/contributing/project-studio-series.md) to move it into `tracks/` with a walkthrough and tests.
