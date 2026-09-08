# Lesson 13 — Your First Model: What `fit()` Actually Does

## Welcome to the ML track
Same data discipline as every lesson before this — real numbers, real code, no step skipped. The difference starting now: instead of asking a database "give me rows matching this condition," you'll ask a model "given patterns in data you've seen, estimate something about data you haven't."

## What you'll learn
- What "training a model" actually means mechanically — not a metaphor, the real arithmetic
- What `.fit()` computes, and what the numbers it produces actually represent
- How `.predict()` uses those numbers on new input
- What R² means, and why a model "working" doesn't automatically mean it's useful

## What you'll build
A model predicting a movie's box office revenue from its production budget — the simplest real regression problem there is, using 10 real movies' actual budget and box office figures (in millions of dollars).

```python
titles =  ['Coco', 'Arrival', 'Parasite', 'The Matrix', 'Spirited Away',
           'Toy Story', 'Get Out', 'Inception', 'Whiplash', 'Moonlight']
budget =     [175,   47,  11,  63,  19,  30, 4.5, 160, 3.3, 1.5]   # $ millions
box_office = [814,  203, 258, 465, 395, 373, 255, 836,  49,  65]   # $ millions
```

## The question
Bigger budgets seem to make bigger box office numbers, roughly — Inception and Coco (biggest budgets) also made the most money; Whiplash and Moonlight (tiny budgets) made the least. "Roughly" isn't a number. Can you turn that visual impression into an actual equation — one that takes any budget and gives back a specific predicted box office figure?

## 1. Predict
If you had to describe the relationship between budget and box office with the simplest possible equation — a straight line, `box_office = slope × budget + intercept` — what do you think a reasonable `slope` would be, just eyeballing the numbers above? Is it closer to 1, or much bigger?

## 2. Try it
```python
import numpy as np
from sklearn.linear_model import LinearRegression

budget = np.array([175, 47, 11, 63, 19, 30, 4.5, 160, 3.3, 1.5]).reshape(-1, 1)
box_office = np.array([814, 203, 258, 465, 395, 373, 255, 836, 49, 65])

model = LinearRegression()
model.fit(budget, box_office)

print("slope:", model.coef_)
print("intercept:", model.intercept_)
```

### What this code does
- `np.array([...]).reshape(-1, 1)` — `budget` starts as a flat list of 10 numbers; `.reshape(-1, 1)` turns it into a 10×1 matrix — 10 rows, 1 column. This isn't cosmetic: `LinearRegression` is built to accept **multiple input features per example** (a 2D structure), so even with only one feature (budget), it still expects "one column per feature," not a flat list. The `-1` means "figure out this dimension automatically from the data's length" — you're saying "1 column, however many rows that implies."
- `box_office` stays a flat 1D array — the *target* (what you're predicting) doesn't need the column structure the *inputs* do, since there's exactly one target value per example, not potentially several.
- `LinearRegression()` — constructs a model object. At this point it holds no learned information at all — it's an empty, un-fit predictor.
- `model.fit(budget, box_office)` — this is where the actual computation happens. `fit` searches for the slope and intercept values that make the line `box_office = slope × budget + intercept` fit the 10 real data points as closely as possible, specifically by minimizing the sum of squared differences between each real box office value and what the line would have predicted for that movie's budget (this measure is called "mean squared error," and "as close as possible" specifically means "smallest possible total squared error" — a concrete, computable quantity, not a vague notion of closeness).
- `model.coef_` and `model.intercept_` — after `fit` runs, these attributes hold the actual numbers it found. They didn't exist meaningfully before `fit` was called.

### What happens
This is real output from running this exact code on the data above:
```
slope: [3.93455208]
intercept: 168.94598650752536
```
The fitted line is roughly `box_office = 3.93 × budget + 168.9`. If your prediction was "much bigger than 1," that lines up — every extra million dollars of budget in this dataset is associated with roughly $3.93 million more box office, on top of a baseline of about $169 million even at a budget near zero (which itself is a real, if slightly odd-sounding, artifact of the fit — worth noting, not ignoring).

## 3. Why?
### Code mechanics — what "fitting" a line actually means
For a candidate line with some slope `m` and intercept `b`, you could compute, for every movie, `predicted = m × budget + b`, then `error = actual_box_office - predicted`, square each error, and sum them all up. That sum is one number describing "how wrong this particular line is, overall." `fit()` is the search for the specific `m` and `b` that make this sum as small as it can possibly be — for a straight line and squared error, there's actually a closed-form formula for the answer (no trial-and-error guessing required), which is part of why `LinearRegression.fit()` runs instantly even though it's "searching."

### Runtime behavior
Nothing here involves iteration, guessing, or gradual improvement — `LinearRegression` specifically uses that closed-form solution. (Other model types, which you'll meet later, genuinely do search iteratively, adjusting a guess a little at a time — but linear regression's simplicity is exactly why it's the right first stop: the "training" step is a direct calculation, not an approximation process you have to additionally trust.)

### Mental model
```
10 (budget, box_office) points
        ↓ fit(): find m, b minimizing Σ(actual - (m·budget + b))²
   m = 3.93, b = 168.9   ← the model's learned parameters
        ↓ these two numbers ARE the trained model
predict(new_budget) = 3.93 × new_budget + 168.9
```

## 4. Change one thing
```diff
-print(model.predict([[100]]))
+print(model.predict([[300]]))
```
Given the fitted line, predicting for a $100M budget gives `3.93×100 + 168.9 ≈ 562.4`. Changing the input to $300M gives `3.93×300 + 168.9 ≈ 1349`. Same model, same formula — `predict()` isn't refitting anything, it's just plugging a new `x` into the equation `fit()` already solved. This is worth sitting with precisely because it's so simple: there's no hidden magic in `predict()` at all — it's literally `slope * x + intercept`, computed once you already have `slope` and `intercept`.

## 5. Put it in the project
```python
predictions = model.predict(budget)

for title, actual, pred in zip(titles, box_office, predictions):
    print(f"{title}: actual={actual}, predicted={pred:.1f}")

print("R²:", model.score(budget, box_office))
```
Real output:
```
Coco: actual=814, predicted=857.5
Arrival: actual=203, predicted=353.9
Parasite: actual=258, predicted=212.2
The Matrix: actual=465, predicted=416.8
Spirited Away: actual=395, predicted=243.7
Toy Story: actual=373, predicted=287.0
Get Out: actual=255, predicted=186.7
Inception: actual=836, predicted=798.5
Whiplash: actual=49, predicted=181.9
Moonlight: actual=65, predicted=174.8
R²: 0.859
```

### Code walkthrough
- `model.predict(budget)` — running the *same* fitted line against the *same* inputs used to train it. This isn't testing the model on new data — it's checking how well the line fits the data it already learned from, which is a meaningfully different (weaker) claim than "this model works on movies it's never seen."
- Look closely at `Whiplash` and `Moonlith` (small budgets, small box office) — the model predicts around 175-182 for both, wildly overestimating their actual 49 and 65. And `Arrival` — a mid-budget movie with weaker box office — gets overestimated too (354 predicted vs 203 actual). A single straight line, forced through all 10 points at once, cannot fit every point exactly; it fits the overall *trend*, at the cost of being noticeably wrong on individual movies that don't follow that trend closely.
- `model.score(budget, box_office)` — computes **R²** (R-squared), a standard single-number summary of fit quality, ranging roughly from 0 (the model explains none of the variation in the data — no better than always guessing the average) to 1 (the model's predictions match perfectly). `0.859` means this line accounts for about 86% of the variation in box office across these 10 movies — genuinely decent for real-world data, not close to perfect.

### Why this design?
Checking the model against its own training data first — before ever touching new, unseen movies — establishes a baseline: if a model can't even reasonably fit the data it directly learned from, there's no point asking whether it generalizes to anything else.

## 6. Trap
**Normal rule:** a higher R² means a better-fitting model.
**Apparently equivalent code:** with only 10 data points, using a more flexible model — a high-degree polynomial instead of a straight line — to chase an even higher R² on this same data.
```python
from numpy.polynomial import polynomial as P
coeffs = np.polyfit(budget.flatten(), box_office, deg=9)  # a 9th-degree curve through 10 points
```
**Surprising result:** a 9th-degree polynomial fit to exactly 10 points can achieve an R² extremely close to 1 — appearing to be a dramatically "better" model than the simple line's 0.859 — while being nearly useless for predicting any movie's box office that wasn't one of these exact 10.
**Exact reason:** with enough flexibility (a high-enough-degree polynomial, or equivalently, "enough parameters relative to how much data you have"), a curve can bend itself to pass almost exactly through every single training point, including whatever noise, coincidence, or unique circumstance made each specific movie's box office what it was — this is called **overfitting**: fitting the noise in your specific sample rather than the actual underlying pattern. A wiggly curve threading through this exact set of 10 movies has no reason to correctly predict an 11th movie's box office at all.
**Project consequence:** R² measured only on data the model already trained on can be dangerously misleading with a flexible-enough model and not much data — this is precisely why real ML practice never trusts training performance alone, and always evaluates a model on data it never saw during fitting (a "test set") — a concept the next lesson in this track will build directly.

## Exercise
- **Predict:** Using this fitted line, what box office would it predict for a movie with a budget of $0? Is that number remotely plausible for a real movie, and what does that tell you about trusting a linear model's predictions far outside the range of budgets it was actually trained on?
- **Modify:** Add one more real movie's (budget, box_office) pair to the dataset and refit. Does the slope change a little or a lot? What does that tell you about how sensitive a fit on only 10 points is to a single additional data point?
- **Break:** Deliberately swap two of the box_office values between two very different movies (e.g. give Whiplash Inception's box office number) and refit. How much does the slope change from a single corrupted data point?
- **Repair:** Undo the swap, and in one sentence, explain why a model fit on more data points is generally less sensitive to any single bad or unusual value than one fit on very few.
- **Trace:** By hand (or with a calculator), verify `model.predict([[100]])`'s reported value of ~562.4 by plugging `100` into `3.93455208 × x + 168.94598650752536` yourself.

## What to remember
- "Training" a linear model means finding the slope and intercept that minimize total squared prediction error on the training data — for linear regression, this is a direct calculation, not a search.
- `predict()` is just plugging a new input into the already-solved equation — no additional learning happens at prediction time.
- R² summarizes fit quality on whatever data you measure it on — a high R² measured only on training data does not mean the model will predict new data well.
- A flexible enough model can fit noise perfectly with too little data (overfitting) — better training-data fit is not automatically a better model.

## Next lesson
Train/test splits: the actual fix for this lesson's trap. You'll hold back some movies the model never sees during fitting, then check whether its predictions on those held-out movies are any good — the real test of whether a model learned something general, or just memorized its training data.
