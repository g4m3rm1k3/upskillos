---
title: Three Models of a Program: Function, State Machine, Process
runtime: python
---

`count` reads its whole input into memory before it counts anything. For a sample file that's fine. For a 20 GB log on a laptop with 16 GB of memory, it fails, and for a pipe that never ends, such as a server's live log, it never prints anything at all. Real tools read a piece at a time. Making `count` do that looks like plumbing. It turns out to need an idea every later module uses: **state**, what a computation has to remember between one moment and the next.

**By the end you can:**

- Say what a computation must remember to process its input in pieces, show what goes wrong when it forgets, and test it at several piece sizes to catch that.
- Write a small state machine as a table of states and transitions, and trace it by hand on an input.
- Describe one program as a function, a state machine and a process, and say which model answers a given question about it, including what its exit status tells another program.

**You need:** lesson 01-01-03, with `kit/count.py` and `kit/check_counts.py` as you left them (including your line definition from the task). Every command runs inside the `kit` folder.

## Pieces don't add up

Before changing `count`, find out what goes wrong if you just cut the input into pieces, count each piece with `measure`, and add up the results. This small experiment does that, for pieces of 7 bytes.

`data[i:i + size]` is a **slice**: the bytes from position `i` up to, but not including, `i + size`. `range(0, len(data), size)` counts 0, 7, 14, … , so the slices are consecutive pieces. (A slice that runs past the end just stops at the end.) The data is two lines, the second with an `é` in it.

```python file=kit/pieces.py
from count import measure

data = b"hello world\nh\xc3\xa9llo\n"
print("whole:", measure(data, "utf-8"))

size = 7
pieces = [data[i:i + size] for i in range(0, len(data), size)]
print("pieces:", pieces)

bytes_total = 0
lines_total = 0
words_total = 0
undecodable = 0
for piece in pieces:
    counts = measure(piece, "utf-8")
    bytes_total += counts["bytes"]
    lines_total += counts["lines"]
    words_total += counts["words"]
    if counts["characters"] is None:
        undecodable += 1
print("added up: bytes", bytes_total, "lines", lines_total, "words", words_total)
print("pieces that would not decode:", undecodable)
```

```predict
question: The whole data has 19 bytes, 2 lines and 3 words. Which of those does adding up the pieces still get right?
choice: All three
choice: Bytes only
choice: Bytes and lines
choice: None of them
answer: Bytes only
explain: A byte is never split between two pieces, so the byte counts add up. A word is: `world` is cut into `w` and `orld`, and each half counts as a word. Lines break because of your rule from 01-01-03: a piece that doesn't end in a newline gets an extra line, though it's only part of a line.
```

Save it and run `.venv/bin/python pieces.py`:

```
whole: {'bytes': 19, 'lines': 2, 'words': 3, 'characters': 18}
pieces: [b'hello w', b'orld\nh\xc3', b'\xa9llo\n']
added up: bytes 19 lines 4 words 5
pieces that would not decode: 2
```

Read the pieces line. `world` is cut after its `w`. Worse, the `é`'s two bytes, `\xc3\xa9`, are cut apart, so neither piece holding half of it decodes: no character count is possible at all.

A count can be added up piece by piece only if nothing it counts can cross a boundary between pieces. Bytes can't. Words, lines with your final-run rule, and multi-byte characters all can. To count those in pieces, the counting has to carry something across each boundary. What it carries is its **state**.

```check
run "cd kit; .venv/Scripts/python pieces.py" stdout="added up: bytes 19 lines 4 words 5" -- Start from count.py as you left it after 01-01-03, with the line definition from its task.
```

## Remember one thing: a state machine

To count words across pieces, what must be remembered at a boundary? Only one fact: *was the last byte inside a word?* If it was, a non-whitespace byte at the start of the next piece continues that word; if not, it starts a new one.

That is the second algorithm from 01-01-03, `count_word_starts`, which asked "is `data[i - 1]` whitespace?". There the previous byte was always there to look at. Here it may be in a piece that's gone, so instead of looking back, the counter *remembers* the answer, in a variable called `in_word`. Starting with `in_word` false is the `i == 0` case: the edge of the data counts as whitespace.

A computation that moves between a fixed set of situations, called **states**, as each input arrives is a **state machine**. This one has two states, and its whole behaviour fits in a table:

| In state | Next byte is | Move to | And |
|---|---|---|---|
| between words | whitespace | between words | nothing |
| between words | anything else | in a word | count one word |
| in a word | whitespace | between words | nothing |
| in a word | anything else | in a word | nothing |

```predict
question: Start between words with 0 words counted, and feed the bytes of `a  b` one at a time (a, space, space, b). Which state are you in after the last byte, and how many words have been counted?
choice: Between words, 2 words
choice: In a word, 2 words
choice: In a word, 3 words
answer: In a word, 2 words
explain: a moves you into a word and counts 1. The first space moves you out; the second space keeps you out, counting nothing, which is why runs of spaces never matter. b moves you into a word and counts 2. The machine ends in a word, which is fine: finishing in a word doesn't count it again.
```

Now write it. Three functions together make the machine:

- `start()` returns the state before any input: nothing counted, not in a word.
- `feed(state, chunk)` takes the current state and the next piece, and returns the new state. It doesn't change the dictionary it's given; it builds a new one. For bytes and newlines the state is just a running total, because they add up. For words it's the count plus `in_word`. For your line rule it's `last`, the most recent byte seen, since a piece's last byte may not be the data's.
- `finish(state)` turns the final state into the counts. The line rule is applied here, once, at the true end of the data, and not at the end of every piece.

`chunk[-1]` is the last byte of the chunk, as a number; `NEWLINE = 10` names the number for `b"\n"`, so `finish` can compare against it. `measure` and `main` don't change in this step.

```python file=kit/count.py
import json
import sys

# ASCII whitespace, the six bytes from the definition of a word.
WHITESPACE = b" \t\n\r\x0b\x0c"
NEWLINE = 10  # the value of the byte b"\n"


# The counting: bytes in, counts out. It reads nothing and prints nothing.
def measure(data, encoding):
    try:
        characters = len(data.decode(encoding))
    except UnicodeDecodeError:
        characters = None
    lines = data.count(b"\n")
    if data and not data.endswith(b"\n"):
        lines += 1
    return {
        "bytes": len(data),
        "lines": lines,
        "words": len(data.split()),
        "characters": characters,
    }


# The same counting as a state machine, fed one piece at a time.
def start():
    return {"bytes": 0, "newlines": 0, "words": 0, "in_word": False, "last": None}


def feed(state, chunk):
    in_word = state["in_word"]
    words = state["words"]
    for byte in chunk:
        if byte in WHITESPACE:
            in_word = False
        elif not in_word:
            in_word = True
            words += 1
    last = state["last"]
    if chunk:
        last = chunk[-1]
    return {
        "bytes": state["bytes"] + len(chunk),
        "newlines": state["newlines"] + chunk.count(b"\n"),
        "words": words,
        "in_word": in_word,
        "last": last,
    }


def finish(state):
    lines = state["newlines"]
    if state["last"] is not None and state["last"] != NEWLINE:
        lines += 1
    return {"bytes": state["bytes"], "lines": lines, "words": state["words"]}


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

Save it. `count.py` itself behaves as before (`main` still uses `measure`), so try the machine directly, feeding it `hel` and then `lo`, a word cut in two:

```
.venv/bin/python -c "from count import start, feed, finish; print(finish(feed(feed(start(), b'hel'), b'lo')))"
```

It prints `{'bytes': 5, 'lines': 1, 'words': 1}`: one word, because after `hel` the state said "in a word", and `lo` continued it.

```predict
question: What is the state's `words` value after `feed(feed(start(), b'hel'), b'lo wor')`?
answer: 2
explain: hel starts word 1 and leaves the machine in a word. lo continues it, the space leaves it, and wor starts word 2. The machine is in a word again at the end, so if the next piece begins with ld, that continues word 2.
verify: cd kit; .venv/Scripts/python -c "from count import start, feed; print(feed(feed(start(), b'hel'), b'lo wor')['words'])"
```

Notice what `feed` is: a function from (state, input) to a new state. The state machine is built out of a function. The difference from `measure` is that `measure` must see all of its input in one call, while `feed` sees one piece and a summary of everything before it.

```check
run "cd kit; .venv/Scripts/python -c \"from count import start, feed, finish; print(finish(feed(feed(start(), b'hel'), b'lo')))\"" stdout="{'bytes': 5, 'lines': 1, 'words': 1}" -- start, feed and finish should count a word cut across two pieces once.
run "cd kit; .venv/Scripts/python -c \"from count import start, feed, finish; print(finish(feed(feed(start(), b'a\\n'), b'b')))\"" stdout="'lines': 2" -- finish should apply the final-line rule using the last byte of the data, not of each piece.
```

## A character cut in half

Words needed one remembered fact. Characters need more: when a piece ends in the middle of a character, the bytes seen so far must be kept until the rest arrive. Python already has a machine that does that, an **incremental decoder**.

`codecs.getincrementaldecoder("utf-8")` returns a maker of UTF-8 decoders, and calling it, with `()`, makes one. Each call to its `decode(chunk)` returns the text for the complete characters so far, and keeps any unfinished character's bytes inside itself until the next call. Try it on the `é` cut in half:

```
.venv/bin/python -c "import codecs; d = codecs.getincrementaldecoder('utf-8')(); print(len(d.decode(b'h\xc3')), len(d.decode(b'\xa9llo')))"
```

It prints `1 4`: first just `h`, because `\xc3` is only half a character; then `éllo`, once the other half arrived. At the end, `decode(b"", final=True)` means "no more bytes are coming". If an unfinished character is still waiting then, the data ended in the middle of a character, and it raises `UnicodeDecodeError`.

So the state gets two more entries: the decoder, and the characters counted so far. `start` now takes the encoding, because the decoder needs it. If the bytes turn out not to be text in that encoding, `feed` sets both entries to `None`, and every later piece skips decoding.

There's one honest catch. `feed` builds a new dictionary each time, but the decoder in it is the *same* decoder, and `decode` changes it. So once you've fed a state, the old state is no longer safe to reuse; only the newest one is. A value that changes itself, shared between two places, is exactly the subject of module 1.4.

```python file=kit/count.py
import codecs
import json
import sys

# ASCII whitespace, the six bytes from the definition of a word.
WHITESPACE = b" \t\n\r\x0b\x0c"
NEWLINE = 10  # the value of the byte b"\n"


# The counting: bytes in, counts out. It reads nothing and prints nothing.
def measure(data, encoding):
    try:
        characters = len(data.decode(encoding))
    except UnicodeDecodeError:
        characters = None
    lines = data.count(b"\n")
    if data and not data.endswith(b"\n"):
        lines += 1
    return {
        "bytes": len(data),
        "lines": lines,
        "words": len(data.split()),
        "characters": characters,
    }


# The same counting as a state machine, fed one piece at a time.
def start(encoding):
    return {
        "bytes": 0,
        "newlines": 0,
        "words": 0,
        "in_word": False,
        "last": None,
        "characters": 0,
        "decoder": codecs.getincrementaldecoder(encoding)(),
    }


def feed(state, chunk):
    in_word = state["in_word"]
    words = state["words"]
    for byte in chunk:
        if byte in WHITESPACE:
            in_word = False
        elif not in_word:
            in_word = True
            words += 1
    last = state["last"]
    if chunk:
        last = chunk[-1]
    characters = state["characters"]
    decoder = state["decoder"]
    if decoder is not None:
        try:
            characters += len(decoder.decode(chunk))
        except UnicodeDecodeError:
            characters = None
            decoder = None
    return {
        "bytes": state["bytes"] + len(chunk),
        "newlines": state["newlines"] + chunk.count(b"\n"),
        "words": words,
        "in_word": in_word,
        "last": last,
        "characters": characters,
        "decoder": decoder,
    }


def finish(state):
    lines = state["newlines"]
    if state["last"] is not None and state["last"] != NEWLINE:
        lines += 1
    characters = state["characters"]
    if state["decoder"] is not None:
        try:
            characters += len(state["decoder"].decode(b"", final=True))
        except UnicodeDecodeError:
            characters = None
    return {
        "bytes": state["bytes"],
        "lines": lines,
        "words": state["words"],
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

Save it, and feed the machine the two halves of `héllo\n`:

```
.venv/bin/python -c "from count import start, feed, finish; print(finish(feed(feed(start('utf-8'), b'h\xc3'), b'\xa9llo\n')))"
```

It prints `{'bytes': 7, 'lines': 1, 'words': 1, 'characters': 6}`, the same counts `count.py samples/hello.txt` gives for the whole file.

```check
run "cd kit; .venv/Scripts/python -c \"from count import start, feed, finish; print(finish(feed(feed(start('utf-8'), b'h\\xc3'), b'\\xa9llo\\n')))\"" stdout="'characters': 6" -- Keep an incremental decoder in the state so a character split across pieces is counted once.
run "cd kit; .venv/Scripts/python -c \"from count import start, feed, finish; print(finish(feed(start('utf-8'), b'h\\xc3')))\"" stdout="'characters': None" -- Data that ends halfway through a character isn't text: decode(b'', final=True) in finish should catch that.
```

## One table, every chunk size

Two examples worked. The specification tables from 01-01-03 hold many more, and they don't care how the counting is done. So check the machine against the same tables, fed in pieces of 1, 2, 3 and 4096 bytes. If its state is right, the piece size can't matter. A machine that counts correctly only for some piece sizes has a bug in what it remembers.

This version of `check_counts.py` has one `check` function that runs any table against `measure` and against the machine at every size, with a new table for characters. `count_word_starts` has done its job and goes: `feed` is the same algorithm in streaming form. Keep any extra rows you added to `LINE_EXAMPLES`. `got.count(expected) == len(got)` means every value in `got` equals `expected`.

```python file=kit/check_counts.py
from count import feed, finish, measure, start

# A word is a run of bytes that are not ASCII whitespace,
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

# Characters in UTF-8; None when the bytes aren't UTF-8 text.
CHARACTER_EXAMPLES = [
    (b"", 0),
    (b"h\xc3\xa9llo\n", 6),
    (b"\xe2\x80\x94", 1),
    (b"h\xe9llo", None),
    (b"h\xc3", None),
]

SIZES = [1, 2, 3, 4096]


# Feed data to the state machine in pieces of the given size.
def stream_counts(data, size):
    state = start("utf-8")
    for i in range(0, len(data), size):
        state = feed(state, data[i:i + size])
    return finish(state)


def check(name, examples):
    passed = 0
    for data, expected in examples:
        # The whole data at once, then in pieces of every size.
        got = [measure(data, "utf-8")[name]]
        for size in SIZES:
            got.append(stream_counts(data, size)[name])
        if got.count(expected) == len(got):
            passed += 1
        else:
            print("FAIL:", name, data, "expected", expected, "got", got)
    print(name, "passed:", passed, "of", len(examples))
    return len(examples) - passed


failed = check("words", WORD_EXAMPLES)
failed += check("lines", LINE_EXAMPLES)
failed += check("characters", CHARACTER_EXAMPLES)
```

Save it and run `.venv/bin/python check_counts.py`. It prints `words passed: 8 of 8`, `lines passed: 7 of 7` (more if you added rows) and `characters passed: 5 of 5`.

**Now break the machine on purpose.** In `count.py`'s `feed`, change `in_word = state["in_word"]` to `in_word = False`, so every piece starts as if at the edge of the data. That's the bug the pieces experiment had: forgetting state at a boundary.

```predict
question: With that change, run check_counts.py. In each FAIL line, `got` lists the result for the whole data, then pieces of 1, 2, 3 and 4096. Which of those five are still right?
choice: None of them
choice: Only the whole data
choice: The whole data and pieces of 4096
choice: All of them: in_word starts False anyway
answer: The whole data and pieces of 4096
explain: Every example is shorter than 4096 bytes, so at that size the data arrives as one piece, and a machine that forgets between pieces has nothing to forget. measure uses split, not the machine. Only the small sizes create boundaries, and at every boundary inside a word the broken machine counts a new word.
```

Run it. The first failure reads `FAIL: words b'hello' expected 1 got [1, 5, 3, 2, 1]`: one word fed a byte at a time became five. Read the evidence: the whole-data and 4096 results are right, so the counting logic is fine within a piece; the small sizes are wrong, so the fault is at the boundaries, in what is carried between pieces. A check that only ever fed the data as one piece would pass this bug every time. That's why the table runs at several sizes, including 1, where every byte is a boundary.

Change the line back to `in_word = state["in_word"]` and run the check again: all pass.

```check
run "cd kit; .venv/Scripts/python check_counts.py" stdout="characters passed: 5 of 5" without="FAIL" -- If words fail at small sizes, feed should start from in_word = state["in_word"], not False.
```

## Read a piece at a time

Now `main` can stream. A file opened with `open(path, "rb")` and `sys.stdin.buffer` both have a `read(n)` method that returns up to `n` bytes, and an empty `b""` once the input is used up. Empty bytes count as false in an `if`, so `if not chunk: break` leaves the loop at the end of the input. The new function `count_stream` reads 65536 bytes (64 KiB) at a time, a common size for this, and feeds each piece to the machine.

`measure` doesn't have to go. It becomes the machine fed one piece: all the data. Its old `split` version can be deleted safely, because the machine passes the same tables it did. `pieces.py` still works too, since `measure` keeps its name and meaning.

```python file=kit/count.py
import codecs
import json
import sys

# ASCII whitespace, the six bytes from the definition of a word.
WHITESPACE = b" \t\n\r\x0b\x0c"
NEWLINE = 10  # the value of the byte b"\n"
CHUNK_SIZE = 65536  # how many bytes to read at a time


# The counting as a state machine, fed one piece at a time.
def start(encoding):
    return {
        "bytes": 0,
        "newlines": 0,
        "words": 0,
        "in_word": False,
        "last": None,
        "characters": 0,
        "decoder": codecs.getincrementaldecoder(encoding)(),
    }


def feed(state, chunk):
    in_word = state["in_word"]
    words = state["words"]
    for byte in chunk:
        if byte in WHITESPACE:
            in_word = False
        elif not in_word:
            in_word = True
            words += 1
    last = state["last"]
    if chunk:
        last = chunk[-1]
    characters = state["characters"]
    decoder = state["decoder"]
    if decoder is not None:
        try:
            characters += len(decoder.decode(chunk))
        except UnicodeDecodeError:
            characters = None
            decoder = None
    return {
        "bytes": state["bytes"] + len(chunk),
        "newlines": state["newlines"] + chunk.count(b"\n"),
        "words": words,
        "in_word": in_word,
        "last": last,
        "characters": characters,
        "decoder": decoder,
    }


def finish(state):
    lines = state["newlines"]
    if state["last"] is not None and state["last"] != NEWLINE:
        lines += 1
    characters = state["characters"]
    if state["decoder"] is not None:
        try:
            characters += len(state["decoder"].decode(b"", final=True))
        except UnicodeDecodeError:
            characters = None
    return {
        "bytes": state["bytes"],
        "lines": lines,
        "words": state["words"],
        "characters": characters,
    }


# The counting as a function: all the bytes in, counts out.
def measure(data, encoding):
    return finish(feed(start(encoding), data))


# Read a stream a piece at a time, feeding each piece to the machine.
def count_stream(stream, encoding):
    state = start(encoding)
    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        state = feed(state, chunk)
    return finish(state)


# The program: read the input, count it, print the result.
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
            counts = count_stream(file, encoding)
    else:
        counts = count_stream(sys.stdin.buffer, encoding)

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

Save it and run three things:

- `.venv/bin/python check_counts.py`: all three tables still pass, now with `measure` built on the machine.
- `.venv/bin/python count.py samples/hello.txt`: 7 bytes, 1 line, 1 word, 6 characters, exactly as before.
- `.venv/bin/python count.py samples/latin1.txt latin-1`: 6 characters. The decoder gets the encoding the user chose.

```check
run "cd kit; .venv/Scripts/python check_counts.py" stdout="characters passed: 5 of 5" without="FAIL" -- measure should now be finish(feed(start(encoding), data)).
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="characters: 6" -- main should count the file with count_stream.
run "cd kit; .venv/Scripts/python count.py samples/latin1.txt latin-1" stdout="characters: 6" -- count_stream should pass the chosen encoding to start.
run "cd kit; .venv/Scripts/python count.py" stdin="a b\nc\n" stdout="words: 3" -- Standard input should be read with count_stream(sys.stdin.buffer, encoding).
run "cd kit; .venv/Scripts/python -c \"import count; count.CHUNK_SIZE = 1; print(count.count_stream(open('samples/hello.txt', 'rb'), 'utf-8'))\"" stdout="'characters': 6" -- count_stream should read CHUNK_SIZE bytes at a time until read returns empty bytes.
```

## Watch the memory

The point of streaming was memory, so measure it rather than trusting the argument. First make a 10 MB file, a short line repeated half a million times:

```
.venv/bin/python -c "open('big.txt', 'wb').write(b'the quick brown fox\n' * 500000)"
```

Python's standard `tracemalloc` module records the memory Python allocates. `tracemalloc.get_traced_memory()` returns two numbers, current use and the **peak** (the most in use at any moment since tracing started, or since `reset_peak()`); `[1]` is the peak. This script counts `big.txt` both ways and prints each peak in megabytes.

```python file=kit/memory_check.py
import tracemalloc

import count

tracemalloc.start()
with open("big.txt", "rb") as file:
    print(count.count_stream(file, "utf-8"))
print("streaming peak MB:", round(tracemalloc.get_traced_memory()[1] / 1000000, 1))

tracemalloc.reset_peak()
with open("big.txt", "rb") as file:
    data = file.read()
print(count.measure(data, "utf-8"))
print("whole-file peak MB:", round(tracemalloc.get_traced_memory()[1] / 1000000, 1))
```

```predict
question: Roughly what peaks will it report for the 10 MB file?
choice: About 10 MB for both
choice: Well under 1 MB streaming; at least 10 MB whole-file
choice: About 10 MB streaming; about 20 MB whole-file
answer: Well under 1 MB streaming; at least 10 MB whole-file
explain: Streaming holds one 64 KiB piece, its decoded text and the small state, whatever the file's size. Reading the whole file holds all 10 MB of bytes, and decoding them makes a second 10 MB copy as text, so the whole-file peak is nearer 20 MB.
```

Save it and run `.venv/bin/python memory_check.py`. Both lines of counts agree (10000000 bytes, 500000 lines, 2000000 words). On one Windows machine the peaks were 0.3 MB streaming and 20.0 MB whole-file; yours will be close. Make the file ten times bigger and the whole-file peak grows ten times, while the streaming peak stays where it is. You can delete `big.txt` afterwards (`Remove-Item big.txt` in PowerShell, `rm big.txt` on macOS or Linux).

**What else, and why not.** Streaming isn't free:

| Approach | Cost |
|---|---|
| Read everything, then `split()` (01-01-03) | Memory grows with the input, and nothing is printed until the input ends. Simplest, and fastest per byte: `split` runs inside Python's C code |
| Stream through a state machine in Python (chosen) | Memory stays fixed. But the `for byte in chunk` loop runs Python code once per byte: on the 10 MB file it took 0.8 seconds against 0.17 for reading and splitting, on one machine |
| Stream, but `split()` each piece and patch the boundaries | Fast and fixed memory, but every boundary needs special cases (did the piece start mid-word? end mid-word? mid-character?), and each case is a new place to be wrong. The every-size table would be the only thing keeping it honest |

```check
run "cd kit; .venv/Scripts/python -c \"open('big.txt', 'wb').write(b'the quick brown fox\\n' * 500000)\"" -- This makes big.txt, if it isn't there yet.
run "cd kit; .venv/Scripts/python memory_check.py" stdout="'words': 2000000" -- memory_check.py should count big.txt with count_stream and with measure.
```

## Three models of one program

You now have three ways to describe `count`, and each answers different questions.

| Model | `count` seen as | Answers questions like |
|---|---|---|
| **Function** | `measure(data, encoding)`: all the bytes in, the counts out | What should the output be for this input? Is it correct? (The specification tables are written in this model.) |
| **State machine** | `start`, `feed`, `finish`: a state, changed by each piece of input | What must be remembered between pieces? Does it work at every piece size? How much memory does it need? |
| **Process** | One run: it reads a stream, prints lines, and ends with an exit status | What happens when it's actually run: where the input comes from, where the output goes, how long it takes, and whether it succeeded |

None of the three is the "real" one. They're views of the same program, and a good engineer switches between them on purpose. A bug report that says "it hangs on my pipe" is a process question; "it counts one word as two" may be a state question; "what should it say for `a - b`?" is a function question.

The process model has one thing you haven't used yet. 01-01-02 said every process ends with an **exit status**, 0 for success and anything else for failure. `check_counts.py` prints FAIL lines, but its exit status is always 0, so a script that runs it, or a build system, can't tell a failure from a pass without reading the text. `sys.exit(1)` ends the process with status 1:

```python file=kit/check_counts.py
import sys

from count import feed, finish, measure, start

# A word is a run of bytes that are not ASCII whitespace,
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

# Characters in UTF-8; None when the bytes aren't UTF-8 text.
CHARACTER_EXAMPLES = [
    (b"", 0),
    (b"h\xc3\xa9llo\n", 6),
    (b"\xe2\x80\x94", 1),
    (b"h\xe9llo", None),
    (b"h\xc3", None),
]

SIZES = [1, 2, 3, 4096]


# Feed data to the state machine in pieces of the given size.
def stream_counts(data, size):
    state = start("utf-8")
    for i in range(0, len(data), size):
        state = feed(state, data[i:i + size])
    return finish(state)


def check(name, examples):
    passed = 0
    for data, expected in examples:
        # The whole data at once, then in pieces of every size.
        got = [measure(data, "utf-8")[name]]
        for size in SIZES:
            got.append(stream_counts(data, size)[name])
        if got.count(expected) == len(got):
            passed += 1
        else:
            print("FAIL:", name, data, "expected", expected, "got", got)
    print(name, "passed:", passed, "of", len(examples))
    return len(examples) - passed


failed = check("words", WORD_EXAMPLES)
failed += check("lines", LINE_EXAMPLES)
failed += check("characters", CHARACTER_EXAMPLES)

if failed > 0:
    sys.exit(1)
```

Save it. To see a process's exit status, run it and then ask the shell for the status of the last command:

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `.venv\Scripts\python check_counts.py` then `$LASTEXITCODE` | `.venv/bin/python check_counts.py` then `echo $?` |

With every table passing, the status is `0`. Now change one expected value, `(b"hello", 1)` to `(b"hello", 2)`, and run both commands again: a FAIL line, and status `1`. Put the 1 back.

```predict
question: What exit status does `count.py missing.txt` end with, for a file that doesn't exist?
explain: 1. count.py doesn't catch the FileNotFoundError, and a Python program that stops with an uncaught exception ends with status 1. The traceback goes to standard error and the status says "failed", so a script running count can tell, even if it never reads the error text. Run it and check with $LASTEXITCODE or echo $?.
```

```check
run "cd kit; .venv/Scripts/python check_counts.py" exit=0 stdout="characters passed: 5 of 5" -- With every row as in the lesson, check_counts.py should end with status 0.
contains kit/check_counts.py "sys.exit(1)" -- End check_counts.py with: if failed > 0: sys.exit(1)
run "cd kit; .venv/Scripts/python count.py missing.txt" exit=1 -- A missing file should end count with a non-zero status.
```

## Your turn: the longest line

Add a fifth count, `longest`: the length of the longest line. Use this specification:

> **longest** is the length in bytes of the longest line, not counting the newline byte that ends it. Lines are as your line definition says, so a final line with no newline counts. Empty input gives 0.

1. **Specification first.** Add a `LONGEST_EXAMPLES` table to `check_counts.py` and a line `failed += check("longest", LONGEST_EXAMPLES)`. Include at least: empty input; `b"a\n"`; a short line after a long one; a final line with no newline that's the longest; only newlines; and a line ending in `\r\n` (by this definition, the `\r` counts as a byte of the line). Decide every expected value from the sentence.
2. **Run it and watch it fail.**
3. **Decide what the machine must remember** between pieces. Then add it to `start`, `feed` and `finish`, and a `longest:` line to `main`'s output.

It must pass at every piece size, so the state is the design decision here, not the arithmetic.

```hints
nudge: Halfway through a line, when a piece ends, what do you need to know to carry on? And what do you need to know about the lines already finished?
concept: Two numbers: the length of the line in progress, which carries across a boundary like in_word does, and the longest finished line so far. On a newline byte, compare the line in progress with the longest and reset it to 0; on any other byte, add 1. The final line may have no newline, so finish must compare once more.
shape: start: "line_length": 0 and "longest": 0. feed: a loop over the chunk's bytes; if byte == NEWLINE, longest = max(longest, line_length) and line_length = 0, else line_length += 1; put both in the returned dictionary. finish: "longest": max(state["longest"], state["line_length"]). main: print("longest:", counts["longest"]).
answer: In start's dictionary add "line_length": 0 and "longest": 0. In feed, after the words loop:
~~~python
    line_length = state["line_length"]
    longest = state["longest"]
    for byte in chunk:
        if byte == NEWLINE:
            longest = max(longest, line_length)
            line_length = 0
        else:
            line_length += 1
~~~
and add "line_length": line_length and "longest": longest to the dictionary feed returns. In finish's dictionary add:
~~~python
        "longest": max(state["longest"], state["line_length"]),
~~~
In main, after the characters lines: print("longest:", counts["longest"]). One table:
~~~python
LONGEST_EXAMPLES = [
    (b"", 0),
    (b"a\n", 1),
    (b"abc\nde\n", 3),
    (b"ab\nabcd", 4),
    (b"\n\n", 0),
    (b"ab\r\n", 3),
]
~~~
Two tempting mistakes, and the rows that catch them. Leaving finish's max out gives 2 for b"ab\nabcd": the last line is never compared. Starting line_length at 0 in every feed, instead of taking it from the state, passes the whole-data run and fails at small sizes, like the in_word bug.
```

```check
run "cd kit; .venv/Scripts/python -c \"from count import measure; print([measure(d, 'utf-8')['longest'] for d in (b'', b'a\\n', b'abc\\nde\\n', b'ab\\nabcd', b'\\n\\n', b'ab\\r\\n')])\"" stdout="[0, 1, 3, 4, 0, 3]" -- longest is the longest line in bytes, without its newline; the final line counts even with no newline.
run "cd kit; .venv/Scripts/python -c \"from functools import reduce; from count import start, feed, finish; d = b'ab\\nabcd'; print('longest', finish(reduce(feed, [d[i:i + 1] for i in range(len(d))], start('utf-8')))['longest'])\"" stdout="longest 4" -- Fed one byte at a time, the machine must carry the line in progress across pieces.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="longest: 6" -- main should print a longest: line.
run "cd kit; .venv/Scripts/python check_counts.py" exit=0 -- Every table in check_counts.py should pass, at every size.
```

**What these checks establish, and what they don't.** They compute `longest` for six inputs as one piece, for one input a byte at a time, and on the sample file, and they run your tables. They don't read your `LONGEST_EXAMPLES`, so whether it has the boundary rows is yours to judge; and the last check passes whatever your table says, as long as your code agrees with it. Note the sample file's answer: `longest: 6`, though `héllo` is five characters, because the specification counts bytes. If you think a user would expect 5, that's a specification question, and the place to argue it is the sentence, before the code.

## What you can do now

- **State** is what a computation must remember between one input and the next. Find it by asking what you'd need to know if the input stopped here and resumed later. Counts that can't cross a boundary, like bytes, need only a running total; words need "am I inside one?"; characters need the unfinished bytes.
- A **state machine** is a set of states and a rule for each input: a table you can trace by hand, built from a function from (state, input) to the next state.
- Test a streaming computation at several piece sizes, including 1. A bug in what's remembered hides when the input arrives in one piece.
- The same program is a **function** (what output for this input), a **state machine** (what it remembers, how much memory), and a **process** (a run with streams and an exit status). Choose the model that fits the question.
- A process's exit status is how a program tells other programs whether it succeeded: 0 for success, anything else for failure.

```predict
question: A colleague's tool counts sentences in uploaded files and reads them in 64 KiB pieces. Users report that, very rarely, a big file has one sentence more than they expect; small files are always right. Using this lesson's models, where do you look first, and what test would you write?
explain: It's a state question: small files arrive in one piece, so they never meet a boundary, and the bug appears only when a sentence (or its full stop, or a multi-byte character) is cut across two pieces. That points at what the machine forgets between pieces. Write the specification table, if there isn't one, and run it with the pieces at several sizes, including 1; the failing size and row will show which state is missing.
```

**Next:** module 1.2 is logic: conditions as statements you can rewrite, simplify and check. Kit gets `filter`, which keeps the lines matching an AND / OR / NOT query, and a second project starts, Blockfall, a falling-block game in JavaScript. The catch from this lesson, a value that changes itself while two names share it, gets its own module, 1.4.
