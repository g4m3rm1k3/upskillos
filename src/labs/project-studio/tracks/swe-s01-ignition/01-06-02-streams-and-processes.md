---
title: Streams and Processes: Pipes, Redirects and the Environment
runtime: python
---

Since 01-01-02, Kit's tools have read standard input and written standard output, and you've connected them with `|` once or twice. A pipe lets you build a new tool out of old ones: `filter.py samples/app.log --all error | count.py` counts the error lines, and neither program knows the other exists. That's the Unix idea that made small tools powerful, and it's one of the oldest ideas in this course. But it only works if every program in the chain keeps its results and its complaints apart, if the shell passes the bytes along unchanged, and if a failure partway along isn't silently lost. This lesson looks at each of those three things, and on Windows PowerShell 5.1, the shell this app's terminal uses on Windows, it finds that the second isn't true. Your own `hexdump` will show you what the shell does to your bytes.

**By the end you can:**

- Say what standard input, output and error are for, and send each one where you want it with `<`, `>`, `2>` and `|`.
- Inspect what a redirect or a pipe really delivered, and recognise when a shell has re-encoded text in between.
- Find out whether every program in a pipeline succeeded, not just the last.
- Explain how environment variables reach a program and its children, and find and stop a running process.

**You need:** 01-06-01 (the shell, the working folder), Kit's `hexdump.py` (01-03-01 and 01-03-03), `filter.py` (module 1.2) and `count.py`. Commands run inside `kit`.

## Three streams

Every program starts with three open streams, numbered by the system: **standard input** (0), where it reads; **standard output** (1), for its results; and **standard error** (2), for messages to the person running it, such as errors, warnings and progress. All three are attached to the terminal unless the shell is told otherwise. This script writes one line to each output stream. `print(…, file=sys.stderr)` sends a `print` to standard error.

```python file=kit/streams.py
import sys

# A program has three standard streams: it reads from standard input, writes
# its results to standard output, and its messages about how it's going to
# standard error.
print("data: the result, on standard output")
print("message: a note for the person, on standard error", file=sys.stderr)
```

Save it and run `.venv/bin/python streams.py` (Windows: `.venv\Scripts\python streams.py`). Both lines appear: in the terminal, the two streams look the same. Now send standard output to a file. `>` means "standard output goes to this file, replacing it":

```
.venv/bin/python streams.py > out.txt
```

Only the `message:` line appears on screen. The `data:` line went into `out.txt`: `cat out.txt` shows it. That's the point of two output streams. A program's *results* can be saved or passed on, while its messages still reach a person. It's also why Kit's tools write their errors with `sys.exit("…")`, which writes to standard error: a pipeline of tools carries only data, and a tool's complaint can't be mistaken for a line of output.

The other redirections: `2>` sends standard error to a file, `2>&1` sends it wherever standard output is going, and `<` reads standard input from a file. (PowerShell has no `<`; pass the file name to the program, or pipe the file into it.)

```check
run "cd kit; .venv/Scripts/python streams.py" stdout="data: the result, on standard output" -- streams.py should print its result on standard output.
run "cd kit; .venv/Scripts/python streams.py" stderr="message: a note for the person" -- and its message on standard error.
```

## What a redirect really writes

`cat out.txt` showed the right line. But `cat` reads text: it decodes the file, and it guesses the encoding. To see what's actually on disk, look at the bytes, with the tool you built for exactly that:

```
.venv/bin/python hexdump.py out.txt
```

```predict
question: streams.py printed the 36 characters of "data: the result, on standard output" and a newline. What do you expect the first bytes of out.txt to be?
choice: 64 61 74 61 (the ASCII codes of "data")
choice: ff fe 64 00 61 00 (two bytes, then "data" with a zero after each letter)
choice: It depends on the shell
answer: It depends on the shell
explain: Python wrote UTF-8 bytes to standard output, but with >, the shell writes the file, and shells differ. bash, zsh and PowerShell 7.4 or later save the bytes as they came: 64 61 74 61 … In Windows PowerShell 5.1, > re-encodes the text as UTF-16 with a byte order mark: ff fe, then two bytes per character. If you're on Windows in this app's terminal, you'll see the second.
```

In Windows PowerShell 5.1, the app's terminal on Windows:

```
00000000  ff fe 64 00 61 00 74 00 61 00 3a 00 20 00 74 00  ..d.a.t.a.:. .t.
00000010  68 00 65 00 20 00 72 00 65 00 73 00 75 00 6c 00  h.e. .r.e.s.u.l.
…
00000040  75 00 74 00 70 00 75 00 74 00 0d 00 0a 00        u.t.p.u.t.....
```

Read the evidence with module 1.3's eyes. `ff fe` is a **byte order mark** for UTF-16, little-endian (01-03-03's byte order, for text). Then every character takes two bytes, `64 00` for `d`, which is UTF-16: the encoding 01-01-01 mentioned and Windows uses internally. And the line ends `0d 00 0a 00`: a carriage return and a newline. The file is twice the size it should be, and a program that expects UTF-8 (such as `count.py`, by default) will count every second byte as a zero.

Why? In Windows PowerShell 5.1, `>` is short for PowerShell's `Out-File` command, and PowerShell doesn't pass the program's bytes along. It reads them as text, decoding them with the console's code page, makes PowerShell strings of the lines, and writes those strings in its own default file encoding, which in 5.1 is UTF-16. On macOS and Linux, and in PowerShell 7.4 or later, the same command saves the bytes exactly as `streams.py` wrote them: `64 61 74 61 …`. On Windows the line still ends `0d 0a`, but for a different reason: Python itself writes `\r\n` for a newline in text mode on Windows.

`2>` is worse in 5.1. `.venv/bin/python streams.py 2> err.txt` saves PowerShell's *error record* for the message, not just the message: `cat err.txt` shows the line prefixed with the program's name, followed by lines such as `+ CategoryInfo : NotSpecified` and `FullyQualifiedErrorId : NativeCommandError`.

So in Windows PowerShell 5.1, when the bytes matter:

| Way | What you get |
|---|---|
| `> file` | UTF-16 with a byte order mark, and CRLF line ends |
| `\| Out-File -Encoding utf8 file` | UTF-8, but *with* a byte order mark (`ef bb bf`) at the start |
| `cmd /c "program > file"` | The bytes exactly, because the old Windows command interpreter, `cmd`, does the redirect |
| `pwsh` (PowerShell 7) instead of `powershell` | The bytes exactly, in PowerShell 7.4 and later |
| The program writes the file itself | The bytes exactly, in any shell: this lesson's task |

```check
run "cd kit; .venv/Scripts/python streams.py > out.txt; .venv/Scripts/python -c \"data = open('out.txt', 'rb').read(); text = data.decode('utf-16') if data[:2] == bytes([255, 254]) else data.decode('utf-8'); print('data: the result' in text, 'message:' in text)\"" stdout="True False" -- > captures standard output only, in whatever encoding this shell writes.
```

## Pipes

A **pipe**, `|`, connects one program's standard output to the next program's standard input, with no file in between. Count the error lines:

```
.venv/bin/python filter.py samples/app.log --all error | .venv/bin/python count.py
```

It prints `lines: 3` and `words: 13`, among other counts: the three lines of `app.log` that contain `error`. Two programs that know nothing about each other, combined into a third. That's why Kit's tools read standard input when given no file.

But a pipe in Windows PowerShell 5.1 has the same habit as `>`. Send the é through one, with `filter` matching the only line of `hello.txt`:

```
.venv/bin/python filter.py samples/hello.txt --all h | .venv/bin/python hexdump.py
```

```
00000000  68 3f 3f 6c 6c 6f 0d 0a                          h??llo..
```

`68 c3 a9` has become `68 3f 3f`: the é's two bytes are now two question marks, and the newline has gained a carriage return. In bash, zsh or PowerShell 7.4, the same pipe delivers `68 c3 a9 6c 6c 6f 0a`, unchanged. Windows PowerShell 5.1 decodes what the first program wrote into text, then encodes it for the next program using `$OutputEncoding`, which is ASCII by default in 5.1, and ASCII has no é, so it writes `?`. It joins the lines with `\r\n`, too. That's why the `count` above reported 79 bytes in 5.1 and 76 elsewhere: three added carriage returns. (01-01-02 met the same thing piping `echo` into Python.) Lines and words survive; bytes and characters outside ASCII don't.

**Exit status through a pipe.** `filter.py` fails, with status 1, when a query can never match. What does the shell report for the whole pipe?

```
.venv/bin/python filter.py samples/app.log --all a --none a | .venv/bin/python count.py
```

`filter` prints `filter.py: no line can ever match this query` on standard error (which still reaches you, since only standard output goes into the pipe), and `count` counts nothing. Then ask: in PowerShell, `$LASTEXITCODE` is `0`; in bash or zsh, `echo $?` prints `0`. A shell reports the status of the *last* program in a pipe. `filter`'s failure is lost, and a script that checks the status would carry on as if all were well. Unix shells can ask about the others. In bash, `echo ${PIPESTATUS[@]}` prints `1 0`, the status of each stage. `set -o pipefail` (bash and zsh) makes the pipe's status the last *failure* instead. PowerShell 5.1 has no equivalent for native programs; a script that must know checks each program separately.

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error | .venv/Scripts/python count.py" stdout="lines: 3" -- filter's output, piped into count, has three lines.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error | .venv/Scripts/python count.py" stdout="words: 13" -- Words survive any shell's pipe; exact bytes may not.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all a --none a | .venv/Scripts/python count.py; .venv/Scripts/python -c \"print('after the pipe')\"" stdout="lines: 0" stderr="no line can ever match" -- filter fails with a message on standard error, and count still runs, counting nothing.
```

## The environment and processes

A running program is a **process**. Each has a process id (pid; 01-01-02 printed one), its own working folder (01-06-01), its three streams, and an **environment**: a set of named text values, the **environment variables**. One you rely on constantly is `PATH`, the list of folders the shell searches when you type a program's name. That's why `python` and `.venv/bin/python` can be two different programs: the first is found through `PATH`, and the second is named by its path.

This script sets a variable, then starts a second Python process to look at it. A process it starts is its **child**, and gets a *copy* of its environment.

- `os.environ` is the process's environment, as a dictionary.
- `subprocess.run([…])` (01-04-05) starts the child and waits for it.
- `flush=True` makes `print` write its line out at once. When standard output isn't a terminal, Python collects output and writes it in large pieces, for speed, so without it the child's line could come out before the parent's.

```python file=kit/env_demo.py
import os
import subprocess
import sys

# Every process has its own environment: a set of named text values. A process
# it starts gets a copy, so a change in the child never reaches the parent.
os.environ["KIT_GREETING"] = "set by the parent"
print("parent", os.getpid(), "has:", os.environ["KIT_GREETING"], flush=True)

child = (
    "import os; "
    "print('child', os.getpid(), 'sees:', os.environ.get('KIT_GREETING')); "
    "os.environ['KIT_GREETING'] = 'changed by the child'"
)
subprocess.run([sys.executable, "-c", child])
print("parent still has:", os.environ["KIT_GREETING"])
```

```predict
question: The child changes KIT_GREETING to "changed by the child" before it ends. What does the parent's last line show?
choice: parent still has: changed by the child
choice: parent still has: set by the parent
choice: An error: the child deleted the variable
answer: parent still has: set by the parent
explain: The child got a copy of the parent's environment when it started, so its change was to its own copy, which disappeared when it ended. Environment variables flow down, from a process to the processes it starts, never back up. That's also why setting a variable in one terminal window doesn't affect another.
verify: cd kit; .venv/Scripts/python env_demo.py
```

Save it and run `.venv/bin/python env_demo.py`:

```
parent 11276 has: set by the parent
child 24692 sees: set by the parent
parent still has: set by the parent
```

Your process ids will differ. Set a variable from the shell, for the programs you run from it: `$env:KIT_GREETING = "hi"` in PowerShell, `export KIT_GREETING=hi` in bash or zsh (or `KIT_GREETING=hi command`, for one command only). Read one: `$env:PATH`, or `echo $PATH`.

**Finding and stopping processes.** `Get-Process python` in PowerShell, or `ps` (`ps aux | grep python`) on macOS and Linux, lists running processes with their ids. `Stop-Process -Id 1234`, or `kill 1234`, asks one to stop. Usually you don't need them: Ctrl+C stops the program running in your terminal. Try it on a program that's waiting: `.venv/bin/python count.py`, with no file, waits for standard input. Press Ctrl+C, and Python stops with `KeyboardInterrupt`. (To end standard input normally instead, so that `count` counts what you typed, press Ctrl+Z then Enter on Windows, or Ctrl+D on macOS and Linux.)

```check
run "cd kit; .venv/Scripts/python env_demo.py" stdout="sees: set by the parent" -- The child gets a copy of the parent's environment.
run "cd kit; .venv/Scripts/python env_demo.py" stdout="parent still has: set by the parent" -- The child's change doesn't reach the parent.
```

**What else, and why not.** Ways to get a program's output somewhere, and what each costs:

| Way | Cost |
|---|---|
| A redirect, `>` | One character; in Windows PowerShell 5.1 it re-encodes text, and it's for whole runs only |
| A pipe, `\|` | No file at all, and programs run side by side; the last program's status hides the others', and 5.1 re-encodes |
| The program opens and writes the file itself (`--output FILE`) | Exactly the bytes, in every shell; one more option for each tool to handle |
| One program starting another with `subprocess.run(…, capture_output=True)` (01-04-05) | Full control of every stream and status, in Python; more code than a `\|` |

## Your turn: an output file for filter

Give `filter.py` an `--output OUT` option, anywhere among its arguments, that writes the matching lines to the file `OUT`, byte for byte, instead of to standard output. `--output` with nothing after it must stop with a message on standard error and status 1. Without `--output`, `filter.py` behaves as before, and the shared `kitargs.py` should do the argument work: write a `take_option(args, option)` there that returns the option's value (or `None`) and the other arguments.

There's no file to compare with; the checks run `filter.py` and dump what it wrote.

```hints
nudge: take_flag (01-05-01) removes a flag; take_option must remove an option and the value after it. What should it do when the option is the last argument? Then in filter.py: where do the matching lines go today, and what has to change so that they can go to a file instead?
concept: take_option walks the arguments with an index, so that when it finds the option it can take the next argument as the value and skip both. filter_lines writes to sys.stdout.buffer; give it the stream to write to as a parameter, and main passes either sys.stdout.buffer or a file opened with "wb", for bytes, so nothing is re-encoded. Close the file when done (or use with). Call take_option first in main, before the query groups are read, so that --output and its value don't end up in a group.
shape: kitargs.take_option(args, option): value = None; rest = []; i = 0; while i < len(args): if args[i] == option: if i + 1 == len(args): sys.exit(option + " needs a value"); value = args[i + 1]; i = i + 2; else: rest.append(args[i]); i = i + 1. return value, rest. filter.py: filter_lines(stream, out, …) does out.write(line); main: output, args = take_option(sys.argv[1:], "--output"); out = sys.stdout.buffer, or open(output, "wb").
answer: At the end of kitargs.py:
~~~python
# Take an option that has a value, such as --output out.txt, out of the
# arguments. Returns the value (None if the option isn't there) and the other
# arguments. The option with nothing after it is a mistake: stop with a message.
def take_option(args, option):
    value = None
    rest = []
    i = 0
    while i < len(args):
        if args[i] == option:
            if i + 1 == len(args):
                sys.exit(option + " needs a value")
            value = args[i + 1]
            i = i + 2
        else:
            rest.append(args[i])
            i = i + 1
    return value, rest
~~~
In filter.py, from kitargs import take_option after the imports, and filter_lines takes the stream to write to:
~~~python
# Copy the lines that match from a stream of bytes to another stream of bytes.
def filter_lines(stream, out, all_terms, any_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, any_terms, none_terms):
            out.write(line)
~~~
main starts with output, args = take_option(sys.argv[1:], "--output") (and its usage line can mention [--output OUT]), and ends:
~~~python
    out = sys.stdout.buffer
    if output is not None:
        out = open(output, "wb")
    if args[0] == "-":
        filter_lines(sys.stdin.buffer, out, groups["--all"], groups["--any"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, out, groups["--all"], groups["--any"], groups["--none"])
    if output is not None:
        out.close()
~~~
The tempting slip is opening the file with "w" and writing text: the lines are bytes, so Python refuses (TypeError), and decoding them to write text would re-encode them, the very thing this option exists to avoid. Another is reading the groups before taking --output out, which files "--output" and its value as query terms. check_filter.py still passes, since matches didn't change.
```

```check
run "cd kit; .venv/Scripts/python filter.py samples/hello.txt --all h --output notes/h.txt; .venv/Scripts/python hexdump.py notes/h.txt" stdout="68 c3 a9 6c 6c 6f 0a" -- --output should write the matching lines byte for byte: the é intact, no carriage return added.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --output notes/errors.log --all error; .venv/Scripts/python count.py notes/errors.log" stdout="bytes: 76" -- --output can come anywhere; the file holds exactly the three error lines.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --output" exit=1 stderr="--output needs a value" -- --output with no value should stop with a message and status 1.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error" stdout="error: disk full" -- Without --output, the lines still go to standard output.
run "cd kit; .venv/Scripts/python -c \"import filter, kitargs; print(filter.take_option is kitargs.take_option)\"" stdout="True" -- take_option should live in kitargs, and filter.py should import it.
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences" -- filter's matching should be unchanged.
```

**What these checks establish, and what they don't.** They write two files with `--output` and dump or count them, so they check the exact bytes, which is what this option is for, and check the missing-value error, the old behaviour, and that `take_option` is shared. They don't try `--output` with `-` as the input, or a path in a folder that doesn't exist (what does `filter.py` do then, and is that a good message?), or the same file as input and output, which on most systems empties the input before it's read. Try that last one on a copy, and decide whether `filter.py` should refuse.

## What you can do now

- Every process has **standard input**, **output** and **error**. Results go to output, messages to error, so that `>` and `|` carry only data. `>` and `2>` redirect them, `2>&1` joins them, `|` connects one program's output to the next one's input.
- Look at the bytes (`hexdump`), not the text (`cat`), when it matters. **Windows PowerShell 5.1** re-encodes what passes through `>` and `|`: UTF-16 with a BOM for files, ASCII (`?` for é) and CRLF in pipes. bash, zsh and PowerShell 7.4 pass bytes unchanged. A program that writes its own file avoids the shell altogether.
- A pipe's status is its **last** program's. Ask for the others (`${PIPESTATUS[@]}`, `set -o pipefail`) or check each one.
- **Environment variables** are copied to child processes, never back. `PATH` decides which program a bare name runs.
- Ctrl+C stops the program in the terminal; `Get-Process`/`ps` and `Stop-Process`/`kill` find and stop others.

```predict
question: A nightly script runs export.py | upload.py and then checks the status to decide whether to send a "backup failed" email. One night export.py crashes halfway. What happens, and what would you change?
explain: export.py exits with an error status, but upload.py happily uploads the half-written output it received and exits 0. The pipe's status is upload.py's, so the script sees success, sends no email, and the bad backup replaces the good one. Fix it: set -o pipefail in bash (so any failure fails the pipe), or check each stage (PIPESTATUS), or don't pipe: have export.py write a file, check its status, and only then upload the file. Silent partial failure is the danger of pipes.
```

**Next:** 01-06-03 searches text with the classic tools, `grep`, `find`, `sed` and `awk`, and the pattern language they share, **regular expressions**. Kit's `filter` gets a `--regex` option.
