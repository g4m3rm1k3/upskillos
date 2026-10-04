---
title: 4.3 — FastAPI: Declare It, Don't Write It
track: Web + ML — The Prediction Web App
runtime: none
concepts: web-api
revisits: http, type-hints, classes, testing, configuration
lab: 29
problem: Most of the hand-written server was plumbing, and nothing told another programmer what it accepts. Can the plumbing be written once, by someone else, and the rules come from code you already write?
---

Lesson 4.2 ended with a count: about ten lines of `api_server.py` were about houses, and the rest was HTTP plumbing. This lesson replaces the plumbing with **FastAPI**, the library most Python machine-learning services are built on. You'll describe a house once, as a typed class, and FastAPI will use that one description to read requests, convert and check every value, answer with clear errors, and publish documentation of your service that other programmers (and programs) can read.

The rule from the start of this series still holds: you'll know exactly what the library does for you, because you wrote every piece of it by hand in the last two lessons. And the tests will check that the new service gives the same prices as the old one.

## Install FastAPI

Add three packages to `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

What each one is for:

- **FastAPI**: turns typed Python functions into HTTP endpoints. It's built on two other libraries pip installs with it: **Starlette** (the HTTP machinery: the part you wrote by hand) and **Pydantic** (validation: the part `house_from` did).
- **uvicorn**: the **server program** that listens on a port and hands requests to your FastAPI app. It plays the role `ThreadingHTTPServer` played. FastAPI describes *what* to answer; uvicorn does the listening.
- **httpx2**: an HTTP client library. FastAPI's test client uses it to send requests to your app **without a network or a running server**: the request goes straight into the app as a function call. (It's the successor to the `httpx` package; Starlette's test client warns if it finds only the old one.)

```check
run ".venv/Scripts/python -c \"import fastapi, uvicorn; print(fastapi.__version__)\"" stdout="0.142.2" label="FastAPI 0.142.2 and uvicorn are installed" -- Add the three lines to requirements.txt and install again.
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_app.py provided
# Tests for app.py, the FastAPI service. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_app.py
import pytest
from fastapi.testclient import TestClient

HOUSE = {"sqft": 1500, "bedrooms": 3, "age": 20}


@pytest.fixture
def client():
    import app
    with TestClient(app.app) as client:
        yield client
    app.app.dependency_overrides.clear()


def first_error(response):
    """FastAPI lists every problem with a request; return the first as (where, what kind)."""
    error = response.json()["detail"][0]
    return error["loc"], error["type"]


def test_post_estimates_the_same_price_as_before(client):
    response = client.post("/predict", json=HOUSE)
    assert response.status_code == 200
    assert response.json() == {"price": 252006.15}


def test_post_names_a_missing_field(client):
    response = client.post("/predict", json={"sqft": 1500, "bedrooms": 3})
    assert response.status_code == 422
    assert first_error(response) == (["body", "age"], "missing")


def test_post_rejects_text_where_a_number_belongs(client):
    response = client.post("/predict", json={**HOUSE, "sqft": "big"})
    assert first_error(response) == (["body", "sqft"], "float_parsing")


def test_post_rejects_a_house_with_no_floor_area(client):
    response = client.post("/predict", json={**HOUSE, "sqft": -500})
    assert first_error(response) == (["body", "sqft"], "greater_than")


def test_get_estimates_from_the_query_string(client):
    response = client.get("/predict", params=HOUSE)
    assert response.json() == {"price": 252006.15}


def test_get_names_a_missing_field(client):
    response = client.get("/predict", params={"sqft": 1500, "bedrooms": 3})
    assert response.status_code == 422
    assert first_error(response) == (["query", "age"], "missing")


def test_docs_describe_what_a_house_is(client):
    schema = client.get("/openapi.json").json()
    house = schema["components"]["schemas"]["House"]["properties"]
    assert set(house) == {"sqft", "bedrooms", "age"}
    assert house["sqft"]["exclusiveMinimum"] == 0
    assert house["sqft"]["description"] == "floor area in square feet"


def test_fake_model_can_stand_in_for_the_real_one(client):
    import app
    app.app.dependency_overrides[app.get_model] = lambda: (lambda sqft, bedrooms, age: 1000 * sqft)
    assert client.post("/predict", json=HOUSE).json() == {"price": 1500000.0}
    assert client.get("/predict", params=HOUSE).json() == {"price": 1500000.0}
```

- **`TestClient(app.app)`** sends requests straight into your app, with no server, no port and no thread: compare that with lesson 4.1's fixture. `client.post("/predict", json=HOUSE)` encodes `HOUSE` as JSON, sets `Content-Type`, and calls the app; `response.json()` decodes the answer.
- **Status 422** ("Unprocessable Content") is FastAPI's code for a request whose data is the wrong shape. Your hand-written server said 400. Both are "the client's mistake"; 422 is more specific: "I understood the request, but its contents fail the rules".
- **`detail`**: FastAPI answers every invalid request with a list of every problem it found, each saying **where** (`["body", "age"]`: the field `age` in the body) and **what kind** (`missing`, `float_parsing`, `greater_than`). The tests compare those two parts, not the human-readable message, which a library update may reword.
- The last test uses `dependency_overrides`, which the last step of this lesson explains.

```check
file tests/test_app.py -- Click "Create provided tests/test_app.py" above.
```

## A house, described once

Create `app.py`:

```python file=app.py
from fastapi import FastAPI
from pydantic import BaseModel, Field

import predictor

app = FastAPI(title="House price estimator")


class House(BaseModel):
    sqft: float = Field(gt=0, description="floor area in square feet")
    bedrooms: float = Field(ge=0)
    age: float = Field(ge=0, description="years since it was built")


class Estimate(BaseModel):
    price: float


@app.post("/predict")
def predict_from_body(house: House) -> Estimate:
    return Estimate(price=round(predictor.predict(house.sqft, house.bedrooms, house.age), 2))
```

Twenty lines, and the part that matters is three ideas.

**1. A model of the data.** `class House(BaseModel)` looks like lesson 0.5's dataclass, and it's the same idea with one big addition: a **Pydantic model** checks and converts its values when it's created.

> **Data model** (in Pydantic's sense): a class that declares the fields some data must have, the type of each, and the rules each must follow. Creating one from raw data either produces a valid object or raises an error listing everything that's wrong.
>
> *Picture it as* an incoming-inspection checklist for a delivery: required items, each with its spec. Nothing gets onto the shop floor without passing it, so nobody downstream has to re-check. **Where the picture stops working:** a checklist only accepts or rejects; Pydantic also converts. The text `"1500"` in a query string becomes the number `1500.0`, because the checklist says `float`.

Try it at the prompt before the web gets involved:

```text
>>> from app import House
>>> House(sqft=1500, bedrooms=3, age=20)
House(sqft=1500.0, bedrooms=3.0, age=20.0)
>>> House(sqft="1500", bedrooms=3, age=20).sqft
1500.0
>>> House(sqft=-5, bedrooms=3)
pydantic_core._pydantic_core.ValidationError: 2 validation errors for House
sqft
  Input should be greater than 0 [type=greater_than, input_value=-5, input_type=int]
age
  Field required [type=missing, input_value={'sqft': -5, 'bedrooms': 3}, input_type=dict]
```

`Field(gt=0)` means "greater than 0" and `ge=0` "greater than or equal to 0": the rules `house_from` checked by hand. Both problems are reported at once, not just the first.

**2. A decorator that registers a route.** `@app.post("/predict")` above the function means "when a POST request for `/predict` arrives, call this function". A **decorator** (lesson 0.5's `@dataclass` was one) is a function that receives the function defined below it; this one records it in the app's table of routes, which is what your `if url.path == "/predict"` did.

**3. Type hints that do work.** In lesson 0.4 you learned that Python ignores type hints at run time. FastAPI doesn't: it reads them, the way a person would, and acts on them.

- `house: House` (a Pydantic model) means "read the request **body** as JSON and build a `House` from it". If that raises a validation error, FastAPI answers 422 with the details, and your function is never called. So inside the function, `house` is always valid.
- `-> Estimate` means "the response is an `Estimate`": FastAPI turns the returned object into JSON (`{"price": 252006.15}`) with `Content-Type: application/json`.

Everything from lesson 4.2's `do_POST`, `answer`, `send_json`, `Content-Length` and `house_from` is in those two type hints. You still wrote the rules; you just wrote them as a description instead of as code that checks.

```check
run ".venv/Scripts/python -m pytest -q tests/test_app.py -k test_post" label="POST /predict gives the same price, and names exactly what's wrong with a bad house" -- house: House in the signature makes FastAPI read and validate the JSON body.
```

## Query strings, and the documentation it wrote

Add the GET version. The same `House` describes it; only where the values come from changes. Update `app.py`:

```python file=app.py
from typing import Annotated

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field

import predictor

app = FastAPI(title="House price estimator")


class House(BaseModel):
    sqft: float = Field(gt=0, description="floor area in square feet")
    bedrooms: float = Field(ge=0)
    age: float = Field(ge=0, description="years since it was built")


class Estimate(BaseModel):
    price: float


@app.get("/predict")
def predict_from_query(house: Annotated[House, Query()]) -> Estimate:
    return Estimate(price=round(predictor.predict(house.sqft, house.bedrooms, house.age), 2))


@app.post("/predict")
def predict_from_body(house: House) -> Estimate:
    return Estimate(price=round(predictor.predict(house.sqft, house.bedrooms, house.age), 2))
```

**`Annotated[House, Query()]`** attaches extra information to a type hint. `Annotated[X, extra]` means "the type is `X`, and here's something extra for whoever reads the hint": Python itself ignores the extra part, FastAPI reads it. `Query()` says "build this `House` from the **query string**, not the body". Same rules, same errors (the location just says `query` instead of `body`).

Now run the service. FastAPI apps are run by uvicorn:

```powershell
.venv\Scripts\python -m uvicorn app:app --reload
```

`app:app` means "in the module `app`, the object named `app`". `--reload` restarts the server whenever you save a file, which is convenient while developing. Uvicorn listens on port 8000, as your hand-written servers did.

Open `http://127.0.0.1:8000/predict?sqft=1500&bedrooms=3&age=20`: `{"price":252006.15}`. Now open **`http://127.0.0.1:8000/docs`**.

That page is generated from your code. It lists both routes, shows the `House` fields with their types, rules and descriptions, and has a **Try it out** button that sends real requests to your running service. Behind it is `http://127.0.0.1:8000/openapi.json`: a machine-readable description of your API in a standard format called **OpenAPI**, which other tools can read to generate client code in other languages. The test `test_docs_describe_what_a_house_is` reads it to check that the rules you declared are the rules published.

> **API** (Application Programming Interface): the set of requests a program accepts from other programs, and what it answers to each. For a web service: its routes, the data each expects, and the responses it gives.
>
> *Picture it as* the published spec sheet for a supplier's ordering system: what you can order, how to fill in each order, and what you'll get back. Lesson 4.2's service had an API too, but its only spec sheet was its source code.

Stop uvicorn with Ctrl+C.

```check
run ".venv/Scripts/python -m pytest -q tests/test_app.py -k \"test_get or docs\"" label="GET /predict works from the query string, and the published docs describe a house"
```

## Dependencies: let the caller hand it in

One line still reaches out to a fixed thing: `predictor.predict`. Every request uses the real model, trained on the real data. That's right in production, and a problem in tests: to test what the *service* does (routing, validation, the shape of the answer), you don't want results that depend on the trained model's exact numbers, and later, when the model is loaded from a database or takes seconds to train, you won't want the tests waiting for it either.

You've solved this problem before. In lesson 0.3, `main(argv)` took the command line as a parameter instead of reading `sys.argv` itself, so tests could hand it any words they liked. FastAPI has the same idea built in.

> **Dependency injection**: instead of a function fetching what it needs (a model, a database connection, the current user), it declares what it needs, and something outside hands it in. The something outside can then hand in a different thing: a fake model in tests, a different database in production.
>
> *Picture it as* a machine whose tooling is mounted by the setup crew rather than built into it. The machine just says "I need a 10 mm end mill here"; the crew decides which one. For a test cut, they can mount anything that fits.

Update `app.py`:

```python file=app.py
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, FastAPI, Query
from pydantic import BaseModel, Field

import predictor

app = FastAPI(title="House price estimator")


class House(BaseModel):
    sqft: float = Field(gt=0, description="floor area in square feet")
    bedrooms: float = Field(ge=0)
    age: float = Field(ge=0, description="years since it was built")


class Estimate(BaseModel):
    price: float


def get_model() -> Callable[[float, float, float], float]:
    return predictor.predict


Model = Annotated[Callable[[float, float, float], float], Depends(get_model)]


@app.get("/predict")
def predict_from_query(house: Annotated[House, Query()], predict: Model) -> Estimate:
    return Estimate(price=round(predict(house.sqft, house.bedrooms, house.age), 2))


@app.post("/predict")
def predict_from_body(house: House, predict: Model) -> Estimate:
    return Estimate(price=round(predict(house.sqft, house.bedrooms, house.age), 2))
```

What happens on each request now:

1. FastAPI sees the parameter `predict: Model`. `Model` is `Annotated[…, Depends(get_model)]`, so FastAPI calls `get_model()` and passes whatever it returns as `predict`.
2. `get_model` returns the real `predictor.predict` function. (Functions are values, as in lesson 2.3: `predict` is a function you call with three numbers.)
3. `Callable[[float, float, float], float]` is the type hint for "a function that takes three floats and returns a float". `Model` is a **type alias** (lesson 1.1) so both routes can say `predict: Model` without repeating the long annotation.

And in a test, `app.app.dependency_overrides[app.get_model] = …` tells FastAPI: "wherever a route depends on `get_model`, call this instead". The last test hands in a fake model that prices every house at 1,000 dollars per square foot, and checks that both routes use whatever model they're given. The fixture clears the overrides after each test, so one test's fake can't leak into the next (lesson 0.5's leaking settings file again).

```predict
question: In the fake-model test, the house is {"sqft": 1500, "bedrooms": 3, "age": 20}. What price does the service return?
answer: 1500000
explain: The fake model ignores bedrooms and age and returns 1000 × sqft = 1,500,000. The routes still validate the house (the fake only replaces the model, not the checks), call whatever model they were given, round to cents and wrap it in an Estimate: `{"price": 1500000.0}`. The test proves the routes use the injected model and don't reach for the real one by themselves.
verify: .venv/Scripts/python -c "from fastapi.testclient import TestClient; import app; app.app.dependency_overrides[app.get_model] = lambda: (lambda sqft, bedrooms, age: 1000 * sqft); print(TestClient(app.app).post('/predict', json={'sqft': 1500, 'bedrooms': 3, 'age': 20}).json()['price'])"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_app.py" label="every FastAPI test passes, including a fake model standing in for the real one" -- Both routes take predict: Model and call predict(...) instead of predictor.predict(...).
```

### What changed between lesson 4.2 and now

| Job | Lesson 4.2, by hand | FastAPI |
|---|---|---|
| Routing | `if url.path == "/predict"` in each `do_` method | `@app.get("/predict")`, `@app.post("/predict")` |
| Reading a body | `Content-Length`, `rfile.read`, `json.loads` | `house: House` |
| Reading a query string | `urlsplit`, `parse_qs`, `values[0]` | `Annotated[House, Query()]` |
| Checking values | `house_from` and `BadRequest` | `Field(gt=0)`, `Field(ge=0)` |
| Error responses | `send_json(400, …)` for each case | automatic 422 with every problem listed |
| JSON responses | `json.dumps`, headers, `wfile.write` | `-> Estimate` |
| Documentation | none | `/docs` and `/openapi.json`, generated |
| Swapping the model in tests | not possible without editing code | `dependency_overrides` |

Next lesson: the people who want a price estimate aren't programs. They need a page with a form, and the answer should appear without the page reloading.
