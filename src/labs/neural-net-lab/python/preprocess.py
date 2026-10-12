def ink_box(image):
    """The smallest box around every inked pixel: (top, bottom, left, right), inclusive."""
    rows = [r for r, row in enumerate(image) if any(v > 0 for v in row)]
    cols = [c for c in range(len(image[0])) if any(row[c] > 0 for row in image)]
    return rows[0], rows[-1], cols[0], cols[-1]


def shrink(image, size):
    """Resize to size x size (keeping the shape: the longer side becomes size), each new pixel the
    average of the old pixels it covers."""
    height, width = len(image), len(image[0])
    scale = max(height, width) / size
    new_h, new_w = max(1, round(height / scale)), max(1, round(width / scale))
    out = []
    for r in range(new_h):
        row = []
        for c in range(new_w):
            r0, r1 = int(r * scale), max(int(r * scale) + 1, int((r + 1) * scale))
            c0, c1 = int(c * scale), max(int(c * scale) + 1, int((c + 1) * scale))
            cells = [image[i][j] for i in range(r0, min(r1, height)) for j in range(c0, min(c1, width))]
            row.append(sum(cells) / len(cells))
        out.append(row)
    return out


def centre_of_mass(image):
    """The ink's balance point: the average row and column, each pixel weighted by its ink."""
    total = sum(sum(row) for row in image)
    row_mean = sum(r * v for r, row in enumerate(image) for v in row) / total
    col_mean = sum(c * v for row in image for c, v in enumerate(row)) / total
    return row_mean, col_mean


def to_mnist(image):
    """Any drawing (rows of ink amounts 0 to 1) made the way MNIST's digits were: the ink cropped,
    shrunk to fit a 20 x 20 box, and placed in a 28 x 28 image with its centre of mass in the middle."""
    top, bottom, left, right = ink_box(image)
    crop = [row[left:right + 1] for row in image[top:bottom + 1]]
    small = shrink(crop, 20)
    row_mean, col_mean = centre_of_mass(small)
    shift_r, shift_c = round(14 - row_mean - 0.5), round(14 - col_mean - 0.5)
    out = [[0.0] * 28 for r in range(28)]
    for r, row in enumerate(small):
        for c, v in enumerate(row):
            if 0 <= r + shift_r < 28 and 0 <= c + shift_c < 28:
                out[r + shift_r][c + shift_c] = v
    return out


def example():
    """A made-up drawing, a thick 7 in the corner of a 60 x 60 canvas, prepared like MNIST."""
    canvas = [[0.0] * 60 for r in range(60)]
    for c in range(5, 30):
        for r in range(5, 9):
            canvas[r][c] = 1.0
    for step in range(25):
        for w in range(4):
            canvas[8 + step][29 - step // 2 - w] = 1.0
    return to_mnist(canvas)
