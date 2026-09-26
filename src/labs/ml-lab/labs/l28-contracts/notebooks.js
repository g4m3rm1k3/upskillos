// Lab 28 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The incoming batch has the playground's injected problems (a missing size, a negative size, 'rust', hour 25, '37' as
// text, a duplicate id, 'Shared', twelve durations in minutes, a missing duration); the jobs come from a NumPy generator.

export const extras = {
  'l28-assumptions': {
    formulaTex: '$$\\forall i, c:\\ \\ v_{ic} \\in R_c$$',
    mathCode: {
      rows: [
        ['$R_c$', 'CONTRACT[col]', 'The rules for column c: type, required, range, allowed values, uniqueness.'],
        ['$v_{ic}$', 'df[col][i]', 'One value of the incoming batch.'],
        ['violation', '(row, column, rule, value)', 'One record per broken rule, so the report says exactly what was wrong.'],
      ],
    },
    notebook: {
      title: 'Lab 28.1 · A model is a set of assumptions about data',
      intro: 'A batch with realistic problems, a contract written as data, and a validator that reports every violation.',
      cells: [
        {
          title: 'The batch and the contract',
          prose: '**Look** at the rows before running the next cell: which problems can you spot by eye?',
          code: `import numpy as np, pandas as pd
def make_jobs(n, seed):
    """Clean build jobs: the kind of data the model was trained on."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "job_id": np.arange(1000, 1000 + n),
        "size_mb": np.round(np.exp(np.log(40) + 0.9 * rng.normal(size=n)), 1),
        "files": rng.integers(5, 400, n),
        "cache_hit": rng.integers(0, 2, n),
        "runner": rng.choice(["shared", "dedicated"], n),
        "language": rng.choice(["go", "java", "python"], n),
        "hour": rng.integers(0, 24, n),
    })
    df["duration_s"] = np.round(20 + 0.9 * df.size_mb * np.where(df.cache_hit == 1, 0.25, 1) + 5 * rng.normal(size=n), 1)
    return df

def incoming_batch(seed=5):
    """60 new jobs, with the playground's problems injected."""
    df = make_jobs(60, seed).astype(object)        # mixed types can arrive, as from a CSV export
    df.loc[3, "size_mb"] = None                    # missing required value
    df.loc[7, "size_mb"] = -12.0                   # impossible value
    df.loc[11, "language"] = "rust"                # a category never seen in training
    df.loc[15, "hour"] = 25                        # out of range
    df.loc[19, "files"] = "37"                     # a number that arrived as text
    df.loc[23] = df.loc[22]                        # a duplicated job id
    df.loc[31, "runner"] = "Shared"                # inconsistent casing
    df.loc[40:51, "duration_s"] = (df.loc[40:51, "duration_s"].astype(float) / 60).round(2)   # now in minutes
    df.loc[53, "duration_s"] = None
    return df

CONTRACT = {
    "job_id":     {"type": "number", "required": True, "unique": True},
    "size_mb":    {"type": "number", "required": True, "min": 0, "max": 2000},
    "files":      {"type": "number", "required": True, "min": 1},
    "cache_hit":  {"type": "number", "allowed": [0, 1]},
    "runner":     {"type": "string", "allowed": ["shared", "dedicated"]},
    "language":   {"type": "string", "allowed": ["go", "java", "python"]},
    "hour":       {"type": "number", "min": 0, "max": 23},
    "duration_s": {"type": "number", "required": True, "min": 0},
}

batch = incoming_batch()
print(batch.head(8).to_string())
print("columns the contract covers:", list(CONTRACT))`,
        },
        {
          title: 'Validate',
          prose: '**Predict** how many rows break at least one rule.',
          code: `import numbers
def validate(df, contract):
    """One record per broken rule: (row, column, rule, value). A wrong type is reported once, as a type error."""
    violations = []
    for col, rule in contract.items():
        seen = set()
        for i, v in df[col].items():
            missing = v is None or (isinstance(v, float) and np.isnan(v))
            if missing:
                if rule.get("required"): violations.append((i, col, "required", v))
                continue
            is_number = isinstance(v, numbers.Number) and not isinstance(v, bool)
            if (rule["type"] == "number") != is_number:
                violations.append((i, col, f"type {rule['type']}", v)); continue
            if "min" in rule and v < rule["min"]: violations.append((i, col, f">= {rule['min']}", v))
            if "max" in rule and v > rule["max"]: violations.append((i, col, f"<= {rule['max']}", v))
            if "allowed" in rule and v not in rule["allowed"]: violations.append((i, col, f"in {rule['allowed']}", v))
            if rule.get("unique"):
                if v in seen: violations.append((i, col, "unique", v))
                seen.add(v)
    return violations

batch = incoming_batch()
violations = validate(batch, CONTRACT)
for row, col, rule, value in violations:
    print(f"row {row:2d}  {col:10s} breaks {rule!s:28s} value {value!r}")
bad = sorted({row for row, *_ in violations})
print(f"{len(bad)} of {len(batch)} rows break at least one rule: {bad}")`,
        },
      ],
    },
  },
  'l28-validation': {
    formulaTex: '$$b = \\frac{|B|}{n} \\qquad b \\le \\ell$$',
    mathCode: {
      rows: [
        ['$B$', 'bad = sorted({row for row, *_ in violations})', 'The rows with at least one violation.'],
        ['$b$', 'len(bad) / len(df)', 'Their share; the batch is accepted (with B quarantined) when b ≤ ℓ.'],
        ['$\\ell$', 'limit=0.25', 'The largest bad share a quarantine policy tolerates.'],
        ['quarantine', 'df.drop(index=bad)', 'Accept the good rows, send the bad ones back to their owner.'],
      ],
    },
    notebook: {
      title: 'Lab 28.2 · Row rules, batch policies and quarantine',
      intro: 'The same batch under three policies.',
      cells: [
        {
          title: 'The helpers',
          prose: 'The generator, contract and validator from 28.1, so this notebook runs on its own.',
          code: `import numpy as np, pandas as pd
def make_jobs(n, seed):
    """Clean build jobs: the kind of data the model was trained on."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "job_id": np.arange(1000, 1000 + n),
        "size_mb": np.round(np.exp(np.log(40) + 0.9 * rng.normal(size=n)), 1),
        "files": rng.integers(5, 400, n),
        "cache_hit": rng.integers(0, 2, n),
        "runner": rng.choice(["shared", "dedicated"], n),
        "language": rng.choice(["go", "java", "python"], n),
        "hour": rng.integers(0, 24, n),
    })
    df["duration_s"] = np.round(20 + 0.9 * df.size_mb * np.where(df.cache_hit == 1, 0.25, 1) + 5 * rng.normal(size=n), 1)
    return df

def incoming_batch(seed=5):
    """60 new jobs, with the playground's problems injected."""
    df = make_jobs(60, seed).astype(object)        # mixed types can arrive, as from a CSV export
    df.loc[3, "size_mb"] = None                    # missing required value
    df.loc[7, "size_mb"] = -12.0                   # impossible value
    df.loc[11, "language"] = "rust"                # a category never seen in training
    df.loc[15, "hour"] = 25                        # out of range
    df.loc[19, "files"] = "37"                     # a number that arrived as text
    df.loc[23] = df.loc[22]                        # a duplicated job id
    df.loc[31, "runner"] = "Shared"                # inconsistent casing
    df.loc[40:51, "duration_s"] = (df.loc[40:51, "duration_s"].astype(float) / 60).round(2)   # now in minutes
    df.loc[53, "duration_s"] = None
    return df

CONTRACT = {
    "job_id":     {"type": "number", "required": True, "unique": True},
    "size_mb":    {"type": "number", "required": True, "min": 0, "max": 2000},
    "files":      {"type": "number", "required": True, "min": 1},
    "cache_hit":  {"type": "number", "allowed": [0, 1]},
    "runner":     {"type": "string", "allowed": ["shared", "dedicated"]},
    "language":   {"type": "string", "allowed": ["go", "java", "python"]},
    "hour":       {"type": "number", "min": 0, "max": 23},
    "duration_s": {"type": "number", "required": True, "min": 0},
}

import numbers
def validate(df, contract):
    """One record per broken rule: (row, column, rule, value). A wrong type is reported once, as a type error."""
    violations = []
    for col, rule in contract.items():
        seen = set()
        for i, v in df[col].items():
            missing = v is None or (isinstance(v, float) and np.isnan(v))
            if missing:
                if rule.get("required"): violations.append((i, col, "required", v))
                continue
            is_number = isinstance(v, numbers.Number) and not isinstance(v, bool)
            if (rule["type"] == "number") != is_number:
                violations.append((i, col, f"type {rule['type']}", v)); continue
            if "min" in rule and v < rule["min"]: violations.append((i, col, f">= {rule['min']}", v))
            if "max" in rule and v > rule["max"]: violations.append((i, col, f"<= {rule['max']}", v))
            if "allowed" in rule and v not in rule["allowed"]: violations.append((i, col, f"in {rule['allowed']}", v))
            if rule.get("unique"):
                if v in seen: violations.append((i, col, "unique", v))
                seen.add(v)
    return violations

print("helpers ready: make_jobs, incoming_batch, CONTRACT, validate")`,
        },
        {
          title: 'Three policies',
          prose: '**Predict** each decision before running.',
          code: `def decide(df, violations, policy="quarantine", limit=0.25):
    bad = sorted({row for row, *_ in violations})
    share = len(bad) / len(df)
    if policy == "reject" and bad:
        return "reject the whole batch", df.iloc[0:0]
    if share > limit:
        return f"reject: {share:.0%} of rows failed (limit {limit:.0%})", df.iloc[0:0]
    return f"accept {len(df) - len(bad)} rows, quarantine {len(bad)}", df.drop(index=bad)

batch = incoming_batch(); violations = validate(batch, CONTRACT)
for policy, limit in [("reject", 0.25), ("quarantine", 0.25), ("quarantine", 0.10)]:
    message, accepted = decide(batch, violations, policy, limit)
    print(f"{policy:10s} limit {limit:.0%}: {message}")`,
        },
      ],
    },
  },
  'l28-distribution': {
    formulaTex: '$$z = \\frac{\\bar x - \\mu_\\mathrm{ref}}{\\sigma_\\mathrm{ref}/\\sqrt n} \\qquad z_q = \\frac{\\hat p - q}{\\sqrt{q(1-q)/n}}$$',
    mathCode: {
      rows: [
        ['$\\mu_\\mathrm{ref}$, $\\sigma_\\mathrm{ref}$', 'train_durations.mean(), train_durations.std()', 'Statistics stored from the training data.'],
        ['$z$', '(x.mean() - ref_mean) / (ref_sd / np.sqrt(len(x)))', 'How far the batch mean is from training, in standard errors.'],
        ['$q$', 'train_durations.quantile(0.01)', 'A low quantile of training: 1% of training durations fall below it.'],
        ['$\\hat p$, $z_q$', '(x < q01).mean()', 'The share of the batch below it, compared with the expected 1%.'],
      ],
    },
    notebook: {
      title: 'Lab 28.3 · Distribution checks catch what rows cannot',
      intro: 'The twelve minute-valued durations pass every row rule. Two batch-level checks, one of which finds them.',
      cells: [
        {
          title: 'The helpers',
          prose: 'As in 28.1.',
          code: `import numpy as np, pandas as pd
def make_jobs(n, seed):
    """Clean build jobs: the kind of data the model was trained on."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "job_id": np.arange(1000, 1000 + n),
        "size_mb": np.round(np.exp(np.log(40) + 0.9 * rng.normal(size=n)), 1),
        "files": rng.integers(5, 400, n),
        "cache_hit": rng.integers(0, 2, n),
        "runner": rng.choice(["shared", "dedicated"], n),
        "language": rng.choice(["go", "java", "python"], n),
        "hour": rng.integers(0, 24, n),
    })
    df["duration_s"] = np.round(20 + 0.9 * df.size_mb * np.where(df.cache_hit == 1, 0.25, 1) + 5 * rng.normal(size=n), 1)
    return df

def incoming_batch(seed=5):
    """60 new jobs, with the playground's problems injected."""
    df = make_jobs(60, seed).astype(object)        # mixed types can arrive, as from a CSV export
    df.loc[3, "size_mb"] = None                    # missing required value
    df.loc[7, "size_mb"] = -12.0                   # impossible value
    df.loc[11, "language"] = "rust"                # a category never seen in training
    df.loc[15, "hour"] = 25                        # out of range
    df.loc[19, "files"] = "37"                     # a number that arrived as text
    df.loc[23] = df.loc[22]                        # a duplicated job id
    df.loc[31, "runner"] = "Shared"                # inconsistent casing
    df.loc[40:51, "duration_s"] = (df.loc[40:51, "duration_s"].astype(float) / 60).round(2)   # now in minutes
    df.loc[53, "duration_s"] = None
    return df

CONTRACT = {
    "job_id":     {"type": "number", "required": True, "unique": True},
    "size_mb":    {"type": "number", "required": True, "min": 0, "max": 2000},
    "files":      {"type": "number", "required": True, "min": 1},
    "cache_hit":  {"type": "number", "allowed": [0, 1]},
    "runner":     {"type": "string", "allowed": ["shared", "dedicated"]},
    "language":   {"type": "string", "allowed": ["go", "java", "python"]},
    "hour":       {"type": "number", "min": 0, "max": 23},
    "duration_s": {"type": "number", "required": True, "min": 0},
}

import numbers
def validate(df, contract):
    """One record per broken rule: (row, column, rule, value). A wrong type is reported once, as a type error."""
    violations = []
    for col, rule in contract.items():
        seen = set()
        for i, v in df[col].items():
            missing = v is None or (isinstance(v, float) and np.isnan(v))
            if missing:
                if rule.get("required"): violations.append((i, col, "required", v))
                continue
            is_number = isinstance(v, numbers.Number) and not isinstance(v, bool)
            if (rule["type"] == "number") != is_number:
                violations.append((i, col, f"type {rule['type']}", v)); continue
            if "min" in rule and v < rule["min"]: violations.append((i, col, f">= {rule['min']}", v))
            if "max" in rule and v > rule["max"]: violations.append((i, col, f"<= {rule['max']}", v))
            if "allowed" in rule and v not in rule["allowed"]: violations.append((i, col, f"in {rule['allowed']}", v))
            if rule.get("unique"):
                if v in seen: violations.append((i, col, "unique", v))
                seen.add(v)
    return violations

print("helpers ready: make_jobs, incoming_batch, CONTRACT, validate")`,
        },
        {
          title: 'A mean test and a quantile test',
          prose: '**Predict** which check flags the minutes. (The playground’s batch happens to cross |z| > 3 on the mean; this one does not.)',
          code: `batch = incoming_batch(); violations = validate(batch, CONTRACT)
clean = batch.drop(index=sorted({r for r, *_ in violations}))
train_durations = make_jobs(600, seed=16)["duration_s"]     # the training data
x = clean["duration_s"].astype(float)

# 1. The batch mean against the training mean.
ref_mean, ref_sd = train_durations.mean(), train_durations.std()
z_mean = (x.mean() - ref_mean) / (ref_sd / np.sqrt(len(x)))
print(f"mean: {x.mean():.1f} s against {ref_mean:.1f} s in training, z = {z_mean:.2f} -> flag: {abs(z_mean) > 3}")

# 2. A quantile check: how many durations fall below the training data's 1st percentile?
q01 = train_durations.quantile(0.01)
share = (x < q01).mean()
z_share = (share - 0.01) / np.sqrt(0.01 * 0.99 / len(x))
print(f"below {q01:.1f} s (1% of training durations): {share:.1%} of the batch, z = {z_share:.1f} -> flag: {abs(z_share) > 3}")
print("the rows responsible:", clean.index[(x < q01).to_numpy()].tolist())`,
        },
        {
          title: 'Categories and volume',
          prose: '**Predict** which category is new.',
          code: `reference_share = {"go": 1 / 3, "java": 1 / 3, "python": 1 / 3}
batch = incoming_batch()
share = batch["language"].value_counts(normalize=True)
for lang, s in share.items():
    note = "NEW CATEGORY" if lang not in reference_share else f"reference {reference_share[lang]:.2f}"
    print(f"{lang:7s} {s:.3f}   {note}")
print(f"rows: {len(batch)}  (expected about 60 per batch)")`,
        },
      ],
    },
  },
  'l28-versioning': {
    formulaTex: '$$r = H\\big(H(D)\\,\\|\\,H(C)\\,\\|\\,g\\big)$$',
    mathCode: {
      rows: [
        ['$H(D)$', 'data_version(df)', 'SHA-256 of a canonical CSV: sorted columns and rows, fixed formatting.'],
        ['$H(C)$', 'config_version(config)', 'SHA-256 of the configuration with sorted keys.'],
        ['$g$', '"git:3a04b3cb"', 'The code version.'],
        ['$\\|$', 'a + b + c', 'Concatenation.'],
        ['$r$', 'run_id', 'The run id: the same inputs always give the same id.'],
      ],
    },
    notebook: {
      title: 'Lab 28.4 · Versioning data, code and configuration',
      intro: 'Content hashes that ignore row order and key order but notice a 0.1 s edit.',
      cells: [
        {
          title: 'Hash the content, not the name',
          prose: '**Predict** which of the three tables share a version.',
          code: `import hashlib, json, pandas as pd
def data_version(df):
    """Hash a canonical form of the table: sorted columns and rows, fixed number formatting."""
    canonical = df.sort_index(axis=1).sort_values(list(sorted(df.columns))).to_csv(index=False, float_format="%.6f")
    return hashlib.sha256(canonical.encode()).hexdigest()
def config_version(config):
    return hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()

table = pd.DataFrame({"size_mb": [12.0, 40.5, 7.2], "duration_s": [31.0, 58.4, 25.1]})
edited = table.copy(); edited.loc[1, "duration_s"] += 0.1
shuffled = table.sample(frac=1, random_state=1)
print("original     ", data_version(table)[:12])
print("rows shuffled", data_version(shuffled)[:12], "  (same data, same version)")
print("one value +0.1", data_version(edited)[:12], "  (a new version)")
a, b = {"lr": 0.05, "features": ["size", "files"]}, {"features": ["size", "files"], "lr": 0.05}
print("config, keys in either order:", config_version(a)[:12], config_version(b)[:12])
run_id = hashlib.sha256((data_version(table) + config_version(a) + "git:3a04b3cb").encode()).hexdigest()[:12]
print("run id:", run_id, "  hexadecimal characters in a full SHA-256:", len(data_version(table)))`,
        },
      ],
    },
  },
  'l28-tracking': {
    formulaTex: '$$H(\\hat w) = H(w^\\ast)$$',
    mathCode: {
      rows: [
        ['registry row', '{"data": ..., "config": ..., "weights": fp}', 'What was trained on what, with which settings.'],
        ['$w^\\ast$', 'registry[0]["weights"]', 'The recorded weights (as a fingerprint).'],
        ['$H(\\hat w)$', 'sha256(json.dumps(np.round(w, 6).tolist()))', 'A fingerprint of the weights, rounded so harmless last-digit differences do not matter.'],
      ],
    },
    notebook: {
      title: 'Lab 28.5 · Experiment tracking and rebuilding a model',
      intro: 'Record a run, rebuild it from its record, and see what an in-place data edit does.',
      cells: [
        {
          title: 'Record, rebuild, compare',
          prose: 'This notebook runs in a fresh Python every time you open it. **Predict** whether the rebuilt fingerprint equals the recorded one — and whether it will match the one printed in local Python, 33d3c564b20d.',
          code: `import hashlib, json, numpy as np, pandas as pd
def train(df, config):
    """A deterministic least-squares fit; returns the weights and a fingerprint of them."""
    X = np.column_stack([np.ones(len(df))] + [df[c].to_numpy(float) for c in config["features"]])
    w = np.linalg.lstsq(X, df["duration_s"].to_numpy(float), rcond=None)[0]
    fingerprint = hashlib.sha256(json.dumps(np.round(w, 6).tolist()).encode()).hexdigest()[:12]
    return w, fingerprint

rng = np.random.default_rng(28)
data = pd.DataFrame({"size_mb": rng.uniform(1, 100, 200).round(1), "files": rng.integers(5, 400, 200)})
data["duration_s"] = (20 + 0.9 * data.size_mb + 0.05 * data.files + rng.normal(0, 5, 200)).round(1)
config = {"features": ["size_mb", "files"]}

registry = []
w, fp = train(data, config)
registry.append({"data": hashlib.sha256(data.to_csv(index=False).encode()).hexdigest()[:12], "config": json.dumps(config), "weights": fp})
print("recorded run:", registry[0])
_, rebuilt = train(data, json.loads(registry[0]["config"]))          # rebuild from the record
print("rebuild matches the recorded weights:", rebuilt == registry[0]["weights"])
edited = data.copy(); edited.loc[0, "duration_s"] += 0.1
_, after_edit = train(edited, config)
print("after editing one stored value in place:", after_edit, "vs recorded", registry[0]["weights"])`,
        },
      ],
    },
  },
}
