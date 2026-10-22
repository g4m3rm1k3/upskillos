# WinForms to React — Practical Forms from Zero C#

## Audience and project

For a learner with basic Python scripting, no C# experience, and only introductory React state knowledge. The standalone FormDesk project teaches general Windows interface work: collect a name and quantity, validate them, preview a request, save a draft, and recover it from a file. It includes a separate React/WebView2 host calling the same C# rules. No Mastercam API, SDK, installation, or add-in integration is required or included.

The lessons use modern .NET 10 on Windows. A later proprietary host integration must select the target framework and deployment model required by that host; the standalone application is not an add-in compatibility claim.

Open **Project Studio → WinForms to React — Practical Forms from Zero C#**. Select an empty `form-desk` project folder and continue through the chapters in order. The series uses one remembered folder. Commands run in Windows PowerShell; the lessons explicitly use the terminal rather than the Studio Run button. Browser Studio can display the material, while Desktop runs checks against the learner's real files.

## Authored learning path

| Chapter | Skills and observable milestone |
| --- | --- |
| [C# for Python Scripters](../src/labs/project-studio/tracks/winforms-start/01-01-first-csharp.md) | Compiler and project setup; typed values, interpolation, decisions, methods, parsing, object identity and properties; a reusable Core library and package-free boundary assertions. |
| [Build and Validate Windows Forms](../src/labs/project-studio/tracks/winforms-forms/02-01-first-window.md) | Explicit STA startup, forms and controls, incremental TableLayoutPanel layout, resizing, access keys and tab order, event subscriptions, reset, field errors, an owned preview dialog and cancellation. |
| [Save, Open and Recover](../src/labs/project-studio/tracks/winforms-workflow/03-01-safe-files.md) | JSON serialization and parsing, syntax/type/business-rule boundaries, exceptions and disposal, Save/Open dialogs, cancellation and applying a candidate only after validation. |
| [React and a C# Host](../src/labs/project-studio/tracks/winforms-react/04-01-a-small-react-screen.md) | JavaScript/JSX refresh, components, controlled fields, immutable state updates, browser feedback, local WebView2 content, typed JSON messages, async replies and cleanup, and C# validation against browser bypasses. |

The initial console execution is the first runnable result. The first independent task changes a tiny program before any UI toolchain is introduced. A class library is introduced only after methods and objects; the web/host boundary follows working native forms and file recovery. Full-file references are optional reveals; independent tasks show requirements and progressive hints instead of their solution.

## Tool and project boundaries

- The entry requires Windows and the .NET 10 SDK. It does not require Visual Studio, Python packages, Git, a database, or an earlier course. The WinForms lessons explain the visual designer and begin with explicit control construction so the learner can see the C# being executed.
- `Scratch/` and `Practice/` are separate console projects. `Core/` contains the shared request type and rules. `Checks/`, `FileChecks/`, and the Windows control check projects are provided test infrastructure.
- `FormDesk/` is the native forms application. `Web/` is the React interface, introduced later with Node/npm setup and pinned dependencies. `ReactHost/` is a separate WinForms/WebView2 executable, preserving the native app for comparison. `BoundaryProbe/` tests the C# message boundary without opening a browser.
- The React client provides immediate feedback; the host validates message shape and calls Core again before accepting a preview. The local message interface accepts only the taught preview operation. It does not accept script, shell commands or arbitrary file paths.

## Assessment and review status

Each lesson includes prediction, a deliberate failure with restoration instructions, and an independent transfer task with a parsed hint ladder. Learners should retain an observed result, their explanation, and an independently chosen test or change. Automated evidence does not replace those tasks.

The Windows walkthrough is [winforms.desktop.test.js](../src/labs/project-studio/winforms.desktop.test.js). Its actions and wrong answers are assembled in [winforms.walkthrough.js](../src/labs/project-studio/tracks/winforms.walkthrough.js). It reconstructs the project from an empty folder and runs lesson checks. Node tests exercise validation/formatting and the bridge transport; .NET assertions exercise the actual shared rules, file behavior and JSON boundary. Hidden WinForms checks inspect real constructed controls and invoke handlers without displaying system dialogs; they do not establish real keyboard or visual behavior.

The course remains **in development** pending learner review and manual native-interface review. Required manual exercises cover actual dialog selection/cancellation, resize and high-DPI readability, keyboard focus/access keys, displayed error icons, and an actual WebView2 React-to-C# round trip. Passing a build or mocked transport does not establish these behaviors. See the [platform matrix](project-studio-platform-matrix.md) for recorded execution evidence.

## Verification recorded 2026-10-21

Executed on Windows with .NET SDK 10.0.301 and Node 24.12.0. Commands requiring ordinary Windows process/filesystem access were run outside the restricted test sandbox after its Vite rename and NuGet/MSBuild access failures. No learner commands were weakened to accommodate that sandbox.

| Command | Output and meaning |
| --- | --- |
| `npx vitest run src/labs/project-studio/winforms.desktop.test.js` | `Test Files 1 passed (1)`; `Tests 19 passed (19)`; duration 235.78 s. Reconstructed the entire project and rejected authored wrong answers. |
| `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js" --maxWorkers=2` | `Test Files 54 passed (54)`; `Tests 247 passed (247)`. The initial run without the worker limit had 246 passes and an existing stdin test timed out at 5000 ms while other verification ran; the bounded-worker rerun passed. Both runs printed the existing stale Browserslist database warning. |
| `npm run typecheck` | `tsc --noEmit`, exit 0 with no diagnostics. |
| `npm run facts` | Title/id maps and project facts regenerated; the generator printed the existing inventory content findings. No catalog additions were required because Project Studio lessons are discovered separately from course lessons. |
| `npm run catalog:check` | Lesson titles, ids and project facts reported current; the existing 14 catalog findings remain. |
| `npm run docs:check` | `Contributor docs checked: 10 file(s), links, paths and commands all exist.` |
| `node scripts/audit-project-studio-lessons.mjs --write` | Regenerated the review inventory. WinForms entries have no structural errors. The full-catalog audit still reports four existing `independent task exposes full target` errors in Electron Basics and Spreadsheet Build; the command therefore exits 1. The report retains textual review signals, which are not certifications. |

Additional staged React execution passed its Node tests (`8 passed`, `0 failed`), Vite build and real C# protocol probes. The final host build printed `Build succeeded`, `0 Warning(s)`, `0 Error(s)` after excluding the package's unused WPF adapter. A browser rendered the actual React page: blank and fractional inputs displayed feedback, and a valid request honestly asked for the desktop host instead of faking a C# response. The temporary servers were stopped after verification.

The actual LessonPanel component was also rendered with the new Markdown: lesson selection, C# reference reveal, prediction choices and one-at-a-time hints worked. During the full-app preview session, generated-file hot reloads were followed by an app-shell failure, `Cannot destructure property 'startTour' of 'useTour(...)' as it is null`; the isolated lesson-panel preview avoided that shell. A subsequent clean navigation timed out, so complete-app rendering was not verified and the cause of the Tour failure was not established. A real WebView2 round trip remains a manual check. A production app build was not run for this content change.
