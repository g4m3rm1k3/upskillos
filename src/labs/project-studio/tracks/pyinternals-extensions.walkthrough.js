// Walkthrough definitions for "Writing C Extensions for Python"

export const WALKTHROUGH = {
  // ── 1. Anatomy of a C Extension Module ──────────────────────────────────
  '01-c-extension-anatomy#Step 5 — The init function': {
    wrong: [
      { name: 'did not create the file', fails: [0] },
    ],
  },
  '01-c-extension-anatomy#Step 6 — Challenge: export a constant': {
    run: ['python setup.py build_ext --inplace', 'python test_module.py'],
    wrong: [
      { name: 'module does not build', fails: [0] },
    ],
  },

  // ── 2. Parse and Build ───────────────────────────────────────────────────
  '02-parse-and-build#Step 3 — Py_BuildValue': {
    run: ['python setup.py build_ext --inplace', 'python test_parse.py'],
    wrong: [
      { name: 'parse fails', fails: [0, 1] },
    ],
  },

  // ── 3. Error Handling ────────────────────────────────────────────────────
  '03-error-handling#Step 2 — PyErr_SetString': {
    run: ['python setup.py build_ext --inplace', 'python test_errors.py'],
    wrong: [
      { name: 'exception not raised', fails: [1] },
    ],
  },

  // ── 4. Reference Counts ─────────────────────────────────────────────────
  '04-reference-counts#Step 7 — Challenge: find the refcount bug': {
    wrong: [
      { name: 'bug not found', fails: [0] },
    ],
  },

  // ── 5. NumPy C API ───────────────────────────────────────────────────────
  '05-numpy-c-api#Step 6 — Return a new NumPy array from C': {
    run: ['python setup.py build_ext --inplace', 'python test_numpy_ext.py'],
    wrong: [
      { name: 'array not returned correctly', fails: [1] },
    ],
  },

  // ── 6. C++ with pybind11 ─────────────────────────────────────────────────
  '06-cpp-extension#Step 2 — Write a minimal pybind11 module': {
    run: ['pip install pybind11', 'python setup.py build_ext --inplace'],
    wrong: [
      { name: 'pybind11 not installed', fails: [0] },
    ],
  },
};
