# How seed 0's agent fails most often when bumps cost only -0.04, in the prediction's words.
from rewards import VARIANTS, endings, train_maze

CHOICES = {
    "stands still against a wall": "Standing still against a wall",
    "steps back and forth": "Stepping back and forth",
    "wanders": "Wandering in a bigger loop",
}
counts = endings(train_maze(VARIANTS["no wall penalty"]))
failures = {kind: n for kind, n in counts.items() if kind != "reached the cheese"}
print(CHOICES[max(failures, key=failures.get)])
