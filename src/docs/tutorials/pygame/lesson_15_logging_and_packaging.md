# Lesson 15 — Real Logging, and Packaging Forge as a Standalone Build

## What you'll learn
- Why `print()` debugging breaks down once a project ships as a packaged, windowless executable
- The `logging` module's actual architecture: loggers, handlers, formatters — and how severity levels filter messages
- A genuinely surprising, well-documented trap: `logging.basicConfig()` silently does nothing on its *second* call in the same process
- The essentials of turning `main.py` into a real, distributable build with `pyinstaller`

## What you'll build
`forge/logging_setup.py` — one place configuring logging correctly, once,
for the whole app — plus a working `pyinstaller` build producing a
standalone Forge executable that runs without a Python installation.

## The question
Every lesson so far has debugged with `print()`, and that's been fine for
learning. But Lesson 13 already printed error messages to the console
from inside `EditorWindow.open_project`. Once Forge is packaged as a
double-clickable app (this lesson's second half), there often *is no
console at all* for a `--windowed` build to print into. Where does that
output go, and what should replace `print()` before that becomes a real
problem?

---

## 1. Predict

```python
import logging

logging.debug("starting up")
logging.info("project loaded")
logging.warning("something looked off")
```

Run this with no other setup beforehand. Given that all three lines are
plainly written, unconditional calls, do you expect all three messages to
appear in the console, or do you expect some of them to be silently
skipped? If you guess some are skipped, guess *which* ones, and why.

---

## 2. Try it

```python
import logging

logging.debug("starting up")
logging.info("project loaded")
logging.warning("something looked off")
```

Output:
```
WARNING:root:something looked off
```

Only the `warning` call produced visible output. `debug` and `info` were
silently skipped entirely.

### What this code does (mechanical explanation)

**`import logging`**
The standard-library logging module — unlike `print`, it isn't a single
function; it's a small system of cooperating pieces, introduced properly
in Section 3.

**`logging.debug(...)`, `.info(...)`, `.warning(...)`**
Three of `logging`'s module-level convenience functions, each
corresponding to a **severity level** — `DEBUG`, `INFO`, and `WARNING`
respectively (two more exist: `ERROR`, `CRITICAL`). Calling
`logging.debug("starting up")` doesn't unconditionally print anything the
way `print("starting up")` would — it asks the logging system "please
record this message, at DEBUG severity," and the logging system decides
whether that request actually produces visible output, based on a
**configured threshold**.

**Why `debug` and `info` vanished, and `warning` didn't**
Python's logging system has a **default severity threshold of `WARNING`**
when nothing has been explicitly configured. Each level has a numeric
value (`DEBUG=10`, `INFO=20`, `WARNING=30`, `ERROR=40`, `CRITICAL=50`) —
a message is only actually emitted if its level is **greater than or
equal to** the currently configured threshold. With no configuration
done at all, the threshold defaults to `30` (`WARNING`) — `DEBUG` (`10`)
and `INFO` (`20`) both fall below that threshold and are silently
dropped; `WARNING` (`30`) meets it exactly and is shown.

---

## 3. Why?

### The architecture — loggers, handlers, formatters

`print()` has exactly one behavior: write text to standard output.
`logging` separates three distinct concerns that `print` conflates:

```
Logger    → decides WHETHER a message at a given severity is worth
            processing at all (the threshold from Section 2)
Handler   → decides WHERE an accepted message goes (console? a file?
            both, via multiple handlers attached to one logger?)
Formatter → decides HOW the message is displayed (timestamp? logger
            name? just the raw text?)
```

This is precisely why the two-half fix (Section 5) can send `DEBUG`-level
detail to a log *file* for later inspection, while only showing `INFO`
and above on the *console* the user actually sees — two handlers, two
independent thresholds, one underlying message.

### `__name__`-based logger naming

```python
logger = logging.getLogger(__name__)
```

`__name__`, introduced back in Lesson 2 for the `if __name__ ==
"__main__":` guard, is reused here for an entirely different purpose:
`getLogger(__name__)` gives each module its **own named logger**
(`"forge.viewport_widget"`, `"forge.project_file"`, etc., matching each
file's own module path). This means log output can show *exactly which
part of the codebase* produced a given message, and — though beyond this
lesson's scope — different modules' loggers can even be configured with
different thresholds independently, useful for silencing noisy debug
output from one subsystem while keeping it verbose for another you're
actively working on.

```
behavior:
  compile_time:
    - "none — logger names and levels are purely a runtime configuration concern"
  runtime:
    - "a log call only produces visible output if its severity level meets or exceeds whatever threshold is currently configured for that logger/handler combination"
```

---

## 4. Change one thing — configuring real output

```diff
 import logging
+
+logging.basicConfig(level=logging.DEBUG)
+logger = logging.getLogger(__name__)

-logging.debug("starting up")
-logging.info("project loaded")
-logging.warning("something looked off")
+logger.debug("starting up")
+logger.info("project loaded")
+logger.warning("something looked off")
```

Run it. Now all three lines produce output:
```
DEBUG:__main__:starting up
INFO:__main__:project loaded
WARNING:__main__:something looked off
```

### What changed
`logging.basicConfig(level=logging.DEBUG)` explicitly lowers the
threshold to `DEBUG` (the lowest level), so nothing is filtered out
anymore; a named logger (`getLogger(__name__)`) replaces the bare
module-level convenience functions.

### What did not change
The three log calls' text and severity levels — identical to Section 2;
only what happens to them once emitted has changed.

```
change_analysis:
  changed: "added logging.basicConfig(level=logging.DEBUG); switched from module-level logging.debug()/etc. to a named logger's methods"
  unchanged:
    - "the three log call sites' messages and severities"
  behavioral_difference:
    - "all three severities now produce visible output, and the output identifies which logger (__main__) produced each line"
  compiler_difference:
    - "none"
  runtime_difference:
    - "basicConfig() attaches a default handler/formatter to the root logger and sets its threshold — this is Section 6's trap waiting to happen if called more than once"
```

---

## 5. Put it in the project

```python
# forge/logging_setup.py
import logging
from pathlib import Path


def configure_logging(log_file: Path, console_level: int = logging.INFO,
                       file_level: int = logging.DEBUG) -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)  # let everything through to handlers;
                                          # each handler filters independently below

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)-8s %(name)s: %(message)s"
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(file_level)
    file_handler.setFormatter(formatter)

    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
```

```python
# main.py
import sys
import logging
from pathlib import Path
from PySide6.QtWidgets import QApplication
from forge.logging_setup import configure_logging
from forge.editor_window import EditorWindow

logger = logging.getLogger(__name__)


def main() -> int:
    configure_logging(Path("forge.log"))
    logger.info("Forge starting up")

    app = QApplication(sys.argv)
    window = EditorWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
```

### Code walkthrough — what's new versus Section 4

**`root_logger = logging.getLogger()`** — called with **no arguments**
`getLogger()` with no name returns the **root logger**, the top of the
logger hierarchy every named logger (`getLogger(__name__)` elsewhere)
ultimately reports up to by default. Configuring handlers here, once,
centrally, means every module's own `getLogger(__name__)` calls
throughout the rest of the codebase automatically benefit from this
setup without each module needing to configure anything itself.

**`root_logger.setLevel(logging.DEBUG)`**
This might look redundant with the handlers' own levels below, but it
isn't: **the logger's own level is an initial filter**, applied *before*
a message is even offered to any handler. Setting it to `DEBUG` (the
lowest level) means "let everything through to the handlers" — the
*actual* filtering that produces the console-vs-file difference happens
at the handler level, not here. If this line instead set the root
logger's level to `INFO`, `DEBUG`-level messages would never even reach
the file handler, regardless of the file handler's own level being set
to `DEBUG` — the logger-level and handler-level checks both apply, in
that order, and a message is dropped if it fails *either* one.

**`logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s")`**
A format string using logging's own placeholder syntax:
`%(asctime)s` (timestamp), `%(levelname)-8s` (the level name,
left-justified/padded to 8 characters — `-8` here is a standard Python
string-formatting width specifier, not logging-specific), `%(name)s`
(the logger's name, from `getLogger(__name__)`), `%(message)s` (the
actual log text). One formatter, constructed once, is reused for both
handlers here.

**`console_handler.setLevel(console_level)`** (`INFO`) vs.
**`file_handler.setLevel(file_level)`** (`DEBUG`)
This is the actual payoff of the separated architecture from Section 3:
the console shows `INFO` and above (useful, everyday operational
messages), while the log *file* additionally captures `DEBUG`-level
detail — exactly the kind of fine-grained tracing you'd want available
*after the fact* if a user reports a bug, without cluttering the console
they normally see during ordinary use.

### Why this design?
```
design_decision:
  problem: "how should debugging/diagnostic output work once print()-based debugging no longer scales, especially for a packaged build with no visible console?"
  available_choices:
    - "keep using print(), redirecting stdout to a file manually when packaged"
    - "use the standard logging module, configured once centrally, with separate console/file handlers and thresholds"
  selected_choice: "logging module, centrally configured"
  reason: "print() has no severity levels, no per-destination filtering, and no structured timestamp/source information — all of which matter the moment a packaged build has no console and a user's log file is the only diagnostic information available after something goes wrong"
  benefit: "DEBUG-level detail is always captured to forge.log even in a --windowed production build, without cluttering what a developer sees on the console during normal development"
  cost: "one extra piece of setup code (logging_setup.py) and a discipline requirement — every module must use logging.getLogger(__name__) instead of reaching for print() out of habit"
  future_revisit_condition: "if Forge is ever used by people other than the developer, log rotation (capping forge.log's size, keeping a few recent files) becomes worth adding via logging.handlers.RotatingFileHandler instead of the plain FileHandler used here"
```

---

## 6. Trap

**Normal rule (Section 4):** `logging.basicConfig(...)` configures the
root logger's handlers and level.

**Apparently equivalent code** — a codebase where one module calls
`basicConfig` early (perhaps for a quick script-level test, or left over
from an earlier version of `main.py`), and the "real" configuration is
called later:

```python
# somewhere, imported early
import logging
logging.basicConfig(level=logging.DEBUG)   # call #1, for quick local testing

# later, in main.py's "real" startup
def main():
    logging.basicConfig(
        level=logging.INFO,
        filename="forge.log",
    )   # call #2 — intended to set up real production logging
    ...
```

**Surprising result:** the file `forge.log` is **never created**, and
`DEBUG`-level messages keep appearing on the console in what's supposed
to be a clean, `INFO`-and-above production build — with no error, no
warning, nothing indicating that the second `basicConfig` call did
anything other than exactly what was asked.

**Exact reason:** this is genuinely documented, specific behavior:
**`logging.basicConfig()` only has an effect the first time it's called
in a process** (unless explicitly passed `force=True`) — if the root
logger *already has handlers attached* (which it does, from call #1),
every subsequent call to `basicConfig()` is a silent no-op, regardless of
what arguments it's given. The `level=logging.INFO, filename="forge.log"`
arguments in call #2 are not wrong, not malformed, and not rejected with
an error — they are simply **never applied at all**, because
`basicConfig`'s own documented contract is "configure the root logger,
but only if it isn't already configured."

**Project consequence:** the working version in Section 5
(`configure_logging`) deliberately avoids `basicConfig()` entirely,
building handlers and attaching them manually — this sidesteps the trap
structurally, rather than relying on remembering to pass `force=True`
correctly, or remembering that some other, unrelated module might have
already called `basicConfig()` first, possibly in an import order that
isn't obvious from reading `main.py` alone. **The rule going forward:
`configure_logging` is called exactly once, from `main.py`, and no other
module in this project calls `logging.basicConfig()` at all** — this
avoids the entire class of "which call actually took effect" confusion,
by construction.

---

## 7. Packaging: turning `main.py` into a standalone build

```
pip install pyinstaller
pyinstaller --windowed --name Forge main.py
```

This produces a `dist/Forge/` directory (or a single `dist/Forge.exe`/
`Forge.app` depending on platform and flags) — a build that runs without
a separately installed Python interpreter, bundling a private copy of the
interpreter and every imported dependency.

### What the flags mean
**`--windowed`**
Suppresses the console window that would otherwise appear alongside a
GUI app on Windows (and adjusts bundling on macOS) — this is precisely
why Section 1's opening question matters: with `--windowed`, there is no
console for a stray `print()` to write into at all; that output is simply
lost, which is the concrete, practical reason this lesson's logging setup
exists before packaging is attempted, not after.

**`--name Forge`**
Names the output executable/bundle `Forge` instead of defaulting to
`main`.

### The generated `.spec` file

Running `pyinstaller` also generates `Forge.spec` — a real Python file
describing the build, which you can edit and re-run
(`pyinstaller Forge.spec`) for more control than command-line flags alone
allow:

```python
# Forge.spec (relevant excerpt, generated automatically, then hand-edited)
a = Analysis(
    ["main.py"],
    hiddenimports=["pygame", "PySide6.QtSvg"],
    datas=[("assets", "assets")],
)
```

**`Analysis(["main.py"], ...)`**
`Analysis` is pyinstaller's own class representing "trace every import
reachable from this entry-point script, to figure out what needs
bundling." It's constructed, not called as a plain function, because it
holds significant internal state about everything discovered during that
trace.

**`hiddenimports=[...]`**
pyinstaller finds dependencies by **statically analyzing import
statements** — but some libraries (frequently including pygame and parts
of PySide6, which load certain plugins or platform-specific modules
dynamically at runtime rather than via a plain top-level `import`) load
code in ways static analysis can't see. `hiddenimports` is where you list
modules pyinstaller needs to bundle anyway, even though it couldn't
detect the need for them on its own — a common, genuinely necessary
practical step for exactly the two libraries this project depends on.

**`datas=[("assets", "assets")]`**
Non-code files — Forge's sprite assets, in this project's case — are not
Python imports at all, and pyinstaller has no way to discover they're
needed by tracing code. `datas` explicitly tells it to copy the local
`assets/` folder into the bundled build's own `assets/` folder, so
`Path("assets/placeholder.png")`-style paths (Lesson 4 onward) continue
to resolve correctly once running from inside the packaged build.

---

## 8. Exercise

**Predict:** If `root_logger.setLevel(logging.DEBUG)` in
`configure_logging` were changed to `root_logger.setLevel(logging.WARNING)`,
while leaving both handlers' own levels exactly as they are (`INFO` for
console, `DEBUG` for file), what would actually show up in `forge.log`?
Trace through both the logger-level check and the handler-level check,
in order, to justify your answer.

**Modify:** Add a third handler — another `FileHandler`, at `ERROR`
level, writing only to a separate `forge_errors.log` — so critical
problems are easy to find without scanning the full, much larger
`forge.log`. What, if anything, needs to change about the shared
`formatter` object for this to work correctly across all three handlers?

**Break:** Deliberately reintroduce Section 6's trap: add a stray
`logging.basicConfig(level=logging.DEBUG)` call somewhere that runs
*before* `configure_logging()` is called from `main.py` (for instance, at
module level in some file that `main.py` happens to import early). Run
the app and check whether `forge.log` gets created. Does the failure mode
match Section 6's prediction exactly?

**Trace:** After running `pyinstaller --windowed --name Forge main.py`
and launching the resulting build, an image fails to load with a
`FileNotFoundError` that never happened when running `python main.py`
directly. Using this lesson's explanation of `datas`, explain the most
likely cause, and what specific change to the `.spec` file would fix it.

---

## What to remember
1. `logging` separates *whether* a message is processed (logger level), *where* it goes (handlers), and *how* it's displayed (formatters) — three concerns `print()` doesn't distinguish at all.
2. The default logging threshold is `WARNING`; `DEBUG` and `INFO` calls are silently dropped unless the logger/handler levels are explicitly lowered.
3. `logging.basicConfig()` only takes effect on its *first* call per process — every subsequent call is a silent no-op unless `force=True` is passed, which is why this project builds handlers manually instead.
4. `--windowed` builds have no console at all — any remaining `print()` calls produce output that simply disappears, which is the practical reason logging must be in place before packaging.
5. `hiddenimports` and `datas` exist because `pyinstaller`'s static import analysis can't see dynamically-loaded plugin code or non-Python asset files — both pygame and PySide6, plus Forge's own `assets/` folder, need this explicit help.

## Next lesson
Lesson 16 begins Phase 9, the final phase: `forge_runtime.py`, a small
module a *separate*, real pygame-ce game can import to load a `.forge`
project file (Lesson 13's format) and play back its scenes and animations
at runtime — closing the loop between "authored in the editor" and
"running in an actual game."
