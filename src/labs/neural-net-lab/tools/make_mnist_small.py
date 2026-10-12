"""Writes data/mnist-small.bin.gz, the browser's sample of MNIST: the first 3,000 training digits and
the first 1,000 test digits. Layout (before gzip): 4 bytes 'MNS1', then train count and test count
as 2-byte big-endian numbers, then every image (784 bytes, one per pixel, row by row), train images
first, then every label (1 byte). Run with the folder holding MNIST's four .gz files:

    python src/labs/neural-net-lab/tools/make_mnist_small.py <folder>
"""
import gzip
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
N_TRAIN, N_TEST = 3000, 1000


def read(folder, images, labels, n):
    with gzip.open(os.path.join(folder, images), "rb") as handle:
        data = handle.read()
    with gzip.open(os.path.join(folder, labels), "rb") as handle:
        marks = handle.read()
    return data[16:16 + n * 784], marks[8:8 + n]


def main(folder):
    train_x, train_y = read(folder, "train-images-idx3-ubyte.gz", "train-labels-idx1-ubyte.gz", N_TRAIN)
    test_x, test_y = read(folder, "t10k-images-idx3-ubyte.gz", "t10k-labels-idx1-ubyte.gz", N_TEST)
    body = b"MNS1" + struct.pack(">HH", N_TRAIN, N_TEST) + train_x + test_x + train_y + test_y
    path = os.path.join(HERE, "..", "data", "mnist-small.bin.gz")
    with gzip.open(path, "wb", compresslevel=9) as handle:
        handle.write(body)
    print("wrote", os.path.relpath(path), os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main(sys.argv[1])
