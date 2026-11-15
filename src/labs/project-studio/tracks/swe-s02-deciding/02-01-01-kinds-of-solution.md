---
title: "Kinds of Solution: Does This Need to Be Code?"
track: 02 · Deciding
runtime: python
---

Two people want to know where their money goes each month, and to keep track for years. A programmer, or an AI agent asked for "an app to track our budget", will start designing an app: screens, a database, maybe a server. Stage 1 taught you to build well. Stage 2 starts one step earlier, with the most expensive question in software, which is asked least often: *what should be built at all, if anything?* A spreadsheet might do. So might an app someone else already maintains, or a short script, or three existing tools joined together. Each is a different amount of work now and a different amount of upkeep for years. This lesson lays out the kinds of solution and the kinds of effort, and starts **Ledger**, the course's third project, with the smallest solution that works. 02-01-02 then chooses between the options, with reasons.

**By the end you can:**

- Name the kinds of solution software comes in, from a spreadsheet to a queue worker, and say what each is good for.
- Tell configuring, buying, gluing and building apart, and say what each costs over time.
- Lay out several candidate solutions for one need, side by side, before choosing.

**You need:** 01-01-01 (a virtual environment), 01-07-02 (CSV), 01-08-01 (a repository, `.gitignore`, `.gitattributes`). Commands run in the course folder, then inside `ledger`.

## A need, not a program

Start from what the people need, in their words, not from a program:

- Two people record what they spend.
- They see, each month, where the money went, by category.
- It keeps working for years, and neither of them is a programmer.

Notice what's missing: screens, databases, phones, servers. Those are ways to meet the need, and choosing among them is the decision. Before any choice, a few questions decide which kinds of solution are even in the running. Who will use it, and how comfortable are they with tools? How much data, and how fast does it change? How long must it last, and who will look after it? What happens if it's wrong? 02-01-02 works through those questions. This lesson first lays out what there is to choose from.

```predict
question: An assistant is asked "build us an app to track our household budget". What's the most useful first thing it could do?
choice: Pick a web framework and start the project
choice: Ask what the budget must do, who'll use it, and whether an existing tool or a spreadsheet would already do
choice: Design the database tables
answer: Ask what the budget must do, who'll use it, and whether an existing tool or a spreadsheet would already do
explain: The request names a solution ("an app"), not the need. The cheapest software is the software nobody has to write or maintain, and a shared spreadsheet or an existing budgeting app may meet this need completely. Assistants rarely ask whether something should be code at all, because the likeliest continuation of "build us an app" is an app (01-11-01).
```

## Ledger begins

Ledger is the course's third project. It will grow into a desktop budgeting app, if that turns out to be the right choice. It starts as a folder with a repository, like Kit and Blockfall. From the course folder:

```
mkdir ledger
cd ledger
python -m venv .venv
git init -b main
```

(Use the Python command that made Kit's `.venv` in 01-01-01: `python3` on macOS and Linux.) Ledger gets its own virtual environment and its own history, because each project's history should be about that project only (01-08-01). Create its `.gitignore`:

```gitignore file=ledger/.gitignore
# Made by tools, and rebuilt in a moment: never part of Ledger's history.
.venv/
__pycache__/
```

Ledger's data will be CSV files. Python's `csv` module ends every row with CRLF (RFC 4180, 01-07-02), and on Windows `core.autocrlf` would change those bytes in a clone (01-08-01). So tell Git to store them byte for byte:

```
.venv/bin/python -c "open('.gitattributes', 'w').write('*.csv -text\n')"
```

(On Windows, `.venv/Scripts/python`.) That's 01-08-01's fix, made before the first commit this time.

```check
run "cd ledger; git rev-parse --show-toplevel" stdout="/ledger" -- ledger should be a Git repository of its own (git init -b main inside ledger).
run "cd ledger; .venv/Scripts/python -c \"import sys; print(sys.prefix.endswith('.venv'))\"" stdout="True" -- ledger should have its own .venv.
run "cd ledger; git check-ignore -q .venv" -- Git should ignore ledger's .venv.
run "cd ledger; git check-attr text budget.csv" stdout="budget.csv: text: unset" -- .gitattributes should store CSV files byte for byte.
```

## Made-up data first

Real spending is personal, and stage 1's guard rails apply (01-12-03): build with made-up data that anyone can recreate. Create `make_budget.py`:

```python file=ledger/make_budget.py
import csv

# A made-up month of household spending: date, who paid, category, amount in
# cents (whole numbers: 01-03-03's fixed width, and module 2.6's "money is
# never a float"), and a note.
ROWS = [
    ("2026-11-01", "Sam", "rent", 95000, "November"),
    ("2026-11-02", "Alex", "groceries", 6420, "market"),
    ("2026-11-04", "Sam", "transport", 3000, "bus pass"),
    ("2026-11-07", "Alex", "groceries", 4815, ""),
    ("2026-11-09", "Sam", "eating out", 2750, "birthday"),
    ("2026-11-12", "Alex", "bills", 7130, "electricity"),
    ("2026-11-15", "Sam", "groceries", 5590, ""),
    ("2026-11-20", "Alex", "eating out", 1880, ""),
    ("2026-11-25", "Sam", "bills", 3999, "phone"),
    ("2026-11-28", "Alex", "groceries", 6105, "market"),
]

with open("budget.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["date", "who", "category", "cents", "note"])
    writer.writerows(ROWS)
```

A month of ten made-up entries. Amounts are whole **cents**, not dollars with decimals: 95000 is 950.00. Decimal money in floating point goes wrong in small, confusing ways (01-07-03's `round(2.675, 2)`), and module 2.6 makes "money is never a float" a rule Ledger enforces. Save it, run it, and look at the start of what it wrote:

```
.venv/bin/python make_budget.py
```

`budget.csv` begins `date,who,category,cents,note` and has ten rows. Commit the start of Ledger:

```
git add .gitignore .gitattributes make_budget.py budget.csv
git commit -m "Start Ledger with a made-up month of spending"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import csv; rows = list(csv.DictReader(open('budget.csv', newline='', encoding='utf-8'))); print(len(rows), sum(int(row['cents']) for row in rows))\"" stdout="10 136689" -- budget.csv should hold the ten made-up entries, 136689 cents in all.
run "cd ledger; git cat-file -e HEAD:budget.csv" -- Commit the start of Ledger.
```

## The smallest solution: a script

Before laying out the options, build the smallest one that meets part of the need: a script that totals the month by category. Create `total.py`:

```python file=ledger/total.py
import csv
import sys


# Whole cents as money, without ever making a float: 136689 is 1366.89.
def money(cents):
    return f"{cents // 100}.{cents % 100:02d}"


# The smallest solution: read the month's spending, and print the total for
# each category, largest first, then the month's total.
name = sys.argv[1] if len(sys.argv) > 1 else "budget.csv"
totals = {}
with open(name, newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        totals[row["category"]] = totals.get(row["category"], 0) + int(row["cents"])

for category, cents in sorted(totals.items(), key=lambda item: -item[1]):
    print(f"{category:12} {money(cents):>9}")
print(f"{'total':12} {money(sum(totals.values())):>9}")
```

`money` writes whole cents as money without making a float: `136689 // 100` is 1366, and `136689 % 100` is 89, written with two digits. `csv.DictReader` (01-07-03) gives each row as a dictionary by column name. Save it and run it:

```
.venv/bin/python total.py
```

```
rent            950.00
groceries       229.30
bills           111.29
eating out       46.30
transport        30.00
total          1366.89
```

That's a working solution to part of the need, in a dozen lines, free, built in minutes. Look at what it doesn't do, too. Recording spending means editing a CSV file by hand, which only someone comfortable with a text editor will do. Nothing checks what's typed (a category spelled `grocery` becomes a new category). It answers one question. Whether that's enough depends on the people, which is the point of 02-01-02. Commit it:

```
git add total.py
git commit -m "Total the month's spending by category"
```

```check
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- total.py should total the month: 1366.89.
run "cd ledger; .venv/Scripts/python total.py" stdout="groceries       229.30" -- Groceries come to 229.30.
run "cd ledger; git cat-file -e HEAD:total.py" -- Commit total.py.
```

## The shapes software comes in

The script is one shape. Here are the others, roughly from least to most to build and keep running:

| Kind | What it is | Good for |
|---|---|---|
| **Spreadsheet** | A grid with formulas | Small data, one or two people, changing needs, no programming |
| **Form plus spreadsheet** | A web form that adds rows to a sheet | Collecting entries from several people, simply |
| **No-code / low-code** | Apps assembled from blocks in a hosted tool | Simple data apps, without writing code |
| **Automation platform** | "When this happens, do that" between services | Moving data between tools you already use |
| **Off-the-shelf SaaS** | Someone else's app, rented | A common need that a product already meets |
| **Script** | A short program run by hand | One person's repeated task |
| **Command-line tool** | A script made solid: arguments, errors, tests (Kit) | Tasks people run often, and other programs run too |
| **Library** | Code for other code to call | Logic shared by several programs |
| **Notebook** | Code, results and notes together | Exploring data and explaining analysis |
| **BI dashboard** | Charts over a database, built in a tool | Reporting on data that already exists |
| **Web app, server-rendered** | Pages built on a server | Many users, any device, mostly forms and pages |
| **Web app, single-page** | An app in the browser that talks to a server | Rich, interactive use in the browser |
| **API / service** | A program other programs call over a network | Sharing data or logic between systems |
| **Desktop app** | A program installed on a computer | Offline use, local files, one machine |
| **Mobile app** | An app on a phone | On-the-go use, the phone's camera and location |
| **Browser extension** | Code that changes web pages you visit | Adding to sites you don't control |
| **Bot** | A program that lives in a chat | Quick actions where people already talk |
| **Plugin** | Code that extends another product | Adding a feature to a tool people already use |
| **Batch job** | A program run on a schedule, on a pile of data | Nightly reports, imports, clean-ups |
| **Queue worker** | A program that takes tasks from a queue, one by one | Slow or bursty work behind a service |

The further down the table, the more there is to build, secure, deploy and keep running, and the more people and devices it can serve. The shape follows from the need, never from what's fashionable or what the builder already knows.

## Configure, buy, glue, build

Across all those shapes, there are four kinds of effort:

- **Configure** something you have: a spreadsheet template, a setting in an app you already use. The least work. You live within what the tool allows.
- **Buy** (or adopt) a product someone else maintains: an app, a service, a library. Little work and someone else's upkeep, but you depend on them, their prices, and their choices about your data.
- **Glue** existing pieces together: a bank's export, Kit's tools, a spreadsheet, an automation. Moderate work. Every joint can break when one of the pieces changes.
- **Build** it: software you write and own. It does exactly what you need, and it's yours to maintain, test, secure and fix for as long as it's used.

For most of software's lifetime, the cost is that upkeep, not the first version: fixing, adapting, updating dependencies, explaining it to the next person. So "build" should win only when the need can't be met otherwise, or when owning it is worth the years of care.

```check
run "cd ledger; .venv/Scripts/python -c \"import subprocess; r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Everything so far should be committed.
```

## Your turn: lay out the options

Write `OPTIONS.md` in `ledger`: the household budget's candidate solutions, side by side, before any choice. Start with one line stating the need. Then give at least five options, of at least three different kinds of effort (configure, buy, glue, build), including the script you built. For each, a `###` heading naming it, then three lines:

```
Takes: what it would take to have it working
Gives: what the two people get
Costs: what it can't do, and what it costs over time
```

Don't choose yet: that's 02-01-02. Commit `OPTIONS.md`.

```hints
nudge: Go down the table of kinds and ask, for each, "could this meet the need, and what would it take?" Keep the ones that could. Then think about who looks after each one in year three.
concept: A spreadsheet (configure), a budgeting app (buy), the bank's export plus Kit plus a spreadsheet (glue), and building Ledger as a desktop app or a web app (build) cover all four kinds of effort. The script is a small build. For each, Costs should include upkeep and what happens when something changes (the bank's format, the app's price, the person who wrote it).
shape: # Ways to keep a household budget, a line stating the need, then ### A spreadsheet / Takes: … / Gives: … / Costs: …, and the same for the others.
answer: OPTIONS.md:
~~~markdown
# Ways to keep a household budget

The need: two people record what they spend, see where the money goes each month, and keep doing it for years.

### A spreadsheet

Takes: a shared spreadsheet file or online sheet, a column layout, and a few formulas for the totals.
Gives: something working this afternoon, that both people already know how to use.
Costs: nothing stops a typo in an amount or a category; two people editing a downloaded copy at once means two versions.

### Off-the-shelf budgeting app (buy)

Takes: choosing an app, an account each, maybe a subscription, and often linking a bank.
Gives: phone apps, bank import, charts, and someone else maintaining it.
Costs: the money; your data held by a company; categories and reports work its way, not yours; it can be discontinued.

### A script (this lesson's total.py)

Takes: a CSV file edited by hand, and a dozen lines of Python.
Gives: exactly the totals you want, free, under your control, in minutes.
Costs: only someone comfortable with a terminal and a text editor can use it; nothing checks what's typed into the file.

### Glue: bank export, Kit and a spreadsheet

Takes: the bank's CSV export each month, Kit's tools (or a short script) to tidy it, and a spreadsheet for the rest.
Gives: no typing of transactions; existing tools doing most of the work.
Costs: breaks whenever the bank changes its export format; someone has to run the steps every month.

### A desktop app (build: Ledger)

Takes: a program written and maintained by you: an interface, rules for what's valid, and storage.
Gives: entry with checking, your own reports, data on your own computer, no subscription.
Costs: weeks to build, and maintaining it for as long as you use it; only on the computer it's installed on.

### A web app (build)

Takes: everything the desktop app takes, plus a server, accounts and logins, and security work.
Gives: use from any device, both people at once.
Costs: the most work and the most to keep secure; a server to pay for and keep running.
~~~
Then git add OPTIONS.md and git commit -m "Lay out the options for a household budget". The tempting slip is listing only things to build, which skips the cheapest answers; another is writing Costs only as the first version's cost, leaving out the years of upkeep.
```

```check
file ledger/OPTIONS.md -- Write OPTIONS.md in ledger.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('OPTIONS.md').read_text(encoding='utf-8'); parts = t.split('### ')[1:]; print(len(parts) >= 5, all('Takes:' in p and 'Gives:' in p and 'Costs:' in p for p in parts))\"" stdout="True True" -- OPTIONS.md should have at least five options, each with Takes:, Gives: and Costs: lines.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('OPTIONS.md').read_text(encoding='utf-8').lower(); print('script' in t, 'spreadsheet' in t)\"" stdout="True True" -- The options should include the script you built and a spreadsheet.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:OPTIONS.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit OPTIONS.md.
```

**What these checks establish, and what they don't.** They check that Ledger exists as a repository with its own environment, made-up data stored byte for byte, a script whose totals are right, and an options file with the right shape: five or more options, each with what it takes, gives and costs. They can't judge the options: whether a cost is real, whether an option you dismissed would serve better, or whether you've left out the obvious answer. That judgement is the skill this lesson starts, and 02-01-02 tests it by making you choose, and defend the choice.

## What you can do now

- Start from the **need**, in the users' words, not from a solution.
- Software comes in many **shapes**, from a spreadsheet to a queue worker; each trades work and upkeep for reach.
- Four kinds of **effort**: configure, buy, glue, build. Building means owning it for years, and **most of software's cost is upkeep**.
- Lay out **several options side by side** (what each takes, gives and costs) before choosing.
- **Ledger** has begun: a repository, made-up data in whole cents, and its first, smallest solution.

```predict
question: A small charity wants volunteers to sign up for shifts. One volunteer offers to build a web app. What would you lay out before agreeing?
explain: The options from this lesson: a shared spreadsheet (configure), an online form adding rows to it (form plus spreadsheet), an existing volunteer-scheduling service (buy, perhaps with a charity discount), a calendar shared by the volunteers (configure), and the web app (build). For each, what it takes, gives and costs, especially who maintains the web app after that volunteer moves on, and who secures the volunteers' personal details it would hold. A web app might still win, but only against the alternatives, written down.
```

**Next:** 02-01-02 chooses. It weighs the options against the questions that decide them (users, data, change, lifespan, upkeep, risk), compares building with buying and configuring, tells a prototype from a product, and records the decision, and its reasons, in `DECISION.md`.
