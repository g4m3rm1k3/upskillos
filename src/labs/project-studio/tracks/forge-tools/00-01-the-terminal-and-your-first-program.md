---
title: 0.1 — The Terminal and Your First Program
track: Forge — Tools of the Trade
trackOrder: 30
runtime: python
run: hello.py
---

This is the first lesson of **Forge**, a series that takes you from writing Python scripts to engineering real software. Along the way you'll build a game engine shaped like Godot, an editor for it, an online library for sharing games, and machine learning that plays them. Forge is the vehicle, not the subject. Every chapter teaches something you'd use in a completely different project: how to structure code so it stays changeable, how to test it, how to store data, how to find bugs methodically, how to work in steps you can ship, and how to direct other people (or an AI) to build parts of it.

**What you need:** basic Python. Variables, `if`, `for` and `while`, writing and calling functions, lists and dictionaries, `print`, and running a `.py` file. Everything else is taught when the project first needs it, starting with the terminal in this lesson.

### How every lesson works

Each step works at three levels, and the lesson labels them:

- **Build**: what you're making in this step.
- **Understand**: what the computer is actually doing. Not just what the code is for, but the mechanism, usually traced with real values.
- **Engineer**: the general principle the step exposes, which you'd apply far beyond this project.

**New words** get their precise definition first, in the words other engineers use, so you can search for them and read documentation. Sometimes a comparison follows, marked *Picture it as*. It's there to help the definition stick, never to replace it, and it says where it stops matching the real thing.

**Predict before you look.** Some steps ask you to commit to an answer before the explanation appears. Wrong predictions are the useful ones: they show exactly which part of your mental model needs fixing.

**Your turn.** Every lesson has at least one step with no code shown, only a description of what the program must do, and checks that run your program. This is where the learning happens, so give it a real try before taking a hint. The hints come one at a time, each giving away a little more, so you take only as much help as you need. **Challenges** are optional and harder. Skipping one never blocks the series.

**Check my work** runs real checks against the real files in your project folder. **Next step** is never locked, so you can always move on and come back.

## Make the project folder

**Build:** a folder on your disk that will hold everything this series makes.

1. Click **Choose folder…** in the middle of this window.
2. In the window that opens, go to your **Documents** folder.
3. Click **New folder**, name it `forge`, and press Enter.
4. Select the new `forge` folder and click **Select Folder**.

**Understand.** Every file and folder on a disk has an address called its **path**: the list of folders you pass through to reach it, starting from the top of the drive. Yours looks like this, with your own user name in it:

```text
C:\Users\you\Documents\forge
```

Read it left to right: the drive `C:`, then the folder `Users` on it, then your user's folder inside that, then `Documents`, then `forge`. Each `\` means "go inside". (On macOS and Linux the separator is `/`, and paths start with `/`, like `/Users/you/Documents/forge`.)

The folder belongs to you, not to this app. Open it in File Explorer and you'll see the same files the file tree on the left shows. It stays when you close the app.

> **Engineer:** a software project is a folder. Everything the project needs to build and run should live inside it or be written down inside it, so that someone else, given only the folder, can do what you do. You'll make that true step by step over this chapter.

## Meet the terminal

**Build:** run your first command.

The panel at the bottom of this window is a **terminal**.

> **Terminal**: a window that sends what you type to a program and shows what that program prints. **Shell**: the program a terminal usually runs, whose job is to run *other* programs when you type their names.
>
> *Picture it as* a conversation by text message with the operating system's program launcher. You send a line, it does the work and replies, then waits. The picture breaks in one way that matters: the shell doesn't understand requests, it only runs programs by name, exactly as typed.

On Windows the shell here is **PowerShell**. (On macOS it's **zsh**. Where the two differ, the lesson says so.) The text at the start of the line is the **prompt**:

```text
PS C:\Users\you\Documents\forge>
```

`PS` means PowerShell, and the path is the shell's **current directory**: the folder that commands act on unless you name another one. It starts as your project folder.

Click in the terminal, type this, and press **Enter**:

```powershell
pwd
```

```text
Path
----
C:\Users\you\Documents\forge
```

**Understand.** `pwd` stands for "print working directory". (*Working directory* and *current directory* mean the same thing, and *directory* is another word for folder.) The shell printed its current directory, then showed a new prompt. The new prompt is how a shell says "that command has finished; I'm waiting for the next one."

The current directory is a setting **of the running shell**, not of your computer. Open a second terminal and it has a current directory of its own. Every program the shell starts is given a copy of it, which matters in a moment.

> **Engineer:** programs keep **state**: values they remember between one action and the next. The shell's current directory is state. State is why the same command (`ls`, or `python game.py`) can do different things at different times, and it's the first thing to check when something "works on my machine" but not on another.

## Look and move

**Build:** make a folder from the terminal and move in and out of it.

Type these one at a time, pressing Enter after each:

```powershell
ls
mkdir scratch
ls
```

The first `ls` prints nothing, because the folder is empty. `mkdir scratch` makes a folder (`mkdir` means "make directory") and PowerShell describes what it made; a `Mode` starting with `d` means a directory. The second `ls` lists it. Look at the file tree on the left: `scratch` is there too. The terminal and the file tree look at the same real folder.

Now move:

```powershell
cd scratch
pwd
cd ..
pwd
```

```text
PS C:\Users\you\Documents\forge> cd scratch
PS C:\Users\you\Documents\forge\scratch> pwd

Path
----
C:\Users\you\Documents\forge\scratch

PS C:\Users\you\Documents\forge\scratch> cd ..
PS C:\Users\you\Documents\forge> pwd

Path
----
C:\Users\you\Documents\forge
```

**Understand.** `cd` means "change directory": it changes the shell's current directory, which is why the prompt changes. `..` always means "the folder this one is inside" (its **parent**), so `cd ..` goes up one level.

There are two kinds of path:

- An **absolute path** starts from the top of the drive: `C:\Users\you\Documents\forge\scratch`. It names the same folder wherever you are.
- A **relative path** is looked up starting from the current directory: `scratch` means "the `scratch` inside wherever I am now". From a different current directory it means a different folder, or nothing at all.

Traced, with the current directory at each point:

```text
command        current directory before       "scratch" means
cd scratch     C:\Users\you\Documents\forge   C:\Users\you\Documents\forge\scratch
cd ..          ...\forge\scratch              (not used; .. means ...\forge)
```

In PowerShell, `ls`, `pwd` and `cd` are short nicknames (**aliases**) for commands named `Get-ChildItem`, `Get-Location` and `Set-Location`. The short names are the ones macOS and Linux use, so the same habits work everywhere.

> **Engineer:** a relative path is a **hidden input**. `open("level1.txt")` in Python is relative, so it depends on the current directory of whoever ran the program, which the code can't see by reading it. That's the cause of the classic bug "the file is right there, but Python says it doesn't exist": the script was run from a different folder. In Chapter 5 your game will load its files in a way that doesn't depend on where it was run from.

```check
dir scratch -- Type mkdir scratch in the terminal (in the forge folder) and press Enter.
```

## Delete from the terminal

**Build:** remove the scratch folder.

```powershell
Remove-Item scratch
```

It prints nothing when it works. (Its alias is `rm`.) Check with `ls`, or look at the file tree.

**Understand.** Deleting from the terminal **skips the Recycle Bin**: there's no undo. If the folder still had files in it, PowerShell would stop and ask first, and the default answer to its question is *Yes*. Read the question before pressing Enter.

Two habits that save a lot of typing: **↑** brings back the previous command, and **Tab** finishes a file or folder name you've started typing.

> **Engineer:** commands that can't be undone deserve a pause. Later in this chapter git will give you an undo for your files, and that's a large part of why engineers use it.

```check
missing scratch -- Type Remove-Item scratch in the terminal and press Enter.
```

## Which Python runs?

**Build:** find out which Python the shell runs when you type `python`.

Type this, misspelled on purpose:

```predict
question: What will the shell do with `pyhton --version`?
choice: Guess that you meant python, and run it
choice: Report that it can't find a program called pyhton
choice: Run nothing and print nothing
answer: Report that it can't find a program called pyhton
explain: A shell doesn't guess. It looks for a program whose name is exactly the word you typed, and there isn't one called `pyhton`, so it reports an error. The first line says it: *The term 'pyhton' is not recognized*. The `+ ~~~~~~` line underlines the part it couldn't find. The remaining lines are details meant for other programs, and you can usually skip them.
```

```powershell
pyhton --version
```

Now spell it correctly, then ask the shell where it found it:

```powershell
python --version
(Get-Command python).Source
```

```text
Python 3.14.3
C:\Python314\python.exe
```

Your version and location may differ. This series needs **Python 3.12 or newer**.

If the shell says `python` isn't recognized, or opens the Microsoft Store, install Python from [python.org](https://www.python.org/downloads/). In the installer, tick **Add python.exe to PATH**. Then close and reopen this window, so the terminal starts fresh and sees it.

**Understand: how the shell finds a program.** When you type a name like `python`, the shell has to turn it into a file to run. It reads an **environment variable** named `PATH`.

> **Environment variable**: a named piece of text that every running program carries, copied from the program that started it. **`PATH`**: an environment variable holding a list of folders, separated by `;` on Windows (`:` on macOS and Linux), where the shell looks for programs.

See the list:

```powershell
$env:PATH -split ";"
```

The shell searches those folders **in order**, and the **first** `python.exe` it finds is the one that runs. `Get-Command` does the same search and tells you which file won. Traced, with a shortened `PATH`:

```text
PATH folder                                  python.exe here?
C:\Windows\system32                          no
C:\Python314                                 yes  → this one runs; the search stops
C:\Users\you\AppData\Local\Microsoft\...     (never looked at)
```

That's the whole mechanism behind "the Microsoft Store opens when I type python": Windows puts a folder containing a small `python.exe` that opens the Store on `PATH`, and if that folder comes before your real Python, it wins.

> **Engineer:** when two things share a name, *which one runs* is decided by a lookup order. You'll meet the same rule again for Python's `import` (Chapter 4) and for which Python a project uses (next lesson). When the wrong version of something runs, ask "what's the lookup order, and what's first in it?"

```check
run "python -c \"import sys; assert sys.version_info >= (3, 12), sys.version\"" label="Python 3.12 or newer runs from the terminal" -- Install Python 3.12 or newer from python.org and tick "Add python.exe to PATH", then close and reopen this window.
```

## Your first program, from the terminal

**Build:** a Python program you run by typing a command.

Create `hello.py` in the project folder (right-click in the file tree, or **New file**) and type:

```python file=hello.py
import sys

print("Hello from Forge!")
print("Arguments:", sys.argv)
```

Run it from the terminal:

```powershell
python hello.py
```

```text
Hello from Forge!
Arguments: ['hello.py']
```

**Understand: what happens when you press Enter.** Five things, in order:

1. **The shell splits the line into words**, at spaces: `python` and `hello.py`.
2. **It finds the program** named by the first word, by the `PATH` search above.
3. **It starts a process.** A **process** is a running copy of a program, with its own memory, its own copy of the environment variables, and its own current directory, copied from the shell. The shell hands it the list of words.
4. **Python runs the file.** It treats its first word after `python` as a file name, reads `hello.py` from the current directory (a relative path!), translates it into instructions for Python's own interpreter, called **bytecode**, and runs them top to bottom. `print` writes text to the process's **standard output**, a channel the terminal is listening to, so the text appears.
5. **The process ends**, and the shell prints a new prompt.

The **Run hello.py** button above the editor does the same five things, with the project folder as the current directory.

**`sys.argv`** is the list of words Python was given, with `python` itself removed: the script's name first, then anything after it. These extra words are called **command-line arguments**, and they're how you give a program input when you start it.

```predict
question: How many items will `sys.argv` have for `python hello.py ball paddle "two words"`?
answer: 4
explain: The shell splits at spaces, except inside quotes, so `"two words"` is one word, and the quotes are removed. Python drops `python` itself:

~~~text
Arguments: ['hello.py', 'ball', 'paddle', 'two words']
~~~

Four items: the script's name and three arguments. Quotes are how you pass a value containing a space.
verify: python -c "import sys; print(len(sys.argv))" ball paddle "two words"
```

Run it to see:

```powershell
python hello.py ball paddle "two words"
```

> **Engineer:** a command-line program has a small, fixed **interface**: words go in (arguments), text comes out (standard output), and one more thing comes out when it ends, which is the next step. Every tool you'll use in this series (pip, pytest, git, the type checker) is a program with exactly this interface, and so is anything you build that other programs run.

```check
run "python hello.py" stdout="Hello from Forge!" label="python hello.py prints its greeting" -- Save hello.py in the forge folder, then run it yourself with python hello.py.
run "python hello.py ball" stdout="'ball'" label="hello.py prints its arguments"
```

## How a program says it worked

**Build:** see the number every program hands back when it ends.

When a process ends, it gives the shell one whole number, its **exit code**.

> **Exit code**: the number a process returns when it ends. **0 means success.** Any other number means failure, and programs document what their non-zero codes mean.

PowerShell keeps the last program's exit code in a variable named `LASTEXITCODE`. Run `hello.py` again, then look at it:

```powershell
python hello.py
$LASTEXITCODE
```

It prints `0`. Now a program that fails. Create `oops.py`:

```python file=oops.py
print("before")
x = 1 / 0
print("after")
```

```predict
question: After `python oops.py`, what will `$LASTEXITCODE` show?
answer: 1
explain: Dividing by zero **raises an exception**: Python stops running the program at that line, so `after` is never printed. Nothing in the program handles the exception, so Python prints a **traceback** (where it happened, and what went wrong) and ends the process with exit code 1. Lesson 0.3 reads tracebacks properly.
verify: python -c "import subprocess, sys; print(subprocess.run([sys.executable, 'oops.py'], capture_output=True).returncode)"
```

```powershell
python oops.py
$LASTEXITCODE
```

```text
before
Traceback (most recent call last):
  File "C:\Users\you\Documents\forge\oops.py", line 2, in <module>
    x = 1 / 0
        ~~^~~
ZeroDivisionError: division by zero
1
```

A program can also choose its exit code. `sys.exit(n)` ends the program right there, with exit code `n`. `-c` tells Python to run the text that follows as a program, which is handy for one-liners:

```powershell
python -c "import sys; print('quitting'); sys.exit(3)"
$LASTEXITCODE
```

```text
quitting
3
```

**Understand.** The exit code isn't printed by the program: it's handed to the shell by the operating system when the process ends, and the shell stores it. A program that ends normally, by running off the bottom of the file, exits with 0.

> **Engineer:** exit codes are how programs judge each other without a human reading the output. **Check my work** decides pass or fail from them. pytest exits with 1 when a test fails. A build server stops a release when any step exits with non-zero. So a program that fails *must* exit non-zero, or every tool around it will believe it worked. In C# the same number is what `Main` returns or `Environment.Exit(3)` sets; in Java it's `System.exit(3)`.

```check
run "python oops.py" exit=1 stderr="ZeroDivisionError" label="oops.py fails with exit code 1 and a ZeroDivisionError" -- oops.py must divide by zero on line 2, as shown.
```

## Your turn: a greeting with a usage message

**Build, on your own:** a program `greet.py` that greets the name it's given.

No code is given for this step. Everything it needs is in this lesson.

| Command | Prints | Exit code |
|---|---|---|
| `python greet.py Ada` | `Hello, Ada!` | 0 |
| `python greet.py` | `usage: python greet.py NAME` | 2 |
| `python greet.py Ada Grace` | `usage: python greet.py NAME` | 2 |

Exit code 2 is a convention many command-line programs follow for "you used me wrong" (Python's own `argparse` does), which keeps it apart from 1, "something went wrong while working".

Try it for about 10 minutes before taking a hint. Run each command yourself and look at `$LASTEXITCODE`, then press **Check my work**.

```hints
nudge: Run `python hello.py`, then `python hello.py Ada`, then `python hello.py Ada Grace`, and compare the lists it prints. Which list has exactly the shape a correct `greet.py` call has?
concept: A correct call has exactly two items in `sys.argv`: the script's name and one name. `len(sys.argv)` counts them. Anything else is a wrong call, and `sys.exit(2)` ends the program with the code the table asks for.
shape: Check for the wrong case first: if the length isn't 2, print the usage line and exit with 2. After that check, the program only continues when there's exactly one name, at index 1, so greet it.
answer: ~~~python
import sys

if len(sys.argv) != 2:
    print("usage: python greet.py NAME")
    sys.exit(2)

name = sys.argv[1]
print(f"Hello, {name}!")
~~~

Checking for the wrong input first, and leaving early, is called a **guard clause**. Everything after it can assume the input is valid, so the main work isn't buried inside an `if`. `sys.argv[1]` is the first word after the script's name. Running off the end of the file exits with 0.
```

```check
run "python greet.py Ada" stdout="Hello, Ada!" label="python greet.py Ada prints Hello, Ada!" -- sys.argv[1] is the first word after the script's name.
run "python greet.py" exit=2 stdout="usage: python greet.py NAME" label="with no name, it prints the usage line and exits with 2" -- Check len(sys.argv) before using sys.argv[1], then call sys.exit(2).
run "python greet.py Ada Grace" exit=2 stdout="usage: python greet.py NAME" label="with two names, it prints the usage line and exits with 2"
```

## Challenge: greet everyone

**Optional, ★★.** Make a new program, `greet_all.py`, that greets any number of names, written the way a person would:

| Command | Prints | Exit code |
|---|---|---|
| `python greet_all.py Ada` | `Hello, Ada!` | 0 |
| `python greet_all.py Ada Grace` | `Hello, Ada and Grace!` | 0 |
| `python greet_all.py Ada Grace Linus` | `Hello, Ada, Grace and Linus!` | 0 |
| `python greet_all.py` | `usage: python greet_all.py NAME...` | 2 |

The `...` in the usage line is a convention meaning "one or more". The hard part is the commas: work out the rule from the three examples before writing any code, and check it works for five names too.

```check
run "python greet_all.py Ada" stdout="Hello, Ada!" label="one name"
run "python greet_all.py Ada Grace" stdout="Hello, Ada and Grace!" label="two names, joined with and"
run "python greet_all.py Ada Grace Linus" stdout="Hello, Ada, Grace and Linus!" label="three names, commas then and"
run "python greet_all.py Ada Grace Linus Barbara Edsger" stdout="Hello, Ada, Grace, Linus, Barbara and Edsger!" label="five names"
run "python greet_all.py" exit=2 stdout="usage: python greet_all.py NAME..." label="no names: usage and exit code 2"
```

## What did we actually learn?

Not the commands: the ideas under them, which you'll use in every project.

- **A shell is a program that runs programs.** It knows nothing about Python or games. It splits a line into words, finds the program named by the first one, and starts it.
- **A running program is a process**, with its own memory, environment variables and current directory, copied from whatever started it. That copying is why a change in one terminal doesn't affect another.
- **Lookup order decides which thing with a name runs.** `PATH` for programs; later, Python's import path for modules and a project's own Python for packages.
- **Relative paths are hidden inputs.** They depend on the current directory, which the code can't see.
- **Every command-line program has the same interface**: arguments in; standard output and an exit code out. Exit code 0 means success. This is how programs are tested, chained together and judged by other programs, including the checks in this series.

The same interface exists in every language. In C#, `static int Main(string[] args)` receives the arguments and returns the exit code; in Java, `public static void main(String[] args)` receives them and `System.exit` sets the code. `sys.argv` and `sys.exit` are Python's version of the same contract.

The next lesson gives this project a Python of its own, with exactly the packages it needs, so that it works the same on any machine.
