---
title: 0.2 — How the Shell Finds Programs
runtime: none
---

When you typed `python`, the shell found Python. When you typed `pyhton`, it didn't. This lesson is about how that search works, because "command not found" is one of the most common problems in a developer's day, and every tool you install in this series (Node, Git, .NET) depends on it.

You'll also meet **environment variables**: settings that every program you start can read. Your Python scripts can read them too, and later in the series your server will read its secrets from them.

## Where is python?

Programs are files. `python` is a file called `python.exe` somewhere on your disk. Ask PowerShell which file it runs:

```powershell
(Get-Command python).Source
```

```text
PS C:\Users\you\Documents\spreadsheet> (Get-Command python).Source
C:\Users\you\AppData\Local\Microsoft\WindowsApps\python.exe
```

Yours may be somewhere else, depending on how Python was installed. `Get-Command` looks a command up without running it, and `.Source` asks for the file it found.

(On macOS: `which python3`. On a Mac, Python is usually `python3`, not `python`.)

## PATH: the list of places to look

The shell doesn't search your whole disk. It looks in a short list of folders, in order, and runs the first matching program it finds. That list is called **PATH**.

```powershell
$env:Path -split ';'
```

PATH is stored as one long piece of text with the folders separated by `;`. `-split ';'` cuts it at each `;` so you get one folder per line. Part of the output looks like this (yours will be different):

```text
C:\Windows\system32
C:\Windows
C:\Windows\System32\WindowsPowerShell\v1.0
C:\Program Files\Git\cmd
C:\Program Files\dotnet
C:\Users\you\AppData\Local\Microsoft\WindowsApps
```

Find the folder from the previous step (the one holding `python.exe`). It's in the list, which is why `python` works. `pyhton` failed because no folder in the list has a `pyhton.exe`.

This is what *installing a command-line tool* means: the installer copies the program somewhere and adds that folder to PATH. When a tutorial says a tool "isn't on your PATH", it means the program exists but its folder isn't in this list.

## Environment variables

PATH is one **environment variable**: a named piece of text that the shell keeps and hands to every program it starts. There are many others. Try one:

```powershell
$env:USERNAME
```

```text
PS C:\Users\you\Documents\spreadsheet> $env:USERNAME
you
```

In PowerShell, `$env:` followed by a name reads that environment variable. (On macOS it's `$` followed by the name: `echo $USER`.)

Programs read these too. Your Python scripts can, with `os.environ`. This step has opened a new file, `greet.py`, in the editor. It doesn't exist on disk yet; it appears (and shows up in the file tree) as soon as you start typing. Type this into it:

```python file=greet.py
import os

name = os.environ.get("GREETING_NAME", "stranger")
print("Hello,", name)
```

### What it does

`os.environ` is a dictionary of the environment variables Python was given. `.get("GREETING_NAME", "stranger")` reads the variable `GREETING_NAME`, or gives `"stranger"` if there isn't one, exactly like `.get` on any Python dictionary.

The editor saves as you type: there's no Save button to remember, and the file on disk is always what you see.

```check
file greet.py -- Type the code into greet.py in the editor; the file is created when you start typing.
contains greet.py "os.environ.get(\"GREETING_NAME\"" -- Type the code into greet.py exactly as shown.
run "python greet.py" stdout="Hello, stranger" os=windows
run "python3 greet.py" stdout="Hello, stranger" os=mac
run "python3 greet.py" stdout="Hello, stranger" os=linux
```

## Set a variable, then run the script

Run the script, set a variable, and run it again:

```powershell
python greet.py
$env:GREETING_NAME = "Ada"
python greet.py
```

```text
PS C:\Users\you\Documents\spreadsheet> python greet.py
Hello, stranger
PS C:\Users\you\Documents\spreadsheet> $env:GREETING_NAME = "Ada"
PS C:\Users\you\Documents\spreadsheet> python greet.py
Hello, Ada
```

The script didn't change, but its output did, because Python received a different environment. (On macOS: `export GREETING_NAME="Ada"`, then `python3 greet.py`.)

A variable set this way lives in this terminal's shell. Before you press **Restart** above the terminal, which starts a new shell, predict:

```predict
question: You set `GREETING_NAME` to `Ada` in this terminal. After **Restart**, what does `python greet.py` print?
choice: Hello, Ada
choice: Hello, stranger
choice: An error, because the variable was deleted
answer: Hello, stranger
explain: Each new shell starts with a fresh copy of the environment it was given when it started. `$env:GREETING_NAME = "Ada"` changed only the old shell's copy, which ended with it. The script's `.get(..., "stranger")` then supplies the default, so there's no error.
verify: python greet.py
```

Press **Restart** and run `python greet.py` again: it's back to `Hello, stranger`.

That's also why, after you install a new tool, an old terminal can't find it: it's still using the PATH it was given when it started. Opening a new terminal (here: **Restart**) fixes it. You'll need that in the next lesson.

```check
run "$env:GREETING_NAME = 'Ada'; python greet.py" stdout="Hello, Ada" os=windows label="greet.py reads GREETING_NAME"
run "GREETING_NAME=Ada python3 greet.py" stdout="Hello, Ada" os=mac label="greet.py reads GREETING_NAME"
run "GREETING_NAME=Ada python3 greet.py" stdout="Hello, Ada" os=linux label="greet.py reads GREETING_NAME"
```

## Why programs use environment variables

Later in this series your server will need a secret: a key for signing links that only the server should know. You'll never write that secret into a source file, because source files get shared and pushed to GitHub. The server will read it from an environment variable, set on the computer it runs on.

The same script, configured from outside without editing it: that's what environment variables are for.

## Your turn: a script configured from outside

Write `playground/shout.py`. It reads an environment variable called `SHOUT_TEXT` and prints it in capital letters. When `SHOUT_TEXT` isn't set, it prints `NOTHING TO SHOUT`.

Try it both ways in the terminal: once as it is, and once after setting `$env:SHOUT_TEXT = "hello"`.

```check
file playground/shout.py -- Create shout.py inside the playground folder (+ button above the file tree, or type the path).
run "python playground/shout.py" stdout="NOTHING TO SHOUT" os=windows label="with SHOUT_TEXT unset, it prints NOTHING TO SHOUT"
run "python3 playground/shout.py" stdout="NOTHING TO SHOUT" os=mac label="with SHOUT_TEXT unset, it prints NOTHING TO SHOUT"
run "python3 playground/shout.py" stdout="NOTHING TO SHOUT" os=linux label="with SHOUT_TEXT unset, it prints NOTHING TO SHOUT"
run "$env:SHOUT_TEXT = 'hello'; python playground/shout.py" stdout="HELLO" os=windows label="with SHOUT_TEXT=hello, it prints HELLO"
run "SHOUT_TEXT=hello python3 playground/shout.py" stdout="HELLO" os=mac label="with SHOUT_TEXT=hello, it prints HELLO"
run "SHOUT_TEXT=hello python3 playground/shout.py" stdout="HELLO" os=linux label="with SHOUT_TEXT=hello, it prints HELLO"
```

The checks try one word. Try a sentence of your own too: `$env:SHOUT_TEXT = "build it, then break it"`.

```hints
nudge: `greet.py` already reads a variable with a default. Start from what it does.
concept: Python strings have `.upper()`, which gives a capital-letter copy: `"hello".upper()` is `"HELLO"`. The default in `.get(name, default)` is used exactly when the variable isn't set.
shape: One line reads the variable, giving the default text when it's missing. One line prints that value in capitals. (If the default is already in capitals, `.upper()` leaves it alone.)
answer: ~~~python
import os

text = os.environ.get("SHOUT_TEXT", "nothing to shout")
print(text.upper())
~~~
```
