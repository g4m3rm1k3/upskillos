# Lesson 27 — Virtual Environments: Why "It Works On My Machine" Happens

## Why now
This project now depends on `numpy`, `pandas`, and `scikit-learn` — none of them part of core Python. If a second project on the same machine needed a different, incompatible version of one of them, what happens? This lesson is the real, mechanical answer — not "just use venv," but what a venv actually *is*.

## What you'll learn
- What `python3 -m venv` actually creates, and proof of what changes as a result
- Real, measured isolation: a package installed in one environment is invisible to another
- What `pip freeze` and `requirements.txt` actually solve, and what they don't
- Why "it works on my machine" is usually a real, specific, traceable cause — not bad luck

## The question
If you `pip install` a package normally, it goes somewhere on your system, available to every Python program you run from then on. What happens when two different projects need two different, incompatible versions of that same package?

## 1. Predict
`python3 -m venv myenv` creates a new folder. Before running anything: do you think it contains a full separate copy of the Python interpreter and every built-in library, or something smaller and cleverer?

## 2. Try it
```bash
python3 -m venv myenv
./myenv/bin/python3 -c "import sys; print('\n'.join(sys.path))"
```
Compare to the *system* Python's `sys.path`:
```bash
python3 -c "import sys; print('\n'.join(sys.path))"
```
Real output — venv's Python:
```
/usr/lib/python312.zip
/usr/lib/python3.12
/usr/lib/python3.12/lib-dynload
/home/claude/venv_demo/myenv/lib/python3.12/site-packages
```
System Python:
```
/usr/lib/python312.zip
/usr/lib/python3.12
/usr/lib/python3.12/lib-dynload
/usr/local/lib/python3.12/dist-packages
/usr/lib/python3/dist-packages
```

### What this code does
- `sys.path` — this is the actual list of directories Python searches, in order, whenever you run `import something`. This is the real mechanism `import` uses under the hood — not magic, a literal list of folders checked one by one until a matching module is found.
- Both versions share the first three entries — the standard library itself lives in one place, shared, since there's no reason to duplicate Python's built-in modules per environment.
- The **last** entry is where they diverge: the venv's Python looks in `myenv/lib/python3.12/site-packages` — a folder inside the venv itself — while the system Python looks in the shared, machine-wide `dist-packages` locations.

### What happens
This confirms the prediction directly: `python3 -m venv myenv` did **not** copy the entire interpreter or standard library — it created a small directory structure (mainly a `bin/python3` that's really a reference to your system Python, plus an empty `site-packages` folder) and configured that Python to look in its *own* `site-packages` for anything you install, instead of the shared system one. This is the entire mechanism — nothing more exotic than "a different search path."

## 3. Real, measured isolation
```bash
./myenv/bin/pip install cowsay --quiet
./myenv/bin/python3 -c "import cowsay; print('works in venv')"
python3 -c "import cowsay"
```
Real output:
```
works in venv
Traceback (most recent call last):
  File "<string>", line 1, in <module>
ModuleNotFoundError: No module named 'cowsay'
```
`cowsay` installed *only into the venv's `site-packages`* — genuinely invisible to the system Python, which never checks that folder at all (recall its `sys.path` didn't include the venv's `site-packages` directory). This is the direct, real proof of isolation: not a policy or a convention, a structural consequence of the two Pythons having different search paths.

### Why this solves the two-incompatible-versions problem
If project A needs `numpy==1.24` and project B needs `numpy==2.1`, each with its own venv, `pip install numpy==1.24` in venv A and `pip install numpy==2.1` in venv B land in two completely separate `site-packages` folders — neither installation is aware the other exists, and there's no actual conflict, because there was never a single shared location both were competing to control.

## 4. Recording what a project actually needs
```bash
./myenv/bin/pip install requests
./myenv/bin/pip freeze
```
Real output:
```
certifi==2026.7.22
charset-normalizer==3.5.1
cowsay==6.1
idna==3.19
requests==2.34.2
urllib3==2.7.0
```

### What this code does
- `pip freeze` — lists every package currently installed in *this specific* environment, each with the **exact** version installed — not "requests, some recent version," but `requests==2.34.2`, precisely.
- Notice `certifi`, `charset-normalizer`, `idna`, and `urllib3` are all listed too, despite never being installed directly — these are `requests`'s own dependencies, pulled in automatically when `requests` was installed, and `pip freeze` reports the complete real picture: everything actually present, not just what you explicitly typed.
```bash
./myenv/bin/pip freeze > requirements.txt
```
Saving this output to a file creates a complete, exact record — anyone (or any future you, on a different machine) can recreate this *exact* environment with `pip install -r requirements.txt`, getting identical versions of everything, not just "whatever's currently newest."

## 5. Trap
**Normal rule:** `pip install package_name` (no version specified) gets you a working setup, and `requirements.txt` exists to record what you installed.
**Apparently equivalent code:** writing `requirements.txt` by hand with unpinned names (`requests`, `pandas`, `scikit-learn` — no version numbers), reasoning "this is simpler, and pip will just get compatible versions."
**Surprising result:** months later, running `pip install -r requirements.txt` on a fresh machine pulls whatever the *current latest* versions of those packages happen to be at that moment — which may have introduced breaking changes since you originally wrote the code. The exact bug you're now chasing might not reproduce for you locally at all, because your own machine still has the old, working versions installed from months ago — this is the literal mechanism behind "works on my machine."
**Exact reason:** an unpinned `requirements.txt` entry (`requests` with no `==version`) records *what package you need*, not *what version you tested against* — it silently allows the actual installed version to drift over time and across machines, even though the file itself never changes.
**Project consequence:** always pin exact versions in a `requirements.txt` meant for reproducibility (`pip freeze`'s output format, `package==exact.version`, is the safe default) — not because pinning is always strictly necessary, but because the failure mode of *not* pinning is specifically "this breaks somewhere else, later, for reasons that are genuinely hard to trace back to a version mismatch" unless you know to suspect it.

## Exercise
- **Predict:** If you `pip install cowsay` in the system Python directly (not the venv) after this lesson's steps, does the venv's Python gain access to it too, or does isolation work in both directions equally?
- **Modify:** Create a second venv (`python3 -m venv myenv2`), and install a *different* version of `requests` in it (e.g. `pip install requests==2.28.0`). Confirm both venvs report different versions via `pip freeze`, with neither affecting the other.
- **Break:** Manually edit `requirements.txt` to remove version numbers, entirely by hand, then create a brand-new third venv and `pip install -r requirements.txt` into it. Compare the resulting `pip freeze` output to the original — are the versions identical, and if not, is that surprising given what this lesson covered?
- **Repair:** Restore exact version pins in `requirements.txt`, and explain in one sentence why the un-pinned version in the previous exercise did or didn't actually produce different results — timing matters here (installing moments later versus months later).
- **Trace:** Using `sys.path` from step 2, explain in your own words why installing a package via the venv's `pip` (`./myenv/bin/pip`) rather than the system `pip` is what actually determines *which* `site-packages` folder the package lands in — connect it back to how `import` searches that list in order.

## What to remember
- A virtual environment is a separate `site-packages` directory plus a `sys.path` pointed at it — not a full separate Python installation.
- Isolation between environments is a real, structural consequence of different search paths, not a convention you have to trust.
- `pip freeze` records exact installed versions, including indirect dependencies you never explicitly requested.
- Unpinned dependencies allow silent version drift over time — pin exact versions in `requirements.txt` for anything meant to be reproducible later or elsewhere.

## Next lesson
This closes out the practical project-hygiene arc that started with git — a project can now be version-controlled, properly structured into a package, and reproducibly installed elsewhere. From here, genuinely open: recursion (a core CS topic that hasn't been directly covered yet, despite JSON's recursive structure having been touched on back in Lesson 4), or continuing deeper into ML with a topic like cross-validation (a more rigorous version of Lesson 14's single train/test split). Your call.
