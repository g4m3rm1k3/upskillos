---
title: 4.1 — Programs That Talk: HTTP by Hand
track: Web + ML — The Prediction Web App
trackOrder: 24
runtime: none
support: data/houses.csv
concepts: http
revisits: scikit-learn, command-line, testing, exceptions
lab: 29
problem: Your price estimator only runs in a terminal on your computer. How can a web page, a phone app or another program ask it for a price?
---

At the end of Chapter 3 you had a tool that estimates a house's price, and a problem no mathematics can fix: to use it, you have to sit at your computer and type `python -m houses --sqft 1500 …`. A web page can't do that. Neither can a phone, or a spreadsheet, or another program on another machine.

What they *can* all do is send a message over a network and wait for a reply, as long as both sides agree on the format of the message. On the web, that agreement is **HTTP**. This chapter puts your model behind an HTTP address, first by hand with nothing but Python's standard library, so you see every byte that travels; then with **FastAPI**, the library most Python ML services use; and finally behind a web page that a person can use.

> **Network protocol**: an agreed set of rules for the messages two programs exchange: what a message looks like, in what order they're sent, and what each one means.
>
> *Picture it as* the paperwork between two departments: a purchase request has fixed boxes in a fixed order, so whoever receives it knows where to look for the part number and the quantity, without phoning to ask. HTTP is that form for the web.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `price-service`.
2. `python -m venv .venv`
3. `requirements.txt`: the model needs NumPy and scikit-learn; the tests need pytest. The web needs nothing yet: Python's standard library can speak HTTP.

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, pytest\"" label="scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/houses.csv`.

```python file=tests/test_server.py provided
# Tests for predictor.py and server.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_server.py
import threading
import urllib.error
import urllib.request

import pytest
from pytest import approx


@pytest.fixture
def base_url():
    """Start the server for one test, hand the test its address, then stop it."""
    from server import make_server
    server = make_server(0)                      # port 0: the operating system picks a free port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()
    server.server_close()


def get(url):
    """Send a GET request; return (status code, body text), error statuses included."""
    try:
        with urllib.request.urlopen(url) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8")


def test_model_matches_chapter_3():
    import predictor
    assert predictor.predict(1500, 3, 20) == approx(252006.15, abs=0.01)


def test_model_is_trained_once_when_imported():
    import predictor
    assert predictor.MODEL.n_features_in_ == 3


def test_hello_answers(base_url):
    assert get(base_url + "/hello") == (200, "Hello from the price server\n")


def test_hello_unknown_path_is_not_found(base_url):
    status, body = get(base_url + "/nothing-here")
    assert status == 404
    assert "/nothing-here" in body


def test_query_gives_a_price(base_url):
    assert get(base_url + "/predict?sqft=1500&bedrooms=3&age=20") == (200, "estimated price: 252,006\n")


def test_query_missing_values_is_a_bad_request(base_url):
    status, body = get(base_url + "/predict?sqft=1500")
    assert status == 400
    assert body == "missing: bedrooms, age\n"


def test_query_values_must_be_numbers(base_url):
    status, body = get(base_url + "/predict?sqft=big&bedrooms=3&age=20")
    assert status == 400
    assert "must be numbers" in body
```

Three new things to understand before any code.

**A fixture with `yield`.** You've used pytest's built-in fixtures (`tmp_path`, `capsys`, `monkeypatch`). `@pytest.fixture` makes your own. A fixture that uses `yield` runs in two halves: everything before `yield` is **setup**, the yielded value is handed to the test, and after the test finishes, everything after `yield` is **teardown**. Here: start a server, give the test its address, stop the server. *Picture it as* a machine that's started before each job, handed to the operator, and shut down and cleaned after the job, whether the job went well or not.

**A thread.** `serve_forever()` never returns: a server's whole job is to wait for requests, for ever. If the test called it directly, the test would never get to send a request. A **thread** is a second line of execution inside the same program, running at the same time as the first. *Picture it as* a second operator on the same machine shop floor: one stands at the counter waiting for customers (the server, in its thread), while the other walks up and places orders (the test). `daemon=True` means "don't keep the program alive just for this thread".

**Port 0.** A server listens on a **port**: a number from 1 to 65535 that, together with the computer's address, says which program on that computer a message is for. Asking for port 0 means "any free port, please", so tests never collide with something already running. `server.server_address[1]` reads back which port was given.

`get` is a helper that sends a request with `urllib.request`, the standard library's HTTP client, and returns the status and body. It catches `HTTPError`, because `urllib` raises an exception for any status that isn't a success, and the tests want to look at error statuses, not crash on them.

```check
file tests/test_server.py -- Click "Create provided tests/test_server.py" above.
file data/houses.csv
```

## The model in one file

The server needs something to serve. You built the model in Chapter 3, across several modules. Here it is again in one small module, `predictor.py`: the same features, the same data, scikit-learn's `LinearRegression`. Create it:

```python file=predictor.py
import csv
from pathlib import Path

import numpy as np
from sklearn.linear_model import LinearRegression

FEATURES = ["sqft", "bedrooms", "age"]
DATA = Path(__file__).resolve().parent / "data" / "houses.csv"


def train(path: str | Path = DATA) -> LinearRegression:
    with open(path, newline="", encoding="utf-8") as f:
        rows = [row for row in csv.DictReader(f) if all(row[name] != "" for name in [*FEATURES, "price"])]
    X = np.array([[float(row[name]) for name in FEATURES] for row in rows])
    y = np.array([float(row["price"]) for row in rows])
    return LinearRegression().fit(X, y)


MODEL = train()


def predict(sqft: float, bedrooms: float, age: float) -> float:
    return float(MODEL.predict(np.array([[sqft, bedrooms, age]]))[0])
```

Every line is something you've written before: lesson 3.1's `load`, lesson 3.4's `LinearRegression`. Two decisions are new, and both are about the server that will use this module:

- **`MODEL = train()` runs at import.** Lesson 0.2 warned against modules that *do* things when imported. Here it's deliberate: a server should train the model **once**, when it starts, not once per request. Training takes milliseconds for 45 houses, but a real model might take minutes, and a visitor shouldn't wait for that. The test `test_model_is_trained_once_when_imported` checks that the trained model exists as soon as the module is imported.
- **`DATA` is found from `__file__`**, not from the current folder. A server is often started from somewhere else; lesson 0.1's `open("data.txt")` mistake would make it crash at startup.

`np.array([[sqft, bedrooms, age]])`: one house, but a 2-D array (one row, three columns), because scikit-learn's `predict` always takes a matrix of houses and returns one prediction per row. `[0]` takes the only prediction, and `float(...)` turns NumPy's number type into a plain Python `float`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_server.py -k model" label="predictor.py trains on import and estimates 252,006 for the example house" -- MODEL = train() at the bottom of the module; predict returns a plain float.
```

## A server that says hello

Before predictions, the simplest possible server: one address, one fixed answer.

> **HTTP** (HyperText Transfer Protocol): the protocol of the web. A **client** sends a **request**: a **method** (what it wants done, such as `GET`, "send me something"), a **path** (which thing, such as `/hello`) and some **headers** (extra facts about the request). The **server** answers with a **response**: a **status code** (a number saying how it went), its own headers, and a **body** (the content).
>
> *Picture it as* a parts counter. You (the client) hand over a request slip: "GET part /hello". The counter (the server) hands back the part (the body) with a status stamped on the slip: 200 "here you go", 404 "we don't stock that", 400 "your slip is filled in wrong". **Where the picture stops working:** the counter remembers nothing about you between slips. Every HTTP request stands alone, which is why logging in (Chapter 6) needs extra machinery.

Create `server.py`:

```python file=server.py
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/hello":
            self.reply(200, "Hello from the price server\n")
        else:
            self.reply(404, f"Nothing at {self.path}\n")

    def reply(self, status, text):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def make_server(port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    server = make_server()
    print("Serving on http://127.0.0.1:8000 (press Ctrl+C to stop)")
    server.serve_forever()
```

How the pieces fit:

- **`ThreadingHTTPServer`** (from the standard library) does the networking: it listens on a port, accepts each connection, reads the request, and hands it to a **handler**. "Threading" means each request is handled in its own thread, so a slow request doesn't hold up the others.
- **`class Handler(BaseHTTPRequestHandler)`** is your handler. It **inherits** from `BaseHTTPRequestHandler` (lesson 0.5 did the same with `Exception`): the base class does the parsing, and you only add what's specific to your server. For every request, the server makes a new `Handler` object and calls the method named after the request's method: a `GET` request calls `do_GET`. Inside it, `self.path` is the path that was asked for.
- **`reply`** builds a response in the order HTTP requires: the **status line** (`send_response`), then **headers** (`send_header`, one per line), then a blank line (`end_headers`), then the **body** (`wfile.write`, where `wfile` is the connection, opened like a file for writing). The body must be **bytes**, so the text is encoded as UTF-8 (lesson 0.4) first.
- **`Content-Type`** tells the client what kind of content the body is: `text/plain` is plain text. **`Content-Length`** says how many bytes the body has, so the client knows when it has received all of it.
- **`("127.0.0.1", port)`**: `127.0.0.1` is the address every computer uses for **itself** (also called `localhost`). A server listening there can only be reached from programs on the same computer, which is right while you're developing.

Start it in the terminal:

```powershell
.venv\Scripts\python server.py
```

It prints its address and then waits: the terminal is now busy, because `serve_forever` doesn't return. Open a web browser and go to `http://127.0.0.1:8000/hello`. The browser shows `Hello from the price server`, and the terminal prints a line for each request, like:

```text
127.0.0.1 - - [03/Oct/2026 23:44:20] "GET /hello HTTP/1.1" 200 -
```

Try `http://127.0.0.1:8000/anything` too: the 404 answer. Then press **Ctrl+C** in the terminal to stop the server (Python raises `KeyboardInterrupt`, which ends `serve_forever`).

Your browser was the client. It turned the address you typed into an HTTP request, sent it, and displayed the body of the response. Every page you've ever loaded worked this way.

```check
run ".venv/Scripts/python -m pytest -q tests/test_server.py -k hello" label="the server answers /hello, and 404 for anything else"
```

## What actually travels

The browser hid the request. Here's what it really sends, and what really comes back. Create `raw.py`, which starts your server in a thread (like the test fixture), then talks to it with nothing but a **socket**:

```python file=raw.py
import socket
import threading

from server import make_server

server = make_server(0)
port = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()

request = (
    "GET /hello HTTP/1.1\r\n"
    f"Host: 127.0.0.1:{port}\r\n"
    "Connection: close\r\n"
    "\r\n"
)
with socket.create_connection(("127.0.0.1", port)) as connection:
    connection.sendall(request.encode("ascii"))
    response = b""
    while chunk := connection.recv(4096):
        response += chunk

print("--- sent ---")
print(request)
print("--- received ---")
print(response.decode("utf-8"))
server.shutdown()
```

> **Socket**: the operating system's connection between two programs over a network: what one side sends, the other receives, as a stream of bytes. HTTP is just text written into a socket in an agreed format.
>
> *Picture it as* a pneumatic tube between two departments: you put bytes in at one end, they come out at the other, in order. The tube doesn't care what's written on the slips; HTTP is the agreement about what to write.

- `"\r\n"` is a **carriage return and line feed**, the line ending HTTP requires (older than Windows' and Linux's text files, and kept for compatibility). The blank line, `"\r\n"` on its own, marks the end of the headers.
- `Host:` names the server being asked (one computer can host many websites). `Connection: close` asks the server to close the connection after answering, so the loop knows when the whole response has arrived.
- `while chunk := connection.recv(4096):` reads up to 4,096 bytes at a time until `recv` returns an empty `b""`, which means the other side closed the connection. `:=` (the "walrus" operator) assigns and tests in one go: it means "receive a chunk, call it `chunk`, and keep looping while it isn't empty".

```powershell
.venv\Scripts\python raw.py
```

```text
--- sent ---
GET /hello HTTP/1.1
Host: 127.0.0.1:40419
Connection: close


--- received ---
HTTP/1.0 200 OK
Server: BaseHTTP/0.6 Python/3.13.14
Date: Sat, 03 Oct 2026 23:44:20 GMT
Content-Type: text/plain; charset=utf-8
Content-Length: 28

Hello from the price server
```

(Your port, date and Python version will differ.) That's all HTTP is: lines of text. The first line of the response is the **status line**: the protocol version, the status code `200` and its reason phrase `OK`. Then the headers your `reply` sent (plus two the base class adds), a blank line, and the 28-byte body. Count it: `Hello from the price server` is 27 characters, plus the `\n`.

The **status code** classes are worth knowing by heart:

| Range | Meaning | Examples |
|---|---|---|
| 2xx | success | 200 OK, 201 Created |
| 3xx | look elsewhere | 301 Moved Permanently, 304 Not Modified |
| 4xx | **the client** got something wrong | 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Unprocessable Content |
| 5xx | **the server** failed | 500 Internal Server Error, 503 Service Unavailable |

The 4xx/5xx split is the same decision you made in lesson 0.4 between "the user's mistake" (report it plainly) and "a bug" (someone needs to fix the code).

```check
run ".venv/Scripts/python raw.py" stdout="HTTP/1.0 200 OK" label="raw.py shows the status line the server sent"
run ".venv/Scripts/python raw.py" stdout="Content-Length: 28" label="and the headers, including the body's length"
```

## Predict over HTTP

Now the point of it all: a request that carries a house and gets a price back. A **query string** is the part of a URL after `?`: name=value pairs separated by `&`. The request for the example house is:

```text
GET /predict?sqft=1500&bedrooms=3&age=20
```

Update `server.py`:

```python file=server.py
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import predictor

FIELDS = ["sqft", "bedrooms", "age"]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/hello":
            self.reply(200, "Hello from the price server\n")
        elif url.path == "/predict":
            self.predict(parse_qs(url.query))
        else:
            self.reply(404, f"Nothing at {url.path}\n")

    def predict(self, query):
        missing = [name for name in FIELDS if name not in query]
        if missing:
            self.reply(400, f"missing: {', '.join(missing)}\n")
            return
        try:
            values = [float(query[name][0]) for name in FIELDS]
        except ValueError:
            self.reply(400, "sqft, bedrooms and age must be numbers\n")
            return
        self.reply(200, f"estimated price: {predictor.predict(*values):,.0f}\n")

    def reply(self, status, text):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def make_server(port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    server = make_server()
    print("Serving on http://127.0.0.1:8000 (press Ctrl+C to stop)")
    server.serve_forever()
```

Take the new parts apart at the prompt first, predicting each answer:

```text
>>> from urllib.parse import parse_qs, urlsplit
>>> url = urlsplit("/predict?sqft=1500&bedrooms=3&age=20")
>>> url.path
'/predict'
>>> url.query
'sqft=1500&bedrooms=3&age=20'
>>> parse_qs(url.query)
{'sqft': ['1500'], 'bedrooms': ['3'], 'age': ['20']}
```

- **`urlsplit`** separates a URL into its parts, so the path can be compared without the query string attached. (Before, `self.path` was the whole thing: `/predict?sqft=…` would never equal `"/predict"`.)
- **`parse_qs`** turns the query string into a dictionary. Every value is a **list** of **strings**: a name may legally appear more than once (`?age=20&age=21`), and everything in a URL is text. That's why the code takes `query[name][0]` (the first value) and converts it with `float`.
- **Status 400** for a request that's missing a value or has a non-number: the client sent something wrong, so it's a 4xx, with a message saying exactly what. The server keeps running; one bad request doesn't stop it.
- **`predictor.predict(*values)`**: the `*` **unpacks** the list into separate arguments, so `predict(*[1500.0, 3.0, 20.0])` is `predict(1500.0, 3.0, 20.0)`.

```predict
question: A request asks for /predict?sqft=1500&bedrooms=3. What does the server send back?
choice: 200 with a price, guessing age 0
choice: 400 with "missing: age"
choice: 500: the server crashes
choice: Nothing: the request waits for ever
answer: 400 with "missing: age"
explain: `missing` collects every field name that isn't a key in the query dictionary: just `age`. The server answers 400 Bad Request with `missing: age`, and carries on serving. Guessing a value would be worse than refusing: a price for a house of unknown age, presented as if it were a real answer.

Without the `missing` check, `query["age"]` would raise `KeyError` inside the handler. `BaseHTTPRequestHandler` would catch it, print a traceback in the server's terminal, and close the connection without a proper response. The client would see an error with no explanation: the HTTP version of lesson 0.4's traceback shown to a user.
```

Run the server again (`.venv\Scripts\python server.py`) and visit `http://127.0.0.1:8000/predict?sqft=1500&bedrooms=3&age=20` in the browser. Change the numbers in the address bar and press Enter: each visit is a new request, and the model answers each one. Stop the server with Ctrl+C when you're done.

```check
run ".venv/Scripts/python -m pytest -q tests/test_server.py" label="the server estimates prices over HTTP and rejects bad requests with 400" -- Compare url.path, not self.path; every parse_qs value is a list of strings.
```

### What you have

Any program on this computer that can send an HTTP request (a browser, a script, a spreadsheet's web query) can now get a price from your model. And you've seen that there's no magic in it: a request is a few lines of text, a response is a few more.

But look at how much of `server.py` is plumbing: checking which path was asked for, digging values out of lists, converting text to numbers, writing error messages, setting headers. The next lesson adds the format real programs exchange, **JSON**, and a second way to send data, **POST**, and you'll see the plumbing grow until it's obvious why libraries like FastAPI exist.
