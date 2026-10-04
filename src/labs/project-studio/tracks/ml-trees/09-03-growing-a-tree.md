---
title: 9.3 — Questions About the Answers: Growing a Tree
track: Trees and Neighbours — Predicting Defects
runtime: none
concepts: decision-trees
revisits: regularization, cross-validation, functions, scikit-learn, testing
notebook: ml-decision-trees
lab: 12
problem: One question split the runs into a hot group and a normal group, but each group is still mixed. The obvious next step is to ask another question inside each group, and again inside those. How do you write a program that keeps asking, when to stop, and how do you read what it learned?
---

After the first question, the 303 normal-temperature runs still fail 25% of the time, and the 72 hot runs 86%. Each group is a smaller version of the original problem: a set of runs, some failed, that you'd like to split by its best question. So do exactly that, inside each group, and again inside the groups that produces.

That idea, a problem solved by solving smaller copies of itself, is called **recursion**, and it's the natural way to write a tree.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_tree.py provided
# Tests for tree.py's grow, predict and rules. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_tree.py
import numpy as np
from sklearn.tree import DecisionTreeClassifier

import parts

X_TRAIN, X_TEST, Y_TRAIN, Y_TEST = parts.split(*parts.load("data/parts.csv"))

SMALL_X = np.array([[1.0], [2.0], [3.0], [4.0], [5.0], [6.0]])
SMALL_Y = np.array([0, 0, 1, 1, 1, 0])


def test_grow_with_no_depth_makes_a_single_leaf():
    import tree
    assert tree.grow(SMALL_X, SMALL_Y, max_depth=0) == {"defect_rate": 0.5, "runs": 6}


def test_grow_asks_questions_until_the_depth_runs_out():
    import tree
    node = tree.grow(SMALL_X, SMALL_Y, max_depth=1)
    assert (node["feature"], node["threshold"]) == (0, 2.5)
    assert node["yes"] == {"defect_rate": 0.0, "runs": 2}
    assert node["no"] == {"defect_rate": 0.75, "runs": 4}


def test_grow_stops_when_a_group_is_pure():
    import tree
    node = tree.grow(SMALL_X, SMALL_Y, max_depth=10)
    assert node["yes"] == {"defect_rate": 0.0, "runs": 2}
    assert node["no"]["no"] == {"defect_rate": 0.0, "runs": 1}


def test_predict_follows_the_answers_down_to_a_leaf():
    import tree
    node = {"feature": 1, "threshold": 10.0,
            "yes": {"defect_rate": 0.9, "runs": 5},
            "no": {"defect_rate": 0.2, "runs": 5}}
    assert tree.predict(node, np.array([[0.0, 3.0], [0.0, 30.0]])).tolist() == [1, 0]


def test_predict_matches_scikit_learn_to_depth_three():
    import tree
    for depth in [1, 2, 3]:
        theirs = DecisionTreeClassifier(max_depth=depth).fit(X_TRAIN, Y_TRAIN).predict(X_TEST)
        assert tree.predict(tree.grow(X_TRAIN, Y_TRAIN, max_depth=depth), X_TEST).tolist() == theirs.tolist()


def test_rules_read_like_python():
    import tree
    lines = tree.rules(tree.grow(X_TRAIN, Y_TRAIN, max_depth=1), parts.FEATURES)
    assert lines == [
        "if temperature <= 235.85:",
        "    defect rate 0.25 (303 runs)",
        "else:",
        "    defect rate 0.86 (72 runs)",
    ]
```

- A tree is stored as **nested dictionaries**. A question is `{"feature": …, "threshold": …, "yes": …, "no": …}`, where `"yes"` and `"no"` are themselves trees; a **leaf** (an end point, with no more questions) is `{"defect_rate": …, "runs": …}`.
- `node["no"]["no"]` reaches two levels down: the no branch of the no branch.
- The test only compares with scikit-learn up to depth 3. Deeper down, groups get small and two questions often tie for best; scikit-learn breaks ties in its own way, so deeper trees can differ without either being wrong.

```check
file tests/test_tree.py -- Click "Create provided tests/test_tree.py" above.
```

## A function that calls itself

> **Recursion**: a function that solves a problem by calling *itself* on smaller pieces of the same problem, until the pieces are small enough to answer directly. That direct answer is the **base case**, and without one, the function would call itself forever.
>
> *Picture it as* a bill of materials. To cost an assembly, you cost each sub-assembly the same way, and each of those costs *its* parts the same way, down to purchased parts, which have a price you can just look up (the base case). One rule, applied at every level.

Growing a tree, written as that kind of rule:

- **Base case:** if the tree is already as deep as allowed, or no question makes the groups purer, stop and make a **leaf** that records the defect rate.
- **Otherwise:** find the best question (lesson 9.2), split the runs into yes and no, and **grow a tree for each group** with the same function, one level deeper.

Add `grow` to the end of `tree.py`:

```python file=tree.py
import numpy as np


def gini(y: np.ndarray) -> float:
    """How mixed a group is: 0 when all one class, 0.5 when an even mix of two."""
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(1 - p ** 2 - (1 - p) ** 2)


def best_threshold(values: np.ndarray, y: np.ndarray) -> tuple[float | None, float]:
    """The threshold on one feature whose split leaves the lowest weighted impurity."""
    best_threshold, best_impurity = None, gini(y)
    distinct = np.unique(values)
    for threshold in (distinct[:-1] + distinct[1:]) / 2:
        left = values <= threshold
        impurity = float(left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
        if impurity < best_impurity:
            best_threshold, best_impurity = float(threshold), impurity
    return best_threshold, best_impurity


def best_split(X: np.ndarray, y: np.ndarray) -> tuple[int | None, float | None, float]:
    """(feature, threshold, impurity) of the best single question to ask."""
    best = (None, None, gini(y))
    for feature in range(X.shape[1]):
        threshold, impurity = best_threshold(X[:, feature], y)
        if impurity < best[2]:
            best = (feature, threshold, impurity)
    return best


def grow(X: np.ndarray, y: np.ndarray, max_depth: int, depth: int = 0) -> dict:
    """A decision tree, as nested dictionaries: a question with a yes and a no branch, or a leaf."""
    feature, threshold, _ = best_split(X, y) if depth < max_depth else (None, None, None)
    if feature is None:
        return {"defect_rate": float(np.mean(y)), "runs": len(y)}
    yes = X[:, feature] <= threshold
    return {
        "feature": feature,
        "threshold": threshold,
        "yes": grow(X[yes], y[yes], max_depth, depth + 1),
        "no": grow(X[~yes], y[~yes], max_depth, depth + 1),
    }
```

- **`… if depth < max_depth else (None, None, None)`**: only look for a question if there's depth left. Either way, `feature` ends up `None` when the answer is "stop here": out of depth, or (from `best_split`) no question helps, which includes a group that's already pure.
- **`grow(X[yes], y[yes], max_depth, depth + 1)`** is the recursive call: the same function, given only the yes runs, one level deeper. `depth + 1` is what guarantees it ends: every call is one level deeper, and at `max_depth` it must stop.

Trace `grow(SMALL_X, SMALL_Y, max_depth=1)`, with values 1–6 and labels `[0, 0, 1, 1, 1, 0]`:

| call | depth | runs (values) | what happens |
|---|---|---|---|
| `grow(all)` | 0 | 1, 2, 3, 4, 5, 6 | 0 < 1, so find the best question: value ≤ 2.5. Split, and call `grow` twice: |
| `grow(yes)` | 1 | 1, 2 | 1 is not < 1: leaf, defect rate 0.0, 2 runs |
| `grow(no)` | 1 | 3, 4, 5, 6 | leaf, defect rate 0.75, 4 runs |

The first call waits while its two inner calls run, then builds its dictionary from what they return.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tree.py -k grow" label="grow asks questions until the depth runs out or the group is pure" -- base case: if depth == max_depth or best_split finds nothing, return a leaf; otherwise grow(yes) and grow(no) with depth + 1
```

## Predicting: follow the answers

To classify a run, start at the top and keep answering questions until you reach a leaf. Call it a defect if most training runs that ended in that leaf were defects:

```python file=tree.py
import numpy as np


def gini(y: np.ndarray) -> float:
    """How mixed a group is: 0 when all one class, 0.5 when an even mix of two."""
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(1 - p ** 2 - (1 - p) ** 2)


def best_threshold(values: np.ndarray, y: np.ndarray) -> tuple[float | None, float]:
    """The threshold on one feature whose split leaves the lowest weighted impurity."""
    best_threshold, best_impurity = None, gini(y)
    distinct = np.unique(values)
    for threshold in (distinct[:-1] + distinct[1:]) / 2:
        left = values <= threshold
        impurity = float(left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
        if impurity < best_impurity:
            best_threshold, best_impurity = float(threshold), impurity
    return best_threshold, best_impurity


def best_split(X: np.ndarray, y: np.ndarray) -> tuple[int | None, float | None, float]:
    """(feature, threshold, impurity) of the best single question to ask."""
    best = (None, None, gini(y))
    for feature in range(X.shape[1]):
        threshold, impurity = best_threshold(X[:, feature], y)
        if impurity < best[2]:
            best = (feature, threshold, impurity)
    return best


def grow(X: np.ndarray, y: np.ndarray, max_depth: int, depth: int = 0) -> dict:
    """A decision tree, as nested dictionaries: a question with a yes and a no branch, or a leaf."""
    feature, threshold, _ = best_split(X, y) if depth < max_depth else (None, None, None)
    if feature is None:
        return {"defect_rate": float(np.mean(y)), "runs": len(y)}
    yes = X[:, feature] <= threshold
    return {
        "feature": feature,
        "threshold": threshold,
        "yes": grow(X[yes], y[yes], max_depth, depth + 1),
        "no": grow(X[~yes], y[~yes], max_depth, depth + 1),
    }


def predict_one(node: dict, x: np.ndarray) -> int:
    while "feature" in node:
        node = node["yes"] if x[node["feature"]] <= node["threshold"] else node["no"]
    return int(node["defect_rate"] > 0.5)


def predict(node: dict, X: np.ndarray) -> np.ndarray:
    return np.array([predict_one(node, x) for x in X])
```

- **`while "feature" in node`**: a question has a `"feature"` key and a leaf doesn't, so this loops until it reaches a leaf. `in` on a dictionary checks its keys.
- **`node = node["yes"] if … else node["no"]`**: step down one level by replacing `node` with the branch the answer points to. Going *down* a tree needs no recursion: there's only one path to follow.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tree.py -k predict" label="predict follows the answers to a leaf, and matches scikit-learn's trees to depth 3"
```

## Reading the tree

A tree's great strength is that you can read it. Turn it into lines of `if`/`else`, recursively again, indenting four spaces per level:

```python file=tree.py
import numpy as np


def gini(y: np.ndarray) -> float:
    """How mixed a group is: 0 when all one class, 0.5 when an even mix of two."""
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(1 - p ** 2 - (1 - p) ** 2)


def best_threshold(values: np.ndarray, y: np.ndarray) -> tuple[float | None, float]:
    """The threshold on one feature whose split leaves the lowest weighted impurity."""
    best_threshold, best_impurity = None, gini(y)
    distinct = np.unique(values)
    for threshold in (distinct[:-1] + distinct[1:]) / 2:
        left = values <= threshold
        impurity = float(left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
        if impurity < best_impurity:
            best_threshold, best_impurity = float(threshold), impurity
    return best_threshold, best_impurity


def best_split(X: np.ndarray, y: np.ndarray) -> tuple[int | None, float | None, float]:
    """(feature, threshold, impurity) of the best single question to ask."""
    best = (None, None, gini(y))
    for feature in range(X.shape[1]):
        threshold, impurity = best_threshold(X[:, feature], y)
        if impurity < best[2]:
            best = (feature, threshold, impurity)
    return best


def grow(X: np.ndarray, y: np.ndarray, max_depth: int, depth: int = 0) -> dict:
    """A decision tree, as nested dictionaries: a question with a yes and a no branch, or a leaf."""
    feature, threshold, _ = best_split(X, y) if depth < max_depth else (None, None, None)
    if feature is None:
        return {"defect_rate": float(np.mean(y)), "runs": len(y)}
    yes = X[:, feature] <= threshold
    return {
        "feature": feature,
        "threshold": threshold,
        "yes": grow(X[yes], y[yes], max_depth, depth + 1),
        "no": grow(X[~yes], y[~yes], max_depth, depth + 1),
    }


def predict_one(node: dict, x: np.ndarray) -> int:
    while "feature" in node:
        node = node["yes"] if x[node["feature"]] <= node["threshold"] else node["no"]
    return int(node["defect_rate"] > 0.5)


def predict(node: dict, X: np.ndarray) -> np.ndarray:
    return np.array([predict_one(node, x) for x in X])


def rules(node: dict, names: list[str], indent: str = "") -> list[str]:
    """The tree as lines of if/else, the way you'd write it in Python."""
    if "feature" not in node:
        return [f"{indent}defect rate {node['defect_rate']:.2f} ({node['runs']} runs)"]
    question = f"{names[node['feature']]} <= {node['threshold']:g}"
    return ([f"{indent}if {question}:"] + rules(node["yes"], names, indent + "    ")
            + [f"{indent}else:"] + rules(node["no"], names, indent + "    "))
```

The base case is a leaf, one line. Otherwise it's the question, then the yes branch's lines indented one level more, then `else:`, then the no branch's. Lists joined with `+` put the lines in order.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tree.py" label="rules prints the tree as if/else lines"
```

Look at the depth-3 tree at the Python prompt:

```text
>>> import parts, tree
>>> X_train, X_test, y_train, y_test = parts.split(*parts.load("data/parts.csv"))
>>> print("\n".join(tree.rules(tree.grow(X_train, y_train, max_depth=3), parts.FEATURES)))
if temperature <= 235.85:
    if cooling <= 11.95:
        if cooling <= 10.45:
            defect rate 0.49 (37 runs)
        else:
            defect rate 0.84 (19 runs)
    else:
        if pressure <= 675:
            defect rate 0.63 (19 runs)
        else:
            defect rate 0.13 (228 runs)
else:
    if cooling <= 14.1:
        if pressure <= 696:
            defect rate 0.50 (2 runs)
        else:
            defect rate 1.00 (26 runs)
    else:
        if cooling <= 15.15:
            defect rate 0.00 (2 runs)
        else:
            defect rate 0.83 (42 runs)
```

**`"\n".join(lines)`** glues the list of lines into one string with a newline between each.

Read the top-left path first: temperature normal, cooling over 11.95 s, pressure over 675 bar. That's every hidden rule on the right side of its limit, and 228 runs end there with a defect rate of 13%. That's the **process window**, found from the data.

Now look at the bottom. Two leaves hold **2 runs each**. "Hot, cooling 14.1–15.15 s: defect rate 0.00" is a conclusion drawn from two runs, and cooling *longer* than 15.15 s leading to more defects contradicts the physics. Those questions fit the noise in two runs, not the process.

```predict
question: With no depth limit, every leaf ends up pure (a defect rate of exactly 0 or 1). What will the training accuracy be, and what happens on new runs?
choice: Training accuracy 100%, and new runs do worse than with a shallower tree
choice: Training accuracy 100%, and new runs do best of all
choice: Training accuracy stays around 80%
answer: Training accuracy 100%, and new runs do worse than with a shallower tree
explain: A tree that keeps splitting until every leaf is pure can isolate every single training run, noise included: 100% on training data, as degree 10 was in lesson 7.1. On new runs it does worse than at depth 5, because many of its deep questions were answering noise. Depth is this model's flexibility dial.
```

## How deep?

Create `depth.py` to measure training and validation accuracy at each depth, with lesson 9.1's repeated cross-validation. `cross_validate(…, return_train_score=True)` is `cross_val_score`'s bigger sibling: it also reports the score on each fold's *training* runs.

```python file=depth.py
from sklearn.model_selection import RepeatedKFold, cross_validate
from sklearn.tree import DecisionTreeClassifier

import parts

X, y = parts.load("data/parts.csv")
folds = RepeatedKFold(n_splits=5, n_repeats=10, random_state=0)

print("max depth   training   validation")
for depth in [1, 2, 3, 5, 8, None]:
    scores = cross_validate(DecisionTreeClassifier(max_depth=depth, random_state=0), X, y, cv=folds, return_train_score=True)
    print(f"{str(depth):>9} {scores['train_score'].mean():>10.3f} {scores['test_score'].mean():>12.3f}")

scores = cross_validate(DecisionTreeClassifier(min_samples_leaf=10, random_state=0), X, y, cv=folds, return_train_score=True)
print(f"no limit, but at least 10 runs per leaf: {scores['train_score'].mean():.3f} {scores['test_score'].mean():.3f}")
```

`max_depth=None` means no limit. **`random_state=0`**: scikit-learn tries the features in a shuffled order and breaks ties by whichever came first, so fixing the seed makes the result repeatable.

```powershell
.venv\Scripts\python depth.py
```

```text
max depth   training   validation
        1      0.776        0.772
        2      0.809        0.797
        3      0.832        0.791
        5      0.892        0.815
        8      0.960        0.785
     None      1.000        0.766
no limit, but at least 10 runs per leaf: 0.871 0.793
```

Lesson 7.1's picture again, for a completely different model: training accuracy climbs all the way to 100%, validation peaks (at depth 5 here, 81.5%) and then falls. The unlimited tree is worse on new runs than a tree with a single question about temperature.

**`min_samples_leaf=10`** is another way to limit the tree: grow as deep as you like, but never make a leaf from fewer than 10 runs. That rules out exactly the two-run conclusions above, and does nearly as well as the best depth without having to choose one. Limits like these are **pruning**: the tree's version of regularisation.

```check
run ".venv/Scripts/python depth.py" stdout="     None      1.000        0.766" label="depth.py shows training accuracy rising to 100% while validation peaks and falls"
```

A tree is readable, needs no scaling (a question about pressure doesn't care whether it's in bar or MPa), and handles combinations like "hot *and* short cooling" naturally. Its weakness is the one you just measured: it's **unstable**. Change a few training runs and the questions near the bottom change completely. The next lesson turns that weakness into a strength.
