---
title: 4.4 — Testing Your Own Environment
track: Reinforcement Learning in pygame
runtime: python
run: mutants.py
console: true
reference: optional
support: mutants/edges_wrap.py, mutants/holes_do_not_end.py, mutants/reset_keeps_steps.py, mutants/slip_ignored.py, mutants/timeout_beats_goal.py, mutants/walls_ignored.py
---

Every agent from here on learns from `grid.py`. If the environment has a bug, the agent will learn the bug perfectly, and nothing will look wrong: the numbers come out, the arrows point somewhere, the learning curve goes up. An environment bug is the most expensive kind in reinforcement learning, because everything downstream trusts it.

So far you've been handed test files. In this lesson you write your own, for `grid.py`, and then find out whether they're any good. That second part is the important one. A test file that passes tells you almost nothing by itself: a file of `assert True` passes too. Tests are only worth something if they **fail when the code is wrong**.

To measure that, you'll use **mutation testing**: take the real code, plant one bug (a **mutant**), and run your tests on it. If a test fails, your tests **caught** the mutant. If they all still pass, the mutant **survived**, which means a real bug of that kind could slip past you too. Six mutants are waiting.

This matters well beyond this series. When an assistant or a colleague hands you code *with* tests, "the tests pass" is not evidence until you know the tests can fail. Mutation testing is how you find out.

## A passing test isn't enough

Here is a test file that looks reasonable. It checks the goal, the start and the hole, and all three tests pass on your `grid.py`:

```python
from grid import GridWorld


def test_reaching_the_goal():
    env = GridWorld(["S.G"])
    env.reset()
    env.step(3)
    _, reward, terminated, truncated, _ = env.step(3)
    assert reward == 1.0 and terminated and not truncated


def test_starts_at_s():
    env = GridWorld(["S.G"])
    assert env.reset()[0] == 0


def test_hole_costs_one():
    env = GridWorld(["SH"])
    env.reset()
    assert env.step(3)[1] == -1.0
```

The six mutants each break one thing: walls stop nothing; the edges wrap around; holes don't end the episode; reaching the goal on the last step also counts as a time-out; `reset` forgets to zero the step counter; the floor never slips.

```predict
question: How many of the six mutants will this test file catch?
choice: All six: it checks the goal, the start and the hole
choice: Two or three
choice: None of them
answer: None of them
explain: None. Each test checks something the mutants don't break. There are no walls in these maps, nobody walks off an edge, and nothing runs out of time or slips. Even `test_hole_costs_one` misses the "holes don't end the episode" mutant: it checks the reward, −1, but never checks `terminated`. Three passing tests, zero protection. **Tests protect only the behaviour they actually check.**
```

## The mutants

**This step: create the supplied files and read them. No code yet.**

Click **Create provided mutants.py** above. It also creates the `mutants` folder with the six broken copies of `grid.py`. Each starts with a comment saying what's broken. Read `mutants/edges_wrap.py` and find the changed lines in `next_cell`: compare it with your `grid.py`.

`mutants.py` runs the experiment:

```python file=mutants.py provided
"""Mutation testing for grid.py: do your tests catch planted bugs?

Each file in mutants/ is grid.py with one deliberate bug. For each one, this copies the
project into a temporary folder, swaps in the mutant as grid.py, and runs your tests there.
A mutant is "caught" when at least one of your tests fails on it.
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT = Path(__file__).parent
TESTS = "tests/test_my_grid.py"


def tests_pass(folder):
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", TESTS],
        cwd=folder, capture_output=True, text=True,
    )
    return result.returncode == 0


def copy_project(folder):
    for path in PROJECT.glob("*.py"):
        shutil.copy(path, folder / path.name)
    (folder / "tests").mkdir()
    for name in ("conftest.py", "test_my_grid.py"):
        shutil.copy(PROJECT / "tests" / name, folder / "tests" / name)


def main():
    if not tests_pass(PROJECT):
        print(f"{TESTS} fails on the real grid.py. Make it pass first.")
        return 1
    missed = []
    mutants = sorted((PROJECT / "mutants").glob("*.py"))
    for mutant in mutants:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            copy_project(folder)
            shutil.copy(mutant, folder / "grid.py")
            caught = not tests_pass(folder)
        print(f"{'caught' if caught else 'MISSED'}  {mutant.stem}")
        if not caught:
            missed.append(mutant.stem)
    print(f"{len(mutants) - len(missed)} of {len(mutants)} mutants caught")
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
```

How it works:

- **`tests_pass(folder)`** runs pytest in another folder with `subprocess.run` (lesson 0.2). `sys.executable` is the path of the Python running this script, your `.venv` one, so pytest runs in the same environment. `cwd=folder` makes that folder the current directory, so `import grid` finds the copy there. Lesson 0.2: `python -m pytest` puts the current folder first on the import path. `-p no:cacheprovider` stops pytest writing `.pytest_cache` into the temporary folder. The exit code says it all: 0 means every test passed.
- **`copy_project(folder)`** copies every `.py` file from the project's top level (`PROJECT.glob("*.py")`), plus your test file and `conftest.py`. `Path(__file__).parent` is the folder this script lives in, so it works wherever the project is.
- **`main`** first runs your tests on the **real** `grid.py`. Tests that fail on correct code are broken, and their results on mutants would mean nothing. Then, for each mutant, it builds a fresh project copy in a temporary folder, swaps the mutant in as `grid.py`, and runs your tests there. `tempfile.TemporaryDirectory()` makes an empty folder, and the `with` deletes it, and everything in it, when the block ends. Your real project is never touched.
- **`sys.exit(main())`** makes the script's exit code 1 if any mutant survived. That's how the check below knows.

```check
file mutants.py -- Click "Create provided mutants.py" above.
file mutants/walls_ignored.py
```

## Write your own tests

**This step: write `tests/test_my_grid.py` yourself.** One possible version is under *Full reference file (optional)* above. Try not to open it until you've run the mutants against your own.

Test the **contract** from lesson 4.1, the behaviour other code relies on, and not the details of how it's written. A list to work from:

- walls and edges stop movement, and you stay where you were;
- the goal ends the episode with +1 and the hole with −1: check `terminated` as well as the reward;
- time runs out after exactly `max_steps` steps, and not on a step that reaches the goal;
- `reset` starts a genuinely fresh episode, with the start state and a full time allowance;
- the floor slips sideways at the rate it's told to.

Techniques that make this practical:

- **Build a small world for the tests.** A 3 × 3 map with a wall, a hole and a goal where you want them makes every case easy to set up. Test maps don't have to look like real ones.
- **Put the agent where the test needs it.** `env.cell = (2, 1)` places it next to the goal directly, instead of walking there, so each test sets up exactly one situation.
- **Arrange, act, assert.** Set the situation up, take one step, then check the result. Check **every part** of the result that matters: the reward, `terminated` *and* `truncated`.
- **Test randomness statistically, with a seed.** `reset(seed=0)` makes the run repeatable. For a slip rate of 0.4, count over thousands of steps, and allow a margin of a few standard errors (lesson 2.2): over 3000 steps the standard error is √(0.4 × 0.6 / 3000) ≈ 0.009, so ±0.04 is more than four of them.
- **Give tests names that say what must be true**, such as `test_walls_block_movement`. When a test fails, its name is the first thing you read.

Write at least six tests, and make them pass on your `grid.py`:

```python file=tests/test_my_grid.py
import numpy as np

from grid import GridWorld

WORLD = ["S.#",
         "...",
         "H.G"]


def make(**options):
    env = GridWorld(WORLD, **options)
    env.reset(seed=0)
    return env


def test_walls_block_movement():
    env = make()
    state, *_ = env.step(3)
    state, *_ = env.step(3)          # (0, 2) is a wall
    assert env.cell == (0, 1)


def test_edges_block_movement():
    env = make()
    env.step(0)                      # up from the top row
    assert env.cell == (0, 0)
    env.step(2)                      # left from the left column
    assert env.cell == (0, 0)


def test_goal_ends_with_plus_one():
    env = make()
    env.cell = (2, 1)
    _, reward, terminated, truncated, _ = env.step(3)
    assert (reward, terminated, truncated) == (1.0, True, False)


def test_hole_ends_with_minus_one():
    env = make()
    env.cell = (1, 0)
    _, reward, terminated, _, _ = env.step(1)
    assert reward == -1.0 and terminated


def test_goal_on_the_last_step_is_not_a_time_out():
    env = make(max_steps=1)
    env.cell = (2, 1)
    _, _, terminated, truncated, _ = env.step(3)
    assert terminated and not truncated


def test_time_runs_out_after_max_steps():
    env = make(max_steps=2)
    assert env.step(0)[3] is False
    assert env.step(0)[3] is True


def test_reset_starts_a_fresh_episode():
    env = make(max_steps=3)
    env.step(1)
    env.step(1)
    state, _ = env.reset()
    assert state == 0 and env.steps == 0
    assert env.step(0)[3] is False, "a new episode gets its full time again"


def test_slip_slides_sideways_at_the_right_rate():
    env = make(slip=0.4)
    slid = []
    for _ in range(3000):
        env.cell = (1, 1)
        env.steps = 0
        slid.append(env.step(3)[4]["slid"])
    assert abs(np.mean(slid) - 0.4) < 0.04
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_my_grid.py" label="your tests pass on the real grid.py" -- A test that fails on correct code is itself wrong: read pytest's message, and check what the test expects against what lesson 4.1's contract says.
run ".venv/Scripts/python -c \"import importlib.util as u; s = u.spec_from_file_location('t', 'tests/test_my_grid.py'); m = u.module_from_spec(s); s.loader.exec_module(m); n = sum(name.startswith('test_') for name in dir(m)); assert n >= 6, n\"" label="tests/test_my_grid.py has at least six tests" -- Each behaviour in the list deserves its own test function, named after what must be true.
```

## Hunt the mutants

Now run them: press **Run mutants.py** above the editor.

```predict
question: Before you run it: which mutant do you expect your tests are most likely to miss, and why?
explain: The ones people miss most often are the quiet ones. **slip_ignored** is invisible to any test that uses no slip, or that only checks one step. **timeout_beats_goal** needs a goal reached on exactly the last step, a case nobody meets by accident. **reset_keeps_steps** only shows if you run an episode, reset, and then check the time allowance. A mutant that survives tells you precisely which behaviour is unguarded.
```

For each `MISSED` mutant, open its file, read the comment on its first line, and write a test that this mutant would fail and the real `grid.py` passes. Run `mutants.py` again, until every mutant is caught:

```text
caught  edges_wrap
caught  holes_do_not_end
caught  reset_keeps_steps
caught  slip_ignored
caught  timeout_beats_goal
caught  walls_ignored
6 of 6 mutants caught
```

**What mutation testing can and can't tell you.** Catching all six means your tests guard these six behaviours. It doesn't prove `grid.py` correct: a bug of a kind nobody planted could still hide. Real mutation-testing tools, such as **mutmut** for Python, make hundreds of small mutants automatically: flipping `<` to `<=`, deleting lines, changing constants. They report the share caught, the **mutation score**. Coverage tools, which report which lines your tests *run*, can't tell you this, because running a line isn't the same as checking what it does.

You'll keep these tests. Lesson 6.3 changes `grid.py` to add cliffs, and `tests/test_my_grid.py` will tell you straight away if that change broke anything that already worked. That's a **regression**, and catching regressions is what a test suite earns its keep doing.

```check
run ".venv/Scripts/python mutants.py" label="your tests catch all 6 mutants" timeout=180 -- mutants.py lists each MISSED mutant: read the first line of its file in mutants/ and write a test for exactly that behaviour.
```
