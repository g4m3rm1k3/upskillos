# Lesson 6 — Real API Calls: When "It Worked" Doesn't Mean What You Think

## A one-lesson detour
Every lesson so far used `movies.csv`/`movies.json`/`movies.xml` — files you control, that exist or don't, with contents you already know. A real API needs a real server to talk to, and there's no public movie API reachable from here without an account and a key. So this lesson uses GitHub's public API instead — same exact concepts (HTTP request out, JSON response back), on a live endpoint you can actually hit. Lesson 7 returns to the movie files.

In fact, the specific trap in this lesson wasn't planned — it's a **real response** this exact code produced when I ran it to write this lesson. That's not a coincidence; it's the point.

## What you'll learn
- What actually happens on the wire when you make an HTTP request — and why "the code ran without error" and "I got the data I wanted" are two separate claims
- Why a 403 or 404 response is not a Python exception — `requests` will hand it to you as calmly as a 200
- Why `response.json()` can succeed and return a perfectly good dict that is nonetheless *not the data you asked for*
- Why network calls need a `timeout`, when a local file read never did

## The question
Reading a local file (Lesson 1) either works or fails immediately and loudly — the file's there or it isn't, right now, on your disk. A network request has a whole extra dimension of failure a file never had: it can succeed as a *network transaction* — bytes sent, bytes received, no exception anywhere — while still not giving you what you wanted at all. What does that actually look like in code?

## 1. Predict
```python
import requests
response = requests.get("https://api.github.com/repos/python/cpython", timeout=5)
```
Before reading further: if this line runs with no exception, does that mean the request "succeeded"? Write down what you think `response.status_code` will be, and what `response.json()` will contain.

## 2. Try it
```python
import requests

response = requests.get("https://api.github.com/repos/python/cpython", timeout=5)

print("status:", response.status_code)
print("body:", response.json())
print("type of body:", type(response.json()))
```

### What this code does
- `requests.get(url, timeout=5)` — sends an HTTP GET request and **blocks** (pauses this line of code) until a response arrives or `timeout` seconds pass. `requests` is a third-party library (`pip install requests`), not part of core Python — HTTP isn't a language feature, it's a protocol a library implements on your behalf.
- `timeout=5` — an explicit ceiling. Without it, this call could hang **indefinitely** if the server never responds — unlike `open()` on a local file, which either finds the file immediately or fails immediately; there's no equivalent "the disk might just never answer" case for local files.
- The line completing without raising an exception means exactly one thing: *some* HTTP response came back before the timeout. It says nothing about whether that response contains what you wanted.
- `response.status_code` — the numeric HTTP status the server sent: `200` means success, `404` means not found, `403` means forbidden, `500` means the server itself errored. This is data *in* the response, not an exception `requests` raises for you automatically.
- `response.json()` — parses the response body as JSON and returns Python objects, exactly like `json.loads` from Lesson 4. It will do this **regardless of the status code** — a JSON-formatted error message parses just as successfully as a JSON-formatted success payload.

### What happens
This is the actual output from running this exact code:
```
status: 403
body: {'message': "API rate limit exceeded for 35.196.153.210. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)", 'documentation_url': 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'}
type of body: <class 'dict'>
```

No exception. `response.json()` returned a real, valid `dict` — the same type you'd get from a successful response. If you predicted a `dict` with repository info (`full_name`, `stargazers_count`, etc.), that's the expected shape for a *successful* call — but the actual response was a rate-limit rejection, shaped as valid JSON with completely different keys. The code "worked" in the sense that nothing crashed; it did not get you the repository data.

## 3. Why?
### Code mechanics
`requests.get()` raising an exception and the server returning an error status are **two entirely different failure channels**:
- Exceptions (`requests.exceptions.Timeout`, `ConnectionError`, etc.) mean the request itself couldn't be completed — no server ever responded, the network was unreachable, or the timeout elapsed.
- A non-2xx status code means the request *was* completed — a server received it and sent back a deliberate answer, and that answer happens to be "no" or "not now," expressed as data, not as a Python-level error.

`requests` deliberately does not treat the second case as an exception by default, because plenty of code legitimately wants to inspect a 404 or 403 without a `try/except` — think of a script checking "does this URL exist" as its actual job.

### Runtime behavior
`response.json()` has no idea what a "correct" response looks like for your specific use case — it does exactly one job: take the response body, and if it's syntactically valid JSON, parse it. A rate-limit message and a repository record are both syntactically valid JSON. Only *your* code knows which shape you actually asked for.

### Mental model
```
requests.get(url, timeout=5)
        ↓
   [ waits for server, up to `timeout` seconds ]
        ↓
no response in time ──────────→ Timeout exception raised
        ↓ (response arrived)
response.status_code            ← the server's verdict: 200? 403? 404?
        ↓
response.json()                 ← parses body AS JSON regardless of status
        ↓
   valid dict/list returned — even if status_code says "this was a rejection"
```

## 4. Change one thing
```diff
 response = requests.get("https://api.github.com/repos/python/cpython", timeout=5)
+if response.status_code != 200:
+    raise Exception(f"Request failed: {response.status_code} — {response.json().get('message')}")
 print("body:", response.json())
```

### What changed
Added an explicit check of `status_code` before trusting the body, raising a clear error ourselves if the status wasn't the one we expected.

### What did not change
The request itself, the `timeout`, and how `.json()` is called are all identical.

### Behavioral consequence
Instead of silently proceeding to (mis)treat a rate-limit message as if it were repository data, the program now stops immediately with a message that names the actual problem: `Request failed: 403 — API rate limit exceeded for ...`. This is you manually creating the loud failure that `requests` deliberately didn't create for you — because it correctly assumed you, not the library, know what a successful response for *your* specific call is supposed to contain.

## 5. Put it in the project
```python
import requests

def fetch_repo_info(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}"

    try:
        response = requests.get(url, timeout=5)
    except requests.exceptions.Timeout:
        return {"error": "Request timed out"}
    except requests.exceptions.ConnectionError:
        return {"error": "Could not connect"}

    if response.status_code == 200:
        data = response.json()
        return {
            "name": data.get("full_name"),
            "language": data.get("language"),
            "stars": data.get("stargazers_count"),
        }
    elif response.status_code == 404:
        return {"error": f"{owner}/{repo} not found"}
    else:
        return {"error": f"Unexpected status {response.status_code}"}


for owner, repo in [("python", "cpython"), ("nonexistent-user-xyz", "nope")]:
    result = fetch_repo_info(owner, repo)
    print(result)
```

### Code walkthrough
- `try: ... except requests.exceptions.Timeout: ... except requests.exceptions.ConnectionError:` — this is Lesson 2's specific-exception pattern, applied to network failure modes instead of `ValueError`. Two separate `except` clauses because "the server took too long" and "there's no network path to the server at all" are genuinely different problems, and lumping them into one bare `except:` would hide which one actually happened.
- `if response.status_code == 200: ... elif response.status_code == 404: ... else:` — handles the *non-exception* failure channel from step 3-4: a response that arrived successfully but wasn't the answer you wanted. Three named branches instead of one bare "did it work," because "not found" and "some other unexpected status" (like the 403 you actually hit) deserve different handling — or at minimum, different messages.
- `return {"error": ...}` in every failure path — every branch of this function returns the same *shape* (a dict), whether it succeeded or failed, just with different keys present. This means calling code can rely on always getting a dict back, rather than sometimes a dict and sometimes `None` or a raised exception, which would force every caller to handle three different response shapes instead of one consistent one.
- The loop at the bottom deliberately includes a repo that doesn't exist (`nonexistent-user-xyz/nope`), exercising the 404 branch on purpose — not because it's expected to succeed, but because a function that's never been run against its own failure paths hasn't really been tested.

### Why this design?
Two independent layers of "did this work" — exceptions for transport failures, status codes for the server's actual answer — mirrors the two independent failure channels from step 3. Collapsing them into one `try/except` around everything (catching a hypothetical "BadStatusException" that `requests` doesn't actually raise) would misrepresent how HTTP and this library actually behave.

## 6. Trap
**Normal rule:** if `response.json()` returns a dict without raising, you have valid data to work with.
**Apparently equivalent code:** `data = response.json(); print(data.get("stargazers_count"))` — skipping the status-code check entirely, since "it parsed fine."
**Surprising result:** with the real 403 response above, this prints `None` — not a crash, just silently the wrong (missing) value, because the rate-limit message dict has no `"stargazers_count"` key at all, and `.get()` quietly returns `None` for a missing key exactly as designed back in Lesson 4.
**Exact reason:** `.get()`'s safety (no `KeyError`) becomes a liability the moment the *entire dict* is the wrong shape, not just one field — every single field you try to pull out will quietly come back `None`, and unlike a single missing field, that pattern (everything is `None`) is a strong sign the whole response wasn't what you expected, not that one value happened to be absent.
**Project consequence:** this is why step 5 checks `status_code` *before* trusting anything pulled from `.json()` — a defensively-written `.get()` chain can make a completely wrong response look like a mostly-empty correct one, which is far more dangerous than an honest crash, because nothing about the output looks obviously broken.

## 7. Exercise
- **Predict:** If you call `fetch_repo_info` with a `timeout=0.001` (essentially guaranteeing a timeout), what does the function return — and does the caller's code need to change at all to handle it, given the design in step 5?
- **Modify:** Add a case for status code `500` (server error) as its own branch with its own message, distinct from the generic `else`.
- **Break:** Remove the `if response.status_code == 200:` check entirely, so the function always tries to build the success dict regardless of status. Run it against the rate-limited endpoint. What values does the resulting dict actually contain?
- **Repair:** Put the check back, then explain in one sentence why the broken version's output (from the previous exercise) is more dangerous than an outright crash would have been.
- **Trace:** Walk through `fetch_repo_info("nonexistent-user-xyz", "nope")` step by step — what does GitHub's API actually return for a nonexistent repo (check the real status code), and which branch handles it?

## What to remember
- A request completing without an exception only means a response arrived — it says nothing about whether that response is what you wanted.
- Status codes and exceptions are two separate failure channels; handle both, don't conflate them.
- `.json()` parses successfully for *any* well-formed JSON body, including error messages — the shape being valid JSON is not the same as the shape being correct.
- Always set a `timeout` on network calls — a local file read can't hang forever, but a network request genuinely can.

## Next lesson
Back to the movie files for Lesson 7 — but now you've felt the actual pain this whole sequence has been quietly building toward: filtering, matching, and joining these small files by hand, in a `for` loop, one condition at a time. That pain is exactly the reason SQL exists, and Lesson 7 is where it finally gets introduced — not as new syntax to memorize, but as the answer to problems you've already hit.
