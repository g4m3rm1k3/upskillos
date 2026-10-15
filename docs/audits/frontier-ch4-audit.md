# Frontier Chapter 4: cold-reader audit

Started 2026-10-14. Each lesson read as a newcomer who has done Chapters 0–3 and nothing else. Findings are recorded as they're found, then fixed in one pass at the end. All 6 findings fixed 2026-10-14 (prose, plus one docstring in an answer file); no code, check or test changed behaviour.

Measured in the macOS scratch project (`~/Testing/frontier-scratch`, Python 3.13, NumPy 2.5.3, Matplotlib 3.11.2) through `scripts/frontier-safe-run.mjs`: the doubled sentence's cosine `0.9999999999999998`; `check_arrays.py`'s `largest difference: 4.440892098500626e-16` (and `8.881784197001252e-16` when the list version adds with a plain loop instead of `sum`); `draw_centering.py`'s averages `[171.2  67. ]`, heights 150.6–189.9 and weights 50.1–79.9, centered −20.6–18.7 and −16.9–12.9; viridis at 0.13 / 0.32 / 0.75 / 1.0 is dark purple / blue / green / yellow.

## 4.1 Words as Vectors

No findings. Checked: the vocabulary and the cat sentence's vector; the dot product 6.0 (on, sat, the); `compare_sentences.py`'s 8 / 6 / 8 / 16 and 1.000 / 0.750 / 0.707 / 1.000; √8 and √32; `ZeroDivisionError` from `0.0 / 0.0`; `zip(strict=True)` raising `ValueError`; the full cosine `0.9999999999999998`; the `WordArrows` props (cat 1 / the 2 against cat 0 / the 2); lesson 3.4's tests importing inside each test; lesson 2.2's two-`for` comprehension; Part 7 (sequences) bringing word order back; Chapter 69 (retrieval by cosine).

## 4.2 Arrays, Properly

Checked and correct: `unit([3, 4])` giving exactly `[0.6, 0.8]`; `int64` as NumPy 2's default; 2.7 written into an `int64` array becoming 2; `print` of a NumPy scalar giving `1.0`; `@` raising `ValueError` on mismatched sizes; `1e-12` against `1e-16` being ten thousand times; the mypy note matching 3.4's corrected one.

1. **"A thousand texts" next lesson (accuracy).** The introduction promises comparing one text "with a thousand at once", and the Your turn says "next lesson turns a thousand texts into unit vectors". Lesson 4.3 uses three and five. Say a whole collection. **fixed**
2. **The rounding explanation ignores `sum`'s compensation (accuracy).** "Your generator expression goes left to right, while NumPy adds in blocks … a different order rounds differently." Since Python 3.12, `sum` of floats keeps track of what each addition rounded off and adds it back, so the list version is the more exact of the two; measured, a plain left-to-right loop doubles the largest difference. Say the two add up differently: NumPy in blocks, rounding each time; `sum` correcting its rounding as it goes. **fixed**

## 4.3 A Dataset as a Matrix

Checked and correct: 9 and 18 vocabulary words; the prediction's 5 / 7 = 0.714 and 3 / (√7 √8) = 0.401, and 0.134; `all_pairs.py`'s 0.75, 0.13 and 0.32 (2 / (√8 √5)); 64³ = 262,144 for lesson 0.3's `matmul_difference(n=64)`; `m.T` a view; Chapter 29 (word vectors) and Chapter 69.

1. **`axis=0` described as "along the rows" (teaching).** 4.3 says `m.sum(axis=0)` "adds along axis 0, the rows", and 4.4 says `np.linalg.norm(m, axis=1)` "works along each row". Read together they contradict: "along the rows" means axis 0 in one lesson and axis 1 in the next. Describe axis 0 as adding the rows together (down each column) and axis 1 as across each row, in the step, the prediction's explanation and the check's hint, and match 4.4's sentence. **fixed**
2. **"Lesson 1.3's `split_words`" (cross-reference).** It was written in lesson 1.2 and moved into `frontier/text.py` in 1.3. Say Chapter 1's, as 4.1 does. **fixed**
3. **The answer file's docstring differs from the lesson (consistency).** `answers/matrix-4.3.py` says "a row of unit length"; the lesson, and 4.4's answer, say "a row of length 1". Matched. **fixed**

## 4.4 Broadcasting

No findings beyond the shared `axis` wording (4.3, finding 1). Checked: the three broadcasting rules against each example; the error text's start (`operands could not be broadcast together`, unchanged across NumPy 1 and 2); `m / flat` giving lengths 0.721, 4.045, 1 and why the last row is right; `unit_rows(M)` giving exact tenths; `nan` from `0 / 0` with a warning; a name looked up when the line runs; Chapter 1's characterisation-test rule for a refactor (1.1); Chapter 8 (feature scaling).

## 4.5 Seeing It

Checked and correct: 100 dpi, so 6 × 5 inches is 600 × 500 pixels; viridis's colours, and the picture's description against the measured ones; `len(fig.axes)` 2 with a colour bar; matplotlib sorting first in `requirements.txt`; the 9.5 MB wheel ("about 10 MB"); the dataset's ranges and the centered ranges ("around −20 to 20 and −15 to 15"); Chapter 5 (slopes).

1. **The tests read the figure with methods the lesson never names (teaching).** `get_clim` and `get_offsets` are explained, but `get_images()`, `get_array()` and `ax.collections` aren't, so a reader of the tests can't tell how "drawn from the matrix" is checked. Name all three in the test list. **fixed**

## Cross-references

Chapters 1, 5, 8, 29 and 69, Part 7, and lessons 0.3, 1.1, 1.2, 2.2, 2.6, 3.1 and 3.4, named in Chapter 4, all match after the fixes.
