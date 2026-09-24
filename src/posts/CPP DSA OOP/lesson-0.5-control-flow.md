# Lesson 0.5: Control Flow — `if`, `for`, `while`

*Phase 0 — Bridging Python → C++*
*Fast lesson — syntax only, no new concepts*

---

## The Python anchor

Good news: there is nothing new to *understand* in this lesson. `if` still means "if," `for` still means "loop over a sequence of things," `while` still means "keep going until this is false." The concepts haven't changed since Python. What's changed is punctuation — curly braces instead of indentation, parentheses around conditions, semicolons at the end of statements. This lesson is deliberately short. Skim it, run the examples once, move on.

## `if` / `else if` / `else`

```python
# Python
x = 7
if x > 10:
    print("big")
elif x > 5:
    print("medium")
else:
    print("small")
```

```cpp
// C++
int x = 7;
if (x > 10) {
    std::cout << "big" << std::endl;
} else if (x > 5) {
    std::cout << "medium" << std::endl;
} else {
    std::cout << "small" << std::endl;
}
```

Three differences, purely mechanical:
- The condition goes in `( )`.
- The block goes in `{ }` instead of being defined by indentation. (Indentation is still good style in C++, but it's cosmetic — the compiler only looks at the braces. This trips people up: bad indentation won't cause a bug the way it can't in Python, but it will absolutely cause you to *misread* your own logic.)
- `elif` becomes `else if` — two words, no exceptions.

## `while`

```python
# Python
i = 0
while i < 5:
    print(i)
    i += 1
```

```cpp
// C++
int i = 0;
while (i < 5) {
    std::cout << i << std::endl;
    i++;
}
```

Note `i++` — shorthand for `i = i + 1`, extremely common in C++. There's also `i--` for decrementing. Python's `+=` and `-=` exist identically in C++ (`i += 1`, `i -= 1`) if you'd rather use those.

## `for`

This is the one place the shape actually diverges, because C++'s classic `for` loop is built differently from Python's:

```python
# Python
for i in range(5):
    print(i)
```

```cpp
// C++ — the classic three-part for loop
for (int i = 0; i < 5; i++) {
    std::cout << i << std::endl;
}
```

Read the three parts inside the parentheses as: **start** (`int i = 0` — runs once), **condition** (`i < 5` — checked before every iteration), **step** (`i++` — runs after every iteration). This is strictly more explicit than `range(5)` — Python's `range` is quietly doing all three of these for you under the hood.

**Looping over a container**, though, looks reassuringly close to Python — this is called a *range-based for loop*, and it's the modern, preferred style whenever you don't need the index itself:

```python
# Python
values = [10, 20, 30]
for v in values:
    print(v)
```

```cpp
// C++ — range-based for loop
std::vector<int> values = {10, 20, 30};
for (int v : values) {
    std::cout << v << std::endl;
}
```

Read `for (int v : values)` as "for each `int v` in `values`" — genuinely almost a direct translation of the Python. You'll reach for this constantly once containers show up in Phase 1, and it'll come back for a proper deep-dive in Phase 7 when you build your own iterators.

## `break` and `continue`

Identical concepts, identical keywords, no differences at all:

```cpp
for (int i = 0; i < 10; i++) {
    if (i == 3) continue;   // skip this iteration
    if (i == 7) break;      // exit the loop entirely
    std::cout << i << std::endl;
}
```

## Try it yourself

Take a small Python script you've already written — the FizzBuzz from your upcoming mini-project is perfect — and translate just its control flow into C++ by hand, one line at a time, without looking anything up beyond what's above:

```python
for i in range(1, 21):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```

Translate it, compile it, run it, and confirm the output matches your Python version exactly. If it does, this lesson has done its job — you should feel like you just did a mechanical exercise, not like you learned a new concept.

## What this cost / bought us

Nothing to compare here — this is the one lesson in the curriculum that's genuinely just syntax. The only thing worth internalizing: **braces, not indentation, define a block in C++.** That single fact is behind every difference above.

---

**Next up: Lesson 0.6 — `const`, and why "can this change?" matters more in C++.** This one's a real concept again — Python has no true equivalent, and it's the last stop before Phase 0's mini-project.
