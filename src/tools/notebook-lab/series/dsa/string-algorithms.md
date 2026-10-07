# String algorithms

Finding a pattern in a text sounds solved: `text.find(pattern)` does it. But the obvious method behind a hand-written search can be very slow on unlucky inputs. And many searches are not over Python strings at all: a pattern of sensor readings in a stream, a run of moves in game logs, a gene in a DNA file too big to hold twice. This lesson builds the two classic ideas that make searching fast in every case. **KMP** never re-reads a character of the text. **Rolling hashes** compare a whole window in one step by keeping a fingerprint of it up to date.

This lesson covers:

- why the naive search is O(nm) in the worst case, measured by counting comparisons;
- the **prefix function**, which records how a pattern overlaps itself;
- the Knuth–Morris–Pratt (KMP) search, which uses it to search in O(n + m);
- rolling hashes (the Rabin–Karp method), and searching for many windows at once.

## The naive search, and its worst case

The naive search lines the pattern up at each position of the text and compares character by character until a mismatch. Usually a mismatch comes at once and the search is fast. But a text of many `a`s and a pattern of `a`s ending in `b` match almost all the way at **every** position before failing. That makes n × m comparisons for a text of length n and a pattern of length m. Predict before running: how many comparisons for a 10,000-character text and a 100-character pattern?

```python type
def naive_search(text, pattern):
    comparisons, found = 0, []
    for start in range(len(text) - len(pattern) + 1):
        k = 0
        while k < len(pattern):
            comparisons += 1
            if text[start + k] != pattern[k]:
                break
            k += 1
        if k == len(pattern):
            found.append(start)
    return found, comparisons

text = "a" * 10_000
pattern = "a" * 99 + "b"
print("worst case:", naive_search(text, pattern)[1], "comparisons, matches:", naive_search(text, pattern)[0])
print("ordinary English:", naive_search("the cat sat on the mat with the hat " * 300, "the hat")[1], "comparisons")
```

```output
worst case: 990100 comparisons, matches: []
ordinary English: 16793 comparisons
```

On ordinary text the comparisons are a small multiple of the text's length: about 1.5 per character here. On the bad input there are 990,100: every one of the 9,901 starting positions compares all 100 pattern characters. The waste is plain to see. After matching 99 `a`s at one position, the search **knows** the next 98 text characters are `a`s, yet it moves on one place and compares them all again.

## How a pattern overlaps itself

KMP removes that waste by working out, in advance, how the pattern overlaps **itself**. For each prefix of the pattern, it stores the length of the longest proper prefix that is also a suffix of it ("proper" means shorter than the whole). This list is the **prefix function**, often written π (pi). For `ababaca`, the prefix `ababa` ends with `aba`, which is also how it starts, so π at that position is 3.

Why it helps: if the search has matched `ababa` and the next character fails, the last 3 matched text characters are `aba`, which is a prefix of the pattern. So the search can carry on as if it had matched 3 characters, without re-reading anything.

Computing π uses the same idea on the pattern itself. Keep `k`, the length of the current overlap. When the next character extends the overlap, `k` grows by 1. When it does not, fall back to the next shorter overlap, `pi[k - 1]`, and try again. Predict before running: what is the prefix function of `aabaaab`?

```python type
def prefix_function(pattern):
    pi = [0] * len(pattern)
    k = 0
    for i in range(1, len(pattern)):
        while k > 0 and pattern[i] != pattern[k]:
            k = pi[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        pi[i] = k
    return pi

for p in ["ababaca", "aabaaab", "abcd", "aaaa"]:
    print(f"{p:<8}", prefix_function(p))
```

```output
ababaca  [0, 0, 1, 2, 3, 0, 1]
aabaaab  [0, 1, 0, 1, 2, 2, 3]
abcd     [0, 0, 0, 0]
aaaa     [0, 1, 2, 3]
```

For `aabaaab` it is `[0, 1, 0, 1, 2, 2, 3]`. The prefix `aabaa` ends with `aa`, its first two characters, so π is 2 there. The whole pattern ends with `aab`, its first three, so π is 3. A pattern with no repeats, like `abcd`, is all zeros; `aaaa` overlaps itself as much as possible.

Each pass of the loop raises `k` by at most 1, and every fall-back lowers it by at least 1. So the fall-backs can never outnumber the raises, and the whole computation is O(m).

## KMP search

The search runs the same loop over the text. `k` counts how many pattern characters are matched so far. On a match, `k` grows; at a mismatch, `k` falls back through π until the next character fits or `k` reaches 0. When `k` reaches the pattern's length there is a match, ending at the current position. Then `k` falls back once more, to `pi[m - 1]`, so that overlapping matches are found too. The text index never moves backward. A character may be compared again while `k` falls back, but the total stays under 2n, as the argument below shows. Predict before running: how many comparisons on the same worst case?

```python type
def kmp_search(text, pattern):
    pi = prefix_function(pattern)
    found, k, comparisons = [], 0, 0
    for i, ch in enumerate(text):
        while k > 0 and ch != pattern[k]:
            comparisons += 1
            k = pi[k - 1]
        comparisons += 1
        if ch == pattern[k]:
            k += 1
        if k == len(pattern):
            found.append(i - len(pattern) + 1)
            k = pi[k - 1]
    return found, comparisons

print("worst case:", kmp_search(text, pattern)[1], "comparisons")
print("overlapping matches of 'aa' in 'aaaa':", kmp_search("aaaa", "aa")[0])
readings = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 9, 2, 6, 5, 3, 5]
print("[5, 9, 2, 6] in a list of readings:", kmp_search(readings, [5, 9, 2, 6])[0])
```

```output
worst case: 19901 comparisons
overlapping matches of 'aa' in 'aaaa': [0, 1, 2]
[5, 9, 2, 6] in a list of readings: [4, 10]
```

The worst case drops from 990,100 comparisons to 19,901, under 2n. The same function works on a list of numbers, because it only ever compares items with `!=`: KMP works on any sequence. The bound comes from the same argument as for π. Each text character raises `k` at most once, and each fall-back lowers it, so there are at most 2n comparisons for the search, plus O(m) to build π.

## Rolling hashes

A different idea: compare a **fingerprint** of each window of the text with the pattern's fingerprint, and only check character by character when the fingerprints agree. The fingerprint is a **polynomial hash**: treat the characters as digits in base B and take the number modulo a large prime M. The key property is that the next window's hash follows from the current one in O(1). Remove the leaving character's contribution (its code times B^(m−1)), multiply by B to shift everything along, and add the new character. This is the **Rabin–Karp** method.

Two windows with the same characters always have the same hash. Different windows can collide, but with a prime around 2⁶¹ and a randomly chosen base, the chance is tiny, and checking the characters on every hash match removes the risk entirely. Rolling hashes shine when looking for **many** windows at once: put the hashes of a set of patterns of the same length in a dictionary and scan the text once. Predict before running: in a random DNA string of 200,000 letters, how many windows of length 12 occur more than once?

```python type
import random, time

M = (1 << 61) - 1
B = random.Random(7).randrange(1 << 20, M)

def window_hashes(seq, m):
    """Yield (start, hash) for every window of length m, each in O(1) after the first."""
    if m > len(seq):
        return
    top = pow(B, m - 1, M)
    h = 0
    for ch in seq[:m]:
        h = (h * B + ord(ch)) % M
    yield 0, h
    for start in range(1, len(seq) - m + 1):
        h = ((h - ord(seq[start - 1]) * top) * B + ord(seq[start + m - 1])) % M
        yield start, h

rng = random.Random(3)
dna = "".join(rng.choice("ACGT") for _ in range(200_000))

start = time.perf_counter()
first_seen, repeats = {}, 0
for s, h in window_hashes(dna, 12):
    if h in first_seen:
        if dna[first_seen[h]:first_seen[h] + 12] == dna[s:s + 12]:
            repeats += 1
    else:
        first_seen[h] = s
print(f"{repeats:,} windows of length 12 repeat an earlier window ({time.perf_counter() - start:.2f} s)")
print("4^12 =", 4 ** 12, "possible windows of length 12, and", len(dna) - 11, "windows in the string")
```

`pow(B, m - 1, M)` computes B to the power m − 1 modulo M without ever building the huge number. Python's integers never overflow, but keeping every value below M keeps the arithmetic fast.

There are about 16.8 million possible 12-letter windows and about 200,000 windows in the string, so repeats are uncommon: a little over a thousand. This is close to the birthday-problem estimate, n² / (2 × 4¹²) ≈ 1,190. Every hash match is confirmed by comparing the actual letters. Each window costs O(1) to hash, so the scan is O(n) however long the windows are. Hashing each window from scratch would cost O(m) per window.

::: challenge The repeating unit [easy]
A signal that repeats a block exactly, such as `"abcabcabc"`, is made of copies of its shortest repeating unit, `"abc"`. Write `repeating_unit(s)` returning that shortest unit (the whole string if it does not repeat). Use the lesson's `prefix_function`: the last value of π is the longest overlap of the string with itself. So `len(s) - pi[-1]` is the shortest shift that maps the string onto itself, and it is the unit's length exactly when it divides `len(s)`. Return `""` for an empty string.

```python starter
def repeating_unit(s):
    return s

print(repeating_unit("abcabcabc"), repeating_unit("abcab"))
```

```python solution
def repeating_unit(s):
    if not s:
        return ""
    period = len(s) - prefix_function(s)[-1]
    return s[:period] if len(s) % period == 0 else s

print(repeating_unit("abcabcabc"), repeating_unit("abcab"))
```

```python test
import random as _random, time as _time
assert "repeating_unit" in dir(), "Keep the function's name as repeating_unit."
assert repeating_unit("abcabcabc") == "abc", "abcabcabc is three copies of abc."
assert repeating_unit("abcab") == "abcab", "abcab does not divide into whole copies of a block, so the unit is the whole string."
assert repeating_unit("aaaa") == "a" and repeating_unit("x") == "x" and repeating_unit("") == "", "aaaa is copies of a; a single character is its own unit; empty gives empty."
assert repeating_unit("abababab") == "ab" and repeating_unit("abaaba") == "aba", "abababab repeats ab; abaaba repeats aba."
def _brute(_s):
    for _d in range(1, len(_s) + 1):
        if len(_s) % _d == 0 and _s[:_d] * (len(_s) // _d) == _s:
            return _s[:_d]
    return ""
_rng = _random.Random(14)
for _ in range(300):
    _unit = "".join(_rng.choice("ab") for _ in range(_rng.randint(1, 5)))
    _s = _unit * _rng.randint(1, 6)
    if _rng.random() < 0.3:
        _s = _s[:-1] if len(_s) > 1 else _s
    assert repeating_unit(_s) == _brute(_s), f"repeating_unit({_s!r}) should be {_brute(_s)!r}."
_s = "ab" * 50_000 + "a"
_start = _time.perf_counter(); _r = repeating_unit(_s); _el = _time.perf_counter() - _start
assert _r == _s and _el < 2, f"A 100,001-character string should take one O(n) pass of the prefix function (took {_el:.1f} s)."
"SUCCESS: The string's longest overlap with itself gives its shortest shift, and the shift is the repeating unit when it divides the length."
```

Hint: Compute `pi = prefix_function(s)` and `period = len(s) - pi[-1]`. If `len(s) % period == 0`, the unit is `s[:period]`; otherwise the string does not repeat, and the unit is all of `s`.
:::

::: challenge Spotting a fault signature [medium]
A machine logs a stream of integer status codes, and a known fault shows as a particular run of codes. Write `find_signature(stream, signature)` returning the list of every start position where `signature` (a non-empty list) occurs in `stream` (a list), overlaps included, in increasing order. Use KMP: build the prefix function of the signature, then scan the stream once. Comparing the signature afresh at every position, even with slices, is too slow for the longest signatures in the tests.

```python starter
def find_signature(stream, signature):
    return []

print(find_signature([7, 7, 2, 7, 7, 2, 7, 7], [7, 7, 2, 7]))
```

```python solution
def find_signature(stream, signature):
    pi = prefix_function(signature)
    found, k = [], 0
    for i, code in enumerate(stream):
        while k > 0 and code != signature[k]:
            k = pi[k - 1]
        if code == signature[k]:
            k += 1
        if k == len(signature):
            found.append(i - len(signature) + 1)
            k = pi[k - 1]
    return found

print(find_signature([7, 7, 2, 7, 7, 2, 7, 7], [7, 7, 2, 7]))
```

```python test
import random as _random, time as _time
assert "find_signature" in dir(), "Keep the function's name as find_signature."
assert find_signature([7, 7, 2, 7, 7, 2, 7, 7], [7, 7, 2, 7]) == [0, 3], "The signature starts at 0 and, overlapping, at 3."
assert find_signature([1, 1, 1, 1], [1, 1]) == [0, 1, 2], "Overlapping matches all count."
assert find_signature([1, 2], [1, 2, 3]) == [] and find_signature([], [5]) == [], "A signature longer than the stream never matches."
_rng = _random.Random(15)
for _ in range(300):
    _st = [_rng.randint(0, 2) for _ in range(_rng.randint(0, 40))]
    _sig = [_rng.randint(0, 2) for _ in range(_rng.randint(1, 4))]
    _want = [_i for _i in range(len(_st) - len(_sig) + 1) if _st[_i:_i + len(_sig)] == _sig]
    assert find_signature(_st, _sig) == _want, f"For stream {_st} and signature {_sig}: expected {_want}."
_st = [0] * 20_000
_sig = [0] * 999 + [1]
_start = _time.perf_counter(); _r = find_signature(_st, _sig); _el = _time.perf_counter() - _start
assert _r == [] and _el < 0.3, f"20,000 codes with a 1,000-code signature took {_el:.1f} s. Comparing at every position costs 20 million steps; KMP needs under 40,000."
_st = [0] * 150_000 + [1]
_sig = [0] * 4_999 + [1]
_start = _time.perf_counter(); _r = find_signature(_st, _sig); _el = _time.perf_counter() - _start
assert _r == [150_000 - 4_999], f"The signature occurs once, ending at the final code; got {_r[:3]}."
assert _el < 1, f"150,001 codes with a 5,000-code signature took {_el:.1f} s. Even slice comparisons do 750 million element checks; KMP reads each code once."
"SUCCESS: The prefix function lets the scan fall back without re-reading the stream: linear time whatever the signature looks like."
```

Hint: Copy the shape of `kmp_search` without the comparison counter. Keep `k`, the number of signature codes matched. For each code, fall back with `k = pi[k - 1]` while it mismatches, extend `k` on a match, and when `k == len(signature)` record `i - len(signature) + 1` and fall back once more.
:::

::: challenge Longest repeated stretch [hard]
A genome analyst wants the longest stretch of DNA that appears **at least twice** in a sequence (the two copies may overlap). Write `longest_repeat(dna)` returning one such stretch (any one, if several are longest), or `""` if no letter repeats. Two ideas combine. **Binary search on the length**: if some stretch of length L repeats, so does a stretch of every shorter length (any part of it), so the longest repeated length can be binary searched. **Rolling hashes**: for a given L, hash every window of length L in O(n) and look for two equal windows. Confirm a hash match by comparing the letters, so a collision cannot fool you. The lesson's `window_hashes(seq, m)` is available.

```python starter
def longest_repeat(dna):
    return ""

print(longest_repeat("GATTACATTACAG"))
```

```python solution
def longest_repeat(dna):
    def repeated(L):
        if L == 0:
            return 0
        seen = {}
        for s, h in window_hashes(dna, L):
            if h in seen and dna[seen[h]:seen[h] + L] == dna[s:s + L]:
                return s
            seen.setdefault(h, s)
        return None
    lo, hi, best = 1, len(dna) - 1, ""
    while lo <= hi:
        mid = (lo + hi) // 2
        s = repeated(mid)
        if s is not None:
            best = dna[s:s + mid]
            lo = mid + 1
        else:
            hi = mid - 1
    return best

print(longest_repeat("GATTACATTACAG"))
```

```python test
import random as _random, time as _time
assert "longest_repeat" in dir(), "Keep the function's name as longest_repeat."
def _repeats(_d, _r):
    _i = _d.find(_r)
    return _r != "" and _i != -1 and _d.find(_r, _i + 1) != -1
def _brute_len(_d):
    _best = 0
    for _i in range(len(_d)):
        for _j in range(_i + 1, len(_d)):
            _k = 0
            while _j + _k < len(_d) and _d[_i + _k] == _d[_j + _k]:
                _k += 1
            _best = max(_best, _k)
    return _best
_r = longest_repeat("GATTACATTACAG")
assert _r == "ATTACA", f"ATTACA appears at positions 1 and 5; got {_r!r}."
assert longest_repeat("ACGT") == "" and longest_repeat("") == "" and longest_repeat("A") == "", "No repeated letter: return an empty string."
assert longest_repeat("AAAA") == "AAA", "AAA appears at 0 and, overlapping, at 1."
_rng = _random.Random(16)
for _ in range(200):
    _d = "".join(_rng.choice("ACG") for _ in range(_rng.randint(0, 25)))
    _r = longest_repeat(_d)
    _n = _brute_len(_d)
    assert isinstance(_r, str) and len(_r) == _n, f"For {_d!r}, the longest repeat has length {_n}; got {_r!r}."
    assert _n == 0 or _repeats(_d, _r), f"{_r!r} does not appear twice in {_d!r}."
_d = "".join(_rng.choice("ACGT") for _ in range(3_000))
_start = _time.perf_counter(); _r = longest_repeat(_d); _el = _time.perf_counter() - _start
assert _repeats(_d, _r) and _el < 0.5, f"3,000 letters took {_el:.1f} s. Comparing every pair of positions is millions of steps; binary search over the length needs about 12 linear scans."
_d = list("".join(_rng.choice("ACGT") for _ in range(30_000)))
_planted = "".join(_rng.choice("ACGT") for _ in range(400))
_d[5_000:5_400] = _planted
_d[21_000:21_400] = _planted
_d = "".join(_d)
_start = _time.perf_counter(); _r = longest_repeat(_d); _el = _time.perf_counter() - _start
assert _repeats(_d, _r) and len(_r) >= 400, f"A 400-letter stretch is planted twice in 30,000 letters; got length {len(_r)}."
assert _el < 8, f"30,000 letters took {_el:.1f} s: binary search on the length, with one rolling-hash scan per length tried."
"SUCCESS: Repeated lengths are monotone, so binary search finds the longest in about log n rounds, and each round is one O(n) rolling-hash scan."
```

Hint: Write `repeated(L)`, which scans `window_hashes(dna, L)` with a dictionary from hash to first start, and returns a start whose window equals an earlier one (checking the letters), or None. Binary search L between 1 and `len(dna) - 1`: when length `mid` repeats, remember that stretch and search longer; otherwise search shorter.
:::

## What you learned

- The naive search re-compares text it has already matched, so its worst case is O(nm) comparisons.
- The prefix function π records, for each prefix of a pattern, the longest proper prefix that is also a suffix. It takes O(m) to build, because fall-backs can never outnumber the steps forward.
- KMP scans the text once, falling back through π at a mismatch: O(n + m) on any input, on strings or any sequence of comparable items, overlapping matches included.
- A rolling polynomial hash updates each window's fingerprint in O(1). Equal hashes need a character check, because different windows can collide. It finds repeated windows in one O(n) pass, and with binary search on the length, the longest repeated stretch.

The next lesson uses randomness on purpose: random pivots, random samples and random hash functions that make algorithms fast on every input with high probability.
