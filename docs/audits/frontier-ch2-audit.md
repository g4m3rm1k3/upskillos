# Frontier Chapter 2: cold-reader audit

Started 2026-10-13. Each lesson read as a newcomer who has done Chapters 0–1 and nothing else. Findings are recorded as they're found, then fixed in one pass at the end. All 10 findings fixed 2026-10-13 (prose only; lint 14 lessons, 0 problems).

## 2.1 How Slow Grows

No findings. Checked: the prediction's arithmetic (500 pairs of 999), `pauses.pop()` order in the `best_of` test (symmetric, so either end works), the `lambda` in the loop (called within the same pass, so no late-binding surprise), the figure caption's "untick" (`GrowthCurves` takes `show`).

## 2.2 Why a Dictionary Is Fast

1. **Wrong error message (accuracy).** The `{["the", "cat"]: 1}` prediction's explain quotes `TypeError: unhashable type: 'list'`. On Python 3.14 the message is `cannot use 'list' as a dict key (unhashable type: 'list')`. Quote only the part both versions share. **fixed**
2. **"Hundreds" overstated (accuracy).** After the first `time_lookup.py` run the text says the longest bucket "holds **hundreds** of words". Measured: 70, 75, 223, 497 for n = 1000..8000. Say it holds dozens, and hundreds by the end. **fixed**
3. **A Your turn requirement only in the hints (teaching).** `poly_hash` must be defined above the class, because a default value is worked out when the `def` line runs. Only the `concept` hint says so. A learner who adds it at the end of the file gets a `NameError` with nothing in the lesson to explain it. Say it in the Build paragraph. **fixed**
4. **Awkward wording.** Growing: "a word's bucket is its hash *remainder the number of buckets*". Reword as the remainder after dividing its hash by the number of buckets. **fixed**
5. **"A real attack in 2011" (accuracy).** Hash flooding was demonstrated publicly in December 2011 (and fixed by randomised hashing in Python 3.3); the lesson presents it as servers actually attacked. Say "an attack shown publicly in 2011". **fixed**

## 2.3 Always the Smallest First

Checked and correct: the push prediction (`[1, 3, 8, 5]`), the `sift_down` trace, the 9-swap chain for 1000 items, "a million items fit in 20 rows", 7919 coprime to every size used.

1. **"mypy can't guess it from `[]`" (minor accuracy).** In 2.1, `times = []` in `best_of` passed `mypy --strict`, because mypy reads the type from a later `append`. A careful learner sees the contradiction. Say mypy can tell from an `append` later on, but not from passing the list to `push`. **fixed**

## 2.4 A Function That Calls Itself

Checked and correct: the dataclass `ValueError` for a list default, the board reading of `"X.O.X...."`, 255,168 games and 549,946 positions, 131,184 / 77,904 / 46,080, `RecursionError`'s message and the 1000 limit.

1. **Garbled rule (teaching).** "A recursive function needs its base case, or something has to make each call smaller." The "or" reads as an alternative. Both are needed: a base case, and each call getting closer to it. **fixed**
2. **Misleading opening claim (minor).** "That count is the reason Chapter 57's search doesn't try to look at every game": noughts and crosses' count is small enough to walk in a second, as the lesson then shows. The reason is how the count explodes for bigger games (the closing section's chess and Go). Reword. **fixed**

## 2.5 What Comes First

No findings. Checked: the prediction (15 entries, `python` five times, traced by hand), the done-set order `[python, tensors, calculus, autograd, gpt]`, `backward_order.py`'s `[e, c, b, a]`, `b`'s gradient (a + 2b = 8 at a = 2, b = 3), `graphlib`'s orders on both graphs, the figure's "skip nodes that are done" toggle.

## 2.6 Numbers That Round

Checked and correct: `Decimal(0.1)`, 0.0001100110011… for 1/10, the ULP of 2 near 1e16 and the tie rounding to even, 5.6e-17, 0.09 / 0.24 / 0.67, e^709 ≈ 8.2e307 and e^710 overflowing, `math range error`, 5e-324, float16's 65,504 and e^12.

1. **"Differ in the last bit" (accuracy).** The `FloatBits` caption says 0.1 + 0.2 and 0.3 "differ in the last bit". They are neighbouring floats, but their bit patterns end `…0011` and `…0100`: the last three bits differ. Say they are neighbours, one step apart. (The prose, "the same except at the very end", is fine.) **fixed**
2. **Garbled definition (teaching).** "A float stores a number in binary, as a whole number of bits times a power of two." It's a whole number times a power of two; "of bits" makes it nonsense. **fixed**

## Cross-references

Chapters 3, 4, 12, 13, 28, 33, 41, 42 and 57 named in Chapter 2 all match their rows in the plan.
