import json
import os

from build_common import blocks, fence, join, read, write_answer, write_lesson

M = json.load(open(os.path.join(os.path.dirname(__file__), "measured.json"), encoding="utf8"))
b = blocks(read("experiment.py"))
tests = read("tests/test_experiment.py")
v_summary = join(b["header"], b["VARIANTS"], b["summarise"])
v_results = join(b["header"], b["VARIANTS"], b["summarise"], b["save_csv"], b["plot"])
v_full = join(b["header"], b["VARIANTS"], b["summarise"], b["save_csv"], b["plot"], b["run"], b["run_experiment"], b["main"])
assert v_full == read("experiment.py"), "blocks must rebuild the file exactly"
write_answer("experiment_summary.py", v_summary)
requirements = "numpy==2.5.3\npygame-ce==2.5.8\ngymnasium==1.3.0\npytest==9.1.1\ntorch==2.14.1\nkeras==3.15.1\nmatplotlib==3.11.2"

lesson = f'''
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

{fence("tests/test_experiment.py", tests, provided=True)}

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

{fence("requirements.txt", requirements)}

```powershell
.venv\\Scripts\\python -m pip install -r requirements.txt
```

It brings a few helper packages of its own, for fonts and image files.

```check
run ".venv/Scripts/python -c \\"import matplotlib; assert matplotlib.__version__ == '3.11.2', matplotlib.__version__\\"" label="matplotlib 3.11.2 imports in the project's Python" -- Add matplotlib==3.11.2 to requirements.txt and run .venv\\Scripts\\python -m pip install -r requirements.txt.
```

## Your turn: the mean and its error bar

**Build, on your own:** `summarise(results, variant)` in a new file, `experiment.py`.

`results` is a list of dictionaries, one per run, like the test's `FAKE`: `{{"variant": "A2C", "seed": 0, "curve": [(100, 10.0), (200, 20.0)], "greedy": 500.0}}`. For one `variant`, return three things:

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
{v_summary}
~~~
`next(...)` takes the first item from a generator: the first run of this variant, whose curve gives the step numbers.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k summary" label="summarise gives each checkpoint's mean over seeds and its standard error" -- curves = np.array([[length for _, length in r["curve"]] for r in results if r["variant"] == variant]); mean = curves.mean(axis=0); error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves)).
```

## Results you can keep

Add `save_csv` and `plot`:

{fence("experiment.py", v_results)}

- **`save_csv`** writes a **CSV** file (comma-separated values): plain text, one row per line, which Excel, Google Sheets and every statistics tool can open. `csv.writer` handles the commas and quoting; `newline=""` stops Windows adding a blank line between rows.
- **`plot`**: `plt.subplots(figsize=(7, 4))` makes a figure (`fig`) 7 by 4 inches with one set of axes (`ax`). For each variant, `ax.plot` draws the mean curve and `ax.fill_between` shades from mean − error to mean + error, a **band of ± one standard error**; `alpha=0.25` makes it see-through so overlapping bands stay readable. `dict.fromkeys(...)` lists each variant once, in the order they first appear. Axis labels, a title and a legend are what make a figure usable in a paper. `savefig(path, dpi=150)` writes the PNG at 150 dots per inch, sharp enough to print; `plt.close(fig)` frees its memory.

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k csv" label="save_csv writes one row per run"
run ".venv/Scripts/python -m pytest -q tests/test_experiment.py -k plot" label="plot saves the mean curves with error bands as a PNG"
```

## Running it

Make `experiment.py` this:

{fence("experiment.py", v_full)}

- **`run(job)`** is one training run, given as a tuple so a pool can hand it out. It sets one thread first (lesson 4.5), because it runs in its own process.
- **`run_experiment`** makes every (variant, seed) pair a job and gives them to **`Pool`**, a fixed number of worker processes that take jobs from a queue until none are left. `pool.map(run, jobs)` returns the results in the same order as the jobs. `min(workers, 2)` caps it at 2, whatever you ask for. `get_context("spawn")` is lesson 4.5's fresh-start method.
- **The main block** runs it, saves both files, and prints each variant's final greedy score as mean ± standard error.

Run it with `.venv\\Scripts\\python experiment.py`. It runs 15 trainings, two at a time, so it takes a few minutes: {M["experiment_seconds"]} seconds on the machine this series was written on. Predict first:

```predict
question: Which variant will finish with the lowest greedy score?
choice: A2C
choice: no entropy bonus
choice: 1-step returns
answer: {M["experiment_lowest"]}
explain: {M["experiment_explain"]}
```

```text
{M["experiment_output"]}
```

Open `results.png` from the file tree, and `results.csv`.

{M["experiment_discussion"]}

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
'''
write_lesson("04-07-an-experiment-you-can-write-up.md", lesson)
print("ok")
