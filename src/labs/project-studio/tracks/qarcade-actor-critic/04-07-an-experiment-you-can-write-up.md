---
title: 4.7 — An Experiment You Can Write Up
runtime: python
run: experiment.py
---

### The story so far

`train_a2c` (`a2c.py`, lesson 4.4) trains A2C on CartPole and returns the network and a learning **curve**: a list of (steps, greedy score) pairs, one every 20,000 steps. Its settings are all inputs: `n_steps`, `entropy_coef`, `rate` and the rest. `play_greedy` gives the final score over 20 new games. Lesson 2.5 showed how to judge an agent honestly: several seeds, mean ± standard error. Lesson 4.2 used that to ask whether a difference was real or luck, and lesson 4.5 showed how to run 2 jobs at once without freezing the computer.

### What this lesson asks

Your paper is on A2C applied to CartPole. A paper's results section needs more than "it reached 500": it needs a **method** someone could repeat, results over several seeds with **error bars**, and evidence of what each part of the method contributes. An experiment that removes one part at a time to see what it was doing is called an **ablation**.

This lesson builds `experiment.py`, which runs A2C and two ablations over 5 seeds each, 2 runs at a time, and saves a table (`results.csv`) and a plot with error bars (`results.png`) that you can put in a paper. Then it shows how to write the method and results up.

| variant | what changes | the question it answers |
|---|---|---|
| A2C | nothing: lesson 4.4's settings | the baseline result |
| no entropy bonus | `entropy_coef=0.0` | does the bonus for staying unsure matter here? |
| 1-step returns | `n_steps=1` | does looking 5 steps ahead help, compared with trusting the critic after 1? |

### How the pieces fit

```text
run_experiment(seeds=5)      makes 15 jobs (3 variants x 5 seeds), runs them in a pool of 2 processes
  run(job)                   one job: train_a2c(seed, settings) quietly -> its curve and final greedy score
summarise(results, variant)  for one variant, at every checkpoint: the mean over seeds, and its standard error
save_csv(results)            one row per run: variant, seed, final greedy score     -> results.csv
plot(results)                each variant's mean curve, with a shaded band of ± one standard error -> results.png
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_experiment.py** above.

```python file=tests/test_experiment.py provided
# Tests for experiment.py (lesson 4.7).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_experiment.py
import csv

import numpy as np
from pytest import approx

FAKE = [
    {"variant": "A2C", "seed": 0, "curve": [(100, 10.0), (200, 20.0)], "greedy": 500.0},
    {"variant": "A2C", "seed": 1, "curve": [(100, 30.0), (200, 40.0)], "greedy": 300.0},
    {"variant": "other", "seed": 0, "curve": [(100, 5.0), (200, 5.0)], "greedy": 9.0},
]


def test_summary_is_the_mean_and_standard_error_at_each_point():
    from experiment import summarise
    steps, mean, error = summarise(FAKE, "A2C")
    assert list(steps) == [100, 200]
    assert list(mean) == approx([20.0, 30.0])
    assert list(error) == approx([10.0, 10.0]), "sd of 10 and 30 is 14.14; divided by the square root of 2 seeds"


def test_summary_of_one_seed_has_no_error_bar():
    from experiment import summarise
    _, mean, error = summarise(FAKE, "other")
    assert list(mean) == approx([5.0, 5.0]) and list(error) == approx([0.0, 0.0])


def test_csv_has_one_row_per_run(tmp_path):
    from experiment import save_csv
    path = tmp_path / "results.csv"
    save_csv(FAKE, path)
    with open(path, newline="") as f:
        rows = list(csv.reader(f))
    assert rows[0] == ["variant", "seed", "greedy_mean_length"] and len(rows) == 4
    assert rows[2] == ["A2C", "1", "300.0"]


def test_plot_is_saved_as_a_picture(tmp_path):
    from experiment import plot
    path = tmp_path / "results.png"
    plot(FAKE, path)
    assert path.exists() and path.read_bytes()[:4] == b"\x89PNG"


def test_runs_go_through_a_pool_of_two():
    from experiment import run_experiment
    results = run_experiment(seeds=2, total_steps=400, variants={"A2C": {}})
    assert sorted(r["seed"] for r in results) == [0, 1]
    assert all(set(r) == {"variant", "seed", "curve", "greedy"} for r in results)
    assert np.isfinite([r["greedy"] for r in results]).all()
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `summary` | the mean and standard error at each checkpoint match the hand-worked numbers, and one seed gives no error bar (rather than a crash) | error bars that are too small, the most common way results get overstated |
| `csv` | the table has a header and one row per run | a results file missing runs |
| `plot` | the plot is saved as a real PNG picture | a figure drawn in memory and never written to disk |
| `runs` | jobs go through the pool, with a different seed each, and come back complete | every job secretly using seed 0, so "5 seeds" is really one result five times |

`FAKE` is made-up results with numbers easy to check by hand, so `summarise`, `save_csv` and `plot` can be tested in a fraction of a second without training anything. `tmp_path` (from pytest) is a fresh empty folder for each test, so test files never land in your project.

```check
file tests/test_experiment.py -- Click "Create provided tests/test_experiment.py" above.
```

## Install matplotlib

**matplotlib** is Python's standard library for plots, and the one most papers' figures are made with. Add it to `requirements.txt`:

```text file=requirements.txt
numpy==2.5.3
pygame-ce==2.5.8
gymnasium==1.3.0
pytest==9.1.1
torch==2.14.1
keras==3.15.1
matplotlib==3.11.2
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

It brings a few helper packages of its own, for fonts and image files.

```check
run ".venv/Scripts/python -c \"import matplotlib; assert matplotlib.__version__ == '3.11.2', matplotlib.__version__\"" label="matplotlib 3.11.2 imports in the project's Python" -- Add matplotlib==3.11.2 to requirements.txt and run .venv\Scripts\python -m pip install -r requirements.txt.
```

## Your turn: the mean and its error bar

**Build, on your own:** `summarise(results, variant)` in a new file, `experiment.py`.

`results` is a list of dictionaries, one per run, like the test's `FAKE`: `{"variant": "A2C", "seed": 0, "curve": [(100, 10.0), (200, 20.0)], "greedy": 500.0}`. For one `variant`, return three things:

1. `steps`: the checkpoint step numbers, from any one of its runs (they're all the same): `[100, 200]`.
2. `mean`: at each checkpoint, the average score over that variant's seeds.
3. `error`: at each checkpoint, the **standard error**: the standard deviation over seeds (lesson 2.5's, dividing by n − 1) divided by √(number of seeds). With one seed there's no spread to measure, so return zeros.

Worked through for the test's two A2C runs:

```text
checkpoint 100:  scores 10 and 30   mean 20   sd √(((10-20)² + (30-20)²) / (2-1)) = √200 = 14.14   error 14.14 / √2 = 10
checkpoint 200:  scores 20 and 40   mean 30   sd 14.14                                                error 10
```

The neatest way is a 2D array, one row per seed and one column per checkpoint: `curves = np.array([[score for _, score in r["curve"]] for r in results if r["variant"] == variant])`. Then `curves.mean(axis=0)` averages down each column (over seeds), and `curves.std(axis=0, ddof=1)` gives each column's standard deviation with n − 1 (`ddof=1`, "delta degrees of freedom", is NumPy's switch for that).

The file's first lines, which the rest of the lesson needs: imports of `csv`, `multiprocessing as mp`, `time`, `matplotlib` (then `matplotlib.use("Agg")` before importing `matplotlib.pyplot as plt`: it draws straight to files, with no window), `numpy as np`, `torch`, and `play_greedy, train_a2c` from `a2c`; then the `VARIANTS` dictionary from the table above. The hint's answer shows them.

```hints
nudge: Pick out this variant's curves into a 2D array: rows are seeds, columns are checkpoints. Then average and spread down the columns.
concept: `curves = np.array([...])`, `steps = [s for s, _ in <any one run's curve>]`, `mean = curves.mean(axis=0)`, `error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves))` when there's more than one seed, else `np.zeros_like(mean)`.
answer: Create `experiment.py`:
~~~python
import csv
import multiprocessing as mp
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch

from a2c import play_greedy, train_a2c

VARIANTS = {
    "A2C": {},
    "no entropy bonus": {"entropy_coef": 0.0},
    "1-step returns": {"n_steps": 1},
}


def summarise(results, variant):
    curves = np.array([[length for _, length in r["curve"]] for r in results if r["variant"] == variant])
    steps = [s for s, _ in next(r["curve"] for r in results if r["variant"] == variant)]
    mean = curves.mean(axis=0)
    error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves)) if len(curves) > 1 else np.zeros_like(mean)
    return steps, mean, error
~~~
`next(...)` takes the first item from a generator: the first run of this variant, whose curve gives the step numbers.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k summary" label="summarise gives each checkpoint's mean over seeds and its standard error" -- curves = np.array([[length for _, length in r["curve"]] for r in results if r["variant"] == variant]); mean = curves.mean(axis=0); error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves)).
```

## Results you can keep

Add `save_csv` and `plot`:

```python file=experiment.py
import csv
import multiprocessing as mp
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch

from a2c import play_greedy, train_a2c

VARIANTS = {
    "A2C": {},
    "no entropy bonus": {"entropy_coef": 0.0},
    "1-step returns": {"n_steps": 1},
}


def summarise(results, variant):
    curves = np.array([[length for _, length in r["curve"]] for r in results if r["variant"] == variant])
    steps = [s for s, _ in next(r["curve"] for r in results if r["variant"] == variant)]
    mean = curves.mean(axis=0)
    error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves)) if len(curves) > 1 else np.zeros_like(mean)
    return steps, mean, error


def save_csv(results, path="results.csv"):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["variant", "seed", "greedy_mean_length"])
        for r in results:
            writer.writerow([r["variant"], r["seed"], r["greedy"]])


def plot(results, path="results.png"):
    fig, ax = plt.subplots(figsize=(7, 4))
    for variant in dict.fromkeys(r["variant"] for r in results):
        steps, mean, error = summarise(results, variant)
        ax.plot(steps, mean, label=variant)
        ax.fill_between(steps, mean - error, mean + error, alpha=0.25)
    ax.set_xlabel("environment steps")
    ax.set_ylabel("greedy score (5 fresh games)")
    ax.set_title("A2C on CartPole-v1: mean ± standard error over seeds")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
```

- **`save_csv`** writes a **CSV** file (comma-separated values): plain text, one row per line, which Excel, Google Sheets and every statistics tool can open. `csv.writer` handles the commas and quoting; `newline=""` stops Windows adding a blank line between rows.
- **`plot`**: `plt.subplots(figsize=(7, 4))` makes a figure (`fig`) 7 by 4 inches with one set of axes (`ax`). For each variant, `ax.plot` draws the mean curve and `ax.fill_between` shades from mean − error to mean + error, a **band of ± one standard error**; `alpha=0.25` makes it see-through so overlapping bands stay readable. `dict.fromkeys(...)` lists each variant once, in the order they first appear. Axis labels, a title and a legend are what make a figure usable in a paper. `savefig(path, dpi=150)` writes the PNG at 150 dots per inch, sharp enough to print; `plt.close(fig)` frees its memory.

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k csv" label="save_csv writes one row per run"
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k plot" label="plot saves the mean curves with error bands as a PNG"
```

## Running it

Make `experiment.py` this:

```python file=experiment.py
import csv
import multiprocessing as mp
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch

from a2c import play_greedy, train_a2c

VARIANTS = {
    "A2C": {},
    "no entropy bonus": {"entropy_coef": 0.0},
    "1-step returns": {"n_steps": 1},
}


def summarise(results, variant):
    curves = np.array([[length for _, length in r["curve"]] for r in results if r["variant"] == variant])
    steps = [s for s, _ in next(r["curve"] for r in results if r["variant"] == variant)]
    mean = curves.mean(axis=0)
    error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves)) if len(curves) > 1 else np.zeros_like(mean)
    return steps, mean, error


def save_csv(results, path="results.csv"):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["variant", "seed", "greedy_mean_length"])
        for r in results:
            writer.writerow([r["variant"], r["seed"], r["greedy"]])


def plot(results, path="results.png"):
    fig, ax = plt.subplots(figsize=(7, 4))
    for variant in dict.fromkeys(r["variant"] for r in results):
        steps, mean, error = summarise(results, variant)
        ax.plot(steps, mean, label=variant)
        ax.fill_between(steps, mean - error, mean + error, alpha=0.25)
    ax.set_xlabel("environment steps")
    ax.set_ylabel("greedy score (5 fresh games)")
    ax.set_title("A2C on CartPole-v1: mean ± standard error over seeds")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def run(job):
    name, settings, seed, total_steps = job
    torch.set_num_threads(1)
    net, curve = train_a2c(seed=seed, total_steps=total_steps, quiet=True, **settings)
    return {"variant": name, "seed": seed, "curve": curve, "greedy": float(play_greedy(net).mean())}


def run_experiment(seeds=5, total_steps=200_000, workers=2, variants=VARIANTS):
    jobs = [(name, settings, seed, total_steps) for name, settings in variants.items() for seed in range(seeds)]
    with mp.get_context("spawn").Pool(min(workers, 2)) as pool:
        return pool.map(run, jobs)


if __name__ == "__main__":
    start = time.perf_counter()
    results = run_experiment()
    save_csv(results)
    plot(results)
    for variant in VARIANTS:
        scores = [r["greedy"] for r in results if r["variant"] == variant]
        print(f"{variant:18} greedy score {np.mean(scores):6.1f} ± {np.std(scores, ddof=1) / np.sqrt(len(scores)):5.1f}  (seeds: {scores})")
    print(f"saved results.csv and results.png in {time.perf_counter() - start:.0f} s")
```

- **`run(job)`** is one training run, given as a tuple so a pool can hand it out. It sets one thread first (lesson 4.5), because it runs in its own process.
- **`run_experiment`** makes every (variant, seed) pair a job and gives them to **`Pool`**, a fixed number of worker processes that take jobs from a queue until none are left. `pool.map(run, jobs)` returns the results in the same order as the jobs. `min(workers, 2)` caps it at 2, whatever you ask for. `get_context("spawn")` is lesson 4.5's fresh-start method.
- **The main block** runs it, saves both files, and prints each variant's final greedy score as mean ± standard error.

Run it with `.venv\Scripts\python experiment.py`. It runs 15 trainings, two at a time, so it takes a few minutes: 253 seconds on the machine this series was written on. Predict first:

```predict
question: Which variant will finish with the lowest greedy score?
choice: A2C
choice: no entropy bonus
choice: 1-step returns
answer: 1-step returns
explain: 1-step returns: 439.9 ± 60.1, because one seed ended at 199. A2C and the version without the entropy bonus both scored 500 on all 5 seeds. The plot tells a fuller story than the final scores: see below.
```

```text
A2C                greedy score  500.0 ±   0.0  (seeds: [500.0, 500.0, 500.0, 500.0, 500.0])
no entropy bonus   greedy score  500.0 ±   0.0  (seeds: [500.0, 500.0, 500.0, 500.0, 500.0])
1-step returns     greedy score  439.9 ±  60.1  (seeds: [500.0, 500.0, 199.3, 500.0, 500.0])
saved results.csv and results.png in 253 s
```

Open `results.png` from the file tree, and `results.csv`.

What the plot shows, and how to read it honestly:

- **1-step returns learn fastest at first** (a mean of 500 by 80,000 steps, when the others are near 200), then become the **least stable**: they dip at 100,000 and 160,000 steps, and one seed is down to 199 at the end. Be careful what you conclude: with `n_steps=1` the agent makes an update every 8 steps instead of every 40, so it makes **5 times as many updates** for the same number of steps. "Faster per step" is partly "more updates". A fair write-up says so. Each update also trusts the critic after one real reward (lesson 4.4's loop: 99% estimate), so while the critic is wrong, its errors go straight into the targets.
- **Removing the entropy bonus changed nothing measurable here.** Both reach 500 on every seed, and their curves overlap within the error bands. That doesn't mean entropy is useless: CartPole has only two moves, and with this network and learning rate, the policy didn't collapse early on any of these 5 seeds (lesson 4.2's seed 5, with REINFORCE, did). Report it as measured: "no measurable effect on CartPole over 5 seeds". A null result like this is still a result.
- **The bands overlap a lot until about 120,000 steps.** Wide, overlapping bands mean 5 seeds can't separate the variants there. More seeds would narrow them (the standard error falls with √(number of seeds), lesson 2.5).

To try more: change `VARIANTS` (for example `"lr 0.0007": {"rate": 0.0007}`, or `"16-step returns": {"n_steps": 16}`) or `seeds=` in the main block. Every extra variant adds about a minute and a half with 2 workers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k runs" label="run_experiment hands every (variant, seed) job to a pool of 2 and collects the results"
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py" label="all lesson 4.7 tests pass"
```

### Writing it up

What follows is a checklist for turning this into a paper's method and results sections. The words should be yours; the numbers are the ones your own run printed.

**Method: enough for someone else to repeat it exactly.**

| what to state | for this experiment |
|---|---|
| environment | Gymnasium 1.3.0 `CartPole-v1`: reward 1 per step, episodes end when the pole passes 12° or the cart leaves the track, and are truncated at 500 steps |
| algorithm | A2C: synchronous advantage actor-critic (Mnih et al., 2016, is the asynchronous version, A3C) |
| network | 4 inputs → 64 tanh units (shared) → 2 policy logits and 1 value |
| loss | policy loss + 0.5 × value loss − 0.01 × entropy; gradients clipped to norm 0.5 |
| returns | 5-step bootstrapped returns, γ = 0.99; truncated episodes bootstrapped from the critic's value of the final observation |
| training | 8 parallel environments, Adam with learning rate 0.002, 200,000 environment steps |
| evaluation | greedy policy (most likely action), mean episode length over 20 episodes with seeds 1000 to 1019; during training, 5 episodes every 20,000 steps |
| repetitions | 5 random seeds (0 to 4) per variant; mean ± standard error |
| software | Python 3.13, PyTorch 2.14.1 (CPU), Gymnasium 1.3.0 |

**Results: numbers with their uncertainty.** A table of final scores, mean ± standard error and the number of seeds (from `results.csv`), and the learning-curve figure (`results.png`) with a caption that says what the band is ("shaded: ± one standard error over 5 seeds"). Report what you measured, including what didn't work.

**Discussion: what the ablations show, and the limits.** Say what each removed part was doing, using the curves. Be honest about the limits: 5 seeds, one environment, one set of settings, measured on one computer. A difference of one or two standard errors "suggests"; it doesn't "show" (lesson 4.2).

**Reading the articles.** As you read the articles for your paper, match each part they describe to the code you've written: the policy gradient and REINFORCE (lesson 4.1), the baseline (4.2), the critic, advantage and entropy (4.3), n-step returns and parallel environments (4.4), asynchronous workers (4.5). Standard sources, if you need them: Williams (1992), *Simple statistical gradient-following algorithms for connectionist reinforcement learning*, for REINFORCE; Mnih et al. (2016), *Asynchronous Methods for Deep Reinforcement Learning*, for A3C, and with it the advantage actor-critic loss; Sutton and Barto (2018), *Reinforcement Learning: An Introduction*, 2nd edition, chapter 13, for policy-gradient methods. Use your course's citation style.

### What you've learned in this chapter

- learning a **policy** directly: softmax probabilities, moves drawn by chance, and REINFORCE, with the gradient of log π checked against nudging;
- a **baseline**, proved not to change the average update, measured to cut the noise, and compared over 10 seeds;
- **actor-critic**: one network with an actor and a critic head, entropy as average surprise, the advantage as "better or worse than expected", and the A2C loss;
- **A2C**: n-step bootstrapped returns, truncation handled properly, 8 environments in step, gradient clipping: 500 on every seed measured, in about 25 seconds;
- **A3C**: worker processes, shared memory and gradient hand-over, slower than A2C on one computer, and why;
- running several processes **without freezing the computer**: one thread each, a cap on workers, how to check and how to stop;
- A2C with a **Keras** functional model and a hand-written training step;
- an **experiment you can write up**: ablations, seeds, standard errors, a results table and a figure.

Next chapter: QMaze, the second school problem, with a table first and then, in Chapter 6, with a network.
