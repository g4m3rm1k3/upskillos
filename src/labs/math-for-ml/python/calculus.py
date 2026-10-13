"""Change: rates, derivatives built from their definition, the chain rule, gradients and gradient descent."""
from symbols import sigmoid


def height(t):
    """The falling ball of Part 2: 20 m up at t = 0, falling with g = 10 m/s²."""
    return 20 - 5 * t * t


def average_rate(f, a, b):
    """How fast f changes between a and b on average: rise over run."""
    return (f(b) - f(a)) / (b - a)


def shrinking(f, x, steps=6):
    """Average rates over smaller and smaller intervals [x, x + h]: they close in on the rate at x."""
    rates = []
    h = 1.0
    for _ in range(steps):
        rates.append((h, average_rate(f, x, x + h)))
        h = h / 10
    return rates


def derivative(f, x, h=1e-5):
    """A numerical derivative: the average rate over a tiny interval centred on x."""
    return (f(x + h) - f(x - h)) / (2 * h)


def sigmoid_slope(z):
    """The chain rule's answer for σ: σ(z) × (1 − σ(z))."""
    s = sigmoid(z)
    return s * (1 - s)


def descend(slope, x, rate=0.1, steps=20):
    """Gradient descent in one dimension: step against the slope, `steps` times."""
    path = [x]
    for _ in range(steps):
        x = x - rate * slope(x)
        path.append(x)
    return path


def bowl(x, y):
    """A loss with two inputs: lowest at (3, −1)."""
    return (x - 3) ** 2 + 2 * (y + 1) ** 2


def bowl_gradient(x, y):
    """The partial derivatives of bowl: ∂/∂x holding y fixed, and ∂/∂y holding x fixed."""
    return 2 * (x - 3), 4 * (y + 1)


def descend_2d(x, y, rate=0.1, steps=30):
    """Gradient descent on the bowl: (x, y) ← (x, y) − rate × ∇f."""
    path = [(x, y)]
    for _ in range(steps):
        gx, gy = bowl_gradient(x, y)
        x = x - rate * gx
        y = y - rate * gy
        path.append((x, y))
    return path


def area(f, a, b, n=100):
    """The area under f from a to b, as n thin rectangles added up: a Riemann sum, on its way to ∫."""
    width = (b - a) / n
    s = 0.0
    for i in range(n):
        s += f(a + (i + 0.5) * width) * width
    return s


def show_change():
    """The rate of the falling ball at 1 s, closing in; then gradient descent on x²."""
    for h, rate in shrinking(height, 1.0):
        print("h =", h, " average rate =", rate)
    print("descent on (x - 3)^2 from 0:", descend(lambda x: 2 * (x - 3), 0.0, 0.1, 10)[-1])
