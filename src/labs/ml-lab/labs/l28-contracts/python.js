export default {
  filename: 'data_contract.py', packages: ['numpy', 'pandas'],
  title: 'Validate data and version every run.',
  intro: 'Implement a data contract validator for a pandas DataFrame, a batch policy that quarantines bad rows or rejects the batch, a content fingerprint that is independent of row and column order, and a run record that ties a model to its data, configuration and code.',
  steps: [
    '`validate(df, contract)` → list of `(row_index, column, rule)` tuples. Rules: `required`, `dtype` ("number" or "string"), `min`, `max`, `allowed`, `unique`. A missing value only violates `required`; a value of the wrong type is reported once as `dtype` and not checked further.',
    '`apply_policy(df, violations, max_bad_share)` → `(accepted, quarantined, decision)` where decision is `"accept"` or `"reject"`; reject when the share of bad rows exceeds the limit (then `accepted` is empty).',
    '`fingerprint(df)` → a SHA-256 hex string of a canonical CSV: columns sorted by name, rows sorted by all columns, no index.',
    '`run_record(df, config, code_version)` → dict with `data`, `config`, `code` and `run_id`; `config` is the SHA-256 of `json.dumps(config, sort_keys=True)`, and `run_id` hashes the three together.',
  ],
  hints: [
    ['Types in pandas', 'A column of numbers read from messy CSV may be `object` dtype. Check each value: numbers with `isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, bool)`; missing with `pd.isna(v)`.'],
    ['Canonical CSV', '`c = df[sorted(df.columns)]`; `c = c.sort_values(list(c.columns)).reset_index(drop=True)`; `hashlib.sha256(c.to_csv(index=False).encode()).hexdigest()`.'],
  ],
  starter: `import hashlib, json
import numpy as np
import pandas as pd

def validate(df, contract):
    raise NotImplementedError

def apply_policy(df, violations, max_bad_share=0.1):
    raise NotImplementedError

def fingerprint(df):
    raise NotImplementedError

def run_record(df, config, code_version):
    raise NotImplementedError
`,
  solution: `import hashlib, json
import numpy as np
import pandas as pd

def _is_number(v):
    return isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, (bool, np.bool_))

def validate(df, contract):
    out = []
    for col, rules in contract.items():
        seen = set()
        for i, v in df[col].items():
            if v is None or (not isinstance(v, str) and pd.isna(v)):
                if rules.get("required"):
                    out.append((i, col, "required"))
                continue
            kind = rules.get("dtype")
            if kind == "number" and not _is_number(v) or kind == "string" and not isinstance(v, str):
                out.append((i, col, "dtype"))
                continue
            if "min" in rules and v < rules["min"]:
                out.append((i, col, "min"))
            if "max" in rules and v > rules["max"]:
                out.append((i, col, "max"))
            if "allowed" in rules and v not in rules["allowed"]:
                out.append((i, col, "allowed"))
            if rules.get("unique"):
                if v in seen:
                    out.append((i, col, "unique"))
                seen.add(v)
    return out

def apply_policy(df, violations, max_bad_share=0.1):
    bad = sorted({i for i, _, _ in violations})
    if len(bad) / len(df) > max_bad_share:
        return df.iloc[0:0], df.loc[bad], "reject"
    return df.drop(index=bad), df.loc[bad], "accept"

def fingerprint(df):
    c = df[sorted(df.columns)]
    c = c.sort_values(list(c.columns)).reset_index(drop=True)
    return hashlib.sha256(c.to_csv(index=False).encode()).hexdigest()

def run_record(df, config, code_version):
    data = fingerprint(df)
    cfg = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    run_id = hashlib.sha256(f"{data}|{cfg}|{code_version}".encode()).hexdigest()[:16]
    return {"data": data, "config": cfg, "code": code_version, "run_id": run_id}
`,
  solutionNote: 'The validator reports every violation with its row, so a batch can be partially accepted and the bad rows sent back upstream with reasons. Fingerprints use a canonical form, so reordering rows or columns does not change the version, but any change of content does.',
  checkSummary: 'Every injected problem is found with the right rule (missing, wrong type, below minimum, above maximum, unknown category, duplicate id) and clean rows produce no violations; the batch policy accepts, quarantines and rejects correctly; fingerprints ignore row and column order but change with any value; run ids change with data, configuration or code and are stable otherwise.',
  checks: `
import numpy as np, pandas as pd
_contract = {"job_id": {"required": True, "dtype": "number", "unique": True}, "size_mb": {"required": True, "dtype": "number", "min": 0, "max": 2000},
             "language": {"dtype": "string", "allowed": ["go", "java", "python"]}, "hour": {"dtype": "number", "min": 0, "max": 23}}
_df = pd.DataFrame({"job_id": [1, 2, 3, 4, 5, 5, 7], "size_mb": [10.0, None, -3.0, 40.0, "37", 20.0, 9.5],
                    "language": ["go", "java", "rust", "python", "go", "go", "java"], "hour": [3, 9, 12, 25, 8, 8, 23]}, dtype=object)
_v = set(validate(_df, _contract))
_expected = {(1, "size_mb", "required"), (2, "size_mb", "min"), (2, "language", "allowed"), (3, "hour", "max"), (4, "size_mb", "dtype"), (5, "job_id", "unique")}
assert _v == _expected, f"Expected {_expected}, got {_v}"
assert validate(_df.iloc[[0, 6]], _contract) == [], "Clean rows must produce no violations"
print("PASS: every injected problem found, no false alarms")
_acc, _q, _dec = apply_policy(_df, list(_v), max_bad_share=0.8)
assert _dec == "accept" and list(_acc.index) == [0, 6] and sorted(_q.index) == [1, 2, 3, 4, 5]
_acc2, _, _dec2 = apply_policy(_df, list(_v), max_bad_share=0.5)
assert _dec2 == "reject" and len(_acc2) == 0
print("PASS: batch policy")
_clean = pd.DataFrame({"a": [3.0, 1.0, 2.0], "b": ["x", "y", "z"]})
_f = fingerprint(_clean)
assert len(_f) == 64 and _f == fingerprint(_clean.iloc[::-1]) == fingerprint(_clean[["b", "a"]]), "Order must not change the fingerprint"
_edited = _clean.copy(); _edited.loc[1, "a"] = 1.0001
assert fingerprint(_edited) != _f, "Any content change must change the fingerprint"
_r1 = run_record(_clean, {"lr": 0.1, "depth": 3}, "abc123")
assert _r1 == run_record(_clean, {"depth": 3, "lr": 0.1}, "abc123"), "Config key order must not matter"
assert _r1["run_id"] != run_record(_clean, {"lr": 0.2, "depth": 3}, "abc123")["run_id"]
assert _r1["run_id"] != run_record(_clean, {"lr": 0.1, "depth": 3}, "abc124")["run_id"]
assert _r1["run_id"] != run_record(_edited, {"lr": 0.1, "depth": 3}, "abc123")["run_id"]
print("PASS: content fingerprints and run records")
`,
}
