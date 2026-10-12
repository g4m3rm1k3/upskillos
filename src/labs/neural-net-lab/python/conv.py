from preprocess import example

KERNELS = {
    "vertical edges": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    "horizontal edges": [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    "blur": [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
}


def convolve(image, kernel):
    """Slide the kernel over the image; at each place, multiply the overlapping numbers and add them up."""
    k = len(kernel)
    out = []
    for r in range(len(image) - k + 1):
        row = []
        for c in range(len(image[0]) - k + 1):
            total = 0.0
            for i in range(k):
                for j in range(k):
                    total += image[r + i][c + j] * kernel[i][j]
            row.append(total)
        out.append(row)
    return out


def relu_map(image):
    """ReLU on every number of a picture."""
    return [[max(0.0, v) for v in row] for row in image]


def max_pool(image, size=2):
    """Each size x size block replaced by its largest number: half the width and height, the strongest signals kept."""
    out = []
    for r in range(0, len(image) - size + 1, size):
        row = []
        for c in range(0, len(image[0]) - size + 1, size):
            row.append(max(image[r + i][c + j] for i in range(size) for j in range(size)))
        out.append(row)
    return out


def show_filters():
    """The example 7 through each filter, then ReLU and pooling: the picture a convolution layer passes on."""
    digit = example()
    maps = {}
    for name, kernel in KERNELS.items():
        maps[name] = max_pool(relu_map(convolve(digit, kernel)))
    print({name: (len(m), len(m[0])) for name, m in maps.items()})
    return maps
