# Which table layout scores best after 500 episodes (3 seeds each).
from tables import SIZES, try_size

NAMES = {
    (1, 1, 6, 12): "72 rows, (1, 1, 6, 12)",
    (3, 3, 6, 6): "324 rows, (3, 3, 6, 6)",
    (6, 6, 12, 12): "5,184 rows, (6, 6, 12, 12)",
    (10, 10, 20, 20): "40,000 rows, (10, 10, 20, 20)",
}
means = {counts: try_size(counts, 500)[0].mean() for counts in SIZES}
print(NAMES[max(means, key=means.get)])
