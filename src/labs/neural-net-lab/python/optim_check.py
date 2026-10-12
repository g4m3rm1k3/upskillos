import torch

from optimizers import adam_step, momentum_step, valley_gradient


def check_against_torch(steps=20):
    """The hand-written momentum and Adam beside torch.optim's, on the same valley from the same start."""
    gaps = {}
    for name, step, make in (("momentum", momentum_step, lambda p: torch.optim.SGD(p, lr=0.004, momentum=0.9)),
                             ("adam", adam_step, lambda p: torch.optim.Adam(p, lr=0.5))):
        rate = 0.004 if name == "momentum" else 0.5
        w = [-9.0, 1.5]
        state = {}
        weight = torch.tensor([-9.0, 1.5], dtype=torch.float64, requires_grad=True)
        optimizer = make([weight])
        largest = 0.0
        for i in range(steps):
            w = step(w, valley_gradient(w), state, rate)
            loss = 0.5 * (weight[0] ** 2 + 100 * weight[1] ** 2)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            largest = max(largest, max(abs(a - b) for a, b in zip(w, weight.tolist())))
        gaps[name] = largest
        print(name, "largest difference from torch.optim over", steps, "steps:", largest)
    return gaps
