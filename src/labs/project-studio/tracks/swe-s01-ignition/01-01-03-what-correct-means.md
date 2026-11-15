---
title: What "Correct" Means: Specifications, Algorithms and Counterexamples
runtime: python
---

`count` reports bytes, lines and characters. The tool it's modelled on also counts words, so that's next, and it looks like one line of code. Before you write it, try to say exactly what a word is. That turns out to be the hard part, and it leads to the question this lesson answers: what does it mean for a program to be *correct*?

**By the end you can:**

- Write a specification for a small computation: a definition in one sentence, plus a table of example inputs with the outputs it requires, including the awkward cases.
- Run an implementation against that table, and explain why passing examples is evidence but never proof, while one failing example is proof of a bug.
- Name the levels of a solution (problem, algorithm, program, process, machine) for a piece of `count`, and tell which level a given change belongs to.

**You need:** lesson 01-01-02, and `kit/count.py` as you left it (with `--json`). Every command in this lesson runs inside the `kit` folder; if your terminal is somewhere else, `cd kit` first.

## How many words?

Python's `split()` method, with no argument, breaks a string into pieces wherever there's whitespace, and drops the whitespace. `len` of the result is a word count. Here it is on a short phrase whose two middle words are joined by a dash, `one—two three`. (`—` is how you write that dash, the em dash, inside a Python string without having to type it.)

```predict
question: How many pieces does `'one—two three'.split()` give? Run `.venv/bin/python -c "print(len('one—two three'.split()))"` to find out.
answer: 2
explain: split() breaks only at whitespace, and the dash isn't whitespace, so `one—two` stays one piece: two pieces in all. A person reading it would probably say three words: one, two, three.
verify: cd kit; .venv/Scripts/python -c "print(len('one—two three'.split()))"
```

Now try `'a - b'` the same way. `split()` says 3, because the lone `-` is a piece. A person would probably say 2: a dash on its own isn't a word.

So `split()` disagrees with a person in both directions. Which one is right? Neither, yet. "Count the words" isn't a precise enough request for either answer to be right or wrong. Other reasonable rules exist too: count runs of letters, so `don't` is two words; or know English, so `e-mail` is one. Each gives different numbers on some inputs.

A program can only be correct or incorrect *with respect to* a statement of what it should do. That statement is its **specification**. Until there is one, a wrong answer can't be told from a different opinion.

```check
run "cd kit; .venv/Scripts/python count.py --json samples/hello.txt" stdout="\"characters\": 6" -- Start from count.py as it was at the end of 01-01-02, with the --json flag.
```

## Write the definition before the code

Here is `count`'s definition of a word. It has two parts.

**The sentence:** a word is a run of bytes that aren't ASCII whitespace, as long as it can go, so that the bytes on either side are whitespace or the edge of the data. **ASCII whitespace** is exactly six bytes: space, tab, newline, carriage return, vertical tab and form feed.

**The examples**, each with the count the sentence requires:

| Input bytes | Words | Why |
|---|---|---|
| `b""` | 0 | Nothing at all |
| `b"hello"` | 1 | A run that touches both edges |
| `b"hello world\n"` | 2 | The final newline ends a word; it doesn't start one |
| `b"  two   spaces  "` | 2 | Several spaces in a row are one gap |
| `b"tab\tand\r\nwindows"` | 3 | Tab, carriage return and newline separate words too |
| `b"\n\n\n"` | 0 | Whitespace only |
| `b"one\xe2\x80\x94two three"` | 2 | The dash's UTF-8 bytes aren't whitespace |
| `b"a - b"` | 3 | A lone `-` is a run, so it's a word |

The last two rows record decisions, not facts. A person might count them differently, and this definition says what `count` does anyway. That makes `count` match the Unix `wc -w` tool on ASCII text, so scripts that expect `wc`'s numbers get them.

Notice that the sentence talks about bytes, not characters. Words don't depend on an encoding, so `count` can report them even for bytes that won't decode.

The table is more than documentation: it can run. Make a new file, `check_counts.py`, holding the table as a list of pairs, `(input, expected)`, and a loop that calls `measure` on every input and compares. `for data, expected in WORD_EXAMPLES:` takes each pair apart into its two names. Bytes literals can only hold ASCII, so the dash is written as its three bytes, `\xe2\x80\x94`, as in 01-01-01.

```python file=kit/check_counts.py
from count import measure

# The definition: a word is a run of bytes that are not ASCII whitespace,
# as long as it can go: whitespace or the edge of the data on both sides.
# ASCII whitespace: space, tab, newline, carriage return, vertical tab, form feed.
WORD_EXAMPLES = [
    (b"", 0),
    (b"hello", 1),
    (b"hello world\n", 2),
    (b"  two   spaces  ", 2),
    (b"tab\tand\r\nwindows", 3),
    (b"\n\n\n", 0),
    (b"one\xe2\x80\x94two three", 2),
    (b"a - b", 3),
]

passed = 0
for data, expected in WORD_EXAMPLES:
    got = measure(data, "utf-8")["words"]
    if got == expected:
        passed += 1
    else:
        print("FAIL:", data, "gave", got, "expected", expected)
print("passed:", passed, "of", len(WORD_EXAMPLES))
```

Save it and run it before `measure` counts any words:

```
.venv/bin/python check_counts.py
```

It stops with a traceback ending `KeyError: 'words'`: the dictionary `measure` returns has no `"words"` key. That failure is expected, and it's useful. You've now seen this check fail when the feature is missing, so when it passes later, the pass will mean something.

```check
run "cd kit; .venv/Scripts/python check_counts.py" exit=1 stderr="KeyError: 'words'" -- check_counts.py should import measure and read its "words" key. measure has no words yet, so a KeyError is expected at this step.
```

## A first attempt that looks right

Words are separated by spaces. So count the spaces and add one: `hello world` has one space and two words. That idea is plausible enough that people write it, so try it. **This version is wrong on purpose.**

`measure` gets a `"words"` entry (the dictionary is now spread over several lines, one key per line, so it stays readable), and `main` prints a `words:` line.

```python file=kit/count.py
import json
import sys


# The counting: bytes in, counts out. It reads nothing and prints nothing.
def measure(data, encoding):
    try:
        characters = len(data.decode(encoding))
    except UnicodeDecodeError:
        characters = None
    return {
        "bytes": len(data),
        "lines": data.count(b"\n"),
        "words": data.count(b" ") + 1,
        "characters": characters,
    }


# The program: read the input, call measure, print the result.
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
    print("words:", counts["words"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])


if __name__ == "__main__":
    main()
```

Save it and run it on the sample: `.venv/bin/python count.py samples/hello.txt` prints `bytes: 7`, `lines: 1`, `words: 1`, `characters: 6`. One word is right. If you stopped here you'd believe it works.

```predict
question: Now run `.venv/bin/python check_counts.py`. How many of the 8 examples pass?
answer: 4
explain: The four that pass are the ones the idea was built from: one word, two words with one space, and two rows where single spaces happen to separate everything (the dash row and `a - b`). The four that fail each break an assumption the idea made without saying so.
verify: cd kit; .venv/Scripts/python check_counts.py
```

Run it:

```
FAIL: b'' gave 1 expected 0
FAIL: b'  two   spaces  ' gave 8 expected 2
FAIL: b'tab\tand\r\nwindows' gave 1 expected 3
FAIL: b'\n\n\n' gave 1 expected 0
passed: 4 of 8
```

Read each failure as evidence of a hidden assumption:

1. **`b''` gave 1.** The `+ 1` assumes there is at least one word. Empty input has none.
2. **Double spaces gave 8.** Counting spaces assumes exactly one space between words and none at the ends.
3. **Tabs and line endings gave 1.** It assumes the space is the only separator.
4. **Newlines only gave 1.** The `+ 1` again, this time on input that's all whitespace.

The obvious example, `hello world`, could never have found these. It was the case the idea came from. Each failure above is a **counterexample**: one input on which the program's output differs from what the specification requires. A single counterexample is enough to prove a program incorrect, however many other examples it passes.

Notice too that `check_counts.py` printed four failures and then ended normally. A program that runs it can't tell success from failure, except by reading the text. Lesson 01-01-04 gives it an exit status that says which.

```check
run "cd kit; .venv/Scripts/python check_counts.py" stdout="passed: 4 of 8" -- Use data.count(b" ") + 1 for this step; the next step replaces it.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="words: 1" -- main should print a words: line from counts["words"].
```

## Meet the definition

`bytes` has a `split()` method too. With no argument it does exactly what the sentence describes: it breaks the data at runs of ASCII whitespace, of any length, and leaves out the empty pieces that would come from whitespace at the start or end. Those are the six bytes from the definition, no more. With an argument it means something else, so the argument matters:

```predict
question: What does `.venv/bin/python -c "print(b'  two'.split(b' '), b'  two'.split())"` print?
choice: [b'two'] [b'two']
choice: [b'', b'', b'two'] [b'two']
choice: [b'', b'', b'two'] [b'', b'', b'two']
answer: [b'', b'', b'two'] [b'two']
explain: split(b' ') breaks at every single space and keeps what lies between, so two leading spaces give two empty pieces. split() with no argument treats any run of whitespace as one break and drops empty pieces. Only the second matches the definition.
verify: cd kit; .venv/Scripts/python -c "print(b'  two'.split(b' '), b'  two'.split())"
```

One expression changes in `measure`: the words entry becomes `len(data.split())`.

```python file=kit/count.py
import json
import sys


# The counting: bytes in, counts out. It reads nothing and prints nothing.
def measure(data, encoding):
    try:
        characters = len(data.decode(encoding))
    except UnicodeDecodeError:
        characters = None
    return {
        "bytes": len(data),
        "lines": data.count(b"\n"),
        "words": len(data.split()),
        "characters": characters,
    }


# The program: read the input, call measure, print the result.
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
    print("words:", counts["words"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])


if __name__ == "__main__":
    main()
```

Save it, and run the table again: `.venv/bin/python check_counts.py` prints `passed: 8 of 8` and no failures. Then run the tool itself: `.venv/bin/python count.py samples/hello.txt` still prints `words: 1`.

```predict
question: You didn't touch the --json code. What does `.venv/bin/python count.py --json samples/hello.txt` print now?
choice: {"bytes": 7, "lines": 1, "characters": 6}
choice: {"bytes": 7, "lines": 1, "words": 1, "characters": 6}
choice: An error, because the JSON code doesn't know about words
answer: {"bytes": 7, "lines": 1, "words": 1, "characters": 6}
explain: The JSON output is json.dumps of whatever dictionary measure returns, so a new key appears in it for free. That is 01-01-02's separation paying off: the counting changed and the output code didn't need to.
verify: cd kit; .venv/Scripts/python count.py --json samples/hello.txt
```

**So is it correct now?** A program is **correct** when it meets its specification for every input in its **domain**, the set of inputs it's meant to accept. `count`'s domain is every possible sequence of bytes. Eight passing examples cover eight of them. There are infinitely many others.

That's the asymmetry at the centre of this lesson. One counterexample *proves* a program incorrect. No number of passing examples proves it correct; they are evidence, and better examples (the empty input, the edges, the separators) are stronger evidence than more of the same easy kind. To claim correctness for every input you need an argument. Here's one: `split()` breaks the data at every maximal run of whitespace and drops the empty pieces, so the pieces are exactly the maximal runs of non-whitespace, which is the sentence's definition of a word. So their number is the word count. The table checks that argument wasn't wishful thinking.

There's a second question correctness doesn't answer. `count` reports 3 words for `a - b`, and that's correct. Whether it's what its users *want* is a question about the specification, not the program. When a result surprises you, ask first which one is wrong: the program, for failing its specification, or the specification, for not saying what people need.

**What else, and why not.** Other definitions of a word were possible:

| Definition | Cost |
|---|---|
| Split the decoded text, with Python's `str.split()` | Also splits at Unicode spaces such as the no-break space, which is nicer for text. But it needs an encoding, gives no count when the bytes don't decode, and stops matching `wc -w` |
| Runs of letters and digits, the pattern `\w+` | Gives 2 for `a - b`, as a person would, but also 2 for `don't` and 2 for `e-mail` |
| What a person would say | Needs knowledge of each language: is `e-mail` one word, and `New York`? No short sentence states it, so no table can be complete |
| Runs of non-whitespace bytes (chosen) | Says `-` is a word, and `one—two` one word. In exchange it is short, exact, needs no encoding, and matches `wc -w` |

```check
run "cd kit; .venv/Scripts/python check_counts.py" stdout="passed: 8 of 8" without="FAIL" -- Use len(data.split()) for the words count.
run "cd kit; .venv/Scripts/python -c \"from count import measure; print('words', measure(b' a  b\\t', 'utf-8')['words'])\"" stdout="words 2" -- measure should count runs of non-whitespace, whatever whitespace surrounds them.
run "cd kit; .venv/Scripts/python count.py --json samples/hello.txt" stdout="\"words\": 1" -- The JSON output should now include the words count.
run "cd kit; .venv/Scripts/python count.py" stdin="a b\nc\n" stdout="words: 3" -- Words should be counted on standard input too.
```

## Problem, algorithm, program, process

You've now seen word counting at several levels, and it helps to name them, because a change or a bug usually lives at just one.

- **The problem** is the specification: the sentence and the table. It says *what*, not how.
- **An algorithm** is a method for solving it, precise enough to follow by hand: "break the data at whitespace runs and count the pieces". It doesn't depend on any language.
- **A program** is an algorithm written in a particular language: `len(data.split())` in `count.py`.
- **A process** is one run of a program: what the operating system starts each time you type the command, with its own input, its own memory, and an exit status when it ends.

One problem can have several algorithms. Here's a second for the same specification: walk through the bytes and count the places where a word *starts*, meaning a non-whitespace byte that is either the very first byte or comes right after a whitespace byte.

Writing it shows a fact from 01-01-01 in a new way. Indexing a `bytes` value gives a number, not a one-byte string: `data[i]` is an integer from 0 to 255, and `b" "[0]` is `32`. `in` works with those numbers: `32 in WHITESPACE` asks whether byte 32 is one of the six. `\x0b` and `\x0c` are vertical tab and form feed, bytes 11 and 12.

Add the second algorithm to `check_counts.py`, and check both against the same table:

```python file=kit/check_counts.py
from count import measure

# The definition: a word is a run of bytes that are not ASCII whitespace,
# as long as it can go: whitespace or the edge of the data on both sides.
# ASCII whitespace: space, tab, newline, carriage return, vertical tab, form feed.
WORD_EXAMPLES = [
    (b"", 0),
    (b"hello", 1),
    (b"hello world\n", 2),
    (b"  two   spaces  ", 2),
    (b"tab\tand\r\nwindows", 3),
    (b"\n\n\n", 0),
    (b"one\xe2\x80\x94two three", 2),
    (b"a - b", 3),
]

WHITESPACE = b" \t\n\r\x0b\x0c"


# A second algorithm: count the places where a word starts.
def count_word_starts(data):
    starts = 0
    for i in range(len(data)):
        if data[i] not in WHITESPACE and (i == 0 or data[i - 1] in WHITESPACE):
            starts += 1
    return starts


passed = 0
for data, expected in WORD_EXAMPLES:
    by_split = measure(data, "utf-8")["words"]
    by_starts = count_word_starts(data)
    if by_split == expected and by_starts == expected:
        passed += 1
    else:
        print("FAIL:", data, "split gave", by_split, "starts gave", by_starts, "expected", expected)
print("passed:", passed, "of", len(WORD_EXAMPLES))
```

Save it and run `.venv/bin/python check_counts.py`: `passed: 8 of 8`. Two different algorithms meet one specification, and one table checks both. That is what a specification is for: it lets you judge code you didn't write, or a method you wouldn't have chosen, without reading it line by line first. That holds whether the code came from a teammate, a library or an AI tool.

```predict
question: Suppose you delete `i == 0 or` from count_word_starts, leaving `data[i] not in WHITESPACE and data[i - 1] in WHITESPACE`. What goes wrong? (Hint: what is `data[-1]` in Python?)
explain: At i == 0, data[i - 1] is data[-1], and a negative index counts from the end: it's the last byte. So the first word is counted only when the data happens to end in whitespace. `hello` gives 0, while `hello world\n` still gives 2, because it ends in a newline. The table catches it: four rows fail (hello, the tab row, the dash row and a - b), all inputs that end in a non-whitespace byte. The i == 0 test is how the code says "the edge of the data", from the definition's sentence.
```

**Below the program: the machine.** Python doesn't run your text directly. It first translates each function into **bytecode**, a list of simple instructions for the Python interpreter, which is itself a program running on the processor. You can see `measure`'s instructions:

```
.venv/bin/python -c "import dis, count; dis.dis(count.measure)"
```

Find the block that starts by loading `'words'`. It loads `len` and `data`, looks up `split`, and then has two `CALL` instructions: the first calls `split()`, the second calls `len` on the result. The instruction names vary between Python versions, which is the point: the same program becomes different instructions on a different Python, and the program's meaning doesn't change. 01-01-01 said instructions are a kind of data; this is the data the interpreter actually executes.

**And one level up: the process.** `count.py` is one program. Each time you run it, the operating system starts a new process and gives it a number, its **process id**. Run this twice:

```
.venv/bin/python -c "import os; print(os.getpid())"
```

You almost always get a different number: a new process for each run, from the same program. (The number is a hidden input of the kind 01-01-02 described. The program didn't choose it, and it can't predict it.)

| Level | For words in `count` | A change at this level |
|---|---|---|
| Problem | The sentence and the table | Deciding `-` alone shouldn't count |
| Algorithm | Split and count pieces, or count word starts | Switching from one to the other |
| Program | `len(data.split())` in `count.py` | Renaming a variable, or porting to another language |
| Machine | Bytecode, run by the interpreter on the processor | Upgrading Python |
| Process | One run, on one input, with one exit status | Running it on a different file |

```check
run "cd kit; .venv/Scripts/python check_counts.py" stdout="passed: 8 of 8" without="FAIL" -- count_word_starts should agree with the table.
run "cd kit; .venv/Scripts/python -c \"import check_counts as c; print('starts', c.count_word_starts(b'hello'))\"" stdout="starts 1" -- A word at the very start of the data counts: keep the i == 0 test.
```

## Your turn: what counts as a line

`count` has had an unwritten specification since 01-01-01: a line is whatever ends in a newline byte. So `b"a\nb"`, two lines to anyone looking at it, gives `lines: 1`, and a file whose last line has no newline after it reports one line too few.

Change the definition so that a final run of bytes with no newline after it is a line too. Do it in the order this lesson taught:

1. **Specification first.** Write the new definition as a sentence in a comment, and a `LINE_EXAMPLES` table in `check_counts.py` with a loop like the words one. Include at least the empty input, text without a final newline, text with one, two newlines in a row, Windows line endings (`\r\n`), and a lone carriage return, `b"a\rb"`. Decide each expected count from your sentence, not from what any code prints.
2. **Run it and watch it fail** against the current `measure`.
3. **Then change `measure`** until the table passes, and `count.py samples/hello.txt` still reports 1 line.

This changes `count`'s behaviour on purpose: on a file without a final newline, `count` will now say one more line than `wc -l` does. The specification is where that decision is recorded.

```hints
nudge: When is the current count one short? Look at the last byte of the data.
concept: Every newline still ends a line, so data.count(b"\n") is still the starting point. The one extra line exists only when there is data and its last byte isn't a newline. Empty bytes count as false in an if, so `if data` means "there is at least one byte". bytes has an endswith method.
shape: In measure, compute lines before the return: start from data.count(b"\n"), then if data and not data.endswith(b"\n"), add 1. Put lines in the dictionary. In check_counts.py, copy the words loop, change WORD_EXAMPLES to LINE_EXAMPLES and "words" to "lines", and print "lines passed:".
answer: In measure, before the return (and use "lines": lines in the dictionary):
~~~python
    lines = data.count(b"\n")
    if data and not data.endswith(b"\n"):
        lines += 1
~~~
In check_counts.py, after the words loop:
~~~python
# A line is a run of bytes ending in a newline, or a final run of
# bytes after the last newline, if there is one.
LINE_EXAMPLES = [
    (b"", 0),
    (b"a", 1),
    (b"a\n", 1),
    (b"a\nb", 2),
    (b"\n\n", 2),
    (b"a\r\nb\r\n", 2),
    (b"a\rb", 1),
]

passed = 0
for data, expected in LINE_EXAMPLES:
    got = measure(data, "utf-8")["lines"]
    if got == expected:
        passed += 1
    else:
        print("FAIL:", data, "gave", got, "expected", expected)
print("lines passed:", passed, "of", len(LINE_EXAMPLES))
~~~
Against the old measure, three rows fail: b"a", b"a\nb" and b"a\rb". A tempting shortcut is len(data.splitlines()). It passes every row but one: bytes.splitlines also breaks at a lone carriage return, so it gives 2 for b"a\rb". That's only wrong because the sentence says a line ends at a newline byte. If your sentence said otherwise, your table and code should both say so, and agree.
```

```check
run "cd kit; .venv/Scripts/python -c \"from count import measure; print([measure(d, 'utf-8')['lines'] for d in (b'', b'a', b'a\\n', b'a\\nb', b'a\\rb')])\"" stdout="[0, 1, 1, 2, 1]" -- A final run of bytes without a newline is a line; a lone carriage return isn't a line ending.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="lines: 1" -- A file that ends in a newline should still report the same line count.
run "cd kit; .venv/Scripts/python -c \"from count import measure; print('words', measure(b'one two', 'utf-8')['words'])\"" stdout="words 2" -- The word count shouldn't change.
```

**What these checks establish, and what they don't.** They call `measure` on five inputs and look at the line counts, run `count` on the sample file, and make sure the word count still works. They don't look at your `LINE_EXAMPLES` table, so they can't tell whether you wrote the specification first, or whether your table has the boundary cases in it; that part is yours to judge. They also pass on code that works for these five inputs and fails on others. That's this lesson's asymmetry applied to the checks themselves: they are examples too. Add a row of your own that the checks don't try, such as `b"\n"` or `b"a\n\nb"`, and decide its expected count from your sentence before you run it.

## What you can do now

- A program is correct only with respect to a specification. Write it first: one exact sentence, plus a table of examples that includes the empty input, the edges and the awkward cases. Then make the table run.
- One counterexample proves a program incorrect. Passing examples are evidence, never proof; covering all inputs takes an argument about the algorithm, and the table checks the argument.
- When a result surprises you, decide whether the program broke its specification or the specification says the wrong thing. They're fixed in different places.
- A problem can have many algorithms, an algorithm many programs, and a program many processes; under the program is the machine that runs it. A specification lets you judge any of them without trusting how it was built.

```predict
question: A teammate's AI tool writes count_sentences(text) and reports "all tests pass": five examples it wrote itself, every one a plain sentence ending in a full stop. What do you ask for before you trust the function, and why?
explain: The specification: what counts as a sentence? Do "Dr. Smith", "Wait...", "Really?!" and a text with no final full stop count as one sentence, several, or none? Then examples chosen from that definition, especially the edges, written separately from the code. Examples made up alongside the code tend to share its assumptions, the way `hello world` could never catch the space-counting bug. Passing them is evidence that the five cases work, not that the function is correct.
```

**Next:** lesson 01-01-04 rebuilds the word count as a machine that reads its input a piece at a time, remembering only whether it's inside a word, and gives `check_counts.py` an exit status that says whether everything passed.
