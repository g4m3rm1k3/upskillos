"""Part 1: pretrain a base model on the notebook of sums, with every token counted."""
from gpt import Rng, init_model, new_adam_state, train_step
from arith import VOCAB, encode, notebook, exact_match


def pretrain(steps=1500, dim=16, context=16, hidden=64, lr=0.01, seed=1, lines=400):
    """Train on random windows of the notebook: each step predicts every next token of one window.
    Returns the model and the loss of every step."""
    ids = encode(notebook(lines, seed=0))
    model = init_model(len(VOCAB), dim, context, hidden, seed)
    state = new_adam_state(model)
    rng = Rng(seed + 1)
    losses = []
    for _ in range(steps):
        start = rng.below(len(ids) - context - 1)
        window = ids[start:start + context + 1]
        losses.append(train_step(model, state, window[:-1], window[1:], lr=lr))
    return model, losses


def pretrain_and_test(steps=1500):
    """Pretrain, then test on all 100 questions: what `python3 pretrain.py` prints."""
    model, losses = pretrain(steps)
    print("loss, last 100 steps:", round(sum(losses[-100:]) / 100, 3))
    print("exact match:", exact_match(model), "/ 100")
    return model


if __name__ == "__main__":
    pretrain_and_test()
