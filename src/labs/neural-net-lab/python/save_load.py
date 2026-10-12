import os
import tempfile

import torch

from cnn import accuracy, make_cnn, train
from mnist import load_mnist


def save_and_load(limit=6000, seed=0):
    """Train a CNN, save its weights to a file, load them into a brand-new CNN, and check both answer alike."""
    torch.manual_seed(seed)
    x, y = load_mnist("train", limit)
    test_x, test_y = load_mnist("test", 1000)
    x, test_x = x.view(-1, 1, 28, 28), test_x.view(-1, 1, 28, 28)
    model = train(make_cnn(), x, y, seed=seed)
    path = os.path.join(tempfile.gettempdir(), "digit_cnn.pt")
    torch.save(model.state_dict(), path)
    fresh = make_cnn()
    fresh.load_state_dict(torch.load(path))
    fresh.eval()
    with torch.no_grad():
        same = torch.equal(model(test_x), fresh(test_x))
    print("saved to", path, os.path.getsize(path), "bytes; loaded model answers identically:", same,
          "; accuracy", round(accuracy(fresh, test_x, test_y), 4))
    return same, accuracy(fresh, test_x, test_y)
