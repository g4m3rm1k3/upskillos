import math


def dense(inputs, weights, biases):
    """A layer of neurons: each one's weights times the inputs, added up, plus its bias."""
    outputs = []
    for neuron_weights, bias in zip(weights, biases):
        total = bias
        for w, x in zip(neuron_weights, inputs):
            total += w * x
        outputs.append(total)
    return outputs


def relu(values):
    """ReLU: every negative number becomes 0; the rest pass through unchanged."""
    return [max(0.0, v) for v in values]


def sigmoid(values):
    """Sigmoid: squashes any number into the range 0 to 1."""
    return [1 / (1 + math.exp(-v)) for v in values]


def tanh(values):
    """Tanh: squashes any number into the range -1 to 1."""
    return [math.tanh(v) for v in values]


def show_layer(x=2.0):
    """Three neurons looking at one input: what each adds up to, and what each activation makes of that."""
    weights = [[1.5], [-0.5], [0.8]]
    biases = [0.0, 1.0, -2.0]
    z = dense([x], weights, biases)
    return z, relu(z), sigmoid(z), tanh(z)
