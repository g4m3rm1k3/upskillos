# Lesson 28 — Recursion: A Function That Calls Itself, Traced For Real

## Why now
Lesson 4 mentioned, in passing, that JSON's nested structure is "recursive by nature" and that `json.load` handles that recursion internally so you didn't have to write any. This lesson writes it yourself — for the case where you don't know the nesting depth ahead of time, which a `for` loop genuinely cannot handle cleanly.

## What you'll learn
- What a "base case" and "recursive case" actually are, and why both are mandatory
- A real, printed trace of the call stack building up and unwinding, one call at a time
- What actually happens when a base case is missing — a real `RecursionError`, not a hang
- A genuinely famous Python trap that shows up specifically in recursive accumulator patterns

## The question
Lesson 5's `movie_element.findall("cast/actor")` worked because you knew the nesting was exactly two levels deep. What if a data structure's nesting depth is unknown — a `credits` field that might be a flat list, or a list containing lists, arbitrarily deep, with no way to know in advance how many `for` loops to write?

## 1. Predict
Given `sum_nested([1, [2, 3], [4, [5, 6]]])` — summing every number regardless of how deeply it's nested — before running anything: how many times do you think the function calls itself, and in what order do you expect the individual numbers to actually get added?

## 2. Try it — traced, for real
```python
def sum_nested(data, depth=0):
    print("  " * depth + f"call: sum_nested({data})")
    if isinstance(data, (int, float)):
        print("  " * depth + f"  base case, returning {data}")
        return data
    total = 0
    for item in data:
        total += sum_nested(item, depth + 1)
    print("  " * depth + f"  returning total {total}")
    return total

result = sum_nested([1, [2, 3], [4, [5, 6]]])
print("FINAL:", result)
```

### What this code does
- `isinstance(data, (int, float)):` — the **base case**: the condition under which the function stops calling itself and just returns a plain value directly. Every recursive function needs at least one of these, reached eventually, or it never stops (step 4 shows exactly what happens without one).
- `for item in data: total += sum_nested(item, depth + 1)` — the **recursive case**: when `data` isn't a plain number, it must be a list, so the function calls *itself* on each element, trusting that the same function will correctly handle that smaller piece — including, if that piece is itself a list, calling itself again.
- `depth` — not required for the actual summing logic at all; it's purely there to make the `print` indentation reveal how deep the current call is, so the trace below is genuinely readable.

### What happens
Real output:
```
call: sum_nested([1, [2, 3], [4, [5, 6]]])
  call: sum_nested(1)
    base case, returning 1
  call: sum_nested([2, 3])
    call: sum_nested(2)
      base case, returning 2
    call: sum_nested(3)
      base case, returning 3
    returning total 5
  call: sum_nested([4, [5, 6]])
    call: sum_nested(4)
      base case, returning 4
    call: sum_nested([5, 6])
      call: sum_nested(5)
        base case, returning 5
      call: sum_nested(6)
        base case, returning 6
      returning total 11
    returning total 15
  returning total 21
FINAL: 21
```
9 total calls to `sum_nested` for this one input. Every single number is reached via its own individual call that hits the base case directly — `sum_nested([4, [5, 6]])` never adds `4`, `5`, and `6` itself; it just calls `sum_nested` on each of its two elements (`4` and `[5, 6]`) and adds *those results* together, trusting each call to correctly handle its own piece.

## 3. Why?
### Code mechanics — the call stack
Every function call in Python (recursive or not) gets its own private space for local variables — a **stack frame**. When `sum_nested([4, [5, 6]])` calls `sum_nested([5, 6])`, the outer call doesn't vanish — it's paused, its own `data`, `depth`, and partially-built `total` still sitting exactly where they were, waiting for the inner call to finish and return a value before the outer call can resume and add that value into its own `total`. The indentation in the trace directly visualizes this stack: each deeper level of indentation is one more frame stacked on top of the previous ones, and the "returning total" lines show frames being popped back off, in the exact reverse order they were pushed.

### Runtime behavior
Nothing about this is a special language feature separate from ordinary function calls — `sum_nested` calling `sum_nested` is mechanically identical to any function calling any other function; it's simply calling itself instead of a different name. The recursion "just works" as a natural consequence of how function calls already behave.

### Mental model
```
call sum_nested([4,[5,6]])          ← frame A: data=[4,[5,6]], total so far=0
    call sum_nested(4)              ← frame B: base case, returns 4 immediately
    (frame A resumes: total=4)
    call sum_nested([5,6])          ← frame C: data=[5,6]
        call sum_nested(5)          ← frame D: base case, returns 5
        (frame C resumes: total=5)
        call sum_nested(6)          ← frame E: base case, returns 6
        (frame C resumes: total=11, RETURNS 11)
    (frame A resumes: total=4+11=15, RETURNS 15)
```

## 4. What happens with no base case at all
```python
def broken(n):
    return broken(n)  # no base case — always recurses, never stops

try:
    broken(1)
except RecursionError as e:
    print("caught:", e)
```
Real output:
```
caught: maximum recursion depth exceeded
```
This isn't a hang, an infinite loop that freezes your program forever — Python tracks how deep the call stack currently is (`sys.getrecursionlimit()` reports **1000** by default) and raises a real, catchable exception once that limit is crossed, specifically to prevent the program from crashing the entire process by exhausting real memory.

### The trap hiding inside the fix
It's tempting to think `sys.setrecursionlimit(100000)` is a safe fix for "my legitimately deep recursion hits the default limit." It isn't, unconditionally: Python's own interpreter is itself implemented in C, and each Python-level recursive call consumes real C-level stack space underneath. Raise the limit high enough, and instead of a clean, catchable `RecursionError`, you can crash the entire Python process with a raw segmentation fault — an operating-system-level crash with no exception to catch at all. Raising the limit is sometimes legitimate for genuinely deep, correct recursion, but it trades a safe, catchable error for a much less safe failure mode if pushed too far — never a costless fix.

## 5. Put it in the project — arbitrary-depth data, the actual motivating case
```python
def collect_all_names(data):
    if isinstance(data, str):
        return [data]
    names = []
    for item in data:
        names.extend(collect_all_names(item))
    return names

credits = ["Coco", ["Anthony Gonzalez", ["Gael García Bernal", "Benjamin Bratt"]], "Renée Victor"]
print(collect_all_names(credits))
```
This handles `credits` regardless of how deeply it happens to be nested — one level, three levels, inconsistent depth across branches — none of that matters to the function, because the recursive case doesn't need to know the depth in advance; it just keeps calling itself on whatever it finds until it hits a plain string.

## 6. Trap — mutable default arguments
```python
def collect_leaves(data, found=[]):
    if isinstance(data, (int, float)):
        found.append(data)
        return found
    for item in data:
        collect_leaves(item, found)
    return found

result1 = collect_leaves([1, [2, 3]])
print("first call:", result1)

result2 = collect_leaves([4, 5])
print("second call:", result2)
```
**Normal rule:** each call to a function starts fresh, with its own independent local state.
**Apparently equivalent code:** using `found=[]` as a default argument, intending it as "start with an empty list if the caller doesn't provide one" — a completely reasonable-sounding intention.
**Surprising result:** real output:
```
first call: [1, 2, 3]
second call: [1, 2, 3, 4, 5]
```
The second call's result contains **leftover data from the first call** — `[1, 2, 3]` are still there, contaminating a completely separate, later call that never mentioned them.
**Exact reason:** a default argument's value is evaluated **exactly once** — when the function is *defined*, not each time it's called. `found=[]` creates one single list object, at definition time, and every call that doesn't explicitly provide its own `found` argument shares that *same* list object, forever, across every call for the rest of the program's life. Recursive calls make this especially dangerous: `collect_leaves(item, found)` inside the loop passes `found` along explicitly on the recursive calls — but the outermost, top-level call (`collect_leaves([4, 5])` in `result2`) never explicitly passes anything for `found`, so it falls back to that same shared default list from the very first top-level call.
**Project consequence:** never use a mutable object (list, dict, set) as a default argument value where the function might modify it — the standard, safe pattern is `def collect_leaves(data, found=None): if found is None: found = []`, creating a genuinely fresh list inside the function body every single call, rather than reusing one shared default across the function's entire lifetime.

## Exercise
- **Predict:** Using the fixed pattern (`found=None`, then `if found is None: found = []`), would `result1` and `result2` above come out correctly independent? Trace through why the fix specifically works.
- **Modify:** Write a recursive function `max_depth(data)` that returns how many levels deep a nested list structure goes (a plain number, not inside any list, has depth 0). Test it on `[1, [2, [3, [4]]]]`.
- **Break:** Call `broken(1)` from step 4 with `sys.setrecursionlimit(50)` set first (a much lower limit than default). Does it fail faster? Does the error message change at all?
- **Repair:** Set the recursion limit back to a reasonable value (or don't change it at all), and explain in one sentence why "just catch `RecursionError`" is a reasonable safety net for accidental infinite recursion, but not a substitute for actually writing a correct base case.
- **Trace:** Using `sum_nested`'s printed trace above as a model, hand-write the equivalent call-and-return trace for `sum_nested([[1, 2], [3]])` before running it, then check your trace against the real output.

## What to remember
- Every recursive function needs a base case (stops recursing) and a recursive case (calls itself on a smaller piece) — missing the base case doesn't hang, it raises a real, catchable `RecursionError` at a defined depth.
- Each recursive call gets its own independent stack frame — pausing an outer call while an inner one completes, then resuming exactly where it left off, is the actual mechanism, not a metaphor.
- Raising Python's recursion limit is not a costless fix — pushed far enough, it trades a safe `RecursionError` for an unrecoverable interpreter crash.
- Never use a mutable default argument (`found=[]`) intended to accumulate results — it's created once at function-definition time and silently shared across every call that doesn't override it, a mistake that's especially easy to introduce in recursive accumulator patterns specifically.

## Next lesson
Cross-validation — Lesson 14's single train/test split, made more rigorous by running the split multiple times over different partitions and averaging results, directly addressing the "one split can be noisy" weakness that lesson's own trap section already flagged. A natural return to the ML track from here.
