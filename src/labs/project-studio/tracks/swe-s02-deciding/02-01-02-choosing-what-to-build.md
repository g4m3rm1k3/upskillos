---
title: "Choosing What to Build: Questions Before Code"
runtime: python
---

Two households have the same need: record what they spend and see where it goes. In the first, two people share one computer and want to keep their numbers private. In the second, five housemates split bills from their phones, and a new housemate moves in every year. The right answer for the first could be a spreadsheet, and for the second a shared app, and neither answer is "build software". The need alone doesn't decide. A handful of questions about the people, the data and the years ahead does. This lesson works through those questions for Ledger's household, scores the options from 02-01-01's `OPTIONS.md`, and finds out something awkward: on the household's needs alone, Ledger shouldn't be built. Then it records the decision honestly in `DECISION.md`, a file that answers, in advance, the questions anyone building Ledger would otherwise answer with a guess.

**By the end you can:**

- Ask the seven questions that decide what to build, and answer them for a real case.
- Compare building, buying and configuring, and say when each wins.
- Tell a prototype from a product, and say what turns one into the other.
- Explain why "boring technology" is usually the right choice.
- Write a decision record that states the real reasons, and say when to revisit it.

**You need:** 02-01-01 (Ledger, `OPTIONS.md`, `total.py`). Commands run inside `ledger`.

## Seven questions

These questions decide which options are even in the running. Each one has an answer for Ledger's household (Sam and Alex):

1. **Users.** Who uses it, how many, where, and how comfortable are they with tools? *Two people, at home, sharing one computer. Comfortable with a spreadsheet, not with a terminal.*
2. **Data volume.** How much data, now and later? *Answered with a number in the next step.*
3. **Rate of change.** How often does the data change, and how often do the needs? *Entries every few days; categories and reports change a few times a year.*
4. **Lifespan.** How long must it last? A script for one afternoon and a system for ten years are different problems. *Years. Ten is the goal.*
5. **Who maintains it.** When something breaks in year three, who fixes it? *They do. There's nobody else.*
6. **Compliance.** Do laws, contracts or rules apply (personal data, financial records, health data)? *No rules apply to a household budget, but it's private financial data, so it should leave their computer only when they choose.*
7. **Cost of failure.** What happens when it's wrong, or when it's lost? *A wrong total misleads them for a month. Lost data loses years of history. Losing data is the worse failure.*

Notice that the answers mostly rule things out. "Neither is a programmer" rules out the script as the final answer. "Private" counts against any option that stores the data on a company's servers. "Nobody else maintains it" counts against anything with a lot of moving parts.

```predict
question: Which of the seven questions does a request like "build us a budgeting app" answer?
choice: Users and lifespan
choice: Only data volume
choice: None of them
answer: None of them
explain: The request names a solution and answers none of the questions. Whoever builds it, a person or an AI agent, will answer them anyway, silently, with the most common answers: many users, logins, a server, a database. That's how a household budget turns into a web app with accounts. The questions are cheap to ask and expensive to answer by accident.
```

## A question with a number

"How much data?" deserves a number rather than an adjective, because "a lot of data" leads people to choose database servers for things that fit in a text file. Measure a real month, then multiply. Create `estimate.py`:

```python file=ledger/estimate.py
import sys

# Is the data big? Measure a real month, then multiply it out to ten years.
name = sys.argv[1] if len(sys.argv) > 1 else "budget.csv"
with open(name, "rb") as file:
    lines = file.read().splitlines(keepends=True)

rows = lines[1:]
per_row = sum(len(line) for line in rows) / len(rows)
per_month = 60  # a guess: about two entries a day
years = 10
total_rows = per_month * 12 * years

print(f"{len(rows)} rows, {per_row:.1f} bytes each on average")
print(f"{years} years at {per_month} a month: {total_rows} rows")
print(f"about {total_rows * per_row / 1000:.0f} KB")
```

It reads the file as bytes, skips the header line, and averages the length of the rest. `per_month = 60` is a guess, and the comment says so: an estimate is a measurement multiplied by assumptions you've written down. Save it and run it:

```
.venv/bin/python estimate.py
```

(On Windows, `.venv/Scripts/python`.)

```
10 rows, 36.7 bytes each on average
10 years at 60 a month: 7200 rows
about 264 KB
```

Ten years of a household's spending is about a quarter of a megabyte, less than one photo from a phone. Every option in `OPTIONS.md` handles that easily. This answer rules nothing out, and that's worth knowing: nobody can justify a database server for this on grounds of size. (02-10-01 makes estimating a skill of its own.)

```check
run "cd ledger; .venv/Scripts/python estimate.py" stdout="7200 rows" -- estimate.py should project ten years at 60 entries a month: 7200 rows.
run "cd ledger; .venv/Scripts/python estimate.py" stdout="about 264 KB" -- At 36.7 bytes a row, that's about 264 KB.
```

## Scoring the options

Now compare the options against what matters to this household. A **weighted score** makes the comparison visible: list the criteria, give each a weight (how much it matters), score each option on each criterion, and add up. Create `score.py`:

```python file=ledger/score.py
# Score each option against what matters to this household.
# Weights: 3 matters most, 1 least. Scores: 1 (poor) to 5 (good).
CRITERIA = ["easy for both", "data stays theirs", "checks what's typed", "little upkeep", "low cost"]
WEIGHTS = [3, 2, 2, 3, 1]
SCORES = {
    "spreadsheet": [5, 4, 2, 5, 5],
    "budgeting app": [5, 1, 4, 5, 2],
    "script": [1, 5, 1, 4, 5],
    "desktop app": [4, 5, 5, 2, 4],
    "web app": [4, 3, 5, 1, 2],
}


def total(scores, weights):
    return sum(weight * score for weight, score in zip(weights, scores))


def ranking(weights=WEIGHTS):
    totals = [(option, total(scores, weights)) for option, scores in SCORES.items()]
    return sorted(totals, key=lambda pair: -pair[1])


if __name__ == "__main__":
    for option, points in ranking():
        print(f"{option:14} {points:3}")
```

The criteria come from the seven questions: "easy for both" from the users, "data stays theirs" from privacy, "checks what's typed" from the cost of failure, "little upkeep" from lifespan and who maintains it. Each list of scores lines up with `CRITERIA`: the spreadsheet scores 5 for ease, 4 for keeping data theirs (a file on their computer), 2 for checking what's typed. `zip` pairs each weight with its score. The scores are judgements, and you might score differently. The point of writing them down is that anyone can now see each judgement and disagree with it.

```predict
question: Ledger is going to be a desktop app (the course builds it). Which option wins this table?
choice: desktop app
choice: spreadsheet
choice: budgeting app
answer: spreadsheet
explain: The spreadsheet scores 47, ahead of the budgeting app and the desktop app at 42 each. It's easy for both people, needs almost no upkeep, and costs nothing. The desktop app wins on checking entries and keeping data private, but loses heavily on upkeep, which carries a weight of 3. On this household's needs, a spreadsheet is the better answer.
verify: cd ledger; .venv/Scripts/python -c "import score; print(score.ranking()[0][0])"
```

Save and run it:

```
.venv/bin/python score.py
```

```
spreadsheet     47
budgeting app   42
desktop app     42
web app         33
script          32
```

That's the honest result, and it's common: for many needs, **configuring** a tool people already have (a spreadsheet) or **buying** a product (a budgeting app) beats building. Buying wins when the need is common and a product already meets it. Configuring wins when a tool you have can stretch to it. Building wins when the need is specific to you, when the products all fail a question that matters (here, privacy), or when owning the software is itself the point.

```check
run "cd ledger; .venv/Scripts/python score.py" stdout="spreadsheet     47" -- score.py should rank the spreadsheet first, with 47 points.
run "cd ledger; .venv/Scripts/python score.py" stdout="desktop app     42" -- The desktop app scores 42.
```

## What the table hides

Ledger is being built anyway, so there must be a reason the table doesn't show. There is: Sam and Alex want to learn to build software, and building Ledger is how they'll learn. That's a real reason. Add it as a criterion, and add a check that shows what the decision rests on. Replace `score.py` with:

```python file=ledger/score.py
# Score each option against what matters to this household.
# Weights: 3 matters most, 1 least. Scores: 1 (poor) to 5 (good).
CRITERIA = ["easy for both", "data stays theirs", "checks what's typed", "little upkeep", "low cost",
            "learning to build"]
WEIGHTS = [3, 2, 2, 3, 1, 3]
SCORES = {
    "spreadsheet": [5, 4, 2, 5, 5, 1],
    "budgeting app": [5, 1, 4, 5, 2, 1],
    "script": [1, 5, 1, 4, 5, 3],
    "desktop app": [4, 5, 5, 2, 4, 5],
    "web app": [4, 3, 5, 1, 2, 5],
}


def total(scores, weights):
    return sum(weight * score for weight, score in zip(weights, scores))


def ranking(weights=WEIGHTS):
    totals = [(option, total(scores, weights)) for option, scores in SCORES.items()]
    return sorted(totals, key=lambda pair: -pair[1])


# Which option wins if one criterion is left out? If the winner changes,
# that criterion is what the decision really rests on.
def without_each():
    for i, criterion in enumerate(CRITERIA):
        weights = WEIGHTS[:i] + [0] + WEIGHTS[i + 1:]
        print(f"without {criterion:20} {ranking(weights)[0][0]}")


if __name__ == "__main__":
    for option, points in ranking():
        print(f"{option:14} {points:3}")
    print()
    without_each()
```

`without_each` reruns the ranking once per criterion, with that criterion's weight set to 0, and prints the winner. `WEIGHTS[:i] + [0] + WEIGHTS[i + 1:]` is a copy of the weights with position `i` replaced; the original list isn't changed (01-04-02). Save and run it:

```
.venv/bin/python score.py
```

```
desktop app     57
spreadsheet     50
web app         48
budgeting app   45
script          41

without easy for both        desktop app
without data stays theirs    desktop app
without checks what's typed  desktop app
without little upkeep        desktop app
without low cost             desktop app
without learning to build    spreadsheet
```

Read the evidence. The desktop app now wins by 7 points, which looks like a comfortable margin. The bottom block shows what that margin is made of: drop any of the first five criteria and the desktop app still wins, but drop "learning to build" and the spreadsheet wins. The whole decision rests on one criterion.

That's not a flaw in the decision. It's a fact about it, and the most important one to write down. A score table is easy to tune until it produces the answer someone wanted, by adding a criterion here or nudging a weight there, and the total then looks like an objective result. The cure is to say what the decision rests on, in words: *we're building Ledger because we want to learn; on the household's needs alone a spreadsheet would win.* Anyone who reuses this decision without that reason should use a spreadsheet. That sentence goes into `DECISION.md`.

Commit the estimate and the scores:

```
git add estimate.py score.py
git commit -m "Estimate ten years of data and score the options"
```

```check
run "cd ledger; .venv/Scripts/python score.py" stdout="without learning to build    spreadsheet" -- Without "learning to build", the spreadsheet should win.
run "cd ledger; .venv/Scripts/python score.py" stdout="desktop app     57" -- With it, the desktop app wins with 57.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:score.py').returncode == 0, git('cat-file', '-e', 'HEAD:estimate.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit estimate.py and score.py.
```

## Prototype or product

`total.py` meets part of the need, and it's a **prototype**: something built to answer a question ("is a total by category what we want to see?"), cheaply, with no promise that it handles anything else. A **product** is something people rely on. Watch the difference. Copy the month to a new file:

```
cp budget.csv bad.csv
```

Open `bad.csv` in the editor and make the mistake a person really makes: change Alex's groceries amount `4815` to `48.15`, the amount in dollars rather than cents. Save it, and total it:

```
.venv/bin/python total.py bad.csv
```

```
Traceback (most recent call last):
  File "…\ledger\total.py", line 16, in <module>
    totals[row["category"]] = totals.get(row["category"], 0) + int(row["cents"])
                                                               ~~~^^^^^^^^^^^^^^
ValueError: invalid literal for int() with base 10: '48.15'
```

A traceback, no totals, and nothing that would tell Sam which row is wrong or what to type instead. And that's the lucky case. Had the mistake been `481` instead of `4815`, a slip of one digit, `total.py` would have printed a wrong total without complaint. Delete the bad copy:

```
rm bad.csv
```

What turns a prototype into a product isn't more features. It's everything around them: checking input and saying what's wrong (02-04-02), errors a person can act on (01-10-01), tests (01-09), backups (02-02-03), and someone to maintain it. Most of that work is invisible in a demo. The danger is a prototype that becomes a product by accident: it works, people start relying on it, and nobody ever adds the checks. Ask an assistant for "a quick script" and you get prototype quality, correctly. If you'll rely on the result, say so, because that changes what "done" means.

```check
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print(os.path.exists('bad.csv'), r.returncode == 0 and r.stdout.strip() == '')\"" stdout="False True" -- Delete bad.csv when you've seen the error; nothing else should have changed.
```

## Boring technology

If Ledger is built, what is it built with? The decision for this course is Python and **tkinter**, the toolkit for desktop windows that comes with Python. Check that this Python has it:

```
.venv/bin/python -c "import tkinter; print(tkinter.TkVersion)"
```

On Windows and on the python.org installers for macOS, it prints a version such as `8.6`. On some Linux distributions tkinter is a separate package (`python3-tk` on Debian and Ubuntu): if you see `ModuleNotFoundError: No module named 'tkinter'`, install it with the system's package manager. (`.venv/bin/python -m tkinter` opens a small test window, if you'd like to see one.)

tkinter is old, plain-looking and very well understood. That's the point. Dan McKinley's essay "Choose Boring Technology" (30 March 2015) argues that established tools are better choices than new ones, not because they're perfect, but because "their failure modes are well understood": when something goes wrong, someone has already written down why. He suggests that a team can afford only a few new technologies ("Let's say every company gets about three innovation tokens") and should spend them where they make the product different, not on plumbing. For Ledger: Python's standard library (`csv`, `tkinter`, and later `sqlite3`) means nothing extra to install, decades of documentation, and no framework that might be abandoned in year four.

Why does this matter so much for a ten-year lifespan? Because **most of software's cost is upkeep.** Say the first version of Ledger takes 40 hours. If keeping it working takes an hour a month (a Python upgrade, a fixed bug, a changed report), ten years of that is 120 hours, three times the first version. The first version is the cheap part. Every dependency you add is something that can change under you during those 120 hours.

```check
run "cd ledger; .venv/Scripts/python -c \"import tkinter; print(tkinter.TkVersion >= 8.6)\"" stdout="True" -- Ledger's Python should have tkinter 8.6 or later. On Linux, install the python3-tk package (or your distribution's equivalent).
```

## Writing the decision down

A decision kept in your head, or in a chat, is gone within months, and the next person (or you, later, or an AI agent asked to "add a feature to Ledger") has to guess it. Guessing it wrong is how a desktop app grows a login screen. A **decision record** holds the decision and, more importantly, its reasons, in the repository, next to the code. Create `DECISION.md`:

```markdown file=ledger/DECISION.md
# Decision: how to keep the household budget

Decided 2026-11-16, by Sam and Alex.

### Context

The need: two people record what they spend, see where the money goes each month, and keep doing it for years. Neither is a programmer. OPTIONS.md lays out the ways to meet it.

### The questions

- Users: two people, at home, sharing one computer. Comfortable with a spreadsheet, not with a terminal.
- Data volume: about 60 entries a month. Ten years is about 7,200 rows, a few hundred kilobytes (estimate.py). Volume rules nothing out.
- Rate of change: entries every few days; categories and reports change a few times a year.
- Lifespan: years. Ten is the goal.
- Who maintains it: we do. There is nobody else.
- Compliance: no rules apply to a household budget, but it is private financial data. It leaves our computer only when we choose.
- Cost of failure: a wrong total misleads us for a month; lost data loses years of history. Losing data is the worse failure.

### Options considered

Scored in score.py (weights 1 to 3, scores 1 to 5):

- A spreadsheet: best on ease and upkeep; checks little of what is typed.
- A budgeting app: easy, and someone else maintains it; a subscription, and our data held by a company.
- A script (total.py): free and ours; usable only from a terminal.
- A desktop app (Ledger): checks every entry, and the data stays on our computer; we build and maintain it.
- A web app: usable from anywhere; a server and logins to secure and pay for.

### Decision

Build Ledger, a desktop app, in Python with tkinter. Where its data lives is a separate decision, not made yet.

### Why

On the household's needs alone, a spreadsheet wins: 47 points to the desktop app's 42. The desktop app wins only because we also want to learn to build software, and building Ledger is how we learn. Without that reason we would use a spreadsheet, and anyone reusing this decision without that reason should too.

A desktop app rather than a web app: there is no server to secure or pay for, and it works without a network. Python and tkinter are boring technology: in Python's standard library, documented for decades, with nothing extra to install.

### Consequences

- We maintain Ledger for as long as we use it.
- It runs on one computer. Neither of us can add an entry from a phone.
- Before we trust it with real data, it must check what is typed and be backed up. Until then, total.py is a prototype.

### Revisit when

- Someone needs to add entries away from the computer.
- Keeping Ledger working takes more than an hour a month.
- Learning stops being a reason. Then move to a spreadsheet, exporting the data as CSV.
```

Each section answers a question a later reader will have. **Context**: what problem was this? **The questions**: what did we know? **Options considered**: what else was there? **Decision**: what did we choose, stated so it can't be misread, including what it doesn't decide yet (where the data lives: 02-02-01). **Why**: the real reasons, including the one the score table hid. **Consequences**: what we've accepted, good and bad. **Revisit when**: the facts that would change the answer, so nobody has to decide whether the decision still holds; they check whether a trigger has happened.

Read it as someone who'll build Ledger and wasn't there. Asked to "let Alex add entries from their phone", they can see that this crosses a revisit trigger and needs a new decision, not a quick server bolted on. That's the difference between a reader who guesses and a reader who knows. When you hand work to an AI agent, it's the most useful thing you can give it.

**What else, and why not.** You could decide in a conversation and keep no record: cheapest today, and the reasons are lost the first time someone asks "why didn't we just use a spreadsheet?". You could keep only the score table: it looks rigorous, but as you saw, it can hide what the decision rests on. You could write a long design document: it's thorough, but nobody keeps it current. A short record of one decision, kept in the repository, is cheap to write and stays true, because when the decision changes you write a new record rather than editing history. Module 3.11 makes these records (architecture decision records) a habit for every significant choice.

Commit it:

```
git add DECISION.md
git commit -m "Record the decision to build Ledger as a desktop app"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('DECISION.md').read_text(encoding='utf-8'); print(all(h in t for h in ['### Context', '### Options considered', '### Decision', '### Why', '### Consequences', '### Revisit when']), 'tkinter' in t.split('### Decision')[1])\"" stdout="True True" -- DECISION.md should have Context, Options considered, Decision, Why, Consequences and Revisit when sections, and the decision should name tkinter.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:DECISION.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit DECISION.md.
```

## Your turn: decide how spending gets in

Ledger now faces its next decision: how does spending get into it? Most of Sam and Alex's spending is by card, and their bank lets them download each month's transactions as a CSV file. Some spending is cash.

Write `IMPORT.md` in `ledger`, a decision record with the same six sections as `DECISION.md`: `### Context`, `### Options considered` (at least three options, each a `- ` line saying what it gives and what it costs), `### Decision`, `### Why`, `### Consequences` and `### Revisit when` (at least one trigger, as a `- ` line). Use the seven questions: cost of failure and who maintains it matter most here. Commit `IMPORT.md`.

```hints
nudge: List every way an entry could reach Ledger: typed by hand, read from the bank's export, fetched by a service, or a mix. For each, ask what goes wrong and who fixes it when it does.
concept: Typing is simplest but is where mistakes come from (the 48.15 you typed). The bank's export removes most typing, but the bank can change its format, so the consequence is an importer that rejects bad rows and a trigger for when the format changes. A service that connects to the bank removes the download but gives a company access to the account. Cash still has to be typed, whatever else you choose.
shape: # Decision: how spending gets into Ledger, a date line, then ### Context, ### Options considered with four "- " lines, ### Decision in one sentence, ### Why, ### Consequences, ### Revisit when with two "- " lines.
answer: IMPORT.md:
~~~markdown
# Decision: how spending gets into Ledger

Decided 2026-11-16, by Sam and Alex.

### Context

Most of our spending is by card, and the bank lets us download each month's transactions as a CSV file. Some spending is cash. Typing every entry is where mistakes come from (a dollar amount typed as cents), and it is the chore most likely to make us give up.

### Options considered

- Type every entry into Ledger: simplest to build; the most typing, and the most typing mistakes.
- Import the bank's CSV export: little typing; we must write an importer, and the bank can change its format without telling us.
- Buy a service that connects to the bank: no export to download; it costs money and gives a company access to our account.
- Import the export, and type only the cash: little typing, and nothing is missed.

### Decision

Import the bank's CSV export each month, and type only cash spending into Ledger.

### Why

The export covers most entries with no typing, which removes the commonest mistake and the chore. A connecting service would also remove the download, but it gives a third party access to our bank account, which the cost of failure doesn't justify for one download a month. Cash still has to be typed, so Ledger needs an entry form anyway.

### Consequences

- The importer must reject bad rows and say why, not guess (02-04-02).
- Importing the same month twice must not count it twice.
- When the bank changes its export, the importer breaks until we fix it.

### Revisit when

- The bank changes its export format more than once a year.
- We stop using cash, or stop using that bank.
~~~
Then git add IMPORT.md and git commit -m "Record how spending gets into Ledger". The tempting slips: a Why that repeats the Decision ("we chose import because importing is best") instead of giving reasons, and leaving out Consequences that hurt, like the importer breaking when the bank changes its format.
```

```check
file ledger/IMPORT.md -- Write IMPORT.md in ledger.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('IMPORT.md').read_text(encoding='utf-8'); print(all(h in t for h in ['### Context', '### Options considered', '### Decision', '### Why', '### Consequences', '### Revisit when']))\"" stdout="True" -- IMPORT.md should have the same six sections as DECISION.md.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('IMPORT.md').read_text(encoding='utf-8'); s = t.split('### Options considered')[1].split('###')[0]; r = t.split('### Revisit when')[1]; w = t.split('### Why')[1].split('###')[0]; print(sum(l.startswith('- ') for l in s.splitlines()) >= 3, sum(l.startswith('- ') for l in r.splitlines()) >= 1, len(w.strip()) > 80)\"" stdout="True True True" -- IMPORT.md should list at least three options and at least one revisit trigger as "- " lines, and give its reasons in Why.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:IMPORT.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit IMPORT.md.
```

**What these checks establish, and what they don't.** They check the estimate's arithmetic, the score table's ranking with and without the learning criterion, that tkinter is available, and that both decision records have the six sections, enough options and triggers, and are committed. They can't check that a reason is honest, that a consequence is the one that will hurt, or that a trigger would really change the answer. A record that passes every check can still say "we chose this because it's best". The test of a decision record is a reader who wasn't there: give `IMPORT.md` to someone and ask them whether Ledger should connect to the bank directly. If they can answer, and say why, from the file alone, the record works.

## What you can do now

- Seven questions decide what to build: **users, data volume, rate of change, lifespan, who maintains it, compliance, cost of failure**. A request that names a solution answers none of them, and whoever builds it answers them by guessing.
- Put a **number** on data volume; it often rules nothing out, and that's worth knowing.
- **Configure** when a tool you have can stretch, **buy** when a product already meets a common need, **build** when the need is yours alone or owning it is the point.
- A **score table** makes judgements visible, but it can hide what a decision rests on. Remove each criterion in turn and see whether the winner changes.
- A **prototype** answers a question; a **product** is relied on, and the difference is checks, errors, tests, backups and upkeep. Say which one you're asking for.
- **Boring technology** fails in ways people already understand, and **most of software's cost is upkeep**.
- A **decision record** states the decision, the real reasons, the consequences and when to revisit, so the next reader knows instead of guessing.

```predict
question: A team's decision record says "We chose a microservice architecture because it scales." The product will have about 200 users. What's missing from the record, and what would you ask?
explain: Almost everything a later reader needs. The questions aren't answered: 200 users is a small scale, so "it scales" is a reason that doesn't apply; who maintains the extra services, and at what cost, isn't stated. No options are listed, so you can't see whether a single application was considered. There are no consequences (more to deploy, monitor and secure) and no revisit triggers. Ask: what were the other options, and how did each score against our real users and our team's size? What does this decision rest on, if not scale? What would make us change it?
```

**Next:** 02-02-01 decides where Ledger's data lives. It lays out the places data can live, from a CSV file to a database server, and the signs that a spreadsheet has stopped being enough, and keeps Ledger's first data in CSV files on purpose, so that their limits show.
