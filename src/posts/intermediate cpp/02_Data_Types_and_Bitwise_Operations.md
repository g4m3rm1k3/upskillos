# Module 2: Data Types, Trade-offs, and Bitwise Operations

## Why this module matters

You already know `int`, `float`, `bool`. What "intermediate" adds is knowing *why* you'd pick one integer type over another, what actually happens in the bits when you do arithmetic or cast between types, and how to manipulate individual bits directly — which matters for performance, memory footprint, and later, for writing a hash function and a bitset-backed Set (this module's build).

---

## 1. Integer types and their trade-offs

C++ doesn't guarantee exact sizes for `int`, `long`, etc. — it guarantees *minimums*. On most modern desktop/server platforms (what you'll be using):

| Type | Typical size | Range (signed) | Range (unsigned) |
|---|---|---|---|
| `char` | 1 byte | -128 to 127 | 0 to 255 |
| `short` | 2 bytes | -32,768 to 32,767 | 0 to 65,535 |
| `int` | 4 bytes | ~-2.1B to 2.1B | 0 to ~4.3B |
| `long` | 4 or 8 bytes (platform-dependent!) | varies | varies |
| `long long` | 8 bytes | ~-9.2×10^18 to 9.2×10^18 | 0 to ~1.8×10^19 |

**Don't trust these numbers blindly** — always verify on your platform with `sizeof(type)` and `std::numeric_limits<type>::max()` (from `<limits>`).

If you need a *guaranteed* size, use the fixed-width types from `<cstdint>`: `int8_t`, `int16_t`, `int32_t`, `int64_t` and their `uint*_t` unsigned counterparts. These are what you should reach for when size genuinely matters (file formats, network protocols, memory-constrained embedded/manufacturing systems — relevant to your work).

### Trade-off: which integer type should you actually use?

| Situation | Recommendation | Why |
|---|---|---|
| General-purpose counting/indexing | `int` | Matches native word size on most platforms, fastest for arithmetic |
| Value must never be negative, and you need the extra range headroom | `unsigned int` | But see the pitfalls below — often `int` + a bounds check is safer |
| Large counts (file sizes, big collections) | `long long` or `std::size_t` | Won't silently overflow on the sizes you're dealing with |
| Format/protocol-defined exact widths (e.g. reading a sensor register in manufacturing/embedded work) | `int8_t`/`uint16_t`/etc. | Portable, exact — the whole point is that the size is guaranteed regardless of platform |
| Memory-constrained, many small values (e.g. large arrays of small counters) | smallest sufficient fixed-width type | Cuts memory footprint proportionally |

### The signed/unsigned trap

This is the single most common source of subtle bugs in intermediate C++ code.

```cpp
unsigned int a = 3;
unsigned int b = 5;
std::cout << (a - b);   // NOT -2! Wraps around to a huge positive number (4294967294)
```

**Why**: unsigned integers don't have negative numbers, so subtraction that "should" go negative wraps around (modular arithmetic, like an odometer rolling over).

```
unsigned int wraparound:

   0 ------------------------- 4,294,967,295
   ^                                        ^
   |<-- 3 - 5 wraps around to here ---------|
```

This bites people most often in loops:

```cpp
// BUG: if v.size() is 0, v.size() - 1 wraps to a huge number, loop runs "forever" (crashes)
for (unsigned int i = 0; i < v.size() - 1; i++) { ... }

// SAFER: compare against v.size(), not v.size() - 1
for (unsigned int i = 0; i + 1 < v.size(); i++) { ... }
```

`.size()` on STL containers returns `std::size_t`, which is unsigned — this exact bug shows up constantly in real code. **Rule of thumb**: prefer signed integers for anything involving subtraction or that could go negative, even if you "know" it shouldn't. Reserve unsigned for bit manipulation (this module) and cases where wraparound is actually the desired behavior.

### Overflow

Signed integer overflow is **undefined behavior** in C++ (not wraparound — the compiler is allowed to assume it never happens, which can produce surprising optimizations). Unsigned overflow is well-defined wraparound. This asymmetry is a real gotcha: don't assume signed overflow "just wraps like unsigned does" — test with `-fsanitize=undefined` and it will flag signed overflow for you.

---

## 2. Floating point trade-offs

```cpp
float f = 1.0f / 3.0f;    // 4 bytes, ~7 significant decimal digits
double d = 1.0 / 3.0;     // 8 bytes, ~15-17 significant decimal digits
```

### Trade-off: `float` vs `double`

| | `float` | `double` |
|---|---|---|
| Size | 4 bytes | 8 bytes |
| Precision | ~7 digits | ~15-17 digits |
| When to use | Large arrays where memory/cache footprint matters (graphics, ML tensors, sensor buffers) | Default choice for general computation |

**The precision trap**: floating point numbers can't exactly represent most decimal fractions (0.1 has no exact binary representation, similar to how 1/3 has no exact decimal representation). This means:

```cpp
double x = 0.1 + 0.2;
std::cout << (x == 0.3);   // false! x is actually 0.30000000000000004
```

**Never compare floats/doubles with `==`.** Instead, check if they're within a small tolerance (epsilon):

```cpp
bool nearlyEqual(double a, double b, double epsilon = 1e-9) {
    return std::abs(a - b) < epsilon;
}
```

This matters directly for manufacturing/engineering contexts — tolerance-based comparison is the correct mental model for physical measurements too, so it should feel familiar.

---

## 3. Bitwise operators

These operate on the individual bits of a value, not the value as a whole.

| Operator | Name | Example | Result |
|---|---|---|---|
| `&` | AND | `0b1100 & 0b1010` | `0b1000` |
| `\|` | OR | `0b1100 \| 0b1010` | `0b1110` |
| `^` | XOR | `0b1100 ^ 0b1010` | `0b0110` |
| `~` | NOT (complement) | `~0b0000` (8-bit) | `0b11111111` |
| `<<` | left shift | `0b0001 << 3` | `0b1000` |
| `>>` | right shift | `0b1000 >> 3` | `0b0001` |

```
  1100
& 1010
------
  1000     (AND: 1 only where BOTH bits are 1)

  1100
| 1010
------
  1110     (OR: 1 where EITHER bit is 1)

  1100
^ 1010
------
  0110     (XOR: 1 where bits DIFFER)
```

### Practical patterns you'll actually use

**Check if a bit is set:**
```cpp
bool isBitSet(unsigned int value, int bitPos) {
    return (value & (1u << bitPos)) != 0;
}
```

**Set a bit:**
```cpp
unsigned int setBit(unsigned int value, int bitPos) {
    return value | (1u << bitPos);
}
```

**Clear a bit:**
```cpp
unsigned int clearBit(unsigned int value, int bitPos) {
    return value & ~(1u << bitPos);
}
```

**Toggle a bit:**
```cpp
unsigned int toggleBit(unsigned int value, int bitPos) {
    return value ^ (1u << bitPos);
}
```

**Check if a number is a power of two (a classic interview/DSA trick):**
```cpp
bool isPowerOfTwo(unsigned int n) {
    return n != 0 && (n & (n - 1)) == 0;
}
// why it works: powers of 2 have exactly one bit set (e.g. 1000).
// n-1 flips that bit and sets everything below it (0111).
// ANDing them together always gives 0, ONLY for powers of two.
```

### Trade-off: bit flags vs. `std::vector<bool>` vs. `std::bitset`

A common use of bitwise ops is storing many boolean flags compactly:

| Approach | Memory for 32 flags | Fixed size? | Ease of use |
|---|---|---|---|
| `bool flags[32]` | 32 bytes (1 byte/bool typically) | Yes | Easiest, but wasteful |
| `unsigned int flags` + manual bit ops | 4 bytes | Yes | Compact, but you write the bit-fiddling yourself |
| `std::bitset<32>` | 4 bytes | Yes, at compile time | Compact AND has a clean `[]`/`.set()`/`.test()` API — best of both |
| `std::vector<bool>` | ~4 bytes (packed) | No, resizable | Packed like bitset, but has known quirks (it's not a "real" STL container — `operator[]` doesn't return a real `bool&`) |

**Recommendation**: for a fixed number of flags known at compile time, use `std::bitset<N>`. For a resizable flag collection, plain `unsigned` integers with manual bit ops (if you need it packed and fast) or `std::vector<bool>` (if convenience matters more) are your two real options.

### Bitmasks in practice

```cpp
enum Permission {
    READ    = 1 << 0,  // 0001
    WRITE   = 1 << 1,  // 0010
    EXECUTE = 1 << 2,  // 0100
    DELETE  = 1 << 3   // 1000
};

int userPerms = READ | WRITE;          // 0011, has read and write
bool canExecute = userPerms & EXECUTE; // false
userPerms |= EXECUTE;                  // grant execute: 0111
userPerms &= ~WRITE;                   // revoke write:  0101
```

This pattern (single int, bit-per-flag) shows up constantly in real systems code — file permissions, hardware register configuration, network protocol flags — because it's extremely compact and the bitwise ops are essentially free at the CPU level.

---

## 4. `sizeof`, alignment, and why struct layout isn't free

```cpp
struct Bad {
    char a;      // 1 byte
    int b;       // 4 bytes
    char c;      // 1 byte
};
std::cout << sizeof(Bad);   // likely 12, NOT 6!

struct Good {
    int b;       // 4 bytes
    char a;      // 1 byte
    char c;      // 1 byte
};
std::cout << sizeof(Good);  // likely 8
```

**Why**: the CPU reads memory most efficiently when data is *aligned* — an `int` wants to start at an address divisible by 4, for example. The compiler inserts invisible padding bytes to enforce this. `Bad` pads after `a` (3 bytes wasted) and after `c` (3 more bytes wasted) to keep `b` aligned and the struct's total size a multiple of the largest member's alignment. `Good` avoids most of this by ordering large members first.

```
Bad layout (12 bytes):
[a][pad][pad][pad][ b ][ b ][ b ][ b ][c][pad][pad][pad]

Good layout (8 bytes):
[ b ][ b ][ b ][ b ][a][c][pad][pad]
```

**Trade-off / rule of thumb**: when you have many instances of a struct (large arrays, or performance/memory-sensitive code — again, relevant if you're working with sensor data buffers or fixed records in manufacturing systems), order struct members from largest to smallest to minimize padding. For a handful of instances it rarely matters and readability should win instead.

---

## Practice Problems

1. **Wraparound demo**: Write a loop using `unsigned int i` counting down from 5 to 0 with `i--` and printing `i` each iteration, but write the loop condition incorrectly as `i >= 0`. Predict what happens before running it. (Hint: `i >= 0` is *always true* for unsigned types.) Fix it.

2. **Epsilon comparison**: Write a function that sums `0.1` ten times in a loop and compares the result to `1.0` with `==`. Confirm it's false. Then rewrite the comparison using an epsilon-based `nearlyEqual`.

3. **Bitmask permissions**: Implement the `Permission` enum pattern above as a small `class FilePermissions` that wraps an `unsigned int` and exposes `grant(Permission)`, `revoke(Permission)`, `has(Permission)` methods. (This is a preview of Module 3's OOP wrapping.)

4. **Count set bits**: Write `int countSetBits(unsigned int n)` two ways: (a) a simple loop checking each bit, (b) using Brian Kernighan's trick: `n & (n-1)` repeatedly clears the lowest set bit until `n` is 0 — count the iterations. Compare how many iterations each takes for `n = 0b10000000`.

5. **Struct padding**: Write two structs with the same fields in different orders (one to minimize padding, one to maximize it) and print `sizeof()` for both to confirm the difference on your platform.

6. **Build a tiny Bitset**: Implement a `class SimpleBitset` wrapping a single `unsigned long long` (64 bits) with `set(pos)`, `clear(pos)`, `test(pos)`, and `count()` (number of set bits) methods, using only the bitwise operators from this module — no `std::bitset`. This is your DSA build for this module: a fixed-size Set of integers 0-63, backed entirely by bit manipulation.

---

**Next: Module 3 — OOP Foundations + RAII, where you'll build a `DynamicArray` (a mini `std::vector`) and see exactly how constructors/destructors tie back to the memory management from Module 1.** Say "next module" when ready.
