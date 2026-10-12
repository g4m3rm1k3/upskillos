import gzip
import os
import struct
import urllib.request

import torch

MIRROR = "https://ossci-datasets.s3.amazonaws.com/mnist/"
CACHE = os.path.join(os.path.expanduser("~"), ".cache", "upskillos-mnist")
FILES = {"train": ("train-images-idx3-ubyte.gz", "train-labels-idx1-ubyte.gz"),
         "test": ("t10k-images-idx3-ubyte.gz", "t10k-labels-idx1-ubyte.gz")}


def download(name):
    """One MNIST file, fetched into a cache folder the first time and read from there after."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(MIRROR + name, path)
    return path


def load_mnist(split="train", limit=None):
    """MNIST's images as a tensor (one row of 784 brightnesses, 0 to 1, per digit) and its labels."""
    images_file, labels_file = FILES[split]
    with gzip.open(download(images_file), "rb") as handle:
        data = handle.read()
    magic, count, rows, cols = struct.unpack(">IIII", data[:16])
    with gzip.open(download(labels_file), "rb") as handle:
        labels = handle.read()[8:]
    if limit:
        count = min(count, limit)
    pixels = torch.frombuffer(bytearray(data[16:16 + count * rows * cols]), dtype=torch.uint8)
    images = pixels.view(count, rows * cols).float() / 255
    return images, torch.tensor(list(labels[:count]))
