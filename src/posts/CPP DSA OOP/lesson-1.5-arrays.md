# Lesson 1.5: Arrays — Fixed-Size, Contiguous, No Bounds Checking

*Phase 1 — Memory: The Thing Python Hides From You*

---

## The Python anchor

```python
values = [10, 20, 30]
values.append(40)     # grows freely
print(values[10])     # IndexError — caught, safe, with a message
```

A Python `list` grows whenever you want, and reaching past its end raises a clear, catchable exception. Neither of those things is true of a raw C++ array, and understanding exactly why not is this lesson's entire job — it's also the reason `std::vector` (and your own `MyVector`, next lesson) exist at all.

## What an array actually is

```cpp
int arr[5];              // an array of 5 ints, ON THE STACK
int arr2[5] = {1, 2, 3, 4, 5};   // initialized
```

Here's the literal, physical truth of what this line does: it reserves **exactly 5 × `sizeof(int)`** — 20 bytes on most systems — as one single, unbroken block of memory, back to back, with no gaps. Not five separate boxes scattered around wherever there's room — five boxes glued directly together in a row, in order. This property is called **contiguity**, and it's the single most important fact about arrays in this entire lesson: everything else follows from it.

```cpp
#include <iostream>

int main() {
    int arr[5] = {10, 20, 30, 40, 50};

    for (int i = 0; i < 5; i++) {
        std::cout << "arr[" << i << "] is at address " << &arr[i] << std::endl;
    }

    return 0;
}
```

Run this and look closely at the printed addresses. They won't just be "nearby" — they'll differ by exactly `sizeof(int)` (4, on most systems) each time: `...100`, `...104`, `...108`, `...10c`, `...110`. This isn't a coincidence or an implementation detail you can ignore — it's the actual definition of what an array *is*.

## Why contiguity gives you `arr[i]` for free — and why that's also the danger

Because the elements are laid out with a fixed, predictable gap, the compiler can compute the address of *any* element with pure arithmetic, instantly, without walking through the array at all:

```
address of arr[i]  =  address of arr[0]  +  (i * sizeof(element))
```

That's genuinely all `arr[i]` compiles down to — an address calculation followed by a dereference. This is why array indexing is so fast: O(1), always, no exceptions — there's no searching involved, just multiplication and addition.

But look at that formula again. There is nothing in it that checks whether `i` is actually a valid index. `arr[100]` on a 5-element array computes an address just as confidently as `arr[2]` does — it just computes the address of memory 100 slots past where your array happens to start, memory your program has no legitimate claim to. C++ will happily let you read or write there. This is **not** like Python's `IndexError` — there's no check, no exception, no safety net at all.

```cpp
#include <iostream>

int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    std::cout << arr[100] << std::endl;   // undefined behavior — NOT an error
    arr[100] = 999;                        // undefined behavior — silently corrupts SOMETHING
    return 0;
}
```

This might print garbage. It might print `0`. It might crash. It might appear to work perfectly and then cause a completely unrelated part of your program to misbehave five functions later, because you just silently overwrote memory that belonged to something else entirely — another variable, part of the call stack, anything happening to sit at that address. This is called **undefined behavior**, and it's one of the most important phrases you'll learn in this entire curriculum: it means the language specification places *no requirements whatsoever* on what happens next. Not "it errors" — genuinely anything, including appearing to work.

## Arrays and pointers are nearly the same thing

Here's a fact that will make Lesson 1.6 make sense: an array variable, in most expressions, *decays* into a pointer to its first element:

```cpp
int arr[5] = {10, 20, 30, 40, 50};
int* p = arr;          // no & needed — arr already acts like a pointer to arr[0]
std::cout << *p << std::endl;       // 10 — same as arr[0]
std::cout << *(p + 1) << std::endl; // 20 — same as arr[1] !
std::cout << p[1] << std::endl;      // 20 — pointer indexing works identically!
```

`p + 1` on a pointer doesn't add `1` to the address — it adds `1 × sizeof(int)`, using the exact same arithmetic from the formula above. `arr[i]` and `*(arr + i)` are, provably, the same operation, and C++ lets you write either one. This is why you were able to write `new int[5]` back in Lesson 1.4 and immediately index it with `arr[i]` — a heap array and a stack array behave identically once you have a pointer to their first element, because indexing was never really an "array" operation to begin with — it's a pointer operation.

## Fixed size is the other half of the problem

Even setting bounds-checking aside completely, a raw array cannot grow:

```cpp
int arr[5] = {1, 2, 3, 4, 5};
// there is no arr.append(6) — it does not exist for a raw array, full stop
```

The 20 bytes this array reserved are exactly 20 bytes, permanently, for its entire lifetime. There's no way to ask "please make this array bigger" — the memory immediately after it might already belong to something else entirely. This is the *other* problem `std::vector` and your own `MyVector` (next lesson) solve, and it's a completely separate problem from bounds-checking — worth keeping the two straight: **contiguous + fixed-size** is what an array fundamentally is; **safe + resizable** is what a proper container adds on top.

## Try it yourself

**1. Confirm the address-arithmetic formula directly** using the first code example above — actually subtract consecutive addresses by hand (they'll print in hex; convert or just eyeball the difference) and confirm it equals `sizeof(int)`.

**2. Confirm arrays and pointers really are interchangeable:**

```cpp
#include <iostream>

int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    int* p = arr;

    for (int i = 0; i < 5; i++) {
        std::cout << "arr[" << i << "] = " << arr[i]
                   << ", *(p + " << i << ") = " << *(p + i) << std::endl;
    }

    return 0;
}
```

Confirm every line shows matching values, proving `arr[i]` and `*(p + i)` really are the same operation reached two different ways.

**3. Very deliberately go out of bounds and observe what actually happens on your system** (don't be surprised by whatever you see — that unpredictability *is* the lesson):

```cpp
#include <iostream>

int main() {
    int arr[3] = {1, 2, 3};
    for (int i = 0; i < 10; i++) {
        std::cout << "arr[" << i << "] = " << arr[i] << std::endl;
    }
    return 0;
}
```

Run this a few times if you can. Notice the first 3 values are always correct, and the rest are essentially unpredictable garbage — possibly different between runs. This is the concrete, felt reason `std::vector`'s `.at()` method exists (it throws a real, catchable exception on an invalid index, unlike `[]`) and why Lesson 1.6 is about to have you build the safety Python gave you for free.

## What this cost / bought us

| | Python `list` | C++ raw array |
|---|---|---|
| Memory layout | Implementation detail, hidden from you | Guaranteed contiguous — you can rely on this |
| Growing | `.append()` works anytime | Impossible — fixed size forever |
| Out-of-bounds access | `IndexError`, caught, with a message | Undefined behavior — silent corruption, unpredictable crash, or nothing at all |
| Indexing speed | O(1), but with safety overhead | O(1), pure address arithmetic, essentially free |
| What you gain | Total safety by default | Maximum speed, and — crucially for the next lesson — full control to build your *own* resizable container from these exact primitives |

You now have every single primitive `std::vector` is internally built from: contiguous memory (this lesson), heap allocation (`new[]`/`delete[]`, Lesson 1.4), and pointers to navigate it (Lessons 1.2–1.3, plus this lesson's array-decay). Lesson 1.6 puts all four of these together into one working, resizable container — the same thing CPython's `list.append()` is conceptually doing under its own hood, just visible to you this time instead of hidden.

---

**Next up: Lesson 1.6 — Build a resizable array from scratch.** No more raw `int arr[5]` with a size fixed at compile time — you're about to write the actual growth logic behind `.append()`, by hand.
