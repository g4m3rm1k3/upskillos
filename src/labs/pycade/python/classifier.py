import torch  # setup | PyTorch records derivatives through tensor operations.
from torch import nn  # setup | nn supplies a trainable linear model and cross-entropy loss.
torch.manual_seed(7)  # setup | Repeat the same initial parameters when you rerun this example.
x = torch.tensor([[-2., -1.], [-1., -2.], [1., 2.], [2., 1.]])  # observe | Four examples, each with two numerical features: shape [4 examples, 2 features].
labels = torch.tensor([0, 0, 1, 1])  # observe | Correct class indices. Classes 0 and 1 are categories, not left and right actions.
model = nn.Linear(2, 2)  # choose | Two features become two class scores. Weights [2, 2] and bias [2] are the learnable parameters.
optimizer = torch.optim.SGD(model.parameters(), lr=0.1)  # learn | Stochastic gradient descent subtracts learning rate times gradient from each parameter.
criterion = nn.CrossEntropyLoss()  # learn | Cross entropy accepts raw scores and correct class indices. It includes log-softmax internally.
losses = []  # store | Store each training loss as an ordinary Python number.
for epoch in range(8):  # loop | Eight short training updates reveal prediction, error, derivatives and weight changes.
    logits = model(x)  # choose | The model gives two scores per example: shape [4, 2]. Scores are not yet probabilities.
    probabilities = torch.softmax(logits, dim=1)  # choose | Normalize across the class axis. Each row now sums to one.
    predictions = torch.argmax(logits, dim=1)  # choose | Pick the index of the largest score in each row: one predicted class per example.
    loss = criterion(logits, labels)  # learn | Penalize the model when the correct class has a low predicted probability. Pass logits, not probabilities.
    losses.append(loss.item())  # store | item converts the scalar tensor to a Python float for the history.
    optimizer.zero_grad()  # learn | Clear derivatives from the previous update without clearing the weights.
    loss.backward()  # learn | Compute parameter derivatives. Expand model → weight → gradient; weights have not changed yet.
    optimizer.step()  # learn | Change weight and bias using their gradients. The next prediction will use the updated parameters.
logits = model(x)  # choose | Evaluate the model on the same tiny training batch after the last update.
predictions = torch.argmax(logits, dim=1)  # choose | Compare these predicted indices with labels. Training accuracy is not evidence of performance on unseen data.
