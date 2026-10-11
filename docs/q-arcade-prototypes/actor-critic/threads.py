# Wall time and CPU time of one A2C run of 60,000 steps, with PyTorch's default threads and with 1.
import sys, time
import torch
sys.path.insert(0, r"C:\Users\g4m3r\AppData\Local\Temp\claude\c--Users-g4m3r-Documents-testing-tutorials-open-calc\ad83e4b4-622b-4bee-968c-3545072979cf\scratchpad\acproj")
from a2c import train_a2c
if sys.argv[1] == "1":
    torch.set_num_threads(1)
wall, cpu = time.perf_counter(), time.process_time()
_, curve = train_a2c(total_steps=60_000, quiet=True)
print(f"threads={torch.get_num_threads():2}  wall {time.perf_counter() - wall:5.1f} s  CPU {time.process_time() - cpu:6.1f} s  curve {[int(v) for _, v in curve]}", flush=True)
