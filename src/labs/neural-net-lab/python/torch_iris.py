import torch
from torch import nn

from iris import SPECIES, load_iris
from softmax import cross_entropy, softmax


def check_cross_entropy():
    """PyTorch's CrossEntropyLoss beside softmax and cross-entropy written by hand."""
    logits = torch.tensor([[2.0, 0.5, -1.0], [0.1, 0.2, 3.0]])
    labels = torch.tensor([0, 1])
    with_torch = nn.CrossEntropyLoss()(logits, labels).item()
    by_hand = 0.0
    for scores, label in zip(logits.tolist(), labels.tolist()):
        by_hand += cross_entropy(softmax(scores), label) / 2
    print("PyTorch:", with_torch, "by hand:", by_hand)
    return with_torch, by_hand


def confusion_matrix(guesses, labels, n_classes):
    """A table of counts: row = the true class, column = the class guessed."""
    table = [[0] * n_classes for c in range(n_classes)]
    for guess, label in zip(guesses, labels):
        table[label][guess] += 1
    return table


def train_iris(hidden=8, steps=1000, rate=0.1, seed=0):
    """All four measurements -> hidden -> 3 scores, trained with CrossEntropyLoss."""
    torch.manual_seed(seed)
    rows, labels = load_iris(("sepal_length", "sepal_width", "petal_length", "petal_width"))
    x = torch.tensor(rows)
    x = (x - x.mean(dim=0)) / x.std(dim=0)
    y = torch.tensor(labels)
    model = nn.Sequential(nn.Linear(4, hidden), nn.ReLU(), nn.Linear(hidden, len(SPECIES)))
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    for step in range(steps):
        loss = loss_fn(model(x), y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        guesses = model(x).argmax(dim=1).tolist()
    table = confusion_matrix(guesses, labels, len(SPECIES))
    print("loss", round(loss.item(), 4), "confusion (rows true, columns guessed):", table)
    return model, table
