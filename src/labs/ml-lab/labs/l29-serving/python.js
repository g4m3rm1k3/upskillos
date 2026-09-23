const TRAIN = `import json
import numpy as np

# Provided: the offline training pipeline (features + standardization + least squares).
LANGS = ["go", "java", "python"]
def features(req):
    shared = 1.0 if req["runner"] == "shared" else 0.0
    busy = 1.0 if 9 <= req["hour"] <= 17 else 0.0
    return np.array([np.log(req["size_mb"]), req["size_mb"] * shared, req["size_mb"] * (1 - req["cache_hit"]),
                     shared * busy, req["files"], req["language"] == "java", req["language"] == "python"], dtype=float)

def train_offline(requests, targets):
    X = np.array([features(r) for r in requests])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    sd[sd == 0] = 1.0
    Z = np.c_[np.ones(len(X)), (X - mu) / sd]
    w = np.linalg.lstsq(Z, targets, rcond=None)[0]
    return {"mu": mu, "sd": sd, "w": w}

def offline_predict(model, req):
    return float(model["w"][0] + ((features(req) - model["mu"]) / model["sd"]) @ model["w"][1:])
`
export default {
  filename: 'serving.py', packages: ['numpy'],
  title: 'A serializable predictor with parity and contract tests.',
  intro: 'The offline training pipeline is provided. Build the serving side: save everything the model needs to a JSON artifact, load it into a `Predictor` that validates each request against a contract and returns versioned responses, and write the parity test that proves serving matches training.',
  steps: [
    '`save_artifact(model, version)` → a JSON **string** with the weights, the preprocessing statistics (as lists) and the version.',
    '`Predictor(artifact_json)`: parse it; `predict(req)` → `{"status": 200, "model_version": ..., "prediction": float}` using the same `features()` as training.',
    'Validation in `predict`: required fields `size_mb, files, cache_hit, runner, language, hour`; numbers must be numbers (not bool/str); `size_mb > 0`, `0 ≤ hour ≤ 23`, `runner ∈ {shared, dedicated}`, `language ∈ LANGS`. On failure return `{"status": 422, "errors": [...]}` listing **every** problem.',
    '`parity(model, predictor, requests, tol)` → `(max_abs_diff, passed)` comparing `offline_predict` with the predictor.',
  ],
  hints: [
    ['JSON and NumPy', '`json.dumps({"mu": model["mu"].tolist(), ...})`; convert back with `np.array(d["mu"])`.'],
    ['Number check', '`isinstance(v, (int, float)) and not isinstance(v, bool)`.'],
  ],
  starter: `${TRAIN}
def save_artifact(model, version):
    raise NotImplementedError

class Predictor:
    def __init__(self, artifact_json):
        raise NotImplementedError

    def predict(self, req):
        raise NotImplementedError

def parity(model, predictor, requests, tol=1e-9):
    raise NotImplementedError
`,
  solution: `${TRAIN}
def save_artifact(model, version):
    return json.dumps({"version": version, "mu": model["mu"].tolist(), "sd": model["sd"].tolist(), "w": model["w"].tolist(), "languages": LANGS})

class Predictor:
    def __init__(self, artifact_json):
        a = json.loads(artifact_json)
        self.version = a["version"]
        self.model = {"mu": np.array(a["mu"]), "sd": np.array(a["sd"]), "w": np.array(a["w"])}

    def predict(self, req):
        errors = []
        is_num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
        for key in ["size_mb", "files", "cache_hit", "runner", "language", "hour"]:
            if key not in req or req[key] is None:
                errors.append(f"{key}: required")
        for key in ["size_mb", "files", "cache_hit", "hour"]:
            if key in req and req[key] is not None and not is_num(req[key]):
                errors.append(f"{key}: must be a number")
        if is_num(req.get("size_mb")) and req["size_mb"] <= 0:
            errors.append("size_mb: must be positive")
        if is_num(req.get("hour")) and not 0 <= req["hour"] <= 23:
            errors.append("hour: must be 0-23")
        if req.get("runner") is not None and req.get("runner") not in ("shared", "dedicated"):
            errors.append("runner: unknown value")
        if req.get("language") is not None and req.get("language") not in LANGS:
            errors.append("language: unknown value")
        if errors:
            return {"status": 422, "errors": errors}
        return {"status": 200, "model_version": self.version, "prediction": offline_predict(self.model, req)}

def parity(model, predictor, requests, tol=1e-9):
    diffs = [abs(offline_predict(model, r) - predictor.predict(r)["prediction"]) for r in requests]
    worst = max(diffs)
    return worst, worst <= tol
`,
  solutionNote: 'The predictor reuses the exact `features()` function from training and loads the saved statistics, so parity holds by construction — and the parity test proves it. Validation collects every error before responding.',
  checkSummary: 'The artifact is a JSON string that survives a round trip; valid requests return status 200, the model version and a float; parity with the offline pipeline to 1e-9 on 50 requests; a deliberately skewed predictor (log10) fails the parity test; and invalid requests return 422 listing every violation.',
  checks: `
import json
import numpy as np
_rng = np.random.default_rng(0)
def _req(i):
    return {"size_mb": float(np.exp(3.7 + 0.8 * _rng.normal())), "files": int(_rng.integers(1, 100)), "cache_hit": int(_rng.integers(0, 2)),
            "runner": ["shared", "dedicated"][int(_rng.integers(0, 2))], "language": LANGS[int(_rng.integers(0, 3))], "hour": int(_rng.integers(0, 24))}
_reqs = [_req(i) for i in range(250)]
_y = np.array([20 + 0.9 * r["size_mb"] * (0.25 if r["cache_hit"] else 1) * (1.6 if r["runner"] == "shared" else 1) + _rng.normal(0, 3) for r in _reqs])
_model = train_offline(_reqs[:200], _y[:200])
_art = save_artifact(_model, "v1.2.0")
assert isinstance(_art, str) and json.loads(_art)["version"] == "v1.2.0", "The artifact must be a JSON string with the version"
_p = Predictor(_art)
_ok = _p.predict(_reqs[200])
assert _ok["status"] == 200 and _ok["model_version"] == "v1.2.0" and isinstance(_ok["prediction"], float)
_worst, _passed = parity(_model, _p, _reqs[200:])
assert _passed and _worst < 1e-9, f"Parity failed: max difference {_worst}"
print(f"PASS: artifact round trip and parity on 50 requests (max difference {_worst:.1e})")
class _Skewed(Predictor):
    def predict(self, req):
        out = super().predict(req)
        if out["status"] == 200:
            x = features(req); x[0] = np.log10(req["size_mb"])
            out["prediction"] = float(self.model["w"][0] + ((x - self.model["mu"]) / self.model["sd"]) @ self.model["w"][1:])
        return out
assert not parity(_model, _Skewed(_art), _reqs[200:])[1], "The parity test must catch a log10/ln skew"
print("PASS: the parity test catches training-serving skew")
_bad = _p.predict({"size_mb": "40", "files": 3, "cache_hit": 0, "runner": "Shared", "language": "rust"})
assert _bad["status"] == 422 and len(_bad["errors"]) == 4, f"Expected 4 errors (size_mb type, hour missing, runner, language), got {_bad}"
assert _p.predict({**_reqs[0], "hour": 25})["status"] == 422 and _p.predict({**_reqs[0], "size_mb": -1.0})["status"] == 422
assert _p.predict({**_reqs[0], "cache_hit": True})["status"] == 422, "Booleans are not numbers in this contract"
print("PASS: invalid requests are rejected with every violation listed")
`,
}
