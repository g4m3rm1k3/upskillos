import math
import random

LEFT, RIGHT = 0, 1
ACTION_NAMES = ["push left", "push right"]


class CartPole:
    """A cart on a track with a pole hinged on top: Gymnasium's CartPole-v1, written out in plain Python."""

    def __init__(self, max_steps=500, force=10.0, pole_mass=0.1, half_length=0.5):
        self.gravity = 9.8
        self.cart_mass = 1.0
        self.pole_mass = pole_mass
        self.total_mass = self.cart_mass + self.pole_mass
        self.half_length = half_length
        self.pole_moment = self.pole_mass * self.half_length
        self.force = force
        self.tau = 0.02
        self.x_limit = 2.4
        self.angle_limit = 12 * 2 * math.pi / 360
        self.max_steps = max_steps
        self.n_actions = 2
        self.rng = random.Random()
        self.state = None
        self.steps = 0

    def reset(self, seed=None):
        if seed is not None:
            self.rng.seed(seed)
        x = self.rng.uniform(-0.05, 0.05)
        x_dot = self.rng.uniform(-0.05, 0.05)
        theta = self.rng.uniform(-0.05, 0.05)
        theta_dot = self.rng.uniform(-0.05, 0.05)
        self.state = (x, x_dot, theta, theta_dot)
        self.steps = 0
        return self.state, {}

    def accelerations(self, theta, theta_dot, push):
        """Newton's laws for the cart and the pole: how fast the cart's speed and the pole's spin change."""
        cos_theta = math.cos(theta)
        sin_theta = math.sin(theta)
        temp = (push + self.pole_moment * theta_dot ** 2 * sin_theta) / self.total_mass
        theta_acc = (self.gravity * sin_theta - cos_theta * temp) / (
            self.half_length * (4.0 / 3.0 - self.pole_mass * cos_theta ** 2 / self.total_mass))
        x_acc = temp - self.pole_moment * theta_acc * cos_theta / self.total_mass
        return x_acc, theta_acc

    def step(self, action):
        x, x_dot, theta, theta_dot = self.state
        push = self.force if action == RIGHT else -self.force
        x_acc, theta_acc = self.accelerations(theta, theta_dot, push)
        x = x + self.tau * x_dot
        x_dot = x_dot + self.tau * x_acc
        theta = theta + self.tau * theta_dot
        theta_dot = theta_dot + self.tau * theta_acc
        self.state = (x, x_dot, theta, theta_dot)
        self.steps += 1
        terminated = x < -self.x_limit or x > self.x_limit or theta < -self.angle_limit or theta > self.angle_limit
        truncated = self.steps >= self.max_steps
        return self.state, 1.0, terminated, truncated, {}
