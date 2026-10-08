import time

from window import run

start = time.perf_counter()
run(max_frames=30)
took = time.perf_counter() - start
print("About half a second" if 0.3 < took < 1.0 else f"took {took:.2f} s")
