---
title: Fixed Width: Negative Numbers, Overflow and Byte Order
runtime: python
---

A weather station logs a temperature every hour, two bytes per reading. Its first two bytes are `38 01`. Read them the way 01-01-01 read two bytes, the first counting 256s and the second ones, and you get 0x38 × 256 + 0x01 = 14,337. The station counts in tenths of a degree, so that's 1,433.7 °C. The station isn't broken. Its manual says the readings are **s16le**, and this lesson is about what those five characters mean. Each says something a sequence of bytes doesn't say about itself: how many bytes make one number (16 bits), whether the number can be negative (s, signed), and which byte comes first (le, little-endian). Last lesson left three questions open, and they're the same questions: why `~12` is `-13`, what happens when a number grows past its width, and in which order a number's bytes are stored. By the end, Kit's `hexdump` reads the station's file correctly.

**By the end you can:**

- Read a bit pattern of a given width both as unsigned and as two's complement, and give the range of values each can hold.
- Predict what fixed-width arithmetic does when the result doesn't fit, and simulate it in Python with a mask.
- Explain why `~x` is `-x - 1`, and why `>>` never takes a negative number to 0.
- Decode a number stored in several bytes, in either byte order, by hand and with `hexdump`; and tell from the numbers you get when you've read a file in the wrong format.
- Write the reverse, a function that turns a number into bytes and refuses one that doesn't fit.

**You need:** 01-03-01 (place value, hex, `hexdump.py`) and 01-03-02 (bitwise operators, masks and shifts; it used JavaScript, and Python's operators use the same symbols). Commands run inside `kit`: `cd ../kit` if you're still in `blockfall`.

This lesson uses Python, which is a strange choice at first sight: Python's integers never overflow, so you'll make every wraparound happen yourself, with a mask. That turns out to be the point. You see exactly which bits a fixed-width machine keeps. (C would show it natively, but would be a third language before module 1.4.)

## A file of numbers

This script writes two small binary files: the station's eight readings, and two readings from a clock that this lesson needs later. Each byte is given in hex.

```python file=kit/make_values.py
# Two binary files of numbers, as a weather station and a clock would write them.
# temps.bin: eight hourly temperatures, two bytes each.
# times.bin: two clock readings, four bytes each.
with open("samples/temps.bin", "wb") as file:
    file.write(bytes([
        0x38, 0x01, 0x00, 0x01, 0xb4, 0x00, 0x5f, 0x00,
        0x14, 0x00, 0xfb, 0xff, 0xdd, 0xff, 0xc4, 0xff,
    ]))
with open("samples/times.bin", "wb") as file:
    file.write(bytes([0xff, 0xff, 0xff, 0x7f, 0x00, 0x00, 0x00, 0x80]))
```

Save it, run `.venv/bin/python make_values.py` (on Windows, `.venv\Scripts\python make_values.py`, as in every lesson so far), and dump the station's file with `.venv/bin/python hexdump.py samples/temps.bin`:

```
00000000  38 01 00 01 b4 00 5f 00 14 00 fb ff dd ff c4 ff  8....._.........
```

The text column is no help: these bytes aren't characters. Read the first eight readings the 01-01-01 way, two bytes at a time with the first counting 256s, and you get 14,337, then 1, then 46,080 (`b4 00` is 180 × 256). In tenths of a degree that's 1,433.7 °C, then 0.1 °C an hour later, then 4,608 °C. Something is wrong, and by the end of the lesson you'll be able to say exactly what from the numbers alone.

```check
run "cd kit; .venv/Scripts/python make_values.py; .venv/Scripts/python hexdump.py samples/temps.bin" stdout="00000000  38 01 00 01 b4 00 5f 00 14 00 fb ff dd ff c4 ff" -- Run make_values.py; it writes samples/temps.bin, 16 bytes.
run "cd kit; .venv/Scripts/python hexdump.py samples/times.bin" stdout="ff ff ff 7f 00 00 00 80" -- make_values.py should also write samples/times.bin, 8 bytes.
```

## Counting in a fixed width

A car's odometer has, say, six wheels of digits. At 999,999 km, one more kilometre turns every wheel back to 0: the carry out of the leftmost wheel has nowhere to go. Hardware counts the same way. A computer adds numbers in registers of a fixed number of bits: 8, 16, 32 or 64. An 8-bit number holds 0 to 255. Add 1 to 255 (`1111 1111`) and the true answer, 256, is `1 0000 0000`: nine bits. The ninth is dropped, and the result is 0. This is **wraparound**, and a result that doesn't fit its width is an **overflow**.

(The odometer is a good picture of an unsigned counter, and only of that. It has no negative numbers, which this lesson needs next.)

Python's integers don't work that way. A Python `int` has **arbitrary precision**: it uses as many bits as its value needs, so it never overflows. `2**64` (`**` is Python's power operator) is 18,446,744,073,709,551,616, an ordinary Python number. To see what a fixed-width machine would keep, keep only its bits yourself, with a mask: `& 0xff` keeps 8 bits, `& 0xffff` keeps 16, and `& 0xffff_ffff` keeps 32. (Python lets you put `_` between digits for readability; it doesn't change the number.)

```
.venv/bin/python -c "print(2**64, (255 + 1) & 0xff, (2**32 + 5) & 0xffff_ffff, (0 - 1) & 0xff, -1 % 256)"
```

It prints `18446744073709551616 0 5 255 255`. Keeping the low 8 bits is the same as taking the remainder after dividing by 2⁸ = 256: the bits above the eighth are exactly the multiples of 256. That's why wraparound is called arithmetic **modulo** 2ⁿ, and why `(0 - 1) & 0xff` and `-1 % 256` agree. Note the last two: 0 − 1 in 8 bits is 255. Going down past 0 wraps to the top, as an odometer turned backwards would show 999,999.

One precedence fact, since 01-03-02 warned you about JavaScript's: in Python, arithmetic comes before shifts, shifts before `&`, and `&` before comparisons. So `0 - 1 & 0xff` means `(0 - 1) & 0xff`. The brackets above are for the reader.

```predict
question: An 8-bit counter holds 200, and 100 is added to it. What does it hold now? Work it out before running (200 + 100) & 0xff.
choice: 300
choice: 255
choice: 44
choice: 0
answer: 44
explain: The true sum is 300, which is more than 255, so it doesn't fit in 8 bits. The bits above the eighth are worth 256, and dropping them subtracts 256: 300 − 256 = 44. A counter doesn't stop at its largest value (255); it wraps past it and keeps going from 0.
verify: cd kit; .venv/Scripts/python -c "print((200 + 100) & 0xff)"
```

```check
run "cd kit; .venv/Scripts/python -c \"print(2**64, (255 + 1) & 0xff, (2**32 + 5) & 0xffff_ffff, (0 - 1) & 0xff, -1 % 256)\"" stdout="18446744073709551616 0 5 255 255" -- & 0xff keeps 8 bits, the same as % 256; Python's own int never overflows.
```

## Negative numbers in the same bits

Four bits make sixteen patterns. Read as an unsigned number, they're 0 to 15. But the station's readings go below zero, so some patterns must mean negative numbers. Which?

The obvious idea is to use the top bit as a sign and the other three as the size: `1101` would be −5. It's been used, and it has two problems. There are two zeros (`0000` and `1000`, "minus zero"). Worse, the adding circuit doesn't work any more: 5 + (−5) as bits is `0101 + 1101 = 1 0010`, which isn't zero. The hardware would need separate rules for signs.

The idea every modern computer uses comes from the last experiment: in 8 bits, 0 − 1 wrapped to 255. So *let 255 mean −1*. Then adding 1 to it wraps to 0, which is exactly what −1 + 1 should give, and the same adding circuit works for negative numbers too. Carried through, this is **two's complement**: it keeps the place values of binary, except that the top place counts *minus* its usual worth. In 4 bits the places are −8, 4, 2, 1:

| Bits | 0000 | 0001 | 0010 | 0011 | 0100 | 0101 | 0110 | 0111 | 1000 | 1001 | 1010 | 1011 | 1100 | 1101 | 1110 | 1111 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Unsigned | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| Signed | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | −8 | −7 | −6 | −5 | −4 | −3 | −2 | −1 |

`1011` is −8 + 2 + 1 = −5. Patterns with a 0 on top mean the same either way; patterns with a 1 on top are negative when signed. The top bit tells you the sign, but it is not "a sign bit plus a size": `1101` is −3, not −5. And try the sum that failed: `0101 + 1011 = 1 0000`, and dropping the fifth bit leaves `0000`. The circuit just works.

**The bits don't say which reading is meant.** `1111` is 15 to a program that reads it unsigned, and −1 to one that reads it signed. That's the "s" in the manual's `s16le`: the station chose signed, and nothing in the file records the choice.

Turning an unsigned reading into the signed one is one subtraction. When the top bit is set, unsigned reading counted it as +2ⁿ⁻¹ and it should have counted −2ⁿ⁻¹; the difference is 2ⁿ. So subtract 2ⁿ: in 4 bits, `1011` is 11 unsigned and 11 − 16 = −5 signed. Add this to `hexdump.py`, after `shown`. `1 << (bits - 1)` is the top bit's place, and `1 << bits` is 2ⁿ. **This version has one flaw. Don't fix it yet; find it in its output.**

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


# An unsigned value, `bits` wide, read as two's complement instead:
# the top bit's place is worth minus its usual value.
def signed(value, bits):
    if value > 1 << (bits - 1):
        return value - (1 << bits)
    return value


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

```predict
question: What does signed(0xfb, 8) give? 0xfb is the byte fb from the station's file.
answer: -5
explain: 0xfb is 251, and its top bit (128) is set, so it's negative when signed: 251 − 256 = −5. By place value: the 8-bit places are −128, 64, 32, 16, 8, 4, 2, 1, and fb is 1111 1011, so −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5.
verify: cd kit; .venv/Scripts/python -c "from hexdump import signed; print(signed(0xfb, 8))"
```

Save it. `hexdump.py` still dumps files as before (try it on `samples/temps.bin`). Now ask `signed` about four bytes:

```
.venv/bin/python -c "from hexdump import signed; print(signed(0x7f, 8), signed(0xfb, 8), signed(0xff, 8), signed(0x80, 8))"
```

It prints `127 -5 -1 128`. Three of those are right. Look at the last one before reading on.

```check
run "cd kit; .venv/Scripts/python -c \"from hexdump import signed; print(signed(0xfb, 8), signed(0xff, 8), signed(0x7f, 8), signed(0xfffb, 16))\"" stdout="-5 -1 127 -5" -- signed subtracts 1 << bits when the top bit is set.
run "cd kit; .venv/Scripts/python hexdump.py samples/temps.bin" stdout="00000000  38 01 00 01" -- hexdump.py should still dump files.
```

## The edge of the range

`signed(0x80, 8)` said 128. But the largest 8-bit signed number is `0111 1111`, 127: a signed byte *can't* hold 128. The output is impossible, which is how you know the function is wrong without knowing why yet.

Now find why. 0x80 is `1000 0000`: its top bit is set, so it's negative, −128 + 0 = −128. The test `value > 1 << (bits - 1)` asks "is value more than 128?", and for 128 itself the answer is no. The test should ask whether the top bit is set, which for every value from 128 up is `value >= 128`. One character, and only one input in 256 shows it: this kind of bug lives at the **boundary** of a range, which is exactly where to test. Fix it:

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


# An unsigned value, `bits` wide, read as two's complement instead:
# the top bit's place is worth minus its usual value.
def signed(value, bits):
    if value >= 1 << (bits - 1):
        return value - (1 << bits)
    return value


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

Save it and run the same command: `127 -5 -1 -128`. Then don't trust four values; check all 256. Python's `int.from_bytes(data, order, signed=True)` reads bytes as a signed number (the order argument comes later in this lesson; for one byte it makes no difference):

```
.venv/bin/python -c "from hexdump import signed; print(all(signed(v, 8) == int.from_bytes(bytes([v]), 'big', signed=True) for v in range(256)))"
```

It prints `True`. With the `>` version, exactly one of the 256 differed.

So an n-bit signed number runs from −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1: −128 to 127 in 8 bits, −32,768 to 32,767 in 16, about ±2.1 billion in 32. The range is lopsided, one more negative number than positive, because zero takes one of the patterns with a 0 on top. One consequence: in 8 bits, −(−128) is 128, which doesn't fit, and wraps back to −128.

**Overflow at the edge.** Add 1 to the largest signed byte: 127 + 1 is `1000 0000`, which signed is −128. `.venv/bin/python -c "from hexdump import signed; print(signed((127 + 1) & 0xff, 8))"` prints `-128`. The counter went from the largest positive number to the most negative one in one step. Unsigned numbers wrap at 255 → 0; signed numbers wrap at 127 → −128.

This isn't hypothetical. Many systems store time as a signed 32-bit count of seconds since the start of 1970. The largest such count is 2³¹ − 1:

```
.venv/bin/python -c "from datetime import datetime, timedelta; from hexdump import signed; print(datetime(1970, 1, 1) + timedelta(seconds=2**31 - 1), datetime(1970, 1, 1) + timedelta(seconds=signed(2**31, 32)))"
```

`datetime(1970, 1, 1) + timedelta(seconds=n)` is the moment n seconds after the start of 1970 (UTC). It prints `2038-01-19 03:14:07 1901-12-13 20:45:52`. One second after 03:14:07 UTC on 19 January 2038, a signed 32-bit clock wraps to December 1901. That's the **year 2038 problem**, and it's why systems are moving to 64-bit time. (A similar limit made news in 2014, when a music video's view count neared YouTube's 32-bit maximum of 2,147,483,647 and YouTube moved to 64-bit counters.)

```check
run "cd kit; .venv/Scripts/python -c \"from hexdump import signed; print(signed(0x80, 8), signed(0x7f, 8), signed(0x8000, 16), signed((127 + 1) & 0xff, 8))\"" stdout="-128 127 -32768 -128" -- The top bit is set for every value from 1 << (bits - 1) up, so test with >=, not >.
run "cd kit; .venv/Scripts/python -c \"from hexdump import signed; print(all(signed(v, 8) == int.from_bytes(bytes([v]), 'big', signed=True) for v in range(256)), all(signed(v, 16) == int.from_bytes(v.to_bytes(2, 'big'), 'big', signed=True) for v in range(65536)))\"" stdout="True True" -- signed should agree with int.from_bytes for every 8-bit and 16-bit value.
run "cd kit; .venv/Scripts/python -c \"from datetime import datetime, timedelta; from hexdump import signed; print(datetime(1970, 1, 1) + timedelta(seconds=signed(2**31, 32)))\"" stdout="1901-12-13 20:45:52" -- One second past 2**31 - 1, a signed 32-bit clock wraps to 1901.
```

**What else, and why not.** Every language chooses what happens at the edge, and you need to know which choice yours made:

| Language | What its integers do when a result doesn't fit |
|---|---|
| Python | Never happens: `int` grows. The cost is memory and speed, since a big number is stored in several pieces and every operation checks its size. Fixed widths only where you ask for them: masks, `int.to_bytes`, the `struct` module, NumPy arrays (whose fixed-width integers wrap) |
| Java, C#, Go | Wrap silently, like the masks above. C# can throw an error instead, inside `checked` code |
| C, C++ | Unsigned numbers wrap. Signed overflow is *undefined behaviour*: the language promises nothing, and compilers optimise on the assumption that it never happens, so the result can be stranger than a wrap |
| Rust | Stops the program with an error in a debug build; wraps in a release build, unless overflow checks are turned on. Functions such as `checked_add` and `wrapping_add` say which you mean |
| JavaScript | Ordinary numbers are 64-bit floating point, exact up to 2⁵³ (`2**53 + 1 === 2**53` is `true`); bitwise operators work in 32 bits, as 01-03-02 found; `BigInt` grows like Python's `int` |

Fixed width is fast and predictable in size, which is why hardware, file formats and network protocols use it. Arbitrary precision is never wrong, but its size and speed depend on the value. Neither is free.

## Flipping and shifting negative numbers

01-03-02 promised three explanations. Two's complement gives all three.

**Why `~12` is `-13`.** `~` flips every bit. Add any number to its flipped self and every bit position holds exactly one 1, with no carries: the result is all ones. In two's complement, all ones is −1. So x + ~x = −1, which means **~x = −x − 1**, in any width. That's why `~12` was `-13` in JavaScript (32 bits). It also gives the rule for negating a number by hand: −x = ~x + 1, "flip the bits and add one". In 4 bits, 5 is `0101`, flipped is `1010`, plus one is `1011`, which the table says is −5.

**Why `1 << 31` is negative in JavaScript.** JavaScript's bitwise operators treat a number as 32-bit two's complement. Bit 31 is the top bit, worth −2³¹, so a 1 there alone is −2,147,483,648.

**Why `countBits` never ended on a negative number.** Shifting right divides by 2. For a negative number to stay negative when halved, the top bit has to stay 1, so `>>` copies the top bit into the places it vacates: −8 >> 1 is −4. That's an **arithmetic shift**. But it means −1 (all ones) shifted right is still all ones: −1 >> 1 is −1, forever, and a loop waiting for 0 never stops. JavaScript also has `>>>`, a **logical shift**, which brings in 0s: `-1 >>> 1` is 2,147,483,647.

Python is the odd one out in how it gets the same answers. A Python `int` has no width, so what does `~` flip? Python's bitwise operators act as if a number had infinitely many bits, and a negative number has infinitely many 1s on the left. So `~12` is `-13` in Python too, and `-1 >> 1` is `-1` too: a `countBits` written in Python would hang on a negative number just the same. Python has no `>>>`. To treat a negative number as unsigned, choose a width and mask first: `(-1 & 0xff) >> 1` is 127.

```
.venv/bin/python -c "print(~12, -12 - 1, -8 >> 1, -1 >> 1, (-1 & 0xff) >> 1, 12 + ~12)"
```

It prints `-13 -13 -4 -1 127 -1`.

```predict
question: In 8 bits, what is ~12 & 0xff, as a number from 0 to 255? And what is that byte read as a signed number?
answer: 243
explain: 12 is 0000 1100, and flipped in 8 bits it's 1111 0011, which is 128 + 64 + 32 + 16 + 2 + 1 = 243 unsigned. Signed, the top place is −128: −128 + 115 = −13, the same −13 as ~12, because ~x = −x − 1 holds in every width. The bits are the same; only the reading differs.
verify: cd kit; .venv/Scripts/python -c "from hexdump import signed; print(~12 & 0xff, signed(~12 & 0xff, 8))"
```

```check
run "cd kit; .venv/Scripts/python -c \"print(~12, -12 - 1, -8 >> 1, -1 >> 1, (-1 & 0xff) >> 1, 12 + ~12)\"" stdout="-13 -13 -4 -1 127 -1" -- ~x is -x - 1; >> copies the top bit in, so -1 >> 1 stays -1.
```

## Which byte comes first

Back to the station. A 16-bit number takes two bytes. 1000 is 0x03e8, so its bytes are `03` (worth 256s) and `e8` (worth ones). Storing it means choosing an order, and both are in use:

- **Big-endian:** the byte worth the most first, `03 e8`, the way we write digits. 01-01-01's "first byte counts 256s" was big-endian.
- **Little-endian:** the byte worth the least first, `e8 03`.

Little-endian looks backwards, but it's what nearly every computer you'll use does in memory, including x86 and ARM machines (Python's `sys.byteorder` prints `little` on them). It puts the low byte at the lowest address, so the low 16 bits of a 32-bit number sit exactly where a 16-bit number would. Big-endian is the convention for network protocols (it's called **network byte order**), and file formats pick one and say so: PNG images are big-endian, WAV audio files little-endian. The names come from *Gulliver's Travels*, where two nations go to war over which end to crack an egg from. Danny Cohen borrowed them in a 1980 paper, to make the point that neither end is better as long as everyone agrees.

To read several bytes as one number, use place value in base 256, the multiply-and-add of 01-03-01. Take the bytes most significant first: multiply what you have by 256 and add the next byte. Multiplying by 256 is shifting left by 8 bits, and since the low 8 bits are then 0, adding the byte is the same as ORing it in: `value = (value << 8) | byte`. For little-endian, reverse the bytes first. `data[::-1]` is a slice with a step of −1: the whole value, read backwards, as a new bytes value. Add `unsigned` after `signed`:

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


# An unsigned value, `bits` wide, read as two's complement instead:
# the top bit's place is worth minus its usual value.
def signed(value, bits):
    if value >= 1 << (bits - 1):
        return value - (1 << bits)
    return value


# Several bytes as one unsigned number, in base 256. Big-endian puts
# the byte worth the most first; little-endian puts it last.
def unsigned(data, order):
    if order == "little":
        data = data[::-1]
    value = 0
    for byte in data:
        value = (value << 8) | byte
    return value


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

Trace `unsigned(bytes([0x03, 0xe8]), "big")`: value starts at 0; then (0 << 8) | 0x03 is 3; then (3 << 8) | 0xe8 is 768 + 232 = 1000. Little-endian `e8 03` is reversed to `03 e8` first and gives the same 1000. Save it and run:

```
.venv/bin/python -c "from hexdump import unsigned; print(unsigned(bytes([0x03, 0xe8]), 'big'), unsigned(bytes([0xe8, 0x03]), 'little'), unsigned(bytes([0x38, 0x01]), 'little'))"
```

It prints `1000 1000 312`. The station's first two bytes, `38 01`, read little-endian, are 0x0138 = 312: 31.2 °C. That's a temperature.

```predict
question: The station's second reading is the bytes 00 01. What is it, read little-endian? And read big-endian?
answer: 256
explain: Little-endian, the first byte is worth ones and the second 256s: 0 × 1 + 1 × 256 = 256, so 25.6 °C. Big-endian, the first is worth 256s: 0 × 256 + 1 = 1, so 0.1 °C. Same bytes, two numbers, and only the format says which is meant.
verify: cd kit; .venv/Scripts/python -c "from hexdump import unsigned; print(unsigned(bytes([0x00, 0x01]), 'little'))"
```

`int.from_bytes(data, order)` is Python's own version, so compare the two on every pair of bytes, both orders, 131,072 cases:

```
.venv/bin/python -c "from hexdump import unsigned; print(all(unsigned(bytes([a, b]), o) == int.from_bytes(bytes([a, b]), o) for a in range(256) for b in range(256) for o in ('little', 'big')))"
```

It prints `True`.

```check
run "cd kit; .venv/Scripts/python -c \"from hexdump import unsigned; print(unsigned(bytes([0x03, 0xe8]), 'big'), unsigned(bytes([0xe8, 0x03]), 'little'), unsigned(bytes([0x38, 0x01]), 'little'), unsigned(bytes([0xff, 0xff, 0xff, 0x7f]), 'little'))\"" stdout="1000 1000 312 2147483647" -- unsigned shifts left 8 and ORs in each byte, most significant first; reverse the bytes for little-endian.
run "cd kit; .venv/Scripts/python -c \"from hexdump import unsigned; print(all(unsigned(bytes([a, b]), o) == int.from_bytes(bytes([a, b]), o) for a in range(256) for b in range(256) for o in ('little', 'big')))\"" stdout="True" -- unsigned should agree with int.from_bytes for every pair of bytes, in both orders.
```

## hexdump reads numbers

Now give `hexdump` the formats. A format name says the three things the bytes don't: `s16le` is signed, 16 bits, little-endian, and `u32be` is unsigned, 32 bits, big-endian. (Many tools spell them this way; Rust calls the types `i16` and `u32` and has `from_le_bytes`, Python's `struct` module uses letter codes such as `<h`.) A dictionary maps each name to its three facts. `hexdump.py FILE FORMAT` will replace the text column with the numbers.

Four new pieces:

- `size, order, is_signed = FORMATS[fmt]` unpacks the dictionary's tuple into three names, the way a `for` loop over pairs unpacks each pair into two.
- `values_line` steps through the line in jumps of `size` with `range(0, len(chunk) - size + 1, size)`. The `- size + 1` makes the last start leave room for a whole value: for 5 bytes and size 2, the starts are 0 and 2, not 4. Bytes left over at the end of a file get no number, rather than half a number.
- `dump_line` and `dump` take the format as a third argument, `None` for the plain dump.
- `" ".join(FORMATS)` joins the dictionary's keys, for the error message: iterating over a dictionary gives its keys.

```python file=kit/hexdump.py
import sys

WIDTH = 16  # how many bytes to show on each line
FIRST_PRINTABLE = 0x20  # the space, the first printable ASCII character
LAST_PRINTABLE = 0x7E  # the tilde, ~, the last one

# The ways hexdump can read bytes as numbers.
# name: (bytes per value, byte order, signed)
FORMATS = {
    "u16le": (2, "little", False),
    "u16be": (2, "big", False),
    "s16le": (2, "little", True),
    "s16be": (2, "big", True),
    "u32le": (4, "little", False),
    "u32be": (4, "big", False),
    "s32le": (4, "little", True),
    "s32be": (4, "big", True),
}


# One byte as the ASCII character it stands for, or a dot if it isn't printable.
def shown(byte):
    if FIRST_PRINTABLE <= byte <= LAST_PRINTABLE:
        return chr(byte)
    return "."


# An unsigned value, `bits` wide, read as two's complement instead:
# the top bit's place is worth minus its usual value.
def signed(value, bits):
    if value >= 1 << (bits - 1):
        return value - (1 << bits)
    return value


# Several bytes as one unsigned number, in base 256. Big-endian puts
# the byte worth the most first; little-endian puts it last.
def unsigned(data, order):
    if order == "little":
        data = data[::-1]
    value = 0
    for byte in data:
        value = (value << 8) | byte
    return value


# A line's bytes read as numbers in one of the FORMATS. Only whole values:
# bytes left over at the end of a file get no number.
def values_line(chunk, fmt):
    size, order, is_signed = FORMATS[fmt]
    values = []
    for start in range(0, len(chunk) - size + 1, size):
        value = unsigned(chunk[start:start + size], order)
        if is_signed:
            value = signed(value, size * 8)
        values.append(str(value))
    return " ".join(values)


# One line of the dump: the offset of its first byte, its bytes in hex, and
# then the same bytes as text, or as numbers when a format is given.
def dump_line(offset, chunk, fmt):
    digits = " ".join(format(byte, "02x") for byte in chunk)
    if fmt is None:
        right = "".join(shown(byte) for byte in chunk)
    else:
        right = values_line(chunk, fmt)
    return format(offset, "08x") + "  " + digits.ljust(WIDTH * 3 - 1) + "  " + right


# Read a stream sixteen bytes at a time, printing one line for each piece.
def dump(stream, fmt):
    offset = 0
    while True:
        chunk = stream.read(WIDTH)
        if not chunk:
            break
        print(dump_line(offset, chunk, fmt))
        offset += len(chunk)


def main():
    args = sys.argv[1:]
    fmt = None
    if len(args) > 1:
        fmt = args[1]
        if fmt not in FORMATS:
            sys.exit("unknown format " + fmt + "; use one of: " + " ".join(FORMATS))
    if len(args) > 0 and args[0] != "-":
        with open(args[0], "rb") as file:
            dump(file, fmt)
    else:
        dump(sys.stdin.buffer, fmt)


if __name__ == "__main__":
    main()
```

Save it, and read the station's file the way its manual says, `.venv/bin/python hexdump.py samples/temps.bin s16le`:

```
00000000  38 01 00 01 b4 00 5f 00 14 00 fb ff dd ff c4 ff  312 256 180 95 20 -5 -35 -60
```

31.2, 25.6, 18.0, 9.5, 2.0, −0.5, −3.5, −6.0 °C: a desert night, cooling steadily. Without a format, `hexdump.py samples/temps.bin` still prints the text column, and `hexdump.py samples/temps.bin x16` stops with `unknown format x16; use one of: u16le u16be s16le s16be u32le u32be s32le s32be` and exit status 1.

**Reading the evidence of a wrong format.** Real files rarely come with a manual you trust, so learn the signatures of each mistake. Run the same file with the wrong formats:

```
.venv/bin/python hexdump.py samples/temps.bin u16be
.venv/bin/python hexdump.py samples/temps.bin u16le
```

```
00000000  38 01 00 01 b4 00 5f 00 14 00 fb ff dd ff c4 ff  14337 1 46080 24320 5120 64511 56831 50431
00000000  38 01 00 01 b4 00 5f 00 14 00 fb ff dd ff c4 ff  312 256 180 95 20 65531 65501 65476
```

1. **Wrong byte order:** neighbouring readings jump wildly (14,337, then 1, then 46,080) when the quantity should change smoothly. Small numbers become multiples of 256: `b4 00` should be 180 and reads as 180 × 256. When values that should be small are all multiples of 256, or 65,536 for 32-bit, swap the order.
2. **Unsigned where signed was meant:** the values are sensible, then suddenly sit just below 65,536 (2¹⁶). 65,531 is 65,536 − 5. When numbers cluster just under 2ⁿ, they're small negative numbers read unsigned.

Now the clock file, which holds two 32-bit times, little-endian:

```
.venv/bin/python hexdump.py samples/times.bin s32le
.venv/bin/python hexdump.py samples/times.bin u32le
```

```
00000000  ff ff ff 7f 00 00 00 80                          2147483647 -2147483648
00000000  ff ff ff 7f 00 00 00 80                          2147483647 2147483648
```

The two times are one second apart: 2038's last second and the one after. Read signed, the second wraps to −2³¹, December 1901. Read unsigned, it's just the next second, which is why some systems chose unsigned 32-bit time: it lasts until 2106, but can't represent any moment before 1970.

```check
run "cd kit; .venv/Scripts/python hexdump.py samples/temps.bin s16le" stdout="312 256 180 95 20 -5 -35 -60" -- s16le: two bytes per value, the low byte first, read as two's complement.
run "cd kit; .venv/Scripts/python hexdump.py samples/temps.bin u16be" stdout="14337 1 46080 24320 5120 64511 56831 50431" -- u16be: two bytes per value, the high byte first, unsigned.
run "cd kit; .venv/Scripts/python hexdump.py samples/times.bin s32le" stdout="2147483647 -2147483648" -- s32le: four bytes per value, low byte first, signed.
run "cd kit; .venv/Scripts/python hexdump.py samples/times.bin u32be" stdout="4294967167 128" -- u32be: four bytes per value, high byte first.
run "cd kit; .venv/Scripts/python -c \"from hexdump import values_line; print(values_line(bytes([1, 0, 2, 0, 3]), 'u16le') + '|')\"" stdout="1 2|" -- A leftover byte at the end gets no value.
run "cd kit; .venv/Scripts/python hexdump.py samples/hello.txt" stdout="68 c3 a9 6c 6c 6f 0a                             h..llo." -- Without a format, hexdump still shows the text column.
run "cd kit; .venv/Scripts/python hexdump.py samples/temps.bin x16" exit=1 stderr="unknown format x16" -- An unknown format should stop with a message and exit status 1.
```

**What else, and why not.** Python has standard tools for this, and real code should usually use them:

| Tool | Cost |
|---|---|
| `int.from_bytes(data, "little", signed=True)` and `n.to_bytes(size, "big", signed=…)` | One value at a time; you slice the bytes yourself |
| The `struct` module: `struct.unpack("<8h", data)` reads eight signed 16-bit little-endian values at once | Its own little language of letter codes (`<` little, `>` big, `h` signed 16-bit, `I` unsigned 32-bit); it's what most Python code that reads binary formats uses |
| `array` and NumPy arrays of a fixed-width type | Fast for millions of values; NumPy's integer types wrap like hardware, which can silently corrupt a sum |
| Writing it by hand, as here | Slow and easy to get wrong at the edges (you saw `>` versus `>=`); worth doing once, to know what the others do |

## Your turn: numbers into bytes

Write the reverse of `unsigned` and `signed`: a function `to_bytes(value, size, order)` in a new file, `pack.py`. It returns `size` bytes holding `value` in the given byte order (`"little"` or `"big"`). A negative value is stored in two's complement. A value that fits in neither reading, below −2ⁿ⁻¹ or above 2ⁿ − 1 for n = 8 × size bits, must raise a `ValueError`: a silent wraparound is exactly the bug this lesson has been about. Build the bytes with shifts and masks; don't call `int.to_bytes` inside it.

Then write `check_pack.py`. For sizes 1 and 2, both orders, and every value from one below the smallest signed value to one above the largest unsigned value (−129 to 256 for one byte), compare your function with Python's: `value.to_bytes(size, order, signed=value < 0)`. Python raises `OverflowError` where yours raises `ValueError`, so count those two as agreeing. (Python needs `signed=True` for a negative value: `(-5).to_bytes(2, "little")` fails with `can't convert negative int to unsigned`.) It prints the first few differences, then a line in the form `197384 cases, 0 differences`.

```predict
question: Before you write it, what bytes should to_bytes(-5, 2, "little") give, in hex? And to_bytes(300, 2, "big")?
explain: −5 in 16 bits is 2¹⁶ − 5 = 65,531 = 0xfffb, and little-endian puts the low byte first: fb ff, exactly the station's sixth reading. 300 is 0x012c, and big-endian puts the high byte first: 01 2c. Mask to the width first, then split into bytes; the mask is what turns −5 into its two's complement pattern.
```

```hints
nudge: unsigned put bytes together with << 8 and |. Taking a number apart is the reverse: which operations get one byte out of a number, and which byte do you get first?
concept: value & 0xff is the lowest byte; (value >> 8) & 0xff the next one up; (value >> (8 * i)) & 0xff the byte worth 256 to the power i. Masking a negative value to the width first, value & ((1 << bits) - 1), gives its two's complement pattern as an ordinary unsigned number. Bytes come out low first, which is little-endian; reverse them for big-endian. Check the range before masking, because the mask is what would hide an overflow. raise ValueError("message") stops the function with that error, the way the bytes([256]) of 01-03-01 stopped with one.
shape: bits = size * 8. If value < -(1 << (bits - 1)) or value >= 1 << bits, raise ValueError. Mask value to bits. Build a list with a for loop over range(size), appending (value >> (8 * i)) & 0xff. Reverse it for "big" (pieces[::-1]). Return bytes(pieces). check_pack.py: loops over size, value and order; a try/except around each side, putting None in place of the result when it raises; compare; count.
answer: pack.py:
~~~python
# value as `size` bytes in the given byte order; a negative value in
# two's complement. A value that doesn't fit raises ValueError, rather than wrapping.
def to_bytes(value, size, order):
    bits = size * 8
    if value < -(1 << (bits - 1)) or value >= 1 << bits:
        raise ValueError(str(value) + " does not fit in " + str(size) + " bytes")
    value = value & ((1 << bits) - 1)
    pieces = []
    for i in range(size):
        pieces.append((value >> (8 * i)) & 0xff)
    if order == "big":
        pieces = pieces[::-1]
    return bytes(pieces)
~~~
check_pack.py:
~~~python
from pack import to_bytes

cases = 0
differences = 0
for size in (1, 2):
    bits = size * 8
    # From one below the smallest signed value to one above the largest unsigned one.
    for value in range(-(1 << (bits - 1)) - 1, (1 << bits) + 1):
        for order in ("little", "big"):
            cases += 1
            try:
                expected = value.to_bytes(size, order, signed=value < 0)
            except OverflowError:
                expected = None
            try:
                got = to_bytes(value, size, order)
            except ValueError:
                got = None
            if got != expected:
                differences += 1
                if differences <= 3:
                    print("differ:", value, size, order, "gave", got, "expected", expected)
print(cases, "cases,", differences, "differences")
~~~
The tempting slip is leaving out the range check. Masking makes every value "fit", so 256 in one byte silently becomes 00, and the check finds 8 differences: the four out-of-range values (−129, 256, −32,769, 65,536) in both orders. The boundary slip, value > 1 << bits, lets exactly 256 and 65,536 through: 4 differences. Building the bytes with value // 256 ** i % 256 is another valid version; in Python it works even for negative numbers, without the mask, because // and % round towards minus infinity.
```

```check
run "cd kit; .venv/Scripts/python check_pack.py" stdout="197384 cases, 0 differences" -- check_pack.py should compare to_bytes with int.to_bytes for sizes 1 and 2, both orders, from one below the signed range to one above the unsigned range.
run "cd kit; .venv/Scripts/python -c \"from pack import to_bytes; print(to_bytes(1000, 2, 'little').hex(' '), to_bytes(-5, 2, 'big').hex(' '), to_bytes(-1, 4, 'little').hex(' '), to_bytes(0x12345678, 4, 'big').hex(' '))\"" stdout="e8 03 ff fb ff ff ff ff 12 34 56 78" -- to_bytes should put the low byte first for little, the high byte first for big, and store negatives in two's complement.
run "cd kit; .venv/Scripts/python -c \"import unittest, pack; t = unittest.TestCase(); t.assertRaises(ValueError, pack.to_bytes, 2**32, 4, 'big'); t.assertRaises(ValueError, pack.to_bytes, -2**31 - 1, 4, 'little'); print('refused')\"" stdout="refused" -- A value that doesn't fit in size bytes should raise ValueError, at size 4 too.
run "cd kit; .venv/Scripts/python -c \"import inspect, pack; print('.to_bytes(' in inspect.getsource(pack.to_bytes))\"" stdout="False" -- Build the bytes with shifts and masks, without calling int.to_bytes.
```

**What these checks establish, and what they don't.** They run your comparison over 197,384 cases, try four values by hand (including size 4, which your comparison doesn't cover), check that two values just outside the 32-bit range are refused, and look for `.to_bytes(` in your function's source. Your comparison's strength is the boundaries: one below and one above each range is where `>` and `>=` differ, and where a missing check lets a wrap through. They don't check that `check_pack.py` is honest; one that compared `to_bytes` with itself would print the same line. Earlier, the `hexdump` checks read three of the eight formats on two small files; they don't check a format on a file longer than one line. Make one and look: `.venv/bin/python hexdump.py samples/app.log u32le` reads text as numbers, which is meaningless but should give four numbers per line, and two on the last line, whose 10 bytes leave 2 over.

## What you can do now

- A fixed width keeps n bits and drops the rest: arithmetic wraps **modulo 2ⁿ**. In Python, whose `int` never overflows, `& (2**n - 1)` shows what a fixed width keeps.
- **Two's complement** keeps binary's place values but makes the top place negative, so the same adding circuit works for negative numbers. n bits hold −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1 signed, 0 to 2ⁿ − 1 unsigned. The bits never say which reading is meant.
- Overflow wraps 255 → 0 unsigned and 127 → −128 signed, silently in most languages. Test at the edges of a range: that's where `>` and `>=` differ.
- ~x = −x − 1, and −x = ~x + 1. `>>` copies the top bit in, so −1 >> 1 is −1 forever; JavaScript's `>>>` brings in 0s.
- A number stored in several bytes needs a byte order: **big-endian** puts the most significant byte first, **little-endian** the least. Read with `value = (value << 8) | byte`, reversing the bytes first for little-endian. A wrong order makes small values multiples of 256; wrong signedness puts them just under 2ⁿ.

```predict
question: A game saves a player's score as s8, a signed byte. The file holds 9c. What score is that? And if the player had 100 points and won 100 more, what would the file hold, and what would the game show?
explain: 0x9c is 156, top bit set, so signed it's 156 − 256 = −100. 100 + 100 = 200 = 0xc8, which fits in a byte unsigned but not signed: the file holds c8, and the game shows 200 − 256 = −56. The player loses points by winning them. The fix is a wider type or a check that refuses the overflow, never a silent wrap: this is the to_bytes ValueError, and module 1.10 is about errors like it.
```

**Next:** module 1.4 is about names and the objects they refer to. 01-04-01 asks what `a = b` does in Python and JavaScript: whether it copies the thing or just gives it a second name, and why that difference causes more bugs than any number format.
