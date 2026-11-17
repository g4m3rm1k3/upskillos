---
title: "One Source of Truth: Derived Data, Two Writers and Backups"
runtime: python
---

A bank shows a balance at the top of the page and the transactions underneath. If the balance is stored, as a number of its own, then every deposit, payment, correction and refund has to update it too, every time, forever, and the day one path forgets, the balance and the transactions disagree. Which is right? Nobody can say, because there are now two answers to one question. This lesson is about where the true answer lives. Ledger's totals become **derived** data, worked out from the transactions and never stored. Then it looks at the other ways one truth becomes two: two programs writing the same file at once, and a disk that fails with the only copy on it. Blockfall gets data of its own to keep: its best score, saved in the browser between visits.

**By the end you can:**

- Tell the source of truth from derived data, and decide when a derived copy is worth storing (denormalization).
- Describe a dataset's access patterns and use them to justify a design.
- Show a lost update between two writers, and prevent it with a lock.
- Describe a dataset's lifecycle, and make a backup that has been proved by restoring it.
- Save data in the browser as JSON, and read it back safely.

**You need:** 02-02-02 (Ledger's tables, `store.py`, `check_data.py`); 01-12-02 (Blockfall's `Game`). Commands run inside `ledger`, and in the task inside `blockfall`.

## Derived, never stored

How much has each person spent? The transactions already say, so work it out from them. Create `reports.py`:

```python file=ledger/reports.py
import store


# Derived data: worked out from the transactions each time it's asked for,
# never stored, so it can never disagree with them.
def spent_by(field, folder=store.FOLDER):
    totals = {}
    for row in store.transactions(folder):
        totals[row[field]] = totals.get(row[field], 0) + int(row["cents"])
    return totals


if __name__ == "__main__":
    print(spent_by("who"))
```

`spent_by("who")` totals by person, `spent_by("category")` by category: the field to group by is an argument. Save it and run it:

```
.venv/bin/python reports.py
```

(On Windows, `.venv/Scripts/python`.)

```
{'Sam': 110339, 'Alex': 26350}
```

The **source of truth** is the one place a fact is recorded, and the place to go when two answers disagree. For Ledger, that's the transactions. Everything worked out from them is **derived**: totals, balances, reports. Derived data can be recomputed at any time, so it can be thrown away, and if it's never stored it can never be stale.

```check
run "cd ledger; .venv/Scripts/python reports.py" stdout="{'Sam': 110339, 'Alex': 26350}" -- reports.py should derive what each person spent: Sam 110339 cents, Alex 26350.
```

## Normalized or not

Storing each fact once, as 02-02-02 did, is **normalization**. Storing a copy on purpose, such as a `spent` column in `accounts.csv` so a report needn't add anything up, is **denormalization**. It makes reading faster and every write harder: each new, changed or deleted transaction must also update the copy, and any program that forgets makes the copy wrong, silently.

```predict
question: Suppose accounts.csv had a stored "spent" column, kept up to date by every program that adds a transaction. Then Sam corrects a typo in a transaction's amount by editing transactions.csv by hand. What happens?
choice: The spent column updates itself
choice: The spent column is now wrong, and nothing says so
choice: check_data.py reports it
answer: The spent column is now wrong, and nothing says so
explain: A stored copy is updated only by code written to update it. A hand edit, a new program, or a bug in one write path leaves it stale. check_data.py checks keys, not sums, so it passes. The derived total from reports.py is right, because it reads the transactions each time.
```

So when is a stored copy worth it? When the question is asked far more often than the data changes, and working it out each time is too slow. That's a question about **access patterns**: which questions are asked, how often, over how much data, and how often the data is written. Ledger's: a few reports a day, a few writes a week, at most 7,200 transactions. Whether deriving is too slow is a measurement, not a guess. Create `timing.py`:

```python file=ledger/timing.py
import csv
import os
import shutil
import tempfile
import time

import reports

# Ten years of made-up transactions (7,200) in a temporary copy of data/,
# to see how long deriving the totals takes at full size.
folder = tempfile.mkdtemp()
shutil.copytree("data", folder, dirs_exist_ok=True)
with open(os.path.join(folder, "transactions.csv"), "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["id", "date", "account_id", "category_id", "cents", "note"])
    for i in range(1, 7201):
        writer.writerow([i, "2026-11-01", i % 2 + 1, i % 5 + 1, 1000 + i % 5000, ""])

start = time.perf_counter()
totals = reports.spent_by("who", folder)
print(f"{sum(totals.values())} cents, derived in {time.perf_counter() - start:.3f} s")
```

It copies `data/` to a temporary folder (`tempfile.mkdtemp`), so the real data is never touched, replaces the transactions with 7,200 made-up ones, and times `spent_by` with `time.perf_counter` (01-02-04). `i % 2 + 1` alternates the accounts 1, 2, 1, 2, and `i % 5 + 1` cycles through the five categories. Save it and run it:

```
.venv/bin/python timing.py
```

```
22118600 cents, derived in 0.055 s
```

The time varies from run to run and machine to machine (0.047 s and 0.055 s on the machine this lesson was written on); the order of magnitude is what matters. Ten years of data, derived in about a twentieth of a second. A stored total would save almost nothing and could go wrong. Real systems do denormalize, for reports over millions of rows and for pages read thousands of times a second, but they treat the copy as a **cache**: something that can always be rebuilt from the source of truth, and is rebuilt when in doubt.

```check
run "cd ledger; .venv/Scripts/python timing.py" stdout="22118600 cents, derived in" -- timing.py should derive the totals of 7,200 made-up transactions (22118600 cents).
```

## Two writers

There's another way to get two truths: two programs writing the same file at the same moment. Most programs change a file by reading it all, changing the copy in memory, and writing it all back. Watch what happens when two do that at once. Create `race.py`:

```python file=ledger/race.py
import csv
import multiprocessing
import os
import shutil
import tempfile
import time


# Add one transaction the way most programs change a file: read it all,
# change the copy in memory, write it all back.
def add_row(path, note, use_lock):
    if use_lock:
        lock = take_lock(path)
    with open(path, newline="", encoding="utf-8") as file:
        rows = list(csv.reader(file))
    time.sleep(0.5)  # the moment between reading and writing
    rows.append([str(len(rows)), "2026-11-30", "1", "2", "100", note])
    with open(path, "w", newline="", encoding="utf-8") as file:
        csv.writer(file).writerows(rows)
    if use_lock:
        release_lock(path, lock)


# A lock file: creating it fails if it already exists (O_EXCL), so only one
# writer at a time can hold it. The others wait and try again.
def take_lock(path):
    while True:
        try:
            return os.open(path + ".lock", os.O_CREAT | os.O_EXCL)
        except FileExistsError:
            time.sleep(0.01)


def release_lock(path, lock):
    os.close(lock)
    os.remove(path + ".lock")


# Two writers at once, on a temporary copy of the transactions.
def race(use_lock):
    folder = tempfile.mkdtemp()
    path = os.path.join(folder, "transactions.csv")
    shutil.copy(os.path.join("data", "transactions.csv"), path)
    writers = [multiprocessing.Process(target=add_row, args=(path, note, use_lock)) for note in ["Sam's", "Alex's"]]
    for writer in writers:
        writer.start()
    for writer in writers:
        writer.join()
    with open(path, newline="", encoding="utf-8") as file:
        rows = list(csv.reader(file))[1:]
    return len(rows), [row[5] for row in rows[10:]]


if __name__ == "__main__":
    print("without a lock:", race(False))
    print("with a lock:   ", race(True))
```

`add_row` is one writer. The `time.sleep(0.5)` stands for the moment between reading and writing; in a real program it's shorter, but never zero, and a short window is only a rarer failure, not a fix. `multiprocessing.Process` starts a separate Python process running a function, so the two writers really are two programs (01-06-02's processes), started together and waited for with `join`. On Windows, a process started this way runs the file again from the top, which is why the `if __name__ == "__main__":` guard (01-01-02) isn't optional here. `race` works on a temporary copy and returns how many transactions there are afterwards, and the notes of any after the first ten.

```predict
question: The file starts with 10 transactions, and two writers each add one at the same moment, without a lock. How many transactions are there afterwards?
answer: 11
explain: Both writers read the file while it has 10 transactions. Each adds its own row to its own copy in memory, and each writes its copy back. The second write replaces the first, so the file ends with 10 plus one, and the other writer's row is gone. Neither program reports an error, because neither did anything wrong on its own. This is a lost update.
```

Save it and run it (it takes a couple of seconds):

```
.venv/bin/python race.py
```

```
without a lock: (11, ["Alex's"])
with a lock:    (12, ["Sam's", "Alex's"])
```

Read the evidence. Without a lock, one transaction is lost: here Sam's, but which one is lost depends on which process writes last, and that can change from run to run. Both writers reported success. With a lock, both rows are there. The lock works because `os.open` with `O_CREAT | O_EXCL` creates the lock file only if it doesn't exist yet, and the operating system does that check and the creation as one step, so two writers can't both succeed. The second waits until the first removes the file.

Locks have costs of their own. A program that crashes while holding the lock leaves the file behind, and every later writer waits forever, so a real program must notice an old lock and say so. Databases solve all of this properly, with **transactions** that let many writers change data safely at once; that's one of the main reasons to use one (02-02-01's "multiple writers" sign). Ledger, one person at a time on one computer, needs only the lock.

```check
run "cd ledger; .venv/Scripts/python race.py" stdout="with a lock:    (12," -- With a lock, both writers' transactions should be kept: 12.
run "cd ledger; .venv/Scripts/python -c \"import store; print(len(store.read('transactions')))\"" stdout="10" -- race.py works on a temporary copy: Ledger's own data still has 10 transactions.
```

## Lifecycle and backups

Data has a **lifecycle**: it's created, read, changed, kept for a while, maybe archived, and eventually maybe deleted. For Ledger's transactions:

| Stage | For Ledger |
|---|---|
| **Created** | Typed in, or imported from the bank (`IMPORT.md`) |
| **Changed** | Corrections, usually within days |
| **Kept** | Read by reports for years |
| **Archived** | Old years could become read-only, never changed again |
| **Deleted** | Probably never, for a household; data about other people often must be deleted after a time, by law or by promise |

Asking these questions early decides things now: if old years are never changed, they can be stored differently; if some data must be deleted on request, it mustn't be copied everywhere.

Every stage depends on the data still existing. Git keeps what was committed, but on the same disk, and only what was committed. A **backup** is a copy kept somewhere else, from which the data can be brought back. Create `backup.py`:

```python file=ledger/backup.py
import filecmp
import os
import shutil
import tempfile
import time

# Copy data/ into a zip file outside the repository, named by the date and
# time. A copy on the same disk protects against mistakes, not against
# losing the disk: copy the zips somewhere else too.
BACKUPS = os.path.join("..", "ledger-backups")
os.makedirs(BACKUPS, exist_ok=True)
archive = shutil.make_archive(os.path.join(BACKUPS, "data-" + time.strftime("%Y%m%d-%H%M%S")), "zip", "data")

# A backup is a backup only once it has been restored: unpack it, and
# compare every file with the original, byte for byte.
restored = tempfile.mkdtemp()
shutil.unpack_archive(archive, restored)
names = sorted(os.listdir("data"))
same, different, missing = filecmp.cmpfiles("data", restored, names, shallow=False)
print(archive)
print(f"{len(same)} of {len(names)} files restored identical")
```

`shutil.make_archive` zips the `data` folder into `../ledger-backups/`, beside `ledger` in the course folder and outside its repository, named by the date and time (`time.strftime`). Then the part most backup schemes skip: it unpacks the zip into a temporary folder and compares every file with the original. `filecmp.cmpfiles` sorts the names into three lists, identical, different and missing; `shallow=False` makes it compare the bytes, not just sizes and dates. Save it and run it:

```
.venv/bin/python backup.py
```

```
…\ledger-backups\data-20261116-201821.zip
5 of 5 files restored identical
```

The name shows the moment you ran it. Many people discover that their backups don't work on the day they need one: the job had been failing, or saved the wrong folder, or the copies can't be opened. A backup you've restored is evidence; one you haven't is a hope. The usual rule for data that matters is three copies, on two kinds of storage, one of them somewhere else: here, the data, the zip, and a copy of the zip off the computer.

Commit the reports, the experiments and the backup script (the backups themselves are outside the repository):

```
git add reports.py timing.py race.py backup.py
git commit -m "Derive totals, show a lost update, and back up the data"
```

```check
run "cd ledger; .venv/Scripts/python backup.py" stdout="5 of 5 files restored identical" -- backup.py should zip data/ outside the repository and prove the zip by restoring it: 5 of 5 files identical.
run "cd ledger; .venv/Scripts/python -c \"import glob; print(len(glob.glob('../ledger-backups/data-*.zip')) > 0)\"" stdout="True" -- The backups should be in ledger-backups, beside ledger.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(all(git('cat-file', '-e', 'HEAD:' + n).returncode == 0 for n in ['reports.py', 'timing.py', 'race.py', 'backup.py']), git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit reports.py, timing.py, race.py and backup.py.
```

## Writing it down

`STORAGE.md`'s trigger "data in one file refers to data in another" happened in 02-02-02. A decision record isn't edited when its decision changes, because it records what was decided and why at the time; a new record replaces it and says so. Create `DATA.md`:

```markdown file=ledger/DATA.md
# Decision: the shape of Ledger's data, and keeping it safe

Decided 2026-11-16, by Sam and Alex. Replaces STORAGE.md, whose trigger "data in one file refers to data in another" has happened.

### Context

Ledger's data is now five CSV tables in data/ (accounts, categories, transactions, tags, transaction_tags), each fact stored once and referred to by id. Only store.py reads them; check_data.py checks their keys. Ledger does not write data yet.

### Options considered

- Store totals and balances next to the transactions: quick to read; every change must update them too, or they disagree.
- Derive totals and balances from the transactions every time: always right; 7,200 transactions take about 0.05 s (timing.py).
- Several programs writing the files freely: simple; two writers at once lose a change (race.py).
- One writer at a time, holding a lock file: no lost changes; a lock left behind by a crash must be removed by hand.
- Git as the only copy of old data: it already exists; it holds only what was committed, on the same disk.
- Zipped backups, restored to prove them, and copied off the computer: survives a lost disk; someone has to do it.

### Decision

The transactions are the source of truth. Totals and balances are derived every time and never stored. A program that writes the data holds data/.lock while it does. After each session of changes, run backup.py, and copy the newest backup off the computer once a month.

### Why

Deriving costs a twentieth of a second at ten years' size, so storing derived numbers would buy nothing and risk disagreement. The lock costs a few lines and prevents the one failure that loses data silently. Backups protect against what Git does not: a lost or broken disk, and changes never committed.

### Consequences

- Every report reads every transaction. That is fine at our size, and would need revisiting at a hundred times it.
- A crash while writing can leave data/.lock behind, and Ledger must say so rather than wait forever.
- A backup is only as recent as the last time someone ran backup.py.

### Revisit when

- Deriving a report takes longer than a second.
- A second program, or a second computer, needs to write.
- A backup fails to restore identical.
```

Every claim in it points at something you ran: `timing.py` for the speed, `race.py` for the lost update, `backup.py` for the restore. A record whose reasons can be rerun is much harder to argue with, or to misread, than one that says "we felt CSV was fine". Hand this file to someone extending Ledger, and the rules for any new code that writes data are already written: hold the lock, store no totals, keep the backup working.

**What else, and why not.** Saving after every change to a second file, `transactions.csv.bak`, is a backup on the same disk, overwritten each time, so it keeps one bad version as faithfully as a good one. A cloud-synced folder copies files off the computer, but it also copies a deletion or a corruption within seconds, so on its own it isn't a backup either; it's a second copy of the current state. Versioned backups, several dated copies, are what let you go back to before a mistake you noticed late.

Commit it:

```
git add DATA.md
git commit -m "Record the shape of Ledger's data and how it's kept safe"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('DATA.md').read_text(encoding='utf-8'); print(all(h in t for h in ['### Context', '### Options considered', '### Decision', '### Why', '### Consequences', '### Revisit when']), 'STORAGE.md' in t.split('###')[0])\"" stdout="True True" -- DATA.md should have the six sections and say, before them, that it replaces STORAGE.md.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:DATA.md').returncode == 0, git('cat-file', '-e', 'HEAD:STORAGE.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit DATA.md, keeping STORAGE.md as the record of the earlier decision.
```

## Your turn: Blockfall remembers its best

Blockfall forgets everything when the page is reloaded. Make it remember the most rows ever cleared, between visits, using the browser's `localStorage`: a small store of text values by key, kept per site (each file opened from disk counts as its own site in most browsers). `localStorage.setItem(key, text)` saves, and `localStorage.getItem(key)` gives the text back, or `null` if nothing is saved. It holds only text, so store a JSON object, `JSON.stringify` going in and `JSON.parse` coming out.

In `blockfall/game.js`, outside the `Game` class (the game's rules shouldn't depend on where anything is stored):

- `loadBest()` returns the saved best number of rows, or `0` when nothing is saved, **or when what's saved can't be read** (not JSON, or no whole number of rows in it). Data read from storage is data from outside your program: it can be from an older version, edited by hand, or broken.
- `saveBest(rows)` saves `{"rows": rows, …}` under the key `blockfall.best`. Anything else you'd like to keep, such as the date, can go in the same object.
- A top-level `let best = loadBest();`, and after every key's action, if `game.clearedCount()` is more than `best`, update `best` and save it.
- The board shows `Best: ` and the number, below `Held:`.

Reload `index.html`, clear a row, reload again: `Best: 1` should still be there. In the console, `localStorage.getItem("blockfall.best")` shows what's stored. Commit `game.js` in `blockfall`.

```hints
nudge: Write loadBest first, and try it in the console against three things: nothing saved, a good save, and localStorage.setItem("blockfall.best", "{oops"). Only the first two should be easy.
concept: JSON.parse throws on text that isn't JSON, so loadBest needs try/catch. JSON.parse(null) gives null, so "nothing saved" needs its own case, or optional chaining (saved?.rows). Number.isInteger rejects a missing or wrong-typed rows. The best score is the source of truth here: the games themselves aren't stored, so it can't be derived from anything, and saving it is the only way to keep it. It's read once, when the page loads, and written only when beaten, so localStorage's small, synchronous store is plenty.
shape: const BEST_KEY = "blockfall.best"; function loadBest() { try { const saved = JSON.parse(…); return Number.isInteger(saved?.rows) ? saved.rows : 0; } catch { return 0; } } function saveBest(rows) { localStorage.setItem(BEST_KEY, JSON.stringify({ rows: rows, … })); } let best = loadBest(); then in draw a fillText for "Best: " + best, and in the keydown handler, after action(), the comparison.
answer: In game.js, after const game = new Game();:
~~~javascript
// The best number of rows cleared, kept in the browser's storage between
// visits, as JSON. The Game itself never touches storage.
const BEST_KEY = "blockfall.best";

// The saved best, or 0 when nothing is saved or what is saved is unreadable.
function loadBest() {
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY));
    return Number.isInteger(saved?.rows) ? saved.rows : 0;
  } catch {
    return 0;
  }
}

function saveBest(rows) {
  localStorage.setItem(BEST_KEY, JSON.stringify({ rows: rows, saved: new Date().toISOString().slice(0, 10) }));
}

let best = loadBest();
~~~
In draw, after the Held line:
~~~javascript
  context.fillText("Best: " + best, 8, 64);
~~~
In the keydown handler, between action(); and draw();:
~~~javascript
  if (game.clearedCount() > best) {
    best = game.clearedCount();
    saveBest(best);
  }
~~~
Then, in blockfall, git add game.js and git commit -m "Remember the best number of rows between visits". The tempting slips: JSON.parse with no try (one broken save and the page never starts again), and putting the storage calls inside Game, which ties the rules to the browser and makes them harder to test.
```

```check
page blockfall/index.html "(localStorage.clear(), saveBest(4), JSON.parse(localStorage.getItem('blockfall.best')).rows)" 4 errors=none -- saveBest(4) should store JSON with rows 4 under blockfall.best.
page blockfall/index.html "(localStorage.clear(), loadBest())" 0 errors=none -- With nothing saved, loadBest() should give 0.
page blockfall/index.html "(localStorage.setItem('blockfall.best', JSON.stringify({ rows: 7 })), loadBest())" 7 errors=none -- loadBest() should read a saved best back: 7.
page blockfall/index.html "(localStorage.setItem('blockfall.best', '{not json'), loadBest())" 0 errors=none -- loadBest() should give 0, not throw, when what's saved isn't JSON.
page blockfall/index.html "(localStorage.setItem('blockfall.best', JSON.stringify({ rows: 'many' })), loadBest())" 0 errors=none -- loadBest() should give 0 when the saved rows isn't a whole number.
page blockfall/index.html "(() => { localStorage.clear(); best = loadBest(); for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'ArrowDown', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.clearedCount(), best, JSON.parse(localStorage.getItem('blockfall.best')).rows]; })()" [1,1,1] errors=none -- Clearing a row should raise best to 1 and save it.
page blockfall/index.html "(() => { localStorage.setItem('blockfall.best', JSON.stringify({ rows: 5 })); best = loadBest(); for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'ArrowDown', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [best, JSON.parse(localStorage.getItem('blockfall.best')).rows]; })()" [5,5] errors=none -- A game below the best shouldn't lower it.
page blockfall/index.html "(() => { const seen = []; const real = context.fillText.bind(context); context.fillText = (text, x, y) => { seen.push(text); real(text, x, y); }; best = 3; draw(); context.fillText = real; return seen.includes('Best: 3'); })()" true errors=none -- The board should show Best: and the number.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [16,0] errors=none -- Every Blockfall test should still pass.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('loadBest' in git('show', 'HEAD:game.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit game.js in blockfall.
```

**What these checks establish, and what they don't.** They check that totals are derived and correct, that deriving ten years takes a fraction of a second, that the lock keeps both writers' rows (the run without a lock is shown, not checked, because whether a race loses a row depends on timing), that the backup restores identical, that `DATA.md` replaces `STORAGE.md` properly, and that Blockfall saves, reloads and shows its best and survives a broken save. They can't check that you'd choose to derive rather than store for a different access pattern, or that your backups actually leave the computer. A backup plan that passes every check and is never run protects nothing.

## What you can do now

- Every fact has one **source of truth**. Data worked out from it is **derived**: compute it, don't store it, unless a measurement says you must, and then treat the copy as a **cache** you can rebuild.
- **Normalization** stores each fact once; **denormalization** stores copies for reading speed, at the cost of every write keeping them right.
- **Access patterns** (what's asked, how often, over how much, against how often it's written) decide a design, and they're measured, not guessed.
- **Two writers** who each read, change and write back a whole file lose an update, silently. A **lock** makes them take turns; databases use **transactions**.
- Data has a **lifecycle**: created, changed, kept, archived, deleted. Ask about each stage early.
- A **backup** is a copy somewhere else that you've **restored** at least once. Three copies, two kinds of storage, one off-site.
- Data read back from storage is **outside input**: parse it carefully, and have an answer for when it's broken.

```predict
question: An online shop stores each product's stock count, and the order page does "read the count, subtract one, write it back". On a busy day, the shop sells 105 of a product it had 100 of. What happened, and what are two ways to fix it?
explain: Lost updates between concurrent writers: two orders read the same count (say 7), each wrote back 6, and one sale never reduced the count, so the count stayed above zero while the real stock ran out. One fix is to make the change one indivisible step in the database (UPDATE … SET count = count - 1 WHERE count > 0, inside a transaction), so two orders can't both read the old value. Another is a lock on the product's row while an order changes it. Either way, the database, not the page, decides what the count is.
```

**Next:** 02-03-01 turns to the mathematics underneath data. Sets, membership, cardinality and the algebra of sets, Cartesian products and multisets: the ideas behind every "is this already here?", "what's in both?" and "what's missing?". Kit gains `uniq` and `diff` for CSV files.
