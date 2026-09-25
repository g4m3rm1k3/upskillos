import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const TRAIN = `import pandas as pd, numpy as np
train = pd.DataFrame({
    "sqft":   [700, 850, 1000, 1200, 1500, 3200],
    "floors": [1, 1, 1, 1, 1, 1],
    "city":   ["North", "South", "North", "East", "South", "North"],
    "income": [28_000, 31_000, 35_000, 42_000, 55_000, 240_000],
})
new = pd.DataFrame({
    "sqft":   [950, 4000],
    "floors": [1, 2],
    "city":   ["South", "West"],
    "income": [33_000, 60_000],
})`

export default {
  id: 'c-04', slug: 'data-transformation', track: 'C', order: 4,
  title: 'Data Transformation and Feature Engineering', subtitle: 'Scaling, Encoding and Fitting on Training Data',
  tags: ['log-transform', 'normalization', 'standardization', 'one-hot', 'feature-engineering'],
  prereqs: ['c-03', 'b-04'], unlocks: ['c-05'],
  hook: {
    question: 'How do you reshape raw columns into features — and apply exactly the same reshaping to data you have not seen yet?',
    realWorldContext: 'Many models work better when numeric columns are on comparable scales, strongly skewed values are compressed, and categories become numbers. Each of those steps learns something from data — a mean, a spread, a list of categories. Learning it from the wrong rows, or failing on a value never seen before, quietly breaks a model after it leaves your notebook.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Decide whether a log transform helps a column, and handle values it cannot take. Scale numeric columns safely, including a column with no spread. Encode categories, including one that first appears in new data. Fit every learned step on training rows and apply it unchanged to new rows.',
        '**The data.** Six training rows and two new rows that arrive later:',
        '| | sqft | floors | city | income |\n|---|---|---|---|---|\n| train | 700 … 3200 | all 1 | North, South, East | 28,000 … 240,000 |\n| new | 950, 4000 | 1, **2** | South, **West** | 33,000, 60,000 |',
        'Three traps are planted: `floors` has no spread in training, the new rows contain a city ("West") never seen in training, and `income` has one very large value.',
        '**Why transformations are "fitted".** Scaling needs a mean and a spread; one-hot encoding needs a list of categories. Those numbers are *learned* from data, like a model\'s weights. So every transformation has two steps: **fit** (learn its numbers from training rows) and **apply** (use those stored numbers on any rows — training, test or brand-new).',
      ),
      check(
        'You standardise sqft with the mean and std of ALL rows, including the new ones. What is wrong?',
        ['Nothing', 'The new rows influenced the numbers used to transform the training rows — information leaks from data the model should not have seen, and results will look better than they will be in use'],
        1,
        'Fit on training rows only, then apply the stored numbers to new rows. The new rows\' scaled values will not have mean 0 — and that is correct.',
      ),
      prose(
        '**Log transforms: diagnose, do not assume.** A log compresses large values more than small ones, so it often *reduces* a long right tail (Lesson B.04). It is not guaranteed to make data symmetric, so compare a summary before and after — for example the ratio of the mean to the median, which is near 1 for a roughly symmetric column. And logs only accept positive values: data with zeros need `np.log1p` (log of 1 + x) or another choice.',
      ),
      notebook('Log transforms', [
        demo(1, 'Stage 1 — Does a log help this column?', [
          'Income has one very large value. The mean/median ratio before and after the log shows how much the tail was compressed.',
        ], 'Run. Then try the same diagnostic on sqft. Then add a 0 to income and see what np.log does.', `${TRAIN}
for name, values in [("income", train["income"]), ("log income", np.log(train["income"]))]:
    print(f"{name:10} mean/median = {values.mean() / values.median():.3f}")`, { expectOutput: ['income     mean/median = 1.866', 'log income mean/median = 1.026'] }),
      ]),
      prose({ anchor: 'fit-and-apply' },
        '**Scaling.** Two common choices, each learned from training rows:',
        '| Method | Formula | Learned numbers | Result on training rows |\n|---|---|---|---|\n| standardise (z-score) | (x − mean) / std | mean, std | mean 0, std 1 |\n| min-max | (x − min) / (max − min) | min, max | between 0 and 1 |',
        'Both divide by a spread. `floors` is 1 in every training row, so its std and its max − min are 0, and dividing gives NaN. Decide explicitly: here, treat a zero spread as 1, so the column becomes all zeros in training. The new row with 2 floors then gets a large value — and that is informative, because it is unlike anything seen in training.',
      ),
      notebook('Scaling', [
        demo(2, 'Stage 2 — Fit on train, apply to new, guard zero spread', [
          'The means and stds are learned once from training rows and stored. The same stored numbers transform the new rows.',
        ], 'Run. Why is the new rows\' sqft mean not 0? Then remove the zero-spread guard and see what happens to floors.', `${TRAIN}
cols = ["sqft", "floors"]
means = train[cols].mean()
stds = train[cols].std(ddof=0).replace(0, 1.0)     # zero spread: avoid dividing by 0
print("stored:", means.round(1).to_dict(), stds.round(1).to_dict())

train_z = (train[cols] - means) / stds
new_z = (new[cols] - means) / stds
print(train_z.round(2).to_string())
print(new_z.round(2).to_string())
print("train sqft mean:", round(train_z["sqft"].mean(), 6))`, { expectOutput: ["stored: {'sqft': 1408.3, 'floors': 1.0} {'sqft': 840.8, 'floors': 1.0}", 'train sqft mean: 0.0'] }),
      ]),
      prose(
        '**Categories.** Many models need numbers, so categories must be encoded — but *how* depends on the model and on the categories:',
        '| Situation | Common choice |\n|---|---|\n| unordered categories (cities) for a linear or distance-based model | **one-hot**: one 0/1 column per category |\n| ordered categories (small < medium < large) | an explicit ordinal code: 0, 1, 2 |\n| many categories (thousands of postcodes) | grouping rare ones, or other encodings — one-hot would create thousands of columns |\n| some tree-based libraries | can accept categories directly |',
        'Integer codes for *unordered* categories are a trap for many models: coding North = 1, South = 2, East = 3 tells a linear model that East is "three times" North. The list of categories is learned from training rows, so plan for a category that appears only later: here "West" gets all-zero one-hot columns, which says "none of the known cities".',
      ),
      check(
        'A new row has city "West", which never appeared in training. With one-hot columns city_East, city_North, city_South fitted on training rows, what should it become?',
        ['An error', 'All three columns 0', 'A new city_West column'],
        1,
        'The columns were fixed at fit time. Adding a column for new data would change the feature layout the model was trained on.',
      ),
      notebook('Encoding', [
        demo(3, 'Stage 3 — One-hot with a category list learned from training', [
          'The categories are learned once from training rows and stored. Encoding the new rows uses the stored list, so the columns match exactly and "West" becomes all zeros.',
        ], 'Run. Then compare with pd.get_dummies(new["city"]): why are its columns different from the training columns?', `${TRAIN}
categories = sorted(train["city"].unique())
print("stored categories:", categories)

def one_hot(df):
    return pd.DataFrame({f"city_{c}": (df["city"] == c).astype(int) for c in categories}, index=df.index)

print(one_hot(train).to_string())
print(one_hot(new).to_string())`, { expectOutput: ["stored categories: ['East', 'North', 'South']"] }),
        demo(4, 'Stage 4 — An ordered category', [
          'Sizes have a real order, so an explicit mapping keeps it. Writing the mapping yourself avoids alphabetical codes (large = 0, medium = 1, small = 2), which scramble the order.',
        ], 'Run. Then see what happens to an unexpected size such as "XL".', `import pandas as pd
sizes = pd.Series(["small", "large", "medium", "small"])
order = {"small": 0, "medium": 1, "large": 2}
print(sizes.map(order).tolist())
print(pd.Series(["XL"]).map(order).tolist())`, { expectOutput: ['[0, 2, 1, 0]', '[nan]'] }),
      ]),
      prose(
        '**Derived features — and one thing never to derive from.** A new column built from existing ones, such as `price_per_sqft = price / sqft`, can expose a relationship a model would otherwise struggle to find. But a feature must be available when you make a prediction. Never build input features from the *target* you are predicting: a feature computed from the answer makes the model look excellent in testing and useless in practice.',
      ),
      prose('**Practice.** Challenge 1 diagnoses a log transform. Challenge 2 builds a zero-spread-safe scaler. Challenge 3 is a fresh problem: a complete fit/apply preprocessor that must handle new rows with unseen values.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Should this column be logged?', 'easy', {
          prompt: 'For the delivery distances, compute ratio_raw (mean / median of the raw values) and ratio_log (the same for np.log1p of the values — some distances are 0). Then set helps to True if the log brings the ratio closer to 1.',
          instructions: 'Use `np.log1p`, because `np.log(0)` is -inf. Compare `abs(ratio - 1)` before and after.',
          code: 'import numpy as np\ndist = np.array([0, 1.5, 2, 2.5, 3, 4, 5, 60])\nratio_raw = None\nratio_log = None\nhelps = None',
          testCode: `import numpy as np
assert ratio_raw is not None and abs(ratio_raw - dist.mean() / np.median(dist)) < 1e-9, "ratio_raw is the mean divided by the median of the raw values"
assert np.isfinite(ratio_log), "ratio_log is not finite: np.log(0) is -inf. Use np.log1p for data containing zeros"
assert abs(ratio_log - np.log1p(dist).mean() / np.median(np.log1p(dist))) < 1e-9, "ratio_log uses np.log1p(dist)"
assert helps is True, "The log brings the mean/median ratio much closer to 1, so it compresses the long tail here"
"SUCCESS: mean/median fell from about 3.55 to about 1.15 — the log helps this column, and log1p handled the zero."`,
          hint: 'logged = np.log1p(dist); ratio_log = logged.mean() / np.median(logged); helps = abs(ratio_log - 1) < abs(ratio_raw - 1)',
          solution: 'import numpy as np\ndist = np.array([0, 1.5, 2, 2.5, 3, 4, 5, 60])\nratio_raw = dist.mean() / np.median(dist)\nlogged = np.log1p(dist)\nratio_log = logged.mean() / np.median(logged)\nhelps = bool(abs(ratio_log - 1) < abs(ratio_raw - 1))',
          misconceptions: [{ code: 'import numpy as np, warnings\nwarnings.simplefilter("ignore")\ndist = np.array([0, 1.5, 2, 2.5, 3, 4, 5, 60])\nratio_raw = dist.mean() / np.median(dist)\nratio_log = np.log(dist).mean() / np.median(np.log(dist))\nhelps = True', feedback: 'Use np.log1p for data containing zeros' }],
        }),
        exercise(12, 2, 'Challenge 2 — A safe standardiser', 'medium', {
          prompt: 'Write fit_scaler(train_df) returning a dict with the column means and population stds (ddof=0) of train_df, and apply_scaler(df, params) returning the standardised DataFrame. A column with zero spread must become zeros, not NaN.',
          instructions: 'Store params as {"mean": Series, "std": Series}. Replace zero stds with 1 inside fit_scaler.',
          code: 'import pandas as pd, numpy as np\n\ndef fit_scaler(train_df):\n    return {"mean": train_df.mean(), "std": train_df.std(ddof=0)}\n\ndef apply_scaler(df, params):\n    return (df - params["mean"]) / params["std"]',
          testCode: `import pandas as pd, numpy as np
tr = pd.DataFrame({"a": [1.0, 2.0, 3.0], "b": [5.0, 5.0, 5.0]})
p = fit_scaler(tr)
out = apply_scaler(tr, p)
assert not out["b"].isna().any(), "Column b has zero spread, so dividing by its std (0) gives NaN. Replace a zero std with 1 in fit_scaler"
assert np.allclose(out["b"], 0), "A zero-spread column should become all zeros"
assert np.allclose(out["a"], [-1.224745, 0, 1.224745]), "Column a should be standardised with its training mean and population std"
new_rows = pd.DataFrame({"a": [10.0], "b": [7.0]})
got = apply_scaler(new_rows, p)
assert np.isclose(got.loc[0, "a"], (10 - 2) / np.std([1, 2, 3])), "New rows must use the TRAINING mean and std, not their own"
"SUCCESS: learned once from training rows, applied unchanged, and safe for a constant column."`,
          hint: 'std = train_df.std(ddof=0).replace(0, 1.0)',
          solution: 'import pandas as pd, numpy as np\n\ndef fit_scaler(train_df):\n    return {"mean": train_df.mean(), "std": train_df.std(ddof=0).replace(0, 1.0)}\n\ndef apply_scaler(df, params):\n    return (df - params["mean"]) / params["std"]',
          misconceptions: [{ code: 'import pandas as pd\ndef fit_scaler(train_df):\n    return {"mean": train_df.mean(), "std": train_df.std(ddof=0)}\ndef apply_scaler(df, params):\n    return (df - params["mean"]) / params["std"]', feedback: 'Replace a zero std with 1 in fit_scaler' }],
        }),
        exercise(13, 3, 'Challenge 3 — A preprocessor for new rows', 'hard', {
          prompt: 'Write fit_preprocess(train) and transform(df, params). fit_preprocess learns, from train only, the mean and population std of each numeric column (zero std treated as 1) and the sorted list of city values. transform returns a NEW DataFrame with the standardised numeric columns followed by one-hot columns city_<name> for the learned cities only, in sorted order. It must not change df.',
          prose: ['The checker fits on training rows, then transforms new rows containing an unseen city and values outside the training range. The new output must have exactly the same columns, in the same order, as the training output.'],
          instructions: 'Keep the numeric column list from training: `train.select_dtypes("number").columns`. Build the one-hot columns from the stored city list, not from df.',
          code: 'import pandas as pd, numpy as np\n\ndef fit_preprocess(train):\n    pass  # return params\n\ndef transform(df, params):\n    return pd.get_dummies(df)',
          testCode: `import pandas as pd, numpy as np
train = pd.DataFrame({"sqft": [700.0, 1000.0, 1300.0], "floors": [1, 1, 1], "city": ["North", "South", "North"]})
new = pd.DataFrame({"sqft": [1600.0], "floors": [2], "city": ["West"]})
p = fit_preprocess(train)
tr_out = transform(train, p)
before = new.copy()
new_out = transform(new, p)
assert new.equals(before), "transform changed its input; build a new DataFrame"
assert list(tr_out.columns) == ["sqft", "floors", "city_North", "city_South"], f"Training output columns should be ['sqft', 'floors', 'city_North', 'city_South'], got {list(tr_out.columns)}"
assert list(new_out.columns) == list(tr_out.columns), f"New rows must produce exactly the training columns in the same order (no city_West column); got {list(new_out.columns)}"
assert not tr_out.isna().any().any() and not new_out.isna().any().any(), "NaN in the output: a zero-spread column (floors) needs std treated as 1"
assert np.isclose(new_out.loc[0, "sqft"], (1600 - 1000) / np.std([700, 1000, 1300])), "New sqft must be scaled with the TRAINING mean and std"
assert new_out.loc[0, ["city_North", "city_South"]].tolist() == [0, 0], "An unseen city should give zeros in every learned city column"
assert np.isclose(new_out.loc[0, "floors"], 1.0), "floors: (2 - 1) / 1 = 1.0 using the stored training mean and the zero-spread guard"
"SUCCESS: same columns in the same order for new data, training-only numbers, unseen city handled, input untouched."`,
          hint: 'params = {"num": list of numeric columns, "mean": ..., "std": ... .replace(0, 1.0), "cities": sorted(train["city"].unique())}. In transform: out = (df[num] - mean) / std, then add one column per stored city.',
          solution: 'import pandas as pd, numpy as np\n\ndef fit_preprocess(train):\n    num = list(train.select_dtypes("number").columns)\n    return {\n        "num": num,\n        "mean": train[num].mean(),\n        "std": train[num].std(ddof=0).replace(0, 1.0),\n        "cities": sorted(train["city"].unique()),\n    }\n\ndef transform(df, params):\n    out = (df[params["num"]] - params["mean"]) / params["std"]\n    for c in params["cities"]:\n        out["city_" + c] = (df["city"] == c).astype(int)\n    return out',
          misconceptions: [{ code: 'import pandas as pd, numpy as np\ndef fit_preprocess(train):\n    num = list(train.select_dtypes("number").columns)\n    return {"num": num, "mean": train[num].mean(), "std": train[num].std(ddof=0).replace(0, 1.0)}\ndef transform(df, params):\n    out = (df[params["num"]] - params["mean"]) / params["std"]\n    return pd.concat([out, pd.get_dummies(df["city"], prefix="city").astype(int)], axis=1)', feedback: 'New rows must produce exactly the training columns' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Every learned transformation has two steps: fit on training rows, apply the stored numbers to any rows.',
    'A log often reduces a right tail — check a before/after summary; use log1p when there are zeros.',
    'Scaling divides by a spread: guard zero-spread columns explicitly.',
    'Encode by situation: one-hot for unordered categories, an explicit order for ordered ones; fix the category list at fit time and map unseen values to all zeros.',
    'Features must be available at prediction time — never derive them from the target.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'When is z-score standardisation typically preferred to min-max scaling?',
      options: [
        'Always',
        'When a few extreme values would squash most min-max values near 0, or when a model is sensitive to feature scale around a centre — z-scores are measured in standard deviations and have no fixed bounds',
        'Only for neural networks',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Why not code unordered cities as 1, 2, 3 for a linear model?',
      options: [
        'pandas cannot store it',
        'The codes imply an order and distances (city 3 = three times city 1) that do not exist; one-hot columns treat each city separately',
        'It uses too much memory',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'After fitting a standardiser on training rows, the test rows\' scaled means are not 0. Is that a bug?',
      options: [
        'Yes — refit on the test rows',
        'No — test rows are scaled with the training numbers, so their mean differs; refitting on test data would leak information',
        'Only if the difference is large',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'A colleague adds a feature "price rank within its city" computed from the house prices they are trying to predict. What is the problem?',
      options: [
        'Ranks cannot be features',
        'The feature is built from the target, so it will not exist for new houses and makes test results unrealistically good (leakage)',
        'Nothing — it is feature engineering',
      ],
      correct: 1,
    },
  ],
}
