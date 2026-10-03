# Classic games in C++ — Project Studio

The curriculum builds recognizable classic mechanics and introduces C++ when the current game needs it. Start with Pong, then reuse its input, update, collision, and state concepts in other classics. Optional modifications and debugging challenges should not block the main build.

## Available now

In the Windows desktop app, open `#/lab/project-studio`, choose **Classic Games in C++ — Pong**, and pick a new empty project folder. Click **Create Pong starter** in lesson 1, then Run. The starter supplies `game.h` and a short runnable `main.cpp`, without overwriting existing learner files.

Lesson 1 now teaches one paddle in nine runnable steps: open the court, change its initial position, name that value, move each update, respond to S, name the speed, respond to W, and correct each boundary separately. Small code blocks are immediately followed by bullet explanations, predictions, and visible experiments. Full target files are collapsed under an optional reference disclosure. The ball and right paddle deliberately remain stationary while the learner understands the first paddle.

The compiler banner detects a working system compiler or the app-managed compiler. Its Install button uses the existing desktop runtime installer. No download happens just from opening the track.

For this checkout, start or restart desktop development with `node scripts/run-desktop-dev.mjs` (equivalent to `npm run desktop:dev`). Restarting Electron is required for main-process runtime changes. An already installed packaged desktop app needs a newly built package to include this work.

The native renderer uses Windows APIs and simple shapes. The first lesson is Windows-only and uses an approximate timer. This is a starting point, not a finished historical recreation or a complete game-development course. The earlier complete rally prototype is preserved as `support/rally-reference.cpp`; it is not presented as a taught beginner lesson or automatically installed.

## Desktop connection

1. Project Studio saves the learner's active file through the existing project filesystem bridge.
2. `project:run` calls `runProjectFile` in `desktop/app/project-fs.cjs`, confined to the picked folder.
3. The C++ runtime's new `projectCommand` uses its existing compiler resolution, compiles the entry `.cpp` with its included headers, and writes `build/<entry-name>.exe` under that folder.
4. The project runner launches that executable with the project folder as its working directory and streams output/exit events through the existing bridge. C++ hides the console window; the program's own native game window opens normally.
5. Lesson 1's checks confirm its source edits. Independent compiled tests verify movement, both-key behavior, boundaries, and unchanged ball/right-paddle state. The preserved rally reference also has a `--check` mode for its prototype rules.

CodeLens tracing is a separate debugger adapter. This track does not require GDB or change CodeLens. It also does not change `courseLoader.js`, course ordering, lesson ids, routes, or progress migrations. Track discovery is the existing Markdown glob; the established tracks remain first.

One source translation unit is supported here. Headers can contain reusable definitions. Compiling several independent `.cpp` files, external graphics dependencies, and build-system configuration are future work.

## Proposed classic progression

| Project | Why these C++ concepts are needed |
|---|---|
| Pong | Variables, arithmetic, conditions, functions, structs, references; then timing and collision geometry |
| Breakout / Arkanoid | Collections of bricks, iteration, removal, levels, lives, and reusable collision functions |
| Snake | A growing ordered body, grid coordinates, containers, input queues, and self-collision |
| Space Invaders | Enemy and projectile collections, spawn timers, ownership, and wave state |
| Tetris | Board arrays, piece data, rotations, collision, locking, line clearing, and state machines |
| Asteroids | Vectors, angles, velocity, screen wrapping, and object lifetime |
| A classic platformer | Tile maps, gravity, collision resolution, animation, and camera coordinates |

Only Pong lesson 1 is currently supplied. The list is a planning sequence, not a catalog of implemented projects. Each project should have a runnable starter, incremental builds, concept explanations, optional changes, a deliberate debugging exercise, and checks against compiled behavior. A later graphics library should be introduced through an explicit dependency/build lesson.

## Initial implementation verification on 2026-10-03

- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/CppProjectRuntime.test.jsx src/labs/project-studio/cppPong.desktop.test.js src/labs/project-studio/cppProject.desktop.test.js src/labs/project-studio/checks.test.js`: **4 files passed, 23 tests passed**, with Vite esbuild/oxc deprecation warnings. Real compiler tests ran on the installed MinGW compiler; no compiler tests were skipped on this machine.
- Tests compile each runnable lesson step; check both paddle boundaries, ball movement, both wall and paddle returns, both scoring directions, and a hidden real native window's timer, paint, and Escape-close events. A deliberately broken paddle return fails the supplied check.
- Adapter tests cover sibling headers, nested source folders, paths with spaces, rebuilding changed disk content, failed compilation removing stale output, missing toolchains, picked-root handoff, and refusal of escaped paths. Existing unsupported runtimes still return their previous unsupported result.
- Runtime UI tests cover using an installed compiler, installation only after a click, refreshed status, and recoverable installation errors.
- `node src/scripts/build-lesson-titles.js`, `node scripts/build-lesson-ids.mjs`, and `node scripts/generate-project-facts.mjs` regenerated the catalog; the facts generator reported the existing identity findings in the generated inventory.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/projectChecks.test.js`: **7 assertions passed**, but the suite exited 1 because its existing synchronous temporary-folder cleanup encountered Windows `EPERM`. This repeated on a rerun; it is not recorded as a passing suite.
- A combined run adding `src/labs/project-studio/projectChecks.test.js` to the four focused files reported **30 tests passed**, but failed its cleanup hook even with a temporary retry experiment. That experiment was reverted; the existing cleanup implementation is unchanged.
- `node node_modules/vite/bin/vite.js build` with `NODE_OPTIONS=--max-old-space-size=8192`: **built in 4m 38s**, exit 0. Existing warnings included stale Browserslist data, broad Tailwind patterns, a CSS `-3` identifier, eval usage, a mixed static/dynamic import, and large chunks. This was the Vite production build, not the packaging command or a full `npm run build` pipeline.
- `node scripts/check-docs.mjs`: **Contributor docs checked: 8 file(s), links, paths and commands all exist**. The three catalog generators with `--check` reported current titles, ids, and facts, with existing inventory findings.
- `node --check desktop/app/runtimes/cpp.cjs` and `node --check desktop/app/project-fs.cjs`: exited 0 without diagnostics. `git diff --check` found no whitespace errors, with CRLF conversion warnings.

The native smoke test opens its game window hidden; a manual visual review in the desktop app was not performed. The tests validate real native execution and game behavior, while the build validates renderer bundling.

No compiler was installed, no course was modified, and no commit or push was made.

## Lesson 1 teaching revision

The original lesson demanded copying a large Windows adapter and jumped directly to complete game rules. It also mentioned an Apply step control that did not exist. The revised lesson supplies the adapter through an explicit starter action, teaches smaller changes, explains code with bullets, and makes reference files optional. These authoring features are opt-in (`provided` fences and `reference: optional` frontmatter); existing tracks retain their usual reference display.

Starter creation preflights every destination. For tracks supplying support files, it preserves an existing learner entry file and adds missing infrastructure; a conflicting support file still prevents writes. Run also supplies missing infrastructure before compilation. The original complete prototype remains outside the lesson so its work is preserved without claiming those mechanics have been taught.

Every step now explicitly distinguishes reading the supplied `main.cpp` from editing it, and states where an addition or replacement belongs. `game.h` remains supplied and unchanged throughout lesson 1.

Each visible teaching snippet has an adjacent Read only, Add, or Replace instruction naming `main.cpp` and its exact location. Placement uses existing statements and closing braces as anchors, including whether a new block belongs inside a function but outside another conditional. The three introductory snippets are explicitly identified as code already supplied in the editor.

Revision verification:

- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/cppPong.desktop.test.js src/labs/project-studio/providedFiles.test.js src/labs/project-studio/CppProjectRuntime.test.jsx src/labs/project-studio/cppProject.desktop.test.js src/labs/project-studio/checks.test.js`: **6 files passed, 30 tests passed**. Vite printed esbuild/oxc configuration warnings. Every step compiled; independent paddle tests passed and a deliberately incorrect boundary failed. Renderer tests distinguish read/setup from editing and preserve other tracks' full reference display.
- A temporary Playwright preview used the real lesson panel, parsed lesson, Markdown renderer, and previously built application stylesheet. It confirmed three visible introductory teaching blocks of at most four lines, each followed by a bullet list, with the full reference collapsed. Step 2 shows only the one-line position edit. It reported **no page errors**. Initial requests timed out during global CSS processing; the preview then used the existing built stylesheet. Temporary preview files were removed and the dev server was stopped.
- `node scripts/check-docs.mjs` reported **Contributor docs checked: 8 file(s), links, paths and commands all exist**; `git diff --check` reported no whitespace errors, with CRLF conversion warnings.
- The earlier production-build result belongs to the initial implementation. A new production build was not run for this teaching revision.

## Starter and desktop-process repair

An entry file matching the reference does not prove the header exists. The starter button remains available to repair a missing `game.h`, and retains a learner's existing `main.cpp`. Runtime status now reports whether the loaded Electron runtime supports project execution. The C++ banner flags older bridges, and an unsupported Run result explains how to restart the updated desktop process. Updating renderer content alone cannot replace runtime modules already loaded by Electron; installed releases require an updated desktop build.

Lesson 1 explicitly checks setup before Run and teaches C++ declarations, types, parameters, references, arguments, braces, semicolons, case sensitivity, and the distinction between supplied names and keywords. An optional missing-semicolon experiment introduces compiler diagnostics without adding another code dump.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/providedFiles.test.js src/labs/project-studio/CppProjectRuntime.test.jsx src/labs/project-studio/cppPong.desktop.test.js src/labs/project-studio/cppProject.desktop.test.js src/labs/project-studio/checks.test.js` reported **6 files passed, 33 tests passed**, with Vite esbuild/oxc deprecation warnings. This includes missing-header repair without overwriting typed code, repair when the main file matches, legacy-bridge messaging, and compilation of all lesson steps. `node --check desktop/app/main.cjs` and `node --check desktop/app/runtimes/cpp.cjs` exited 0 without diagnostics. No installed app was replaced or running desktop session restarted during this repair.

## Visible game and process controls

The C++ executable now launches with `windowsHide: false`: Windows startup settings can suppress a native game's first `ShowWindow` call as well as its console. Compilation still hides the compiler window. Project Studio exposes Stop through the existing stop-run bridge, which now includes individual project processes. A stop requested during compilation is applied after launch. Output explains where the game opened, and events received before the run-id response are retained so an immediate exit does not leave the UI running. Rejected run requests also clear the running state.

Verification: the six focused suites listed above passed **34 tests** after adding live-process termination coverage. After adding native window visibility coverage, `node node_modules/vitest/vitest.mjs run src/labs/project-studio/cppPong.desktop.test.js src/labs/project-studio/cppProject.desktop.test.js` reported **2 files passed, 11 tests passed**, with Vite esbuild/oxc warnings. The visibility probe uses the supplied lesson header, the actual launch setting, `IsWindowVisible`, and Escape to close after three ticks. `node --check desktop/app/main.cjs` and `node --check desktop/app/project-fs.cjs` exited 0; Babel parsed Project Studio JSX successfully. An existing running app must be fully restarted to load the changed runtime.

## Separate folders per Project Studio track

Project Studio no longer treats the most recently chosen folder as every track's project. The desktop config stores roots under track keys; all filesystem requests, starter provisioning, Run, checks, and terminal starts carry that key. Lessons within one track continue using the same folder as they build the same project. Separate tracks require separate folders. Terminals close the previous shell and resolve the active track's root on restart.

The legacy shared folder is retained in the config for older callers but is never automatically assigned to a track. No learner files are moved or removed. After restarting the updated desktop app, explicitly select the existing Pong folder for the C++ track and the spreadsheet project's folder for its track. A folder already assigned to another track is rejected. Older desktop bridges are detected before folder selection, preventing silent fallback to their shared root.

Switching tracks or folders flushes pending edited buffers, respects external-file conflicts, and clears old editor state. Scoped callbacks remain bound to the original track, while stale tree responses and file reads cannot populate the newly selected project's UI.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/useProjectFs.test.jsx src/labs/project-studio/projectIsolation.test.js src/labs/project-studio/cppProject.desktop.test.js src/labs/project-studio/cppPong.desktop.test.js src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/CppProjectRuntime.test.jsx src/labs/project-studio/providedFiles.test.js src/labs/project-studio/checks.test.js` reported **8 files passed, 39 tests passed**, with Vite esbuild/oxc warnings. Isolation tests exercise independent reads/writes, remembered roots, run-root selection, duplicate-folder refusal, unconfigured tracks, escaped paths, and stale responses. Syntax checks for the main process, preload, and project filesystem exited 0; Babel successfully parsed Project Studio and its filesystem hook after fixing a duplicate hook declaration found during verification.

After including the track key in terminal startup, `node node_modules/vitest/vitest.mjs run src/labs/project-studio/TerminalPanel.test.jsx src/labs/project-studio/useProjectFs.test.jsx src/labs/project-studio/projectIsolation.test.js` reported **3 files passed, 5 tests passed**, including shell cleanup and scoped restart. Warnings were Vite esbuild/oxc deprecations and stale Browserslist data. Terminal JSX parsed successfully. `node scripts/check-docs.mjs` reported **8 contributor files checked, links, paths and commands all exist**. `git diff --check` reported no whitespace errors, with CRLF conversion warnings. No production build or manual full-app browser session was run for this change.

## Explorer file and folder creation

The Explorer + and folder buttons previously called `window.prompt`, which is unsupported in Electron. They now open an inline name field with Create/Cancel, Enter submission, and visible failure messages. File creation uses a scoped `project:create` request and the filesystem's exclusive `wx` flag; selecting an existing filename returns an error without truncating learner work. Success refreshes the file tree and opens the new file. Folder creation uses the same form and existing scoped mkdir request. The new preload method requires restarting the updated desktop process.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/FileTree.test.jsx src/labs/project-studio/useProjectFs.test.jsx src/labs/project-studio/projectIsolation.test.js src/labs/project-studio/TerminalPanel.test.jsx` reported **4 files passed, 9 tests passed**. Coverage includes opening the form via +, creating relative paths, canceling, retaining failed names for retry, scope handoff, and refusing duplicate, escaped, and unconfigured file creation. Warnings were Vite esbuild/oxc deprecations and stale Browserslist data. Syntax checks for the main process, preload, and project filesystem exited 0; Project Studio and Explorer JSX parsed successfully. A search found no remaining `prompt()` calls in Project Studio.

File creation now releases the form once the filesystem operation succeeds; editor opening and tree refresh run afterward, so editor loading cannot keep the + control disabled. Each file has a Rename action that prefills its relative path. Rename flushes pending edits, updates open tabs and buffers, and keeps the contents intact. The desktop operation uses exclusive link creation followed by removal of the original link, preventing a destination collision from overwriting existing work. Filesystems that do not support hard links return a visible error and retain the source. Directory rename is not exposed.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/FileTree.test.jsx src/labs/project-studio/projectIsolation.test.js src/labs/project-studio/useProjectFs.test.jsx` reported **3 files passed, 11 tests passed**, including two successive creations, rename prefill/submission, content preservation, collision refusal, and escaped destination refusal. Vite printed esbuild/oxc deprecation warnings. `node --check desktop/app/project-fs.cjs` exited 0; Studio and Explorer JSX parsed successfully. These are automated UI and real-filesystem regressions; the second-file failure was not reproduced in the user's live desktop session.

## Adjustable lesson and editor space

Studio's lesson and explorer widths now use draggable dividers rather than fixed 440/210-pixel panes. Focus a divider and use Left/Right arrows for keyboard resizing. Hide explorer in the toolbar gives the editor more space; Show explorer restores it. Widths and visibility are remembered locally. Resize bounds adapt to the lab container's actual width and reserve room for the editor. The lesson is also resizable beside the folder chooser. Monaco's existing automatic layout follows the editor's new dimensions.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/StudioPanes.test.jsx src/labs/project-studio/FileTree.test.jsx` reported **2 files passed, 6 tests passed**, with Vite esbuild/oxc warnings. Tests cover keyboard resizing, saved width, hiding/restoring the explorer without losing editor content, and the existing Explorer actions. A temporary Playwright pane preview passed drag resize, explorer hiding, editor expansion/content preservation, saved-width restoration, and a narrow-viewport check. The initial narrow-viewport assertion ran before ResizeObserver delivered the new bounds; waiting for layout settled it. This preview used the real pane component with sample editor/lesson content, not a full Electron session. Temporary preview files were removed and the server stopped. Studio JSX parsed successfully. No course content or course discovery code changed.

## Series navigation and contained surfaces

Studio now presents the C++ topics as chapters under C++ — From Zero to Mastery, followed by lessons within each chapter. Continue moves between lessons and chapters. The grouping preserves the existing discovered lesson ids, progress keys and separate folder assignments; future `cpp-*` topics are grouped automatically. Planned curriculum extensions are stated explicitly rather than presented as finished lessons.

A chapter with no folder now retains the explorer and Show/Hide control, with an explanation to choose its folder. The pane layout fills its container and has an opaque fallback surface even when theme CSS variables are unavailable. The bottom panel has an opaque background, clipped content, a positioned container and a height cap so it cannot cover the whole editor.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/StudioNavigation.test.jsx src/labs/project-studio/series.test.js src/labs/project-studio/StudioPanes.test.jsx src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/FileTree.test.jsx src/labs/project-studio/TerminalPanel.test.jsx` reported **6 files passed, 16 tests passed**, with Vite esbuild/oxc and stale Browserslist warnings. Coverage includes grouping, original lesson-id preservation, unrelated series order, new topic discovery, continuation, and an integrated Studio view switching from an unassigned chapter to a folder-backed chapter. An initial test expectation was adjusted for happy-dom preserving a hex style value rather than normalizing it to RGB.

A temporary Playwright preview with the real pane, Explorer and Output components passed opaque-background, container-height, bottom-boundary and folderless-explorer checks; its screenshot was inspected. Vite navigation initially timed out, so the preview was bundled directly with esbuild and loaded into Playwright. The temporary server was stopped and preview files removed. This was a component browser preview, not a full Electron session. Studio and lesson JSX parsed successfully.

Studio lesson Markdown no longer inherits the shared renderer's `75ch` code/output width cap. A scoped lesson stylesheet makes displayed preformatted boxes fill the resizable pane and wrap long lines. Full reference diff lines wrap too, with a shrinking text span beside the diff marker. This changes rendering only; learner files and other courses' article layouts retain their existing behavior.

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/StudioPanes.test.jsx src/labs/project-studio/StudioNavigation.test.jsx` reported **3 files passed, 7 tests passed**, with Vite esbuild/oxc and stale Browserslist warnings. A temporary esbuild/Playwright preview using the real lesson Markdown and reference renderer confirmed that plain output, highlighted C++ and the opened full reference all expanded when their container grew from 480 to 1050 pixels, with no horizontal overflow and no remaining computed max-width. The screenshot was inspected and temporary files removed.
