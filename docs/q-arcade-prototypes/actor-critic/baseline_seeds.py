import sys, json, time
import numpy as np
import torch
torch.set_num_threads(1)
sys.path.insert(0, r"C:\Users\g4m3r\AppData\Local\Temp\claude\c--Users-g4m3r-Documents-testing-tutorials-open-calc\ad83e4b4-622b-4bee-968c-3545072979cf\scratchpad\acproj")
from policy import reinforce, greedy_lengths
seed, baseline = int(sys.argv[1]), sys.argv[2] == "1"
start = time.perf_counter()
net, lengths = reinforce(seed=seed, baseline=baseline)
print("reinforce", "baseline" if baseline else "plain", seed, json.dumps({"last50": float(np.mean(lengths[-50:])), "greedy20": float(greedy_lengths(net).mean()), "first500": next((i + 1 for i, l in enumerate(lengths) if l >= 500), None), "seconds": round(time.perf_counter() - start, 1)}), flush=True)
