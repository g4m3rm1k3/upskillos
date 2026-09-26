// serve.py for Lab 29: a real HTTP service (standard library + NumPy). Run and checked locally with
// `python serve.py --check` (Python 3.12, NumPy 2): parity over HTTP 0.00 s on 20 requests; 422 and 400 as expected.
export const SERVE = `# A real HTTP prediction service for the Lab 29 model, using only the Python standard library and NumPy.
#   python serve.py            serve on http://127.0.0.1:8029  (POST JSON to /v1/predict)
#   python serve.py --check    start the service, send real HTTP requests to it, check them, and stop
# Try it by hand:  curl -s -X POST localhost:8029/v1/predict -d '{"size_mb": 40, "files": 120, "cache_hit": 0,
#                  "runner": "shared", "language": "go", "hour": 10, "request_id": "r1"}'
import json, sys, threading, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import numpy as np

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
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    w = np.linalg.lstsq(np.column_stack([np.ones(len(X)), (X - mu) / sd]), y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

SCHEMA = {"size_mb": ("number", 0, 2000), "files": ("number", 1, 10**6), "cache_hit": ("number", 0, 1),
          "runner": ("string", ["shared", "dedicated"]), "language": ("string", LANGS), "hour": ("number", 0, 23)}
def handle(artifact, body):
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

ARTIFACT = train_artifact()
class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/v1/predict":
            self.send_error(404); return
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        status, response = handle(ARTIFACT, body)
        data = json.dumps(response).encode()
        self.send_response(status); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def log_message(self, *args):
        pass

def post(url, body):
    request = urllib.request.Request(url, data=body.encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8029), Handler)
    if "--check" not in sys.argv:
        print("serving on http://127.0.0.1:8029/v1/predict  (Ctrl+C to stop)"); server.serve_forever()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url, ok = "http://127.0.0.1:8029/v1/predict", True
    requests = make_jobs(20, seed=77)
    worst = 0.0
    for r in requests:                                           # parity over real HTTP
        body = {k: r[k] for k in SCHEMA}; body["request_id"] = "p"
        status, resp = post(url, json.dumps(body))
        ok &= status == 200
        worst = max(worst, abs(resp["predicted_duration_s"] - round(predict(ARTIFACT, r), 1)))
    print(f"parity over HTTP for {len(requests)} requests: largest difference {worst:.2f} s")
    ok &= worst == 0
    for name, body, want in [("unknown language", '{"size_mb": 40, "files": 120, "cache_hit": 0, "runner": "shared", "language": "rust", "hour": 10}', 422),
                             ("broken JSON", '{"size_mb": 40,', 400), ("JSON that is not an object", '[1, 2]', 400)]:
        status, resp = post(url, body); ok &= status == want
        print(f"{name}: status {status} (expected {want})")
    server.shutdown()
    print("PASS: the service answers over HTTP and matches the offline model" if ok else "FAIL")
    sys.exit(0 if ok else 1)
`
