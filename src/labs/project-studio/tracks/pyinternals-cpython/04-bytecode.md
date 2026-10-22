---
title: 4 — Python Bytecode: What the Interpreter Actually Executes
track: Python Internals — Inside CPython
trackOrder: 13
runtime: cpp
console: true
---

When you write Python, you write *source code*. But CPython never executes source code directly. First it compiles it to **bytecode** — a compact sequence of instructions for a simple stack-based virtual machine. That VM is implemented in a massive C function called `_PyEval_EvalFrameDefault` inside `Python/ceval.c`. In this lesson you'll use the `dis` module to peer into that bytecode, understand how the stack machine works, and even construct a code object by hand. You'll finish by reading the real CPython eval loop.

## Step 1 — Disassemble a Python function with `dis.dis`

**This step:** You write a Python function, disassemble it with `dis.dis`, and read the resulting instruction listing.

```python
import dis

def add_and_double(x, y):
    result = (x + y) * 2
    return result

dis.dis(add_and_double)
```

Typical output on CPython 3.11+:

```text
  2           0 RESUME                   0

  3           2 LOAD_FAST                0 (x)
              4 LOAD_FAST                1 (y)
              6 BINARY_OP               0 (+)
             10 LOAD_CONST               1 (2)
             12 BINARY_OP               5 (*)
             16 STORE_FAST               2 (result)

  4          18 LOAD_FAST                2 (result)
             20 RETURN_VALUE
```

Reading this left to right:
- **Column 1** (`2`, `3`, `4`): source line numbers
- **Column 2** (`0`, `2`, `4`…): byte offset of the instruction
- **Column 3** (`LOAD_FAST`, `BINARY_OP`…): the *opcode* name
- **Column 4** (`0`, `1`, `0`…): the *argument* — an index into local vars, constants, etc.
- **Parentheses**: human-readable interpretation of the argument

Each instruction is 2 bytes in CPython 3.6+ (one byte opcode + one byte argument), but "word codes" in CPython 3.12 use a different encoding. The key idea is the same: a flat array of integers, interpreted in pairs.

```check
run "python -c \"\nimport dis, io\ndef f(x): return x*2\nout = io.StringIO()\ndis.dis(f, file=out)\nprint('LOAD_FAST' in out.getvalue())\n\"" stdout="True" -- dis.dis should produce output containing LOAD_FAST
```

## Step 2 — Understand the code object attributes

**This step:** You inspect the `__code__` attribute of a function and read each field.

Every Python function carries a `__code__` object — a `PyCodeObject` in C — that stores everything the interpreter needs to execute it. Think of it as a compiled unit, similar to a `.pyc` file in memory.

```python
import dis

def greet(name, times=1):
    for i in range(times):
        msg = "Hello, " + name
    return msg

code = greet.__code__
print(f"co_filename  : {code.co_filename}")
print(f"co_name      : {code.co_name}")
print(f"co_argcount  : {code.co_argcount}")    # number of positional args
print(f"co_varnames  : {code.co_varnames}")    # local variable names
print(f"co_consts    : {code.co_consts}")      # constants (literals)
print(f"co_names     : {code.co_names}")       # global names used
print(f"co_stacksize : {code.co_stacksize}")   # max stack depth needed
print(f"co_flags     : {code.co_flags:#06x}")  # bitmask of function flags

print("\nRaw bytecode bytes:")
print(list(code.co_code))  # pairs of [opcode, arg, opcode, arg ...]
```

In CPython's C source (`Include/cpython/code.h`), `PyCodeObject` is a struct with approximately 30 fields. The ones above map directly to C struct members: `co_argcount`, `co_varnames`, `co_consts`, etc.

```check
run "python -c \"\ndef f(a, b): return a + b\nc = f.__code__\nprint(c.co_argcount == 2)\n\"" stdout="True" -- co_argcount should equal the number of positional arguments
```

## Step 3 — Trace through `LOAD_FAST` / `BINARY_OP` / `RETURN_VALUE`

**This step:** You manually trace the execution of a simple function step by step, watching the stack grow and shrink.

The CPython VM is a **stack machine** — instructions push values onto and pop values from an internal stack (an array of `PyObject*` pointers). There are no registers (unlike real hardware).

Let's trace `def f(x, y): return x + y` called as `f(3, 5)`:

```text
Initial stack:  []          locals: {x=3, y=5}

LOAD_FAST 0 (x)    → push locals[0] onto stack
Stack: [3]

LOAD_FAST 1 (y)    → push locals[1] onto stack
Stack: [3, 5]

BINARY_OP 0 (+)    → pop two items, call PyNumber_Add(3, 5), push result
Stack: [8]

RETURN_VALUE       → pop top of stack, return it to caller
Stack: []          result: 8
```

You can step through this with `dis.Bytecode`:

```python
import dis

def f(x, y):
    return x + y

print("Instructions with stack effect:")
for instr in dis.Bytecode(f):
    effect = dis.stack_effect(instr.opcode,
                              instr.arg if instr.arg is not None else 0)
    print(f"  {instr.offset:3d}  {instr.opname:<20} arg={instr.arg!s:<6} "
          f"stack_effect={effect:+d}")
```

The `stack_effect` tells you how many items each instruction adds (+) or removes (-) from the stack. The sum over an execution path always ends at 0 or 1 (for the return value).

```check
run "python -c \"\nimport dis\ndef f(x,y): return x+y\ninstrs = list(dis.Bytecode(f))\nnames = [i.opname for i in instrs]\nprint('RETURN_VALUE' in names or 'RETURN_CONST' in names)\n\"" stdout="True" -- The bytecode must contain a RETURN instruction
```

## Step 4 — Write bytecode by hand with `types.CodeType`

**This step:** You construct a `CodeType` object manually to create a function without writing Python source.

This is rarely done in production, but it reveals exactly what the runtime needs to execute a function. We'll build a function equivalent to `def f(): return 42`:

```python
import types, dis

# In CPython 3.11+, CodeType's __init__ signature changed.
# Use the co_replace / from_code approach for compatibility.
# Below targets CPython 3.8–3.10 signature for simplicity.

def make_return42():
    """Build: def f(): return 42  — by hand."""
    # Bytecode for:
    #   LOAD_CONST  0  (42)
    #   RETURN_VALUE
    bytecode = bytes([
        100, 0,   # LOAD_CONST index=0
        83,  0,   # RETURN_VALUE (no arg)
    ])

    return types.CodeType(
        0,                # co_argcount
        0,                # co_posonlyargcount
        0,                # co_kwonlyargcount
        0,                # co_nlocals
        1,                # co_stacksize (max 1 item at once)
        0,                # co_flags
        bytecode,         # co_code
        (42,),            # co_consts  — index 0 is 42
        (),               # co_names
        (),               # co_varnames
        "<handcrafted>",  # co_filename
        "f",              # co_name
        0,                # co_firstlineno
        b"",              # co_lnotab
    )

code = make_return42()
f = types.FunctionType(code, {})
print(f"Result: {f()}")    # Should print 42

print("\nDisassembly of hand-crafted function:")
dis.dis(code)
```

```check
run "python -c \"\nimport types, sys\n# Simple test: code objects have co_consts\ndef g(): return 99\nprint(99 in g.__code__.co_consts)\n\"" stdout="True" -- Literals appear in co_consts
```

## Step 5 — The `ceval.c` eval loop (reading real CPython source)

**This step:** You study the structure of CPython's main interpreter loop in `Python/ceval.c` and understand how it dispatches to each opcode handler.

The heart of CPython is the function `_PyEval_EvalFrameDefault` in `Python/ceval.c`. It is thousands of lines long, but its structure is simple. Here is a heavily simplified C sketch:

```c file=eval_loop_sketch.c
/*
 * eval_loop_sketch.c
 *
 * A simplified illustration of CPython's main eval loop.
 * The real version is in Python/ceval.c (thousands of lines).
 * This captures the essential dispatch structure.
 */

#include <stdio.h>
#include <stdint.h>

/* Simulated opcodes */
#define LOAD_CONST    100
#define BINARY_ADD    23
#define RETURN_VALUE  83

/* Simulated value stack */
typedef long PyObject;  /* just a long for this demo */
static PyObject stack[256];
static int stack_top = 0;

#define PUSH(v)  (stack[stack_top++] = (v))
#define POP()    (stack[--stack_top])

/* Simulated constants pool */
static PyObject consts[] = {0, 3, 5};  /* index 1=3, index 2=5 */

/*
 * The eval loop: fetch-decode-execute, over and over.
 * In CPython this is a giant switch() or computed-goto dispatch.
 */
PyObject eval_loop(uint8_t *bytecode, int len) {
    int pc = 0;  /* program counter — byte offset into bytecode */

    while (pc < len) {
        uint8_t opcode = bytecode[pc++];
        uint8_t arg    = bytecode[pc++];

        printf("pc=%2d  opcode=%-15d arg=%d\n", pc-2, opcode, arg);

        switch (opcode) {
            case LOAD_CONST:
                PUSH(consts[arg]);
                printf("       LOAD_CONST %ld  stack_top=%d\n", consts[arg], stack_top);
                break;

            case BINARY_ADD: {
                PyObject right = POP();
                PyObject left  = POP();
                PUSH(left + right);
                printf("       ADD %ld + %ld = %ld  stack_top=%d\n",
                       left, right, left+right, stack_top);
                break;
            }

            case RETURN_VALUE: {
                PyObject retval = POP();
                printf("       RETURN %ld\n", retval);
                return retval;
            }

            default:
                printf("       UNKNOWN OPCODE %d\n", opcode);
                return -1;
        }
    }
    return 0;
}

int main(void) {
    /*
     * Bytecode for: return 3 + 5
     *   LOAD_CONST  1   (3)
     *   LOAD_CONST  2   (5)
     *   BINARY_ADD  0
     *   RETURN_VALUE 0
     */
    uint8_t bytecode[] = {
        LOAD_CONST,   1,
        LOAD_CONST,   2,
        BINARY_ADD,   0,
        RETURN_VALUE, 0,
    };

    printf("=== Simulated CPython eval loop ===\n");
    long result = eval_loop(bytecode, sizeof(bytecode));
    printf("\nFinal result: %ld\n", result);
    return 0;
}
```

In the real `ceval.c`, CPython uses **computed gotos** (`goto *opcode_targets[opcode]`) instead of `switch` on compilers that support it (GCC, Clang). This is ~15% faster because it avoids the branch predictor mis-predictions that a `switch` generates.

```check
file eval_loop_sketch.c
run "gcc eval_loop_sketch.c -o eval_loop_sketch && ./eval_loop_sketch" stdout="Final result: 8" -- The simplified eval loop should compute 3 + 5 = 8
contains eval_loop_sketch.c "LOAD_CONST"
contains eval_loop_sketch.c "RETURN_VALUE"
contains eval_loop_sketch.c "switch (opcode)"
```

## Step 6 — Challenge: write a function that has fewer bytecode instructions

**This step:** You rewrite a Python function to minimise its bytecode instruction count and verify the improvement with `dis`.

```python
import dis

# Version 1: more instructions
def compute_v1(items):
    total = 0
    for x in items:
        total = total + x
    return total

# Version 2: fewer instructions
def compute_v2(items):
    return sum(items)

print("v1 instruction count:", len(list(dis.Bytecode(compute_v1))))
print("v2 instruction count:", len(list(dis.Bytecode(compute_v2))))

# Verify they produce the same result
data = list(range(100))
assert compute_v1(data) == compute_v2(data), "Results must match!"
print("Results match:", compute_v1(data))
```

```hints
nudge: Built-in functions like `sum`, `max`, `min`, `sorted`, and `map` push the loop into C, bypassing the Python eval loop entirely. They generate fewer Python bytecode instructions and run faster.
concept: Each Python bytecode instruction incurs overhead: bounds-check, dispatch, argument decode, reference count bumps. Fewer instructions means less eval-loop overhead. That's one reason `sum([...])` beats `total += x` in a loop.
shape: Look at `BINARY_OP`, `STORE_FAST`, `LOAD_FAST` counts in the v1 loop vs. the single `CALL` + `RETURN_VALUE` in v2. The reduction is dramatic.
```

```check
run "python -c \"\nimport dis\ndef v1(items):\n    t=0\n    for x in items: t+=x\n    return t\ndef v2(items): return sum(items)\nc1=len(list(dis.Bytecode(v1)))\nc2=len(list(dis.Bytecode(v2)))\nprint(c1 > c2)\n\"" stdout="True" -- The explicit loop version should have more bytecode instructions than sum()
```
