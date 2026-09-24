# Lesson 0.1: Compiling vs. Interpreting

*Phase 0 — Bridging Python → C++*
*Python anchor: "why do I need `g++` at all?"*

---

## The Python anchor

You've been running code like this your whole coding life:

```bash
python script.py
```

One command. It reads your file top to bottom and just *runs*, line by line. No separate build step, no `.exe`, nothing to "compile." If there's a typo on line 40, Python won't even notice until execution reaches line 40 — the rest of the file could be complete garbage and Python won't care until it gets there.

C++ refuses to do that. Before your program runs even once, an entire separate program — the **compiler** — has to read your whole file, translate it into machine code, and produce a binary. Only then can you run it. This lesson is about *why* that extra step exists and what it's actually doing.

## What "interpreting" means

When you run `python script.py`, here's roughly what happens:

1. The Python interpreter starts up.
2. It reads your source code and compiles it (yes, Python does a small internal compile step too!) into **bytecode** — a simplified instruction set, not real machine code.
3. The **Python Virtual Machine (PVM)** reads that bytecode one instruction at a time and executes it, translating each instruction into real CPU operations *as it goes*.

The key idea: the interpreter is a *program that is running while your program runs*. It's live, in memory, mediating every single instruction. That's why Python can do things like change a variable's type on the fly, or `eval()` a string as code mid-execution — there's a full interpreter standing right there, ready to handle whatever shows up.

## What "compiling" means

When you build a C++ program:

```bash
g++ hello.cpp -o hello
./hello
```

The first command does **all the work** before your program ever runs a single instruction. It goes through several distinct stages:

| Stage | What happens |
|---|---|
| **Preprocessing** | Handles `#include`, `#define`, and other directives — literally text substitution, before anything is "understood" |
| **Compilation** | Translates your C++ source into assembly language for your specific CPU architecture |
| **Assembly** | Turns that assembly into actual machine code (raw binary instructions) — this produces "object files" (`.o`) |
| **Linking** | Stitches your object files together with any libraries you used (like the standard library) into one final executable |

By the time `./hello` runs, there is no compiler in the room anymore. It's gone. What's left is a file made of raw instructions your CPU can execute directly — no translation layer, no mediator. That's the whole reason compiled C++ tends to run faster than interpreted Python: there's nothing standing between your code and the processor at runtime.

## Why this changes how you write code

This is the part that actually matters for you as a Python programmer walking into C++:

**Errors move earlier.** In Python, a `NameError` for a misspelled variable only shows up when that line executes — maybe never, if it's in a rarely-hit branch. In C++, the compiler reads your *entire* program before producing anything, so it catches an enormous class of mistakes (wrong types, undeclared variables, mismatched function signatures) before your program has run even once. This feels restrictive at first. It is also why huge C++ codebases don't spontaneously explode in production the way an untested Python branch can.

**There's a build step now, always.** Every time you change your code, you must recompile before you can see the effect. Python's edit-and-immediately-run loop is gone; you'll get used to `g++ file.cpp -o file && ./file` as a reflex.

**The compiler needs to know things up front.** This is your first real preview of *why* C++ has static types (Lesson 0.2) — the compiler can't translate `x + y` into a single fixed machine instruction unless it already knows, at compile time, whether `x` and `y` are integers, floats, or something else entirely.

## Try it yourself

**1. Write and run the Python version:**

```python
# hello.py
print("Hello from Python")
```

```bash
python hello.py
```

Instant. No separate build artifact appears anywhere.

**2. Write and compile the C++ version:**

```cpp
// hello.cpp
#include <iostream>

int main() {
    std::cout << "Hello from C++" << std::endl;
    return 0;
}
```

```bash
g++ hello.cpp -o hello
./hello
```

**3. Break it on purpose.** In `hello.cpp`, misspell `std::cout` as `std::ceut`. Run `g++ hello.cpp -o hello` again and read the error — notice it refuses to produce *any* executable at all, even though the mistake is on one line out of four. Now do the equivalent in Python (misspell `print` as `pint`) and notice Python is perfectly happy to sit there until you actually run the line.

**4. Look at the artifact.** After compiling, run `ls -la` in your directory. You'll see a new file, `hello` (or `hello.exe` on Windows) — that's a real binary. Try opening it in a text editor. It's unreadable. That's machine code, not source.

## What this cost / bought us

| | Python (interpreted) | C++ (compiled) |
|---|---|---|
| Time to see output | Instant | Must build first |
| When errors surface | At runtime, line by line | Before the program ever runs |
| Runtime speed | Slower — interpreter mediates every instruction | Fast — CPU runs raw machine code directly |
| Flexibility | Can generate/execute code at runtime | Fixed once compiled |
| What you ship | Your `.py` source (needs Python installed to run) | A standalone binary (no compiler needed to run it) |

Neither is "better" — they're different trade-offs of the same underlying question: *when* does your code get translated into something the CPU understands? Python defers that decision until the last possible second, for every line, every time it runs. C++ forces the decision once, up front, and then never thinks about it again.

---

**Next up: Lesson 0.2 — Static types: `int x = 5` vs `x = 5`**, where we start unpacking exactly what the compiler needed to know about `x` and `y` in that addition example above, and why C++ demands you tell it.
