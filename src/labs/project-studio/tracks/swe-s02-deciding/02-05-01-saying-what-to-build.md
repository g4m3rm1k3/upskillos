---
title: "Saying What to Build: Requirements, Constraints and Non-Goals"
runtime: python
---

Ask an AI agent to "add budgets to Ledger" and it will add budgets. It will also decide, without telling you, what a budget is (a monthly limit? a yearly plan? a goal?), where it's stored, what happens when one is passed, whether there's a login screen to protect it, and what to call things in the code. Every gap in a request is filled, by a person or an agent, with the most plausible guess, and the guesses are reasonable, consistent with each other, and not what you meant. That's why "it doesn't listen" so often turns out to mean "I didn't say": not the words of the request, but the dozens of decisions underneath it. A **specification** says those decisions out loud, before anything is built, in a form someone can check the result against. This lesson writes the first half of Ledger's: what it must do, how well, within which limits, on which assumptions, and what it will *not* do; and it builds a small tool that keeps the spec's vocabulary and the code's in agreement.

**By the end you can:**

- Tell a requirement from an implementation, and write requirements that say what, not how.
- Write functional and non-functional requirements (performance, security, reliability, usability, maintainability, cost) with a way to check each.
- Record constraints, assumptions and non-goals, and say why each matters to the builder.
- Define a domain vocabulary, and check that code and documents use it.
- Write a spec for both of its readers: people and AI agents.

**You need:** 02-01-02 (`DECISION.md`, the seven questions), 02-02-03 and 02-04-02 (Ledger's data and importer). Commands run inside `ledger`.

## What, not how

A **requirement** says what the software must do or be, in terms its users would recognise. An **implementation** is one way of doing it.

```predict
question: Which of these is a requirement rather than an implementation? (a) "Store transactions in SQLite." (b) "A month's report appears within one second with ten years of data." (c) "Use a dictionary keyed by category."
choice: (a)
choice: (b)
choice: (c)
answer: (b)
explain: (b) says what the user gets, and can be checked without looking at the code. (a) and (c) are ways of building it: they might be good choices, but if they're written as requirements they forbid better ones, and they leave the real need unsaid. A spec full of implementation tells the builder what to type and not what you want, so when something it didn't foresee comes up, the builder has nothing to reason from.
```

Requirements come in two kinds. **Functional** requirements say what the software does: "import a statement", "show a month's spending by category". **Non-functional** requirements say how well: how fast (**performance**), how safe (**security** and privacy), how dependable (**reliability**), how easy (**usability**), how easy to change (**maintainability**), and how much it costs to run (**cost**). Non-functional requirements are the ones people forget to say, and the ones that decide the architecture: "within a second with ten years of data" and "within a second with ten million users" are different systems (02-10-01).

The test of a requirement is whether you could check it. "Ledger must be fast" can't be checked, so it can't be met or failed; a builder will decide what fast means, and you'll find out afterwards. "A month's report within 1 second with 7,200 transactions" can be timed. Every requirement in Ledger's spec gets a way to check it, now or in 02-05-02.

## Words that mean one thing

Before requirements, words. Ledger's files already say "transaction", "row", "entry" and "spending" for overlapping things. A reader meeting "expense" in one file and "transaction" in another can't know whether they're the same thing, and an agent asked to "add notes to expenses" may well create a second kind of record. A **domain vocabulary** (also called a glossary, or a *ubiquitous language* when the code uses it too, 02-08-01) fixes one word for each thing, says what it means, and lists the words not to use. Start `SPEC.md` with it:

```markdown file=ledger/SPEC.md
# Ledger: specification

### Purpose

Ledger keeps a household's record of money spent, so that the people in it can see where their money goes each month, for years. DECISION.md records why it's a desktop app.

### Vocabulary

| Term | Meaning | Not |
|---|---|---|
| transaction | One amount of money spent or received, on one date, from one account | expense, payment, entry, purchase |
| account | Where money is spent from, such as a card or a bank account, held by one person | wallet, fund |
| category | What a transaction was for, chosen from Ledger's list: rent, groceries | label, bucket |
| statement | A bank's file of the transactions on one account over a period | bank file, download |
| inbox | Imported transactions not yet given an account and a category | staging |
| cents | Amounts, always as whole numbers of cents | pennies |
```

The `Not` column is the useful part: each avoided word is one a person or an agent would naturally reach for. Some care goes into it. "Card" isn't on the list, although Sam's account is a card: a card is a *kind* of account, and "Sam's card" is an account's name. A word is avoided only if it means the same thing as the term. Save it.

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('SPEC.md').read_text(encoding='utf-8'); print('### Vocabulary' in t, '| transaction |' in t)\"" stdout="True True" -- SPEC.md should start with a Purpose and a Vocabulary table that defines transaction.
```

## Checking the words

A vocabulary that nobody checks drifts. Create `vocab.py`, which checks it:

```python file=ledger/vocab.py
import pathlib
import re
import sys

# Find the words SPEC.md's vocabulary says not to use, in the spec and in
# Ledger's code. One word for one thing: a reader, or an agent, who meets two
# words for the same thing in two files can't know they're the same, and will
# often build both.
SPEC = pathlib.Path("SPEC.md")


# The vocabulary table's "Not" column, as {avoided word: term to use}.
def avoided_words(spec_text):
    section = spec_text.split("### Vocabulary")[1].split("\n### ")[0]
    words = {}
    for line in section.splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0] not in ("Term", "") and not cells[0].startswith("-"):
            for word in cells[2].split(","):
                if word.strip():
                    words[word.strip().lower()] = cells[0]
    return words


# Each use of an avoided word, or its plural: (file, line number, word, term).
# Lines of SPEC.md's vocabulary table are skipped: they name the words on
# purpose.
def uses(words, files):
    forms = {}
    for word, term in words.items():
        plurals = [word, word + "s", word + "es"]
        if word.endswith("y"):
            plurals.append(word[:-1] + "ies")
        forms.update({form: term for form in plurals})
    alternatives = "|".join(re.escape(form) for form in sorted(forms, key=len, reverse=True))
    pattern = re.compile(r"\b(" + alternatives + r")\b", re.IGNORECASE)
    found = []
    for path in files:
        in_table = False
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if line.startswith("### "):
                in_table = path == SPEC and line == "### Vocabulary"
            if in_table:
                continue
            for match in pattern.finditer(line):
                found.append((path, number, match.group(0), forms[match.group(0).lower()]))
    return found


if __name__ == "__main__":
    words = avoided_words(SPEC.read_text(encoding="utf-8"))
    files = [SPEC, *sorted(pathlib.Path(".").glob("*.py")), *sorted(pathlib.Path("tests").glob("*.py"))]
    found = uses(words, files)
    for path, number, word, term in found:
        print(f"{path}:{number}: {word!r}: SPEC.md's word is {term!r}")
    print(f"{len(found)} avoided words in {len(files)} files")
    sys.exit(1 if found else 0)
```

`avoided_words` reads the table from `SPEC.md` itself, so the spec stays the one place the vocabulary is defined. `uses` builds one regular expression (01-06-03) from every avoided word and its plurals (`entry` needs `entries` as well as `entrys`), with `\b` word boundaries so `fund` doesn't match inside `refund`, and longest first so `bank file` wins over a shorter match. It skips the vocabulary table, which names the words on purpose. It scans `SPEC.md` and every Python file, and exits 1 if anything is found, so it can run before commits like a test. Save both files, and run it:

```
.venv/bin/python vocab.py
```

(On Windows, `.venv/Scripts/python`.)

```
estimate.py:10: 'entries': SPEC.md's word is 'transaction'
1 avoided words in 16 files
```

One real case, in code written in 02-01-02: `estimate.py`'s comment says `about two entries a day`. Read the evidence: it's small, and it's exactly the kind of drift that accumulates, one natural word at a time, until a codebase has four names for one thing. Fix it: in `estimate.py`, change `entries` to `transactions`, and run `vocab.py` again: `0 avoided words in 16 files`.

(While writing this lesson, a first version of the table listed `source` as a word not to use for an account. `vocab.py` immediately found it in `importer.py`, where `source` is the name of the statement file being read, a different meaning entirely. The fix was a better word in the table. A checker's false alarms are information about the rule, not only about the code.)

```check
run "cd ledger; .venv/Scripts/python vocab.py" stdout="0 avoided words in 16 files" -- With estimate.py's comment fixed, vocab.py should find no avoided words.
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); [shutil.copy(n, d) for n in ['vocab.py', 'SPEC.md']]; open(os.path.join(d, 'x.py'), 'w').write('# one payment a day' + chr(10)); r = subprocess.run([sys.executable, 'vocab.py'], cwd=d, capture_output=True, text=True); print(r.returncode, 'x.py:1' in r.stdout)\"" stdout="1 True" -- vocab.py should find an avoided word in a Python file, with its line, and exit 1.
```

## Requirements

Now the rest of part 1. Replace `SPEC.md` with:

```markdown file=ledger/SPEC.md
# Ledger: specification

### Purpose

Ledger keeps a household's record of money spent, so that the people in it can see where their money goes each month, for years. DECISION.md records why it's a desktop app.

### Vocabulary

| Term | Meaning | Not |
|---|---|---|
| transaction | One amount of money spent or received, on one date, from one account | expense, payment, entry, purchase |
| account | Where money is spent from, such as a card or a bank account, held by one person | wallet, fund |
| category | What a transaction was for, chosen from Ledger's list: rent, groceries | label, bucket |
| statement | A bank's file of the transactions on one account over a period | bank file, download |
| inbox | Imported transactions not yet given an account and a category | staging |
| cents | Amounts, always as whole numbers of cents | pennies |

### Functional requirements

- F1. Record a transaction: its date, account, category, amount in cents, and an optional note.
- F2. Import a statement into the inbox, rejecting each row that can't be read, with its line and the reason.
- F3. Importing a statement twice, or two statements that overlap, adds each transaction once.
- F4. Move a transaction from the inbox into Ledger's transactions by giving it an account and a category.
- F5. Show a month's spending by category, largest first, and the month's total.
- F6. Correct a transaction, keeping the value it had before.
- F7. Back up the data, and prove each backup by restoring it.

### Non-functional requirements

- N1. Performance: a month's report appears within 1 second with ten years of transactions (7,200; timing.py measures about 0.05 s).
- N2. Reliability: stopping the program in the middle of a change leaves the data as it was before the change or after it, never half done. Not yet met: importer.py appends in place.
- N3. Privacy: the data never leaves the computer, except in backups the people make themselves. Ledger uses no network.
- N4. Usability: someone who has never used Ledger can record a transaction in under a minute, without help. Measured by asking someone to try.
- N5. Maintainability: every rule in this spec has a test, and every test passes before each commit.
- N6. Cost: nothing to pay for: no services, no subscriptions.

### Constraints

- C1. Technical: Python 3.11 or later, its standard library only (pytest for the tests), and tkinter for windows.
- C2. Runs without a network, on Windows, macOS and Linux.
- C3. Time: built in small steps by people learning, each step small enough for one evening.
- C4. Skills: looked after by people who know Python, not web development.
- C5. Legacy: the data Ledger already holds (data/*.csv) and the statement format bank.py reads keep working.

### Assumptions

- A1. One person uses Ledger at a time, on one computer.
- A2. One currency.
- A3. Statements arrive as CSV files with the columns date, description and amount (bank.py).
- A4. Fewer than 100 transactions a month.
- A5. Every amount is a whole number of cents.

### Non-goals

- Ledger does not connect to banks.
- Ledger has no user names or passwords.
- Ledger does not run on phones or in a browser.
- Ledger does no taxes, investments or forecasts.
- Ledger does not convert between currencies.

### For whoever builds from this

This spec is for people and for AI agents. Where it doesn't say, ask; don't assume. A change that would cross a non-goal, a constraint or an assumption needs a new decision record first. Use the vocabulary's words in code, tests and messages; vocab.py finds the others.
```

Read it as a builder would. Each **functional requirement** is numbered, so a test, a commit message or a question can point at it ("F3 fails when…"), and says what, not how: F2 says rows are rejected with a reason, not how `bank.py` parses. Each **non-functional requirement** has a measure: N1 a time and a size (and the measurement it's based on, from 02-02-03), N4 a time and a way to measure it. N2 is honest that it isn't met yet: a spec says what's required, and the gap between it and the code is the work to do. **Constraints** are limits the builder can't choose to ignore: technical (C1, C2), time (C3), skills (C4), legacy (C5); budget is N6's "nothing to pay for". **Assumptions** are things believed true and not checked; written down, each can be questioned, and each says where the design would have to change (if A1 stops being true, `DATA.md`'s lock isn't enough). **Non-goals** say what Ledger will not do, which is the most effective section for an agent: without "Ledger does not connect to banks", a request like "make importing easier" invites a bank connection, with credentials, and every security problem that brings. The last section speaks to the builder directly, including the instruction agents need most: where the spec doesn't say, ask.

Run `vocab.py` once more (the new sections use the vocabulary's words), and commit:

```
.venv/bin/python vocab.py
git add SPEC.md vocab.py estimate.py
git commit -m "Start Ledger's specification, with a vocabulary that's checked"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('SPEC.md').read_text(encoding='utf-8'); print(all(h in t for h in ['### Functional requirements', '### Non-functional requirements', '### Constraints', '### Assumptions', '### Non-goals']))\"" stdout="True" -- SPEC.md should have sections for functional and non-functional requirements, constraints, assumptions and non-goals.
run "cd ledger; .venv/Scripts/python vocab.py" stdout="0 avoided words in 16 files" -- The whole spec should use the vocabulary's words.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('### Non-goals' in git('show', 'HEAD:SPEC.md').stdout, git('cat-file', '-e', 'HEAD:vocab.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit SPEC.md, vocab.py and estimate.py.
```

## Two readers

A spec has always had two audiences inside it: the people who want the software, who must recognise their needs in it, and the people who build it, who must be able to act on it. Now the builder is often an AI agent, and an agent reads differently from a person in ways that matter (01-11-02):

- **It doesn't ask unless told to.** A person meeting "show the month's spending" might ask "which month: calendar or statement period?"; an agent picks one. Hence the last section, and hence numbered requirements it can cite when it does ask.
- **It weighs what's near and specific over what's far and general.** A non-goal in a document it wasn't given doesn't exist for it. Give it the spec, or the relevant part, with the task (01-12-01).
- **It fills gaps with the most common answer.** For "a budgeting app", the most common answer has accounts and logins and a server. Non-goals and assumptions are what replace the common answer with yours.
- **It takes words at face value.** If the spec says "transaction" and the code says "entry", it may treat them as different things. The vocabulary, checked by `vocab.py`, closes that gap.

None of this is specific to agents: a new teammate, or you in a year, reads the same way. A spec written for an agent is a spec written clearly.

```predict
question: Which part of Ledger's spec most reduces the chance that "make the import easier" leads an agent to add a connection to the bank's servers?
choice: The vocabulary
choice: The non-goals
choice: N1, the performance requirement
answer: The non-goals
explain: "Ledger does not connect to banks" directly forbids the most common way to make importing easier, and the last section tells the builder that crossing a non-goal needs a decision first. Without it, a bank connection is a perfectly reasonable reading of the request. Non-goals are short to write and remove whole branches of plausible work.
```

**What else, and why not.** You could skip the spec and steer the builder step by step: it works for small changes you can review at once, and fails as soon as the work outgrows one sitting, because the decisions live only in a conversation that ends. You could write user stories ("as a householder, I want…") without the rest: they capture who and why well, but say nothing about constraints, non-goals or how well, which is where most surprises come from. You could write a long formal requirements document: thorough, and rarely read or kept current. A short spec in the repository, numbered and checked where it can be, is cheap enough to keep true.

## Your turn: vague requests, made checkable

Here are five requests the household might make. Write `REQUESTS.md` in `ledger`, with one section for each, using these headings exactly:

- `### Make it fast`
- `### Make it secure`
- `### Let us use it from our phones`
- `### Make it easy to use`
- `### Add budgets`

In each, a `Becomes:` line: the request rewritten as one or more requirements a builder could check, pointing at the spec's numbers where they already say it (N1…), or, where the request crosses the spec, the non-goal or decision it needs. Then a `Check:` line: how you'd tell the result meets it. Where the request is ambiguous, say what you'd ask. Commit `REQUESTS.md`.

```hints
nudge: For each request, ask "what would I look at to say yes, that's done?" If you can't answer, the request isn't a requirement yet. If the answer is in SPEC.md already, point at it; if the request contradicts SPEC.md, it's not a requirement but a decision.
concept: "Fast" needs a number, a size of data and a moment (the report? the window opening?). "Secure" needs a threat: what are we protecting from whom? (No network, no stored bank passwords.) "From our phones" crosses a non-goal, so it needs a decision record first. "Easy" needs a measure involving real people. "Budgets" is ambiguous, so it starts with a question, then a requirement with an example.
shape: # Requests, made checkable, then five ### sections, each with a Becomes: line (requirements with numbers, or "a non-goal … needs a decision record") and a Check: line (what you'd time, try or look for).
answer: REQUESTS.md:
~~~markdown
# Requests, made checkable

### Make it fast

Becomes: N1 already says it: a month's report within 1 second with ten years of transactions. Add: Ledger's window opens within 2 seconds on the computer it runs on.
Check: time the report with 7,200 transactions (timing.py), and time the window opening from a click, three times each.

### Make it secure

Becomes: N3 (no network; data leaves the computer only in backups the people make), plus: backups are written only where the person chooses, and Ledger never stores bank passwords, because it never connects to a bank.
Check: run Ledger with the network turned off and confirm everything works; search the code for any network module (socket, urllib, http).

### Let us use it from our phones

Becomes: a non-goal ("Ledger does not run on phones"), so this request needs a new decision record before any code, because it crosses DECISION.md's revisit trigger "someone needs to add entries away from the computer".
Check: the decision record exists and says what was chosen and why, before any change is made.

### Make it easy to use

Becomes: N4: someone who has never used Ledger can record a transaction in under a minute, without help; and every error message says what was wrong and what to do.
Check: ask two people who haven't seen it to record a transaction, and time them; read every error message aloud to someone and ask what they'd do.

### Add budgets

Becomes: a question first: is a budget a monthly limit per category, warned about when passed? If so: F8. For each category, a monthly limit in cents can be set, and the month's report marks each category whose spending is over its limit.
Check: with groceries limited to 20000 cents and 22930 spent, the report marks groceries as over; with no limit set, nothing is marked.
~~~
Then git add REQUESTS.md and git commit -m "Turn five vague requests into checkable requirements". The tempting slips: "Make it fast" becoming "use a faster database" (an implementation, not a requirement), and "from our phones" becoming a requirement, when SPEC.md says it's a non-goal and DECISION.md lists it as a reason to revisit the whole decision.
```

```check
file ledger/REQUESTS.md -- Write REQUESTS.md in ledger.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('REQUESTS.md').read_text(encoding='utf-8'); names = ['Make it fast', 'Make it secure', 'Let us use it from our phones', 'Make it easy to use', 'Add budgets']; parts = {p.splitlines()[0].strip(): p for p in t.split('### ')[1:]}; print([n for n in names if n not in parts or 'Becomes:' not in parts[n] or 'Check:' not in parts[n]] or 'all five')\"" stdout="all five" -- Each of the five requests should have its section, with a Becomes: line and a Check: line.
run "cd ledger; .venv/Scripts/python -c \"import pathlib, re; t = pathlib.Path('REQUESTS.md').read_text(encoding='utf-8'); fast = t.split('### Make it fast')[1].split('###')[0]; phones = t.split('### Let us use it from our phones')[1].split('###')[0].lower(); print(bool(re.search(r'[0-9]', fast)), 'non-goal' in phones or 'decision' in phones)\"" stdout="True True" -- Make it fast should get a number, and the phones request should be recognised as crossing a non-goal (or needing a decision).
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:REQUESTS.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit REQUESTS.md.
```

**What these checks establish, and what they don't.** They check that the spec has its sections, that the vocabulary is defined once and used everywhere `vocab.py` looks, that `vocab.py` really finds an avoided word, and that each vague request was given a checkable form with a number where one was needed and the non-goal recognised. They can't check that the requirements are the right ones: that the household really wants F6, or that N4's minute is the right minute. That's checked by showing the spec to the people it's for and asking "is this what you meant?", which is cheaper by far than showing them the finished software.

## What you can do now

- A **requirement** says what, in the users' terms, and can be **checked**; an **implementation** is one way to meet it, and doesn't belong in the requirement.
- **Functional** requirements say what it does; **non-functional** ones say how well (performance, security, reliability, usability, maintainability, cost), each with a measure.
- **Constraints** are limits the builder can't ignore; **assumptions** are beliefs, written down so they can be questioned; **non-goals** say what won't be built, and remove whole branches of plausible wrong work.
- A **vocabulary** fixes one word per thing and lists the words to avoid; check it, because it drifts.
- A spec has two readers, **people and agents**. Agents don't ask, fill gaps with the common answer, and take words literally, so number the requirements, state the non-goals, and tell them to ask.

**Next:** 02-05-02 writes the second half: examples as specification. Given/when/then acceptance criteria for Ledger's requirements, edge cases, a definition of done, and a pre-mortem; and Blockfall's scoring rules, written as examples before any scoring code exists.
