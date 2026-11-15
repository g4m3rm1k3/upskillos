---
title: Place Value: Reading a File's Bytes in Hexadecimal
runtime: python
---

Since 01-01-01 you've known that `samples/hello.txt` holds seven bytes and `samples/latin1.txt` six, and that the difference is the é. But you've never seen the bytes themselves in a form made for reading them. Ask Python and it prints `b'h\xc3\xa9llo\n'`: the `\xc3` and `\xa9` are the two bytes of the é, written in **hexadecimal**. So are colour codes like `#ff8800`, memory addresses, network packets, error codes such as `0x80070005`, and every tool that shows raw bytes. This lesson starts module 1.3, on numbers as patterns of bits. It teaches how a digit's position gives it its value, in any base, and gives Kit a third tool, `hexdump`, which shows any file's bytes the way programmers read them.

**By the end you can:**

- Convert a number between decimal, binary, octal and hexadecimal in both directions by hand, and say what each digit's place is worth.
- Explain why two hexadecimal digits are exactly one byte, and convert between binary and hexadecimal by grouping bits.
- Read a hex dump: find a byte by its offset, and tell a byte's value from the character it might stand for.
- Write the conversion yourself, by repeated division, and check it against Python's own.

**You need:** module 1.1, in particular 01-01-01 (bytes, encodings, `samples/hello.txt` and `samples/latin1.txt`) and 01-01-04 (the `read(n)` loop). Commands run inside `kit`: `cd ../kit` if you're still in `blockfall`.

## Digits are worth their place

In `4096`, the `4` isn't worth four. It's worth four *thousand*, because of where it stands:

| Place | thousands | hundreds | tens | ones |
|---|---|---|---|---|
| Worth | 10³ = 1000 | 10² = 100 | 10¹ = 10 | 10⁰ = 1 |
| Digit | 4 | 0 | 9 | 6 |
| Gives | 4000 | 0 | 90 | 6 |

4000 + 0 + 90 + 6 = 4096. Each place is worth ten times the place to its right, and each digit says how many of that place's worth to take. That's **positional notation**, and ten is its **base**. You've met it with another base already: 01-01-01 read the bytes 104 and 105 as one number, the first byte counting 256s and the second counting ones. That was base 256.

Nothing makes ten special except our ten fingers. In base 2, **binary**, there are two digits, 0 and 1, and each place is worth twice the place to its right: 1, 2, 4, 8, 16 and so on. A binary digit is a **bit**. Python writes a binary number with the prefix `0b`, so `0b1101` is the bits 1, 1, 0, 1.

```predict
question: What number does 0b1101 stand for? Work it out from the places 8, 4, 2, 1.
answer: 13
explain: One 8, one 4, no 2, one 1: 8 + 4 + 0 + 1 = 13. Reading from the right, the places are worth 1, 2, 4, 8, each twice the last, just as decimal places are each ten times the last.
verify: cd kit; .venv/Scripts/python -c "print(0b1101)"
```

Python has two more prefixes: `0o` for base 8, **octal**, and `0x` for base 16, **hexadecimal** (hex, for short). Run this:

```
.venv/bin/python -c "print(0b1101, 0o17, 0xff, 0xff == 255)"
```

It prints `13 15 255 True`. Python reads each literal and stores the number it stands for; `print` then shows that number in decimal. `0xff == 255` is `True` because they aren't two numbers that happen to be equal: they're one number, written two ways. This is 01-01-01's distinction again. The value is the information; `0xff`, `255` and `0b11111111` are three representations of it.

```check
run "cd kit; .venv/Scripts/python -c \"print(0b1101, 0o17, 0xff, 0xff == 255)\"" stdout="13 15 255 True" -- 0b is binary, 0o octal, 0x hexadecimal; print shows each value in decimal.
```

## Sixteen digits, four bits

Base 16 needs sixteen digits, and decimal only has ten. Hexadecimal borrows letters for the rest: `a` is 10, `b` 11, `c` 12, `d` 13, `e` 14 and `f` 15. (Upper and lower case mean the same.) So `0xff` is 15 sixteens and 15 ones: 240 + 15 = 255.

Why sixteen? Because 16 = 2⁴: one hex digit says exactly what four bits say. Here are all sixteen:

| Hex | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bits | 0000 | 0001 | 0010 | 0011 | 0100 | 0101 | 0110 | 0111 | 1000 | 1001 | 1010 | 1011 | 1100 | 1101 | 1110 | 1111 |

A **byte** is eight bits, so it's always exactly two hex digits, from `00` to `ff` (0 to 255). That's why hex is the language of bytes: it's short, and each digit lines up with half a byte.

It also makes converting between binary and hex a matter of grouping. Take the first byte of UTF-8's é, 195. In binary it's `11000011`. Split it into groups of four from the right, `1100 0011`, and look each group up: `c`, `3`. So 195 is `0xc3`, the `\xc3` Python showed you.

Octal does the same with groups of three bits, since 8 = 2³. But eight bits don't split into threes: `11 000 011` is `0o303`, and the leftmost octal digit of a byte can only be 0 to 3. Octal survives where bits come in threes, like Unix file permissions (module 1.6), but for bytes, hex won.

Python spells a number in any of these bases with `format(value, spec)`. The spec `"b"` means binary, `"o"` octal, `"x"` hex. A width in front pads the result: `"08b"` means at least eight digits, padded with zeros.

```predict
question: The second byte of latin1.txt is 0xe9, the é in Latin-1. What is it in binary, as eight bits?
choice: 10011110
choice: 11101001
choice: 11100101
choice: 233
answer: 11101001
explain: Look up each hex digit: e is 1110 and 9 is 1001, so 0xe9 is 1110 1001, in the same order as the hex digits. No arithmetic needed: each hex digit is its own four bits. 10011110 puts the groups the wrong way round. 233 is right too, but in decimal: 14 × 16 + 9 = 233, the Unicode number 01-01-01 gave for é.
verify: cd kit; .venv/Scripts/python -c "print(format(0xe9, '08b'))"
```

Check your grouping, and the octal claim, with `.venv/bin/python -c "print(format(0xe9, '08b'), 0o303, 0b11000011)"`. It prints `11101001 195 195`.

```check
run "cd kit; .venv/Scripts/python -c \"print(format(0xe9, '08b'), 0o303, 0b11000011)\"" stdout="11101001 195 195" -- 0xe9 is 1110 1001; 0o303 and 0b11000011 are both 195.
```

## Converting by hand

**From a base to decimal**, multiply each digit by its place's worth and add, as for 4096. `0xc3` is 12 × 16 + 3 × 1 = 195.

**From decimal to a base**, go the other way: find the digits from the right, by repeated division. Here is 195 to hex. `//` is Python's whole-number division, and `%` is the remainder left over.

| n | n // 16 | n % 16 | digit |
|---|---|---|---|
| 195 | 12 | 3 | `3` |
| 12 | 0 | 12 | `c` |

Stop when `n` reaches 0. The digits came out right to left, `3` then `c`, so the answer is `c3`.

Why does this work? Every place except the ones place is worth a multiple of 16, so the remainder after dividing by 16 is exactly the ones digit. And the division drops that digit, shifting every other digit one place to the right, so the next remainder is the next digit. Decimal does the same with 10: `4096 % 10` is `6`, the ones digit, and `4096 // 10` is `409`, the rest.

```predict
question: Convert 200 to hexadecimal by repeated division.
choice: 8c
choice: c8
choice: 128
choice: d0
answer: c8
explain: 200 // 16 is 12 remainder 8, so the ones digit is 8. 12 // 16 is 0 remainder 12, which is the digit c. The first remainder is the rightmost digit, so the answer is c8. 8c writes the remainders in the order they came out, which puts the ones digit first. Check by multiplying out: 12 × 16 + 8 = 192 + 8 = 200, while 0x8c is 8 × 16 + 12 = 140.
verify: cd kit; .venv/Scripts/python -c "print(format(200, 'x'))"
```

Python converts the other way with `int(text, base)`: `int("c8", 16)` is 200. Check both directions with `.venv/bin/python -c "print(format(200, 'x'), int('c8', 16))"`, which prints `c8 200`.

```check
run "cd kit; .venv/Scripts/python -c \"print(format(200, 'x'), int('c8', 16))\"" stdout="c8 200" -- format(n, 'x') spells n in hex; int(text, 16) reads hex text back as a number.
```

## A first hexdump

Now Kit's tool. `hexdump` reads a file sixteen bytes at a time, with the `read(n)` loop from 01-01-04, and prints one line per piece: the **offset** of the line's first byte (how many bytes into the file it is, counting from 0), then the bytes in hex.

`hex(value)` spells a number in hex with the `0x` prefix: `hex(104)` is `"0x68"`. The slice `[2:]` drops the first two characters, leaving `"68"`. And `" ".join(…)` joins the pieces with spaces, as `b"\0".join` did in 01-02-04. **This version has two flaws. Don't fix them yet; find them in its output.**

```python file=kit/hexdump.py
import sys

WIDTH = 16  # how many bytes to show on each line


# One line of the dump: the offset of its first byte, then its bytes in hex.
def dump_line(offset, chunk):
    digits = " ".join(hex(byte)[2:] for byte in chunk)
    return hex(offset)[2:] + "  " + digits


# Read a stream sixteen bytes at a time, printing one line for each piece.
def dump(stream):
    offset = 0
    while True:
        chunk = stream.read(WIDTH)
        if not chunk:
            break
        print(dump_line(offset, chunk))
        offset += len(chunk)


def main():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "rb") as file:
            dump(file)
    else:
        dump(sys.stdin.buffer)


if __name__ == "__main__":
    main()
```

Like `count`, it reads standard input when given `-` or no file. Save it and run `.venv/bin/python hexdump.py samples/hello.txt`. It prints:

```
0  68 c3 a9 6c 6c 6f a
```

There's the é: `c3 a9`, the two bytes 195 and 169. Now run it on the Latin-1 file, `.venv/bin/python hexdump.py samples/latin1.txt`: `0  68 e9 6c 6c 6f a`. The same é is the single byte `e9` there. Both lines end in a lone `a`: the newline, byte 10.

```predict
question: samples/app.log is 122 bytes long. How many lines will hexdump print for it?
answer: 8
explain: Seven full lines of 16 bytes hold 112 bytes, and the last 10 bytes need an eighth line. The last line's offset is 112, and this version will print it in hex without a prefix, as 70, since 7 × 16 = 112.
verify: cd kit; .venv/Scripts/python -c "import math; print(math.ceil(len(open('samples/app.log', 'rb').read()) / 16))"
```

Run `.venv/bin/python hexdump.py samples/app.log`. The first and last lines:

```
0  69 6e 66 6f 3a 20 73 74 61 72 74 a 65 72 72 6f
10  72 3a 20 64 69 73 6b 20 66 75 6c 6c a 64 65 62
...
70  6e 66 6f 3a 20 64 6f 6e 65 a
```

Read the evidence:

1. **The lone `a`.** A newline is 10, and 10 in hex is one digit, `a`. `hex` writes as few digits as the value needs, so the bytes 0 to 15 come out one digit wide. On a line full of small bytes the columns drift, and you can no longer find the twelfth byte by counting columns. Is `a` the byte 10, or the start of `a0`? Only the spaces say.
2. **The offsets.** `10` on the second line isn't ten. It's hex: 1 × 16 + 0 = 16, the second line's first byte. A reader who forgets the base reads every offset wrong, and with no prefix and no fixed width, nothing in the output reminds them.

```check
run "cd kit; .venv/Scripts/python hexdump.py samples/hello.txt" stdout="68 c3 a9 6c 6c 6f" -- hexdump.py should print each byte of the file in hex.
```

## Fixed widths

The fix for both is the same: write every byte as exactly two digits, and every offset as exactly eight. `format(value, "02x")` does it: `x` for hex, `2` for at least two digits, and `0` to pad with zeros rather than spaces. So `format(10, "02x")` is `"0a"`, while `hex(10)[2:]` was `"a"`. Change `dump_line`:

```python file=kit/hexdump.py
import sys

WIDTH = 16  # how many bytes to show on each line


# One line of the dump: the offset of its first byte, then its bytes in hex.
# Every byte is exactly two hex digits, and the offset always eight.
def dump_line(offset, chunk):
    digits = " ".join(format(byte, "02x") for byte in chunk)
    return format(offset, "08x") + "  " + digits


# Read a stream sixteen bytes at a time, printing one line for each piece.
def dump(stream):
    offset = 0
    while True:
        chunk = stream.read(WIDTH)
        if not chunk:
            break
        print(dump_line(offset, chunk))
        offset += len(chunk)


def main():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "rb") as file:
            dump(file)
    else:
        dump(sys.stdin.buffer)


if __name__ == "__main__":
    main()
```

Save it and run `.venv/bin/python hexdump.py samples/app.log` again:

```
00000000  69 6e 66 6f 3a 20 73 74 61 72 74 0a 65 72 72 6f
00000010  72 3a 20 64 69 73 6b 20 66 75 6c 6c 0a 64 65 62
...
00000070  6e 66 6f 3a 20 64 6f 6e 65 0a
```

Every byte is two characters and every column lines up: the byte at offset `0x1c` is on the line `00000010`, in column `c` (counting the first column as `0`), and it's `0a`, the end of `error: disk full`. Eight-digit offsets are a convention, wide enough for 16⁸ bytes, 4 GiB. A bigger file doesn't break anything: `format` never cuts digits off, so its offsets just grow wider.

```check
run "cd kit; .venv/Scripts/python hexdump.py samples/hello.txt" stdout="00000000  68 c3 a9 6c 6c 6f 0a" -- Use format(byte, "02x") for each byte and format(offset, "08x") for the offset.
run "cd kit; .venv/Scripts/python hexdump.py samples/app.log" stdout="00000070  6e 66 6f 3a 20 64 6f 6e 65 0a" -- The last line of app.log starts at offset 0x70, 112.
```

## Bytes as text

A dump is easier to navigate when each line also shows its bytes as text, the way `count` sees ASCII. Not every byte stands for a printable character, though. In ASCII, the codes from `0x20` (the space) to `0x7e` (the tilde, `~`) are the printable characters; codes below `0x20` are controls such as the newline, and codes above `0x7e` aren't ASCII at all. So the dump shows a printable byte as its character, and anything else as a dot.

Three new pieces of Python:

- `chr(code)` is the character with that code: `chr(0x68)` is `"h"`.
- `low <= byte <= high` is a **chained comparison**: it means `low <= byte and byte <= high`.
- `text.ljust(width)` pads `text` with spaces on the right to at least `width` characters. A full line's hex is 16 × 3 − 1 = 47 characters (two digits and a space per byte, minus the last space), so padding every line's hex to 47 keeps the text column in the same place on a short last line.

```python file=kit/hexdump.py
import sys

WIDTH = 16  # how many bytes to show on each line
FIRST_PRINTABLE = 0x20  # the space, the first printable ASCII character
LAST_PRINTABLE = 0x7E  # the tilde, ~, the last one


# One byte as the ASCII character it stands for, or a dot if it isn't printable.
def shown(byte):
    if FIRST_PRINTABLE <= byte <= LAST_PRINTABLE:
        return chr(byte)
    return "."


# One line of the dump: the offset of its first byte, its bytes in hex,
# and the same bytes as text. A short last line is padded so the text lines up.
def dump_line(offset, chunk):
    digits = " ".join(format(byte, "02x") for byte in chunk)
    text = "".join(shown(byte) for byte in chunk)
    return format(offset, "08x") + "  " + digits.ljust(WIDTH * 3 - 1) + "  " + text


# Read a stream sixteen bytes at a time, printing one line for each piece.
def dump(stream):
    offset = 0
    while True:
        chunk = stream.read(WIDTH)
        if not chunk:
            break
        print(dump_line(offset, chunk))
        offset += len(chunk)


def main():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "rb") as file:
            dump(file)
    else:
        dump(sys.stdin.buffer)


if __name__ == "__main__":
    main()
```

Save it and dump all three samples. `samples/app.log` now reads:

```
00000000  69 6e 66 6f 3a 20 73 74 61 72 74 0a 65 72 72 6f  info: start.erro
00000010  72 3a 20 64 69 73 6b 20 66 75 6c 6c 0a 64 65 62  r: disk full.deb
...
00000070  6e 66 6f 3a 20 64 6f 6e 65 0a                    nfo: done.
```

and the two hello files:

```
00000000  68 c3 a9 6c 6c 6f 0a                             h..llo.
00000000  68 e9 6c 6c 6f 0a                                h.llo.
```

The UTF-8 é shows as *two* dots. The text column shows bytes, one character per byte, not characters: it doesn't decode UTF-8, so it can't know that `c3 a9` together are one é. That's 01-01-01's "7 bytes, 6 characters" made visible.

```check
run "cd kit; .venv/Scripts/python hexdump.py samples/app.log" stdout="00000070  6e 66 6f 3a 20 64 6f 6e 65 0a                    nfo: done." -- Pad the hex to WIDTH * 3 - 1 characters with ljust, then two spaces, then the text.
run "cd kit; .venv/Scripts/python -c \"from hexdump import dump_line; print(dump_line(0, b'hi')[59:], dump_line(0, bytes([126, 32, 127, 31]))[59:])\"" stdout="hi ~ .." -- The text column should start at the same place on every line; bytes from 0x20 to 0x7e print as themselves, others as dots.
run "cd kit; .venv/Scripts/python hexdump.py -" stdin="hi" stdout="68 69" -- With - , hexdump should read standard input.
```

## The file that holds 255

Here's a question that trips up even experienced programmers. Two files both "hold 255". One is a text file with `255` in it, as an editor would save it. The other holds a single byte whose value is 255. This script writes both. `bytes([255])` makes a bytes value from a list of numbers, one byte per number.

```python file=kit/make_numbers.py
# Two files that both "hold 255": one as text, one as a single byte.
with open("samples/255.txt", "wb") as file:
    file.write(b"255\n")
with open("samples/255.bin", "wb") as file:
    file.write(bytes([255]))
```

```predict
question: Save make_numbers.py and run it. What will hexdump show in the hex column for samples/255.txt?
choice: ff
choice: ff 0a
choice: 02 05 05 0a
choice: 32 35 35 0a
answer: 32 35 35 0a
explain: A text file holds character codes, not numbers. The characters 2, 5 and 5 have the ASCII codes 0x32, 0x35 and 0x35, and the newline is 0x0a. The digit characters 0 to 9 are the codes 0x30 to 0x39, so a digit's code is 0x30 plus the digit, and that's why 2 shows up as 32. Only samples/255.bin holds the byte ff.
verify: cd kit; .venv/Scripts/python -c "print(open('samples/255.txt', 'rb').read().hex(' '))"
```

Run `.venv/bin/python make_numbers.py`, then dump both files:

```
00000000  32 35 35 0a                                      255.
00000000  ff                                               .
```

Four bytes for the text, one for the number. To get the number back from the text, a program has to *parse* it: read each digit character, turn it into a digit, and add the digits up by place value. `int(b"255")` does exactly that. This is the information, representation and meaning distinction once more, and file formats choose between the two all the time: a text format such as JSON is easy to read in an editor; a binary one is smaller and needs no parsing.

Finally, the edge of a byte. Two hex digits reach `ff` and no further, so 255 is the largest byte. Try one more:

```
.venv/bin/python -c "bytes([256])"
```

It fails with `ValueError: bytes must be in range(0, 256)`. 256 needs nine bits, `1 0000 0000`, and a byte has eight. Storing bigger numbers takes several bytes and a rule for combining them, like the 256s-and-ones rule of 01-01-01. That's lesson 01-03-03.

```check
run "cd kit; .venv/Scripts/python make_numbers.py; .venv/Scripts/python hexdump.py samples/255.txt" stdout="32 35 35 0a" -- Run make_numbers.py; the text file holds the codes of the characters 2, 5, 5 and a newline.
run "cd kit; .venv/Scripts/python hexdump.py samples/255.bin" stdout="00000000  ff " -- samples/255.bin should hold the single byte 255.
```

**What else, and why not.** You'll rarely need to write a hex dumper. Plenty exist:

| Tool | Cost |
|---|---|
| `xxd` (comes with the Vim editor, and with Git for Windows) | Groups bytes in pairs (`696e 666f`), and can turn a dump back into a file; not installed everywhere |
| `hexdump -C` (macOS, Linux) | Close to this lesson's format; not on Windows |
| `od` (macOS, Linux) | One of the oldest Unix tools. Its name means "octal dump", and octal is still its default; `od -A x -t x1` gives hex offsets and bytes |
| `Format-Hex` (PowerShell) | Built into Windows; its own layout, and give it a file with `-Path`, since text piped into it has already been through PowerShell |
| `data.hex(" ")` in Python | One line for a short value; no offsets, no text column |

Writing one was the point: every column of `hexdump` is a place-value question, and from now on you can read any of these tools' output.

## Your turn: conversion by repeated division

Write `to_base(n, base)` in a new file, `bases.py`. It returns the digits of `n` (zero or more) in a base from 2 to 16 as a string, using the digits `0123456789abcdef`, with no prefix and no leading zeros. It must do the repeated division itself: no `format`, `hex`, `bin` or `oct`.

Then write `check_bases.py`, which imports `to_base` and checks it for every base from 2 to 16 and every `n` from 0 to 4096. A result is right when `int(result, base)` gives back `n` and, for bases 2, 8 and 16, it also equals Python's own `format` spelling. It prints the first few wrong results, then a line in the form `61455 cases, 0 differences`.

```hints
nudge: Do 195 to base 16 by hand again, as in the table, and notice the two things you did on each row: take the remainder, then divide. When did you stop?
concept: n % base is the rightmost digit, and n // base is what's left once it's dropped. Repeat until nothing is left. Each new digit goes on the left of the ones found so far. The digit for a remainder r is the character at position r in "0123456789abcdef".
shape: DIGITS = "0123456789abcdef". In to_base: start with an empty string; while n > 0, put DIGITS[n % base] in front of it, then set n to n // base; return the string. Then think about what that returns for n = 0. check_bases.py: two nested loops, for base in range(2, 17) and for n in range(4097); a dictionary {2: "b", 8: "o", 16: "x"} gives the format letter for the three bases Python can spell.
answer: bases.py:
~~~python
DIGITS = "0123456789abcdef"


# n (zero or more) written in a base from 2 to 16, by repeated division:
# each remainder is the next digit, working from the right.
def to_base(n, base):
    if n == 0:
        return "0"
    digits = ""
    while n > 0:
        digits = DIGITS[n % base] + digits
        n = n // base
    return digits
~~~
check_bases.py:
~~~python
from bases import to_base

# Python's own spelling of a number in the bases it has a letter for.
LETTERS = {2: "b", 8: "o", 16: "x"}

cases = 0
differences = 0
for base in range(2, 17):
    for n in range(4097):
        cases += 1
        digits = to_base(n, base)
        right = digits != "" and int(digits, base) == n
        if base in LETTERS:
            right = right and digits == format(n, LETTERS[base])
        if not right:
            differences += 1
            if differences <= 3:
                print("differ:", n, "in base", base, "gave", repr(digits))
print(cases, "cases,", differences, "differences")
~~~
The tempting slip is leaving out the n == 0 case. The loop never runs, and to_base returns an empty string: 0 has no digits at all. The check finds it in every base (15 differences), and int("", 2) on its own would fail with a ValueError, which is why the check tests for an empty result before calling int. Another valid version collects the digits in a list and reverses it at the end; the right-to-left order is the part that matters.
```

```check
run "cd kit; .venv/Scripts/python check_bases.py" stdout="61455 cases, 0 differences" -- check_bases.py should check every base from 2 to 16 and every n from 0 to 4096.
run "cd kit; .venv/Scripts/python -c \"from bases import to_base; print(to_base(0, 2), to_base(195, 16), to_base(255, 2), to_base(8, 8), to_base(35, 3))\"" stdout="0 c3 11111111 10 1022" -- to_base should give the digits with no prefix; 0 is "0".
run "cd kit; .venv/Scripts/python -c \"import inspect, bases; s = inspect.getsource(bases.to_base); print('format(' in s or 'hex(' in s or 'bin(' in s or 'oct(' in s)\"" stdout="False" -- to_base should do the division itself, without format, hex, bin or oct.
```

**What these checks establish, and what they don't.** They run your comparison over 61,455 cases, call `to_base` on five values (including 0 and a base Python can't spell, 3), and look for `format`, `hex`, `bin` and `oct` in its source. They don't check your comparison is honest: one that compared `to_base` with itself would print the same line. Its strength is that its reference, `int` and `format`, was written by someone else, so a misunderstanding of yours can't be in both. They don't try numbers above 4096 or bases above 16, and the source search can be fooled; read your function and ask whether it divides. And nothing here checks `hexdump` on a file bigger than one read, beyond `app.log`'s eight lines; dump a large file, say `big.txt` from 01-01-04 if you kept it, and check that the offsets count up by `10` per line.

## What you can do now

- In **positional notation** each place is worth the base times the place to its right, and each digit says how many of that worth to take. Decimal, binary, octal and hexadecimal differ only in the base.
- `0xff`, `255` and `0b11111111` are one value in three representations. Converting changes the spelling, never the number.
- To read digits, multiply by place value and add. To write them, divide repeatedly: each remainder is the next digit from the right.
- One hex digit is four bits, so a **byte** is exactly two hex digits, `00` to `ff`. Binary to hex is grouping bits in fours.
- A hex dump shows offsets in hex (`00000010` is 16), bytes as two digits each, and text one character per byte. A text file holding `255` holds `32 35 35 0a`, not `ff`.

```predict
question: A colour picker shows a web colour as #1e90ff: three bytes, for red, green and blue. What are the three values in decimal, and why does every such colour fit in exactly six hex digits?
explain: 1e is 1 × 16 + 14 = 30, 90 is 9 × 16 + 0 = 144, and ff is 255: red 30, green 144, blue 255, a bright blue. Each channel is one byte, from 0 to 255, and a byte is always exactly two hex digits, so three bytes are always six. In decimal the same colour would need between 3 and 9 digits, and you couldn't tell where one channel ends and the next begins without separators.
```

**Next:** 01-03-02 works on the bits themselves. Bitwise operations (and, or, xor, not, shifts and masks) pick bits out and set them, and Blockfall stores each board row as a single number, so "this row is full" becomes one comparison.
