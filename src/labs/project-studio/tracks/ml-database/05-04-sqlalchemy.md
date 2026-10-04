---
title: 5.4 — SQLAlchemy: The SQL Is Still There
track: Databases — The Experiment Database
runtime: none
concepts: data-access-layers
revisits: sql, classes, type-hints, testing
lab: 28
problem: Writing SQL as strings means the database and the Python code describe the same tables twice, and a typo in a column name only shows up when the query runs. Is there a way to describe each table once, in Python, and still know exactly what SQL runs?
---

Your tables are described twice: once in `SCHEMA` (the SQL), and again, implicitly, in every query string and every `row["sqft"]` in Python. Rename a column and you hunt through strings. Misspell one (`row["sqtf"]`) and nothing complains until that line runs.

**SQLAlchemy** is the library most Python services use to talk to relational databases. Its **ORM** lets you describe each table once, as a Python class, and write queries as Python expressions that your editor can check. It's also where many people stop understanding what their program does to the database. So this lesson does one thing no tutorial skips more often: it turns on SQLAlchemy's **echo**, and you read every statement it sends.

> **ORM** (object–relational mapper): a library that maps each table to a class and each row to an object of that class, and turns operations on objects (create one, change an attribute, follow a link to a related object) into SQL statements.
>
> *Picture it as* a translator at a meeting with a supplier who speaks another language. You speak in your own terms ("give me model linear-v1 and its predictions"); the translator turns that into the supplier's language (SQL) and the replies back into yours (objects). **Where the picture stops working:** a good translator might choose the wording; an ORM's wording is fixed by rules, and sometimes it says more than you meant (you'll see an example). That's why you listen in.

## Install SQLAlchemy

Add it to `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
sqlalchemy==2.1.3
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

```check
run ".venv/Scripts/python -c \"import sqlalchemy; print(sqlalchemy.__version__)\"" stdout="2.1.3" label="SQLAlchemy 2.1.3 is installed" -- Add sqlalchemy==2.1.3 to requirements.txt and install it.
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_orm.py provided
# Tests for orm.py: SQLAlchemy must agree with the plain-SQL code. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_orm.py
from pytest import approx
from sqlalchemy import select

import experiments


def seed(path):
    """Write two predictions with plain SQL, the lesson 5.2 way."""
    db = experiments.connect(path)
    model = experiments.add_model(db, "linear-v1", ["sqft", "bedrooms", "age"], rmse=25889.0)
    experiments.record(db, model, 1500, 3, 20, 252006.15)
    experiments.record(db, model, 2000, 4, 5, 330000.0)
    db.close()


def test_mapping_reads_rows_written_with_plain_sql(tmp_path):
    import orm
    seed(tmp_path / "x.db")
    with orm.Session(orm.engine_for(tmp_path / "x.db")) as session:
        model = session.scalars(select(orm.Model).where(orm.Model.name == "linear-v1")).one()
        assert model.features == "sqft,bedrooms,age"
        assert model.rmse == approx(25889.0)
        assert [prediction.sqft for prediction in model.predictions] == [1500, 2000]


def test_mapping_links_go_both_ways(tmp_path):
    import orm
    seed(tmp_path / "x.db")
    with orm.Session(orm.engine_for(tmp_path / "x.db")) as session:
        prediction = session.get(orm.Prediction, 1)
        assert prediction.model.name == "linear-v1"


def test_orm_writes_rows_that_plain_sql_can_read(tmp_path):
    import orm
    experiments.connect(tmp_path / "x.db").close()            # create the tables
    with orm.Session(orm.engine_for(tmp_path / "x.db")) as session:
        model = orm.Model(name="orm-made", features="sqft", created_at=experiments.now())
        model.predictions.append(orm.Prediction(sqft=900, bedrooms=1, age=3, price=150000.0, created_at=experiments.now()))
        session.add(model)
        session.commit()
    assert experiments.summary(experiments.connect(tmp_path / "x.db")) == [
        {"name": "orm-made", "predictions": 1, "average_price": approx(150000.0)},
    ]


def test_orm_summary_matches_the_sql_summary(tmp_path):
    import orm
    seed(tmp_path / "x.db")
    db = experiments.connect(tmp_path / "x.db")
    experiments.add_model(db, "unused", ["sqft"])             # a model with no predictions
    with orm.Session(orm.engine_for(tmp_path / "x.db")) as session:
        assert orm.summary(session) == experiments.summary(db)
```

These tests mix the two worlds on purpose: rows written with plain SQL must be readable through SQLAlchemy, rows written through SQLAlchemy must be readable with plain SQL, and the summary must come out identical both ways. It's the same idea as lesson 1.3's "pandas must agree with your code": the library replaces nothing it can't reproduce, and the database underneath is the same file with the same tables.

```check
file tests/test_orm.py -- Click "Create provided tests/test_orm.py" above.
```

## Classes for tables

Create `orm.py`:

```python file=orm.py
from pathlib import Path

from sqlalchemy import ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Model(Base):
    __tablename__ = "models"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    features: Mapped[str]
    rmse: Mapped[float | None]
    created_at: Mapped[str]
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="model", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"))
    sqft: Mapped[float]
    bedrooms: Mapped[float]
    age: Mapped[float]
    price: Mapped[float]
    created_at: Mapped[str]
    model: Mapped[Model] = relationship(back_populates="predictions")


def engine_for(path: str | Path, echo: bool = False):
    return create_engine(f"sqlite:///{path}", echo=echo)
```

Read it against the `SCHEMA` from lesson 5.2; every line has a partner there.

- **`class Base(DeclarativeBase)`**: every mapped class inherits from one `Base`, which collects them all, so SQLAlchemy knows every table in the project.
- **`__tablename__ = "models"`**: which table this class maps to.
- **`id: Mapped[int] = mapped_column(primary_key=True)`**: a column, described with a **type hint**. `Mapped[int]` says "this attribute holds an `int` from the database"; `mapped_column(...)` adds the extras, such as primary key or unique. `Mapped[float | None]` means the column may be `NULL` (it isn't `NOT NULL`); a plain `Mapped[float]` means `NOT NULL`. FastAPI turned type hints into validation; SQLAlchemy turns them into columns.
- **`ForeignKey("models.id", ondelete="CASCADE")`**: the same foreign key as `REFERENCES models (id) ON DELETE CASCADE`.
- **`relationship(...)`** is the part with no SQL partner. It isn't a column: it's a **Python attribute that follows a foreign key**. `model.predictions` is the list of that model's prediction objects; `prediction.model` is the model object a prediction belongs to. `back_populates` tells each side about the other, so they stay in step. `cascade="all, delete-orphan"` means objects added to `model.predictions` are saved with the model, and removed ones deleted.
- **`create_engine("sqlite:///x.db")`**: an **engine** is SQLAlchemy's starting point for a database: it knows how to open connections to it. The URL says which kind of database (`sqlite`) and where (`///` then a file path). Switching to PostgreSQL later is mostly a different URL.

> **Session**: SQLAlchemy's workspace for one piece of work. It keeps track of the objects you've loaded or added, and turns all their changes into SQL when you **commit**, in one transaction.
>
> *Picture it as* a job's work order with a list of changes on it. You add lines as you go (new model, new prediction, a renamed model); nothing happens on the shop floor until the order is released (commit), and then everything on it happens together.

The tests use it like this:

- **`select(orm.Model).where(orm.Model.name == "linear-v1")`** builds a query. `orm.Model.name == "linear-v1"` doesn't compare anything when Python runs it: on a mapped class, `==` builds a piece of a SQL condition. That's how a query can be written as a Python expression.
- **`session.scalars(...).one()`**: run it and return exactly one object, raising an error if there are none or several (like `[row] = ...` in lesson 5.3).
- **`session.get(orm.Prediction, 1)`**: fetch by primary key.
- **`session.add(model)`** then **`session.commit()`**: save.

```check
run ".venv/Scripts/python -m pytest -q tests/test_orm.py -k mapping" label="SQLAlchemy reads rows written with plain SQL, and follows links both ways" -- Every column in SCHEMA needs a Mapped attribute with the same name; relationships follow the foreign key.
run ".venv/Scripts/python -m pytest -q tests/test_orm.py -k writes" label="and rows it writes can be read with plain SQL"
```

## Listen in: echo

Create `show_sql.py`, which loads one model and then touches its predictions, with `echo=True`:

```python file=show_sql.py
from sqlalchemy import select

import orm
from repository import Repository

repository = Repository.open("experiments.db")
repository.model_id("linear-v1", ["sqft", "bedrooms", "age"])   # make sure there's a model to find
repository.close()

engine = orm.engine_for("experiments.db", echo=True)
with orm.Session(engine) as session:
    model = session.scalars(select(orm.Model).where(orm.Model.name == "linear-v1")).one()
    print("--- the model is loaded; now touching model.predictions ---")
    print(model.name, "has", len(model.predictions), "predictions")
```

```powershell
.venv\Scripts\python show_sql.py
```

```text
… INFO sqlalchemy.engine.Engine BEGIN (implicit)
… INFO sqlalchemy.engine.Engine SELECT models.id, models.name, models.features, models.rmse, models.created_at
FROM models
WHERE models.name = ?
… INFO sqlalchemy.engine.Engine [generated in 0.00028s] ('linear-v1',)
--- the model is loaded; now touching model.predictions ---
… INFO sqlalchemy.engine.Engine SELECT predictions.id, predictions.model_id, predictions.sqft, predictions.bedrooms, predictions.age, predictions.price, predictions.created_at
FROM predictions
WHERE ? = predictions.model_id
… INFO sqlalchemy.engine.Engine [generated in 0.00020s] (1,)
linear-v1 has 3 predictions
… INFO sqlalchemy.engine.Engine ROLLBACK
```

(Timestamps, timings and your prediction count will differ.) Read it like the raw HTTP in lesson 4.1:

- **The SQL is ordinary SQL.** `SELECT … FROM models WHERE models.name = ?` with the value sent separately, in the brackets: placeholders, exactly as you wrote by hand. SQLAlchemy never pastes values into the SQL text either.
- **`model.predictions` ran a second query**, at the moment you first touched it, not when the model was loaded. This is **lazy loading**: related objects are fetched only if you use them.
- **`ROLLBACK`** at the end: the session started a transaction (`BEGIN (implicit)`), only read, and when the `with` block ended without a commit, SQLAlchemy rolled back. Reading never needs a commit.

```predict
question: A page lists 50 models, and for each one shows how many predictions it has, using len(model.predictions). How many SELECT statements does that page cause?
answer: 51
explain: One SELECT loads the 50 models. Then each len(model.predictions) lazily loads that model's predictions: 50 more SELECTs, one per model. 51 queries for one page is called the **N + 1 problem**, and it's the most common way an ORM makes a service slow without anyone noticing, because nothing in the Python code looks like a loop of queries. With echo on, you'd see it immediately. The fix is to ask for the count in the query itself, with a GROUP BY: which is exactly what summary does, in the next step, in one statement.
verify: .venv/Scripts/python -c "import orm, experiments, logging; db = experiments.connect('n1.db'); [experiments.add_model(db, f'm{i}', ['sqft']) for i in range(50) if not db.execute('SELECT 1 FROM models WHERE name = ?', (f'm{i}',)).fetchone()]; db.close(); from sqlalchemy import event, select; e = orm.engine_for('n1.db'); n = []; event.listen(e, 'before_cursor_execute', lambda *a: n.append(1)); s = orm.Session(e); [len(m.predictions) for m in s.scalars(select(orm.Model)).all()]; print(len(n))"
```

```check
run ".venv/Scripts/python show_sql.py" stdout="FROM predictions" label="echo shows the second, lazy SELECT for model.predictions"
```

## The summary, in SQLAlchemy

Add `summary` to `orm.py`: the same question as lesson 5.2's SQL, as a SQLAlchemy query:

```python file=orm.py
from pathlib import Path

from sqlalchemy import ForeignKey, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Model(Base):
    __tablename__ = "models"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    features: Mapped[str]
    rmse: Mapped[float | None]
    created_at: Mapped[str]
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="model", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"))
    sqft: Mapped[float]
    bedrooms: Mapped[float]
    age: Mapped[float]
    price: Mapped[float]
    created_at: Mapped[str]
    model: Mapped[Model] = relationship(back_populates="predictions")


def engine_for(path: str | Path, echo: bool = False):
    return create_engine(f"sqlite:///{path}", echo=echo)


def summary(session: Session) -> list[dict]:
    statement = (
        select(Model.name, func.count(Prediction.id).label("predictions"), func.avg(Prediction.price).label("average_price"))
        .outerjoin(Model.predictions)
        .group_by(Model.id)
        .order_by(Model.name)
    )
    return [dict(row._mapping) for row in session.execute(statement)]
```

Put it next to lesson 5.2's SQL and it's a line-by-line translation:

| SQL | SQLAlchemy |
|---|---|
| `SELECT models.name,` | `select(Model.name,` |
| `COUNT(predictions.id) AS predictions,` | `func.count(Prediction.id).label("predictions"),` |
| `AVG(predictions.price) AS average_price` | `func.avg(Prediction.price).label("average_price"))` |
| `FROM models LEFT JOIN predictions ON …` | `.outerjoin(Model.predictions)` |
| `GROUP BY models.id` | `.group_by(Model.id)` |
| `ORDER BY models.name` | `.order_by(Model.name)` |

`func.count`, `func.avg`: `func` produces any SQL function by name. `.outerjoin(Model.predictions)` is a `LEFT OUTER JOIN`, and because it names the relationship, SQLAlchemy writes the `ON` condition from the foreign key for you. `row._mapping` is a result row viewed as a dictionary.

So what did SQLAlchemy buy? The table's columns are named in one place; a misspelt `Prediction.prcie` fails the moment Python reads the line, with your editor underlining it before that; and the query is built from objects, so parts of it can be assembled by code (add a `.where(...)` only when a filter was asked for) without gluing strings together. What it didn't do is let you stop knowing SQL: the table above is only readable because you can read both columns.

```check
run ".venv/Scripts/python -m pytest -q tests/test_orm.py" label="SQLAlchemy's summary is identical to the plain-SQL one" -- outerjoin, not join, so models with no predictions still appear.
```

### When to use which

Plain SQL (lesson 5.2) and SQLAlchemy are both used in professional code. Rules of thumb: SQLAlchemy for the everyday create/read/update/delete of objects, where its checking and relationships save mistakes; hand-written SQL for complicated reporting queries, where the SQL itself is the clearest description. Either way, turn echo on whenever a page is slow, and count the queries.

Next lesson: the schema itself has to change (a new column, a new index) on a database that already holds data you can't lose. That's a **migration**.
