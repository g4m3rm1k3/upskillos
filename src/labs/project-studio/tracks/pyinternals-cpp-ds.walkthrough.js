// Walkthrough definitions for "C++ Data Structures Powering Data Science"

export const WALKTHROUGH = {
  // ── 1. C++ vs C for Python ───────────────────────────────────────────────
  '01-cpp-vs-c-for-python#Step 3 — Templates': {
    run: ['g++ -std=c++20 -Wall -Wextra templates.cpp -o templates', './templates'],
    wrong: [
      { name: 'did not compile', fails: [0, 1] },
    ],
  },
  '01-cpp-vs-c-for-python#Step 6 — Challenge: template a statistics function': {
    run: ['g++ -std=c++20 -Wall -Wextra stats.cpp -o stats', './stats'],
    wrong: [
      { name: 'wrong results', fails: [1] },
    ],
  },

  // ── 2. Array Memory Layouts ──────────────────────────────────────────────
  '02-arrays-and-memory-layout#Step 2 — Implement a 2D array with strides': {
    run: ['g++ -std=c++20 -Wall -Wextra matrix.cpp -o matrix', './matrix'],
    wrong: [
      { name: 'wrong indexing', fails: [1] },
    ],
  },

  // ── 3. Templates and Generics ────────────────────────────────────────────
  '03-templates-and-generics#Step 4 — Template specialization': {
    run: ['g++ -std=c++20 -Wall -Wextra generic.cpp -o generic', './generic'],
    wrong: [
      { name: 'specialization missing', fails: [0] },
    ],
  },

  // ── 4. STL Containers ────────────────────────────────────────────────────
  '04-stl-containers#Step 5 — How pandas Index works': {
    run: ['g++ -std=c++20 -Wall -Wextra groupby.cpp -o groupby', './groupby'],
    wrong: [
      { name: 'wrong output', fails: [1] },
    ],
  },

  // ── 5. SIMD and Vectorization ────────────────────────────────────────────
  '05-simd-and-vectorization#Step 3 — Auto-vectorizing dot product': {
    run: ['g++ -std=c++20 -O2 -Wall -Wextra dotprod.cpp -o dotprod', './dotprod'],
    wrong: [
      { name: 'optimization flag missing', fails: [0] },
    ],
  },

  // ── 6. PyTorch Internals Tour ────────────────────────────────────────────
  '06-pytorch-internals-tour#Step 4 — Writing a custom C++ operator': {
    run: ['python setup.py build_ext --inplace', 'python test_op.py'],
    wrong: [
      { name: 'operator not registered', fails: [0] },
    ],
  },
};
