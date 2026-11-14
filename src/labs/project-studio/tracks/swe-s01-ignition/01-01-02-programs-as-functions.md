---
title: Programs as Functions: Inputs, Outputs and Hidden Inputs
runtime: python
---

Command-line tools are built to be chained: one program's output becomes the next program's input. `count` can't join that chain yet; it only reads a file you name. Fixing that is a small change, and it raises a bigger question this lesson answers: what exactly are a program's inputs and outputs, and which part of the program turns one into the other?

**By the end you can:**

- List every input and output of a small program, including inputs that aren't on the command line.
- Separate a program's computation from its reading and printing, so the same computation serves a file, a pipe, and a test.
- Say whether a program is deterministic, and explain what a hidden input such as the clock does to checking its output.

**You need:** lesson 01-01-01, and `kit/count.py` as you left it (with the optional encoding argument). Every command in this lesson runs inside the `kit` folder; if your terminal is somewhere else, `cd kit` first.

## A tool that won't join a pipeline

Every running program has three **standard streams**, connections the operating system opens for it before it starts:

- **standard input** (stdin), where it can read data;
- **standard output** (stdout), where `print` writes;
- **standard error** (stderr), where error messages and tracebacks go, so they don't mix with real output.

In a terminal, stdout and stderr both show on your screen, and stdin is your keyboard. The `|` character, a **pipe**, changes that: in `a | b`, program `a`'s standard output is connected to program `b`'s standard input. `echo hello` prints `hello`; piped, that `hello` becomes the next program's input instead of appearing on the screen.

```predict
question: What happens when you run `echo hello | .venv/bin/python count.py` with count.py as it is now?
choice: It counts the piped text and prints bytes, lines and characters
choice: It waits for you to type something
choice: It stops with an error before printing anything
answer: It stops with an error before printing anything
explain: count.py never looks at standard input. Its first line of real work is `path = sys.argv[1]`, and with no word after `count.py` on the command line, `sys.argv` holds only the script's name. Asking for item 1 of a one-item list raises IndexError.
```

Run it (`.venv\Scripts\python` on Windows, as in 01-01-01):

```
echo hello | .venv/bin/python count.py
```

Read the traceback from the bottom up. The last line names the error, `IndexError: list index out of range`; the lines above it point at `path = sys.argv[1]`. The text you piped in was sitting on standard input, unread. Unix tools such as `wc` solve this with a convention: no file named means "read standard input". `count` will follow it.

```check
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="bytes: 7" -- Start from count.py as it was at the end of 01-01-01 (the version that takes an optional encoding).
```

## Standard input, a first try

Python's `sys.stdin` is the program's standard input, and `sys.stdin.read()` reads all of it. This version uses it when no file is named. It also accepts `-` as a file name meaning "standard input", the same convention `cat` and many other tools use, so you can still pass an encoding when you pipe: `count.py - latin-1`.

`if len(sys.argv) > 1 and sys.argv[1] != "-"` means: a word follows `count.py`, and that word isn't `-`. Only then is there a file to open.

**This version has a bug on purpose.** Type it, then predict before you run it.

```python file=kit/count.py
import sys

if len(sys.argv) > 2:
    encoding = sys.argv[2]
else:
    encoding = "utf-8"

if len(sys.argv) > 1 and sys.argv[1] != "-":
    with open(sys.argv[1], "rb") as file:
        data = file.read()
else:
    data = sys.stdin.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))

try:
    text = data.decode(encoding)
except UnicodeDecodeError:
    print("characters: not", encoding, "text")
else:
    print("characters:", len(text))
```

```predict
question: Run `echo hello | .venv/bin/python count.py`. What happens?
choice: It prints bytes, lines and characters for hello
choice: It prints a bytes line, then stops with an error
choice: It stops with an error before printing anything
answer: It prints a bytes line, then stops with an error
explain: `len(data)` works on any sequence, so the bytes line prints. The next line, `data.count(b"\n")`, fails: data is not bytes this time. The evidence in the next step shows what it is instead.
```

```check
run "cd kit; .venv/Scripts/python count.py" stdin="a\nb\n" exit=1 stderr="must be str, not bytes" -- Use sys.stdin.read() for this step; the next step fixes it.
```

## Read the bytes, not the text

Run it and read the last line of the traceback:

```
TypeError: count() argument 1 must be str, not bytes
```

(The wording varies a little between Python versions; the part that matters, `must be str, not bytes`, is always there.) Work from the evidence:

1. **What was observed:** `count()` wanted a `str`, so `data` is a `str`, Python's text type, not `bytes`.
2. **Why:** `sys.stdin` is a **text stream**. Before handing you anything, it decodes the incoming bytes with an encoding Python picked from your system's settings. The program never chose that encoding, and never saw the bytes.
3. **The cause:** this is 01-01-01's lesson in a new place. Decoding is an assumption about the bytes. `count` exists to report what the bytes are, and then to decode them under an encoding the user chose. A stream that decodes first hides the bytes and makes the assumption for you.

Every Python text stream has the byte stream it reads from underneath it, called `buffer`. `sys.stdin.buffer.read()` returns the bytes exactly as they arrived, the way `open(path, "rb")` does for a file. One word changes:

```python file=kit/count.py
import sys

if len(sys.argv) > 2:
    encoding = sys.argv[2]
else:
    encoding = "utf-8"

if len(sys.argv) > 1 and sys.argv[1] != "-":
    with open(sys.argv[1], "rb") as file:
        data = file.read()
else:
    data = sys.stdin.buffer.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))

try:
    text = data.decode(encoding)
except UnicodeDecodeError:
    print("characters: not", encoding, "text")
else:
    print("characters:", len(text))
```

Save it and run the pipe again:

```
echo hello | .venv/bin/python count.py
```

On macOS or Linux it prints `bytes: 6`, `lines: 1` and `characters: 6`: five letters and a newline. On Windows PowerShell the numbers are bigger. Don't guess why; look at the bytes that arrive. This one-line program prints its standard input as a `bytes` value:

```
echo hello | .venv/bin/python -c "import sys; print(sys.stdin.buffer.read())"
```

On macOS or Linux: `b'hello\n'`. On one Windows 11 machine running PowerShell 5.1: `b'\xef\xbb\xbfhello\r\n'`, ten bytes. PowerShell passes text, not bytes, between programs: it re-encoded `hello` on the way through, adding a three-byte marker (`\xef\xbb\xbf`, a **byte-order mark**) in front and ending the line with `\r\n`, Windows' two-byte line ending. What arrives depends on the shell and its settings, so your numbers may differ. The pipe is part of the input.

Files you name are read exactly, on every system: `count.py samples/hello.txt` still reports 7 bytes everywhere.

```check
run "cd kit; .venv/Scripts/python count.py" stdin="a\nb\n" stdout="lines: 2" -- Read standard input with sys.stdin.buffer.read().
run "cd kit; .venv/Scripts/python count.py - latin-1" stdin="a\nb\n" stdout="lines: 2" -- A path of - should read standard input too.
run "cd kit; .venv/Scripts/python count.py samples/latin1.txt latin-1" stdout="characters: 6"
```

## Separate the counting from the reading and printing

Describe `count` the way you'd describe a mathematical function: what goes in, what comes out.

- **Inputs:** the words on the command line (a path or `-`, an encoding), and the bytes it reads from the file or from standard input.
- **Outputs:** the lines it prints to standard output, and its **exit status**, a number every program hands back when it ends: 0 for success, anything else for failure. (The IndexError earlier ended with status 1.)

Inside, three different jobs are mixed together: getting the bytes (input), counting them (the transformation), and printing the counts (output). Only the middle job is what `count` is *for*. Pull it into its own function, `measure`, that takes bytes and an encoding and **returns** the counts as a dictionary. It reads nothing and prints nothing. Everything else moves into a function called `main`.

Two details are new:

- `measure` returns `None` for the character count when the bytes don't decode. `None` is Python's "no value", and it keeps "not text in this encoding" separate from a real count of 0.
- The last two lines. When Python runs a file as a program, it sets the name `__name__` to `"__main__"`. When another program **imports** the file to use its functions, `__name__` is the module's name, `"count"`. So `if __name__ == "__main__": main()` means: read and print only when run as a program, and stay quiet when imported.

```python file=kit/count.py
import sys


# The counting: bytes in, counts out. It reads nothing and prints nothing.
def measure(data, encoding):
    try:
        characters = len(data.decode(encoding))
    except UnicodeDecodeError:
        characters = None
    return {"bytes": len(data), "lines": data.count(b"\n"), "characters": characters}


# The program: read the input, call measure, print the result.
def main():
    if len(sys.argv) > 2:
        encoding = sys.argv[2]
    else:
        encoding = "utf-8"

    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "rb") as file:
            data = file.read()
    else:
        data = sys.stdin.buffer.read()

    counts = measure(data, encoding)
    print("bytes:", counts["bytes"])
    print("lines:", counts["lines"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])


if __name__ == "__main__":
    main()
```

Save it and run `.venv/bin/python count.py samples/hello.txt`. It prints exactly what it printed before: 7, 1, 6. Moving code without changing what a program does is called **refactoring**, and an unchanged output is how you know it went right.

Now use `measure` on its own. `python -c "…"` runs the quoted code as a tiny program, and `from count import measure` imports the function from `count.py`.

```predict
question: What does `.venv/bin/python -c "from count import measure; print(measure(b'hi\n', 'utf-8'))"` print?
choice: {'bytes': 2, 'lines': 0, 'characters': 2}
choice: {'bytes': 3, 'lines': 1, 'characters': 2}
choice: {'bytes': 3, 'lines': 1, 'characters': 3}
choice: Nothing: measure doesn't print
answer: {'bytes': 3, 'lines': 1, 'characters': 3}
explain: The bytes are h, i and a newline: 3 bytes, 1 newline byte, and 3 characters once decoded. measure returns a dictionary and print shows it. Nothing was read from a file or the keyboard; the input was written right into the call.
verify: cd kit; .venv/Scripts/python -c "from count import measure; print(measure(b'hi\n', 'utf-8'))"
```

```predict
question: Suppose count.py had no `if __name__ == "__main__":` guard, just a bare `main()` at the bottom. What would `.venv/bin/python -c "import count"` do?
explain: Importing a file runs it, top to bottom. main() would run during the import, find no path on the command line, and wait to read standard input, sitting at your keyboard until you pressed Ctrl+D (Ctrl+Z then Enter on Windows). The guard is what lets a program's functions be reused without running the program.
```

**What else, and why not.** `measure` could have been written other ways:

| `measure` takes | Cost |
|---|---|
| A path, and opens the file itself | It can't count a pipe, and every test of it needs a file on disk |
| An open file or stream | Works for both, but every test still has to build a stream, and the function still does input |
| The bytes (chosen) | The simplest thing to call and to test. The cost: the whole input must fit in memory at once; lesson 01-01-04 lifts that limit |

```check
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="characters: 6" -- The output should be unchanged after the refactor.
run "cd kit; .venv/Scripts/python -c \"from count import measure; print(measure(b'hi\\n', 'utf-8'))\"" stdout="{'bytes': 3, 'lines': 1, 'characters': 3}" -- measure should return a dictionary with the keys bytes, lines and characters.
run "cd kit; .venv/Scripts/python -c \"import count\"" stdin="x\n" without="bytes:" -- Importing count should print nothing; call main() only under if __name__ == "__main__":.
```

## Same input, same output

Call `measure` with the same bytes and encoding as often as you like: the result never changes. A function or program whose outputs depend only on its inputs is **deterministic**.

Not every program is. Run this twice:

```
.venv/bin/python -c "import time; print(time.time())"
```

`time.time()` is the number of seconds since 1 January 1970, and each run prints a different number although nothing you typed changed. The program has an input you didn't give it: the clock. A random number generator, the order in which several tasks finish, or a file someone else edits are the same kind of thing. A program whose output depends on something that isn't among its visible inputs is **nondeterministic**: run it twice on the same input and you can get different outputs.

```predict
question: Is count.py deterministic? Think about `count.py samples/hello.txt` run today and run again tomorrow after someone has edited hello.txt.
choice: Yes
choice: No, because the file can change between runs
answer: Yes
explain: The file's contents are one of count's inputs. If they change, the input changed, and a different output is exactly what a deterministic program should give. Given the same arguments and the same bytes, count prints the same thing every time. A nondeterministic program differs on the same input; count never does.
```

Determinism matters most when you check a program. To check output you compare it with an expected answer, and that only works if the answer is fixed. Suppose `count` also printed `counted at: 1794694333.82`. Every check that compares its whole output would fail on the next run, even though the counting is correct. There are two ways out, and they recur through this course:

- **Keep the hidden input out of the computation.** `measure` doesn't know what time it is. The clock, if anything needs it, belongs in `main`, beside the other input and output.
- **Make the hidden input visible.** A function that needs the time can take it as a parameter, `measure(data, encoding, now)`; a test then passes a fixed time and gets a fixed answer.

```check
run "cd kit; .venv/Scripts/python -c \"from count import measure; print(measure(b'h\\xe9llo\\n', 'utf-8'))\"" stdout="'characters': None" -- measure should give None as the character count when the bytes don't decode.
```

## Your turn: a --json flag

People read `count`'s output; programs would rather read **JSON**, a text format for data that nearly every language can parse. Add a `--json` flag:

- `count.py --json samples/hello.txt` prints `{"bytes": 7, "lines": 1, "characters": 6}`.
- `count.py --json samples/latin1.txt` prints `{"bytes": 6, "lines": 1, "characters": null}`. (`null` is JSON's word for "no value".)
- `--json` works with standard input too: `echo hello | count.py --json`.
- Without `--json`, the output is exactly as before.

Python's `json` module does the formatting: after `import json`, `json.dumps(d)` turns a dictionary into JSON text, and turns `None` into `null`.

Before you write anything, decide: which function changes, `measure` or `main`? Your answer is the point of this lesson.

```hints
nudge: Is --json about what is counted, or about how the result is shown?
concept: The counting is already done, and finished, by the time anything is printed. --json changes only the output, so only main changes; measure stays exactly as it is. The flag is a word on the command line, so main must find it and remove it before it looks for the path and encoding, or "--json" would be taken for a file name.
shape: In main, copy the words after the script name into a list, args = sys.argv[1:]. Set as_json = "--json" in args, then rebuild args without "--json". Use args[0] and args[1] where the code used sys.argv[1] and sys.argv[2] (each index drops by one). After counts = measure(...), if as_json, print json.dumps(counts) and return; otherwise print the three lines as before.
answer: One way to write main (and add import json at the top):
~~~python
def main():
    args = sys.argv[1:]
    as_json = "--json" in args
    args = [arg for arg in args if arg != "--json"]

    if len(args) > 1:
        encoding = args[1]
    else:
        encoding = "utf-8"

    if len(args) > 0 and args[0] != "-":
        with open(args[0], "rb") as file:
            data = file.read()
    else:
        data = sys.stdin.buffer.read()

    counts = measure(data, encoding)
    if as_json:
        print(json.dumps(counts))
        return
    print("bytes:", counts["bytes"])
    print("lines:", counts["lines"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])
~~~
`[arg for arg in args if arg != "--json"]` builds a new list of every word except "--json", so the flag can go anywhere on the line. measure didn't change, and that is why this was a small change: the computation and its presentation were already apart.
```

```check
run "cd kit; .venv/Scripts/python count.py --json samples/hello.txt" stdout="{\"bytes\": 7, \"lines\": 1, \"characters\": 6}" -- Print json.dumps of the counts dictionary when --json is given.
run "cd kit; .venv/Scripts/python count.py --json samples/latin1.txt" stdout="\"characters\": null" -- When the bytes don't decode, the character count should come out as null.
run "cd kit; .venv/Scripts/python count.py --json" stdin="a\nb\n" stdout="\"lines\": 2" -- --json should work when reading standard input too.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="characters: 6" without="{" -- Without --json, count should print the three lines as before.
```

**What these checks establish, and what they don't.** They run `count` with `--json` on two files and on standard input, and once without it, and look for one piece of the output each time. They don't check that `measure` is unchanged, that `--json` works when it comes after the path, or what happens with `--json` and `-` together. Try those yourself: `count.py samples/latin1.txt latin-1 --json` should print a character count of 6. And through a pipe they only compare line counts, because the bytes that arrive depend on the shell, as you saw.

## What you can do now

- A program is a function from its inputs to its outputs. Its inputs include the command line and the bytes it reads; its outputs include what it prints and its exit status.
- Keep the computation (`measure`) apart from input and output (`main`). Then one computation serves a file, a pipe, another program that imports it, and a test, and a new output format touches only `main`.
- Text streams decode for you, under an encoding you didn't choose; read `.buffer` when the bytes matter. A pipe can change the bytes on the way through.
- A deterministic program gives the same output for the same inputs. Hidden inputs such as the clock or randomness make output unrepeatable; keep them out of the computation, or make them explicit parameters.

```predict
question: A colleague's report script prints a summary of a sales file, and the last line is "generated at 09:14". Their test compares the whole output with a saved copy, and it passes on their machine but fails in the build system. What's the likely cause, and what would you change?
explain: The clock is a hidden input: the "generated at" line differs on every run, so a comparison of the whole output can only pass by luck. Separate the summary computation from the printing, test the computation's returned value, and have main add the timestamp; or pass the time in as a parameter so a test can fix it.
```

**Next:** lesson 01-01-03 asks what `count` should mean by a *word*, and what it means for a program to be correct at all.
