"""Change: rates, derivatives built from their definition, the chain rule, gradients and gradient descent."""
import math

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


def delta_for(f, a, limit, eps):
    """A δ that works for this ε: halve δ until every sampled x within δ of a has |f(x) − limit| < ε."""
    delta = 1.0
    while delta > 1e-12:
        xs = [a + delta * k / 50 for k in range(-50, 51) if k != 0]
        if all(abs(f(x) - limit) < eps for x in xs):
            return delta
        delta /= 2
    return None


def tanh(z):
    """tanh(z) = (e^z − e^(−z)) / (e^z + e^(−z)): an S-curve from −1 to 1."""
    return (math.exp(z) - math.exp(-z)) / (math.exp(z) + math.exp(-z))


def tanh_slope(z):
    """The quotient rule's answer: 1 − tanh(z)²."""
    t = tanh(z)
    return 1 - t * t


def logit(p):
    """The inverse of the sigmoid: the score z with σ(z) = p."""
    return math.log(p / (1 - p))


def logit_slope(p):
    """The inverse-function rule: 1 / σ′(z) = 1 / (p (1 − p))."""
    return 1 / (p * (1 - p))


def second_derivative(f, x, h=1e-4):
    """The slope of the slope: (f(x + h) − 2 f(x) + f(x − h)) / h²."""
    return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)


def eval_poly(coeffs, x):
    """a₀ + a₁x + a₂x² + …, from the coefficients, lowest power first."""
    total = 0.0
    for n, a in enumerate(coeffs):
        total += a * x ** n
    return total


def integrate_poly(coeffs):
    """An antiderivative of a polynomial: each a xⁿ becomes a xⁿ⁺¹/(n + 1), and the constant is 0."""
    return [0.0] + [a / (n + 1) for n, a in enumerate(coeffs)]


def definite_poly(coeffs, a, b):
    """∫ from a to b of a polynomial, by the fundamental theorem: F(b) − F(a)."""
    F = integrate_poly(coeffs)
    return eval_poly(F, b) - eval_poly(F, a)


def normal_moment(k, n=4000):
    """∫ zᵏ φ(z) dz for the standard bell curve φ, by strips from −10 to 10."""
    return area(lambda z: z ** k * math.exp(-z * z / 2) / math.sqrt(2 * math.pi), -10, 10, n)


def taylor(derivatives, a, x):
    """f(a) + f′(a)(x − a) + f″(a)(x − a)²/2! + …, from the list of derivatives at a."""
    total = 0.0
    factor = 1.0
    for k, d in enumerate(derivatives):
        total += d * factor
        factor *= (x - a) / (k + 1)
    return total


def taylor_exp(x, n):
    """The degree-n Taylor polynomial of eˣ at 0, and the remainder bound e^|x| |x|ⁿ⁺¹/(n + 1)!."""
    total = 0.0
    term = 1.0
    for k in range(n + 1):
        total += term
        term *= x / (k + 1)
    return total, math.exp(abs(x)) * abs(term)


def show_change():
    """The rate of the falling ball at 1 s, closing in; then gradient descent on x²."""
    for h, rate in shrinking(height, 1.0):
        print("h =", h, " average rate =", rate)
    print("descent on (x - 3)^2 from 0:", descend(lambda x: 2 * (x - 3), 0.0, 0.1, 10)[-1])
