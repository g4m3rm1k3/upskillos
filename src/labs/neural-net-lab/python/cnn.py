import random

import torch
from torch import nn

from mnist import load_mnist
from mnist_net import batches


def make_cnn():
    """8 filters of 3 x 3, ReLU, 2 x 2 max pooling, then one layer from the 8 pooled pictures to 10 scores."""
    return nn.Sequential(
        nn.Conv2d(1, 8, kernel_size=3),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Flatten(),
        nn.Linear(8 * 13 * 13, 10),
    )


def make_dense():
    """For comparison: lesson 4.3's network, 784 -> 128 -> 10."""
    return nn.Sequential(nn.Flatten(), nn.Linear(784, 128), nn.ReLU(), nn.Linear(128, 10))


def train(model, images, labels, epochs=1, batch_size=64, rate=0.1, seed=0):
    """Mini-batch training, as in lesson 4.3; images arrive as N x 1 x 28 x 28 pictures."""
    rng = random.Random(seed)
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    for epoch in range(epochs):
        for batch in batches(len(images), batch_size, rng):
            index = torch.tensor(batch)
            loss = loss_fn(model(images[index]), labels[index])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
    return model


def accuracy(model, images, labels, shift=0):
    """The fraction right, with every test picture first moved `shift` pixels to the right."""
    with torch.no_grad():
        moved = torch.roll(images, shifts=shift, dims=3)
        return (model(moved).argmax(dim=1) == labels).float().mean().item()


def compare(epochs=1, seed=0):
    """The CNN against the plain network: weights, accuracy, and accuracy on digits moved sideways."""
    torch.manual_seed(seed)
    x, y = load_mnist("train")
    test_x, test_y = load_mnist("test")
    x = x.view(-1, 1, 28, 28)
    test_x = test_x.view(-1, 1, 28, 28)
    results = {}
    for name, model in (("dense", make_dense()), ("cnn", make_cnn())):
        train(model, x, y, epochs=epochs, seed=seed)
        weights = sum(p.numel() for p in model.parameters())
        results[name] = [weights] + [round(accuracy(model, test_x, test_y, shift), 4) for shift in (0, 2, 4)]
        print(name, "weights", weights, "accuracy moved 0, 2, 4 pixels:", results[name][1:])
    return results
