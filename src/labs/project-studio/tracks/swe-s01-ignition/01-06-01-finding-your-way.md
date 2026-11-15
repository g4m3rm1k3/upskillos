---
title: Finding Your Way: Folders, Paths, Permissions and Help
runtime: python
---

Since the first lesson you've typed `cd kit` and `.venv/bin/python count.py samples/hello.txt` without anyone explaining what those words do to the computer. They work, as long as you're in the right folder. Run the same command one folder up, and `samples/hello.txt` doesn't exist. This lesson starts module 1.6, on the tools around your code, with the one every other tool runs inside: the **shell**, the program in your terminal that reads commands and runs them. It explains the idea that makes "the right folder" matter, how paths are written and looked up, who may read and change a file, and how to ask any command how to use it, which Kit's own tools can't yet answer.

**By the end you can:**

- Say what a program's working folder is, and predict where a relative path leads from it.
- Move around and make, copy and move files from a terminal, in PowerShell on Windows and in zsh or bash on macOS and Linux.
- Read Unix permissions (`rwxr-xr-x`), relate them to 01-03-02's permission bits, and say what Windows does instead.
- Find and read a command's usage line, and give Kit's tools a `--help` that follows the conventions.

**You need:** Kit as module 1.5 left it, including `kitargs.py` (01-05-01) and `tree.py` (01-05-02). Commands run inside `kit` unless a step says otherwise.

## Where am I?

Every running program has a **working folder** (also called the current directory). It's where the program was started from, not where its file is. Any path that doesn't start from the top of the file system, such as `samples/hello.txt`, is a **relative path**: it's looked up starting from the working folder. A path that does start from the top, such as `C:\Users\you\swe\kit\samples\hello.txt` on Windows or `/Users/you/swe/kit/samples/hello.txt` on macOS, is an **absolute path**, and means the same file from anywhere.

This script asks both questions: where am I working, and where is this script? `os.getcwd()` is the working folder ("get current working directory"); `__file__` is the path of the script being run; `os.path.abspath(path)` turns any path into an absolute one, by looking it up from the working folder.

```python file=kit/where.py
import os

# Where am I? Two different questions, with two different answers.
print("working folder:", os.getcwd())
print("this script:   ", os.path.abspath(__file__))

# A relative path is looked up from the working folder, not from the script.
name = "samples/hello.txt"
print(name, "found:", os.path.exists(name), "->", os.path.abspath(name))
```

Save it and run it from `kit`, as usual: `.venv/bin/python where.py` (Windows: `.venv\Scripts\python where.py`). It prints three absolute paths, which differ from machine to machine. On one Windows machine:

```
working folder: C:\Users\…\swe\kit
this script:    C:\Users\…\swe\kit\where.py
samples/hello.txt found: True -> C:\Users\…\swe\kit\samples\hello.txt
```

```predict
question: Now cd samples and run the same script from there, as ../.venv/bin/python ../where.py. Will it find samples/hello.txt?
choice: Yes: the script is in kit, and samples is in kit
choice: No: the path is looked up from the new working folder
answer: No: the path is looked up from the new working folder
explain: The script hasn't moved, but the working folder has: it's now kit/samples. The relative path samples/hello.txt is looked up from there, as kit/samples/samples/hello.txt, which doesn't exist. A relative path in a program means "from wherever the program was started", which is why every command in this course says to run it inside kit.
```

Try it: `cd samples`, then `../.venv/bin/python ../where.py` (Windows: `..\.venv\Scripts\python ..\where.py`). The working folder line ends in `samples`, the script's line is unchanged, and the last line says `found: False`, pointing at a `samples` folder inside `samples`. `..` means "the folder above", so `../where.py` is `where.py` one level up. Go back with `cd ..`.

Programs that must find their own files, wherever they're run from, build the path from `__file__` instead of the working folder: `os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", "hello.txt")`. Kit's tools take paths from the user, and those should be relative to where the user is, so they rightly use the working folder.

```check
run "cd kit; .venv/Scripts/python where.py" stdout="samples/hello.txt found: True" -- Run from kit, the relative path samples/hello.txt leads to the file.
run "cd kit; .venv/Scripts/python -c \"import os, runpy; os.chdir('samples'); runpy.run_path('../where.py')\"" stdout="samples/hello.txt found: False" -- Run from kit/samples, the same relative path leads nowhere.
```

## Moving around

The commands you need every day, in the shells you're likely to have. PowerShell (on Windows, and the app's terminal there) provides the Unix names as **aliases**, short names for its own longer commands, so most of these work everywhere:

| What | PowerShell (Windows) | zsh or bash (macOS, Linux) |
|---|---|---|
| Show the working folder | `pwd` (`Get-Location`) | `pwd` |
| Go into a folder | `cd samples` | `cd samples` |
| Go up one level | `cd ..` | `cd ..` |
| Go to your home folder | `cd ~` | `cd ~`, or just `cd` |
| List a folder | `ls` (`Get-ChildItem`) | `ls`, and `ls -l` for details |
| Make a folder | `mkdir notes` | `mkdir notes` |
| Copy a file | `cp samples/hello.txt notes/` | `cp samples/hello.txt notes/` |
| Move or rename | `mv old.txt new.txt` | `mv old.txt new.txt` |
| Show a text file | `cat notes.txt` | `cat notes.txt` |
| Delete a file | `rm notes.txt` | `rm notes.txt` |

Some rules that save time and mistakes:

- **`.` is the folder you're in, and `..` the one above it.** `cd ../blockfall` goes up and into `blockfall` in one step.
- **The aliases aren't the same commands.** PowerShell's `ls` is `Get-ChildItem`, which has its own options: `ls -l` fails in Windows PowerShell 5.1 with `Missing an argument for parameter 'LiteralPath'`, because `-l` is taken as the start of `-LiteralPath`. When an option from a tutorial fails, check which shell the tutorial was written for.
- **Separators.** Windows writes paths with `\`, Unix with `/`. PowerShell, and Python, accept `/` on Windows too, which is why this course writes `/` almost everywhere.
- **Spaces need quotes.** `cd My Documents` is two arguments; `cd "My Documents"` is one.
- **Press Tab.** Every one of these shells completes a half-typed file or folder name when you press Tab, which is faster than typing it and catches spelling mistakes before they happen.
- **`rm` doesn't ask and there's no bin.** A file deleted from a terminal is gone. 01-06-06 is about working safely; for now, read an `rm` command twice before pressing Enter.

Try it. Inside `kit`, make a folder for notes and copy a sample into it:

```
mkdir notes
cp samples/hello.txt notes/
ls notes
```

`ls notes` lists one file, `hello.txt`. Then go down and back up, and check where you are: `cd notes`, `cd ..`, `pwd`. You're in `kit` again.

```check
file kit/notes/hello.txt -- Make kit/notes with mkdir, and copy samples/hello.txt into it with cp.
run "cd kit; cd notes; cd ..; .venv/Scripts/python -c \"import os; print(os.path.basename(os.getcwd()))\"" stdout="kit" -- cd notes then cd .. should bring you back to kit.
```

## Who may do what

A file has an owner, and the system decides who may read it, change it, and run it. On macOS and Linux, `ls -l` shows the decision at the start of each line, as ten characters:

```
-rwxr-xr-x  1 you  staff  1234 Nov 14 09:00 count.py
```

The first character is the kind (`-` a file, `d` a folder). Then three groups of three: what the **owner** may do, what the file's **group** may do, and what **everyone else** may do. In each group, `r` is read, `w` is write and `x` is execute (for a folder, `x` means "may go into it"); `-` means not allowed. So `rwxr-xr-x` is: the owner may do anything, and everyone else may read and run it but not change it.

These are 01-03-02's permission bits. Each group is three bits, read as one octal digit: `rwx` is 4 + 2 + 1 = 7, `r-x` is 5, `r--` is 4. So `rwxr-xr-x` is `0o755`, and `rw-r--r--`, the usual for a file you made, is `0o644`. `chmod` changes them: `chmod 644 notes.txt` sets them exactly, and `chmod +x script.py` adds execute for everyone. A file with execute permission can be run by name (`./script.py`) if its first line, the **shebang**, says what runs it: `#!/usr/bin/env python3`.

Windows does it differently. It keeps a list of who may do what for each file (an access control list, changed with the `icacls` command or a file's Properties window), and one simple flag: **read-only**. It has no execute bit; whether a file runs is decided by its extension (`.exe`, `.ps1`). Python's `os.chmod` can still change that one flag on Windows. This script makes a file read-only, tries to write it, and gives write permission back. `os.stat(path).st_mode & 0o777` is the file's permission bits as Python sees them.

```python file=kit/readonly.py
import os

# Make a file, take away permission to write it, and try to write it.
with open("locked.txt", "w") as file:
    file.write("first version\n")
os.chmod("locked.txt", 0o444)
print("mode:", oct(os.stat("locked.txt").st_mode & 0o777))
try:
    with open("locked.txt", "w") as file:
        file.write("second version\n")
except PermissionError as error:
    print("refused:", error.strerror)

# Give write permission back, so the file can be changed or deleted again.
os.chmod("locked.txt", 0o644)
print("mode:", oct(os.stat("locked.txt").st_mode & 0o777))
```

```predict
question: The script sets the mode to 0o444 (read-only for everyone), then opens the file for writing. What happens?
choice: The write succeeds: you made the file, so you can always write it
choice: The write is refused with a PermissionError
choice: Python changes the mode back to let the write happen
answer: The write is refused with a PermissionError
explain: 0o444 is r--r--r--: nobody, the owner included, may write. Opening the file for writing asks the operating system for write access, and it says no, which Python raises as PermissionError. The owner can still change the permissions back (that's what owning it means), which is what the script does next. The same happens on Windows, where 0o444 sets the read-only flag.
```

Save it and run `.venv/bin/python readonly.py`. On Windows:

```
mode: 0o444
refused: Permission denied
mode: 0o666
```

On macOS or Linux the last line is `mode: 0o644`, exactly what the script set. On Windows it's `0o666`, because Windows keeps only the read-only flag, and Python reports it as `444` (read-only) or `666` (not). It can't store the difference between owner, group and others, since Windows doesn't work that way. Whichever system you're on, a "Permission denied" error means the same thing: the system refused, and the fix is permissions (or the right user), never "try again".

```check
run "cd kit; .venv/Scripts/python readonly.py" stdout="refused: Permission denied" -- A file without write permission can't be opened for writing, even by its owner.
run "cd kit; .venv/Scripts/python readonly.py" stdout="mode: 0o444" -- chmod 0o444 takes write permission away.
run "cd kit; .venv/Scripts/python readonly.py" stdout="mode: 0o6" -- Write permission should come back at the end (0o644, or 0o666 on Windows).
```

## Asking a command how to use it

Nobody remembers every option of every command. Every well-made command line program will tell you how to use it. By convention, `--help` (often also `-h`) prints a **usage line** and a list of options, then exits with status 0. Try `.venv/bin/python --help`. Its first line is:

```
usage: python [option] ... [-c cmd | -m mod | file | -] [arg] ...
```

(Python prints its own full path where this shows `python`.) Usage lines have a grammar:

- Words in plain text are typed as they are: `-c`.
- `[ … ]` is optional.
- `a | b` means one or the other.
- `...` means "more of the same, if you like".
- Capitals or `<angle brackets>` name something you supply: `FILE`, `<path>`.

So Python's line says: any number of options, then optionally one of `-c` with a command, `-m` with a module, a file, or `-` for standard input, then any arguments. That's every way you've run Python in this course.

`git --help` prints Git's usage, and `git status -h` the short usage of one Git command. For the full manual: `man ls` on macOS and Linux opens a command's **man page** (manual page; press `q` to leave it, `/word` to search). PowerShell's equivalent is `Get-Help Get-ChildItem`, which shows at least the syntax; `Get-Help` can download the full text with `Update-Help` (as administrator). The internet has the same pages; check that the one you're reading matches your version (01-07-01 is about that).

Now ask Kit. `filter.py` with no arguments prints a usage line: `usage: filter.py FILE [--all TERM ...] [--any TERM ...] [--none TERM ...]`, with status 1, because running it wrongly is an error. But `.venv/bin/python count.py --help` fails: `FileNotFoundError: [Errno 2] No such file or directory: '--help'`. `count` takes `--help` for the name of a file.

```check
run "cd kit; .venv/Scripts/python --help" stdout="[-c cmd | -m mod | file | -]" -- python --help prints a usage line: options, then a command, a module, a file or standard input.
run "cd kit; .venv/Scripts/python filter.py" exit=1 stderr="usage: filter.py FILE" -- Run with no arguments, filter.py prints its usage line as an error.
```

**What else, and why not.** Ways to get around and find out, and what each costs:

| Way | Cost |
|---|---|
| A file manager window (Explorer, Finder) | Easy to see; can't be repeated, scripted or done over a remote connection, and hides the working-folder idea that every program depends on |
| An editor's built-in terminal (as this app has) | The same shell, opened in your project folder; still the same commands |
| PowerShell's own names (`Set-Location`, `Get-ChildItem -Force`) | Precise and well documented; longer, and Windows-only knowledge |
| A Unix shell on Windows (Git Bash, or WSL, which runs Linux) | The same commands as macOS and Linux tutorials; a second set of paths to keep straight (`/c/Users/…`) |

## Your turn: help for Kit's tools

Give `count.py`, `hexdump.py` and `tree.py` a `--help` option, anywhere among their arguments, that prints one usage line to standard output and exits with status 0, doing nothing else:

- `usage: count.py [FILE|-] [ENCODING] [--json]`
- `usage: hexdump.py [FILE|-] [FORMAT] [--json]`
- `usage: tree.py [FOLDER]`

The handling must be written once, in `kitargs.py`, and used by all three. Without `--help`, each tool must behave exactly as before. There's no file to compare with; the checks run the tools.

```hints
nudge: What should happen, step by step, when --help is among the arguments, and at what point in main must the check come so that nothing else runs first? Then: why standard output and status 0, when filter.py's usage goes to standard error with status 1?
concept: A shared function in kitargs takes the arguments and the tool's usage line; if "--help" is among the arguments, it prints the usage and stops the program with sys.exit(0). Each tool calls it first thing in main, before take_flag or open_input can treat --help as a file name. Asking for help is a success, so it goes to standard output with status 0; filter's usage on no arguments is an error message, so it goes to standard error with status 1 (sys.exit("…") does both). tree.py doesn't import kitargs yet: it needs to now.
shape: kitargs.py: def help_if_asked(args, usage): if "--help" in args: print(usage); sys.exit(0). In each tool: USAGE = "usage: …" near the top, from kitargs import help_if_asked (with what it already imports), and help_if_asked(sys.argv[1:], USAGE) as the first line of main.
answer: At the end of kitargs.py:
~~~python
# If --help is among the arguments, print the usage line and stop. Asking
# for help isn't a mistake, so it goes to standard output, with status 0.
def help_if_asked(args, usage):
    if "--help" in args:
        print(usage)
        sys.exit(0)
~~~
In count.py, the import and a constant:
~~~python
from kitargs import help_if_asked, open_input, take_flag

USAGE = "usage: count.py [FILE|-] [ENCODING] [--json]"
~~~
and the first line of main:
~~~python
def main():
    help_if_asked(sys.argv[1:], USAGE)
~~~
hexdump.py the same, with its own USAGE. tree.py adds from kitargs import help_if_asked and USAGE = "usage: tree.py [FOLDER]" after its imports, and the same first line in main. The tempting slips: sys.exit(USAGE), which prints the line to standard error with status 1, treating a request for help as a mistake; printing the usage without stopping, so count then tries to read a file called --help; and putting the check after take_flag, which works only because take_flag leaves --help in place, by luck.
```

```check
run "cd kit; .venv/Scripts/python count.py --help" stdout="usage: count.py [FILE|-] [ENCODING] [--json]" -- count.py --help should print its usage line and exit with status 0.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt --help" stdout="usage: count.py" without="bytes:" -- --help anywhere should print the usage and do nothing else.
run "cd kit; .venv/Scripts/python hexdump.py --json --help" stdout="usage: hexdump.py [FILE|-] [FORMAT] [--json]" -- hexdump.py --help should print its usage line, whatever else is given.
run "cd kit; .venv/Scripts/python tree.py --help" stdout="usage: tree.py [FOLDER]" -- tree.py --help should print its usage line.
run "cd kit; .venv/Scripts/python -c \"import kitargs, count, hexdump, tree; print(count.help_if_asked is kitargs.help_if_asked, hexdump.help_if_asked is kitargs.help_if_asked, tree.help_if_asked is kitargs.help_if_asked)\"" stdout="True True True" -- The help handling should be written once, in kitargs, and imported by all three.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="bytes: 7" -- Without --help, count.py should work as before.
run "cd kit; .venv/Scripts/python tree.py sample_tree" stdout="            logo.txt" -- Without --help, tree.py should work as before.
```

**What these checks establish, and what they don't.** They run each tool with `--help`, in different positions and with other arguments, check that the three share one function, and check that `count` and `tree` still work without it. A `stdout=` check passes when the output *contains* the text, so a tool that printed its usage and then something more would pass all but the second check; the exit status is checked too (0 unless a check says otherwise). They don't check `hexdump`'s plain dump or `filter.py`, which you didn't change (or did you? giving it the same `--help` is a good test of the shared function). And they don't check that the usage lines are true: read each one and make sure it describes what the tool actually accepts.

## What you can do now

- Every program has a **working folder**, where it was started. **Relative paths** are looked up from there; **absolute paths** from the top of the file system. A script's own location is `__file__`, which is something else.
- `cd`, `..`, `.`, `~`, `ls`, `mkdir`, `cp`, `mv`, `cat` and `rm` work in PowerShell and in Unix shells, but PowerShell's are aliases for its own commands, with their own options. Tab completes names; quotes hold paths with spaces; `rm` has no bin.
- Unix **permissions** are read, write and execute for owner, group and others: `rwxr-xr-x` is `0o755`. Windows uses access lists and a read-only flag, and decides what runs by extension.
- **`--help`** prints a usage line to standard output with status 0; a usage *error* goes to standard error with status 1. Usage grammar: `[optional]`, `a | b`, `...`, and names in capitals.

```predict
question: A colleague's script does open("config.json") and works when they run it, but fails with FileNotFoundError when it's run by a scheduled task. config.json is in the same folder as the script. What's the likely cause, and the fix?
explain: The scheduled task starts the script with a different working folder (often the system folder or the user's home), and the relative path config.json is looked up from there. The file is next to the script, not next to wherever the task runs. Fix it by building the path from the script's own location: os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json"), or by setting the task's working folder explicitly. It's the where.py experiment, outside the course.
```

**Next:** 01-06-02 connects programs to each other. Every program has three streams, standard input, output and error; the shell can redirect them to files and pipe one program's output into another's input, which is how `filter … | count` becomes one command.
