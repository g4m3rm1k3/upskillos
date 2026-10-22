// Walkthrough definitions for "Python Internals — Inside CPython"
// Keyed "<lesson file name>#<step title>"

export const WALKTHROUGH = {
  // ── 1. Every Python Object is a C Struct ─────────────────────────────────
  '01-python-object-model#Step 3 — Create a minimal C struct that mirrors PyObject': {
    wrong: [
      { name: 'did not create the file', fails: [0] },
    ],
  },
  '01-python-object-model#Step 4 — Write a C program that prints sizeof() values': {
    run: ['gcc -std=c11 -Wall -Wextra pyobject.c -o pyobject', './pyobject'],
    wrong: [
      { name: 'did not compile', fails: [0, 1] },
    ],
  },

  // ── 2. Reference Counting ────────────────────────────────────────────────
  '02-reference-counting#Step 3 — Write a manual reference-counted C struct': {
    wrong: [
      { name: 'did not create the file', fails: [0] },
    ],
  },
  '02-reference-counting#Step 4 — Implement Py_INCREF/Py_DECREF pattern manually': {
    run: ['gcc -std=c11 -Wall -Wextra refcount.c -o refcount', './refcount'],
    wrong: [
      { name: 'did not compile', fails: [0, 1] },
    ],
  },

  // ── 3. The GIL ───────────────────────────────────────────────────────────
  '03-the-gil#Step 1 — Show that Python threads do not speed up CPU-bound work': {
    run: ['python gil_demo.py'],
    wrong: [
      { name: 'did not create the file', fails: [0] },
    ],
  },

  // ── 4. Bytecode ──────────────────────────────────────────────────────────
  '04-bytecode#Step 1 — Disassemble a Python function with dis.dis': {
    run: ['python dis_demo.py'],
    wrong: [
      { name: 'did not create the file', fails: [0] },
    ],
  },

  // ── 5. ctypes ────────────────────────────────────────────────────────────
  '05-c-types-from-python#Step 3 — Write your own C shared library': {
    wrong: [
      { name: 'did not create the file', fails: [0] },
    ],
  },
  '05-c-types-from-python#Step 4 — Compile it with gcc -shared -fPIC': {
    run: ['gcc -shared -fPIC -o double_lib.so double_lib.c'],
    wrong: [
      { name: 'did not compile', fails: [0] },
    ],
  },

  // ── 6. C Extension Module ────────────────────────────────────────────────
  '06-pyobject-in-c#Step 5 — Write setup.py and build with pip': {
    run: ['pip install -e .'],
    wrong: [
      { name: 'did not create setup file', fails: [0] },
    ],
  },
};
