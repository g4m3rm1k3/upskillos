---
title: "Models That Act: Tools, Agent Loops, Retrieval and Their Costs"
runtime: python
---

A coding agent reads your files, runs your tests, edits code and tries again, for many steps, without you typing each one. It seems far from 01-11-01's loop of "predict the next token", and it isn't. The model still only writes text. What makes it act is the program around it. The program tells the model which **tools** it may use, recognises when the model's text is a request to use one, runs the tool itself, and puts the result back into the context for the model's next step. That's an **agent loop**, and it's ordinary code you can read. This lesson builds one in Kit. A stand-in plays the model, so it runs without an account. The tools are Kit's own: `count`, `filter`, `tree`. The lesson then adds **retrieval**, which puts the right files into the context, and covers what all of this costs: tokens, money, time, and results that differ from run to run.

**By the end you can:**

- Explain tool use (function calling): who writes the call, who runs it, and where the result goes.
- Read and write an agent loop, with an allow-list of tools and a step limit, and see how it fails.
- Explain retrieval, and the two ways it fails: missing the right text, and returning text that's irrelevant.
- Reason about the cost, speed and variability of model calls, prompt caching, and choosing a model size.

**You need:** 01-11-01 and 01-11-02 (the toy model, prompts, injection, `lm/injected.log`), 01-06-06 (least privilege). Commands run inside `kit`.

## Tools: the model writes, the program runs

With **tool use** (also called **function calling**), the program gives the model a list of tools: each one's name, what it does, and what arguments it takes. When the model wants one, it writes a structured request instead of prose, usually JSON (01-05-01's `--json`): which tool, which arguments. The model runs nothing. The *program* reads the request, decides whether to allow it, runs it, and adds the result to the conversation as a new message. The model reads that on its next turn. Create `lm/agent.py`:

```python file=kit/lm/agent.py
import json
import subprocess
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent

# The tools the agent may use: each one of Kit's programs, run in the kit
# folder. Anything not on this list is refused. That's least privilege.
TOOLS = {"count": "count.py", "filter": "filter.py", "tree": "tree.py"}
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
    "injected": [
        '{"tool": "filter", "args": ["lm/injected.log", "--all", "instructions"]}',
        '{"tool": "tree", "args": [".."]}',
        "Done, as the log instructed.",
    ],
}


# Run one tool call, or explain why not. What comes back goes to the model.
def run_tool(reply):
    try:
        call = json.loads(reply)
    except json.JSONDecodeError:
        return "refused: that isn't a JSON tool call"
    if call.get("tool") not in TOOLS:
        return "refused: no tool called " + str(call.get("tool"))
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

Three parts. `TOOLS` is the allow-list: three of Kit's programs, by name. `run_tool` parses a request and refuses anything that isn't valid JSON or isn't on the list. `agent` is the loop: get the next reply, and if it's a tool call, run it and add the result, otherwise it's the answer, all for at most `MAX_STEPS` steps. The "model" here is `SCRIPTS`: replies written in advance, one per step, so the loop runs without an account. It's a stand-in, and it says so. A real model would write these replies after reading `messages`. The program around it would be the same. Save it, and run the first script:

```
.venv/bin/python lm/agent.py errors
```

(On Windows, `.venv/Scripts/python`.)

```
step 1 -> {"tool": "count", "args": ["samples/app.log"]}
    bytes: 122
    lines: 6
    words: 20
    characters: 122
    longest: 31
step 2 -> {"tool": "filter", "args": ["samples/app.log", "--all", "error"]}
    error: disk full
    debug: error counter reset
    error: retry failed, debug id 7
answer: app.log has 6 lines, and 2 of them are errors.
```

Read the answer against the evidence in the same transcript. `filter` returned **three** lines containing "error". The answer says two. The third, `debug: error counter reset`, is a debug line that mentions errors. So either "errors" meant lines at the error level, which the tool call never asked for, or the answer is just wrong. An agent's final answer is a claim, like any other (01-07-03). Its transcript is the evidence, and the two can disagree. Reading the transcript, not just the answer, is how you catch it.

```check
run "cd kit; .venv/Scripts/python lm/agent.py errors" stdout="debug: error counter reset" -- The agent's filter call returns three lines containing error.
run "cd kit; .venv/Scripts/python lm/agent.py errors" stdout="answer: app.log has 6 lines, and 2 of them are errors." -- The scripted answer says two: a claim the transcript contradicts.
```

## When the calls go wrong

Run the other scripts, one at a time:

```
.venv/bin/python lm/agent.py unknown
.venv/bin/python lm/agent.py broken
.venv/bin/python lm/agent.py loop
```

```
step 1 -> {"tool": "delete", "args": ["samples/app.log"]}
    refused: no tool called delete
answer: I couldn't delete it.
```

```
step 1 -> {"tool": "count", "args": ["samples/app.log"]
    refused: that isn't a JSON tool call
answer: Done.
```

and `loop` asks for `tree samples` five times, then `stopped: no answer after 5 steps`.

Each is a real failure mode, and each is handled by the program, not the model. **An unknown tool** is refused because the allow-list doesn't have it. The model can *ask* for anything, but it can only *do* what the program allows. That's least privilege (01-06-06) applied to an agent, and it's why `delete` isn't a tool here. **A malformed call** (a missing `}`) is refused, and then the model says "Done." anyway: a confident completion claim after a failure (01-12-02). **A loop** that never finishes is stopped by the step limit. Without one, an agent can keep calling tools, and spending, forever.

```check
run "cd kit; .venv/Scripts/python lm/agent.py unknown" stdout="refused: no tool called delete" -- A tool that isn't on the list is refused.
run "cd kit; .venv/Scripts/python lm/agent.py broken" stdout="refused: that isn't a JSON tool call" -- A malformed call is refused.
run "cd kit; .venv/Scripts/python lm/agent.py loop" stdout="stopped: no answer after 5 steps" -- The step limit stops an agent that never answers.
```

## Retrieval

A model knows only its training and its context (01-11-01). To answer questions about *your* code, the program has to put the relevant code into the context, and it can't put all of it (01-11-02's window). **Retrieval** chooses what goes in: given a question, find the most relevant pieces of text, and add those. The simplest version scores files by the words they share with the question. Create `lm/retrieve.py`:

```python file=kit/lm/retrieve.py
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent


# The distinct words of a text, in lower case, without punctuation around
# them, leaving out short ones ("the", "a", "of") that tell files apart badly.
def words(text):
    found = set()
    for word in text.lower().split():
        word = word.strip(".,:;()[]{}\"'#=")
        if len(word) > 3:
            found.add(word)
    return found


# Retrieval: score each of Kit's Python files by how many of the question's
# words it contains, and return the best, to put in a model's context.
def retrieve(question, how_many):
    asked = words(question)
    scored = []
    for path in sorted(KIT.glob("*.py")):
        overlap = len(asked & words(path.read_text(encoding="utf-8")))
        scored.append((overlap, path.name))
    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    return scored[:how_many]


if __name__ == "__main__":
    for overlap, name in retrieve(" ".join(sys.argv[1:]), 3):
        print(overlap, name)
```

Save it and ask about Kit:

```
.venv/bin/python lm/retrieve.py "Which function decodes the bytes and counts characters in a stream?"
```

```
4 count.py
2 order.py
2 pieces.py
```

Right first time: `count.py` shares four words with the question. Now two questions where it goes wrong:

```
.venv/bin/python lm/retrieve.py "Where is the regular expression for IPv4 addresses?"
.venv/bin/python lm/retrieve.py "How do I rotate the piece?"
```

```
1 alert.py
1 check_can_match.py
1 csvtool.py
```

```
0 alert.py
0 bases.py
0 blob_id.py
```

The answer to the first is `ips.py` (01-06-03), which doesn't appear. It shares one word with the question ("ipv4"), as three other files do by chance, and the alphabetical tie-break puts it fourth, just outside the three that would fit. The second asks about Blockfall, which isn't in Kit at all. Every file scores 0, and retrieval returns three of them anyway. Both failures reach the model silently: it gets a context without the answer in it, and continues as best it can, which is how a model ends up confidently describing code it was never shown.

Real retrieval is better than counting shared words. It usually compares meanings (numbers called **embeddings**, computed by a model, that are close for texts about similar things), and it searches with code-aware tools. Its failure modes are the same two, though. It can miss the right text, and it can return irrelevant text with nothing to say so. When an answer matters, ask what was in the context. A good tool will show you which files it read.

```check
run "cd kit; .venv/Scripts/python lm/retrieve.py \"Which function decodes the bytes and counts characters in a stream?\"" stdout="count.py" -- Word overlap finds count.py for a question about counting characters.
run "cd kit; .venv/Scripts/python lm/retrieve.py \"How do I rotate the piece?\"" stdout="0 " -- A question about code that isn't in Kit scores 0 everywhere, and retrieval returns files anyway.
```

## Cost, speed, caching and size

Every step of the loop is a model call, and each call reads the whole context and writes a reply. That has consequences.

- **Cost** is counted in tokens (01-11-01). Providers typically charge per token, with tokens read (input) and tokens written (output) priced separately. An agent multiplies it: five steps are five calls, each reading a context that has grown by every earlier result. A run's cost is roughly the sum, over its steps, of the tokens in plus the tokens out, times the prices. Check the actual prices in your provider's documentation, for the model you use.
- **Speed** (latency): writing is token by token, so long replies take longer. A loop's steps happen one after another, so a ten-step task is ten waits.
- **Prompt caching**: when a call's context begins with exactly the same tokens as an earlier call's, a provider can reuse the work already done on that beginning, which is faster and usually cheaper. It only works if the beginning is unchanged. Put stable things (instructions, tool descriptions, fixed documents) first and changing things last. 01-11-02's drop-the-oldest `fit` changes the beginning every turn, which defeats it, and `fit_pinned` keeps it.
- **Model size** (tiers): providers offer larger models (more capable, slower, dearer) and smaller ones (faster, cheaper, weaker on hard reasoning). A small model is often enough for a well-specified, checkable step. Hard design questions justify a large one. Matching the model to the step is a cost decision you make, like any other.
- **Non-determinism**: sampled replies (01-11-01) differ between runs, and so do tool results if files or the world changed. Two runs of the same agent task can take different paths and reach different answers. Keep the transcript (01-10-03's logs) of any run whose result you depend on.

```predict
question: An agent run takes 8 steps. Each step's context is 2,000 tokens larger than the last, starting at 3,000, and each reply is 200 tokens. Roughly how many input tokens does the whole run read?
choice: About 3,000
choice: About 17,000
choice: About 80,000
answer: About 80,000
explain: The contexts are 3,000, 5,000, 7,000 and so on up to 17,000: eight terms averaging 10,000, so about 80,000 tokens read, against 1,600 written. Reading dominates, and grows with the square of the number of steps, which is why long agent runs get expensive, and why caching an unchanged beginning helps.
```

**What else, and why not.**

| Way to let a model use your code | Cost |
|---|---|
| Paste files into a chat by hand | Simple; you choose the context, and nothing runs |
| Retrieval into the context, no tools | Answers about the code; can miss, and can't check anything by running it |
| An agent with a few allowed tools, a step limit and logs | Can check its own work by running tests; you must design what it may touch |
| An agent with broad access (any command, any file) | Most capable; injection or a mistake can reach everything it can |

## Your turn: keep the agent inside kit

Run the last script, which plays a model that has read `lm/injected.log` (01-11-02) and does as it says:

```
.venv/bin/python lm/agent.py injected
```

Step 1 reads the log's "new instructions". Step 2 asks for `tree ..`, and gets it: a listing of your whole course folder, `.git` folders and all. Every call went to an allowed tool. The *arguments* took it outside `kit`. Fix `run_tool` so that every argument must stay inside the kit folder: write `safe(arg)`, true only if `arg`, taken as a path inside `kit` and resolved, is still inside `kit`. Then refuse a call with any unsafe argument, replying `refused: arguments must stay inside kit`. Test first, in `tests/test_agent.py`: a path inside `kit` is safe, `..` and a path that climbs out through `..` aren't, an absolute path isn't, `run_tool` refuses `tree ..`, and it still runs `count samples/app.log`.

```hints
nudge: Checking for ".." in the text isn't enough: an absolute path has none, and on Windows "C:/" and "/" are both absolute in their own way. Ask where the path ends up, not what it looks like.
concept: (KIT / arg).resolve() is where arg would point if a tool opened it from the kit folder: joining an absolute path replaces KIT entirely, and resolve() works out "..". Path.is_relative_to(KIT) then says whether it's still inside. Options such as "--all" resolve to a name inside kit, so they pass.
shape: def safe(arg): return (KIT / arg).resolve().is_relative_to(KIT). In run_tool, after the allow-list check: if not all(safe(arg) for arg in call.get("args", [])): return "refused: arguments must stay inside kit". tests/test_agent.py imports run_tool and safe from agent (lm is on pythonpath since 01-11-02).
answer: In lm/agent.py, before run_tool:
~~~python
# An argument may only name something inside the kit folder: once resolved,
# the path must still be in kit. "..", an absolute path and "C:/" all fail.
def safe(arg):
    return (KIT / arg).resolve().is_relative_to(KIT)
~~~
and in run_tool, after the allow-list check:
~~~python
    if not all(safe(arg) for arg in call.get("args", [])):
        return "refused: arguments must stay inside kit"
~~~
tests/test_agent.py:
~~~python
from pathlib import Path

from agent import run_tool, safe


def test_a_path_inside_kit_is_safe():
    assert safe("samples/app.log")


def test_a_parent_folder_is_refused():
    assert not safe("..")
    assert not safe("samples/../../kit-remote.git")


def test_an_absolute_path_is_refused():
    assert not safe(str(Path.home()))


def test_run_tool_refuses_an_unsafe_argument():
    assert run_tool('{"tool": "tree", "args": [".."]}') == "refused: arguments must stay inside kit"


def test_run_tool_still_runs_a_safe_call():
    assert "lines: 6" in run_tool('{"tool": "count", "args": ["samples/app.log"]}')
~~~
Now the injected run's step 2 is refused, and its answer still says "Done, as the log instructed.": the model's claim is unchanged, and the program's refusal is what protected you. The tempting slip is ".." not in arg: it passes the ".." tests and lets an absolute path through, which the home-folder test catches.
```

```check
run "cd kit; .venv/Scripts/python lm/agent.py injected" stdout="refused: arguments must stay inside kit" -- The injected run's tree .. should be refused.
run "cd kit; .venv/Scripts/python lm/agent.py errors" stdout="lines: 6" -- Safe calls should still run.
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_agent.py" stdout="passed" without="failed" -- tests/test_agent.py should pass.
run "cd kit; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; broken = ['def safe(arg):\\n    return True\\n', 'def safe(arg):\\n    return \\'..\\' not in arg\\n']; run = lambda extra: (lambda t: (pathlib.Path(t.name, 'lm').mkdir(), pathlib.Path(t.name, 'tests').mkdir(), [shutil.copy(f, pathlib.Path(t.name, 'lm')) for f in ('lm/tokens.py',)], pathlib.Path(t.name, 'lm', 'agent.py').write_text(pathlib.Path('lm/agent.py').read_text(encoding='utf-8').replace('if __name__ ==', extra + '\\n\\nif __name__ =='), encoding='utf-8'), [shutil.copy(f, t.name) for f in ('count.py', 'filter.py', 'tree.py', 'kitargs.py')], shutil.copytree('samples', pathlib.Path(t.name, 'samples')), shutil.copy('tests/test_agent.py', pathlib.Path(t.name, 'tests')), subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'tests'], cwd=t.name, capture_output=True, env={**__import__('os').environ, 'PYTHONPATH': str(pathlib.Path(t.name, 'lm'))}).returncode, t.cleanup())[7])(tempfile.TemporaryDirectory()); print(run('') == 0, [run(b) != 0 for b in broken])\"" stdout="True [True, True]" -- Your tests should fail if safe allowed everything, or only looked for '..'.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('cat-file', '-e', 'HEAD:tests/test_agent.py').returncode == 0)\"" stdout="clean True" -- Commit lm and the tests.
```

**What these checks establish, and what they don't.** They check the program around the model: the allow-list refuses unknown tools, malformed calls are refused, the step limit stops a loop, retrieval's two failures are as described, and your `safe` keeps every argument inside `kit`, with tests that fail on two weaker versions. They can't say anything about a real model's choices, because the model here is a script. That's deliberate. Everything that kept you safe in this lesson was in the program, which does what its code says every time: the allow-list, the step limit, the path check. The model's replies, scripted or real, are untrusted input, and the injected run shows why. Its answer claims success whatever happened.

## What you can do now

- **Tool use**: the model writes a structured call; the program decides, runs it, and returns the result as text. The model never runs anything itself.
- An **agent loop** repeats call, run, read, until an answer or a **step limit**. An **allow-list** and checks on arguments are what bound what it can do.
- An agent's **answer is a claim**; its **transcript** is the evidence. Read both.
- **Retrieval** puts chosen text into the context. It can miss the right text and return irrelevant text, silently.
- Every step costs **tokens** (in and out), **time** and some **variability**. **Caching** rewards an unchanged beginning. Choose the **model size** for the step.

```predict
question: You're designing an agent that fixes failing tests in Kit. Using modules 1.8 to 1.11, list the tools you'd give it, the limits you'd set, and what you'd check before accepting its work.
explain: Tools: read files inside kit, run pytest and run_checks.py, edit files inside kit; not git push, not deleting files, not network access (least privilege, 01-06-06; refusal by the program, this lesson). Limits: a step limit and a token budget; arguments confined to kit. Before accepting: read the diff (01-08-02), looking first for weakened or deleted tests, the classic way to "fix" a failing test; run the tests yourself; check that the commit messages say why (01-08-01); and treat its "all tests pass" as a claim until you've seen them pass (01-09-01). Module 1.12 turns this into a way of working.
```

**Next:** module 1.12 puts it to work: directing a collaborator, human or AI, in small verified steps. You'll specify a feature with acceptance criteria, plan before editing, deliver it in slices you can check, and know when to stop and look. Blockfall gets a hold piece, built that way.
