---
title: 15.2 — Models You Can Trust: Artifacts
track: Production ML — The Defect Studio
runtime: none
concepts: model-persistence
revisits: ml-testing, web-security, ensembles, sql, testing
notebook: ml-sklearn-workflow
lab: 28
problem: A trained model has to outlive the program that trained it, and be loaded later by the studio to answer the line. But a saved scikit-learn model is a pickle, and loading a pickle can run any code at all. How do you save models so that loading one is safe, and so you can always say exactly which model answered, trained on what?
---

Training takes seconds here and hours in real projects, so a trained model must be **saved** to a file and **loaded** whenever it's needed. That file is the thing that actually answers the production line, so it deserves care:

- **Safety.** scikit-learn models are saved with `joblib`, which uses Python's **pickle** format. A pickle isn't just data: it contains instructions for rebuilding objects, and loading a malicious one runs whatever it says. Lesson 13.4 met this with PyTorch.
- **Identity.** When a prediction looks wrong, you need to know exactly which model made it: its file, its training data, its settings, its accuracy.
- **Reproducibility.** Training again on the same data with the same settings should give the same model, or you can never be sure what changed.

> **Model artifact**: the saved, versioned output of training (the model file plus its **metadata**: what kind of model, trained on which data, with what settings, scoring what), treated as a release that's stored, identified, and loaded deliberately.
>
> *Picture it as* a released drawing revision. A part is made to "drawing 4471 revision C", not "the latest file on someone's laptop": the revision identifies exactly what was approved, and anyone can check that what they hold is that revision.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_artifacts.py provided
# Tests for studio/artifacts.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_artifacts.py
import hashlib
from pathlib import Path

import joblib
import numpy as np
import pytest

from studio import data, ml

X, Y = data.parse_runs(Path("data/parts.csv").read_text())


class Planted:
    """A pickle that, when loaded, creates a file: a stand-in for a real attack."""

    def __init__(self, target: Path):
        self.target = target

    def __reduce__(self):
        return (Path.touch, (self.target,))


def test_a_saved_model_comes_back_making_the_same_predictions(tmp_path):
    from studio import artifacts
    model, metrics = ml.train(X, Y, "forest")
    name = artifacts.save(model, metrics, tmp_path)
    assert np.array_equal(artifacts.load(tmp_path, name).predict_proba(X), model.predict_proba(X))


def test_the_name_is_the_fingerprint_of_the_file(tmp_path):
    from studio import artifacts
    name = artifacts.save(ml.train(X, Y, "logistic")[0], {}, tmp_path)
    assert name == hashlib.sha256((tmp_path / f"{name}.joblib").read_bytes()).hexdigest()


def test_metadata_is_kept_beside_the_model(tmp_path):
    from studio import artifacts
    model, metrics = ml.train(X, Y, "forest")
    name = artifacts.save(model, {"kind": "forest", **metrics}, tmp_path)
    assert artifacts.metadata(tmp_path, name) == {"kind": "forest", "accuracy": 0.814, "baseline": 0.634, "id": name}


def test_training_again_on_the_same_data_gives_the_same_file(tmp_path):
    from studio import artifacts
    for kind in ml.KINDS:
        first = artifacts.save(ml.train(X, Y, kind)[0], {}, tmp_path)
        again = artifacts.save(ml.train(X, Y, kind)[0], {}, tmp_path)
        assert first == again


def test_a_changed_file_is_refused(tmp_path):
    from studio import artifacts
    name = artifacts.save(ml.train(X, Y, "logistic")[0], {}, tmp_path)
    path = tmp_path / f"{name}.joblib"
    content = bytearray(path.read_bytes())
    content[-20] ^= 1
    path.write_bytes(bytes(content))
    with pytest.raises(artifacts.TamperedArtifact):
        artifacts.load(tmp_path, name)


def test_a_planted_pickle_is_refused_before_it_can_run(tmp_path):
    from studio import artifacts
    evidence = tmp_path / "attack-ran.txt"
    joblib.dump(Planted(evidence), tmp_path / "planted.joblib")
    joblib.load(tmp_path / "planted.joblib")
    assert evidence.exists(), "loading a pickle really does run its instructions"
    evidence.unlink()

    pretend_name = "0" * 64
    (tmp_path / "planted.joblib").replace(tmp_path / f"{pretend_name}.joblib")
    with pytest.raises(artifacts.TamperedArtifact):
        artifacts.load(tmp_path, pretend_name)
    assert not evidence.exists()
```

Read the last test carefully. `Planted` is a harmless stand-in for an attack: its **`__reduce__`** method tells pickle "to rebuild me, call `Path.touch` on this path", and `Path.touch` creates an empty file. The test first loads it with plain `joblib.load` and checks the file **was created**: loading ran the planted instruction. A real attacker's instruction would delete files or install software. Then it plants the same pickle in the studio's model folder and checks that `artifacts.load` refuses it **before unpickling**, so nothing runs.

`content[-20] ^= 1` flips one bit in one byte near the end of a saved model: `^` is "exclusive or", and `^= 1` toggles the lowest bit. One bit of damage, which must be detected.

```check
file tests/test_artifacts.py -- Click "Create provided tests/test_artifacts.py" above.
```

## A name that proves itself

A **fingerprint** (a cryptographic hash, lesson 6.1's SHA-256) of the model file's bytes changes completely if even one bit of the file changes, and nobody can make a different file with a chosen fingerprint. So: **name each model file by its own fingerprint**. Then the name is also the check. To load a model, read its bytes, fingerprint them, and compare with the name *before* unpickling. A tampered or substituted file can't match.

> **Content addressing**: identifying stored data by the hash of its contents rather than by a name someone chose. The same content always gets the same address; different content can't share one; and anyone can verify that what they fetched is what they asked for. Git stores every version of every file this way.
>
> *Picture it as* a part whose serial number is computed from its own measurements. Swap in a different part and its "serial number" no longer matches the label, without anyone needing to keep a separate list.

**Where the picture stops working:** the fingerprint proves the file is the one that was *saved*, not that it was *good*. If an attacker could write to the database where the studio records which model to use, they could point it at their own file with its own correct fingerprint. The check moves the trust to that record, which is why the database and model folder must be protected (lesson 6.5's defence in depth) and model files only ever come from the studio's own training.

Create `studio/artifacts.py`:

```python file=studio/artifacts.py
import hashlib
import json
import uuid
from pathlib import Path

import joblib


class TamperedArtifact(Exception):
    """A model file's contents no longer match its name, the fingerprint taken when it was saved."""


def fingerprint(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save(model, metadata: dict, folder: Path) -> str:
    """Write the model, named by the fingerprint of its bytes, with its metadata beside it; returns the name."""
    folder.mkdir(parents=True, exist_ok=True)
    temporary = folder / f"saving-{uuid.uuid4().hex}.tmp"
    joblib.dump(model, temporary)
    artifact_id = fingerprint(temporary.read_bytes())
    temporary.replace(folder / f"{artifact_id}.joblib")
    (folder / f"{artifact_id}.json").write_text(json.dumps({**metadata, "id": artifact_id}, indent=2))
    return artifact_id


def metadata(folder: Path, artifact_id: str) -> dict:
    return json.loads((folder / f"{artifact_id}.json").read_text())


def load(folder: Path, artifact_id: str):
    """The model, only if the file's fingerprint still equals its name: refuse to unpickle anything else."""
    path = folder / f"{artifact_id}.joblib"
    if fingerprint(path.read_bytes()) != artifact_id:
        raise TamperedArtifact(artifact_id)
    return joblib.load(path)
```

- **`joblib.dump(model, path)`** pickles the model to a file (efficiently, for the large NumPy arrays inside forests); **`joblib.load(path)`** unpickles it.
- **Save to a temporary name, then rename.** The fingerprint isn't known until the file is written. `temporary.replace(...)` renames it in one step, so no other part of the studio can ever see a half-written model under a real name.
- **`uuid.uuid4().hex`**: a random 32-character name, different every time. Lesson 15.3 will train two models at once on two threads; if both wrote to the same temporary file, one could rename the other's half-written model. (An earlier draft of this course used a fixed name, `saving.tmp`, and its test of two simultaneous jobs failed now and then: exactly the kind of bug that only shows up under load.)
- **`hexdigest()`**: the 32-byte hash as 64 hexadecimal characters, safe to use in a filename.
- **`{**metadata, "id": artifact_id}`**: a new dictionary with everything from `metadata` plus the id (`**` unpacks a dictionary, as it did keyword arguments in lesson 12.3).
- **`json.dumps(..., indent=2)`**: the metadata as readable JSON. It's for people and for lesson 15.5's monitoring; it's deliberately **not** used for the safety check, which relies only on the name.

```check
run ".venv/Scripts/python -m pytest -q tests/test_artifacts.py" label="models come back identical, named by their fingerprint, and a changed or planted file is refused before it can run" -- name = sha256 of the saved bytes; load refuses unless sha256(file) == name, before joblib.load
```

## Reproducible by construction

One of the tests says more than it seems to: **training again on the same data gives the same file**, byte for byte, so the same fingerprint. That's only true because lesson 15.1's `train` fixes every source of randomness with `seed`: the cross-validation folds and the forest's bootstrap samples and feature choices.

That gives the studio a strong guarantee. If two experiments on the same dataset with the same kind produce different fingerprints, *something else changed*: a library version, the code, or the data. You can ask that question with one comparison, months later.

```predict
question: You upgrade scikit-learn and retrain on the same data, same kind, same seed. Should you expect the same fingerprint?
choice: Yes: same data, same seed, same model
choice: Not necessarily: a new version may compute slightly differently or store the model differently, so the bytes, and the fingerprint, can change
choice: No, never: fingerprints include the date
answer: Not necessarily: a new version may compute slightly differently or store the model differently, so the bytes, and the fingerprint, can change
explain: Reproducibility needs everything fixed: data, code, settings, seeds and library versions. That's why requirements.txt pins exact versions (scikit-learn==1.9.1, not "any scikit-learn"). It's also why many teams record the library versions in each model's metadata: a different fingerprint after an upgrade is then explained rather than mysterious.
```

The studio can now save, identify and safely reload models. Next: running training in the background, and remembering every experiment in a database.
