# Lesson 17 — Multiple Features, and a Trap That Looks Like It Works

## What you'll learn
- How a linear model extends naturally from one input feature to several
- A real, common mistake — turning a category into a plain number — that produces a working-looking model with meaningless coefficients
- Proof that the mistake is meaningless: relabeling the same categories differently changes the "result" with zero real-world change
- One-hot encoding as the actual fix, and what its coefficients mean once done correctly

## What you'll build
A model predicting box office from budget, release year, **and** studio — three features together, where studio is a category (Pixar, Ghibli, A24, Legendary), not a number.

## The question
Budget and year are naturally numeric — Lesson 13-14 already know what to do with those. Studio isn't a number at all. If a model only accepts numeric input, what do you actually do with a column of studio names?

## 1. Predict
Suppose you just assign each studio an arbitrary number — `Pixar=0, Ghibli=1, A24=2, Legendary=3` — and feed that number in alongside budget and year, exactly like any other numeric feature. Before running anything: do you think this technically works (the code runs, produces a number) — and separately, do you think the resulting model's `studio` coefficient means anything sensible?

## 2. Try it — the naive approach
```python
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

np.random.seed(11)
n = 40
studios = ["Pixar", "Ghibli", "A24", "Legendary"]
studio_choice = np.random.choice(studios, n)
budget = np.random.uniform(5, 200, n)
year = np.random.randint(2000, 2024, n)

studio_effect = {"Pixar": 250, "Ghibli": 100, "A24": -50, "Legendary": 180}
box_office = (3 * budget + 2 * (year - 2000)
              + np.array([studio_effect[s] for s in studio_choice])
              + np.random.normal(0, 60, n))

df = pd.DataFrame({"budget": budget, "year": year, "studio": studio_choice, "box_office": box_office})

label_map = {s: i for i, s in enumerate(studios)}
df["studio_code"] = df["studio"].map(label_map)

X = df[["budget", "year", "studio_code"]]
model = LinearRegression().fit(X, df["box_office"])

print("label mapping used:", label_map)
print("coefficients (budget, year, studio_code):", model.coef_)
print("R²:", model.score(X, df["box_office"]))
```

### What this code does
- `{s: i for i, s in enumerate(studios)}` — assigns each studio name a plain integer based purely on its position in the `studios` list: `Pixar=0, Ghibli=1, A24=2, Legendary=3`. This ordering has no real-world meaning whatsoever — it's just the order the list happened to be written in.
- `df["studio"].map(label_map)` — replaces every studio name with its assigned number, producing a new numeric column, `studio_code`.
- `X = df[["budget", "year", "studio_code"]]` — this is genuinely how you extend a model from one feature (Lesson 13) to several: a DataFrame with multiple columns, one per feature, passed to `fit()` exactly as before. Mechanically, nothing about `LinearRegression.fit()` changes at all — it just now finds one coefficient per column instead of one.
- `model.coef_` — with three input columns, this is now an array of three numbers, one per feature, in the same column order as `X`.

### What happens
Real output:
```
label mapping used: {'Pixar': 0, 'Ghibli': 1, 'A24': 2, 'Legendary': 3}
coefficients (budget, year, studio_code): [3.28  -2.25  -33.87]
R²: 0.821
```
This ran without any error, and the R² (0.821) looks entirely reasonable — nothing about this output visibly announces a problem. The `studio_code` coefficient, `-33.87`, would seem to say "each step up in studio code is associated with about $34M less box office" — meaning, taken at face value, that Legendary (code 3) is predicted to make roughly $100M less than Pixar (code 0), purely because 3 is numerically bigger than 0.

## 3. The trap, proven — not just asserted
```python
label_map2 = {s: i for i, s in enumerate(["A24", "Legendary", "Ghibli", "Pixar"])}
df["studio_code2"] = df["studio"].map(label_map2)

X2 = df[["budget", "year", "studio_code2"]]
model2 = LinearRegression().fit(X2, df["box_office"])

print("reordered mapping:", label_map2)
print("coefficients:", model2.coef_)
print("R²:", model2.score(X2, df["box_office"]))
```
Same data, same three studios, same actual movies — only the arbitrary numbers assigned to each studio name changed. Real output:
```
reordered mapping: {'A24': 0, 'Legendary': 1, 'Ghibli': 2, 'Pixar': 3}
coefficients: [3.13  -0.96  60.81]
R²: 0.879
```
The `studio_code` coefficient flipped from **-33.87 to +60.81** — not just a different number, the opposite sign — and R² changed too (0.821 → 0.879), purely from relabeling which integer means which studio, with nothing about the real movies changing at all. This is the proof: if a coefficient's sign and magnitude depend entirely on an arbitrary labeling choice you made up, that coefficient was never measuring anything real about the world in the first place.

## 4. Why does this happen?
### Code mechanics
`LinearRegression` has no way to know `studio_code` represents an unordered category — from its perspective, a numeric column is a numeric column, and it will happily fit a coefficient assuming that going from `1` to `2` means the same kind of change as going from `2` to `3`, exactly like it assumes for budget or year. But "Ghibli minus Pixar" isn't a real quantity the way "$50M more budget" is — there's no meaningful sense in which A24 is "less than" Ghibli by some fixed amount, the way `2000` genuinely is less than `2001`. The model doesn't know this distinction exists; it fits a straight-line relationship across category codes regardless of whether one is meaningful.

### Runtime behavior
Nothing crashes, nothing warns you — `fit()` succeeds, `predict()` produces numbers, `score()` reports a plausible-looking R². This is precisely what makes this trap dangerous: there is no error message anywhere in this process telling you the input was semantically wrong. The model doesn't distinguish "numeric column that means something ordered" from "numeric column that's secretly an arbitrary label" — verifying that distinction is entirely your responsibility.

## 5. The fix — one-hot encoding
```python
onehot = pd.get_dummies(df["studio"], prefix="studio", drop_first=True)
X_onehot = pd.concat([df[["budget", "year"]], onehot], axis=1)

model_onehot = LinearRegression().fit(X_onehot, df["box_office"])

print("columns:", X_onehot.columns.tolist())
print("coefficients:", model_onehot.coef_)
print("intercept:", model_onehot.intercept_)
print("R²:", model_onehot.score(X_onehot, df["box_office"]))
```
Real output:
```
columns: ['budget', 'year', 'studio_Ghibli', 'studio_Legendary', 'studio_Pixar']
coefficients: [3.07  0.45  107.90  173.79  236.48]
intercept: -880.39
R²: 0.930
```

### Code walkthrough
- `pd.get_dummies(df["studio"], prefix="studio", drop_first=True)` — instead of one column with arbitrary numbers, this creates **one column per category, minus one**: `studio_Ghibli`, `studio_Legendary`, `studio_Pixar` — each containing `1` if that row's studio matches, `0` otherwise. `A24` has no column of its own — `drop_first=True` deliberately omits it, making A24 the **baseline** every other studio's coefficient is measured against.
- Each studio's coefficient (`studio_Ghibli: 107.90`, `studio_Legendary: 173.79`, `studio_Pixar: 236.48`) now has a real, meaningful interpretation: "how much more box office this studio is associated with, compared to A24, holding budget and year fixed." No ordering is implied between studios at all — Pixar isn't "more" than Ghibli in any numeric sense, it just has a separately-fit effect.
- Compare these to the actual simulated effects baked into the data: Pixar was set to +250 relative to a baseline, A24 to -50 — a true gap of 300; the fitted Pixar coefficient (236.48) is in the right neighborhood, not exact, because real noise was added and this is only 40 data points, but it's measuring a real, sensible thing, unlike the label-encoded version's coefficient.
- R² also improved meaningfully (0.821/0.879 → 0.930) — one-hot encoding didn't just fix the *interpretation* problem, it let the model fit the data genuinely better, since it's now free to give each studio its own independent effect instead of being forced into a single fake ordering.

### Why this design?
One-hot encoding costs extra columns (one-per-category instead of one-per-feature) in exchange for never implying a false relationship between categories that have none — a direct trade of a small storage/complexity cost for correctness that a single mislabeled numeric column doesn't have to offer at all.

## 6. Trap (restated directly)
**Normal rule:** a numeric column fed into a linear model is treated as an ordered, continuous quantity.
**Apparently equivalent code:** assigning arbitrary integers to category names and feeding that column in exactly like budget or year.
**Surprising result:** the model runs, reports a plausible R², and produces a coefficient — with a sign and magnitude entirely determined by an arbitrary labeling choice, proven directly above by relabeling and watching the coefficient flip sign.
**Exact reason:** `LinearRegression` cannot distinguish "this numeric column represents a real ordered quantity" from "this numeric column happens to contain integers but represents an unordered category" — both look identical to the fitting algorithm.
**Project consequence:** any unordered categorical feature (studio, country, genre, color, or similar) needs one-hot encoding (or a comparably category-aware technique) before going into a linear model — never a plain integer label, no matter how convenient it is to type `.map({...})` and move on. This specific mistake is common enough in real practice that checking "is this numeric-looking column actually an unordered category" is worth doing explicitly for every feature before fitting anything.

## Exercise
- **Predict:** `year` is genuinely numeric and ordered — `2020` really is more than `2010` in a meaningful sense. If you one-hot encoded `year` instead of treating it as numeric, would the model necessarily get worse, better, or does it depend on whether the true relationship with year is actually linear?
- **Modify:** Add a 5th studio to the simulated data and refit the one-hot version. How many dummy columns does `pd.get_dummies(..., drop_first=True)` now produce, and which studio ends up as the implicit baseline?
- **Break:** Set `drop_first=False` instead of `True`, keeping a dummy column for every studio including A24, and refit. `LinearRegression` may now show unstable or nonsensical coefficients (an issue called the "dummy variable trap" — one category's column becomes a redundant linear combination of the others plus the intercept). Compare the resulting coefficients to the `drop_first=True` version.
- **Repair:** Set `drop_first` back to `True`, and explain in one sentence why keeping a dummy for every single category (with no baseline) creates redundant information the model can't cleanly separate.
- **Trace:** Using the one-hot coefficients (`budget: 3.07, year: 0.45, Ghibli: 107.90, Legendary: 173.79, Pixar: 236.48`, `intercept: -880.39`), compute by hand the predicted box office for a Pixar movie with budget=100 and year=2020, then verify it against `model_onehot.predict(...)` on that exact input.

## What to remember
- Extending a linear model to multiple features is mechanically simple — one column per feature, one coefficient per column.
- A plain integer label on an unordered category produces a model that runs and looks reasonable, but whose coefficient for that feature is meaningless — provably so, since relabeling changes it arbitrarily.
- One-hot encoding gives each category its own independent, interpretable coefficient relative to a baseline category, at the cost of extra columns.
- A model succeeding numerically is not evidence its inputs were prepared correctly — that check is entirely on you.

## Next lesson
Decision trees — a model type that, unlike linear regression, can naturally handle a raw categorical feature and even discover non-linear patterns on its own, without needing one-hot encoding at all. Seeing how a fundamentally different model handles the exact same "studio" problem this lesson worked hard to solve is a genuinely useful contrast for understanding what one-hot encoding was actually buying you.
