# How long A3C with 2 workers takes for 200,000 steps, as one of the prediction's choices.
import time

import torch
import torch.multiprocessing as mp

from a3c import train_a3c

if __name__ == "__main__":
    mp.set_start_method("spawn")
    torch.set_num_threads(1)
    start = time.perf_counter()
    train_a3c()
    seconds = time.perf_counter() - start
    print("Much longer: over a minute" if seconds > 60 else f"{seconds:.0f} s")
