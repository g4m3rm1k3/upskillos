# pytest runs this file before any test in this folder.
# Maths libraries (NumPy's, PyTorch's) start one thread per CPU core by default. Two are plenty
# for the small checks in this series, and they leave the rest of the computer responsive while
# the tests run. They read these variables when they start, so they're set before any import.
import os

threads = os.environ.get("TORCH_NUM_THREADS", "2")
for name in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS"):
    os.environ.setdefault(name, threads)
