"""Records what the real Python programs and PyTorch produce, for engine/parity.test.js to compare
with the JavaScript engine. Needs NumPy and PyTorch. Regenerate after changing python/:

    python src/labs/neural-net-lab/tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import torch                                         # noqa: E402
from torch import nn                                 # noqa: E402

from cars import load_cars, mean_and_spread, split   # noqa: E402
from data import make_curve, make_line               # noqa: E402
from neuron import fit_line                          # noqa: E402
from tinynet import init_net, train_net              # noqa: E402
from logistic import train_logistic                  # noqa: E402
from metrics import confusion, scores                # noqa: E402
from points2d import make_blobs, make_moons          # noqa: E402
from tumours import column_stats, load_tumours       # noqa: E402
from tumours import split as split_tumours           # noqa: E402
from digits import load_digits                       # noqa: E402
from digits import split as split_digits             # noqa: E402
from iris import train_softmax                       # noqa: E402
from softmax import softmax                          # noqa: E402
from torch_iris import confusion_matrix              # noqa: E402

ACT = {"relu": nn.ReLU, "tanh": nn.Tanh, "sigmoid": nn.Sigmoid}


def network_run(activation, optimiser, seed, loss_kind="mse"):
    """A 2 -> 5 -> 3 -> 1 network: its starting weights, a batch, its gradients, and its weights after 5 steps."""
    torch.manual_seed(seed)
    model = nn.Sequential(nn.Linear(2, 5), ACT[activation](), nn.Linear(5, 3), ACT[activation](), nn.Linear(3, 1))
    model = model.double()
    start = [[p.detach().tolist() for p in (model[i].weight, model[i].bias)] for i in (0, 2, 4)]
    x = torch.randn(7, 2, dtype=torch.float64)
    y = torch.randn(7, 1, dtype=torch.float64)
    if loss_kind == "bce":
        y = (y > 0).double()
    loss_fn = nn.BCEWithLogitsLoss() if loss_kind == "bce" else (lambda out, target: ((out - target) ** 2).mean())
    opt = {"sgd": lambda p: torch.optim.SGD(p, lr=0.05),
           "momentum": lambda p: torch.optim.SGD(p, lr=0.05, momentum=0.9),
           "adam": lambda p: torch.optim.Adam(p, lr=0.05)}[optimiser](model.parameters())
    grads = None
    losses = []
    for step in range(5):
        loss = loss_fn(model(x), y)
        opt.zero_grad()
        loss.backward()
        if grads is None:
            grads = [[p.grad.tolist() for p in (model[i].weight, model[i].bias)] for i in (0, 2, 4)]
        opt.step()
        losses.append(loss.item())
    end = [[p.detach().tolist() for p in (model[i].weight, model[i].bias)] for i in (0, 2, 4)]
    return {"activation": activation, "optimiser": optimiser, "loss": loss_kind, "start": start, "x": x.tolist(), "y": y.tolist(),
            "grads": grads, "losses": losses, "end": end}


def network_run_ce(optimiser, seed):
    """A 4 -> 6 -> 3 network on a multi-class batch, trained with CrossEntropyLoss for 5 steps."""
    torch.manual_seed(seed)
    model = nn.Sequential(nn.Linear(4, 6), nn.ReLU(), nn.Linear(6, 3)).double()
    start = [[p.detach().tolist() for p in (model[i].weight, model[i].bias)] for i in (0, 2)]
    x = torch.randn(9, 4, dtype=torch.float64)
    labels = torch.tensor([0, 1, 2, 2, 1, 0, 1, 2, 0])
    opt = {"sgd": lambda p: torch.optim.SGD(p, lr=0.05), "adam": lambda p: torch.optim.Adam(p, lr=0.05)}[optimiser](model.parameters())
    grads, losses = None, []
    for step in range(5):
        loss = nn.CrossEntropyLoss()(model(x), labels)
        opt.zero_grad()
        loss.backward()
        if grads is None:
            grads = [[p.grad.tolist() for p in (model[i].weight, model[i].bias)] for i in (0, 2)]
        opt.step()
        losses.append(loss.item())
    end = [[p.detach().tolist() for p in (model[i].weight, model[i].bias)] for i in (0, 2)]
    return {"optimiser": optimiser, "start": start, "x": x.tolist(), "labels": labels.tolist(), "grads": grads, "losses": losses, "end": end}


def main():
    out = {"line": make_line(), "curve": make_curve()}
    w, b, history = fit_line()
    out["fit_line"] = {"w": w, "b": b, "history": history}
    out["init_net"] = init_net(8, 0)
    net, history = train_net(hidden=8, steps=300)
    out["train_net"] = {"net": net, "history": history}
    train, test = split(load_cars())
    out["cars"] = {"train": [c[0] for c in train[:10]], "test": [c[0] for c in test[:10]], "n": [len(train), len(test)],
                   "stats": [mean_and_spread([c[1] for c in train]), mean_and_spread([c[2] for c in train])]}
    out["networks"] = [network_run(a, o, s) for s, (a, o) in enumerate([("relu", "sgd"), ("tanh", "momentum"), ("sigmoid", "adam"), ("relu", "adam")])]
    out["networks"] += [network_run("relu", "sgd", 7, "bce"), network_run("tanh", "adam", 8, "bce")]
    # Part 2
    out["blobs"] = make_blobs()
    out["moons"] = make_moons()
    w, b, history = train_logistic()
    out["logistic"] = {"w": w, "b": b, "history": history}
    probs = [0.9, 0.2, 0.6, 0.4, 0.51, 0.49, 0.05]
    labels = [1, 0, 0, 1, 1, 0, 0]
    out["confusion"] = {"probs": probs, "labels": labels, "at": {str(t): list(confusion(probs, labels, t)) for t in (0.3, 0.5, 0.7)},
                        "scores": list(scores(*confusion(probs, labels)))}
    rows, labels, names = load_tumours()
    (train_x, train_y), (test_x, test_y) = split_tumours(rows, labels)
    out["tumours"] = {"names": names, "n": [len(train_x), len(test_x)], "first_test": test_x[:3], "test_labels": test_y[:20],
                      "stats": column_stats(train_x)[:5]}
    # Part 3
    out["softmax"] = [softmax(s) for s in ([2.0, 1.0, 0.1], [0.0, 0.0, 0.0], [1000.0, 999.0, -5.0])]
    weights, biases, history = train_softmax()
    out["train_softmax"] = {"weights": weights, "biases": biases, "history": history}
    out["confusion_matrix"] = confusion_matrix([0, 1, 1, 2, 0, 2], [0, 1, 2, 2, 1, 2], 3)
    images, labels = load_digits()
    (train_x, train_y), (test_x, test_y) = split_digits(images, labels)
    out["digits"] = {"n": [len(train_x), len(test_x)], "test_labels": test_y[:30], "first_test": test_x[0]}
    out["networks_ce"] = [network_run_ce("sgd", 11), network_run_ce("adam", 12)]
    path = os.path.join(HERE, "..", "engine", "parity.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle)
    print("wrote", os.path.relpath(path))


if __name__ == "__main__":
    main()
