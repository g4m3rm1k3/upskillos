// Lab 29 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The model is the lab's build-duration model (the same features as the playground), trained by least squares in NumPy.
// A browser cannot open a network port, so the real HTTP service is serve.py (Implement tab), run and checked locally.

export const extras = {
  'l29-modes': {
    formulaTex: '$$\\hat y = b + \\big((X - \\mu)/\\sigma\\big)\\,w$$',
    mathCode: {
      rows: [
        ['$X$', 'np.array([features(j) for j in jobs])', 'Many requests at once: one row each.'],
        ['$(X - \\mu)/\\sigma$', '(X - artifact["mu"]) / np.array(artifact["sd"])', 'Standardized with the training statistics.'],
        ['$\\hat y$', 'artifact["b"] + ... @ np.array(artifact["w"])', 'Every prediction in one matrix product (batch).'],
      ],
    },
    notebook: {
      title: 'Lab 29.1 · Batch or online prediction?',
      intro: 'The same 20,000 predictions as one batch and one request at a time.',
      cells: [
        {
          title: 'Batch against one at a time',
          prose: '**Predict** how many times faster the batch is.',
          code: `import json, numpy as np
LANGS = ["go", "java", "python"]
def make_jobs(n, seed):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(round(s, 1)), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def features(job):
    """The one feature implementation, used by training AND by serving."""
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = np.column_stack([np.ones(len(X)), (X - mu) / sd])
    w = np.linalg.lstsq(Z, y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

import time
artifact = train_artifact()
jobs = make_jobs(20000, seed=1)
X = np.array([features(j) for j in jobs])
t0 = time.perf_counter()
batch = artifact["b"] + ((X - artifact["mu"]) / np.array(artifact["sd"])) @ np.array(artifact["w"])   # all at once
t_batch = time.perf_counter() - t0
t0 = time.perf_counter()
one_by_one = [predict(artifact, j) for j in jobs[:2000]]                                              # a request at a time
t_single = (time.perf_counter() - t0) / 2000 * 20000
print(f"20,000 predictions as one batch: {t_batch * 1000:.1f} ms; one request at a time: about {t_single * 1000:.0f} ms")
print("same numbers:", np.allclose(batch[:2000], one_by_one))`,
        },
      ],
    },
  },
  'l29-artifact': {
    formulaTex: '$$\\max_i \\big|\\hat y_i^\\mathrm{served} - \\hat y_i^\\mathrm{offline}\\big| \\le \\varepsilon$$',
    mathCode: {
      rows: [
        ['artifact', 'json.dumps({"version", "mu", "sd", "b", "w"})', 'Weights and every learned preprocessing statistic, saved together.'],
        ['features(job)', 'def features(job): ...', 'One implementation, imported by training and serving.'],
        ['$\\varepsilon$', 'np.abs(served - offline).max() < 1e-6', 'The parity tolerance.'],
      ],
    },
    notebook: {
      title: 'Lab 29.2 · The model artifact and preprocessing parity',
      intro: 'Save, load, and prove the served predictions equal the offline ones — then three rewritten servers that fail.',
      cells: [
        {
          title: 'Save, load, compare',
          prose: '**Predict** the largest difference.',
          code: `import json, numpy as np
LANGS = ["go", "java", "python"]
def make_jobs(n, seed):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(round(s, 1)), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def features(job):
    """The one feature implementation, used by training AND by serving."""
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = np.column_stack([np.ones(len(X)), (X - mu) / sd])
    w = np.linalg.lstsq(Z, y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

artifact = train_artifact()
saved = json.dumps(artifact)                          # what goes to disk: weights AND preprocessing statistics
loaded = json.loads(saved)
print(f"artifact: {len(saved)} bytes, keys {list(loaded)}")
requests = make_jobs(60, seed=77)
offline = np.array([predict(artifact, r) for r in requests])
served = np.array([predict(loaded, r) for r in requests])          # the server loads the file and shares features()
print(f"parity: largest difference {np.abs(served - offline).max():.2e} s")`,
        },
        {
          title: 'Three rewritten servers',
          prose: 'Each loads the correct weights. **Predict** which gives the largest error.',
          code: `def log10_server(a, reqs):                              # rewritten: log10 instead of the natural log
    out = []
    for r in reqs:
        x = features(r); x[0] = np.log10(r["size_mb"])
        out.append(a["b"] + ((np.array(x) - a["mu"]) / np.array(a["sd"])) @ np.array(a["w"]))
    return np.array(out)
def batch_stats_server(a, reqs):                        # rewritten: standardizes with the incoming batch's statistics
    X = np.array([features(r) for r in reqs])
    return a["b"] + ((X - X.mean(axis=0)) / X.std(axis=0)) @ np.array(a["w"])
def onehot_server(a, reqs):                             # rewritten: the two language columns in the other order
    X = np.array([features(r) for r in reqs]); X[:, [5, 6]] = X[:, [6, 5]]
    return a["b"] + ((X - a["mu"]) / np.array(a["sd"])) @ np.array(a["w"])
for name, server in [("log10", log10_server), ("batch statistics", batch_stats_server), ("one-hot order", onehot_server)]:
    diff = np.abs(server(loaded, requests) - offline)
    print(f"{name:17s}: largest difference {diff.max():6.1f} s, mean {diff.mean():5.1f} s -> parity {'passes' if diff.max() < 1e-6 else 'FAILS'}")`,
        },
      ],
    },
  },
  'l29-api': {
    formulaTex: '$$s \\in \\{200,\\ 400,\\ 422\\}$$',
    mathCode: {
      rows: [
        ['$s$', 'status', 'The response status.'],
        ['400', 'json.JSONDecodeError', 'The body is not valid JSON.'],
        ['422', 'errors: list of every violation', 'Well-formed, but breaks the contract.'],
        ['200', '{"model_version", "predicted_duration_s", "request_id"}', 'A traceable prediction.'],
      ],
    },
    notebook: {
      title: 'Lab 29.3 · The prediction API contract',
      intro: 'A request handler that validates first, then predicts, and names the model version.',
      cells: [
        {
          title: 'Three requests',
          prose: '**Predict** each status code.',
          code: `import json, numpy as np
LANGS = ["go", "java", "python"]
def make_jobs(n, seed):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(round(s, 1)), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def features(job):
    """The one feature implementation, used by training AND by serving."""
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = np.column_stack([np.ones(len(X)), (X - mu) / sd])
    w = np.linalg.lstsq(Z, y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

import json
SCHEMA = {"size_mb": ("number", 0, 2000), "files": ("number", 1, 10**6), "cache_hit": ("number", 0, 1),
          "runner": ("string", ["shared", "dedicated"]), "language": ("string", LANGS), "hour": ("number", 0, 23)}
def handle(body):
    """Validate, then predict. Returns (status, response)."""
    try:
        req = json.loads(body)
    except json.JSONDecodeError as e:
        return 400, {"error": "Request body is not valid JSON", "detail": str(e)}
    if not isinstance(req, dict):
        return 400, {"error": "Request body must be a JSON object"}
    errors = []
    for key, (kind, a, *b) in SCHEMA.items():
        v = req.get(key)
        if v is None: errors.append(f"{key}: required"); continue
        is_num = isinstance(v, (int, float)) and not isinstance(v, bool)
        if (kind == "number") != is_num: errors.append(f"{key}: expected {kind}"); continue
        if kind == "string" and v not in a: errors.append(f"{key}: must be one of {', '.join(a)}")
        if kind == "number" and not (a <= v <= b[0]): errors.append(f"{key}: must be between {a} and {b[0]}")
    if errors:
        return 422, {"error": "Request does not match the contract", "details": errors}
    return 200, {"model_version": artifact["version"], "predicted_duration_s": round(predict(artifact, req), 1), "request_id": req.get("request_id")}

artifact = train_artifact()
for body in ['{"size_mb": 40, "files": 120, "cache_hit": 0, "runner": "shared", "language": "go", "hour": 10, "request_id": "r1"}',
             '{"size_mb": "40", "files": 120, "cache_hit": 0, "runner": "shared", "language": "rust", "hour": 10}',
             '{"size_mb": 40, "files": 120,']:
    print(*handle(body))`,
        },
      ],
    },
  },
  'l29-latency': {
    formulaTex: '$$c(B) = \\frac{1000\\,B}{o + p\\,B}$$',
    mathCode: {
      rows: [
        ['$o$, $p$', 'overhead=8.0, per_item=2.0', 'Milliseconds per call and per request.'],
        ['$c(B)$', '1000 * batch / (overhead + per_item * batch)', 'Requests per second with batches of B.'],
        ['p95', 'np.percentile(latencies, 95)', '95% of requests finish within this time.'],
      ],
    },
    notebook: {
      title: 'Lab 29.4 · Latency, throughput and batching',
      intro: 'Capacity by formula, then a queue simulation of one server with and without micro-batching.',
      cells: [
        {
          title: 'Capacity and the queue',
          prose: '**Predict** what happens to one-at-a-time latency between 80 and 150 requests per second.',
          code: `import numpy as np
def capacity(batch, overhead=8.0, per_item=2.0):
    return 1000 * batch / (overhead + per_item * batch)
print("capacity, requests per second:", {B: round(capacity(B), 1) for B in (1, 2, 4, 8, 16)})

def simulate(rate, max_batch, seconds=20, overhead=8.0, per_item=2.0, seed=3):
    """One server; requests arrive at random; it takes up to max_batch waiting requests at a time."""
    rng = np.random.default_rng(seed)
    arrivals = np.cumsum(rng.exponential(1000 / rate, int(rate * seconds * 1.2)))
    arrivals = arrivals[arrivals < seconds * 1000]
    latencies, free, i = [], 0.0, 0
    while i < len(arrivals):
        start = max(free, arrivals[i])
        j = i
        while j < len(arrivals) and j - i < max_batch and arrivals[j] <= start:   # everything already waiting
            j += 1
        end = start + overhead + per_item * (j - i)
        latencies.extend(end - arrivals[i:j]); free, i = end, j
    return np.percentile(latencies, 95)

for rate in (40, 80, 95, 150, 300):
    print(f"{rate:3d} requests/s: p95 latency one at a time {simulate(rate, 1):8.1f} ms   batches up to 8 {simulate(rate, 8):7.1f} ms")`,
        },
      ],
    },
  },
  'l29-test': {
    formulaTex: '$$|\\hat y_g - y_g^\\ast| < \\delta$$',
    mathCode: {
      rows: [
        ['contract tests', 'handle(body)[0] == 422', 'Invalid requests get the right status.'],
        ['$y_g^\\ast$, $\\delta$', 'golden["g1"], 0.05', 'A stored answer for this model version, and the tolerance of the golden test.'],
      ],
    },
    notebook: {
      title: 'Lab 29.5 · Testing the full prediction path',
      intro: 'A small test suite for the handler. The same checks run over real HTTP in serve.py --check.',
      cells: [
        {
          title: 'The handler',
          prose: 'As in 29.3.',
          code: `import json, numpy as np
LANGS = ["go", "java", "python"]
def make_jobs(n, seed):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(round(s, 1)), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def features(job):
    """The one feature implementation, used by training AND by serving."""
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = np.column_stack([np.ones(len(X)), (X - mu) / sd])
    w = np.linalg.lstsq(Z, y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

import json
SCHEMA = {"size_mb": ("number", 0, 2000), "files": ("number", 1, 10**6), "cache_hit": ("number", 0, 1),
          "runner": ("string", ["shared", "dedicated"]), "language": ("string", LANGS), "hour": ("number", 0, 23)}
def handle(body):
    """Validate, then predict. Returns (status, response)."""
    try:
        req = json.loads(body)
    except json.JSONDecodeError as e:
        return 400, {"error": "Request body is not valid JSON", "detail": str(e)}
    if not isinstance(req, dict):
        return 400, {"error": "Request body must be a JSON object"}
    errors = []
    for key, (kind, a, *b) in SCHEMA.items():
        v = req.get(key)
        if v is None: errors.append(f"{key}: required"); continue
        is_num = isinstance(v, (int, float)) and not isinstance(v, bool)
        if (kind == "number") != is_num: errors.append(f"{key}: expected {kind}"); continue
        if kind == "string" and v not in a: errors.append(f"{key}: must be one of {', '.join(a)}")
        if kind == "number" and not (a <= v <= b[0]): errors.append(f"{key}: must be between {a} and {b[0]}")
    if errors:
        return 422, {"error": "Request does not match the contract", "details": errors}
    return 200, {"model_version": artifact["version"], "predicted_duration_s": round(predict(artifact, req), 1), "request_id": req.get("request_id")}

artifact = train_artifact()
for body in ['{"size_mb": 40, "files": 120, "cache_hit": 0, "runner": "shared", "language": "go", "hour": 10, "request_id": "r1"}',
             '{"size_mb": "40", "files": 120, "cache_hit": 0, "runner": "shared", "language": "rust", "hour": 10}',
             '{"size_mb": 40, "files": 120,']:
    print(*handle(body))`,
        },
        {
          title: 'The tests',
          prose: '**Predict** which test would fail if the model were retrained on new data.',
          code: `results = []
def check(name, condition):
    results.append(condition); print(("PASS " if condition else "FAIL ") + name)

good = '{"size_mb": 40, "files": 120, "cache_hit": 0, "runner": "shared", "language": "go", "hour": 10, "request_id": "g1"}'
check("valid request -> 200 with the model version", handle(good)[0] == 200 and handle(good)[1]["model_version"] == artifact["version"])
check("unknown language -> 422", handle(good.replace('"go"', '"rust"'))[0] == 422)
check("text instead of a number -> 422", handle(good.replace('40', '"40"', 1))[0] == 422)
check("broken JSON -> 400", handle(good[:-1])[0] == 400)
check("valid JSON that is not an object -> 400", handle("[1, 2]")[0] == 400)
check("all violations listed at once", len(handle('{"hour": 30}')[1]["details"]) == 6)
golden = {"g1": 94.6}                                  # stored when this model version was released
check("golden request unchanged for this version", abs(handle(good)[1]["predicted_duration_s"] - golden["g1"]) < 0.05)
print(f"{sum(results)}/{len(results)} tests passed")`,
        },
      ],
    },
  },
}
