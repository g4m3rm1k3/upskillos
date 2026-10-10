# Project Studio platform matrix

What each Project Studio track needs on the learner's computer, and what has actually been verified. Requirements come from the commands the lessons' checks run. Nothing here is a claim that a platform works unless the **Verified** column says so.

## How checks behave on each platform

- Checks run in the desktop app (Electron), in the learner's project folder: through PowerShell on Windows and through the login shell (`$SHELL -l -c`, default zsh) on macOS and Linux. The browser-only Studio shows lessons but can't run checks.
- Python lessons write virtual-environment programs the Windows way, `.venv/Scripts/python`. On macOS and Linux the checker runs the same program from `.venv/bin/` (`unixVenvPaths` in `desktop/app/project-checks.cjs`). The lesson prose still shows the Windows path.
- A check limited to one OS (`os=windows|mac|linux`) is skipped elsewhere and shown as "not checked on this computer". It is never counted as a pass: a step needs at least one check that actually ran (`checksPassed` in `src/labs/project-studio/checkEvidence.js`).
- Native walkthrough tests (`*.desktop.test.js`) drive every step of a track against a real folder. They need the track's toolchain installed and are not part of PR checks.

## Tracks

| Track(s) | Needs | Native walkthrough test | Verified |
| --- | --- | --- | --- |
| forge-tools … forge-records | Python 3.12+, venv, pytest, pygame, Git; sqlite3 module from 06 on | `forge.desktop.test.js` | not recorded |
| aml-python, aml-project | Python 3.12+, venv, pytest, Git | `appliedMl.desktop.test.js` | not recorded |
| ml-* (19 tracks) | Python 3.12+, venv, pytest, scikit-learn, NumPy; FastAPI for web/database/studio/capstone; PyTorch for ml-pytorch | `mlProduction.desktop.test.js` | not recorded |
| rl-pygame | Python 3.12+, venv, NumPy, pygame, Gymnasium, pytest | `rlPygame.desktop.test.js` | not recorded |
| pyside6-engine | Python, PySide6 (one lesson, no checks yet) | none | not recorded |
| spreadsheet-build | Python, Node.js and npm, Git; some checks are Windows/macOS pairs | `spreadsheetBuild.desktop.test.js` (on `walkSeries.js`) | Sprints 0–2 pass on Windows (2026-10-10, 496 s) |
| dice-path-start, dice-cpp | A C++20 compiler (`g++`) | `diceStart.desktop.test.js`, `diceCpp.desktop.test.js` | not recorded |
| cpp-foundations … cpp-networking, cpp-graphics, cpp-engines | C++20 compiler, CMake; Git for cpp-engineering | one `cpp*.desktop.test.js` per track | not recorded |
| cpp-systems | as above; process checks have Linux and macOS variants only | `cppSystems.desktop.test.js` | not recorded |
| cpp-game | C++ compiler and the Studio's C++ runtime, graphics display | `cppPong.desktop.test.js` | not recorded |
| java-engineering | JDK, Maven, Node.js and npm, Git | `javaEngineering.desktop.test.js` | not recorded |
| circuit-clash | .NET 10 SDK, Raylib-cs 8.1.0, graphics display | none | macOS on Apple silicon (stated in lesson 01); Windows and Linux untested |

## Recording a verification

When a walkthrough passes on a clean machine, replace "not recorded" with the OS and version, the toolchain versions and the date, for example `Windows 11, Python 3.13.1, 2026-10-06`. Record a failure the same way, with what broke. Don't infer a platform from a run on another one.
