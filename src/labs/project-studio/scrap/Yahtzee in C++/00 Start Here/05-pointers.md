---
title: Side lab — pointer logic, addresses and absence
track: Start here — one file before classes
runtime: none
---

Given a pointer trace, distinguish changing an address from changing the pointed-to object.

## Follow a selection

There are two dice, a and b. `int* selected` declares a pointer: an object whose value can designate an int. `&a` takes a's address. In the expression `*selected`, the star follows the pointer to the int; this is called dereferencing. The star in a declaration and the star in an expression play different roles.

`selected = &b` changes which object is selected. `*selected = 3` changes the selected object's integer. Draw two boxes for a and b and an arrow for selected; move the arrow only on pointer assignments.

```cpp file=scratch/pointers.cpp
#include <iostream>

int main() {
    int a = 2;
    int b = 5;
    int* selected = &a;
    *selected = 6;
    selected = &b;
    *selected = 3;
    std::cout << a << " " << b << '\n';
    selected = nullptr;
    if (selected != nullptr) {
        std::cout << *selected << '\n';
    }
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/pointers.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="6 3" label="Observe the result"
```

```predict
question: After selected = nullptr, is *selected safe to read?
choice: No — no int is designated
choice: Yes — it reads zero
answer: No — no int is designated
explain: nullptr denotes absence. Dereferencing it is undefined behavior; compare before dereferencing.
```

## Read the const in each position

| Declaration | Change the pointer? | Change the int through it? |
|---|---|---|
| `int* p = &a` | Yes | Yes |
| `const int* p = &a` | Yes | No |
| `int* const p = &a` | No | Yes |
| `const int* const p = &a` | No | No |

A reference normally expresses a required existing object. A pointer can express an optional selection and can be reseated. Neither syntax by itself owns the target or extends its lifetime. Here the local integers own their storage; do not delete pointers to them. `new` and `delete` are unnecessary for selecting a die.

## Try it — Read the direction of an assignment

Replace `*selected = 6` with `selected = &b`. Predict the two printed values before running (2 and 3). Restore it. Add a separate `const int* view = &a` and try assigning through `*view`; compilation must reject that assignment. Remove the illegal line. Never demonstrate a dangling pointer by running it: an apparently successful run proves nothing.

## Your turn — Explain and change it

Write setSelected(int* selected, int value): return false for nullptr; otherwise change the designated int and return true. Test both cases and prove the unselected die stays unchanged.

```hints
nudge: A pointer parameter is itself copied, but its copied address still designates the same int.
concept: Check absence before accessing the target.
shape: Return a bool; branch on nullptr before *selected = value. Include a trace showing pointer value versus pointee value.
```
