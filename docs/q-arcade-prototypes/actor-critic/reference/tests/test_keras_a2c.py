# Tests for keras_a2c.py (lesson 4.6).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_keras_a2c.py
import numpy as np
import pytest
import torch

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning:keras")


def test_model_has_a_body_and_two_heads():
    from keras_a2c import make_keras_actor_critic
    logits, value = make_keras_actor_critic()(torch.zeros(5, 4))
    assert tuple(logits.shape) == (5, 2) and tuple(value.shape) == (5, 1)


def test_model_is_a_pytorch_module_on_this_backend():
    from keras_a2c import make_keras_actor_critic
    model = make_keras_actor_critic()
    assert isinstance(model, torch.nn.Module) and len(list(model.parameters())) == 6


def test_adapter_speaks_the_actor_critic_language():
    from keras_a2c import KerasActorCritic, make_keras_actor_critic
    net = KerasActorCritic(make_keras_actor_critic())
    logits, values = net(torch.zeros(3, 4))
    assert tuple(logits.shape) == (3, 2) and tuple(values.shape) == (3,)
    logits, value = net(torch.zeros(4))
    assert tuple(logits.shape) == (2,) and value.dim() == 0, "one observation in, one answer out"


def test_adapter_lets_train_a2c_train_a_keras_network():
    from a2c import train_a2c
    from keras_a2c import KerasActorCritic, make_keras_actor_critic
    net = KerasActorCritic(make_keras_actor_critic())
    before = net.model.get_weights()[0].copy()
    train_a2c(net=net, total_steps=400, report_every=400, quiet=True)
    assert not np.array_equal(before, net.model.get_weights()[0])


def test_update_with_the_keras_optimiser_lowers_the_loss():
    from keras_a2c import keras_update, make_keras_actor_critic
    import keras
    keras.utils.set_random_seed(0)
    model = make_keras_actor_critic()
    optimiser = keras.optimizers.Adam(learning_rate=0.01)
    obs = torch.randn(16, 4)
    actions = torch.randint(0, 2, (16,))
    returns = torch.full((16,), 5.0)
    first = keras_update(model, optimiser, obs, actions, returns)
    for _ in range(30):
        last = keras_update(model, optimiser, obs, actions, returns)
    assert type(first) is float and last < first
