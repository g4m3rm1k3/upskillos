# Lesson 31 — Regression With Keras: When "Always Scale" Isn't the Whole Story

## What you'll learn
- Building a real Keras regression model — continuous output, not 0/1 classification
- What `loss="mse"` actually measures during training, watched shrinking in real time
- A genuinely surprising, real result: scaling inputs alone made this model *worse*, not better
- Why the target's scale matters just as much as the inputs' — something Lessons 24 and 27 didn't need to cover because their examples never required it

## What you'll build
A network predicting box office from budget and year — real synthetic data with real noise, same shape as Lesson 13's original linear regression, now via Keras.

```python
import numpy as np
np.random.seed(11)
n = 100
budget = np.random.uniform(1, 200, n)
year = np.random.randint(2000, 2024, n)
box_office = 3 * budget + 2 * (year - 2000) + np.random.normal(0, 60, n)
```

## The question
Lessons 24 and 27's lesson was clear: scale your features before anything distance- or gradient-based. Apply that here — scale `budget` and `year` with `StandardScaler`, same as always — and see what happens.

## 1. Predict
Given everything from Lesson 24 (unscaled features can dominate a distance calculation) — do you expect scaling `budget` and `year` before training this regression network to help, hurt, or make no real difference?

## 2. Try it — unscaled, as a baseline
```python
import keras
from keras import layers
from sklearn.model_selection import train_test_split

X = np.column_stack([budget, year]).astype("float32")
y = box_office.astype("float32")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

keras.utils.set_random_seed(0)
model = keras.Sequential([
    layers.Input(shape=(2,)),
    layers.Dense(16, activation="relu"),
    layers.Dense(1),
])
model.compile(optimizer="adam", loss="mse")
history = model.fit(X_train, y_train, epochs=100, verbose=0, validation_data=(X_test, y_test))

print("final train loss:", history.history["loss"][-1])
print("final val loss:", history.history["val_loss"][-1])
```

### What this code does
- `layers.Dense(1)` — no `activation` argument at all, meaning the default: no activation function (a plain linear output). This is deliberate and necessary for regression — `sigmoid` (Lesson 30) squashes output between 0 and 1, entirely wrong for predicting a dollar amount that can be in the hundreds.
- `loss="mse"` — mean squared error, exactly the same quantity `LinearRegression.fit()` minimized directly back in Lesson 13, just now minimized via gradient descent instead of a closed-form solution.
- `validation_data=(X_test, y_test)` — tells `fit()` to also evaluate loss on the test set after every epoch (without training on it), so you can watch train and test loss side by side as training proceeds — the neural-network equivalent of the train/test comparisons throughout Lessons 14-23.

### What happens
Real output:
```
final train loss: 51611.69
final val loss: 47685.77
```
These numbers are in **squared dollars** — hard to interpret directly (MSE units are always the target's units, squared), but usable for comparison against what comes next.

## 3. Scaling inputs only — a real, surprising result
```python
from sklearn.preprocessing import StandardScaler

x_scaler = StandardScaler()
X_train_s = x_scaler.fit_transform(X_train).astype("float32")
X_test_s = x_scaler.transform(X_test).astype("float32")

keras.utils.set_random_seed(0)
model2 = keras.Sequential([
    layers.Input(shape=(2,)),
    layers.Dense(16, activation="relu"),
    layers.Dense(1),
])
model2.compile(optimizer="adam", loss="mse")
history2 = model2.fit(X_train_s, y_train, epochs=100, verbose=0, validation_data=(X_test_s, y_test))

print("final train loss:", history2.history["loss"][-1])
print("final val loss:", history2.history["val_loss"][-1])
```
Real output:
```
final train loss: 149295.75
final val loss: 141486.06
```
**Worse** — nearly 3x worse than the unscaled version. If your prediction, based on Lessons 24/27, was "scaling should help or at worst not matter," this is the exact counter-evidence: here, scaling only the inputs made things measurably worse.

## 4. Why? — the target's scale was never addressed
### Code mechanics
`y` (box office) still ranges roughly from tens to nearly a thousand — completely untouched by anything done in step 3. The network's final layer starts with small, randomly-initialized weights (Keras's default initialization draws them from a small range near zero). To produce outputs in the hundreds, that final layer eventually needs to learn genuinely large weights — a big journey from "starts near zero" regardless of whether the inputs feeding into the network are raw budgets (up to 200) or standardized values (roughly -2 to 2). But with standardized (small-magnitude) inputs specifically, the *hidden* layer's `relu` units receive smaller-magnitude weighted sums as well, given the same small initial weights — and with `relu`, an input that lands negative simply outputs exactly 0, contributing nothing to the rest of the network for that example. Combined with unlucky initial weights, a meaningful fraction of the hidden units can end up outputting 0 for most or all training examples early on — the classic **"dying ReLU"** situation — genuinely slowing how much useful information can flow through to help the output layer catch up to `y`'s real scale, within a fixed, limited number of epochs.

### Runtime behavior
This isn't `StandardScaler` failing, or Keras having a bug — every individual piece is behaving exactly as designed. The actual problem is a **mismatch**: scaling addressed the inputs' side of the equation without addressing the *target's* side, and for a neural network specifically (unlike `LinearRegression`'s direct closed-form solve, which doesn't have this initialization-dependent, iterative convergence process at all), that mismatch has a real, measurable cost within a fixed training budget.

### Mental model
```
unscaled inputs (budget up to 200, year up to 2024) → hidden units get
   large-magnitude weighted sums naturally → more units stay "alive" (positive)
   → gradient signal flows more easily → despite mismatched scales, 100 epochs
   is enough to make real progress

scaled inputs (roughly -2 to 2) + unscaled target (up to ~900) → hidden units
   get small-magnitude weighted sums with the same small initial weights →
   more units land negative → more "dead" units early on → less gradient
   signal flowing → slower progress toward matching y's actual scale,
   same epoch budget
```

## 5. The actual fix — scale the target too
```python
y_scaler = StandardScaler()
y_train_s = y_scaler.fit_transform(y_train.reshape(-1, 1)).astype("float32").flatten()
y_test_s = y_scaler.transform(y_test.reshape(-1, 1)).astype("float32").flatten()

keras.utils.set_random_seed(0)
model3 = keras.Sequential([
    layers.Input(shape=(2,)),
    layers.Dense(16, activation="relu"),
    layers.Dense(1),
])
model3.compile(optimizer="adam", loss="mse")
history3 = model3.fit(X_train_s, y_train_s, epochs=100, verbose=0, validation_data=(X_test_s, y_test_s))

print("final train loss:", history3.history["loss"][-1])
print("loss curve (epoch 1, 20, 50, 100):", [round(history3.history["loss"][i], 4) for i in [0, 19, 49, 99]])
```
Real output:
```
final train loss: 0.1102
loss curve (epoch 1, 20, 50, 100): [0.9874, 0.5917, 0.2490, 0.1102]
```

### Code walkthrough
- `y_train.reshape(-1, 1)` — `StandardScaler` expects a 2D input (rows × columns), same as `X` — a 1D target array needs reshaping into a single-column matrix first before scaling, then flattened back afterward for Keras's expected shape.
- The loss curve now shows exactly the clean, steadily-decreasing pattern this lesson would ideally always show: `0.99 → 0.59 → 0.25 → 0.11`, roughly halving every ~20-30 epochs — a real, healthy convergence pattern, in stark contrast to step 3's stuck-near-150,000 result.
- Now *both* sides of the network's job (input scale, output scale) are in comparable, small ranges — the network no longer needs to simultaneously learn "the pattern" and "grow from near-zero weights to a completely different output magnitude" at once.

### Verifying it actually works, in real dollars
```python
from sklearn.metrics import r2_score

predictions_scaled = model3.predict(X_test_s, verbose=0).flatten()
predictions_real = y_scaler.inverse_transform(predictions_scaled.reshape(-1, 1)).flatten()

print("R² on real dollar predictions:", r2_score(y_test, predictions_real))
```
Real output:
```
R² on real dollar predictions: 0.853
```
`y_scaler.inverse_transform(...)` undoes the scaling — converting the network's small, scaled-space outputs back into real predicted dollar amounts — the same round-trip discipline needed any time a target was transformed before training: predictions come out in the transformed space and must be converted back before they mean anything to a human reading them.

## 6. Trap
**Normal rule:** scaling features before training a gradient-based model is always safe and usually helps.
**Apparently equivalent code:** scaling `X` out of habit (correctly following Lessons 24/27's lesson) while leaving `y` untouched, on the unstated assumption that only the inputs' scale matters.
**Surprising result:** measured directly above — scaling inputs alone made this specific model's loss nearly 3x worse than not scaling at all.
**Exact reason:** a neural network's output layer has to learn to produce values on the target's actual scale, regardless of what scale the inputs are on — and starting from small, randomly-initialized weights, that's a real learning task in its own right, one made *harder*, not easier, when the inputs feeding earlier layers are artificially shrunk without a matching adjustment to what the final layer needs to reach.
**Project consequence:** for neural network regression specifically (not `LinearRegression`, which solves directly and doesn't have this issue), scale the target alongside the inputs as standard practice, and always convert predictions back to real units via `inverse_transform` before reporting or evaluating them — treating "scale the features" as the complete rule, learned from Lessons 24 and 27, would have been actively wrong here without this addition.

## Exercise
- **Predict:** If `y` were already naturally small (say, ratings from 1-10 instead of box office in the hundreds), would you still expect scaling inputs alone (without scaling `y`) to hurt convergence the way it did here? Reason about whether the mismatch specifically required a *large* target scale to cause a problem.
- **Modify:** Try scaling only `y` (not `X`) and compare its loss curve to both the unscaled and both-scaled versions. Does scaling just the target, without the inputs, recover most of the benefit on its own?
- **Break:** Use `MinMaxScaler` (0-1 range) instead of `StandardScaler` for both `X` and `y`, and retrain. Does convergence still work well, and does the choice of *which* scaler matter here the way Lesson 24's exercises asked about for clustering?
- **Repair:** Pick whichever scaler converged best in the previous exercise, and write one sentence on whether the specific scaling method mattered as much as the decision to scale the target at all.
- **Trace:** Using the real loss values (`0.9874 → 0.5917 → 0.2490 → 0.1102` at epochs 1, 20, 50, 100), estimate roughly how many additional epochs it would take to reach a loss around `0.05`, reasoning from the apparent rate of decrease — then actually train longer and check your estimate.

## What to remember
- For neural network regression, `Dense(1)` with no activation gives a plain linear output — required for predicting values outside a 0-1 range.
- "Scale your features" (Lessons 24, 27) is necessary but not sufficient for neural network regression — the target's scale matters just as much, for a real, mechanical reason involving how output layers start near-zero and must learn to reach the target's actual range.
- A model's loss getting stuck at a plateau, rather than steadily decreasing, is itself a diagnostic signal worth investigating — not just "train longer," but "why isn't this decreasing the way a healthy training curve should."
- Predictions made on scaled data must be inverse-transformed back to real units before they mean anything to report or evaluate against real values.

## Next lesson
This is a natural place to consolidate rather than add more surface area — a genuinely useful next step would be a review pass: revisiting a handful of traps from across all 31 lessons so far (label encoding, accuracy paradox, unscaled clustering, this lesson's target-scaling surprise) as a single connected set, since several of them share the exact same underlying shape ("a metric looks fine, but something upstream was measured or prepared wrong"). Otherwise, genuinely open: convolutional layers (for image data, a real departure from everything tabular this series has used so far), or back to SWE for anything still uncovered. Your call.
