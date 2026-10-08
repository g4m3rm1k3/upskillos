import numpy as np


def visited(Q):
    return int(np.count_nonzero(Q.any(axis=1)))
