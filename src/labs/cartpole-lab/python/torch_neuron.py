import torch

from neuron import XS, YS, gradients


def autograd_check(w=0.5, b=-0.3):
    """The same neuron in PyTorch: autograd's gradients beside the ones worked out by hand."""
    weight = torch.tensor(w, requires_grad=True)
    bias = torch.tensor(b, requires_grad=True)
    xs = torch.tensor(XS)
    ys = torch.tensor(YS)
    predictions = weight * xs + bias
    loss = ((predictions - ys) ** 2).mean()
    loss.backward()
    by_hand = gradients(w, b)
    print("autograd:", weight.grad.item(), bias.grad.item())
    print("by hand: ", by_hand[0], by_hand[1])
    return weight.grad.item(), bias.grad.item(), by_hand
