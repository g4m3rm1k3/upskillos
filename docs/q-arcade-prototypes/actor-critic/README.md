# Q-Arcade Chapter 4 (actor-critic) — how it was built

- `reference/` is the tested final code and tests for lessons 4.1–4.7.
- `build_4N.py` builds each lesson file from `reference/` (edit `PROJ` and `TRACK` in `build_common.py` to point at this folder and the track). Each step's file is assembled from the reference module's top-level blocks, so lesson code is always the tested code.
- `measured.json` holds every number the lessons quote; `baseline_runs.txt` is the raw 10-seed REINFORCE comparison.
- `proto.py`, `a3c_proto.py`, `grad_noise.py`, `baseline_seeds.py`, `measure_final.py`, `threads.py` produced the measurements. Run at most 2 at a time, with 1 thread (see the series plan's Chapter 4 measurements).
