import sys, json, time
import torch
torch.set_num_threads(1)
sys.path.insert(0, r"C:\Users\g4m3r\AppData\Local\Temp\claude\c--Users-g4m3r-Documents-testing-tutorials-open-calc\ad83e4b4-622b-4bee-968c-3545072979cf\scratchpad\acproj")
from a2c import train_a2c, play_greedy
seed = int(sys.argv[1])
start = time.perf_counter()
net, curve = train_a2c(seed=seed, quiet=True)
print("final", seed, json.dumps({"curve": curve, "greedy20": float(play_greedy(net).mean()), "seconds": round(time.perf_counter() - start, 1)}), flush=True)
