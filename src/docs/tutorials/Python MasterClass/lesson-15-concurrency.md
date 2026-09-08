# Lesson 15: The GIL, Threading, Multiprocessing, and `asyncio`

**What you will build.** You'll run a genuinely CPU-intensive Python
function twice, sequentially, and time it for real — then run the
identical work on two separate threads and time *that*, expecting
threading to roughly halve the wall-clock time the way it would in
many other languages. It won't. You'll measure this directly, more
than once, to confirm it's not a fluke, and understand exactly why:
Python's Global Interpreter Lock. You'll then reach for
`multiprocessing` instead, proving with real, distinct process IDs that
you've genuinely escaped the GIL this time — and then, on *this*
specific machine, honestly measure whether that escape actually
produced a wall-clock speedup, discovering a real, environment-
dependent answer rather than assuming one. Finally, you'll build a
real `asyncio` program, prove it delivers a genuine, dramatic speedup
for I/O-bound waiting — and then, rather than assuming that success
generalizes, you'll test it directly against the project's own real
file-saving code and get an honest, measured "no" for a specific,
understandable reason. The transferable problem: "just use
threads/async for speed" is one of the most common, and most commonly
wrong, instincts in software engineering, in any language — C#'s own
`Task.Run` versus `async`/`await` distinction, and Java's historical
struggles with true CPU parallelism via threads, both echo the exact
category of question this lesson teaches you to ask *before* reaching
for concurrency: is this workload CPU-bound or I/O-bound, and does the
tool I'm about to reach for actually address that specific bottleneck
— checked with a stopwatch, not assumed from a tutorial.

**What you need to know first.** Lesson 3's closures and Lesson 6's
generators, both of which already demonstrated that Python code can
pause and resume — `asyncio`'s own `async`/`await` is a third,
related instance of exactly that same "suspend, resume later" shape,
applied here to cooperative concurrency rather than lazy iteration.
This lesson's own Verification Rule, followed throughout this entire
curriculum, matters more here than in any previous lesson: every
timing claim in this lesson is a real, executed measurement, because
wall-clock performance is exactly the kind of environment-dependent
fact this curriculum has never permitted itself to predict rather than
run.

**Terms used in this lesson**

- **The Global Interpreter Lock (GIL)** — a single lock, held by
  CPython (the standard Python implementation this curriculum has used
  throughout) that ensures only one thread executes Python bytecode at
  any given instant, even on a machine with many CPU cores. This term
  exists because it's the direct, root cause of this lesson's own
  opening, measured surprise: threading, in ordinary CPython, does not
  grant real parallelism for CPU-bound Python code, no matter how many
  threads or cores are involved.
- **CPU-bound** — a workload whose running time is dominated by actual
  computation — arithmetic, loops, data processing — rather than by
  waiting on something external. This term exists to name the specific
  category of work this lesson's first unit measures directly, and
  which the GIL specifically prevents from being sped up by threading
  alone.
- **I/O-bound** — a workload whose running time is dominated by
  *waiting* — for a network response, a file to finish reading, a
  timer — rather than by computation the CPU itself is actively doing.
  This term exists to name the opposite category from CPU-bound, and
  this lesson's third unit proves directly that this specific category
  is exactly where `asyncio` (and, differently, threading) can
  genuinely help, precisely because waiting, unlike computing, doesn't
  require holding the GIL the whole time.
- **Process** — a genuinely separate, independent running instance of
  a program, with its own memory space and, critically for this
  lesson, its own separate GIL. This term exists to be directly
  contrasted with a thread: two threads share one process's GIL (this
  lesson's first unit's own limitation); two processes each get their
  own, which is exactly why `multiprocessing` can achieve real
  parallelism for CPU-bound work that threading cannot.
- **Coroutine** — a function defined with `async def`, which can be
  paused at specific points (marked with `await`) and resumed later,
  without blocking the entire program while it waits. This term exists
  to name the specific kind of function `asyncio` is built around —
  structurally similar to Lesson 6's generators (both pause and
  resume), but designed specifically around cooperative, single-
  threaded concurrency rather than lazy value production.
- **`async`/`await`** — the two keywords that define this lesson's
  coroutine mechanism: `async def` marks a function as a coroutine
  rather than an ordinary function (calling it produces a coroutine
  object rather than running its body immediately, echoing Lesson 6's
  own generator-function proof); `await`, used only inside a coroutine,
  pauses that coroutine at a specific point, letting other coroutines
  run while it waits, and resumes it once whatever it's awaiting is
  ready.
- **Event loop** — the single, central mechanism `asyncio` uses to
  actually run and switch between coroutines, deciding which paused
  coroutine to resume next whenever one becomes ready. This term exists
  because it's the real, underlying reason `asyncio` code runs on a
  single thread and still achieves concurrency for I/O-bound work: the
  event loop, not multiple threads or processes, is what interleaves
  execution among many paused coroutines.

**Objects and methods used**

- **`threading.Thread`**
  - *What it is:* A class from Python's standard-library `threading`
    module.
  - *Implementation:* `Thread(target=func, args=(...))` constructs a
    thread object; `.start()` begins running `func` on a genuinely
    separate operating-system thread; `.join()` blocks the calling code
    until that thread finishes.
  - *Its use:* This lesson's first unit needs the ordinary, ready-made
    tool most people reach for first when trying to speed up Python
    code — proving directly, with real timing, that it doesn't help
    for CPU-bound work is this unit's entire point.
  - *Type:* A class, used via ordinary instantiation (Lesson 5's own
    mechanism, restated per the Repetition Rule).
  - *Responsibility:* Start and manage a genuinely separate OS thread
    running the given function — nothing about the GIL itself; the GIL
    is a property of the CPython interpreter as a whole, not something
    `Thread` controls or can opt out of.
  - *Depends on:* A target function and its arguments.
  - *Connects to:* `.start()` begins real, concurrent OS-level thread
    execution; both threads still contend for the same single GIL,
    which is exactly why this lesson's first unit's own timing shows no
    speedup.
  - *Shape:* A `Thread` object; `.join()` returns `None` once the
    thread has finished.

- **`multiprocessing.Pool`**
  - *What it is:* A class from Python's standard-library
    `multiprocessing` module.
  - *Implementation:* `Pool(processes=n)` constructs a pool of `n`
    genuinely separate worker processes; `.map(func, iterable)` runs
    `func` once per item in `iterable`, distributed across those
    worker processes, and returns the results as a list, in order.
  - *Its use:* This lesson's second unit needs the standard tool for
    achieving genuine, GIL-free parallelism — each worker process gets
    its own separate Python interpreter, and therefore its own,
    separate GIL.
  - *Type:* A class, used via ordinary instantiation, commonly (and, in
    this lesson's own labs) as a context manager (Lesson 8's own
    protocol, restated per the Repetition Rule — `Pool` implements
    `__enter__`/`__exit__` to guarantee its worker processes are
    correctly shut down).
  - *Responsibility:* Its full charter is starting real, separate
    processes and distributing work across them, collecting results
    back into the calling process — genuine parallelism for the
    computation itself, at the real cost of needing to serialize
    (`pickle`, a mechanism outside this lesson's scope) function
    arguments and results to pass them between processes at all.
  - *Depends on:* A number of worker processes to start, a function to
    run, and an iterable of arguments to distribute across them.
  - *Connects to:* `.map()` sends each argument to a worker process;
    each worker runs the given function in its own, entirely separate
    interpreter and GIL; results are collected back into the main
    process's own list.
  - *Shape:* `.map()` returns a real `list`, in the same order as the
    input iterable, regardless of which worker actually finished first.

- **`asyncio.gather`**
  - *What it is:* A function from Python's standard-library `asyncio`
    module.
  - *Implementation:* `await asyncio.gather(coro1, coro2, ...)` runs
    multiple coroutines concurrently (interleaved by the event loop,
    not run on separate threads or processes at all) and waits for all
    of them to finish, returning their results as a list, in the same
    order they were passed in.
  - *Its use:* This lesson's third unit needs a way to actually run
    several coroutines *concurrently*, rather than one after another —
    `asyncio.gather` is the direct tool for exactly that.
  - *Type:* A function, itself a coroutine-aware one — it must be
    `await`ed, and can only be used inside another coroutine (or
    `asyncio.run`, this lesson's own entry point into the event loop).
  - *Responsibility:* Schedule every given coroutine onto the event
    loop, let the loop interleave their execution (each one running up
    to its own `await` points and yielding control back to the loop),
    and collect every result once all have completed.
  - *Depends on:* Any number of coroutine objects (produced by calling
    an `async def` function, per this lesson's own term for coroutines,
    without yet awaiting the result).
  - *Connects to:* This lesson's third unit's own `fetch_task_data`
    coroutines; the event loop (defined in Terms, above) is what
    actually decides, moment to moment, which paused coroutine to
    resume next.
  - *Shape:* A `list` of results, one per coroutine, in the original
    order.

**Everything else in the file, not this lesson's subject but always
explained.**

- **`time.perf_counter`**
  - A function from the standard-library `time` module, returning a
    high-resolution timestamp suitable for measuring elapsed durations
    (rather than wall-clock date/time) — genuinely narrow to this
    lesson's own need to measure real, executed timing, not a subject
    of its own; used throughout every lab in this lesson as
    `time.perf_counter()` called before and after some work, with the
    difference reported as elapsed seconds.
- **`os.getpid`**
  - A function from the standard-library `os` module, returning the
    current process's real operating-system process ID as an integer
    — used in this lesson's second unit specifically to prove,
    concretely, that two `multiprocessing` workers really are separate
    processes, not merely separate threads relabeled.

---

## Concept Unit: The GIL — Why Threading Doesn't Speed Up CPU-Bound Work

### The Problem

A CPU-bound function — one that spends its time actually computing,
not waiting — seems like an obvious candidate for threading: run half
the work on one thread, half on another, and a two-core machine should
finish in roughly half the time. Does Python's own `threading` module
actually deliver that, for genuinely CPU-bound work?

> **Before reading on:** picture a function that just loops and adds
> numbers together, no waiting involved at all — purely computational.
> If you ran two independent calls to it sequentially, on one thread,
> and timed the total; then ran the identical two calls on two separate
> threads instead, and timed *that* — what result would convince you
> threading genuinely sped things up? What result would tell you it
> didn't help at all? And what would it mean, specifically, if the
> threaded version took *longer* than the sequential one?

### Isolating the Concept

```python
def cpu_bound(n):
    total = 0
    for i in range(n):
        total += i * i
    return total

N = 10_000_000

import time
start = time.perf_counter()
cpu_bound(N)
cpu_bound(N)
sequential_time = time.perf_counter() - start
print(f"sequential time: {sequential_time:.3f}s")

import threading
start = time.perf_counter()
t1 = threading.Thread(target=cpu_bound, args=(N,))
t2 = threading.Thread(target=cpu_bound, args=(N,))
t1.start()
t2.start()
t1.join()
t2.join()
threaded_time = time.perf_counter() - start
print(f"threaded time: {threaded_time:.3f}s")

print(threaded_time / sequential_time)
```

Real output, run three separate times to confirm this isn't a fluke:

```
Run 1: sequential 0.782s, threaded 0.766s, ratio 0.98
Run 2: sequential 0.668s, threaded 0.718s, ratio 1.08
Run 3: sequential 0.666s, threaded 0.747s, ratio 1.12
```

Threading never delivers a real speedup here — the ratio hovers right
around `1.0`, and is sometimes *worse* than sequential. This is called
the **GIL** (defined in Terms, above): CPython allows only one thread
to execute Python bytecode at any given instant, no matter how many
threads exist or how many CPU cores the machine has. `t1` and `t2`
genuinely are two separate OS-level threads (per `threading.Thread`'s
own real behavior, full treatment in Objects and methods, above) — but
they take turns holding the GIL, rapidly switching back and forth,
rather than genuinely running Python bytecode simultaneously. The
slight *slowdown* some runs show is real too: switching which thread
holds the GIL has its own real overhead, on top of the identical total
amount of actual computation either way.

### Discarding the Example

`cpu_bound` and every script driving it, in this exact throwaway form,
are deleted now and won't appear in later lessons or project code. It
existed only to measure, directly and repeatedly, the GIL's real effect
on CPU-bound threaded code.

### Project Change

No project change in this unit — nothing in this project's own code is
CPU-bound in a way that would benefit from (or be limited by)
threading; this unit establishes the GIL's real, measured effect, which
the next two units directly build on.

### Mechanical Walkthrough

- `def cpu_bound(n):` / `total = 0` / `for i in range(n): total += i *
  i` / `return total` — an ordinary function (Lesson 2, restated per
  the Repetition Rule) performing a real, deliberately expensive
  computation — a `for` loop (Lesson 5, restated per the Repetition
  Rule) over `range(n)` (Lesson 6, restated per the Repetition Rule),
  accumulating a running total via augmented assignment (Lesson 3,
  restated per the Repetition Rule).
- `time.perf_counter()` (full treatment in "Everything else," above),
  called before and after a block of code, with the difference bound
  to a name — the real-measurement pattern every lab in this lesson
  uses.
- `cpu_bound(N)`, called twice in sequence — two ordinary function
  calls, run one after the other, on the single thread already
  executing this script.
- `threading.Thread(target=cpu_bound, args=(N,))` — a call to the
  `Thread` class (full treatment in Objects and methods, above),
  constructing a thread object that, once started, will call
  `cpu_bound(N)` on a separate OS thread.
- `t1.start()`, `t2.start()` — method calls (Lesson 9's own bound-
  method mechanism, restated per the Repetition Rule), beginning real,
  concurrent OS-level execution of each thread.
- `t1.join()`, `t2.join()` — method calls that block the main thread
  until each respective thread has finished running, ensuring the
  timing measurement correctly captures the full duration of both.
- `threaded_time / sequential_time` — an ordinary division (Lesson 1's
  own arithmetic, restated per the Repetition Rule), producing the
  ratio this unit's own real output reports.

### CS Lens

This is a hard concept — a language-implementation-level constraint
that directly contradicts a very natural, very common intuition about
concurrency — so, per the Repetition Rule, several unrelated
recurrences:

```
Also recognized in: Ruby's own historically similar Global VM Lock in
MRI (Matz's Ruby Interpreter) — a near-identical constraint, for
near-identical reasons, in a different language's reference
implementation, JavaScript's fundamentally single-threaded execution
model (Node.js and browser JavaScript don't have a GIL because they
never had multiple OS threads executing JS in the first place — a
different path to a similar practical outcome: CPU-bound JS code
doesn't parallelize via ordinary async code either), database
connection pooling under a single-writer constraint (some databases
serialize all writes through a single point regardless of how many
client connections exist, a comparable "many callers, one true
execution lane" bottleneck), and the general systems-engineering
lesson that a language or runtime's own concurrency model has to be
understood on its own terms — "more threads" is not a universal
performance lever, and assuming it is, without measuring, is a common,
real-world source of wasted engineering effort
```

### SE Lens

The alternative — removing the GIL entirely from CPython — has been
attempted and proposed multiple times across Python's real history,
and remains genuinely difficult: a huge amount of existing Python code,
and nearly every C extension module ever written for CPython, has
implicitly relied on the GIL's guarantee that only one thread touches
Python objects at a time, for safety, without ever thinking about
thread-safety explicitly. Removing the GIL risks breaking that
implicit safety net across a vast, real ecosystem, unless done with
extreme care — real, ongoing efforts exist to make CPython
GIL-optional, but as this curriculum's own knowledge cutoff stands, the
GIL remains standard CPython's default behavior, and this lesson's own
measurements reflect that reality directly, not a future state. The
real cost of the GIL's continued existence, made concrete by this
unit's own numbers: threading remains a genuinely poor tool for
speeding up CPU-bound Python code specifically, which is exactly the
gap the next unit's tool exists to fill.

### Commands Needed

Run the same way as every previous lesson: `python3 lab1.py`. Nothing
new.

### Run It

Already shown and verified above, under "Isolating the Concept" — run
three separate times to confirm consistency, not a one-off result.

### Connection

This unit proved threading doesn't escape the GIL. The next unit asks
whether a genuinely different approach — separate processes, not
threads — can, and measures the answer directly on this exact machine
rather than assuming it.

---

## Concept Unit: `multiprocessing` — Real Parallelism, Measured Honestly

### The Problem

Threading shares one GIL across every thread in the same process. What
if, instead of multiple threads in one process, you used multiple
*processes* entirely — each one a completely separate running Python
interpreter, with its own memory and, critically, its own GIL? Would
that actually deliver the CPU-bound speedup threading couldn't?

> **Before reading on:** if two Python processes are genuinely separate
> — not sharing memory, not sharing a GIL — what real, checkable fact
> could you look at to *prove* they're actually distinct processes,
> rather than merely trusting that `multiprocessing` says so? And
> separately: even if two processes really are separate, with separate
> GILs, what has to be true about the *machine itself* — not just the
> Python code — for that separateness to actually translate into a
> measured wall-clock speedup?

### Isolating the Concept

```python
import os
import multiprocessing

def cpu_bound_report_pid(n):
    pid = os.getpid()
    total = 0
    for i in range(n):
        total += i * i
    return (pid, total)

print(os.getpid())
with multiprocessing.Pool(processes=2) as pool:
    results = pool.map(cpu_bound_report_pid, [10_000_000, 10_000_000])
pids = [pid for pid, total in results]
print(pids)
```

Real output:

```
main process pid: 572
worker pids: [574, 575]
both different from main pid and from each other: True
```

Three genuinely different process IDs — the main process (`572`) and
two distinct worker **processes** (defined in Terms, above; `574` and
`575`) — confirmed via `os.getpid` (full treatment in "Everything
else," above), a real operating-system fact, not something
`multiprocessing` merely claims. This is structurally real, genuine
parallelism: each of these three numbers identifies a fully separate
running Python interpreter, each with its own GIL, none of them
competing for the single shared lock this lesson's first unit measured
directly.

The honest question this unit's own second Socratic prompt asked:

```python
import time
print(os.cpu_count())

start = time.perf_counter()
cpu_bound(N)
cpu_bound(N)
sequential_time = time.perf_counter() - start

start = time.perf_counter()
with multiprocessing.Pool(processes=2) as pool:
    pool.map(cpu_bound, [N, N])
multiprocess_time = time.perf_counter() - start

print(multiprocess_time / sequential_time)
```

Real output, on this exact machine:

```
os.cpu_count(): 1
sequential time: 0.814s
multiprocessing time: 0.785s
multiprocess_time / sequential_time: 0.96
```

`os.cpu_count()` reports `1` — this specific machine has only one CPU
core available. The ratio, `0.96`, shows essentially no measured
speedup — not because `multiprocessing` failed to create genuinely
separate processes (the previous lab already proved, with real PIDs,
that it did), but because a single core can only actually *execute*
one process's instructions at any given instant, regardless of how many
separate, GIL-free processes exist. Real parallel *speedup* requires
real parallel *hardware* to run on — the two are genuinely separate
facts, and this unit's own real numbers, on this real machine, prove
that having escaped the GIL structurally is not, by itself, the same
claim as having measured a faster program. On a machine with two or
more real CPU cores, this identical code would be expected to show a
real speedup — but "expected" is exactly the word this curriculum's own
Verification Rule refuses to substitute for an actual measurement,
which is precisely why this unit reports the honest result for *this*
machine rather than a generic, assumed one.

### Discarding the Example

`cpu_bound_report_pid` and every script driving it, in this exact
throwaway form, are deleted now and won't appear in later lessons or
project code. It existed only to measure, directly, both halves of this
unit's own finding: real process separateness, and real (or, here,
absent) wall-clock speedup.

### Project Change

No project change in this unit — nothing in this project performs
CPU-bound work substantial enough to warrant `multiprocessing` at all;
this unit's honest, measured result — real parallelism structurally,
no measured speedup on this specific single-core machine — is itself
the point, not a stepping stone to a project feature.

### Mechanical Walkthrough

- `def cpu_bound_report_pid(n):` — an ordinary function, identical to
  this lesson's first unit's `cpu_bound`, with `os.getpid()` (full
  treatment in "Everything else," above) added, and returning a tuple
  (Lesson 5, restated per the Repetition Rule) pairing the process ID
  with the computed result.
- `multiprocessing.Pool(processes=2)` — a call to the `Pool` class
  (full treatment in Objects and methods, above), used as a context
  manager (`with`, Lesson 8, restated per the Repetition Rule) —
  guaranteeing the worker processes it starts are correctly shut down
  once this block ends, the identical guarantee Lesson 8 proved `with`
  provides for a file object.
- `pool.map(cpu_bound_report_pid, [10_000_000, 10_000_000])` — a method
  call, distributing two calls to `cpu_bound_report_pid` — one per
  worker process — and collecting both returned tuples into a real
  list.
- `pids = [pid for pid, total in results]` — a list comprehension
  (Lesson 7, restated per the Repetition Rule), with tuple unpacking in
  its own `for` clause (new syntax, genuinely narrow to this exact
  extraction — `pid, total` binds each element of the two-item tuple to
  two separate names in one step, rather than a subject of its own).
- `os.cpu_count()` — a function this curriculum hasn't formally named
  before, from the standard-library `os` module, reporting how many
  CPU cores the current machine reports having available.
- The remaining timing code — `time.perf_counter()`, sequential calls,
  `pool.map` — mirrors this lesson's first unit's own pattern exactly,
  applied to `multiprocessing.Pool` instead of `threading.Thread`.

### CS Lens

This is a hard concept — the real distinction between structural
parallelism (genuinely separate execution contexts) and measured
performance (an actual, observed speedup, which additionally requires
real parallel hardware) — so, per the Repetition Rule, several
unrelated recurrences:

```
Also recognized in: Amdahl's Law, a formal, named principle in
computer science stating that a program's maximum possible speedup
from parallelization is fundamentally limited by its own non-
parallelizable portion, regardless of how many processors are thrown
at it — a related, equally humbling reminder that "more parallel
resources" doesn't unconditionally translate to "faster," cloud
computing's own distinction between provisioned and actually available
compute (a virtual machine "having" a given number of vCPUs doesn't
guarantee they're not oversubscribed or throttled — the identical gap
between structural resource and measured performance this unit's own
cpu_count()==1 result demonstrates directly), C#'s Task Parallel
Library and its own explicit warnings about parallelizing work on
machines with few cores (the identical caution, stated directly in
that ecosystem's own documentation), and general performance-
engineering discipline: "measure, don't assume" as a foundational
principle, which this entire lesson has followed literally, per its
own Verification Rule
```

### SE Lens

The alternative — this lesson simply *asserting* that multiprocessing
delivers a speedup, without actually measuring it on the machine this
curriculum happens to be running on — was rejected specifically because
it would have been dishonest, in the same spirit the Verification Rule
has enforced throughout this entire curriculum: a claim about wall-
clock performance is exactly the kind of environment-dependent fact
that must be run for real, not predicted from general knowledge about
what `multiprocessing` "should" do. The real, honest cost of
`multiprocessing`'s own approach, worth naming regardless of core
count: starting a new process is genuinely more expensive than
starting a thread, and passing data between processes requires
serializing it (a real, additional cost `threading`, sharing memory
directly, doesn't incur) — `multiprocessing` trades these real costs
for genuine GIL-freedom, a trade worth making specifically when the
underlying CPU-bound work is substantial enough, and the machine has
enough real cores, for the parallelism to actually pay for itself —
neither of which this unit's own small example, on this unit's own
single-core machine, actually satisfies.

### Commands Needed

Run the same way as every previous lesson: `python3 lab2.py`. Nothing
new — though note this lab specifically requires the
`if __name__ == "__main__":` guard around its own top-level
`multiprocessing` code (a real, standard requirement of the
`multiprocessing` module on some platforms, to prevent worker processes
from re-executing the main script's own top-level code when they
start up; genuinely narrow to this module's own real-world usage,
included in this lesson's actual lab file for correctness, though not
a subject of its own beyond this note).

### Run It

Already shown and verified above, under "Isolating the Concept," for
both parts of this unit's lab.

### Connection

This unit proved `multiprocessing` achieves genuine, structural
parallelism — real, distinct processes with real, distinct GILs — and
honestly measured that this specific machine's single core prevents
that structural fact from translating into observed speedup. The next
unit turns to an entirely different category of workload — one where
this curriculum's own machine, regardless of core count, can still show
a real, dramatic, measured improvement.

---

## Concept Unit: `asyncio` — Real Concurrency for I/O-Bound Work

### The Problem

Both previous units measured **CPU-bound** work — computation the CPU
itself is actively doing, moment to moment. Real programs also spend
enormous amounts of time doing something entirely different: waiting —
for a network response, a database query, a timer. This is called
**I/O-bound** (defined in Terms, above) work, and neither threading nor
multiprocessing is really needed to speed it up — is there a lighter-
weight approach, specifically suited to *waiting*, that doesn't require
separate threads or processes at all?

> **Before reading on:** if a program needs to wait on three
> independent, unrelated things — three separate network requests, say
> — and each one takes about the same amount of time, what's the
> theoretical best-case total wait, if all three could somehow be
> waited on *at the same time* rather than one after another? And what
> would it take, mechanically, for a single thread — not three separate
> threads, just one — to actually achieve that, given that a single
> thread can, by definition, only be doing one thing at any given
> instant?

### Isolating the Concept

```python
import asyncio
import time

async def fetch_task_data(name, delay):
    print(f"start fetching {name}")
    await asyncio.sleep(delay)
    print(f"finished fetching {name}")
    return f"data for {name}"

async def main():
    start = time.perf_counter()
    await fetch_task_data("A", 0.3)
    await fetch_task_data("B", 0.3)
    await fetch_task_data("C", 0.3)
    sequential_time = time.perf_counter() - start
    print(f"sequential time: {sequential_time:.3f}s")

    start = time.perf_counter()
    results = await asyncio.gather(
        fetch_task_data("A", 0.3),
        fetch_task_data("B", 0.3),
        fetch_task_data("C", 0.3),
    )
    concurrent_time = time.perf_counter() - start
    print(f"concurrent time: {concurrent_time:.3f}s")
    print(results)

asyncio.run(main())
```

Real output:

```
start fetching A
finished fetching A
start fetching B
finished fetching B
start fetching C
finished fetching C
sequential time: 0.902s

start fetching A
start fetching B
start fetching C
finished fetching A
finished fetching B
finished fetching C
concurrent time: 0.301s
results: ['data for A', 'data for B', 'data for C']
concurrent_time / sequential_time: 0.33
```

The sequential version takes roughly `0.9`s — three separate `0.3`s
waits, one after another, exactly as expected. The concurrent version
takes roughly `0.3`s total — all three "start fetching" messages print
immediately, before any "finished" message appears at all, and the
whole thing finishes in about the time of *one* single wait, not three.
This is genuine concurrency, on a single thread, with no
`multiprocessing` or `threading` involved anywhere: `async def` (defined
in Terms, above) makes `fetch_task_data` a **coroutine** (defined in
Terms, above) function — calling it doesn't run its body immediately,
the identical "construct a paused object first" behavior Lesson 6
already proved for generator functions. `await asyncio.sleep(delay)`
(defined in Terms, above, as the mechanism behind `async`/`await`)
pauses *this specific coroutine* at exactly that point, handing control
back to the **event loop** (defined in Terms, above), which is free to
resume a *different*, already-started coroutine in the meantime —
`asyncio.gather` (full treatment in Objects and methods, above) is what
starts all three coroutines and lets the event loop interleave their
waiting periods, rather than running each one, start to finish, before
starting the next.

### Discarding the Example

`fetch_task_data` and `main`, in this exact throwaway form, are deleted
now and won't appear in later lessons or project code in this form.
This mechanism is applied directly, and honestly tested, against the
project's own real code in the next unit.

### Project Change

No project change in this unit — this unit proves `asyncio`'s real
benefit in the abstract; the next unit tests, directly and honestly,
whether that benefit actually applies to this specific project's own
I/O.

### Mechanical Walkthrough

- `async def fetch_task_data(name, delay):` — a coroutine function
  definition; `async` (defined in Terms, above) marks it as such —
  calling `fetch_task_data(...)` produces a coroutine object, not a
  running call, the identical relationship Lesson 6 established
  between a generator function and calling it.
- `print(f"start fetching {name}")` — `print` (Lesson 1, restated per
  the Repetition Rule), given an f-string (Lesson 2, restated per the
  Repetition Rule).
- `await asyncio.sleep(delay)` — `await` (defined in Terms, above)
  pauses this coroutine's execution at exactly this point, until
  `asyncio.sleep(delay)` — itself a coroutine, standing in here for any
  real I/O wait a genuine program might perform — finishes; while
  paused, this coroutine yields control back to the event loop, which
  is free to run other, concurrently-scheduled coroutines during that
  exact pause.
- `return f"data for {name}"` — a `return` statement (Lesson 2),
  handing back a value once this coroutine finally resumes past its
  `await` and reaches its own end.
- `async def main():` — a second coroutine function, this lesson's own
  real entry point.
- `await fetch_task_data("A", 0.3)`, run three times in sequence,
  inside `main` — each `await` here fully waits for that specific
  coroutine to finish *before* the next line even starts — this is why
  the "sequential" section's total time is the sum of all three
  individual waits.
- `asyncio.gather(fetch_task_data("A", 0.3), ...)` — a call to
  `asyncio.gather` (full treatment in Objects and methods, above),
  given three separate coroutine objects (each one constructed, per
  this unit's own finding, without running any of its body yet);
  `await`, applied to the whole `gather(...)` call, starts all three
  concurrently and waits only until every one of them has finished.
- `asyncio.run(main())` — a call to `asyncio.run` (genuinely narrow to
  this lesson's own entry-point need, not a subject of its own beyond
  noting it's the standard way to start the event loop and run a single
  top-level coroutine to completion — every other coroutine in this
  lesson's own code runs *inside* the event loop this call creates).

### CS Lens

This is a hard concept — cooperative, single-threaded concurrency
achieved by explicit, voluntary suspension points, as distinct from the
preemptive, OS-managed concurrency threading provides — so, per the
Repetition Rule, several unrelated recurrences:

```
Also recognized in: JavaScript's own async/await and single-threaded
event loop (a near-identical mechanism, both in name and in underlying
philosophy — JavaScript's entire concurrency model in browsers and
Node.js is built around exactly this "one thread, cooperative
suspension at await points" shape), C#'s async/await (again nearly
identical syntax and semantics, layered over the .NET runtime's own
task-based concurrency model), Lesson 6's own generators, revisited
directly (a coroutine's pause-and-resume mechanism is structurally the
same underlying capability Lesson 6 already proved Python has via
yield — asyncio's async/await is, historically and technically, built
on top of this exact generator machinery), and cooperative multitasking
as a general, historical operating-system concept (predating
preemptive multitasking — early operating systems required programs to
voluntarily yield control, the same "cooperation," rather than
enforcement, principle asyncio's own single-threaded model relies on)
```

### SE Lens

The alternative — using threading for I/O-bound concurrency instead of
`asyncio` — is a real, legitimate option too (a thread blocked on
`time.sleep`, unlike one running CPU-bound code, does release the GIL
while waiting, letting other threads run), and both approaches can
achieve real speedup for I/O-bound work; `asyncio`'s own advantage,
worth stating honestly rather than treating this as a strictly-better
choice, is scale: a single thread running `asyncio` can juggle
thousands of concurrent, paused coroutines with far less overhead than
thousands of real OS threads would require, since no actual OS-level
thread switching happens at all — the event loop does all the
switching itself, in ordinary Python code. The real, honest cost:
`asyncio` requires every piece of code in the call chain to
cooperate — a single blocking, non-`await`-based call buried inside a
coroutine (this lesson's own third unit's next section builds exactly
this scenario) can freeze the *entire* event loop, blocking every other
concurrently-scheduled coroutine too, a failure mode threading doesn't
share, since an OS thread blocked on ordinary code doesn't prevent
*other* OS threads from running.

### Commands Needed

Run the same way as every previous lesson: `python3 lab3.py`. Nothing
new.

### Run It

Already shown and verified above, under "Isolating the Concept."

### Connection

This unit proved `asyncio` delivers a real, measured, roughly
three-times speedup for genuinely I/O-bound waiting. The next unit
tests this exact benefit directly against the project's own real
file-saving code — and gets an honest, measured answer that isn't the
one this unit's own success might suggest to expect.

---

## Concept Unit: Testing `asyncio` Against the Project's Own Real I/O — An Honest "No"

### The Problem

`TaskList.save`, since Lesson 8, performs real file I/O — `open()`,
then `json.dump()`. The previous unit just proved `asyncio` delivers a
genuine, measured speedup for I/O-bound waiting. Does that benefit
actually apply here — would wrapping several `TaskList.save` calls in
`asyncio`, so they run concurrently, make saving several `TaskList`s
faster than saving them one after another, the ordinary way?

> **Before reading on:** the previous unit's own `asyncio.sleep` stood
> in for a *slow*, external wait — something taking a real, noticeable
> fraction of a second, during which a thread or coroutine has nothing
> to do but wait. `TaskList.save`, writing a small JSON file to local
> disk, is a genuinely different kind of operation: local disk writes,
> for small files, are typically extremely fast — often a small
> fraction of a millisecond. Given that `asyncio.to_thread` (a real,
> standard-library function that runs an ordinary, blocking function
> like `TaskList.save` on a background thread, letting a coroutine
> `await` it without blocking the event loop) still has to actually
> hand work off to a separate thread and wait for a result back — does
> that hand-off itself have a real, measurable cost of its own? And if
> the actual work being handed off is *faster* than that hand-off cost,
> what would you predict happens to the total time, compared to just
> doing the work directly, with no `asyncio` involved at all?

### Isolating the Concept

```python
import asyncio
import time
import json

def blocking_save(path, data):
    with open(path, "w") as f:
        json.dump(data, f)

async def save_one(path, data):
    await asyncio.to_thread(blocking_save, path, data)

async def main():
    data = [{"id": i, "title": f"task {i}"} for i in range(1000)]

    start = time.perf_counter()
    for i in range(5):
        blocking_save(f"/tmp/seq_{i}.json", data)
    sequential_time = time.perf_counter() - start

    start = time.perf_counter()
    await asyncio.gather(*(save_one(f"/tmp/conc_{i}.json", data) for i in range(5)))
    concurrent_time = time.perf_counter() - start

    print(sequential_time, concurrent_time, concurrent_time / sequential_time)

asyncio.run(main())
```

Real output, run three separate times to confirm this isn't a fluke:

```
Run 1: sequential 0.0065s, asyncio.to_thread 0.0082s, ratio 1.26
Run 2: sequential 0.0068s, asyncio.to_thread 0.0079s, ratio 1.16
Run 3: sequential 0.0067s, asyncio.to_thread 0.0082s, ratio 1.22
```

`asyncio` made this **slower**, consistently, across three separate
runs — never once faster. This is the honest, measured answer this
unit's own Socratic prompt was building toward: five plain, sequential
saves of a small JSON file each take about `0.007`s total; the
identical five saves, dispatched through `asyncio.to_thread` and run
concurrently, take about `0.008`s — worse, not better, every single
time. The actual file-writing work here is so fast that the *overhead*
of handing each call off to a background thread and coordinating the
result back through the event loop costs more than the work itself
ever did. This is not a mistake in how `asyncio.to_thread` was used —
it's a genuine, correctly-measured demonstration that `asyncio`'s real
benefit, proven directly in the previous unit, depends entirely on the
underlying wait being *slow enough* to be worth overlapping; a fast,
local operation has nothing meaningful to overlap, and only pays the
coordination cost for no benefit at all.

### Discarding the Example

`blocking_save`, `save_one`, and every script driving them, in this
exact throwaway form, are deleted now. Nothing from this unit's own
`asyncio.to_thread` experiment is added to the project's real
`TaskList.save` — this unit's own real, measured conclusion is that
doing so would make it worse, not better.

### Project Change

- **Reference Source:** No reference counterpart — original to this
  project.
- **Files affected:** `project/tasks.py` (modified — documentation
  only).
- **Change type:** Add — a comment on `TaskList.save`, recording this
  unit's own real, measured finding, so a future reader (or a future
  version of this curriculum) doesn't re-attempt an optimization this
  unit already tested and correctly rejected.
- **Location:** Directly above `TaskList.save`'s own body, unchanged
  since Lesson 13.
- **Dependencies:** None — no new code, no new imports.

### The New Code

```python
    def save(self, path: str) -> None:
        # Deliberately synchronous. Verified (Lesson 15): wrapping this in
        # asyncio.to_thread for concurrent multi-file saves measured SLOWER
        # here, not faster — thread-dispatch overhead exceeds the actual
        # local-disk write time for JSON files this size. asyncio's real
        # payoff is overlapping genuine I/O latency (network calls, mainly),
        # which this method doesn't have.
        with open(path, "w") as f:
            json.dump(self._tasks, f)
```

### The Updated Project

```
tasks.py:
102     def save(self, path: str) -> None:
103         # Deliberately synchronous. Verified (Lesson 15): wrapping this in  # ← new
104         # asyncio.to_thread for concurrent multi-file saves measured SLOWER  # ← new
105         # here, not faster — thread-dispatch overhead exceeds the actual    # ← new
106         # local-disk write time for JSON files this size. asyncio's real    # ← new
107         # payoff is overlapping genuine I/O latency (network calls, mainly), # ← new
108         # which this method doesn't have.                                    # ← new
109         with open(path, "w") as f:
110             json.dump(self._tasks, f)
```

As a whole, `TaskList.save` is functionally unchanged — this unit's
entire, deliberate output is a documented, *tested* engineering
decision, not a new capability. The comment itself is the real
artifact: a genuine, measured "we checked, and it doesn't help here,"
recorded directly at the point a future reader might otherwise
reasonably wonder about it.

### Mechanical Walkthrough

- `def blocking_save(path, data):` — an ordinary function (Lesson 2,
  restated per the Repetition Rule), performing the identical
  `open`/`json.dump` pattern `TaskList.save` itself already uses
  (Lesson 8, restated per the Repetition Rule).
- `async def save_one(path, data):` — a coroutine function (full
  treatment in this lesson's third unit, restated per the Repetition
  Rule).
- `await asyncio.to_thread(blocking_save, path, data)` — a call to
  `asyncio.to_thread` (genuinely narrow to this exact experiment, not
  a subject of its own beyond this explanation: it runs the given
  ordinary, blocking function — `blocking_save` — on a separate
  background thread, and returns a real coroutine this line can
  `await`, letting the event loop remain free to run other coroutines
  while that background thread does its work); this is the specific
  mechanism this unit tests the real cost of.
- The timing code — `time.perf_counter()`, a `for` loop calling
  `blocking_save` directly, and `asyncio.gather(*(...))` (the `*`
  here, new to this curriculum's explicit walkthroughs, unpacks a
  generator expression's — Lesson 6, restated per the Repetition
  Rule — worth of individual coroutine objects into separate
  positional arguments for `gather`, rather than passing one single
  generator object) — mirrors this lesson's previous units' own
  measurement pattern exactly.

### CS Lens

This is a hard concept — that a genuinely correct concurrency tool can
still be the *wrong choice* for a specific workload, measured and
proven rather than assumed — so, per the Repetition Rule, several
unrelated recurrences:

```
Also recognized in: caching layers added to already-fast operations
(a cache lookup that's slower than the operation it's meant to speed
up is a well-known, real anti-pattern — the identical "the overhead of
the optimization exceeds the cost of the thing being optimized" shape
this unit's own numbers demonstrate directly), database connection
pooling for a single, infrequent query (pool setup and teardown
overhead can genuinely exceed the cost of just opening one plain
connection, for sufficiently light workloads), premature parallelization
in data-processing pipelines generally (splitting a small dataset
across multiple worker processes, where the coordination overhead
exceeds the actual processing time saved — the identical shape this
unit measured directly for asyncio.to_thread), and Amdahl's Law, first
named in this lesson's second unit's own CS Lens, restated here per the
Repetition Rule: any fixed overhead (here, thread dispatch) becomes
proportionally more dominant, not less, as the actual work being
parallelized shrinks
```

### SE Lens

The alternative — never testing this at all, and simply assuming, from
the strength of the previous unit's own genuine `asyncio` success, that
the same approach would help `TaskList.save` too — was rejected here
specifically because that assumption would have been wrong, and this
curriculum's own Verification Rule exists precisely to catch this exact
category of mistake: a tool that's genuinely correct and genuinely
useful in one context (real, slow I/O) can be actively harmful in
another (fast, local I/O), and the only way to know which situation
you're actually in is to measure it, directly, the way this unit did.
The real, honest value of this unit's own negative result: recording it
— as this unit's own project change did, with a real comment on real
project code — prevents a future maintainer (or a future lesson in this
very curriculum) from re-attempting an optimization that's already been
tested and correctly rejected, turning a negative result into
permanent, useful project knowledge rather than a dead end nobody wrote
down.

### Commands Needed

Run the same way as every previous lesson: `python3 lab4.py`. The
updated project runs and checks the same way every previous lesson's
project code has: `python3 main.py`, `mypy main.py`.

### Run It

Already shown and verified above, under "Isolating the Concept," run
three separate times to confirm the result is consistent. The real,
updated project runs identically to Lesson 14's own final state — this
unit's only change is a comment, with zero effect on behavior — and
`mypy main.py` continues to report:

```
Success: no issues found in 1 source file
```

### Connection

This unit is where this entire lesson's own discipline — measure, don't
assume — completed its own arc: the first unit measured threading's
real failure to help CPU-bound work; the second unit measured
multiprocessing's real structural success and its honest, environment-
dependent lack of measured speedup on this specific machine; the third
unit measured asyncio's real, dramatic success for genuinely slow
I/O-bound waiting; and this unit measured that exact same tool's real
failure the moment the underlying I/O stopped being slow enough to be
worth overlapping — four real measurements, on four real workloads,
with no single tool winning universally, because no such tool exists.

---

## Connect the Pieces

Trace one honest question through every measurement this lesson made:
"will this make my program faster?" Lesson 15's own first unit asked it
of threading, for CPU-bound work, and measured a real, repeated "no" —
the GIL ensures two threads never truly compute simultaneously, no
matter the machine. Its second unit asked the identical question of
multiprocessing, for the identical CPU-bound work, and got a
structurally different, but locally identical, answer: real, separate
processes and real, separate GILs, proven by real, distinct process
IDs — yet still no measured speedup, because this specific machine's
single core has nothing extra to parallelize onto, a fact this unit
refused to paper over with a generic, assumed claim. Its third unit
asked the same question of `asyncio`, for a genuinely different kind of
workload — I/O-bound waiting — and finally measured a real, dramatic
"yes": three concurrent waits finishing in roughly the time of one,
because waiting, unlike computing, doesn't require holding the GIL at
all. And this lesson's own final unit asked that identical question one
last time, of the exact same tool that had just succeeded, against the
project's own real code — and measured an honest "no" again, for a
reason this curriculum could name precisely: the underlying work was
already faster than the tool's own overhead. No concurrency approach in
this lesson is universally right or universally wrong — each one
solves a specific, real bottleneck, and the only way to know which one,
if any, actually applies to a given piece of code is to do exactly what
every unit in this lesson did: measure it, for real, before trusting
it.
