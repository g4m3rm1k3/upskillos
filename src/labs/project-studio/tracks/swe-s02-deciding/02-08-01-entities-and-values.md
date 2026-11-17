---
title: "Entities and Values: Money as a Value Object"
runtime: python
---

The two coffees on the 7th of November have the same date, description and amount, and they're two transactions: delete one, and the other is still there. Two amounts of 4.50 are one amount: there's no sense in asking "which 4.50?". That difference, between things with an **identity** and things that are just **values**, is the first question of **domain modelling**: turning a real domain, a household's money, into code that behaves the way the domain does. Get it wrong and the code does odd things: it compares two transactions by their fields and merges the coffees, or it treats an amount as a bare number and lets anyone add a float to it, or write it wrongly. Ledger has a bug of exactly that kind, in the very first function the course wrote for it, waiting for the first negative amount. This lesson finds it, and fixes it the way domain modelling fixes such things: money becomes a **value object**, a small type that knows how money behaves.

**By the end you can:**

- Tell entities from value objects, and say what identity, equality and change mean for each.
- Build a value object that refuses wrong values, does its own arithmetic and writes itself.
- Recognise aggregates, lifecycles and domain events in a domain, and use the domain's words in code.
- Tell a rich model from an anemic one, and say what each costs.

**You need:** 02-02-02 (entities and keys), 02-06-02 (`__post_init__`, invariants), 02-07-02 (lifecycles), 02-05-01 (the vocabulary). Commands run inside `ledger`.

## The same, or the same one?

```predict
question: Two of Ledger's transactions have the same date, description and amount (the two coffees). Two amounts are both 4.50. Which pair is "the same"?
choice: Both pairs are the same
choice: The amounts are the same; the transactions are two different things
choice: Neither pair is the same
answer: The amounts are the same; the transactions are two different things
explain: A transaction is an entity: it has an identity (its id) that stays the same while its fields change (a corrected amount is still transaction 4), and two transactions with equal fields are still two. An amount is a value: it's nothing but its contents, so two 4.50s are interchangeable, and "changing" an amount means replacing it with another one.
```

An **entity** has an identity that lasts while its attributes change: a transaction, an account, a person. Equality means "the same one": compare ids. A **value object** is defined entirely by its contents: an amount, a date, a colour. Equality means "the same contents", and it never changes: you don't change 4.50, you replace it with 5.00. Value objects are where much of a domain's behaviour belongs, because they can be small, exact and tested to death.

## Money, scattered

Where does Ledger's money behaviour live now? Search for the arithmetic that turns cents into money and back:

```
git grep -n -e "// 100" -e "\* 100"
```

```
bank.py:62:    cents = int(whole) * 100 + int(part)
total.py:6:    return f"{cents // 100}.{cents % 100:02d}"
```

Two places, written in two lessons, each with its own idea of how money works. Look closely at the first, `total.py`'s `money`, from 02-01-01, and try it on a negative amount, which Ledger will meet as soon as a refund arrives:

```
.venv/bin/python -c "money = lambda cents: f'{cents // 100}.{cents % 100:02d}'; print(money(136689), money(-450), money(-5))"
```

(On Windows, `.venv/Scripts/python`.)

```predict
question: money(-450) should be -4.50. What does it print?
choice: -4.50
choice: -5.50
choice: 4.50
answer: -5.50
explain: Python's // rounds down, towards minus infinity, not towards zero: -450 // 100 is -5, and -450 % 100 is 50, so the two parts together say -5.50. For -5 cents it's -1 and 95: -1.95. The function was right for every amount Ledger had stored so far, all positive, which is why nothing caught it.
```

```
1366.89 -5.50 -1.95
```

Read the evidence: a refund of 4.50 would be written as 5.50 going the other way, and five cents back as almost two. The bug isn't carelessness so much as a missing concept: as long as money is a bare `int` with helper functions here and there, every helper must get every rule right on its own, and nothing ties them together or tests them as one.

## A value object

Give money a type of its own. Create `money.py`:

```python file=ledger/money.py
import dataclasses
import re

AMOUNT = re.compile(r"(-?)(\d+)\.(\d\d)")


# An amount of money, as a value object: two Moneys with the same cents are
# the same amount, a Money can't be changed once made, and it does the
# reading, adding and writing that money needs, so no other code has to
# handle bare cents. One currency (SPEC.md's A2).
@dataclasses.dataclass(frozen=True, order=True)
class Money:
    cents: int

    def __post_init__(self):
        if type(self.cents) is not int:
            raise TypeError(f"Money needs a whole number of cents, not {self.cents!r}")

    # "-4.50" is Money(-450): an optional minus, digits, a point, two digits.
    @classmethod
    def parse(cls, text):
        match = AMOUNT.fullmatch(text)
        if match is None:
            raise ValueError(f"{text!r} isn't an amount written like -12.34")
        sign, whole, part = match.groups()
        cents = int(whole) * 100 + int(part)
        return cls(-cents if sign else cents)

    # Money adds to Money and nothing else: Money + 4.5 is a TypeError.
    def __add__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return Money(self.cents + other.cents)

    def __sub__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return Money(self.cents - other.cents)

    def __neg__(self):
        return Money(-self.cents)

    # The sum of some amounts, and Money(0) for none.
    @staticmethod
    def total(amounts):
        result = Money(0)
        for amount in amounts:
            result = result + amount
        return result

    # 1366.89, and -4.50 for a negative amount: the sign first, then the
    # size's whole part and cents, so that -450 isn't written -5.50.
    def __str__(self):
        size = abs(self.cents)
        return f"{'-' if self.cents < 0 else ''}{size // 100}.{size % 100:02d}"
```

`frozen=True` makes a `Money` unchangeable and hashable, so it can be a dictionary key or a set member; `order=True` lets amounts be compared and sorted. Equality comes from the dataclass: two `Money`s are equal when their cents are, which is exactly a value object's equality. `__post_init__` (02-06-02) refuses anything but whole cents. `parse` is the one place an amount is read from text. `__add__` and `__sub__` accept only `Money`; returning `NotImplemented` for anything else makes Python raise its usual `TypeError` (`unsupported operand type(s) for +: 'Money' and 'float'`), so "money is never a float" now holds for arithmetic too. `total` adds up any number of amounts, starting from `Money(0)`. And `__str__` writes the sign first, then the size's whole part and cents, which is the fix. Save it, and try the amount that went wrong:

```
.venv/bin/python -c "from money import Money; print(Money(-450), Money(-5), Money.parse('-4.50') == Money(-450))"
```

It prints `-4.50 -0.05 True`.

```check
run "cd ledger; .venv/Scripts/python -c \"from money import Money; print(Money(-450), Money(-5), Money(136689), Money.parse('-4.50') == Money(-450))\"" stdout="-4.50 -0.05 1366.89 True" -- Money should write negative amounts correctly, and parse back to equal values.
run "cd ledger; .venv/Scripts/python -c \"from money import Money; Money(450) + 0.5\"" exit=1 stderr="unsupported operand type(s) for +: 'Money' and 'float'" -- Money shouldn't add to a float.
```

## Tests for money

A value object is the easiest thing in a program to test thoroughly: no files, no state, just values in and values out. Create `tests/test_money.py`:

```python file=ledger/tests/test_money.py
import dataclasses

import pytest

from money import Money


@pytest.mark.parametrize("text", ["1366.89", "0.00", "0.05", "-0.05", "-4.50", "-950.00"])
def test_an_amount_is_written_as_it_was_read(text):
    assert str(Money.parse(text)) == text


def test_a_negative_amount_is_written_with_its_sign_first():
    assert [str(Money(-450)), str(Money(-5))] == ["-4.50", "-0.05"]


def test_amounts_with_the_same_cents_are_the_same_amount():
    assert Money.parse("4.50") == Money(450)
    assert len({Money(450), Money.parse("4.50")}) == 1


def test_an_amount_cannot_be_changed():
    with pytest.raises(dataclasses.FrozenInstanceError):
        Money(450).cents = 500


@pytest.mark.parametrize("bad", [4.5, True, "450"])
def test_money_is_only_ever_whole_cents(bad):
    with pytest.raises(TypeError):
        Money(bad)


def test_money_adds_only_to_money():
    assert Money(450) + Money(50) == Money(500)
    with pytest.raises(TypeError):
        Money(450) + 0.5


def test_the_total_of_nothing_is_zero():
    assert Money.total([]) == Money(0)
    assert Money.total([Money(100), Money(-30)]) == Money(70)
```

The first test is a round trip (02-04-01) through six amounts, including the two small negatives that broke `money`. The others pin down what makes it a value object: equal cents are equal amounts (and one member of a set), it can't be changed, it holds only whole cents (`True` included), it adds only to money, and the total of nothing is zero. Save it and run it:

```
.venv/bin/python -m pytest -q tests/test_money.py
```

`14 passed`.

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_money.py" stdout="14 passed" -- The fourteen money tests should pass.
```

## Money in use

Now `total.py` stops doing its own money arithmetic. Replace `total.py` with:

```python file=ledger/total.py
import store
from money import Money

# Read the month's spending through store.py, and print the total for each
# category, largest first, then the month's total. Every amount is a Money,
# from the moment it's read to the moment it's written.
totals = {}
for row in store.transactions():
    totals[row["category"]] = totals.get(row["category"], Money(0)) + Money(int(row["cents"]))

for category, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True):
    print(f"{category:12} {str(amount):>9}")
print(f"{'total':12} {str(Money.total(totals.values())):>9}")
```

`money()` is gone. Each amount becomes a `Money` as it's read, totals are `Money` added to `Money`, `sorted` compares `Money`s directly (that's what `order=True` is for), and `str` writes them. Save it and run it:

```
.venv/bin/python total.py
```

It prints exactly what it printed in 02-01-01, ending `total          1366.89`: the same answers for every amount that was right before, and right answers for the ones that weren't. Run every test (`136 passed`), and commit:

```
git add money.py tests/test_money.py total.py
git commit -m "Make money a value object, and fix how negative amounts are written"
```

```check
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- total.py, using Money, should print the same total as always.
run "cd ledger; .venv/Scripts/python total.py" stdout="groceries       229.30" -- And the same category totals.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="136 passed" -- Every test, 136 in all, should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('def money' not in git('show', 'HEAD:total.py').stdout, git('cat-file', '-e', 'HEAD:money.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit money.py, its tests and total.py, with money() gone.
```

## Entities, aggregates and events

`Money` is one piece of a **domain model**. The rest of the vocabulary of domain modelling, applied to Ledger:

- **Entities** have identity: a transaction, an account, a category, each with an id (02-02-02) that never changes.
- **Value objects** have none: `Money`, a date, a `Status` (02-07-02). Prefer them wherever identity doesn't matter: they're simpler, safe to share, and easy to test.
- An **aggregate** is a cluster of entities and values that's changed as one, through one **root**. A transaction and its tag links (02-02-02's `transaction_tags`) are an aggregate with the transaction at the root: deleting a transaction must delete its links, and nothing should change a link without going through its transaction. The aggregate's boundary is where its invariants are kept.
- **Lifecycles** (02-07-02) belong to entities: a transaction goes from pending to reconciled; an amount never goes anywhere.
- **Domain events** are things that *happened*, named in the past tense, in the domain's words: *StatementImported*, *TransactionCleared*, *TransactionReconciled*. Recording them gives a history (02-08-02) and lets other parts react without being called directly.
- A **ubiquitous language** is the vocabulary (02-05-01) used in the code too: the class is `Money` because the spec says amounts; the enum says `reconciled` because the household says reconciled; `vocab.py` keeps them honest.

And one choice that runs through all of it. In an **anemic** model, the domain's types are bags of data and the rules live in functions elsewhere: `cents` is an `int`, and `money()`, `parse_amount()` and a sum somewhere each know a bit about money. In a **rich** model, the rules live with the data: `Money` parses, adds, refuses and writes. Rich models keep rules in one place, at the cost of more classes to learn; anemic ones are fine for data that has no rules, such as a row being read from a file.

```predict
question: An agent is asked to "add a monthly budget per category to Ledger". With Money as a value object in the code, what's the most likely difference in what it writes?
explain: It will see Money in total.py and reports, and most likely write budgets as Money too: compared with Money, formatted with str, refusing floats. In the anemic version it would meet bare ints and write its own formatting, quite possibly with the same // bug, a third copy. The code's own types are the strongest instruction an agent gets, stronger than any document: model the domain in the code, and the next builder follows the model.
```

**What else, and why not.** You could fix `money()` and leave money as an `int`: the bug goes, and the next helper someone writes can bring it back. You could use Python's `decimal.Decimal` for amounts: exact decimal arithmetic, a fine choice for money in general, but it still allows fractions of a cent, and it's a number, not money: it would still need a type around it to refuse floats and know its own format. You could carry a currency in `Money`: Ledger has one, by assumption A2; the day that changes, `Money` is the one place that does.

## Your turn: splitting a shared cost

Rent is shared between Sam and Alex. Two more pieces of money behaviour belong in `Money`:

- `Money.split(parts)`: a list of `parts` amounts that add up to **exactly** the original, differing by at most one cent, the larger ones first. 1.00 in three is 0.34, 0.33, 0.33; 950.00 in two is 475.00 each. Refuse anything but a whole number of parts, 1 or more, with a `ValueError`. Add tests for it to `tests/test_money.py`, including a negative amount and an amount smaller than the number of parts.
- `bank.py`'s `parse_amount` still reads amounts with its own regular expression and arithmetic, the second copy `git grep` found. Make it use `Money.parse`, keeping its `RowError` message exactly as it is.

Run every test. (One part of the test suite will notice the second change before you do: read what it says.) Then commit.

```hints
nudge: For split: how many cents does each part get if you divide evenly, and how many are left over? For parse_amount: what should happen to the ValueError that Money.parse raises?
concept: divmod(cents, parts) gives the even share and the remainder; the first `remainder` parts get one cent more, so the total is exact and the larger come first (for -100 in three, divmod gives -34 and 2, so the parts are -33, -33, -34). parse_amount catches ValueError and raises the same RowError as before, so the importer's messages don't change. The tests that break are the acceptance criteria: their fixture copies only bank.py and importer.py into a temporary folder, and bank.py now imports money.py. Copy every module instead.
shape: def split(self, parts): if type(parts) is not int or parts < 1: raise ValueError(...); share, left = divmod(self.cents, parts); return [Money(share + 1) if i < left else Money(share) for i in range(parts)]. In bank.py: from money import Money; def parse_amount(text): try: return Money.parse(text).cents except ValueError: raise RowError(...) from None. In tests/test_criteria.py's ledger fixture: for path in LEDGER.glob("*.py"): shutil.copy(path, tmp_path).
answer: In money.py, before __str__:
~~~python
    # Split into parts amounts that add up to exactly this one, differing by
    # at most a cent, the larger first: 1.00 in three is 0.34, 0.33, 0.33.
    def split(self, parts):
        if type(parts) is not int or parts < 1:
            raise ValueError(f"can't split into {parts!r} parts")
        share, left = divmod(self.cents, parts)
        return [Money(share + 1) if i < left else Money(share) for i in range(parts)]
~~~
In bank.py, add `from money import Money`, remove AMOUNT, and replace parse_amount with:
~~~python
# "-4.50" is -450 cents, read by Money, the one place amounts are read.
def parse_amount(text):
    try:
        return Money.parse(text).cents
    except ValueError:
        raise RowError(f"amount {text!r} isn't written like -12.34 (a minus for money out, two decimals)") from None
~~~
In tests/test_criteria.py, the ledger fixture's copying loop becomes `for path in LEDGER.glob("*.py"): shutil.copy(path, tmp_path)`. In tests/test_money.py:
~~~python
@pytest.mark.parametrize(("cents", "parts", "expected"), [(100, 3, [34, 33, 33]), (95000, 2, [47500, 47500]), (5, 2, [3, 2]), (-100, 3, [-33, -33, -34]), (2, 4, [1, 1, 0, 0])])
def test_a_split_adds_up_exactly_larger_first(cents, parts, expected):
    shares = Money(cents).split(parts)
    assert [share.cents for share in shares] == expected
    assert Money.total(shares) == Money(cents)


@pytest.mark.parametrize("parts", [0, -1, 1.5])
def test_a_split_needs_a_whole_number_of_parts(parts):
    with pytest.raises(ValueError):
        Money(100).split(parts)
~~~
Then git add money.py bank.py tests/test_money.py tests/test_criteria.py and git commit -m "Split money exactly, and read every amount through Money". The tempting slip for split is round(self.cents / parts): 100 in three is then 33 three times, and a cent disappears.
```

```check
run "cd ledger; .venv/Scripts/python -c \"from money import Money; print([m.cents for m in Money(100).split(3)], [m.cents for m in Money(-100).split(3)], Money.total(Money(95001).split(2)).cents)\"" stdout="[34, 33, 33] [-33, -33, -34] 95001" -- split should add up exactly, larger parts first.
run "cd ledger; .venv/Scripts/python -c \"from money import Money; import random; rng = random.Random(1); print(all(Money.total(Money(c).split(p)) == Money(c) and max(s.cents for s in Money(c).split(p)) - min(s.cents for s in Money(c).split(p)) <= 1 for c, p in [(rng.randint(-10**6, 10**6), rng.randint(1, 12)) for _ in range(500)]))\"" stdout="True" -- On 500 random amounts and part counts, every split should add up exactly and differ by at most a cent.
run "cd ledger; .venv/Scripts/python -c \"from money import Money; Money(100).split(0)\"" exit=1 stderr="ValueError" -- split(0) should be refused with a ValueError.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('bank.py').read_text(encoding='utf-8'); print('Money.parse' in t, '* 100' not in t)\"" stdout="True True" -- bank.py should read amounts through Money.parse, with no arithmetic of its own.
run "cd ledger; .venv/Scripts/python importer.py bank/2026-11.csv" exit=1 stdout="line 4: amount '-4,50' isn't written like -12.34 (a minus for money out, two decimals)" -- The importer's message for a bad amount should be unchanged.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="passed" without="failed" -- Every test should pass, the acceptance criteria included.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('def split' in git('show', 'HEAD:money.py').stdout, 'Money.parse' in git('show', 'HEAD:bank.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit money.py, bank.py and the tests.
```

**What these checks establish, and what they don't.** They check that `Money` writes negative amounts correctly, round-trips, refuses floats and bools, adds only to money, and that `total.py` gives the same output through it; that `split` is exact and fair on five hundred random cases; and that amounts are now read in one place, without changing a message. They can't check that the model is the right one: whether a category's budget is a `Money` or a rule, whether a transaction and its tags really change together. Those are questions about the household, and 02-09-01 turns them into the structure of the code.

## What you can do now

- An **entity** has an identity that lasts through change; a **value object** is only its contents, equal by contents, and never changes.
- Make domain concepts **value objects**: they refuse wrong values, do their own arithmetic, and write themselves. Python: a frozen dataclass with `__post_init__`, operators that return `NotImplemented` for the wrong types.
- Behaviour scattered over helpers drifts (`money()`'s `//` bug); in a **rich** model, the rules live with the data, in one place, tested once.
- An **aggregate** is changed as one, through its **root**; **domain events** are past-tense facts in the domain's words; a **ubiquitous language** is the vocabulary used in the code.
- The code's own types are the strongest instruction the next builder, or agent, gets.

**Next:** 02-08-02 models money's companions: time, history and rules. Dates without times, recurring transactions, categories as rules or as data, and an audit history of every edit, so a corrected transaction remembers what it was.
