---
title: 16.4 — Ship It, Report It, Make It Yours
track: Capstone — Your Own ML Product
runtime: none
concepts: deployment
revisits: ml-testing, model-persistence, web-security, virtual-environments, testing
notebook: ml-capstone
lab: 33
problem: The advisor works and is tested. What's left before someone else can rely on it, and what does an honest report of a model's performance contain? And then: how do you do all of this again, on your own?
---

Two things stand between a working model and a product: **packaging**, so it runs the same wherever it's deployed, and an **honest report**, so the people relying on it know what it can and can't do. This lesson finishes both for the advisor, then hands the method over to you.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_release.py provided
# Tests for the release: packaging and the finished brief. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_release.py
import re
from pathlib import Path


def test_every_requirement_is_pinned():
    lines = [line for line in Path("requirements.txt").read_text().splitlines() if line.strip()]
    assert lines and all("==" in line for line in lines)


def test_the_dockerfile_carries_the_advisor_and_its_data_unprivileged():
    recipe = Path("Dockerfile").read_text().splitlines()
    for line in ["FROM python:3.13-slim", "RUN pip install --no-cache-dir -r requirements.txt",
                 "COPY advisor ./advisor", "COPY data/tool_life.csv ./data/tool_life.csv", "USER advisor"]:
        assert line in recipe, line
    assert any("advisor.api:production_app" in line and "--factory" in line for line in recipe)


def test_dockerignore_keeps_the_virtual_environment_out():
    assert ".venv/" in Path(".dockerignore").read_text().split()


def test_the_brief_is_finished_with_measured_results():
    brief = Path("PROJECT.md").read_text(encoding="utf-8")
    assert "TODO" not in brief
    results = brief.split("## Results", 1)[1]
    assert len(re.findall(r"\d+", results)) >= 2, "report the numbers you measured"
```

The last test reads your brief: by the end of this lesson, `PROJECT.md` must have no TODO left, and its **Results** section must contain measured numbers.

```check
file tests/test_release.py -- Click "Create provided tests/test_release.py" above.
```

## The container

Lesson 15.6's Dockerfile, adapted. One difference matters: the advisor fits its model from the turning tests **at start-up**, so the data file goes into the image too. (The studio's data lived on a volume because users uploaded it; the advisor's data is part of the product, versioned with the code.) Create `Dockerfile`:

```dockerfile file=Dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY advisor ./advisor
COPY data/tool_life.csv ./data/tool_life.csv

RUN useradd --create-home advisor
USER advisor
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "advisor.api:production_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

- **`COPY data/tool_life.csv ./data/tool_life.csv`**: only the file the advisor needs, at the path `production_app` expects by default.
- **`USER advisor`**: an ordinary user, never root (lesson 15.6).
- No `VOLUME`: the advisor writes nothing, so a restarted container is exactly as good as the old one.

```check
file Dockerfile
```

## Keeping things out of the image

Create `.dockerignore`:

```text file=.dockerignore
.venv/
__pycache__/
.pytest_cache/
tests/
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_release.py -k \"pinned or dockerfile or ignore\"" label="pinned requirements, an unprivileged image that carries its data, and no .venv in it"
```

To build and run it, with Docker installed:

```powershell
docker build -t tool-life-advisor .
docker run -p 8000:8000 tool-life-advisor
```

## The honest report

The brief's last section, **Results**, is what someone deciding whether to trust the advisor will read. An honest results section has four parts:

1. **The number, against the baseline**, measured on data the model didn't learn from: "typical error 189 minutes in 5-fold cross-validation, against 821 for always predicting the average."
2. **What else was tried**, and how it did: "a random forest scored 369; linear regression on the raw settings, 525."
3. **Why the result can be believed**, beyond the score: "the fitted speed exponent gives Taylor's n = 0.31, within the published range for carbide; behavioural tests confirm life falls with speed, feed, depth, hardness and dry cutting."
4. **The limits**: "fitted on speeds of 121–319 m/min, feeds 0.1–0.4 mm/rev, depths 0.5–3 mm, hardness 180–260 HB, one insert grade. Answers outside these ranges are flagged and must be confirmed by test cuts. Typical error is larger in absolute minutes for long tool lives (it is roughly a constant percentage)."

> **Model card**: a short, standard document that travels with a model and states what it's for, what data it was trained on, how it was evaluated and how well it did, and its known limitations and conditions of use. The Results section of your brief is a small one.
>
> *Picture it as* the data sheet that comes with a gauge: range, resolution, accuracy, calibration conditions. Nobody would use a gauge without knowing its range, and a model is a gauge for something nobody can measure directly.

Write the Results section of `PROJECT.md` now, in your own words, using your measured numbers from lessons 16.1 and 16.2. Replace its TODO line; the check confirms no TODO remains anywhere and that Results contains numbers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_release.py" label="the brief is complete: no TODO left, and Results reports measured numbers"
```

## Everything, once more

Run every test in the project:

```powershell
.venv\Scripts\python -m pytest -q
```

Data validation, the model's quality gate and physical behaviour, the API, the extrapolation flags, the release: all green, every one written before or alongside the code it tests.

```check
run ".venv/Scripts/python -m pytest -q" stdout="passed" label="the whole advisor passes every test"
```

```predict
question: A year from now, the shop switches to a new insert grade. The advisor still runs and still passes every test. What has gone wrong, and how would you have caught it?
choice: Nothing: the tests pass
choice: The model describes the old insert grade, so its answers for the new one are untested; the brief's limits section says so, and the fix is new turning tests with the new grade, then refitting and re-checking the exponents
choice: The container needs rebuilding
answer: The model describes the old insert grade, so its answers for the new one are untested; the brief's limits section says so, and the fix is new turning tests with the new grade, then refitting and re-checking the exponents
explain: The tests check the code and the model's behaviour on the data it has; none of them can know the world changed. That's why the Results section names the conditions it holds for ("one insert grade") and why lesson 15.5's monitoring matters in production: logged predictions compared with actual tool lives would show the error growing. A model is a statement about the data it was fitted on, and stays true only as long as the world matches that data.
```

## Your own problem: the whole method

This is the method the capstone followed, and every stage is something this series taught. For your own product, work down the list, and don't skip ahead:

| stage | what to produce | where you learned it |
|---|---|---|
| 1. The decision | the brief: who decides what, from which prediction | lesson 16.1 |
| 2. The data | validated loading, with tests for every way it can be wrong | lessons 15.1, 16.1 (Chapters 1, 6) |
| 3. The number to beat | a dummy model, cross-validated | lessons 8.5, 16.1 |
| 4. Mathematical justification | what's known about the problem; features that encode it | lessons 16.2 (Chapters 2–3, 11) |
| 5. Models | the simple one first, then the right one, compared on the same folds | Chapters 3, 7–14 |
| 6. Honest evaluation | cross-validation, no leakage, behavioural tests, a quality gate | Chapter 7, lessons 15.4, 16.2 |
| 7. Architecture | layers: data, model, service, API | lessons 15.1–15.3 |
| 8. API | an app factory, validation, status codes, range flags | Chapter 4, lessons 15.4, 16.3 |
| 9. Storage | experiments in a database; models as fingerprinted artifacts | Chapter 5, lessons 15.2–15.3 |
| 10. Security | validated input, no unsafe pickles, no root, secrets out of code | Chapter 6, lessons 13.4, 15.2, 15.6 |
| 11. Watching it | prediction logs, drift checks, resilient outside calls | lesson 15.5 |
| 12. Shipping | pinned requirements, a container, crash recovery | lessons 15.6, 16.4 |
| 13. The report | the brief's Results: numbers, comparisons, limits | lesson 16.4 |

Some ideas from the shop floor if you need a starting point: predicting which machine needs maintenance next from its alarm history; estimating cycle time for a new part from its features; flagging measurement reports that look unlike the process (lesson 11.3's residuals); reading part numbers from photos of tags (Chapter 13); routing quality notes to the right engineer (Chapter 14). Choose one where you can find the person who'd act on the answer: that's the test of a good problem.

## Where to go next

You've built, from the mathematics up: regression, classification, trees and forests, clustering, PCA, neural networks and backpropagation, PyTorch, text search and embeddings, and a production service with its tests, security and monitoring. The ML Lab's later labs go further in each direction: boosting and support vector machines (labs 14–15), time series (19), attention and transformers (26), retrieval and language-model applications (34), recommender systems (35), and causal inference and experiments (36). Each builds on exactly the foundations you now have.
