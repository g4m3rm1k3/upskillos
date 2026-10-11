def running_mean(samples):
    """The average of the samples so far, updated one sample at a time."""
    mean = 0.0
    history = []
    for n, x in enumerate(samples, start=1):
        mean += (x - mean) / n
        history.append(mean)
    return history


def constant_step(samples, alpha):
    """Like running_mean, but every new sample moves the estimate by the same fraction alpha."""
    estimate = 0.0
    history = []
    for x in samples:
        estimate += alpha * (x - estimate)
        history.append(estimate)
    return history
