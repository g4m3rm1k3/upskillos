# Module 4.5: Header Files, `#pragma once`, and the Compilation Model

## Why this module exists

Every class you've built so far (`DynamicArray`, `LinkedList`, `Shape`) has lived in one `.cpp` file for simplicity. Real C++ projects split code across a `.h` (declaration) and a `.cpp` (implementation), and understanding *why* — and what `#pragma once` actually does — requires understanding how C++ actually compiles. This module also directly sets up Module 5: templates have a wrinkle in this model that you need to see coming.

---

## 1. Declaration vs. definition

A **declaration** tells the compiler "this name exists, here's its type/signature" without providing the full implementation. A **definition** provides the actual implementation (for functions) or full layout (for classes/variables).

```cpp
// declaration
int add(int a, int b);

// definition
int add(int a, int b) { return a + b; }
```

A class can be split the same way:

```cpp
// DynamicArray.h — the DECLARATION (the "interface")
class DynamicArray {
private:
    int* data;
    int capacity;
    int count;
public:
    DynamicArray();
    ~DynamicArray();
    void push_back(int value);
    int get(int index) const;
    int size() const;
};
```

```cpp
// DynamicArray.cpp — the DEFINITION (the "implementation")
#include "DynamicArray.h"

DynamicArray::DynamicArray() : data(nullptr), capacity(0), count(0) {}

DynamicArray::~DynamicArray() { delete[] data; }

void DynamicArray::push_back(int value) {
    // ... actual logic ...
}

int DynamicArray::get(int index) const { return data[index]; }

int DynamicArray::size() const { return count; }
```

Note the `DynamicArray::` prefix in the `.cpp` — that's the scope resolution operator, saying "this is the definition of `push_back` that belongs to the `DynamicArray` class declared elsewhere."

### Why bother splitting at all?

- **Compilation speed**: other files that just want to *use* `DynamicArray` only need to `#include "DynamicArray.h"` — a short file. They don't need to re-parse the (possibly long) implementation every time they compile. Change the implementation without changing the interface, and only `DynamicArray.cpp` needs recompiling.
- **Interface/implementation separation**: the `.h` file is the "contract" — what the class can do. Users of the class shouldn't need to read the implementation to use it correctly.
- **Multiple files can share one class**: if three different `.cpp` files all need `DynamicArray`, they all `#include "DynamicArray.h"`, but the implementation exists exactly once in `DynamicArray.cpp`.

---

## 2. The compilation model: what `#include` actually does

`#include` is not a C++ language feature — it's a **preprocessor directive**, handled before real compilation even starts. It does something almost embarrassingly simple: **it textually pastes the contents of the included file in, verbatim**, as if you'd copy-pasted it by hand.

```
main.cpp:
  #include "DynamicArray.h"
  int main() { ... }

After preprocessing (roughly):
  class DynamicArray { ... };   <- pasted in from DynamicArray.h
  int main() { ... }
```

Each `.cpp` file, after preprocessing, becomes a **translation unit** — this is what the compiler actually compiles, independently, into an object file (`.o`). The **linker** then stitches all the object files together into one executable, resolving references between them (e.g., `main.cpp` calling a function defined in `DynamicArray.cpp`).

```
DynamicArray.cpp --> [compiler] --> DynamicArray.o  --\
                                                          --> [linker] --> final executable
main.cpp          --> [compiler] --> main.o           --/
```

This is why a header-only change (adding a comment, say) doesn't require relinking anything else, but changing a `.cpp` file only requires recompiling *that* file, not the whole project — a huge deal on large codebases.

---

## 3. The problem `#pragma once` solves

Because `#include` is just "paste this text in," if the same header gets included twice into one translation unit (directly, or indirectly through two other headers that both include it), you get the class **declared twice** in the same file:

```cpp
// A.h
#include "DynamicArray.h"

// B.h
#include "DynamicArray.h"

// main.cpp
#include "A.h"
#include "B.h"   // DynamicArray.h now gets pasted in TWICE
```

This causes a compile error — the compiler sees `class DynamicArray { ... };` defined twice in the same translation unit and rejects it (violates the One Definition Rule, section 4).

**The fix**: put this at the very top of every header file:

```cpp
#pragma once

class DynamicArray {
    // ...
};
```

`#pragma once` tells the compiler "only include this file's contents once per translation unit, no matter how many times it's `#include`d." The second (and any later) `#include "DynamicArray.h"` in the same translation unit becomes a no-op.

### The older, more portable alternative: include guards

`#pragma once` isn't technically part of the C++ standard (it's a near-universally supported compiler extension), so older or highly portable codebases sometimes use manual **include guards** instead, which achieve the identical effect using only standard preprocessor features:

```cpp
#ifndef DYNAMIC_ARRAY_H
#define DYNAMIC_ARRAY_H

class DynamicArray {
    // ...
};

#endif
```

**How it works**: the first time this file is included, `DYNAMIC_ARRAY_H` isn't defined yet, so the `#ifndef` (if-not-defined) block runs, defining the macro and declaring the class. Any subsequent `#include` of the same file checks `#ifndef DYNAMIC_ARRAY_H` again — but now it *is* defined, so everything between `#ifndef` and `#endif` is skipped entirely.

### Trade-off: `#pragma once` vs. include guards

| | `#pragma once` | Include guards |
|---|---|---|
| Lines of boilerplate | 1 | 3 (open, define, close) |
| Standard C++? | No (but supported everywhere in practice: GCC, Clang, MSVC) | Yes, pure standard preprocessor |
| Risk of naming collision | None | Technically possible if two headers pick the same guard macro name (rare in practice with a good naming convention) |
| What modern codebases use | Most new projects | Older codebases, or projects targeting exotic/legacy compilers |

**Recommendation**: use `#pragma once` unless you have a specific portability reason not to (targeting an obscure embedded compiler, for instance — which is a real consideration if you're touching manufacturing/embedded toolchains at work). Both solve exactly the same problem; `#pragma once` is just less typing.

---

## 4. The One Definition Rule (ODR)

The underlying rule both mechanisms above are protecting you from violating: **a class, function, or variable may have only one definition across the entire program** (multiple *declarations* are fine — that's normal — but only one definition).

```cpp
// if this function body appears, unguarded, in a header included by two .cpp files:
int add(int a, int b) { return a + b; }   // DEFINITION in a header

// A.cpp: #include "math.h"   -> gets a full definition of add()
// B.cpp: #include "math.h"   -> gets ANOTHER full definition of add()
// linker sees TWO definitions of add() across the program -> "multiple definition" LINKER error
```

This is a different failure mode than the double-`#include`-in-one-file problem — this happens at **link time**, across separate translation units, and `#pragma once`/include guards *don't* protect against it, because each `.cpp` file only includes the header once; the problem is that two different translation units each get their own copy of a full function definition.

**This is why function definitions normally go in `.cpp` files, not headers** — only the declaration goes in the header, so each translation unit that includes it just gets a promise ("this function exists somewhere"), and the linker finds the *one* real definition in the corresponding `.cpp` file.

### The exceptions: when definitions ARE allowed in headers

- **`inline` functions**: the `inline` keyword (original meaning, separate from its modern "maybe inline this call" optimization hint) tells the compiler "it's OK if this definition appears in multiple translation units — treat them as the same definition, don't error." Small utility functions are sometimes marked `inline` and defined directly in the header for convenience.
- **Templates**: this is the important one, and it's why this module exists right before Module 5. A template isn't a concrete function/class until it's *instantiated* with a specific type, and each translation unit that uses `Stack<int>` needs to see the *full template definition* (not just a declaration) to generate that instantiation itself. Because of this, **template definitions almost always go directly in the header**, not split into a `.cpp` file — a deliberate exception to the "definitions belong in .cpp" convention you just learned. You'll write templates this way starting next module.
- **Class definitions themselves**: the class *declaration* (its member variable layout and method signatures) is a definition too, technically — but it's specifically permitted to appear identically in multiple translation units (that's the whole reason `#pragma once`/include guards exist to control it) precisely because the compiler needs to see the full class layout in every file that uses that class.

---

## 5. Forward declarations (a preview tool)

Sometimes you don't need a header's full contents — you just need the compiler to know a name exists, e.g. when only using a pointer/reference to a type:

```cpp
// instead of #include "DynamicArray.h" here...
class DynamicArray;   // forward declaration: "trust me, this class exists"

class Container {
    DynamicArray* arr;   // OK — a pointer doesn't need the full class layout, just the name
};
```

This can meaningfully speed up compilation on large projects (avoiding pulling in a whole header's worth of content just to declare a pointer member) and is also the standard fix for **circular includes** (`A.h` needs to reference `B`, and `B.h` needs to reference `A` — directly `#include`ing each other creates an infinite loop the preprocessor has to break; a forward declaration in one of them solves it).

---

## Practice Problems

1. **Split a class**: Take your `DynamicArray` from Module 3 and split it into `DynamicArray.h` (declarations only) and `DynamicArray.cpp` (definitions, using `DynamicArray::` scope resolution). Write a separate `main.cpp` that includes the header and uses the class. Compile with `g++ main.cpp DynamicArray.cpp -o test` and confirm it links and runs.

2. **Trigger a double-include compile error on purpose**: Remove `#pragma once` from your header, create two other headers `A.h` and `B.h` that both `#include "DynamicArray.h"`, then `#include` both `A.h` and `B.h` in `main.cpp`. Compile and read the "redefinition" error. Add `#pragma once` back and confirm it compiles.

3. **Trigger a linker "multiple definition" error on purpose**: Put a full function *definition* (not just a declaration) directly in a header with no `inline` keyword, include that header from two separate `.cpp` files, and compile+link both together. Read the linker's "multiple definition" error and note how it's different in wording/timing from problem 2's compiler error (compile-time vs. link-time).

4. **Fix it with `inline`**: Add `inline` to the function from problem 3 and confirm the same code now links successfully.

5. **Forward declaration exercise**: Create two classes, `Engine` and `Car`, where `Car` holds an `Engine*` member. Implement it two ways: (a) `Car.h` fully `#include`s `Engine.h`, (b) `Car.h` only forward-declares `class Engine;` and the actual `#include "Engine.h"` moves to `Car.cpp` (where the full definition is actually needed, e.g., to call `Engine`'s methods). Confirm both compile, and think through why (b) is generally preferred when only a pointer/reference is needed in the header.

---

**Next: Module 5 — Templates & Operator Overloading**, where you'll make `Stack` and `Queue` generic and see firsthand why template definitions live in the header, per section 4 above. Say "next module" when ready.
