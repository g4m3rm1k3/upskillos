---
title: 3 — The GIL: Why Python Threads Don't Speed Up CPU Work
track: Python Internals — Inside CPython
trackOrder: 12
runtime: cpp
console: true
---

You've probably heard that Python threads don't make CPU-heavy code faster — and might have wondered why Python even has threads at all. The answer is the **Global Interpreter Lock (GIL)**: a mutex inside CPython that ensures only one thread executes Python bytecode at a time. This lesson shows you exactly what the GIL is, what it protects, when CPython releases it, and how to work around it for CPU-bound work.

By the end you'll understand not just the *what* but the *why* — the GIL exists because of the reference counting system you studied in the previous lesson.

## Step 1 — Show that Python threads don't speed up CPU-bound work

**This step:** You time a CPU-intensive function running in one thread vs. two threads and observe that two threads is no faster.

```python
import threading, time

def cpu_task(n=50_000_000):
    """Burn CPU: count down from n."""
    while n > 0:
        n -= 1

# --- Single thread ---
start = time.perf_counter()
cpu_task()
single = time.perf_counter() - start
print(f"Single thread : {single:.2f}s")

# --- Two threads ---
t1 = threading.Thread(target=cpu_task)
t2 = threading.Thread(target=cpu_task)
start = time.perf_counter()
t1.start(); t2.start()
t1.join();  t2.join()
double = time.perf_counter() - start
print(f"Two threads   : {double:.2f}s")

print(f"Speedup       : {single/double:.2f}x  (expected ~1.0, not 2.0)")
```

On CPython you'll see a *slowdown* with two threads, not a speedup. The threads spend time fighting over the GIL, adding scheduling overhead on top of doing the same amount of work.

```check
run "python -c \"\nimport threading, time\ndone = []\ndef t(): [done.append(1) for _ in range(100)]\nthreads = [threading.Thread(target=t) for _ in range(2)]\n[x.start() for x in threads]\n[x.join() for x in threads]\nprint(len(done) == 200)\n\"" stdout="True" -- Threading works correctly (the GIL ensures thread safety)
```

## Step 2 — Show that Python threads DO help with I/O-bound work

**This step:** You time downloading (or sleeping to simulate I/O) sequentially vs. concurrently with threads, and confirm threads do give a speedup.

When a thread is waiting for I/O (network, disk, `time.sleep`), CPython *releases the GIL* so other threads can run. This is why threads are genuinely useful for I/O-bound programs:

```python
import threading, time

def io_task():
    """Simulate blocking I/O with sleep."""
    time.sleep(0.5)

N = 8

# Sequential
start = time.perf_counter()
for _ in range(N):
    io_task()
sequential = time.perf_counter() - start
print(f"Sequential ({N} tasks): {sequential:.2f}s")

# Threaded
threads = [threading.Thread(target=io_task) for _ in range(N)]
start = time.perf_counter()
for t in threads: t.start()
for t in threads: t.join()
concurrent = time.perf_counter() - start
print(f"Threaded   ({N} tasks): {concurrent:.2f}s")

print(f"Speedup: {sequential/concurrent:.1f}x")
```

You should see roughly an 8× speedup with threads — all 8 sleeps overlap. For I/O-bound work (web scraping, API calls, reading files), `threading` or `asyncio` are the right tools.

```check
run "python -c \"\nimport threading, time\nresults = []\ndef task(): time.sleep(0.1); results.append(1)\nthreads = [threading.Thread(target=task) for _ in range(4)]\nstart = time.perf_counter()\nfor t in threads: t.start()\nfor t in threads: t.join()\nelapsed = time.perf_counter() - start\nprint(elapsed < 0.3)  # 4 sleeps in parallel should take ~0.1s, not 0.4s\n\"" stdout="True" -- Threads should parallelize I/O-bound sleep correctly
```

## Step 3 — Understand what the GIL protects (C-level refcounting)

**This step:** You reason through why removing the GIL without replacing it would corrupt the reference count of every Python object.

The GIL exists primarily to protect CPython's **reference counting** from data races. Here's the problem:

```python
# Imagine two threads share object x (refcount = 1)
# Thread 1 wants to create a new reference: Py_INCREF(x)
# Thread 2 wants to drop a reference:       Py_DECREF(x)

# Without the GIL, in C this is:
#   Thread 1: load ob_refcnt  → register = 1
#   Thread 2: load ob_refcnt  → register = 1
#   Thread 1: register += 1   → register = 2
#   Thread 2: register -= 1   → register = 0  ← BUG: sees old value!
#   Thread 1: store 2         → ob_refcnt = 2
#   Thread 2: store 0         → ob_refcnt = 0  ← object freed while still live!
```

The C increment/decrement (`++`/`--`) is **not atomic** — it compiles to load-modify-store. A race condition between two threads could decrement refcount to 0 and free an object that is still in use, or increment it past the real value and cause a memory leak.

The GIL is a single `pthread_mutex_t` (on POSIX systems). Every bytecode instruction that could affect a Python object is executed while holding this lock.

```python
import sys

# The GIL is checked every sys.getswitchinterval() seconds
print(f"GIL switch interval: {sys.getswitchinterval()*1000:.1f}ms")

# You can make it switch more often (not usually recommended):
# sys.setswitchinterval(0.0001)
```

```check
run "python -c \"import sys; print(sys.getswitchinterval() > 0)\"" stdout="True" -- GIL switch interval should be a positive number
```

## Step 4 — Release the GIL in C: `Py_BEGIN_ALLOW_THREADS` pattern

**This step:** You write a C function that releases the GIL during a long computation, allowing other Python threads to run concurrently.

C extension modules can release the GIL for the duration of a blocking or CPU-intensive operation. This is exactly what NumPy, PIL, and most scientific Python libraries do — they drop the GIL during the heavy C/Fortran computation, then re-acquire it to return results to Python.

```c file=gil_release_demo.c
/*
 * Demonstrates the Py_BEGIN_ALLOW_THREADS / Py_END_ALLOW_THREADS pattern.
 *
 * In a real extension you'd compile this with:
 *   gcc -shared -fPIC -o gil_demo.so gil_release_demo.c $(python3-config --includes --ldflags)
 *
 * Here we show the pattern without actually linking against Python.
 */

#include <stdio.h>
#include <unistd.h>    /* sleep() */

/*
 * -----------------------------------------------------------------------
 * Pseudocode equivalent of the CPython GIL macros:
 *
 *   Py_BEGIN_ALLOW_THREADS   →  save thread state, release GIL
 *   Py_END_ALLOW_THREADS     →  re-acquire GIL, restore thread state
 * -----------------------------------------------------------------------
 *
 * Inside the BEGIN/END block:
 *   - Other Python threads CAN run (GIL is free)
 *   - You MUST NOT touch any Python objects (PyObject*)
 *   - You CAN do blocking I/O, sleep, heavy computation, etc.
 */

/* Simulated versions (no Python.h required for this demo) */
typedef struct { int placeholder; } PyThreadState;
static PyThreadState _save;

#define MY_BEGIN_ALLOW_THREADS  \
    { printf("  [GIL released — C code running, Python threads can proceed]\n");

#define MY_END_ALLOW_THREADS    \
    printf("  [GIL re-acquired — back to Python land]\n"); }

void do_heavy_work_gil_released(int seconds) {
    printf("Entering heavy C function (will release GIL for %ds)...\n", seconds);

    MY_BEGIN_ALLOW_THREADS
        /* Safe to do blocking/CPU work here.
         * In real code this would be the actual computation. */
        sleep(seconds);
    MY_END_ALLOW_THREADS

    printf("Heavy C function done.\n");
}

int main(void) {
    printf("=== GIL release pattern demo ===\n\n");
    do_heavy_work_gil_released(1);
    printf("\nPattern: BEGIN releases, END re-acquires.\n");
    printf("Between them, other Python threads run freely.\n");
    return 0;
}
```

The real CPython macros (`Include/cpython/pystate.h`) save the thread state pointer, NULL out the interpreter's current thread, and release the mutex — three operations that happen atomically from C's perspective.

```check
file gil_release_demo.c
run "gcc gil_release_demo.c -o gil_release_demo && ./gil_release_demo" stdout="GIL released" -- The GIL release pattern should print the expected messages
contains gil_release_demo.c "BEGIN_ALLOW_THREADS"
contains gil_release_demo.c "END_ALLOW_THREADS"
```

## Step 5 — Use `multiprocessing` instead for CPU work

**This step:** You replace threads with processes and observe true parallel speedup for CPU-bound work.

Each `multiprocessing.Process` gets its own Python interpreter and its own GIL. They can't share Python objects directly (they communicate via queues/pipes using serialisation), but they can run on separate CPU cores simultaneously.

```python
import multiprocessing, time

def cpu_task(n=50_000_000):
    while n > 0:
        n -= 1
    return "done"

if __name__ == "__main__":   # Required on Windows due to how processes start
    N = multiprocessing.cpu_count()
    print(f"CPU cores available: {N}")

    # Single process baseline
    start = time.perf_counter()
    cpu_task()
    single = time.perf_counter() - start
    print(f"Single process : {single:.2f}s")

    # Multiple processes
    with multiprocessing.Pool(processes=min(N, 4)) as pool:
        start = time.perf_counter()
        results = pool.starmap(cpu_task, [(50_000_000,)] * min(N, 4))
        multi = time.perf_counter() - start

    print(f"Multiprocessing: {multi:.2f}s  (speedup: {single*min(N,4)/multi:.1f}x)")
```

For modern Python, also consider:
- `concurrent.futures.ProcessPoolExecutor` — higher-level API
- `multiprocessing.shared_memory` — share raw buffers without pickling
- Third-party: `joblib`, `ray`, `dask` for distributed computation

```check
run "python -c \"import multiprocessing; print(multiprocessing.cpu_count() >= 1)\"" stdout="True" -- Should detect at least 1 CPU core
```

## Step 6 — Challenge: write a C function that releases the GIL

**This step:** You write a complete C extension skeleton that includes `Py_BEGIN_ALLOW_THREADS` / `Py_END_ALLOW_THREADS` around a sleep, callable from Python.

```c file=nogil_ext.c
/*
 * nogil_ext.c — minimal C extension that releases the GIL.
 *
 * Build (Linux/Mac):
 *   gcc -shared -fPIC -o nogil_ext.so nogil_ext.c \
 *       $(python3-config --includes --ldflags)
 *
 * Usage in Python:
 *   import ctypes
 *   lib = ctypes.CDLL("./nogil_ext.so")
 *   # or, if built as a proper extension:
 *   import nogil_ext
 *   nogil_ext.sleep_nogil(2)
 */

#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <unistd.h>

/*
 * sleep_nogil(seconds) — sleep for 'seconds' seconds while the GIL
 * is released, allowing other threads to run Python code.
 */
static PyObject *
py_sleep_nogil(PyObject *self, PyObject *args) {
    int seconds;
    if (!PyArg_ParseTuple(args, "i", &seconds))
        return NULL;

    Py_BEGIN_ALLOW_THREADS          /* release GIL here */
    sleep(seconds);                 /* blocking call — other threads can run */
    Py_END_ALLOW_THREADS            /* re-acquire GIL */

    Py_RETURN_NONE;
}

static PyMethodDef NogGilMethods[] = {
    {"sleep_nogil", py_sleep_nogil, METH_VARARGS,
     "Sleep for N seconds, releasing the GIL while waiting."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef nogil_module = {
    PyModuleDef_HEAD_INIT, "nogil_ext", NULL, -1, NogGilMethods
};

PyMODINIT_FUNC PyInit_nogil_ext(void) {
    return PyModule_Create(&nogil_module);
}
```

```hints
nudge: The key invariant: inside `Py_BEGIN_ALLOW_THREADS` / `Py_END_ALLOW_THREADS`, you must not call any Python C API functions or touch any `PyObject*`. Doing so will crash or corrupt the interpreter.
concept: When you call `Py_BEGIN_ALLOW_THREADS`, CPython saves the current thread's state (registers, stack frame, etc.) into a `PyThreadState` struct, sets the interpreter's current thread pointer to NULL, and unlocks the GIL mutex. Any other thread waiting on the GIL can now acquire it and run.
shape: `Py_BEGIN_ALLOW_THREADS` opens a C block (`{`). `Py_END_ALLOW_THREADS` closes it (`}`). This is intentional: it scopes the GIL-free region visually, just like `with` does in Python.
```

```check
file nogil_ext.c
contains nogil_ext.c "Py_BEGIN_ALLOW_THREADS"
contains nogil_ext.c "Py_END_ALLOW_THREADS"
contains nogil_ext.c "PyArg_ParseTuple"
contains nogil_ext.c "Py_RETURN_NONE"
```
