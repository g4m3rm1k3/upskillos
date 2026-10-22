// Walkthrough definitions for "C for Python Programmers"
// Keyed "<lesson file name>#<step title>"

export const WALKTHROUGH = {
  // ── 1. C Basics ──────────────────────────────────────────────────────────
  '01-c-basics#Step 1 — Your first C program': {
    run: ['gcc -std=c11 -Wall -Wextra hello.c -o hello', './hello'],
    wrong: [
      { name: 'did not create hello.c', fails: [0, 1] },
    ],
  },
  '01-c-basics#Step 7 — Challenge: write FizzBuzz in C': {
    run: ['gcc -std=c11 -Wall -Wextra fizzbuzz.c -o fizzbuzz', './fizzbuzz'],
    wrong: [
      { name: 'did not create fizzbuzz.c', fails: [0, 1] },
    ],
  },

  // ── 2. Functions and Headers ─────────────────────────────────────────────
  '02-functions-and-headers#Step 3 — Creating a header file': {
    wrong: [
      { name: 'did not create header', fails: [0] },
    ],
  },
  '02-functions-and-headers#Step 5 — Multiple .c files': {
    run: ['gcc -std=c11 -Wall -Wextra main.c mathutil.c -o mathprog', './mathprog'],
    wrong: [
      { name: 'did not link both files', fails: [0, 1] },
    ],
  },

  // ── 3. Pointers ──────────────────────────────────────────────────────────
  '03-pointers#Step 7 — Challenge: swap two ints using pointers': {
    run: ['gcc -std=c11 -Wall -Wextra swap.c -o swap', './swap'],
    wrong: [
      { name: 'did not use pointers', fails: [0] },
      { name: 'values not swapped', fails: [1] },
    ],
  },

  // ── 4. Arrays and Strings ────────────────────────────────────────────────
  '04-arrays-and-strings#Step 7 — Challenge: implement your own strlen': {
    run: ['gcc -std=c11 -Wall -Wextra mystrlen.c -o mystrlen', './mystrlen'],
    wrong: [
      { name: 'wrong result', fails: [1] },
    ],
  },

  // ── 5. Memory Management ─────────────────────────────────────────────────
  '05-memory-management#Step 2 — Heap memory: malloc allocates': {
    run: ['gcc -std=c11 -Wall -Wextra heap.c -o heap', './heap'],
    wrong: [
      { name: 'did not call malloc', fails: [0] },
    ],
  },
  '05-memory-management#Step 7 — Challenge: implement a dynamic array in C': {
    run: ['gcc -std=c11 -Wall -Wextra dynarray.c -o dynarray', './dynarray'],
    wrong: [
      { name: 'memory leak (no free)', fails: [0] },
    ],
  },

  // ── 6. Structs ───────────────────────────────────────────────────────────
  '06-structs#Step 7 — Challenge: implement a linked list node': {
    run: ['gcc -std=c11 -Wall -Wextra linked_list.c -o linked_list', './linked_list'],
    wrong: [
      { name: 'did not create file', fails: [0, 1] },
    ],
  },

  // ── 7. C Data Science Patterns ───────────────────────────────────────────
  '07-c-data-science-patterns#Step 6 — Challenge: dot product via ctypes': {
    run: ['gcc -shared -fPIC -O2 -o dotprod.so dotprod.c', 'python use_dotprod.py'],
    wrong: [
      { name: 'did not compile shared lib', fails: [0] },
    ],
  },
};
