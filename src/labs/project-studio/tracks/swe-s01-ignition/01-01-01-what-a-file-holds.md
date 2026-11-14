---
title: What a File Holds: Bytes, Text and Meaning
track: 01 · Ignition
runtime: python
---

Ask three people how long a word is and you can get three right answers. This lesson starts **Kit**, a set of small command-line tools you will grow through the course, with its first tool, `count`. Building it shows you the difference between what a file *holds*, what those contents *represent*, and what they *mean*. That difference is under every bug where "the data looked fine".

**By the end you can:**

- Given a file, report its size in bytes and in characters, and explain why the two numbers differ.
- Predict what a program reports when the same bytes are read under a different assumption about their encoding.
- Explain why a program's source file is data to one program and instructions to another.

**You need:** Python 3.10 or later, and the basics of one programming language. The code is Python; each piece of Python syntax that isn't common to most languages is explained where it first appears.

## Set up the course folder and Kit

The whole course lives in one folder. Project Studio asks you to choose it the first time you open a lesson; pick an empty folder, for example one called `swe`. Every project you build gets its own subfolder inside it, and you move between them in the terminal, as you would on any real codebase.

Open the terminal (the panel at the bottom). It starts in the course folder. Make Kit's subfolder and move into it:

```
mkdir kit
cd kit
```

`mkdir` makes a directory; `cd` ("change directory") makes it the terminal's current folder, so the commands that follow run inside `kit`. Every Kit command in this course assumes you are there. If you open a new terminal later, `cd kit` again first.

Now create a **virtual environment**: a private copy of Python for this project, so packages installed later don't affect anything else on your computer. It lives in a folder called `.venv` inside `kit`.

| | Windows (PowerShell) | macOS or Linux |
|---|---|---|
| Create it | `python -m venv .venv` | `python3 -m venv .venv` |
| Its Python | `.venv\Scripts\python` | `.venv/bin/python` |

Run your environment's Python with `--version` to see that it works, for example `.venv/bin/python --version`. It prints something like `Python 3.13.2`.

```check
run "cd kit; .venv/Scripts/python --version" stdout="Python 3" -- Make the kit folder inside the course folder, cd into it, and create the virtual environment there (see the table above).
```

## Same bytes, different meanings

A file is a sequence of **bytes**. A byte is a number from 0 to 255. Nothing else is stored: no letters, no words, no "this is text".

Here are two bytes: `104` and `105`.

A text program reads each byte as a character code. In the ASCII table, 104 is `h` and 105 is `i`, so it shows `hi`.

A program that expects a two-byte number reads them differently. The first byte counts 256s and the second counts ones, the way the digits of `42` count tens and ones.

```predict
question: Read as one two-byte number (first byte × 256, plus the second byte), what number do the bytes 104 and 105 make?
answer: 26729
explain: 104 × 256 = 26624, and 26624 + 105 = 26729. The bytes didn't change. Only the rule used to read them changed. That rule is a **representation**: an agreement about how numbers stand for something. The same bytes are the text "hi" under one representation and the number 26729 under another.
verify: cd kit; .venv/Scripts/python -c "print(104 * 256 + 105)"
```

Keep three layers apart from here on:

- **Information**: what is stored, the bytes themselves.
- **Representation**: the rule that maps them to something, such as text in an encoding or a number in a byte order.
- **Meaning**: what that something is about. `hi` is a greeting. A program never sees this layer; people supply it.

## Write two sample files

To study representation you need files whose exact bytes you control. Typing them in an editor won't do: the editor chooses the bytes for you. This script writes them.

`é` is how Python writes the character é by its Unicode number, 233 (hexadecimal `e9`). `encode` turns text into bytes using a named encoding. `write_bytes` writes exactly those bytes, with nothing added.

```predict
question: hello.txt will hold "héllo" followed by a newline, encoded as UTF-8. How many bytes will the file contain?
choice: 6
choice: 7
choice: 12
answer: 7
explain: Five letters and a newline are six characters, but UTF-8 stores é as two bytes (195 and 169) while h, l, l, o and the newline take one byte each. Six characters, seven bytes. Latin-1, the other encoding here, stores é as a single byte, 233, so latin1.txt will be six bytes.
verify: cd kit; .venv/Scripts/python -c "print(len(open('samples/hello.txt', 'rb').read()))"
```

```python file=kit/make_samples.py
# Writes the same word to two files, in two different encodings.
from pathlib import Path

word = "héllo\n"

Path("samples").mkdir(exist_ok=True)
Path("samples/hello.txt").write_bytes(word.encode("utf-8"))
Path("samples/latin1.txt").write_bytes(word.encode("latin-1"))
```

Save the file, then run it from the terminal, in the `kit` folder: `.venv/bin/python make_samples.py` (or `.venv\Scripts\python make_samples.py` on Windows). It prints nothing; it creates the `samples` folder and both files.

The same word, in two encodings, gives two different files. Neither file says which encoding it uses. A program reading them has to be told, or has to guess.

```check
run "cd kit; .venv/Scripts/python make_samples.py"
file kit/samples/hello.txt
file kit/samples/latin1.txt
```

## Count bytes and lines

Now the first version of `count`. It reports only what is certainly true about any file: how many bytes it holds, and how many of those bytes are the newline byte (10).

- `sys.argv` is the list of words typed on the command line. `sys.argv[0]` is the script's own name, so the file to count is `sys.argv[1]`.
- `open(path, "rb")` opens the file for **r**eading in **b**inary mode. Python hands back the bytes exactly as stored and does no decoding.
- `data` is a `bytes` object: a sequence of numbers from 0 to 255. `len(data)` is how many there are.
- `b"\n"` is a one-byte `bytes` value holding the newline byte. `data.count(b"\n")` counts how many times it occurs.

```python file=kit/count.py
import sys

path = sys.argv[1]
with open(path, "rb") as file:
    data = file.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))
```

Run it on both samples:

```
.venv/bin/python count.py samples/hello.txt
.venv/bin/python count.py samples/latin1.txt
```

`hello.txt` reports 7 bytes and `latin1.txt` reports 6. Both report 1 line. Counting lines as newline bytes is a definition, not a fact of nature: a file whose last line has no newline after it reports one line fewer. The Unix `wc -l` tool uses the same definition.

```check
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="bytes: 7" -- Run make_samples.py first, and check count.py opens the file in "rb" mode.
run "cd kit; .venv/Scripts/python count.py samples/latin1.txt" stdout="bytes: 6"
```

## Count characters

Characters are not stored in a file. To count them, `count` must **decode** the bytes: apply an encoding's rules to turn bytes back into text. `data.decode("utf-8")` does that and returns a `str`, Python's text type, whose `len` counts characters.

```predict
question: After this change, how many characters will count report for hello.txt?
answer: 6
explain: Decoding with UTF-8 turns the two bytes 195 and 169 back into the single character é. Seven bytes become six characters. The byte count describes the representation; the character count describes the text it represents.
verify: cd kit; .venv/Scripts/python -c "print(len(open('samples/hello.txt', 'rb').read().decode('utf-8')))"
```

```python file=kit/count.py
import sys

path = sys.argv[1]
with open(path, "rb") as file:
    data = file.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))

text = data.decode("utf-8")
print("characters:", len(text))
```

```check
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="characters: 6"
```

## When the assumption is wrong

`count` now assumes every file is UTF-8. `latin1.txt` is not.

```predict
question: What will count print for samples/latin1.txt?
choice: bytes: 6, lines: 1, characters: 6
choice: bytes: 6 and lines: 1, then an error
choice: An error before anything is printed
answer: bytes: 6 and lines: 1, then an error
explain: The program runs top to bottom. Reading and counting bytes works for any file, so the first two lines print. The decode line comes next and fails, so Python stops with an error before printing the character count.
```

Run it and read the last line of the error:

```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 1: invalid continuation byte
```

Work out the cause from the evidence, not by guessing:

1. **What was observed:** the byte at position 1 (counting from 0) is `0xe9`, which is 233, Latin-1's é.
2. **Why UTF-8 rejects it:** in UTF-8, a byte of 192 or more starts a character that takes two to four bytes. The bytes that continue it must each be between 128 and 191. Here 233 is followed by 108 (`l`), which can't continue a character. The bytes are not valid UTF-8.
3. **The cause:** the file is fine and the program is fine. The **assumption** connecting them, "this file is UTF-8", is false for this file.

Reproduce it once more, then move on: the next step decides what `count` should do about it.

## Report what you know, and what you don't

A tool has three honest options when a file isn't valid in the encoding it expected:

| Option | What it does | Cost |
|---|---|---|
| Crash (what happens now) | Stops with a traceback | The byte and line counts, which were true, are buried under an error |
| Replace bad bytes (`decode("utf-8", errors="replace")`) | Swaps each invalid byte for a � character and carries on | Reports a character count for text that was never there. A wrong answer that looks right |
| Report the limit | Prints what it knows, and says the bytes aren't UTF-8 text | The user learns something true and can decide what to do |

`count` takes the third. `try` runs the decode; `except UnicodeDecodeError` runs only if that specific error happens; `else` runs only if it didn't.

```python file=kit/count.py
import sys

path = sys.argv[1]
with open(path, "rb") as file:
    data = file.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))

try:
    text = data.decode("utf-8")
except UnicodeDecodeError:
    print("characters: not UTF-8 text")
else:
    print("characters:", len(text))
```

Catching only `UnicodeDecodeError` matters. A bare `except:` would also hide a mistyped variable name or a missing file, and `count` would report "not UTF-8 text" for problems that have nothing to do with encodings.

```check
run "cd kit; .venv/Scripts/python count.py samples/latin1.txt" stdout="characters: not UTF-8 text" -- Catch UnicodeDecodeError around the decode, and print the message in the except branch.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="characters: 6"
```

## A program is data too

`count.py` is a file of bytes, like the samples. To Python it is a list of instructions. To `count` it is just bytes to count.

```predict
question: Run count on its own source, count.py. Will its character count equal its byte count?
choice: Yes
choice: No
answer: Yes
explain: Every character in count.py is plain ASCII: letters, digits, punctuation, spaces and newlines. UTF-8 stores each ASCII character as one byte, so the two counts match. Add an é to a comment and they would differ by one.
```

Run `.venv/bin/python count.py count.py`. The same bytes are instructions when Python runs them and data when `count` reads them. Whether bytes are data or instructions depends on which program reads them, not on the bytes. Later in the course that idea explains compilers, which read programs as data and write new programs, and a family of security bugs where data gets run as instructions.

```check
run "cd kit; .venv/Scripts/python count.py count.py" stdout="characters:"
```

## Your turn: choose the encoding

`count` can only report characters for UTF-8. Make the encoding a choice:

- `count.py samples/latin1.txt latin-1` reports `characters: 6`.
- `count.py samples/hello.txt latin-1` reports a character count too. Predict it before you run it.
- `count.py samples/hello.txt`, with no encoding given, still uses UTF-8 and reports `characters: 6`.

```hints
nudge: Where does count already read a word typed on the command line? The encoding is one more word.
concept: sys.argv holds every word after "python". With a path and an encoding, sys.argv has three items, so the encoding is sys.argv[2]. Check len(sys.argv) before reading it, or a run without an encoding fails with an IndexError.
shape: Choose the encoding near the top: if len(sys.argv) > 2, use sys.argv[2]; otherwise use "utf-8". Then pass that name to decode and to the "not … text" message.
answer: One way to write it:
~~~python
import sys

path = sys.argv[1]
if len(sys.argv) > 2:
    encoding = sys.argv[2]
else:
    encoding = "utf-8"

with open(path, "rb") as file:
    data = file.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))

try:
    text = data.decode(encoding)
except UnicodeDecodeError:
    print("characters: not", encoding, "text")
else:
    print("characters:", len(text))
~~~
Decoding hello.txt as Latin-1 reports 7 characters. Latin-1 maps every byte to exactly one character, so it never fails. It reads UTF-8's two bytes for é as two characters, Ã and ©, and shows "hÃ©llo". The decode succeeded and the answer is wrong. Never failing is not the same as being right.
```

```check
run "cd kit; .venv/Scripts/python count.py samples/latin1.txt latin-1" stdout="characters: 6" -- Read the encoding from sys.argv[2] when it is given.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt latin-1" stdout="characters: 7"
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="characters: 6" -- With no encoding given, count should still use UTF-8.
```

**What these checks establish, and what they don't.** They run your tool on three cases and look for one line of output in each. They don't try an encoding name Python doesn't know. Try it yourself: `count.py samples/hello.txt klingon`. Python stops with `LookupError: unknown encoding: klingon`, a different error from the one you caught. Decide whether `count` should report that more helpfully; the curriculum returns to error design in module 1.10.

## What you can do now

- A file holds **bytes**, numbers from 0 to 255. Text, numbers and programs are **representations**: rules for reading bytes. **Meaning** comes from people, not from the file.
- An **encoding** maps characters to bytes. **Decoding** maps bytes back, and it can fail when the bytes don't follow the encoding's rules.
- A byte count is always true. A character count is true only under an assumed encoding, so a good tool states its assumption and reports when the assumption fails.
- Whether bytes are **data** or **instructions** depends on which program reads them.

```predict
question: A colleague says a file "is 1,000 characters long". Before you agree, what do you need to know, and why?
explain: Which encoding the file is in. The file holds a number of bytes; the character count depends on how those bytes are decoded. The same bytes can be 1,000 characters in Latin-1 and fewer in UTF-8, or not valid UTF-8 at all. "Long" might also mean bytes, which needs no assumption at all.
```

**Next:** lesson 01-01-02 makes `count` read standard input, so it can sit in a pipeline, and separates the counting from the reading and printing.
