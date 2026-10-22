// Walkthrough definitions for "Making Python Fast: Profiling to Production"

export const WALKTHROUGH = {
  // ── 1. Profiling ─────────────────────────────────────────────────────────
  '01-profiling#Step 1 — cProfile from the command line': {
    run: ['python -m cProfile -s cumtime slow_pipeline.py'],
    wrong: [
      { name: 'did not create slow_pipeline.py', fails: [0] },
    ],
  },

  // ── 2. NumPy Speedups ────────────────────────────────────────────────────
  '02-numpy-speedups#Step 1 — Python loop vs NumPy vectorization': {
    run: ['python benchmark.py'],
    wrong: [
      { name: 'no NumPy in file', fails: [0] },
    ],
  },
  '02-numpy-speedups#Step 7 — Challenge: rewrite nested loop as broadcasting': {
    run: ['python broadcasting.py'],
    wrong: [
      { name: 'still uses a loop', fails: [0] },
    ],
  },

  // ── 3. Cython ────────────────────────────────────────────────────────────
  '03-cython#Step 1 — Install Cython and write a .pyx file': {
    run: ['pip install cython', 'python setup.py build_ext --inplace'],
    wrong: [
      { name: 'cython not installed', fails: [0] },
    ],
  },
  '03-cython#Step 7 — Challenge: Cythonize the slow function': {
    run: ['python setup.py build_ext --inplace', 'python bench_cython.py'],
    wrong: [
      { name: 'not faster than Python', fails: [1] },
    ],
  },

  // ── 4. Numba ─────────────────────────────────────────────────────────────
  '04-numba#Step 1 — @jit decorator': {
    run: ['pip install numba', 'python numba_demo.py'],
    wrong: [
      { name: 'numba not installed', fails: [0] },
    ],
  },

  // ── 5. cffi and ctypes ───────────────────────────────────────────────────
  '05-cffi-and-ctypes#Step 2 — Passing NumPy arrays to C': {
    run: ['gcc -shared -fPIC -O2 -o fast_lib.so fast_lib.c', 'python call_fast_lib.py'],
    wrong: [
      { name: 'did not compile shared lib', fails: [0] },
    ],
  },

  // ── 6. pybind11 in DS ────────────────────────────────────────────────────
  '06-pybind11-in-ds#Step 2 — Bind a function with std::vector<double>': {
    run: ['cmake -B build -S .', 'cmake --build build', 'python test_pybind.py'],
    wrong: [
      { name: 'did not configure CMake', fails: [0] },
    ],
  },

  // ── 7. Production Patterns ───────────────────────────────────────────────
  '07-production-patterns#Step 4 — cibuildwheel': {
    wrong: [
      { name: 'cibuildwheel.yml missing', fails: [0] },
    ],
  },
};
