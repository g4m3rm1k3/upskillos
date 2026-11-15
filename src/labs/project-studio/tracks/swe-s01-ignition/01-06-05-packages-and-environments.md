---
title: Packages and Environments
runtime: python
---

Last lesson, one command, `pip install ruff==0.17.5`, put a whole program into Kit's `.venv`, and Ruff then ran as `.venv/bin/ruff`. Where did it go? Why did it go into Kit's `.venv` and not into Python itself? And why can't Kit's own tools be installed the same way, so that `kit-count` works like `ruff` does, from any folder, without typing a path to a `.py` file? This lesson answers all three. It explains what a **package** and a **package manager** are, why every project gets its own isolated environment, and how to record exactly what's in one. Then it turns Kit into a package, with four commands of its own. It ends in Blockfall, which needs a different kind of environment for its next step: a web server, because browsers refuse to load JavaScript modules from files on disk.

**By the end you can:**

- Say what `pip install` downloads, where it puts it, and how to list and pin what an environment holds.
- Explain why each project has its own virtual environment, and what "activating" one changes.
- Make a Python project installable with `pyproject.toml`, so that its tools become commands, and install it in editable mode.
- Serve a folder over HTTP for a browser, and say why some pages only work that way.

**You need:** 01-06-04 (Ruff installed, `kit/pyproject.toml`); 01-06-01 and 01-06-02 (paths, `PATH`, the environment); Blockfall. An internet connection, for one install. Commands run inside `kit` unless a step says otherwise.

## What pip did

A **package** is software bundled for installing: code, plus a record of its name, version and what it needs. A **package manager** downloads packages, installs them, and keeps track of them. Python's is **pip**, and by default it downloads from **PyPI**, the Python Package Index, the public collection of Python packages. Ask pip what it knows about Ruff:

```
.venv/bin/python -m pip show ruff
```

(Windows: `.venv\Scripts\python -m pip show ruff`.) It prints `Name: ruff`, `Version: 0.17.5`, a summary, and more, including `Location:`, the folder it was installed into. That folder is the environment's **site-packages**: `kit/.venv/Lib/site-packages` on Windows, `kit/.venv/lib/python3.X/site-packages` elsewhere. It's where `import` looks, after the standard library. Anything that installs a command also puts a launcher in the environment's `Scripts` (Windows) or `bin` folder, which is where `.venv/bin/ruff` came from.

`.venv/bin/python -m pip list` lists everything installed in the environment: `pip` itself and `ruff`. And `.venv/bin/python -m pip freeze` prints the same list in the form other tools read back, one `name==version` per line:

```
ruff==0.17.5
```

Saved to a file named `requirements.txt`, that's a recipe for the environment: `pip install -r requirements.txt` installs exactly those versions, on any machine. That's how someone else, or you next year, gets the same Ruff and so the same lint report. (In Windows PowerShell 5.1, `>` writes the file as UTF-16, as 01-06-02 found; pip reads that correctly, but other tools may not, so `| Out-File -Encoding utf8 requirements.txt` is the safer way to save it there.)

```check
run "cd kit; .venv/Scripts/python -m pip show ruff" stdout="Version: 0.17.5" -- pip show describes an installed package: its version and where it went.
run "cd kit; .venv/Scripts/python -m pip freeze" stdout="ruff==0.17.5" -- pip freeze lists the environment's packages as pinned requirements.
```

## One environment per project

Kit's `.venv` is a **virtual environment**: a folder with its own copy (or link) of the Python program and its own site-packages, made in 01-01-01 with `python -m venv .venv`. Everything installed into it stays in it. Your system's Python, and every other project's environment, are unaffected.

Why bother? Because projects disagree. One project needs Ruff 0.17.5 and another an older version whose report its team has tidied up against. One library needs version 2 of something, another version 3. With a single shared installation, upgrading for one project breaks another, and nobody can say which versions a project actually works with. With one environment per project, each project's `requirements.txt` says exactly what it needs, and nothing else can change it.

Python can tell you which environment is running:

```
.venv/bin/python -c "import sys; print(sys.prefix, sys.prefix != sys.base_prefix)"
```

`sys.prefix` is the environment's folder, `kit/.venv`, and `sys.base_prefix` is the Python it was made from, so the comparison prints `True` inside a virtual environment.

**Activating.** Typing `.venv/bin/python` each time names the environment explicitly, which is why this course does it. The alternative is to **activate** it: `.venv\Scripts\Activate.ps1` in PowerShell, `source .venv/bin/activate` in bash or zsh. Activation does very little: it puts the environment's `Scripts` or `bin` folder at the front of `PATH` (01-06-02), sets the `VIRTUAL_ENV` variable, and changes the prompt. After that, `python`, `pip` and `ruff` mean the environment's, in that terminal only, until you type `deactivate`. On some Windows machines, PowerShell refuses to run `Activate.ps1` with "running scripts is disabled on this system": Windows' default execution policy blocks script files. `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` allows local scripts for your account; or don't activate, and keep typing the path.

To rebuild an environment from scratch, which is the usual fix when one gets into a muddle: delete `.venv`, `python -m venv .venv`, then `.venv/bin/python -m pip install -r requirements.txt`. Don't do it now; just know that an environment is disposable, and the requirements file is what matters.

```check
run "cd kit; .venv/Scripts/python -c \"import sys; print(sys.prefix != sys.base_prefix)\"" stdout="True" -- Kit's Python runs inside its own virtual environment.
```

## Kit as a package

Ruff became a command because its package says so: its metadata lists the commands it provides, and pip made a launcher for each. Kit can do the same. `pyproject.toml`, which so far only holds Ruff's settings, becomes Kit's package description too. Three new tables:

- `[build-system]` says which tool builds the package: **setuptools**, the long-standing standard. pip downloads it if needed.
- `[project]` is the package's identity: its name, version, a one-line description, and which Pythons it works with.
- `[project.scripts]` lists the commands: `kit-count = "count:main"` means "make a command called `kit-count` that imports the module `count` and calls its `main()`". Every Kit tool already has a `main`, and its `if __name__ == "__main__"` guard (01-01-02) is exactly what lets it be imported without running.

One more, because Kit's layout is unusual: real packages keep their code in a folder of its own, but Kit's tools are single files in the project folder. `[tool.setuptools]`'s `py-modules` lists the ones that belong to the package (the tools, and `kitargs` which they share), so that the lesson's scratch files don't get installed too.

```toml file=kit/pyproject.toml
# Kit's project settings: what the package is, how to build it, and its tools.

[build-system]
requires = ["setuptools>=64"]
build-backend = "setuptools.build_meta"

[project]
name = "kit"
version = "0.1.0"
description = "Small command line tools, built in a software engineering course"
requires-python = ">=3.10"

# The commands that installing Kit creates, and the function each one runs.
[project.scripts]
kit-count = "count:main"
kit-filter = "filter:main"
kit-hexdump = "hexdump:main"
kit-tree = "tree:main"

# Kit's tools are single files (modules) in this folder, not a package folder.
[tool.setuptools]
py-modules = ["count", "filter", "hexdump", "kitargs", "tree"]

# Settings for Ruff, Kit's linter and formatter: https://docs.astral.sh/ruff/

[tool.ruff.lint.per-file-ignores]
# Lesson files that show a mistake on purpose, so the mistake must stay.
"order.py" = ["B008", "F823"]  # 01-05-01: a default evaluated once; UnboundLocalError
"sharing.py" = ["F841"]  # 01-04-01: assigning to a parameter changes nothing outside
"show_rule.py" = ["SIM103"]  # 01-02-02: the nested form, before it was flattened
```

Save it, and install Kit into its own environment:

```
.venv/bin/python -m pip install -e .
```

`.` is "the project in this folder". `-e` makes it an **editable** install: instead of copying Kit's files into site-packages, pip records where they are, so that the commands always run your current code. Edit `count.py`, and `kit-count` runs the new version at once, without installing again. pip prints, at the end, `Successfully installed kit-0.1.0`, and `.venv/bin/` (Windows: `.venv\Scripts\`) now has `kit-count`, `kit-filter`, `kit-hexdump` and `kit-tree`.

Try one from somewhere else. Go to Blockfall and count a Kit sample from there:

```
cd ../blockfall
../kit/.venv/bin/kit-count ../kit/samples/hello.txt
```

(Windows: `..\kit\.venv\Scripts\kit-count ..\kit\samples\hello.txt`.) It prints `bytes: 7` and the rest, as `count.py` always has. With Kit's environment activated, it's just `kit-count`. Go back with `cd ../kit`.

```predict
question: You run kit-count samples/hello.txt from inside blockfall, with no ../kit/ in front of the file name. What happens?
choice: It counts kit/samples/hello.txt: kit-count knows where Kit is
choice: It fails: there's no samples/hello.txt in blockfall
answer: It fails: there's no samples/hello.txt in blockfall
explain: The command knows where Kit's code is, but the file name is the user's, and it's looked up from the working folder, blockfall (01-06-01). That's the right behaviour for a tool: a user who types a file name means the file where they are. The installed command changes how the program is found, not how its arguments are read.
```

```check
run "cd kit; .venv/Scripts/kit-count samples/hello.txt" stdout="bytes: 7" -- pip install -e . should create the kit-count command in kit's environment.
run "cd kit; .venv/Scripts/kit-tree --help" stdout="[FOLDER]" -- Each tool in [project.scripts] should become a command.
run "cd kit; .venv/Scripts/python -m pip show kit" stdout="Version: 0.1.0" -- Kit itself is now an installed package.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sysconfig; os.chdir('../blockfall'); command = os.path.join(sysconfig.get_path('scripts'), 'kit-count'); print(subprocess.run([command, '../kit/samples/hello.txt'], capture_output=True, text=True).stdout)\"" stdout="bytes: 7" -- The command runs from any folder; file names are read from where you are.
```

## A module that needs a server

Blockfall's next steps (modules 1.9 and later) split `game.js` into several files that import from one another, as Kit's tools import `kitargs`. JavaScript's way to do that is an **ES module**: a file loaded with `<script type="module">`, whose names stay private unless it `export`s them, and which other modules `import`. This module holds the T's shape, and exports it:

```javascript file=blockfall/shapes.js
// The shapes of Blockfall's pieces, as a module: a file whose names are
// private unless it exports them, and which other scripts import.
export const T = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];
```

Save it in `blockfall`. Nothing uses it yet; the next step does.

```check
contains blockfall/shapes.js "export const T" -- shapes.js should export the T's squares.
```

## Serving the folder

This small page imports the shape and reports what it got:

```html file=blockfall/module-test.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Module test</title>
</head>
<body>
  <p id="result">The module didn't load.</p>
  <script type="module">
    import { T } from "./shapes.js";
    document.getElementById("result").textContent = "The module loaded: a T of " + T.length + " squares.";
    window.loadedSquares = T.length;
  </script>
</body>
</html>
```

Save it, and open it from disk, as you open `index.html` (`start module-test.html` on Windows, `open` on macOS, `xdg-open` on Linux). It says `The module didn't load.`, and the console explains:

```
Access to script at 'file:///…/blockfall/shapes.js' from origin 'null' has been blocked by CORS policy: Cross origin requests are only supported for protocol schemes: chrome, chrome-untrusted, data, http, https.
```

Browsers don't let a page loaded from a file on disk load modules from other files. A page from disk has no **origin**, no website it belongs to (`null`), so the browser can't apply its rules about which files a page may read, and refuses. Classic scripts like `game.js` are exempt, which is why Blockfall has worked from disk so far. Modules need the page to come from a **web server**, over HTTP.

Python includes one, for exactly this. From inside `blockfall`:

```
cd ../blockfall
../kit/.venv/bin/python -m http.server 8000
```

(Windows: `..\kit\.venv\Scripts\python -m http.server 8000`. Any Python 3 will do; Kit's is just the one you know is there.) It prints `Serving HTTP on :: port 8000 (http://[::]:8000/) ...` and waits. Open `http://localhost:8000/module-test.html` in the browser: `The module loaded: a T of 4 squares.` The server logs each file it sends, `"GET /shapes.js HTTP/1.1" 200`, where 200 means "here it is". `http://localhost:8000/` serves `index.html`, and Blockfall plays as before. `localhost` is your own computer, and 8000 is a **port**, a number that tells apart the programs on one computer that accept connections; any free number from 1024 up will do. This server is for development only: it serves every file in the folder to anyone who can reach the port, and isn't built for real traffic. Stop it with Ctrl+C (01-06-02) when you're done, and `cd ../kit`.

```check
page blockfall/module-test.html "[typeof window.loadedSquares, document.getElementById('result').textContent].join(' | ')" "undefined | The module didn't load." -- Opened from disk, the browser refuses to load the module.
page blockfall/module-test.html "window.loadedSquares" 4 server=static errors=none -- Served over HTTP, the module loads.
page blockfall/index.html "typeof game + ' ' + game.board()[19]" "object 975" server=static errors=none -- Blockfall plays the same over HTTP.
```

**What else, and why not.**

| Way | Cost |
|---|---|
| One virtual environment per project, with `venv` and `pip`, as here | Built into Python; you manage the requirements file yourself |
| Tools that manage both, such as **uv** or Poetry | One command creates the environment, installs, and writes an exact lock file of every version; another tool to learn and install |
| Installing into the system's Python | No environments at all; every project shares, and breaks, the same packages. Many systems now refuse it |
| A container (module 8) | Isolates the whole system, not just Python; heavier, and its own skill |
| For the browser: a development server with live reload (such as Vite, which this app uses) | Reloads the page as you save; more to install, and Node.js. `http.server` needs nothing but Python |

## Your turn: the name you typed

`.venv/bin/kit-hexdump --help` prints `usage: hexdump.py [FILE|-] [FORMAT] [--json]`. That's wrong now: the user typed `kit-hexdump`, and the usage line should tell them what to type. Make the usage lines of `count`, `hexdump` and `tree` name the program the way it was run: `usage: count.py …` when run as `python count.py --help`, and `usage: kit-count …` when run as `kit-count --help`.

The change belongs in the shared `kitargs.py`. A program's own path is `sys.argv[0]` (01-01-02): measured on Windows, it's `count.py` for `python count.py` and `C:\…\kit\.venv\Scripts\kit-count` for the installed command, without `.exe`. There's no file to compare with; the checks run both forms.

```hints
nudge: Which part of each usage line is the program's name, and which part is the same however the program was run? Where would you compute the name, once, for all three tools?
concept: os.path.basename(sys.argv[0]) is the last part of the program's path: count.py, or kit-count. Let each tool's USAGE hold only what comes after the name ("[FILE|-] [ENCODING] [--json]"), and let help_if_asked print "usage:", the name, and the rest. Because the install is editable, the kit- commands pick up the change without reinstalling.
shape: In kitargs.py: import os; def program_name(): return os.path.basename(sys.argv[0]); help_if_asked prints print("usage:", program_name(), usage). In each tool: USAGE = "[FILE|-] [ENCODING] [--json]" (and the others) without "usage: count.py".
answer: In kitargs.py, import os at the top, and:
~~~python
# The name the program was run by: count.py, or kit-count when it's run as
# an installed command. sys.argv[0] is the path it was started from.
def program_name():
    return os.path.basename(sys.argv[0])


# If --help is among the arguments, print the usage line and stop. Asking
# for help isn't a mistake, so it goes to standard output, with status 0.
# usage is what follows the program's name: "[FILE|-] [--json]".
def help_if_asked(args, usage):
    if "--help" in args:
        print("usage:", program_name(), usage)
        sys.exit(0)
~~~
In the tools:
~~~python
USAGE = "[FILE|-] [ENCODING] [--json]"
~~~
~~~python
USAGE = "[FILE|-] [FORMAT] [--json]"
~~~
~~~python
USAGE = "[FOLDER]"
~~~
The tempting slip is sys.argv[0] without basename, which prints the whole path of the launcher in every usage line. Another is to keep "usage: count.py" in USAGE and add the name in front, which prints both. filter.py's usage error still says filter.py: it builds its message itself, with sys.exit; making it use program_name() too is a one-line change.
```

```check
run "cd kit; .venv/Scripts/kit-hexdump --help" stdout="usage: kit-hexdump [FILE|-] [FORMAT] [--json]" -- Run as an installed command, the usage line should name the command.
run "cd kit; .venv/Scripts/kit-count --help" stdout="usage: kit-count [FILE|-] [ENCODING] [--json]" -- kit-count too.
run "cd kit; .venv/Scripts/python count.py --help" stdout="usage: count.py [FILE|-] [ENCODING] [--json]" -- Run as a script, it should still name the script.
run "cd kit; .venv/Scripts/kit-tree --help" stdout="usage: kit-tree [FOLDER]" without="tree.py" -- Each usage line should name the program once.
run "cd kit; .venv/Scripts/ruff check kitargs.py count.py hexdump.py tree.py" stdout="All checks passed!" -- The changed files should still pass the linter.
```

**What these checks establish, and what they don't.** They run three tools both as installed commands and as scripts, check each usage line names exactly one program, and lint the files you changed. They don't check `filter.py`, whose usage error you didn't touch (unless you did), or the tools run as `python -m count`, where `sys.argv[0]` is the module's full path: try it and see what the name becomes. And they don't check `requirements.txt`: if you saved one, read it, and ask what someone would need besides it to rebuild Kit's environment (the answer is Kit itself, `pip install -e .`, and a Python at least as new as `requires-python`).

## What you can do now

- A **package** is installable software with a name, a version and its needs; **pip** installs packages from **PyPI** into an environment's **site-packages**, and puts any commands in `Scripts` or `bin`. `pip show`, `pip list` and `pip freeze` say what's there.
- Pin versions (`ruff==0.17.5`) and record them (`requirements.txt`), so that an environment can be rebuilt exactly.
- A **virtual environment** keeps each project's packages separate. Activating it only changes `PATH`; you can always name its Python instead. Environments are disposable: delete and rebuild.
- `pyproject.toml`'s `[project]` and `[project.scripts]` make a project installable, with commands that call its `main` functions. `pip install -e .` installs it **editable**, so the commands run the current code.
- Browsers load ES modules only from a **web server**: `python -m http.server PORT` serves a folder at `http://localhost:PORT/`, for development.

```predict
question: A colleague's project works on their laptop and fails on yours with ModuleNotFoundError: No module named 'requests'. They say "just pip install requests". What's the better fix, and why?
explain: The project should say what it needs, so that nobody has to guess: a requirements.txt (or dependencies in pyproject.toml) with requests and its version, and you install from that into the project's own virtual environment. "Just pip install it" works once, then the next missing package appears, versions differ from theirs, and if you install into your system Python, other projects change too. The error is a missing recipe, not a missing package.
```

**Next:** 01-06-06 finishes the module by putting commands together safely. A shell script runs all of Kit's checks in one go; and the lesson covers SSH, backups before risky operations, working with the least access you need, and recognising destructive commands and install scripts you shouldn't trust.
