# Lesson 2.4: Access Control — Private/Public

*Phase 2 — What an "Object" Actually Is*
*Python's "just a convention" (`_x`) becomes enforced.*

---

## The Python anchor

Python has a convention for "please don't touch this from outside the class":

```python
class BankAccount:
    def __init__(self, balance):
        self._balance = balance   # underscore = "internal, please don't touch"

account = BankAccount(100)
account._balance = -999999   # ...nothing stops you. Nothing at all.
```

That leading underscore is a social contract, not a rule. Python trusts you to respect it, and the language enforces absolutely nothing — `account._balance = -999999` compiles, runs, and silently corrupts your object exactly as much as any other line of code. C++ can do genuinely better than this, and this lesson is about the mechanism that does it.

## `public` and `private`

Every member of a class — field or function — belongs to a section marked `public:` or `private:`. Members in a `private:` section simply cannot be accessed from outside the class at all. Not "shouldn't be" — *cannot be*, enforced by the compiler, a real compile error if you try:

```cpp
class BankAccount {
private:
    double balance;   // cannot be touched from outside this class

public:
    BankAccount(double startingBalance) {
        balance = startingBalance;
    }

    void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    void withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
        } else {
            std::cout << "Withdrawal denied" << std::endl;
        }
    }

    double getBalance() {
        return balance;
    }
};
```

```cpp
int main() {
    BankAccount account(100);
    account.deposit(50);
    account.withdraw(30);
    std::cout << account.getBalance() << std::endl;   // 120

    // account.balance = -999999;   // COMPILE ERROR — balance is private, no exceptions
    return 0;
}
```

Try uncommenting that last line and compiling. The error isn't a warning, a lint suggestion, or a runtime check — your program simply will not build. This is the actual, enforced version of what Python's underscore convention only gestures at.

## Why this matters: protecting invariants

An **invariant** is a rule about an object's internal state that should always be true. For `BankAccount`, the invariant is something like "`balance` should never become negative through normal use." Look at `withdraw()` again — the check `amount <= balance` exists specifically to protect that invariant. But that check only *works* if `balance` can only ever be changed *through* `deposit()` and `withdraw()` — if outside code could reach in and set `balance = -999999` directly, the entire invariant is meaningless, no matter how carefully `withdraw()` was written.

This is the real reason access control matters, and it directly connects to the very first `IntArray` bug you fixed back in Lesson 2.3: an object's fields and the code that maintains their correctness need to be inseparable, or the correctness guarantee is worthless. `private` is what makes that separation actually enforceable, rather than a hopeful convention.

## Applying this to `IntArray`

Go back to `IntArray` from Lessons 2.1–2.3. As written, `data`, `size`, and `capacity` are all `public` — meaning outside code can do this:

```cpp
IntArray numbers;
numbers.pushBack(1);
numbers.pushBack(2);
numbers.size = 1000;   // LIES. size now claims 1000 elements exist. Only 2 actually do.
numbers.pushBack(3);   // reads/writes based on a false size — undefined behavior
```

Nothing in Lessons 2.1–2.3 prevented this. The invariant "`size` accurately reflects how many valid elements are in `data`" was never actually protected — it just happened not to get violated in the examples so far. Fix it:

```cpp
class IntArray {
private:
    int* data;
    int size;
    int capacity;

public:
    IntArray() {
        data = nullptr;
        size = 0;
        capacity = 0;
    }

    ~IntArray() {
        delete[] data;
    }

    void pushBack(int value) {
        if (size == capacity) {
            int newCapacity = (capacity == 0) ? 1 : capacity * 2;
            int* newData = new int[newCapacity];
            for (int i = 0; i < size; i++) newData[i] = data[i];
            delete[] data;
            data = newData;
            capacity = newCapacity;
        }
        data[size] = value;
        size++;
    }

    int get(int index) {
        if (index < 0 || index >= size) {
            std::cerr << "Index out of bounds!" << std::endl;
            return -1;
        }
        return data[index];
    }

    int getSize() {
        return size;
    }
};
```

Now `numbers.size = 1000;` is a compile error. The *only* way `size` can ever change is by calling `pushBack()`, which is written to keep `size` and `capacity` honest, together, every time. Notice a small but important addition: `getSize()`, a public function whose entire job is to let outside code *read* `size` safely, without being able to *write* it. This pattern — private data, plus narrow, deliberate public functions to interact with it — is called **encapsulation**, and it's the actual mechanism, not just the vibe, behind "objects protect their own data."

## Why this doesn't fully exist in Python

Python has real name-mangling for double-underscore names (`__balance` becomes `_ClassName__balance` internally), which raises the friction slightly — but it's still circumventable with effort, and single-underscore `_balance` (the far more common convention) is purely cosmetic. This isn't Python being poorly designed; it reflects a genuinely different philosophy sometimes summarized as "we're all consenting adults here" — Python trusts you not to reach into internals, and mostly, culturally, that works fine. C++ instead makes the boundary a hard, compiler-enforced wall. Neither approach is objectively correct — but now that you've felt the `IntArray.size = 1000` bug directly, you have a concrete feel for exactly what C++'s enforcement is buying you.

## Try it yourself

**1. Build the `BankAccount` class above and confirm the compile error is real** — uncomment the direct `balance` access and watch your build fail. Read the exact wording of the error your compiler gives you; you'll see this same phrasing constantly for the rest of the curriculum.

**2. Build the `private` version of `IntArray` above and confirm two things:** that `numbers.pushBack(...)` and `numbers.get(...)` still work exactly as before, and that `numbers.size = 1000;` now fails to compile.

**3. Add a deliberately narrow public interface to `BankAccount`: a `transferTo` function** that moves money from one account to another, only succeeding if the source has sufficient balance:

```cpp
void transferTo(BankAccount& other, double amount) {
    if (amount > 0 && amount <= balance) {
        balance -= amount;
        other.balance += amount;   // note: THIS works! A member function can
                                     // access the PRIVATE members of ANOTHER
                                     // object of the SAME class.
    }
}
```

This last detail is worth noticing directly: `private` restricts access based on *which class* you're inside, not which specific *object* — a `BankAccount` method can freely touch another `BankAccount`'s private fields, just not an outsider's. Confirm this compiles and works before moving on; it's a subtlety that surprises people who assume `private` means "only this exact object."

## What this cost / bought us

| | Python convention (`_balance`) | C++ `private` (this lesson) |
|---|---|---|
| Enforcement | Social — nothing stops a violation | Compiler-enforced — a real compile error |
| Protects invariants | Only if everyone respects the convention | Structurally — outside code cannot bypass it |
| Cost | None — purely optional | A little more ceremony (`public:`/`private:` sections, getter functions where needed) |
| What it buys | A hint to other programmers | A guarantee the compiler checks for you, every build |

`private` is the mechanism that finally makes "an object manages its own correctness" into something actually true, rather than something you hope stays true. Combined with Lesson 2.3's guaranteed initialization, `IntArray` is now a genuinely trustworthy object: it starts valid, and nothing outside it can make it invalid behind its own back. The next lesson names the pattern you've been building this entire phase — constructor sets up a resource, destructor tears it down, and now, private data means nothing else can interfere in between.

---

**Next up: Lesson 2.5 — RAII.** *"The single most important C++-specific idea in the whole curriculum."* You've already built every piece of it by hand across this phase — this lesson just gives the pattern its name and shows you exactly how far it reaches.
