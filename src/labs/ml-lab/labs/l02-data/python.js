export default {
  filename: 'reproducible_pipeline.py', packages: ['numpy', 'pandas'],
  title: 'Build a pipeline you can rerun and trust.',
  intro: 'Implement five small, pure functions: a seeded split, a cleaning step, a median imputer (fit and apply), and column standardization. The checks test **invariants** — determinism, no overlap, no mutation, no leakage, correct shapes — not just one expected output.',
  steps: [
    '`split_indices(n, test_fraction, seed)` → `(train_idx, test_idx)`: shuffle `range(n)` with `np.random.default_rng(seed)`; the first `int(n * (1 - test_fraction))` shuffled indices are training.',
    '`clean(df)` → a **new** DataFrame: replace `-1` in `duration_s` with `NaN`, drop rows whose `duration_s` is missing, and drop exact duplicate rows. Never modify `df`.',
    '`fit_median(x_train)` → the median of the non-missing training values; raise `ValueError` if every value is missing.',
    '`apply_fill(x, fill)` → `(filled, was_missing)`: a new array with NaN replaced by `fill`, and a float array of 1.0 where a value was missing.',
    '`standardize(X_train, X_other)` → `(Z_train, Z_other)`: subtract the training column means and divide by the training column standard deviations, using broadcasting. Columns with zero spread are divided by 1.',
  ],
  hints: [
    ['Seeded shuffling', '`rng = np.random.default_rng(seed)` then `order = rng.permutation(n)`. Slicing `order[:k]` and `order[k:]` guarantees the two parts are disjoint and together complete.'],
    ['pandas without mutation', 'Start with `out = df.copy()`. `out["duration_s"] = out["duration_s"].replace(-1, np.nan)`, then `out = out.dropna(subset=["duration_s"]).drop_duplicates()`. Return `out`.'],
    ['NaN-aware statistics', '`np.isnan(x)` gives a mask. `np.nanmedian` ignores NaN. `np.where(mask, fill, x)` builds a new array without touching `x`.'],
    ['Broadcasting', '`X_train.mean(axis=0)` has shape `(p,)`; `X - mu` subtracts it from every row. Replace zero standard deviations with 1 using `np.where(sd == 0, 1.0, sd)`.'],
  ],
  starter: `import numpy as np
import pandas as pd

def split_indices(n, test_fraction=0.25, seed=0):
    # Return (train_idx, test_idx) as NumPy integer arrays.
    raise NotImplementedError

def clean(df):
    # Return a NEW DataFrame. Sentinel -1 in duration_s means "timed out".
    raise NotImplementedError

def fit_median(x_train):
    # Median of the non-missing training values.
    raise NotImplementedError

def apply_fill(x, fill):
    # Return (filled, was_missing). Do not modify x.
    raise NotImplementedError

def standardize(X_train, X_other):
    # Statistics come from X_train only.
    raise NotImplementedError
`,
  solution: `import numpy as np
import pandas as pd

def split_indices(n, test_fraction=0.25, seed=0):
    rng = np.random.default_rng(seed)
    order = rng.permutation(n)
    k = int(n * (1 - test_fraction))
    return order[:k], order[k:]

def clean(df):
    out = df.copy()
    out["duration_s"] = out["duration_s"].replace(-1, np.nan)
    out = out.dropna(subset=["duration_s"])
    return out.drop_duplicates()

def fit_median(x_train):
    x_train = np.asarray(x_train, dtype=float)
    if np.all(np.isnan(x_train)):
        raise ValueError("No observed values to learn a fill value from")
    return float(np.nanmedian(x_train))

def apply_fill(x, fill):
    x = np.asarray(x, dtype=float)
    missing = np.isnan(x)
    return np.where(missing, fill, x), missing.astype(float)

def standardize(X_train, X_other):
    mu = X_train.mean(axis=0)
    sd = X_train.std(axis=0)
    sd = np.where(sd == 0, 1.0, sd)
    return (X_train - mu) / sd, (X_other - mu) / sd
`,
  solutionNote: 'Every function copies before changing anything and receives every choice (seed, fraction, fill value) as an argument. The fill value and the standardization statistics are computed from training data and then applied unchanged to the other data.',
  checkSummary: 'Split determinism, disjointness, completeness and sizes for several n; the cleaning step\'s sentinel, missing-target and duplicate handling without mutating its input; NaN-aware medians and the all-missing error; fill indicators and no mutation; and standardization whose statistics provably come only from the training rows (validation is poisoned to detect leakage).',
  checks: `
import numpy as np
import pandas as pd
for _n, _f in [(10, 0.2), (81, 0.25), (7, 0.5)]:
    _a1, _b1 = split_indices(_n, _f, seed=3)
    _a2, _b2 = split_indices(_n, _f, seed=3)
    assert np.array_equal(_a1, _a2) and np.array_equal(_b1, _b2), "Same seed must give the same split"
    assert len(set(_a1) & set(_b1)) == 0, "Train and test overlap"
    assert sorted(list(_a1) + list(_b1)) == list(range(_n)), "Every row must appear exactly once"
    assert len(_a1) == int(_n * (1 - _f)), "Training size must be int(n * (1 - test_fraction))"
_c, _d = split_indices(50, 0.2, seed=4)
assert not np.array_equal(split_indices(50, 0.2, seed=3)[0], _c), "Different seeds should usually shuffle differently"
print("PASS: seeded split is deterministic, disjoint and complete")

_df = pd.DataFrame({"size_mb": [10, 20, 20, 30, np.nan], "duration_s": [21.0, -1, 40.0, 40.0, np.nan]})
_df = pd.concat([_df, _df.iloc[[2]]], ignore_index=True)
_before = _df.copy()
_out = clean(_df)
pd.testing.assert_frame_equal(_df, _before, obj="clean() must not modify its input")
assert (_out["duration_s"] != -1).all(), "Sentinel -1 must not survive"
assert _out["duration_s"].notna().all(), "Rows with a missing target must be dropped"
assert not _out.duplicated().any(), "Exact duplicates must be removed"
assert len(_out) == 3, f"Expected 3 clean rows, got {len(_out)}"
print("PASS: cleaning handles sentinels, missing targets and duplicates without mutation")

assert fit_median(np.array([2, np.nan, 9, 4, 100])) == 6.5, "Median must ignore NaN"
try:
    fit_median(np.array([np.nan, np.nan]))
    raise AssertionError("fit_median must raise ValueError when every value is missing")
except ValueError:
    pass
_x = np.array([1.0, np.nan, 3.0])
_x_copy = _x.copy()
_filled, _miss = apply_fill(_x, 2.0)
assert np.array_equal(np.isnan(_x), np.isnan(_x_copy)), "apply_fill must not modify x"
np.testing.assert_allclose(_filled, [1, 2, 3])
np.testing.assert_allclose(_miss, [0, 1, 0])
print("PASS: NaN-aware median, indicator and no mutation")

_rng = np.random.default_rng(1)
_Xt = _rng.normal(5, 2, size=(40, 3)); _Xt[:, 2] = 7.0
_Xo = _rng.normal(5, 2, size=(10, 3))
_Zt, _Zo = standardize(_Xt, _Xo)
assert _Zt.shape == _Xt.shape and _Zo.shape == _Xo.shape, "Standardization must preserve shapes"
np.testing.assert_allclose(_Zt[:, :2].mean(axis=0), 0, atol=1e-12)
np.testing.assert_allclose(_Zt[:, :2].std(axis=0), 1, atol=1e-12)
assert np.all(np.isfinite(_Zt)), "Zero-spread columns must not produce NaN or inf"
_Zt2, _Zo2 = standardize(_Xt, _Xo + 1000)
np.testing.assert_allclose(_Zt2, _Zt, err_msg="Training statistics changed when other data changed: leakage")
print("PASS: standardization uses training statistics only")
`,
}
