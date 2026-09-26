// buildtime_app.py for Lab 33: the worked exemplar as a real end-to-end application (standard library + NumPy).
// Run and checked locally with `python buildtime_app.py check` (Python 3.12, NumPy 2): decision ship (improvement 29.86 s,
// interval 26.32 to 33.59 s); parity over HTTP 2.8e-14 s on 20 requests; 422 and 400 as expected; KB sizes raise the drift
// alert (PSI 8.28) and 7 guard violations; a normal day raises none.
export const APP = `# buildtime_app.py: the Lab 33 worked exemplar as one small end-to-end application (Python standard library + NumPy).
# It predicts how long a CI build will take, so a scheduler can pick a runner before the build starts.
#   python buildtime_app.py data             write builds.csv: 60 days of build logs (the bundled dataset)
#   python buildtime_app.py train            time split, baseline, candidates on the same forward folds, one test
#                                            evaluation with a bootstrap interval, a decision; writes artifact.json
#                                            and model_card.md
#   python buildtime_app.py serve            serve artifact.json on http://127.0.0.1:8033/v1/predict
#   python buildtime_app.py monitor FILE     compare a new CSV batch with the training data (PSI) and apply the guard
#   python buildtime_app.py check            run everything above in a temporary folder and check each step
# Replace builds.csv with your own log (same columns) and the same commands build, evaluate and serve your model.
import csv, json, os, sys, tempfile, threading, urllib.error, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import numpy as np

COLUMNS = ["day", "size_mb", "files", "cache_hit", "runner", "language", "hour", "duration_s"]
LANGS, RUNNERS = ["go", "java", "python"], ["dedicated", "shared"]
MIN_IMPROVEMENT_S = 2.0        # success threshold, written down before modelling: at least 2 s lower MAE than the baseline
GUARD = (1.0, 24 * 3600.0)     # a predicted duration outside [1 s, 24 h] is never served


# ---------- data ----------
def make_log(days=60, per_day=50, seed=33, size_unit=1.0, start_day=0):
    """Synthetic but realistic build logs, in time order. size_unit=1024 simulates an upstream bug (sizes in KB)."""
    rng = np.random.default_rng(seed)
    rows = []
    for d in range(start_day, start_day + days):
        n = per_day
        size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
        cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
        lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
        work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
        dur = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
        for i in range(n):
            rows.append(dict(day=d, size_mb=round(float(size[i]) * size_unit, 2), files=int(files[i]), cache_hit=int(cache[i]),
                             runner=RUNNERS[int(shared[i])], language=str(lang[i]), hour=int(hour[i]), duration_s=round(float(dur[i]), 2)))
    return rows

def write_csv(rows, path):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS); w.writeheader(); w.writerows(rows)

def read_csv(path):
    """Read and validate against the data contract (Lab 28); stop with a clear message on the first broken row."""
    out = []
    with open(path, newline="") as f:
        for i, r in enumerate(csv.DictReader(f), start=2):
            try:
                row = dict(day=int(r["day"]), size_mb=float(r["size_mb"]), files=int(r["files"]), cache_hit=int(r["cache_hit"]),
                           runner=r["runner"], language=r["language"], hour=int(r["hour"]), duration_s=float(r["duration_s"]) if r.get("duration_s") else None)
            except (KeyError, ValueError) as e:
                raise SystemExit(f"{path} line {i}: {e!r} does not match the contract {COLUMNS}")
            problems = validate(row)
            if problems:
                raise SystemExit(f"{path} line {i}: " + "; ".join(problems))
            out.append(row)
    return out


# ---------- features and model ----------
def validate(job):
    problems = []
    for key in ["size_mb", "files", "cache_hit", "runner", "language", "hour"]:
        if key not in job:
            problems.append(f"missing field {key}")
    if problems:
        return problems
    if not (isinstance(job["size_mb"], (int, float)) and job["size_mb"] > 0): problems.append("size_mb must be a positive number")
    if not (isinstance(job["files"], int) and job["files"] >= 1): problems.append("files must be a positive integer")
    if job["cache_hit"] not in (0, 1): problems.append("cache_hit must be 0 or 1")
    if job["runner"] not in RUNNERS: problems.append(f"runner must be one of {RUNNERS}")
    if job["language"] not in LANGS: problems.append(f"language must be one of {LANGS}")
    if not (isinstance(job["hour"], int) and 0 <= job["hour"] <= 23): problems.append("hour must be an integer 0..23")
    return problems

def features(job, kind="full"):
    """One implementation, used by training, evaluation, batch prediction and the HTTP service."""
    shared = 1 if job["runner"] == "shared" else 0
    if kind == "simple":
        return [job["size_mb"], job["files"], job["cache_hit"], shared]
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def fit(rows, kind, lam=1e-3):
    """Ridge regression with standardization from the training rows only."""
    X = np.array([features(r, kind) for r in rows], float); y = np.array([r["duration_s"] for r in rows])
    mu, sd = X.mean(axis=0), X.std(axis=0); sd[sd == 0] = 1
    Z = (X - mu) / sd
    w = np.linalg.solve(Z.T @ Z / len(y) + lam * np.eye(Z.shape[1]), Z.T @ (y - y.mean()) / len(y))
    return {"kind": kind, "mu": mu.tolist(), "sd": sd.tolist(), "w": w.tolist(), "b": float(y.mean())}

def predict(model, rows):
    if model["kind"] == "mean":
        return np.full(len(rows), model["b"])
    X = np.array([features(r, model["kind"]) for r in rows], float)
    return model["b"] + ((X - np.array(model["mu"])) / np.array(model["sd"])) @ np.array(model["w"])

def fit_any(rows, kind):
    return {"kind": "mean", "b": float(np.mean([r["duration_s"] for r in rows]))} if kind == "mean" else fit(rows, kind)

def mae(model, rows):
    return float(np.mean(np.abs(predict(model, rows) - np.array([r["duration_s"] for r in rows]))))


# ---------- evidence ----------
def train(folder="."):
    rows = read_csv(os.path.join(folder, "builds.csv"))
    rows.sort(key=lambda r: r["day"])
    days = sorted({r["day"] for r in rows}); cut = days[int(len(days) * 0.8)]
    dev, test = [r for r in rows if r["day"] < cut], [r for r in rows if r["day"] >= cut]      # the most recent 20% of days is the test set
    print(f"{len(rows)} builds over {len(days)} days; development days {days[0]}-{cut - 1} ({len(dev)} builds), test days {cut}-{days[-1]} ({len(test)} builds)")

    # Candidates declared in advance, compared on the same forward-chaining folds of the development data (Lab 19).
    dev_days = sorted({r["day"] for r in dev}); blocks = np.array_split(np.array(dev_days), 5)
    kinds = ["mean", "simple", "full"]
    scores = {k: [] for k in kinds}
    for f in range(1, 5):
        tr = [r for r in dev if r["day"] < blocks[f][0]]; va = [r for r in dev if blocks[f][0] <= r["day"] <= blocks[f][-1]]
        for k in kinds:
            scores[k].append(mae(fit_any(tr, k), va))
    for k in kinds:
        print(f"  {k:6s} forward-fold MAE: " + "  ".join(f"{s:5.2f}" for s in scores[k]) + f"   mean {np.mean(scores[k]):5.2f} s")
    for k in ["simple", "full"]:
        d = np.array(scores["mean"]) - np.array(scores[k])
        print(f"  baseline − {k}, fold by fold: " + "  ".join(f"{x:+.2f}" for x in d) + f"   (mean {d.mean():+.2f} s)")
    best = min(["simple", "full"], key=lambda k: np.mean(scores[k]))

    # One evaluation on the test period, with a paired bootstrap interval for the improvement over the baseline.
    base, model = fit_any(dev, "mean"), fit_any(dev, best)
    y = np.array([r["duration_s"] for r in test])
    diff = np.abs(predict(base, test) - y) - np.abs(predict(model, test) - y)
    rng = np.random.default_rng(0)
    boots = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(2000)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    decision = "ship" if lo > MIN_IMPROVEMENT_S else "inconclusive" if diff.mean() > MIN_IMPROVEMENT_S else "reject"
    print(f"test: baseline MAE {mae(base, test):.2f} s, {best} MAE {mae(model, test):.2f} s; improvement {diff.mean():.2f} s (95% interval {lo:.2f} to {hi:.2f}); threshold {MIN_IMPROVEMENT_S} s -> {decision}")

    # Error analysis by segment on the test period (Labs 16, 31).
    segments = {}
    for r, e in zip(test, np.abs(predict(model, test) - y)):
        segments.setdefault(f"{r['runner']} runner, cache {'hit' if r['cache_hit'] else 'miss'}", []).append(e)
    seg_text = ", ".join(f"{k} {np.mean(v):.1f} s (n = {len(v)})" for k, v in sorted(segments.items()))
    worst = max(segments, key=lambda k: np.mean(segments[k]))
    print("test MAE by segment:", seg_text)

    # Only if the decision is "ship": refit the chosen candidate on all rows (development + test) for deployment.
    final = fit(rows, best) if decision == "ship" else None
    edges = np.quantile([r["size_mb"] for r in dev], np.linspace(0, 1, 11)[1:-1])
    daily = [psi_deciles(edges, [r["size_mb"] for r in dev if r["day"] == d]) for d in dev_days]     # quiet days: the noise of PSI
    artifact = {"version": "1.0.0", "model": final, "features": best, "columns": COLUMNS[1:7], "output": {"name": "predicted_duration_s", "unit": "seconds"},
                "evidence": {"test_days": [cut, days[-1]], "baseline_mae": mae(base, test), "model_mae": mae(model, test),
                             "improvement_s": float(diff.mean()), "interval_s": [float(lo), float(hi)], "decision": decision, "segments": seg_text,
                             "worst_segment": f"{worst}: {np.mean(segments[worst]):.1f} s against {mae(model, test):.1f} s overall"},
                "monitoring": {"reference": {"size_mb": edges.tolist()},
                               "psi_threshold": float(np.percentile(daily, 99)), "guard": GUARD}}
    with open(os.path.join(folder, "artifact.json"), "w") as f:
        json.dump(artifact, f, indent=1)
    with open(os.path.join(folder, "model_card.md"), "w") as f:
        f.write(model_card(artifact))
    print(f"wrote artifact.json and model_card.md (decision: {decision})")
    return artifact

def model_card(a):
    e = a["evidence"]
    return f"""# Model card: build duration predictor {a['version']}

## Intended use
Predict a CI build's duration before it starts, so the scheduler can choose a runner. A wrong prediction costs queue time, never a failed build.

## Out of scope
Judging developers or teams by their build times; any use on build systems other than the one the data came from.

## Data
{a['columns']} from the build log; test period = days {e['test_days'][0]}-{e['test_days'][1]} (the most recent 20%).

## Evaluation (test period, evaluated once)
Baseline (mean duration) MAE {e['baseline_mae']:.2f} s; model ({a['features']} features) MAE {e['model_mae']:.2f} s.
Improvement {e['improvement_s']:.2f} s, 95% bootstrap interval {e['interval_s'][0]:.2f} to {e['interval_s'][1]:.2f} s, against a threshold of {MIN_IMPROVEMENT_S} s set before modelling: **{e['decision']}**.
By segment: {e['segments']}.

## Limitations
Errors are largest for builds with {e['worst_segment']}. Trained on a period with a stable cache; a change to the build cache would change the relationship (monitor the error, Lab 30).

## Monitoring and rollback
Daily PSI of size_mb against training deciles; alert above {a['monitoring']['psi_threshold']:.3f}, the 99th percentile of quiet development days (with about 50 builds a day, PSI is noisy: Lab 30). Predictions outside {a['monitoring']['guard']} s are replaced by the scheduler's default. Roll back by redeploying the previous artifact.json.
"""


# ---------- monitoring ----------
def psi_deciles(edges, current):
    """PSI of a batch against the training deciles: by construction each bin held 10% of the training values."""
    share = np.maximum(np.bincount(np.searchsorted(edges, current), minlength=10) / len(current), 1e-4)
    return float(np.sum((share - 0.1) * np.log(share / 0.1)))

def monitor(path, folder="."):
    a = json.load(open(os.path.join(folder, "artifact.json")))
    rows = read_csv(path)
    value = psi_deciles(a["monitoring"]["reference"]["size_mb"], [r["size_mb"] for r in rows])
    preds = predict(a["model"], rows) if a["model"] else np.array([])
    outside = int(np.sum((preds < GUARD[0]) | (preds > GUARD[1])))
    alert = value > a["monitoring"]["psi_threshold"]
    print(f"{os.path.basename(path)}: {len(rows)} builds; size PSI {value:.3f} (threshold {a['monitoring']['psi_threshold']:.3f}) -> {'ALERT' if alert else 'ok'}; predictions outside the guard: {outside}")
    return alert, outside


# ---------- serving ----------
def make_handler(artifact):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args): pass
        def reply(self, status, body):
            data = json.dumps(body).encode()
            self.send_response(status); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
        def do_POST(self):
            if self.path != "/v1/predict":
                return self.reply(404, {"error": "unknown path"})
            try:
                job = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"null")
            except json.JSONDecodeError:
                return self.reply(400, {"error": "Request body is not valid JSON"})
            if not isinstance(job, dict):
                return self.reply(400, {"error": "Request body must be a JSON object"})
            problems = validate(job)
            if problems:
                return self.reply(422, {"errors": problems})
            y = float(predict(artifact["model"], [job])[0])
            if not GUARD[0] <= y <= GUARD[1]:
                return self.reply(200, {"model_version": artifact["version"], "predicted_duration_s": None, "fallback": True})
            return self.reply(200, {"model_version": artifact["version"], "predicted_duration_s": y, "request_id": job.get("request_id")})
    return Handler

def serve(folder=".", port=8033):
    artifact = json.load(open(os.path.join(folder, "artifact.json")))
    if artifact["model"] is None:
        raise SystemExit(f"The evidence did not justify shipping (decision: {artifact['evidence']['decision']}); nothing to serve.")
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(artifact))
    return server, artifact


# ---------- the self-check ----------
def post(port, body):
    req = urllib.request.Request(f"http://127.0.0.1:{port}/v1/predict", data=body if isinstance(body, bytes) else json.dumps(body).encode(), method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def check():
    ok = True
    def expect(name, cond):
        nonlocal ok; ok &= bool(cond); print(("PASS " if cond else "FAIL ") + name)
    with tempfile.TemporaryDirectory() as folder:
        write_csv(make_log(), os.path.join(folder, "builds.csv"))
        a = train(folder)
        expect("the evidence clears the pre-set threshold (decision: ship)", a["evidence"]["decision"] == "ship")
        expect("artifact.json and model_card.md were written", all(os.path.exists(os.path.join(folder, f)) for f in ["artifact.json", "model_card.md"]))
        server, artifact = serve(folder, port=0); port = server.server_address[1]
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            golden = make_log(days=1, seed=99, start_day=60)[:20]
            offline = predict(artifact["model"], golden)
            served = [post(port, {**{k: g[k] for k in COLUMNS[1:7]}, "request_id": f"g{i}"})[1]["predicted_duration_s"] for i, g in enumerate(golden)]
            gap = float(np.max(np.abs(np.array(served) - offline)))
            expect(f"parity over HTTP on {len(golden)} requests (largest difference {gap:.1e} s)", gap < 1e-9)
            expect("unknown language -> 422", post(port, {**{k: golden[0][k] for k in COLUMNS[1:7]}, "language": "rust"})[0] == 422)
            expect("broken JSON -> 400", post(port, b"{not json")[0] == 400)
            expect("a JSON list -> 400", post(port, [1, 2])[0] == 400)
        finally:
            server.shutdown()
        write_csv(make_log(days=1, seed=7, start_day=61), os.path.join(folder, "quiet.csv"))
        write_csv(make_log(days=1, seed=8, start_day=62, size_unit=1024), os.path.join(folder, "kb_bug.csv"))
        alert, outside = monitor(os.path.join(folder, "quiet.csv"), folder)
        expect("a normal day raises no alert", not alert and outside == 0)
        alert, outside = monitor(os.path.join(folder, "kb_bug.csv"), folder)
        expect("sizes sent in KB: drift alert and guard violations", alert and outside > 0)
    print("PASS: data, evidence, artifact, service and monitoring all work end to end" if ok else "FAIL: see above")
    return ok


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "data":
        write_csv(make_log(), "builds.csv"); print("wrote builds.csv (3,000 builds over 60 days)")
    elif cmd == "train":
        train()
    elif cmd == "serve":
        server, artifact = serve()
        print(f"serving model {artifact['version']} on http://127.0.0.1:8033/v1/predict (Ctrl+C to stop)"); server.serve_forever()
    elif cmd == "monitor":
        monitor(sys.argv[2])
    elif cmd == "check":
        sys.exit(0 if check() else 1)
    else:
        print(open(__file__).read().split("import csv")[0])
`
