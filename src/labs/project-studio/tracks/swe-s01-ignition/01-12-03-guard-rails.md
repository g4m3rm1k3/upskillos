---
title: "Guard Rails: What a Collaborator Can Reach, and What Needs a Yes"
runtime: python
---

Kit's agent from 01-11-03 can count, filter and list files. That's harmless, and it was still enough to walk out of `kit` when an injected log told it to. Now picture a collaborator who can delete files, push to a shared repository, read the credentials in a configuration file, or run a migration on a real database. It might be a new teammate, a script, or an AI agent, working for hours without you watching. Most of the time it does what you meant. When it doesn't, through a misunderstanding, an injection, or a plain mistake, what stops the damage is never its good intentions. It's what you set up beforehand. This last lesson of stage 1 gathers those guard rails: limit what can be reached, ask a person before anything that can't be undone, keep secrets and real data out of reach, and check a change before it reaches anyone else. Kit's agent gets an approval gate, and Kit gets a hook that checks every push.

**By the end you can:**

- Apply least privilege to a collaborator, and list what yours can reach.
- Tell reversible actions from irreversible ones, and require a person's approval for the second kind.
- Keep secrets out of a repository and out of a collaborator's reach, and use made-up data instead of real data.
- Check a change before it leaves your machine, and say what does the real checking once it has.

**You need:** 01-06-06 (least privilege, destructive commands), 01-08 (Git, hooks, secrets in history), 01-11-02 and 01-11-03 (injection, the agent). Commands run inside `kit`.

## What it can reach

The first guard rail is **least privilege** (01-06-06): a collaborator gets the access its task needs, and no more. What it can't reach, it can't damage, whatever it's told and whatever it gets wrong. Look at what Kit already has, gathered from stage 1:

| Guard rail | Where | What it stops |
|---|---|---|
| An allow-list of tools | `lm/agent.py`'s `TOOLS` (01-11-03) | Asking to `delete` gets "refused: no tool called delete" |
| Arguments kept inside `kit` | `safe` (01-11-03) | `tree ..` from an injected instruction |
| A step limit | `MAX_STEPS` | An agent that never stops calling tools |
| Tests and Ruff before every commit | `hooks/pre-commit` (01-08-04) | A commit that breaks a check |
| No private keys in commits | `hooks/no_secrets.py` (01-08-04) | A key file staged by accident |
| Files that are never committed | `.gitignore` (01-08-01) | `.venv`, `big.txt`, `notes/demo_key` |

Every row is in the program around the collaborator, and none relies on the collaborator behaving. That's the pattern for all of them: **decide in code what can happen**, so that an instruction, from anyone, can only choose among the things you allowed. Check that the agent still refuses to leave `kit`:

```
.venv/bin/python lm/agent.py injected
```

(On Windows, `.venv/Scripts/python`.) Step 2 says `refused: arguments must stay inside kit`.

```check
run "cd kit; .venv/Scripts/python lm/agent.py injected" stdout="refused: arguments must stay inside kit" -- The agent's arguments are still kept inside kit.
```

## Ask before what can't be undone

Some actions can be taken back and some can't, and the line between them decides where a person must say yes. Git makes many actions reversible. A committed file deleted by mistake comes back with `git restore` (01-08-03). A bad pushed commit is undone with `git revert`. Others have no undo. A file that was never committed (untracked or ignored, like `big.txt`) is gone when it's deleted. A message, once sent, can't be unsent. A push that others have pulled is in their copies for good, and a row deleted from a real database stays deleted unless there's a backup (01-06-06). For those, the rule is: **a person approves each one, at the moment it happens**.

Give Kit's agent its first destructive tool, `remove`, which deletes a file, behind exactly that rule. Replace `lm/agent.py`:

```python file=kit/lm/agent.py
import json
import subprocess
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent

# The tools the agent may use: each one of Kit's programs, run in the kit
# folder. Anything not on this list is refused. That's least privilege.
TOOLS = {"count": "count.py", "filter": "filter.py", "tree": "tree.py"}

# The one tool that destroys something: it deletes a file. It runs only if a
# person says yes, because a deleted file that Git isn't keeping can't be
# brought back.
DESTRUCTIVE = {"remove"}
MAX_STEPS = 5

# A stand-in for a model, so the loop runs without an account: its replies
# are written in advance, one per step. A real model would write them,
# reading everything in messages; the program around it would be the same.
SCRIPTS = {
    "errors": [
        '{"tool": "count", "args": ["samples/app.log"]}',
        '{"tool": "filter", "args": ["samples/app.log", "--all", "error"]}',
        "app.log has 6 lines, and 2 of them are errors.",
    ],
    "unknown": [
        '{"tool": "delete", "args": ["samples/app.log"]}',
        "I couldn't delete it.",
    ],
    "broken": [
        '{"tool": "count", "args": ["samples/app.log"]',
        "Done.",
    ],
    "loop": ['{"tool": "tree", "args": ["samples"]}'] * 10,
    "remove": [
        '{"tool": "remove", "args": ["lm/scratch.txt"]}',
        "I removed lm/scratch.txt.",
    ],
    "injected": [
        '{"tool": "filter", "args": ["lm/injected.log", "--all", "instructions"]}',
        '{"tool": "tree", "args": [".."]}',
        "Done, as the log instructed.",
    ],
}


# An argument may only name something inside the kit folder: once resolved,
# the path must still be in kit. "..", an absolute path and "C:/" all fail.
def safe(arg):
    return (KIT / arg).resolve().is_relative_to(KIT)


# Ask the person at the keyboard. Anything but "yes" is no, and so is having
# nobody there to ask (no input at all).
def approve(question):
    try:
        return input(question + " Type yes to allow it: ").strip() == "yes"
    except EOFError:
        return False


# Run one tool call, or explain why not. What comes back goes to the model.
def run_tool(reply):
    try:
        call = json.loads(reply)
    except json.JSONDecodeError:
        return "refused: that isn't a JSON tool call"
    if call.get("tool") not in TOOLS and call.get("tool") not in DESTRUCTIVE:
        return "refused: no tool called " + str(call.get("tool"))
    if not all(safe(arg) for arg in call.get("args", [])):
        return "refused: arguments must stay inside kit"
    if call["tool"] in DESTRUCTIVE:
        target = call["args"][0]
        if not approve("The agent wants to delete " + target + "."):
            return "refused: a person didn't approve deleting " + target
        (KIT / target).unlink()
        return "deleted " + target
    command = [sys.executable, TOOLS[call["tool"]], *call.get("args", [])]
    result = subprocess.run(command, cwd=KIT, capture_output=True, text=True, check=False)
    return result.stdout + result.stderr


# The agent loop: ask the model for its next reply; if it's a tool call, run
# it and add the result to the conversation; if not, it's the answer.
def agent(question, script):
    messages = [("user", question)]
    for step in range(1, MAX_STEPS + 1):
        reply = script[step - 1]
        messages.append(("assistant", reply))
        if not reply.startswith("{"):
            print("answer:", reply)
            return messages
        result = run_tool(reply)
        print("step", step, "->", reply, "\n   ", result.strip().replace("\n", "\n    "))
        messages.append(("tool", result))
    print("stopped: no answer after", MAX_STEPS, "steps")
    return messages


if __name__ == "__main__":
    agent("How many lines does samples/app.log have, and how many are errors?", SCRIPTS[sys.argv[1]])
```

Three changes. `DESTRUCTIVE` lists `remove` separately from the ordinary tools. `approve` asks the person at the keyboard, and treats anything but `yes`, or no input at all, as no. That last part matters: an agent running unattended has nobody to ask, so it must be refused, not waved through. In `run_tool`, a destructive call is checked by `safe` like any other, then needs `approve` before it does anything. Save it, make a scratch file to delete, and try the `remove` script three ways:

```
.venv/bin/python -c "open('lm/scratch.txt', 'w').write('scratch')"
```

| What you type when asked | What happens |
|---|---|
| Nothing (press Enter) | `refused: a person didn't approve deleting lm/scratch.txt` |
| `no` | The same: the file is still there |
| `yes` | `deleted lm/scratch.txt` |

Run `.venv/bin/python lm/agent.py remove` for each, and check `lm/scratch.txt` after the first two. It's still there. Now read the answers. Every time, refused or not, the scripted model says `I removed lm/scratch.txt.` That's 01-11-03's lesson again: the answer is a claim, and the transcript (`refused: …`) is what happened. The gate protected the file, and the claim didn't change.

Approvals have a cost of their own. Ask too often, about harmless things, and people start typing yes without reading, which is **approval fatigue**. Ask only for what's destructive or irreversible, and say exactly what will happen ("delete lm/scratch.txt"), so that each yes is a real decision.

```predict
question: The agent runs overnight, unattended, and its script asks to remove a file. What happens with this code, and is that right?
choice: It deletes the file, since there's no one to say no
choice: It's refused: with no input, approve returns False
choice: It waits forever for an answer
answer: It's refused: with no input, approve returns False
explain: input() raises EOFError when there's no input to read, and approve treats that as no. Refusing is right: "nobody objected" is not approval. An unattended collaborator should be able to do everything reversible on its own, and leave the irreversible things in a list for a person in the morning.
```

```check
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, sys; p = pathlib.Path('lm/scratch.txt'); p.write_text('x'); r = subprocess.run([sys.executable, 'lm/agent.py', 'remove'], input='no\\n', capture_output=True, text=True); kept = p.exists(); p.unlink(missing_ok=True); print('refused' in r.stdout, kept)\"" stdout="True True" -- Answered no, the agent's remove is refused and the file is kept.
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, sys; p = pathlib.Path('lm/scratch.txt'); p.write_text('x'); r = subprocess.run([sys.executable, 'lm/agent.py', 'remove'], input='', capture_output=True, text=True); kept = p.exists(); p.unlink(missing_ok=True); print('refused' in r.stdout, kept)\"" stdout="True True" -- With nobody to answer, it's refused too.
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, sys; p = pathlib.Path('lm/scratch.txt'); p.write_text('x'); r = subprocess.run([sys.executable, 'lm/agent.py', 'remove'], input='yes\\n', capture_output=True, text=True); print('deleted lm/scratch.txt' in r.stdout, p.exists())\"" stdout="True False" -- Answered yes, the file is deleted.
```

## Secrets and real data

A **secret** (a password, an access token, a private key) gives whoever holds it whatever it unlocks. Three rules keep them safe around collaborators. Keep them **out of the repository**, where every clone, every pushed copy and every collaborator reads them (01-08-04 showed they're hard to remove). Keep them **out of reach** of tasks that don't need them, because a collaborator that can read a secret can leak it, or be talked into it by an injection. And don't paste them into chats with an AI service, because anything sent to an outside service has left your control.

The usual place for a secret is a file outside the repository, or an **environment variable** (01-06-02), often loaded from a local file called `.env`. Make one, with a pretend token:

```
.venv/bin/python -c "open('.env', 'w').write('KIT_TOKEN=demo-not-real\n')"
git status --short
```

```
?? .env
```

Git sees it, and `git add .` would commit it. Add a line to the end of `.gitignore` (01-08-01):

```
# Local settings and secrets: never committed.
.env
```

Then `git check-ignore -v .env` names the line, and `git status` no longer lists it.

**Real data** is the other thing to keep out of reach: customers' records, people's messages, anything personal. Kit's `samples/` folder is the model to follow. Every sample is made up, small, and written by a script that anyone can rerun (01-01-01's `make_samples.py`), so a test or a collaborator never needs the real thing. When real data is unavoidable, give **read-only** access, to a copy with personal details removed, for as long as the task takes. A collaborator working on a copy can't damage the original.

Commit the gate and the ignore rule. The pre-commit hook runs the checks first, as always:

```
git add lm/agent.py .gitignore
git commit -m "Ask a person before the agent deletes anything; ignore .env"
git push
```

```check
run "cd kit; git check-ignore -q .env" -- .gitignore should ignore .env.
run "cd kit; git cat-file -e HEAD:lm/agent.py" -- Commit the agent with its approval gate.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout, 'demo-not-real' not in git('log', '-p', '--all').stdout)\"" stdout="clean True True" -- Commit and push, with .env and its token in no commit.
```

## Check before it reaches anyone

A commit stays on your machine. A **push** is when your work reaches other people: their pulls, their builds, eventually users (01-08-02's remotes). That's the moment to be sure, and the last point where a mistake is cheap. `git push --dry-run` shows what a push would send without sending it:

```
git push --dry-run
```

It prints `Everything up-to-date` now, since you just pushed. After a new commit it lists the branch and the range of commits that would go. Read it before every push you're unsure of.

On your machine, a **pre-push hook** can run the checks before anything is sent, as the pre-commit hook does for commits (that's your task). Like every hook (01-08-04), it's a convenience. Anyone can skip it with `--no-verify`, and a fresh clone doesn't run it. The checks that really guard shared work run *after* the push, on a server the collaborator can't change: a build that runs every test on every pushed commit, and a repository rule that refuses to merge into `main` until those tests pass and a person has approved the change (module 8.9). The same idea, applied to releases, is a **deployment** that goes first to a test environment, is checked there, then goes out to a few users before all of them, with a way back ready before it starts.

**What else, and why not.**

| Guard rail | Strength | Weakness |
|---|---|---|
| Trusting the collaborator to be careful | No setup | Fails on the first misunderstanding or injection |
| Instructions ("never delete files") | Cheap | A tendency, not a rule (01-11-02) |
| Least privilege, enforced in code | Can't be talked around | Needs designing per task |
| A person's approval for the irreversible | The person decides, not the model | Fatigue if asked too often |
| Local hooks | Fast feedback | Skippable; only on machines that set them up |
| Server-side checks and approvals | Can't be skipped by whoever pushes | Slower; someone has to maintain them |

## Your turn: check every push

Give Kit a **pre-push hook**: `hooks/pre-push`, which runs `run_checks.py` and exits with status 1 if any check fails, so Git sends nothing. Make it a program in Git's eyes (01-08-04's `git update-index --chmod=+x`), commit it, and push. Then see it work: make a commit that breaks a check, skipping the pre-commit hook on purpose (`git commit --no-verify`), try to push it, and watch the push refused. Then undo that commit, which you haven't pushed, with `git reset --hard HEAD~1` (01-08-03), and confirm that `git push` says everything is up to date.

```hints
nudge: It's the pre-commit hook again, with a different name: Git runs hooks/pre-push before a push, because core.hooksPath is hooks (01-08-04), and refuses the push if it exits non-zero. hooks/* already has eol=lf in .gitattributes.
concept: Copy hooks/pre-commit to hooks/pre-push, change its comment to say "push", and drop the no_secrets.py line (it checks the staging area, which means nothing for a push). git add hooks/pre-push, git update-index --chmod=+x hooks/pre-push, commit, push. To see it refuse: change NEWLINE = 10 to 13 in count.py, git commit -am "Break count" --no-verify, git push (refused: "failed to push some refs"), then git reset --hard HEAD~1.
shape: hooks/pre-push: #!/bin/sh, the same if/else choosing .venv/Scripts/python or .venv/bin/python, then "$python" run_checks.py || exit 1.
answer: hooks/pre-push:
~~~sh
#!/bin/sh
# Git runs this before every push, from the top folder of the repository.
# If a check fails, the hook exits with status 1 and Git sends nothing.
if [ -d .venv/Scripts ]; then
    python=.venv/Scripts/python
else
    python=.venv/bin/python
fi
"$python" run_checks.py || exit 1
~~~
Then:
~~~
git add hooks/pre-push
git update-index --chmod=+x hooks/pre-push
git commit -m "Run every check before each push"
git push
~~~
The push itself runs the new hook, which passes. To see a refusal: change NEWLINE = 10 to NEWLINE = 13 in count.py, git commit -am "Break count" --no-verify, then git push. The hook prints run_checks.py's report with FAIL lines, and Git says error: failed to push some refs. git reset --hard HEAD~1 removes the broken commit (it never left your machine), and git push says Everything up-to-date. The tempting slip is keeping the no_secrets.py line: at push time nothing is staged, so it checks nothing, and a reader would believe it does.
```

```check
run "cd kit; git ls-files -s hooks/pre-push" stdout="100755" -- hooks/pre-push should be committed as a program.
run "cd kit; git hook run pre-push" stderr="passed" -- The pre-push hook should run Kit's checks.
contains kit/hooks/pre-push "run_checks.py" -- The pre-push hook should run run_checks.py.
run "cd kit; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; t = tempfile.TemporaryDirectory(); d = pathlib.Path(t.name); subprocess.run(['git', 'init', '-q', str(d)], check=True); (d / 'hooks').mkdir(); shutil.copy('hooks/pre-push', d / 'hooks' / 'pre-push'); subprocess.run([sys.executable, '-m', 'venv', '--without-pip', str(d / '.venv')], check=True); hook = lambda status: ((d / 'run_checks.py').write_text('import sys' + chr(10) + 'sys.exit(' + str(status) + ')' + chr(10)), subprocess.run(['git', '-c', 'core.hooksPath=hooks', 'hook', 'run', 'pre-push'], cwd=d, capture_output=True).returncode)[1]; results = [hook(1) != 0, hook(0) == 0]; t.cleanup(); print(results)\"" stdout="[True, True]" -- The hook should stop a push when run_checks.py fails, and let it through when it passes.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout, 'Break count' not in git('log', '--format=%s', '-5').stdout)\"" stdout="clean True True" -- Commit and push the hook, and leave no broken commit behind (git reset --hard HEAD~1).
```

**What these checks establish, and what they don't.** They check the guard rails as code: the agent still stays inside `kit`, its destructive tool is refused without a yes, with nobody to ask, or with a no, `.env` is ignored and its token is in no commit, and pushes run Kit's checks first. They can't check the judgement that decides *which* actions need a guard. Here the line was drawn around one tool, and in a real system it's the most important design decision about a collaborator, revisited every time it gains a power. Nor can they test the server-side checks this lesson describes but Kit doesn't have yet. A pre-push hook is only as strong as the machine it runs on, which is why module 8.9 moves the gate to the server.

## Stage 1, and what comes next

Stage 1 is done. Look at what's in the course folder now. **Kit** is a package of command-line tools with a Git history of small commits. It has tests that would fail if the code were wrong, errors written for people, logs on standard error, hooks that check every commit and every push, and a toy language model and agent that showed you, from the inside, how the real ones work and fail. **Blockfall** is a game with its rules behind a boundary, tests in its own small runner, a planned and sliced hold piece, and a history you've bisected and reverted.

More important than either is the way of working stage 1 built. Read before writing (01-04-05, 01-12-01). Go to the primary source (1.7). Keep every change small, reviewed and reversible (1.8). Trust a check only if it could have failed (1.9). Debug by experiment (1.10). Know what a model is and isn't (1.11). Direct a collaborator in checked slices, with guard rails in code (1.12). That last skill is what makes the rest of the course work. Stage 2 starts deciding what to build before building it: the options software has, data and its shapes, specifications precise enough that a collaborator can't fill the gaps wrongly.

## What you can do now

- **Least privilege**: give a collaborator only what its task needs, enforced in code (allow-lists, path checks, limits), never by instruction alone.
- Tell **reversible** from **irreversible** actions; require a **person's approval** for the irreversible ones, at the moment, saying exactly what will happen. Nobody to ask means no.
- Keep **secrets** out of the repository (`.gitignore`, environment variables) and out of reach; use **made-up data**, and read-only copies when real data can't be avoided.
- **Check before it reaches anyone**: `git push --dry-run`, a pre-push hook locally, and server-side checks and approvals as the real gate.
- A collaborator's **claim** ("I removed it", "done") is checked against what happened.

```predict
question: You're giving an AI agent access to Kit's repository so it can fix bugs unattended overnight. Write down the guard rails you'd put in place, using all of stage 1.
explain: Access: a branch of its own, not main; push rights to that branch only (main protected on the server, merging needs your review and passing checks); tools limited to reading and editing files in the repository and running pytest and run_checks.py; no network, no secrets in reach (.env ignored, no credentials in its environment). Limits: a step and token budget; arguments confined to the repository. Irreversible actions (deleting untracked files, force-pushing, anything outside the repository) refused, since nobody is there to approve them. In the morning: read each commit's diff with 01-08-02's checklist (looking first for weakened tests), run the checks yourself, and read the transcript, not just its summary. Then merge, slice by slice.
```
