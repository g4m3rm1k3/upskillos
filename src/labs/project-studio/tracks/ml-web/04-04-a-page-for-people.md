---
title: 4.4 — A Page for People: HTML, Templates and HTMX
track: Web + ML — The Prediction Web App
runtime: none
concepts: html-htmx
revisits: web-api, http, file-paths, testing
lab: 29
problem: Programs can now ask for a price. The people who want one can't: they need a page with a form, and the answer should appear without the whole page being rebuilt.
---

The service answers programs. This lesson builds the page a person uses: three boxes to fill in, a button, and the estimate. It's built twice, on purpose. First the classic way, where pressing the button loads a whole new page from the server. Then with **HTMX**, where pressing the button fetches only the estimate and drops it into the page, which stays where it was.

You'll learn just enough **HTML** to read and write the page, and **Jinja** templates to fill it with values. No JavaScript: HTMX exists so that small interactive pages need none.

## Install the page tools

Add two packages to `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
jinja2==3.1.6
python-multipart==0.0.32
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

- **Jinja2**: a **template engine** (explained in a moment). FastAPI uses it for HTML pages.
- **python-multipart**: reads the format a browser uses to send a filled-in **form**. FastAPI needs it as soon as a route reads form data, and refuses to start such a route without it.

```check
run ".venv/Scripts/python -c \"import jinja2, multipart; print(jinja2.__version__)\"" stdout="3.1.6" label="Jinja2 and python-multipart are installed" -- Add both lines to requirements.txt and install again.
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_web_page.py provided
# Tests for the web page. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_web_page.py
import pytest
from fastapi.testclient import TestClient

HOUSE = {"sqft": 1500, "bedrooms": 3, "age": 20}
RESULT = "Estimated price: <strong>252,006</strong>"


@pytest.fixture
def client():
    import app
    with TestClient(app.app) as client:
        yield client


def test_page_is_html_with_three_inputs(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    for name in HOUSE:
        assert f'name="{name}"' in response.text


def test_page_starts_without_an_estimate(client):
    assert "Estimated price" not in client.get("/").text


def test_form_post_returns_a_whole_page_with_the_estimate(client):
    response = client.post("/estimate", data=HOUSE)
    assert "<html" in response.text, "a whole page, from <html> down"
    assert RESULT in response.text


def test_form_post_keeps_what_was_typed(client):
    page = client.post("/estimate", data={**HOUSE, "sqft": 2000}).text
    assert 'value="2000"' in page


def test_form_post_rejects_a_house_with_no_floor_area(client):
    assert client.post("/estimate", data={**HOUSE, "sqft": -500}).status_code == 422


def test_htmx_markup_asks_for_a_partial_update(client):
    page = client.get("/").text
    assert "htmx.org" in page, "the page loads the htmx script"
    assert 'hx-post="/estimate"' in page
    assert 'hx-target="#result"' in page
    assert 'id="result"' in page


def test_htmx_request_gets_only_the_result(client):
    response = client.post("/estimate", data=HOUSE, headers={"HX-Request": "true"})
    assert response.text.strip() == f"<p>{RESULT}</p>"
```

`client.post("/estimate", data=HOUSE)` sends the house the way a browser sends a filled-in form (not as JSON: that was `json=`). `headers={"HX-Request": "true"}` adds a header HTMX sends with every request it makes; the last test checks that the server answers those requests differently.

```check
file tests/test_web_page.py -- Click "Create provided tests/test_web_page.py" above.
```

## A page is a document

> **HTML** (HyperText Markup Language): the language web pages are written in. A page is a tree of **elements**. Each element is written as an opening **tag**, its content, and a closing tag: `<h1>House price estimate</h1>` is a top-level heading. An opening tag can carry **attributes**, `name="value"` pairs that configure the element: `<input name="sqft" type="number">`.
>
> *Picture it as* a drawing with a title block, views and callouts: the structure says what each part *is* (a heading, a form, an input), and the browser decides how to draw it. **Where the picture stops working:** a drawing is fixed. A page can be changed after it's loaded, which is what HTMX will do.

> **Template**: a document with gaps marked in it, filled in with values to produce the final document. **Jinja** is the template language: `{{ value }}` is replaced by a value; `{% if … %}…{% endif %}` includes a part only when a condition is true.
>
> *Picture it as* a mail merge: one letter with `«Name»` and `«Amount»` fields, printed once per row of a spreadsheet. The letter's wording is written once; each copy gets its own values.

Create `templates/page.html`:

```html file=templates/page.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>House price estimate</title>
</head>
<body>
  <h1>House price estimate</h1>
  <form method="post" action="/estimate">
    <label>Square feet <input name="sqft" type="number" value="{{ '%g' % sqft }}" required></label>
    <label>Bedrooms <input name="bedrooms" type="number" value="{{ '%g' % bedrooms }}" required></label>
    <label>Age in years <input name="age" type="number" value="{{ '%g' % age }}" required></label>
    <button type="submit">Estimate</button>
  </form>
  {% if price is not none %}<p>Estimated price: <strong>{{ "{:,.0f}".format(price) }}</strong></p>{% endif %}
</body>
</html>
```

Read it from the top:

- **`<!doctype html>`** says "this is a modern HTML document". **`<html>`** contains everything; **`<head>`** holds facts about the page (its character encoding, the title shown on the browser tab), and **`<body>`** holds what's shown.
- **`<form method="post" action="/estimate">`**: when this form is submitted, the browser sends a **POST** request to `/estimate` with the form's values in the body. That's lesson 4.2's POST, sent by the browser.
- **`<input name="sqft" …>`**: a box to type in. Its `name` is the field name the value is sent under, so it must match `House`'s field. `type="number"` makes the browser refuse letters; `required` makes it refuse an empty box. (Those are conveniences for the person typing, **not** checks the server can rely on: anyone can send any request without using your page. `House` still checks everything.)
- **`value="{{ '%g' % sqft }}"`** pre-fills the box. `'%g' % sqft` is old-style Python formatting that prints `1500.0` as `1500`.
- **`{% if price is not none %}…{% endif %}`** shows the result paragraph only once there's a price. `"{:,.0f}".format(price)` is the same format specification as the f-strings you've used: thousands separators, no decimals.
- `<label>` ties a description to its box (clicking the words focuses the box, and screen readers announce them together); `<p>` is a paragraph; `<strong>` marks text as important (shown bold).

```check
file templates/page.html -- Create the folder templates and the file page.html inside it.
contains templates/page.html "name=\"bedrooms\"" label="the form has a bedrooms input"
```

## Serve the page

Now two routes that use the template: one that shows the empty form, and one that receives the filled-in form and shows the page again, with the estimate. Update `app.py`:

```python file=app.py
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Form, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
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


templates = Jinja2Templates(directory=Path(__file__).resolve().parent / "templates")


@app.get("/", response_class=HTMLResponse)
def page(request: Request):
    return templates.TemplateResponse(request, "page.html", {"sqft": 1500, "bedrooms": 3, "age": 20, "price": None})


@app.post("/estimate", response_class=HTMLResponse)
def estimate(request: Request, house: Annotated[House, Form()], predict: Model):
    price = predict(house.sqft, house.bedrooms, house.age)
    return templates.TemplateResponse(request, "page.html", {**house.model_dump(), "price": price})
```

- **`Jinja2Templates(directory=…)`** finds templates in the `templates` folder, located from `__file__` (lesson 1.1's rule: never from the current folder).
- **`TemplateResponse(request, "page.html", {...})`** fills the template's gaps from the dictionary and sends the result as an HTML response. The dictionary's keys are the names the template uses: `sqft`, `price`, and so on.
- **`response_class=HTMLResponse`** tells FastAPI (and its `/docs`) that these routes answer with HTML, not JSON.
- **`Annotated[House, Form()]`**: the same `House`, the same rules, now built from **form data**. Third source, one description. A negative floor area typed into the form gets a 422, exactly like the JSON API.
- **`house.model_dump()`** turns a Pydantic object into a dictionary, `{"sqft": 1500.0, "bedrooms": 3.0, "age": 20.0}`, and `{**…, "price": price}` adds the price (lesson 1.1's `**` merge). Passing the house back means the page shows what was typed instead of resetting the boxes.

Run it with `.venv\Scripts\python -m uvicorn app:app --reload` and open `http://127.0.0.1:8000/`. Change the numbers and press **Estimate**. Watch closely: the page goes blank for an instant and redraws, because the browser threw the page away and loaded a whole new one, `<html>` to `</html>`, just to change one line. On a page with a long form, the scroll position jumps to the top too.

```check
run ".venv/Scripts/python -m pytest -q tests/test_web_page.py -k \"test_page or test_form\"" label="the page shows a form, and submitting it returns the page with the estimate"
```

## Only the part that changed

The only thing that changes between one estimate and the next is the result paragraph. So move that paragraph into a template of its own: a **partial**, a fragment of HTML that isn't a whole page. Create `templates/result.html`:

```html file=templates/result.html
{% if price is not none %}<p>Estimated price: <strong>{{ "{:,.0f}".format(price) }}</strong></p>{% endif %}
```

It's the same line that was at the bottom of `page.html`. On its own it can be sent as a response by itself, or **included** in the full page, so the result is written in one place either way.

```check
file templates/result.html -- Create templates/result.html with the result paragraph.
```

## HTMX: the page asks for a fragment

> **HTMX**: a small JavaScript library that lets HTML attributes make requests and update part of a page. `hx-post="/estimate"` on a form means "when submitted, send it as a POST in the background"; `hx-target="#result"` means "put whatever comes back inside the element whose `id` is `result`".
>
> *Picture it as* swapping one module on an assembly instead of scrapping the whole assembly and building a new one. **Where the picture stops working:** with HTMX, the server decides what the new module looks like, every time: the browser just slots in whatever HTML it's given.

Update `templates/page.html`:

```html file=templates/page.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>House price estimate</title>
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
</head>
<body>
  <h1>House price estimate</h1>
  <form method="post" action="/estimate" hx-post="/estimate" hx-target="#result">
    <label>Square feet <input name="sqft" type="number" value="{{ '%g' % sqft }}" required></label>
    <label>Bedrooms <input name="bedrooms" type="number" value="{{ '%g' % bedrooms }}" required></label>
    <label>Age in years <input name="age" type="number" value="{{ '%g' % age }}" required></label>
    <button type="submit">Estimate</button>
  </form>
  <div id="result">{% include "result.html" %}</div>
</body>
</html>
```

Three changes:

- **`<script src="https://unpkg.com/htmx.org@2.0.4"></script>`** loads the HTMX library from a public server, pinned to version 2.0.4 for the same reason as `requirements.txt`. (So the page needs an internet connection to load HTMX. A production site would serve its own copy.)
- **`hx-post` and `hx-target`** on the form. The old `method` and `action` stay: if HTMX can't load, the form still works the old way. That's called **progressive enhancement**: the page works without the extra, and works better with it.
- **`<div id="result">{% include "result.html" %}</div>`**: a box with a name (`id`) for HTMX to aim at, holding the partial. `{% include %}` pastes another template in, with the same values. `#result` in `hx-target` is how you refer to an element by its `id` (the same notation CSS uses).

```check
run ".venv/Scripts/python -m pytest -q tests/test_web_page.py -k htmx_markup" label="the page loads HTMX and asks for the result to be updated in place"
```

## The server sends a fragment

When HTMX makes a request, it adds the header `HX-Request: true`. The server can read that header and answer with just the partial. Update the `estimate` route in `app.py`:

```python file=app.py
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Form, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
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


templates = Jinja2Templates(directory=Path(__file__).resolve().parent / "templates")


@app.get("/", response_class=HTMLResponse)
def page(request: Request):
    return templates.TemplateResponse(request, "page.html", {"sqft": 1500, "bedrooms": 3, "age": 20, "price": None})


@app.post("/estimate", response_class=HTMLResponse)
def estimate(request: Request, house: Annotated[House, Form()], predict: Model):
    price = predict(house.sqft, house.bedrooms, house.age)
    template = "result.html" if request.headers.get("HX-Request") == "true" else "page.html"
    return templates.TemplateResponse(request, template, {**house.model_dump(), "price": price})
```

`request.headers.get("HX-Request")` reads a request header (lesson 4.1's headers, from the receiving side); `.get` returns `None` when it's absent. One route now serves both kinds of client: a plain browser gets the whole page, HTMX gets the fragment.

Run uvicorn again, reload `http://127.0.0.1:8000/`, and press **Estimate** with different numbers. The estimate changes; nothing else does: no blank flash, no jump to the top. Press **F12** to open the browser's developer tools, choose the **Network** tab, and press Estimate again: you'll see a POST to `/estimate` whose response is the one `<p>` line, about 50 bytes, instead of the whole page.

```predict
question: A visitor types a house with sqft = -500 and presses Estimate on the HTMX page. What happens?
choice: The estimate shows a negative price
choice: The server refuses with 422, and by default HTMX leaves the result box unchanged
choice: The page reloads with an error message
answer: The server refuses with 422, and by default HTMX leaves the result box unchanged
explain: The browser's `type="number"` accepts −500 (it's a number), so the request is sent. On the server, `House` rejects it: `sqft` must be greater than 0, and FastAPI answers 422 with a JSON list of problems. HTMX, by default, doesn't swap in responses with error status codes, so the old estimate stays and nothing tells the visitor what went wrong.

That's a gap in this page: correct and safe (no wrong price is shown), but unhelpful. Showing validation errors in the page is a good exercise to come back to; for now, notice that the server-side check protected the model even though the browser let the value through. Checks in the page are for convenience; checks on the server are for correctness.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_web_page.py" label="every page test passes: HTMX gets only the result, a plain browser gets the whole page"
run ".venv/Scripts/python -m pytest -q" label="every test in the project still passes, from the hand-written server to the page"
```

### Chapter 4: what you built, and why each piece exists

```text
Browser ──HTML form──▶ FastAPI route ──House──▶ predict() ──price──▶ template ──HTML──▶ Browser
Program ──JSON──────▶ FastAPI route ──House──▶ predict() ──price──▶ Estimate ──JSON──▶ Program
```

| Piece | The problem it fixed |
|---|---|
| HTTP | Other programs couldn't ask the model anything |
| Status codes | Clients couldn't tell success from their mistake from the server's failure |
| JSON | Programs had to cut sentences apart to get a number |
| POST and a body | Inputs too big or too structured for a URL |
| One description of a house (`House`) | The same checks written by hand for every way data arrives |
| FastAPI routes and type hints | Plumbing in every endpoint, and no published description of the API |
| Dependency injection | Tests stuck with the real model |
| HTML, templates, HTMX | People can't send JSON, and reloading a whole page to change one line |

Every price the service gives is lost as soon as it's sent. Nobody can see which houses were estimated yesterday, or compare this model with the next one you train. Next chapter: a **database**, because the experiments and predictions need to survive after the program closes.
