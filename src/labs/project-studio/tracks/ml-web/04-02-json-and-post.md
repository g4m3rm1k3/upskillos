---
title: 4.2 — JSON, POST and Status Codes
track: Web + ML — The Prediction Web App
runtime: none
concepts: web-api
revisits: http, exceptions, testing
lab: 29
problem: "estimated price: 252,006" is easy for a person to read and awkward for a program, and a URL is a poor place for a house with twenty features. How do programs exchange structured data over HTTP?
---

Your server answers in sentences: `estimated price: 252,006`. A person reads that easily. A program that wants the number has to cut the sentence apart, and the moment you change the wording (say, to add a currency), every program that cut it apart breaks.

Programs talking to programs need a format with no wording to break: structured data with named fields. On the web that format is almost always **JSON**. This lesson rewrites the server to speak JSON, adds a second way to send a house (in the **body** of a **POST** request), and gathers all the checks on a house into one function. Then you'll count how much of the code is plumbing, which is the problem the next lesson's library solves.

The new server goes in a new file, `api_server.py`, so the plain-text one from lesson 4.1 (and its tests) keep working beside it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_api_server.py provided
# Tests for api_server.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_api_server.py
import json
import threading
import urllib.error
import urllib.request

import pytest

HOUSE = {"sqft": 1500, "bedrooms": 3, "age": 20}


@pytest.fixture
def base_url():
    from api_server import make_server
    server = make_server(0)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()
    server.server_close()


def send(url, body=None):
    """GET when there's no body, POST when there is. Returns (status, content type, decoded JSON)."""
    data = None
    if body is not None:
        data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, method="POST" if data else "GET",
                                     headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, response.headers["Content-Type"], json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, error.headers["Content-Type"], json.loads(error.read())


def test_house_gives_three_numbers_from_text_or_numbers():
    from api_server import house_from
    assert house_from({"sqft": "1500", "bedrooms": 3, "age": 20.0}) == [1500.0, 3.0, 20.0]


def test_house_names_every_missing_field():
    from api_server import BadRequest, house_from
    with pytest.raises(BadRequest, match="missing: bedrooms, age"):
        house_from({"sqft": 1500})


def test_house_rejects_values_that_are_not_numbers():
    from api_server import BadRequest, house_from
    with pytest.raises(BadRequest, match="must be numbers"):
        house_from({**HOUSE, "sqft": "big"})
    with pytest.raises(BadRequest, match="must be numbers"):
        house_from({**HOUSE, "age": None})


def test_house_rejects_a_house_with_no_floor_area():
    from api_server import BadRequest, house_from
    with pytest.raises(BadRequest, match="sqft must be more than 0"):
        house_from({**HOUSE, "sqft": -500})


def test_get_answers_in_json(base_url):
    assert send(base_url + "/predict?sqft=1500&bedrooms=3&age=20") == (200, "application/json", {"price": 252006.15})


def test_get_errors_are_json_too(base_url):
    assert send(base_url + "/predict?sqft=1500&bedrooms=3") == (400, "application/json", {"error": "missing: age"})


def test_post_reads_a_json_body(base_url):
    assert send(base_url + "/predict", HOUSE) == (200, "application/json", {"price": 252006.15})


def test_post_rejects_a_body_that_is_not_json(base_url):
    assert send(base_url + "/predict", b"sqft=1500") == (400, "application/json", {"error": "the body must be JSON"})


def test_post_rejects_json_that_is_not_an_object(base_url):
    status, _, body = send(base_url + "/predict", [1500, 3, 20])
    assert status == 400
    assert body == {"error": "the body must be a JSON object"}


def test_post_to_an_unknown_path_is_not_found(base_url):
    status, _, _ = send(base_url + "/somewhere", HOUSE)
    assert status == 404
```

`send` is the client side of this lesson. `urllib.request.Request(url, data=…, method=…, headers=…)` builds a request before sending it, so the test can choose the method and add a body. Every response, success or error, is read as JSON: from now on the server never answers in anything else.

The first four tests don't need a server at all: they call `house_from` directly. That's the shape this lesson aims for: the *rules* about what a valid house is live in a plain function you can test with a dictionary, separate from the HTTP machinery.

```check
file tests/test_api_server.py -- Click "Create provided tests/test_api_server.py" above.
```

## JSON

> **JSON** (JavaScript Object Notation): a text format for structured data. It has six kinds of value: **objects** (`{"name": value, …}`, like Python dictionaries), **arrays** (`[…]`, like lists), strings (always in double quotes), numbers, `true`/`false`, and `null`. Nearly every programming language can read and write it.
>
> *Picture it as* a standard order form that every company in the supply chain agrees to use. Each company keeps its records in its own system, but anything sent between them goes on the shared form, so nobody has to understand anybody else's internal system. **Where the picture stops working:** JSON has no fixed boxes. Which names an object must contain (`sqft`, `bedrooms`, `age`) is a separate agreement, and checking it is your server's job.

Python's standard library reads and writes it with the `json` module. At the prompt, predict each line:

```text
>>> import json
>>> text = json.dumps({"price": 252006.15, "currency": None})
>>> text
'{"price": 252006.15, "currency": null}'
>>> type(text)
<class 'str'>
>>> json.loads('{"sqft": 1500, "bedrooms": 3, "age": 20}')
{'sqft': 1500, 'bedrooms': 3, 'age': 20}
>>> json.loads("sqft=1500")
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

`json.dumps` ("dump string") turns Python values into JSON **text**: note `None` became `null`. `json.loads` ("load string") goes the other way, and raises `JSONDecodeError` for text that isn't JSON. Unlike a query string, JSON keeps numbers as numbers: `1500` comes back as an `int`, not the string `'1500'`.

## One place that checks a house

A house can now arrive two ways: as a query string (every value text) or as a JSON body (values may be numbers, text, `null` or missing). The checks must be the same either way, so they go in one function. Create `api_server.py` with it:

```python file=api_server.py
FIELDS = ["sqft", "bedrooms", "age"]


class BadRequest(Exception):
    """The request can't be answered as it stands; the message says why."""


def house_from(values: dict) -> list[float]:
    missing = [name for name in FIELDS if name not in values]
    if missing:
        raise BadRequest(f"missing: {', '.join(missing)}")
    try:
        numbers = [float(values[name]) for name in FIELDS]
    except (TypeError, ValueError):
        raise BadRequest("sqft, bedrooms and age must be numbers") from None
    if numbers[0] <= 0:
        raise BadRequest("sqft must be more than 0")
    return numbers
```

- **`BadRequest`** is a custom exception, like lesson 0.5's `ConfigError`. Any check that fails *raises* it with a message, instead of each check writing its own error response. Whoever calls `house_from` catches one exception type and turns its message into a 400.
- **`except (TypeError, ValueError)`** catches either of two exception types, written as a tuple. `float("big")` raises `ValueError`; `float(None)` (a JSON `null`) raises `TypeError`. Both mean "not a number".
- **`sqft` must be more than 0.** Lesson 3.4's challenge asked where a negative floor area should be rejected; this is where. A model will happily multiply −500 by its weight; refusing nonsense is the boundary's job, as lesson 0.5 said about settings files.

```check
run ".venv/Scripts/python -m pytest -q tests/test_api_server.py -k house" label="house_from accepts text or numbers and names what's wrong" -- Check missing names first; float() raises ValueError for text and TypeError for None.
```

## Answers in JSON

Now the server around it. Update `api_server.py`, keeping `house_from` as it was:

```python file=api_server.py
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import predictor

FIELDS = ["sqft", "bedrooms", "age"]


class BadRequest(Exception):
    """The request can't be answered as it stands; the message says why."""


def house_from(values: dict) -> list[float]:
    missing = [name for name in FIELDS if name not in values]
    if missing:
        raise BadRequest(f"missing: {', '.join(missing)}")
    try:
        numbers = [float(values[name]) for name in FIELDS]
    except (TypeError, ValueError):
        raise BadRequest("sqft, bedrooms and age must be numbers") from None
    if numbers[0] <= 0:
        raise BadRequest("sqft must be more than 0")
    return numbers


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/predict":
            query = {name: values[0] for name, values in parse_qs(url.query).items()}
            self.answer(query)
        else:
            self.send_json(404, {"error": f"nothing at {url.path}"})

    def answer(self, values: dict):
        try:
            house = house_from(values)
        except BadRequest as error:
            self.send_json(400, {"error": str(error)})
            return
        self.send_json(200, {"price": round(predictor.predict(*house), 2)})

    def send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def make_server(port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    server = make_server()
    print("Serving JSON on http://127.0.0.1:8000 (press Ctrl+C to stop)")
    server.serve_forever()
```

- **`{name: values[0] for name, values in parse_qs(url.query).items()}`** is a dictionary comprehension (lesson 1.1) that takes the first value of each list, so a query string becomes the same plain dictionary shape a JSON body has: `{"sqft": "1500", …}`. After that line, `answer` can't tell which way the house arrived, and doesn't need to.
- **`answer`** is the one path every request takes: validate, then predict, or report what's wrong. `str(error)` is the message the exception was raised with.
- **`send_json`** replaces lesson 4.1's `reply`. The **`Content-Type: application/json`** header tells the client to read the body as JSON. Browsers show JSON as text; programs parse it.
- **`round(…, 2)`** keeps the price to cents, so the JSON says `252006.15`, not `252006.1512305447`. Precision the model doesn't have is noise.

Run it (`.venv\Scripts\python api_server.py`) and open `http://127.0.0.1:8000/predict?sqft=1500&bedrooms=3&age=20`. The browser shows `{"price": 252006.15}`. Leave out `age` and it shows `{"error": "missing: age"}`. Stop it with Ctrl+C.

```check
run ".venv/Scripts/python -m pytest -q tests/test_api_server.py -k test_get" label="GET /predict answers in JSON, errors included"
```

## POST: a house in the body

A query string is fine for three numbers. For a house with twenty features, or a batch of a hundred houses, it's hopeless: URLs have length limits, and a URL often ends up in logs and browser history. The other common method, **POST**, carries data in the request's **body**, the same place a response carries its content.

> **GET** and **POST**: the two most common HTTP methods. **GET** asks for something and should never change anything on the server; its inputs travel in the URL. **POST** sends data for the server to process; its input travels in the body, described by the `Content-Type` header.
>
> *Picture it as* the difference between asking at the counter "what's the price of part 1500?" and handing over a filled-in order form in an envelope. **Where the picture stops working:** a price estimate changes nothing on the server, so strictly it's a GET. Services that predict usually accept POST anyway, because the input can be large and structured. The rule that matters: GET must never change anything, because browsers, caches and search engines repeat GETs freely.

Add `do_POST` to the `Handler` in `api_server.py`:

```python file=api_server.py
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import predictor

FIELDS = ["sqft", "bedrooms", "age"]


class BadRequest(Exception):
    """The request can't be answered as it stands; the message says why."""


def house_from(values: dict) -> list[float]:
    missing = [name for name in FIELDS if name not in values]
    if missing:
        raise BadRequest(f"missing: {', '.join(missing)}")
    try:
        numbers = [float(values[name]) for name in FIELDS]
    except (TypeError, ValueError):
        raise BadRequest("sqft, bedrooms and age must be numbers") from None
    if numbers[0] <= 0:
        raise BadRequest("sqft must be more than 0")
    return numbers


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/predict":
            query = {name: values[0] for name, values in parse_qs(url.query).items()}
            self.answer(query)
        else:
            self.send_json(404, {"error": f"nothing at {url.path}"})

    def do_POST(self):
        if urlsplit(self.path).path != "/predict":
            self.send_json(404, {"error": f"nothing at {self.path}"})
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self.send_json(400, {"error": "the body must be JSON"})
            return
        if not isinstance(body, dict):
            self.send_json(400, {"error": "the body must be a JSON object"})
            return
        self.answer(body)

    def answer(self, values: dict):
        try:
            house = house_from(values)
        except BadRequest as error:
            self.send_json(400, {"error": str(error)})
            return
        self.send_json(200, {"price": round(predictor.predict(*house), 2)})

    def send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def make_server(port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    server = make_server()
    print("Serving JSON on http://127.0.0.1:8000 (press Ctrl+C to stop)")
    server.serve_forever()
```

Reading a body is where `Content-Length` earns its place. The connection is a stream of bytes with no "end of message" marker, so the server reads **exactly** as many bytes as the client said it was sending: `self.rfile.read(length)` (`rfile` is the connection opened for reading). Reading more would wait for bytes that never come; reading fewer would cut the JSON short.

Then three checks, each with its own message: is it JSON at all (`JSONDecodeError`), is it a JSON **object** (`[1500, 3, 20]` is valid JSON but has no names), and then `house_from`'s rules. The last check's `isinstance(body, dict)` matters because `house_from` does `name not in values`: on a list, that asks a different question ("is the string `'sqft'` an element of the list?") and gives a confusing answer instead of a clear error.

Try it from PowerShell while the server runs (`.venv\Scripts\python api_server.py` in one terminal; open a second terminal tab for this):

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/predict -ContentType application/json -Body '{"sqft": 1500, "bedrooms": 3, "age": 20}'
```

```text
    price
    -----
252006.15
```

`Invoke-RestMethod` is PowerShell's HTTP client. It sends the request, sees `application/json` in the response, parses the JSON for you, and prints the object as a table.

```check
run ".venv/Scripts/python -m pytest -q tests/test_api_server.py" label="POST /predict reads a JSON body, and every malformed body gets a clear 400"
```

## Count the cost

The JSON server works. Now look at what it took. Of the roughly 65 lines in `api_server.py`, count the ones that are about **houses and prices**: `FIELDS`, the three checks in `house_from`, and the one call to `predictor.predict`. Ten lines, perhaps. Everything else is plumbing:

- routing: comparing paths by hand, in two methods;
- reading the body: `Content-Length`, `rfile.read`, `json.loads`, two error cases;
- converting and checking types, field by field;
- formatting responses: status lines, two headers, encoding;
- and nothing at all that tells another programmer **what this service accepts**. To find out that `/predict` wants `sqft`, `bedrooms` and `age`, they'd have to read your code.

Now imagine adding a second endpoint (`/models`, say, to list the trained models), then a tenth. Every one repeats the plumbing, and every repetition is a place for a bug. Each piece is simple; together they're a lot of code that isn't your problem.

```predict
question: The model itself raises an exception for some input (a bug in predictor.py). Which status code should the client get?
choice: 400 Bad Request
choice: 404 Not Found
choice: 500 Internal Server Error
answer: 500 Internal Server Error
explain: 4xx means the client sent something wrong; 5xx means the server failed. A bug in the model is the server's fault, however strange the input was: the request was valid, and the server couldn't answer it. Returning 400 would send the client looking for a mistake in their request that isn't there.

Your hand-written server doesn't send 500 at all: an unexpected exception in `answer` is caught by `BaseHTTPRequestHandler`, printed to the terminal, and the connection is closed without a proper response. One more piece of plumbing you'd have to write.
```

Next lesson: **FastAPI**, a library where you write only the ten lines about houses, as ordinary typed Python, and it does the routing, the JSON, the validation, the error responses, and writes the documentation of what your service accepts, all from your type hints.
