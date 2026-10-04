---
title: 6.4 — When Input Becomes Code: Injection, XSS and Path Traversal
track: Authentication and Security — Multi-user Studio
runtime: none
concepts: web-security
revisits: sql, html-htmx, file-paths, packages, testing
lab: 31
problem: Users type text: a search term, a project name, a file name. In three common kinds of code that text ends up treated as instructions, by the database, by the browser, or by the file system. What does an attacker do with that, and what's the one idea behind all three fixes?
---

Three new features, each ordinary, each written the way they often are first:

- **search** your projects by part of their name;
- an **HTML page** for each project, showing its name;
- **download** a dataset file by name.

And three attacks, one per feature. They look different, and they're the same mistake: text that came from a user is put into something that gets **interpreted** (a SQL statement, an HTML page, a file path) without anything to stop the interpreter from reading part of the text as instructions.

> **Injection**: an attack where data supplied by a user is interpreted as part of a command. The attacker writes data that, once pasted into the command, changes what the command does.
>
> *Picture it as* a work order where the part number box is filled in as "1500, and also release all stock to bay 9". If the person reading the order can't tell where the box ends and the instructions begin, the extra instruction gets followed. **The fix in every case is the same idea:** keep the data in its box. Send it to the interpreter through a channel that can only ever carry data, never instructions.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_injection.py provided
# Tests for search, project pages and dataset files. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_injection.py
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ANA = {"email": "ana@example.com", "password": "correct horse battery"}
BO = {"email": "bo@example.com", "password": "another long password"}


@pytest.fixture
def app_module(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_DB", str(tmp_path / "studio.db"))
    import app
    return app


def logged_in(app_module, credentials):
    client = TestClient(app_module.app, base_url="https://testserver")
    client.post("/register", json=credentials)
    client.post("/login", json=credentials)
    return client


def test_feature_search_finds_my_projects_by_part_of_the_name(app_module):
    ana = logged_in(app_module, ANA)
    ana.post("/projects", json={"name": "house prices"})
    ana.post("/projects", json={"name": "spam filter"})
    assert ana.get("/search", params={"q": "house"}).json() == [{"id": 1, "name": "house prices"}]


def test_feature_page_shows_the_project_name(app_module):
    ana = logged_in(app_module, ANA)
    ana.post("/projects", json={"name": "house prices"})
    assert "<h1>house prices</h1>" in ana.get("/projects/1/page").text


def test_feature_files_serves_a_dataset(app_module):
    ana = logged_in(app_module, ANA)
    assert ana.get("/files", params={"name": "houses.csv"}).text.startswith("sqft,price")


def test_attack_sql_injection_cannot_reach_other_peoples_projects(app_module):
    ana, bo = logged_in(app_module, ANA), logged_in(app_module, BO)
    ana.post("/projects", json={"name": "secret pricing model"})
    assert bo.get("/search", params={"q": "' OR 1=1 --"}).json() == []


def test_attack_sql_injection_cannot_read_the_users_table(app_module):
    bo = logged_in(app_module, BO)
    stolen = bo.get("/search", params={"q": "' UNION SELECT id, email || ':' || password_hash FROM users --"}).text
    assert "scrypt$" not in stolen


def test_attack_script_in_a_name_is_shown_not_run(app_module):
    ana = logged_in(app_module, ANA)
    ana.post("/projects", json={"name": "<script>alert('hi')</script>"})
    page = ana.get("/projects/1/page").text
    assert "<script>alert" not in page
    assert "&lt;script&gt;" in page


def test_attack_path_traversal_cannot_read_files_outside_datasets(app_module):
    bo = logged_in(app_module, BO)
    response = bo.get("/files", params={"name": "../secret.env"})
    assert "STUDIO_SECRET" not in response.text
    assert response.status_code == 404


def test_attack_path_traversal_with_an_absolute_path(app_module):
    bo = logged_in(app_module, BO)
    secret = str(Path("secret.env").resolve())
    assert bo.get("/files", params={"name": secret}).status_code == 404
```

Three `test_feature_…` tests say what the features must do; five `test_attack_…` tests try to break them. Each attack's input is a string an attacker would type into a form or a URL.

```check
file tests/test_injection.py -- Click "Create provided tests/test_injection.py" above.
```

## Shared dependencies move out

The new routes will live in their own module, `explore.py`, because `app.py` is getting long and they're a separate group of features. But they need `Connection` and `User`, which are defined in `app.py`, and `app.py` will import `explore.py` to add its routes. Two modules importing each other is a **circular import**: whichever loads first finds the other half-built.

The fix is the usual one: what both need moves to a third module that both import. Create `deps.py`:

```python file=deps.py
import os
import sqlite3
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException

import accounts
import db


def get_connection():
    connection = db.connect(os.environ.get("STUDIO_DB", "studio.db"))
    try:
        yield connection
    finally:
        connection.close()


Connection = Annotated[sqlite3.Connection, Depends(get_connection)]


def current_user(connection: Connection, session: Annotated[str | None, Cookie()] = None) -> int:
    user_id = accounts.user_for(connection, session) if session else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="log in first")
    return user_id


User = Annotated[int, Depends(current_user)]
```

It's the code from `app.py`, moved, unchanged. This is how a project's structure is supposed to grow, as this series has said since Chapter 0: not from a template on day one, but when two pieces of code need the same thing and the old layout can't provide it.

```check
file deps.py
```

## The app uses them

Update `app.py` to import the dependencies instead of defining them, and to include `explore.py`'s routes:

```python file=app.py
import sqlite3

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

import accounts
import explore
import projects
from deps import Connection, User

app = FastAPI(title="ML Studio accounts")
app.include_router(explore.router)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=200)


class NewProject(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@app.post("/register", status_code=201)
def register(credentials: Credentials, connection: Connection) -> dict:
    try:
        user_id = accounts.add_user(connection, credentials.email, credentials.password)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="that email is already registered") from None
    return {"id": user_id}


@app.post("/login")
def login(credentials: Credentials, response: Response, connection: Connection) -> dict:
    user_id = accounts.check_login(connection, credentials.email, credentials.password)
    if user_id is None:
        raise HTTPException(status_code=401, detail="wrong email or password")
    token = accounts.start_session(connection, user_id)
    response.set_cookie("session", token, httponly=True, secure=True, samesite="lax",
                        max_age=int(accounts.SESSION_LENGTH.total_seconds()))
    return {"id": user_id}


@app.post("/logout")
def logout(response: Response, connection: Connection, session: str | None = None) -> dict:
    if session:
        accounts.end_session(connection, session)
    response.delete_cookie("session")
    return {"logged_out": True}


@app.get("/me")
def me(user: User) -> dict:
    return {"id": user}


@app.post("/projects", status_code=201)
def create_project(project: NewProject, user: User, connection: Connection) -> dict:
    return {"id": projects.add(connection, user, project.name)}


@app.get("/projects")
def list_projects(user: User, connection: Connection) -> list[dict]:
    return projects.list_for(connection, user)


@app.get("/projects/{project_id}")
def get_project(project_id: int, user: User, connection: Connection) -> dict:
    project = projects.get(connection, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="no such project")
    return project
```

`app.include_router(explore.router)` adds every route defined on `explore.router` to the app. An **`APIRouter`** is a group of routes that can live in its own module, the standard way to split a FastAPI service into files. (`explore.py` doesn't exist yet, so the app won't start until the step after next.)

One line deserves a second look: `logout` now takes `session: str | None = None` **without** `Cookie()`. Hold that thought; lesson 6.5 uses it.

```check
contains app.py "app.include_router(explore.router)" label="app.py includes explore's routes"
```

## Search, the first way

Add a `search` function to `projects.py`. This is the version people write when they've never been shown the alternative:

```python file=projects.py
def add(connection, owner_id: int, name: str) -> int:
    with connection:
        cursor = connection.execute("INSERT INTO projects (owner_id, name) VALUES (?, ?)", (owner_id, name))
    return cursor.lastrowid


def list_for(connection, owner_id: int) -> list[dict]:
    rows = connection.execute("SELECT id, name FROM projects WHERE owner_id = ? ORDER BY id", (owner_id,)).fetchall()
    return [dict(row) for row in rows]


def get(connection, owner_id: int, project_id: int) -> dict | None:
    row = connection.execute(
        "SELECT id, name FROM projects WHERE id = ? AND owner_id = ?", (project_id, owner_id)
    ).fetchone()
    return None if row is None else dict(row)


def search(connection, owner_id: int, text: str) -> list[dict]:
    rows = connection.execute(
        f"SELECT id, name FROM projects WHERE owner_id = {owner_id} AND name LIKE '%{text}%' ORDER BY id"
    ).fetchall()
    return [dict(row) for row in rows]
```

`LIKE '%house%'` is SQL's pattern match: `%` stands for any run of characters, so it finds names *containing* "house". The f-string builds the statement by pasting the search text between the quotes. For `q = "house"` the statement is exactly what you'd write by hand.

```check
file projects.py
```

## Three routes, the first way

Create `explore.py` with all three features, written the first way:

```python file=explore.py
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

import projects
from deps import Connection, User

DATASETS = Path(__file__).resolve().parent / "datasets"

router = APIRouter()


@router.get("/search")
def search(q: str, user: User, connection: Connection) -> list[dict]:
    return projects.search(connection, user, q)


@router.get("/projects/{project_id}/page", response_class=HTMLResponse)
def project_page(project_id: int, user: User, connection: Connection) -> str:
    project = projects.get(connection, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="no such project")
    return f"<!doctype html><title>{project['name']}</title><h1>{project['name']}</h1>"


@router.get("/files")
def dataset_file(name: str, user: User):
    path = DATASETS / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="no such file")
    return FileResponse(path)
```

- **`APIRouter()`** and **`@router.get(...)`** work exactly like `app` and `@app.get(...)`.
- **The page** builds HTML with an f-string, pasting the project's name in twice.
- **`FileResponse(path)`** sends a file's contents as the response, with a suitable `Content-Type`. `DATASETS / name` joins the folder and the name the user asked for.

All three features work. Every login is required (`user: User`), every project is checked for ownership. Run the feature tests:

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py -k feature" label="search, project pages and dataset downloads all work"
```

## Attack 1: SQL injection

Be Bo again. He searches for this:

```text
' OR 1=1 --
```

Paste it into the f-string and read the statement the database receives:

```sql
SELECT id, name FROM projects WHERE owner_id = 2 AND name LIKE '%' OR 1=1 --%' ORDER BY id
```

The `'` in Bo's text **closed the quotes** early. `OR 1=1` is now SQL, not text, and `1=1` is true for every row. `--` starts a SQL **comment**, so everything after it (the leftover `%'` and the `ORDER BY`) is ignored, which stops it from being a syntax error. Because `AND` binds tighter than `OR`, the condition reads "(Bo's projects whose name is anything) OR (true)": **every project in the database**.

It gets worse. This one reads the users table through the search box:

```text
' UNION SELECT id, email || ':' || password_hash FROM users --
```

`UNION` glues a second query's rows onto the first; `||` joins strings. Bo's search results now contain every user's email and password hash. Lesson 6.1's scrypt is what stands between Bo and the actual passwords now.

```powershell
.venv\Scripts\python -m pytest -q tests/test_injection.py -k sql_injection
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py -k sql_injection" exit=1 stdout="secret pricing model" label="the SQL injection works against the first version: Bo sees Ana's project (red)"
```

## Fix 1: placeholders

Update `search` in `projects.py`:

```python file=projects.py
def add(connection, owner_id: int, name: str) -> int:
    with connection:
        cursor = connection.execute("INSERT INTO projects (owner_id, name) VALUES (?, ?)", (owner_id, name))
    return cursor.lastrowid


def list_for(connection, owner_id: int) -> list[dict]:
    rows = connection.execute("SELECT id, name FROM projects WHERE owner_id = ? ORDER BY id", (owner_id,)).fetchall()
    return [dict(row) for row in rows]


def get(connection, owner_id: int, project_id: int) -> dict | None:
    row = connection.execute(
        "SELECT id, name FROM projects WHERE id = ? AND owner_id = ?", (project_id, owner_id)
    ).fetchone()
    return None if row is None else dict(row)


def search(connection, owner_id: int, text: str) -> list[dict]:
    rows = connection.execute(
        "SELECT id, name FROM projects WHERE owner_id = ? AND name LIKE ? ORDER BY id",
        (owner_id, f"%{text}%"),
    ).fetchall()
    return [dict(row) for row in rows]
```

The `%` signs are added to the **value**, `f"%{text}%"`, not to the SQL. The statement has two `?` slots and never changes, whatever the user types. The database parses the statement first, decides its structure, and only then receives the values, as values. Bo's `' OR 1=1 --` is now searched for, literally, as part of a name: there's no project called that, so he gets `[]`.

This is lesson 5.1's rule, now with the reason demonstrated: **never build SQL by pasting text into it**. Placeholders aren't "escaping the dangerous characters"; there's no list of dangerous characters to get wrong. The data simply never passes through the SQL parser.

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py -k sql_injection" label="the SQL injection fails: the search text is only ever data (green)" -- Two ? placeholders, with f"%{text}%" as the second value.
```

## Attack 2: cross-site scripting

Ana names a project:

```text
<script>alert('hi')</script>
```

The page pastes it into the HTML, and the browser receives:

```html
<!doctype html><title><script>alert('hi')</script></title><h1><script>alert('hi')</script></h1>
```

The browser sees a `<script>` element and **runs it**. Here it's harmless (a pop-up), but a script on the page runs *as the logged-in user*, on your site: it can read the page, send requests to your service with the user's cookie attached, change what they see. On a page other people view (a shared project, a comment, a username in a list), one user's input runs as code in every visitor's browser.

> **Cross-site scripting (XSS)**: injecting script into a page that other users' browsers then run. It happens whenever user-supplied text is put into HTML without being **escaped**: having its special characters (`<`, `>`, `&`, `"`, `'`) replaced by codes that display them instead of interpreting them.
>
> *Picture it as* writing a customer's comment onto the shop's notice board verbatim, when the comment says "NOTICE: all staff go home now". Escaping is putting it in quotation marks with "customer wrote:" in front, so it's read as something someone said, not as an instruction.

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py -k script" exit=1 stdout="<script>alert" label="the script in a project name reaches the page unescaped (red)"
```

## Fix 2: templates that escape

Create `templates/project.html`:

```html file=templates/project.html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>{{ project.name }}</title></head>
<body>
  <h1>{{ project.name }}</h1>
  <p>Project number {{ project.id }}</p>
</body>
</html>
```

Jinja, set up by FastAPI's `Jinja2Templates`, **escapes every `{{ value }}` automatically** in `.html` templates. Try it at the prompt:

```text
>>> from markupsafe import escape
>>> escape("<script>alert('hi')</script>")
Markup('&lt;script&gt;alert(&#39;hi&#39;)&lt;/script&gt;')
```

`&lt;` is HTML's code for "display a `<`". The browser shows the name exactly as Ana typed it, and runs nothing. (`markupsafe` is the library Jinja uses for this; it came with Jinja2.)

```check
file templates/project.html
```

## Render the page from the template

Now make the page use the template. Update `explore.py`:

```python file=explore.py
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates

import projects
from deps import Connection, User

HERE = Path(__file__).resolve().parent
DATASETS = HERE / "datasets"
templates = Jinja2Templates(directory=HERE / "templates")

router = APIRouter()


@router.get("/search")
def search(q: str, user: User, connection: Connection) -> list[dict]:
    return projects.search(connection, user, q)


@router.get("/projects/{project_id}/page", response_class=HTMLResponse)
def project_page(project_id: int, request: Request, user: User, connection: Connection):
    project = projects.get(connection, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="no such project")
    return templates.TemplateResponse(request, "project.html", {"project": project})


@router.get("/files")
def dataset_file(name: str, user: User):
    path = DATASETS / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="no such file")
    return FileResponse(path)
```

The same rule as SQL: **don't build HTML by pasting text into it.** Use a template engine that escapes by default. (Jinja lets a template mark a value as safe with `|safe`, which turns escaping off. Every `|safe` on user-supplied data is an XSS bug.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py -k script" label="the script is shown as text, not run (green)" -- Render templates/project.html with templates.TemplateResponse; Jinja escapes {{ project.name }}.
```

## Attack 3: path traversal

Bo asks for a dataset called:

```text
../secret.env
```

`DATASETS / "../secret.env"` is `…/studio-accounts/datasets/../secret.env`, and `..` means "the folder above". So the path points at `studio-accounts/secret.env`, the settings file next to the code, and `FileResponse` sends it:

```text
STUDIO_SECRET=correct-horse-battery-staple
```

An **absolute** path is even simpler: `pathlib` treats `DATASETS / "C:\\Users\\you\\…\\secret.env"` as just the absolute path, throwing `DATASETS` away. Either way, any file the server's user account can read is downloadable: settings, source code, the database file itself.

> **Path traversal**: using `..` or absolute paths in a file name to reach files outside the folder a program meant to serve from.
>
> *Picture it as* a stores request for "bin 4, then go up one aisle and into the office safe". If the storekeeper follows directions literally instead of checking the destination is inside the stores, the request gets them anywhere.

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py -k path_traversal" exit=1 stdout="STUDIO_SECRET" label="the secret file is served through the dataset route (red)"
```

## Fix 3: check where the path really ends up

Update `dataset_file` in `explore.py`:

```python file=explore.py
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates

import projects
from deps import Connection, User

HERE = Path(__file__).resolve().parent
DATASETS = HERE / "datasets"
templates = Jinja2Templates(directory=HERE / "templates")

router = APIRouter()


@router.get("/search")
def search(q: str, user: User, connection: Connection) -> list[dict]:
    return projects.search(connection, user, q)


@router.get("/projects/{project_id}/page", response_class=HTMLResponse)
def project_page(project_id: int, request: Request, user: User, connection: Connection):
    project = projects.get(connection, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="no such project")
    return templates.TemplateResponse(request, "project.html", {"project": project})


@router.get("/files")
def dataset_file(name: str, user: User):
    path = (DATASETS / name).resolve()
    if not path.is_relative_to(DATASETS) or not path.is_file():
        raise HTTPException(status_code=404, detail="no such file")
    return FileResponse(path)
```

- **`.resolve()`** works out where the path really points: it applies every `..`, follows shortcuts (symbolic links), and returns the absolute path. `datasets/../secret.env` resolves to `…/studio-accounts/secret.env`.
- **`.is_relative_to(DATASETS)`** asks whether that real path is inside the datasets folder. If not, 404, the same answer as a file that doesn't exist (lesson 6.3's reasoning).

Check the **destination**, after resolving, not the input. Filtering the input ("reject names containing `..`") is a classic half-fix: attackers try encodings, absolute paths, and odd separators until one slips through. A check on where the path ends up has nothing to slip past.

```check
run ".venv/Scripts/python -m pytest -q tests/test_injection.py" label="all three attacks fail, and all three features still work (green)" -- path = (DATASETS / name).resolve(); refuse it unless path.is_relative_to(DATASETS).
```

### One idea, three places

| Interpreter | The mistake | The data-only channel |
|---|---|---|
| SQL database | pasting text into a statement | `?` placeholders |
| Browser (HTML) | pasting text into a page | an escaping template engine |
| File system | joining a user's name onto a folder | resolve, then check the destination |

Next lesson: attacks that don't inject anything. They abuse what the service does by design: answering logins as fast as it can be asked, trusting any request that carries a cookie, and leaving security settings at their defaults.
