# Frontier Chapter 3: cold-reader audit

Started 2026-10-14. Each lesson read as a newcomer who has done Chapters 0–2 and nothing else. Findings are recorded as they're found, then fixed in one pass at the end. All 7 findings fixed 2026-10-14 (prose only), plus an eighth found while writing 4.2 the same day.

## 3.1 Finding a Bug

No findings. Checked: `range(len(words) - 2)` gives only `i = 0` for three words, so neither run shows `('cat', 'sat')`; `assert count_pairs(w) == count_pairs(w)` would pass (the same dictionary); the pdb session (`{}`, then `{('the', 'cat'): 1}` at the second call); the third call's 3; `print("third: ", ...)` giving two spaces, as the check expects; lesson 2.2's "a default value is worked out when the `def` line runs" and the trap's earlier appearances in 2.2 (`[[]] * 8`) and 2.4 (`default_factory`); `git rm`'s "did not match any files"; Chapter 28 (byte-pair merges count pairs).

## 3.2 What It's Doing

Checked and correct: logging's default threshold (`WARNING`) and the prediction's "nothing"; `basicConfig` writing to stderr; `other`'s conditional expression in lesson 2.4; 60 different words in the sample; the `-k` words; Chapter 11 (a run log).

1. **An invitation to make a stray file (teaching).** "Send the report to a file the same way and the file holds the report alone" reads as something to try. A learner who does it gets a report file in the project, and the lesson's `git add .` commits it. Say what would happen, without inviting it, or say to delete it. **fixed**

## 3.3 Finding the Slow Part

Checked and correct: 549,946 calls of `winner` (one per position, `count_games` checks once per call), `549946/1`, the four functions called hundreds of thousands of times (`moves` 294,778), 5,478 different boards, 549,946 / 5,478 ≈ 100, "about fifty times faster" (1.6 s → 0.03 s), `cache`'s source being three lines, `lru_cache`'s docstring (hashable arguments, `cache_info`, `cache_clear`), the trail ending at the C `_lru_cache_wrapper`, `misses=5478` (the empty board is missed once under the key `()` and never reached again), the `cache(lambda: [])` prediction, the tests' order (a cache filled by an earlier test only lowers the count).

1. **The Your turn's copy is taught only in a hint (teaching).** The Build text says each caller must get a dictionary of its own, but how to copy one, `dict(d)`, appears only in the `concept` hint. Teach it in the text before the hints. **fixed**

## 3.4 A Hundred Times Faster

Checked and correct: 24 bytes for a float object, 8,000,000 bytes for `np.zeros(1000000)`, 32 MB for the list, 0.057 s / 17x / 400x against the handoff's measurements, the softmax tests (`[1000.0, 1000.0]` gives exactly `[0.5, 0.5]`), the `-k` words, the mypy note, lesson 0.1 installing NumPy and 0.3 using it, Chapter 8 (a loss).

1. **Arithmetic off by two (accuracy).** "Two million [operations] should take about a thousandth of [a second]" at a billion a second: it's two thousandths. **fixed**
2. **"NumPy gets its own chapter next" (cross-reference).** Chapter 4 is vectors and matrices, with NumPy taught alongside; the lesson's own last paragraph says so. Match it. **fixed**
3. **`@` described two ways (teaching).** Lesson 0.3 introduced `@` as matrix multiplication and left what it computes to Chapter 4. Here it "multiplies two arrays number by number and adds up the products", with no bridge. Say that's what it does for two lists of numbers, and that Chapter 4 builds matrix multiplication from it. **fixed**
4. **One reason given for `@`'s speed (accuracy).** The text puts the whole gap between `np.sum(xs * xs)` and `xs @ xs` down to the middle array. That's the main point, but `@` also goes to a routine tuned for exactly this sum. Say so in a clause. **fixed**
5. **A thin measured margin stated as a rule (accuracy).** "Converting a million-number list into an array takes longer than the loop itself": measured 0.067 s against 0.057 s, close enough to go the other way on another computer. Say about as long as the loop, or longer. **fixed**
6. **The mypy note blamed the wrong thing (accuracy; found while writing 4.2).** It said NumPy's hints can't type an array divided by a number. Measured with `reveal_type`: a `float64` array divided by a `float` stays typed; it's `np.exp`'s result (`dtype[Any]`) divided by `np.sum(...)` that becomes `Any`. Reworded to name `np.exp`; the answer's annotation is still needed and unchanged. **fixed**

## Cross-references

Chapters 4, 8, 11 and 28, and lessons 0.1, 0.3, 2.2, 2.4 and 2.6, named in Chapter 3, all match.
