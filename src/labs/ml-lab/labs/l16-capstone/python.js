const DATA = `import numpy as np
import pandas as pd

# Provided: the same kind of synthetic CI build log as the playground.
def make_jobs(n=600, seed=16):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n))
    files = np.maximum(1, np.round(size / 3 * np.exp(0.4 * rng.normal(size=n))))
    cache = (rng.random(n) < 0.6).astype(int)
    shared = (rng.random(n) < 0.5).astype(int)
    lang = rng.choice(["go", "java", "python"], size=n)
    hour = rng.integers(0, 24, size=n)
    busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    offset = pd.Series(lang).map({"go": 0, "java": 25, "python": 10}).to_numpy()
    duration = 20 + work + offset + 0.05 * files + 15 * shared * busy + (5 + 0.08 * work) * rng.normal(size=n)
    return pd.DataFrame({"size_mb": size, "files": files, "cache_hit": cache, "shared_runner": shared,
                         "language": lang, "hour": hour, "duration_s": np.maximum(3, duration)})
`
export default {
  filename: 'capstone_pipeline.py', packages: ['numpy', 'pandas', 'scikit-learn'], timeout: 240,
  title: 'The same project, with real scikit-learn pipelines.',
  intro: 'Now use the tools professionals use: `ColumnTransformer` and `Pipeline` so that every preprocessing step is fit inside cross-validation, `cross_val_score` for comparisons on shared folds, and a single final evaluation. A data generator (`make_jobs`) is provided. The first run downloads scikit-learn in your browser, which can take a minute.',
  steps: [
    '`add_features(df)` → a **copy** with `log_size`, `size_x_shared`, `size_x_miss` (= size × (1 − cache_hit)) and `shared_busy` (shared runner during hours 9–17).',
    '`build_pipeline(model)` → `Pipeline([("prep", ColumnTransformer(...)), ("model", model)])` that standardizes the numeric columns in `NUMERIC` and one-hot encodes `language` (`handle_unknown="ignore"`).',
    '`compare(models, X, y, cv)` → dict name → `(mean_mae, std_mae)` using `cross_val_score(..., scoring="neg_mean_absolute_error")` with the **same** `cv` for every model.',
    '`final_evaluation(pipeline, X_dev, y_dev, X_test, y_test)` → dict with `model_mae`, `baseline_mae` (predicting the development mean) and `improvement`.',
  ],
  hints: [
    ['ColumnTransformer', '`ColumnTransformer([("num", StandardScaler(), NUMERIC), ("cat", OneHotEncoder(handle_unknown="ignore"), ["language"])])`.'],
    ['Scores are negated', 'scikit-learn maximizes scores, so MAE comes back negative: `scores = -cross_val_score(build_pipeline(m), X, y, cv=cv, scoring="neg_mean_absolute_error")`.'],
    ['Final evaluation', 'Fit on `X_dev, y_dev` only. `mean_absolute_error(y_test, pipeline.predict(X_test))` and `mean_absolute_error(y_test, np.full(len(y_test), y_dev.mean()))`.'],
  ],
  starter: `${DATA}
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import cross_val_score
from sklearn.metrics import mean_absolute_error

NUMERIC = ["size_mb", "files", "cache_hit", "shared_runner", "hour",
           "log_size", "size_x_shared", "size_x_miss", "shared_busy"]

def add_features(df):
    raise NotImplementedError

def build_pipeline(model):
    raise NotImplementedError

def compare(models, X, y, cv):
    raise NotImplementedError

def final_evaluation(pipeline, X_dev, y_dev, X_test, y_test):
    raise NotImplementedError
`,
  solution: `${DATA}
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import cross_val_score
from sklearn.metrics import mean_absolute_error

NUMERIC = ["size_mb", "files", "cache_hit", "shared_runner", "hour",
           "log_size", "size_x_shared", "size_x_miss", "shared_busy"]

def add_features(df):
    out = df.copy()
    out["log_size"] = np.log(out["size_mb"])
    out["size_x_shared"] = out["size_mb"] * out["shared_runner"]
    out["size_x_miss"] = out["size_mb"] * (1 - out["cache_hit"])
    out["shared_busy"] = out["shared_runner"] * out["hour"].between(9, 17).astype(int)
    return out

def build_pipeline(model):
    prep = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["language"]),
    ])
    return Pipeline([("prep", prep), ("model", model)])

def compare(models, X, y, cv):
    results = {}
    for name, model in models.items():
        scores = -cross_val_score(build_pipeline(model), X, y, cv=cv, scoring="neg_mean_absolute_error")
        results[name] = (float(scores.mean()), float(scores.std()))
    return results

def final_evaluation(pipeline, X_dev, y_dev, X_test, y_test):
    pipeline.fit(X_dev, y_dev)
    model_mae = mean_absolute_error(y_test, pipeline.predict(X_test))
    baseline_mae = mean_absolute_error(y_test, np.full(len(y_test), y_dev.mean()))
    return {"model_mae": float(model_mae), "baseline_mae": float(baseline_mae), "improvement": float(baseline_mae - model_mae)}
`,
  solutionNote: 'Because scaling and encoding live inside the pipeline, `cross_val_score` refits them on each training fold automatically — the leakage protection from Lab 06 comes for free. The test rows are used exactly once, after every choice is made.',
  checkSummary: 'Engineered columns and no mutation of the input; a scikit-learn Pipeline whose scaler statistics come only from the rows it was fit on; a comparison on shared folds where a linear model with engineered features and a gradient-boosting model both beat the dummy baseline by a wide margin; and a final evaluation that fits on development data only and reports a positive improvement.',
  checks: `
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import KFold, train_test_split
_df = make_jobs()
_before = _df.copy()
_f = add_features(_df)
assert _df.equals(_before), "add_features must not modify its input"
assert {"log_size", "size_x_shared", "size_x_miss", "shared_busy"} <= set(_f.columns)
_r = _f.iloc[0]
assert abs(_r["size_x_miss"] - _r["size_mb"] * (1 - _r["cache_hit"])) < 1e-9
assert _f["shared_busy"].sum() == ((_f["shared_runner"] == 1) & _f["hour"].between(9, 17)).sum()
print("PASS: engineered features")
_X, _y = _f.drop(columns="duration_s"), _f["duration_s"]
_X_dev, _X_test, _y_dev, _y_test = train_test_split(_X, _y, test_size=0.2, random_state=0)
_p = build_pipeline(Ridge(alpha=1.0))
assert isinstance(_p, Pipeline)
_p.fit(_X_dev.iloc[:100], _y_dev.iloc[:100])
_scaler = _p.named_steps["prep"].named_transformers_["num"]
np.testing.assert_allclose(_scaler.mean_, _X_dev.iloc[:100][NUMERIC].mean().to_numpy(), err_msg="Scaler must learn from the rows it was fit on only")
print("PASS: pipeline fits preprocessing inside fit()")
_cv = KFold(5, shuffle=True, random_state=1)
_res = compare({"dummy": DummyRegressor(), "ridge": Ridge(alpha=1.0), "boosting": HistGradientBoostingRegressor(max_iter=150, random_state=0)}, _X_dev, _y_dev, _cv)
assert set(_res) == {"dummy", "ridge", "boosting"} and all(v[0] > 0 for v in _res.values()), "Report positive MAE values"
assert _res["ridge"][0] < 0.5 * _res["dummy"][0] and _res["boosting"][0] < 0.5 * _res["dummy"][0]
print("PASS: CV comparison — " + ", ".join(f"{k} {v[0]:.1f}±{v[1]:.1f}s" for k, v in _res.items()))
_best = min(_res, key=lambda k: _res[k][0])
_final = final_evaluation(build_pipeline({"ridge": Ridge(alpha=1.0), "boosting": HistGradientBoostingRegressor(max_iter=150, random_state=0), "dummy": DummyRegressor()}[_best]), _X_dev, _y_dev, _X_test, _y_test)
assert abs(_final["improvement"] - (_final["baseline_mae"] - _final["model_mae"])) < 1e-9 and _final["improvement"] > 15
print(f"PASS: final test ({_best}) MAE {_final['model_mae']:.1f}s vs baseline {_final['baseline_mae']:.1f}s")
`,
}
