import numpy as np

TOLERANCE = 0.1  # the position tolerance zone is 0.2 mm across: radius 0.1 mm


def measure(n: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """n holes' measured (dx, dy) offsets in mm, and 1 if the hole is truly in tolerance, else 0."""
    rng = np.random.default_rng(seed)
    offsets = rng.uniform(-0.2, 0.2, (n, 2))
    true_distance = np.sqrt((offsets ** 2).sum(axis=1))
    measured = offsets + rng.normal(0, 0.01, (n, 2))
    return measured, (true_distance <= TOLERANCE).astype(int)
