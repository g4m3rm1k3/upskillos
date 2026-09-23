# ML + Math, From Scratch — Roadmap

**Format:** Each lesson is a markdown file you read here, alongside a Google Colab
notebook you build yourself, cell by cell. You never copy a finished block of code —
each lesson gives you one small piece at a time: type it, run it, see what it does,
*then* the next piece. Math is introduced exactly when an algorithm needs it, not
before — you won't get a "linear algebra unit" up front; you'll meet dot products
the lesson you need them for a prediction formula, derivatives the lesson you need
them for gradient descent, etc.

**One rule for the whole series:** every variable you type gets a real name.
`slope` and `intercept`, not `m` and `b`. `weight_gradient`, not `dw`. If a formula
in a paper uses a single Greek letter, the lesson tells you what English word that
Greek letter means, and that's the name you type.

Each lesson builds on the previous notebook — same file, new cells added at the
bottom, same pattern as your other curricula. By the end you'll have four running
notebooks (one per phase) you built entirely by hand, and you'll be able to read
an ML paper's math and know what it's asking you to type.

---

## Phase A — Classical ML (Lessons 1–7)
Math load: vectors/dot products, averages & variance, basic derivatives, probability basics.

1. **A line that predicts** — linear regression as "guess a line, measure how
   wrong it is." Dot product introduced as *the* operation of ML (weighted sum).
   Mean squared error by hand. Notebook: predict a single number from a single
   input, no libraries.
2. **Walking downhill — gradient descent** — the derivative as "which way is
   downhill," by hand on the error function from Lesson 1. No calculus library;
   you derive the two partial derivatives yourself on paper first, then type them.
3. **More than one input — multivariate regression** — vectors and matrices as
   "many dot products at once." NumPy introduced *after* you've done it by hand
   with Python lists, so you see what it's automating.
4. **Yes or no — logistic regression** — the sigmoid function, why squared error
   breaks for classification, log-loss derived from a probability argument.
5. **Splitting decisions — decision trees** — entropy and information gain as
   "how much does this question reduce my uncertainty," built from raw
   conditionals, no library tree.
6. **Grouping without labels — k-means clustering** — distance functions,
   centroids as averages, the algorithm as repeated "measure, reassign, average."
7. **Phase A capstone** — one notebook, one small real dataset (built into
   scikit-learn's toy datasets, loaded not scraped), all four algorithms above
   run and compared on it, by hand first then cross-checked against
   scikit-learn's implementation.

## Phase B — Neural Networks (Lessons 8–13)
Math load: the chain rule, partial derivatives of vector functions, matrix multiplication as composition.

8. **One neuron is logistic regression** — reframing Lesson 4 as "a neuron,"
   so the jump to neural nets starts from something you already built.
9. **Stacking neurons — the hidden layer** — a layer as "several neurons run in
   parallel," matrix multiplication as the way to compute them all at once.
10. **Backpropagation, derived** — the chain rule walked through by hand on a
    tiny 2-weight network on paper, *then* typed as code — this is the
    conceptual core of the whole phase.
11. **Training loop** — putting 8–10 together: forward pass, loss, backward
    pass, weight update, repeated. Built on a toy 2D dataset you can plot.
12. **Activation functions & why they matter** — ReLU, sigmoid, tanh compared;
    the vanishing-gradient problem shown concretely by breaking your own network.
13. **Phase B capstone** — digit classifier on a small image dataset (MNIST
    subset), your own backprop, no framework yet.

## Phase C — Deep Learning with PyTorch (Lessons 14–18)
Math load: tensors as generalized matrices, computational graphs, convolution as a sliding dot product.

14. **PyTorch replaces your backprop** — same Lesson-11 training loop, rewritten
    with `autograd`, so you can see exactly what the library is now doing that
    you did by hand.
15. **Convolutions — a sliding dot product** — the convolution operation
    derived from "reuse the same small set of weights across an image,"
    building a CNN from Lesson 9's layer concept.
16. **Sequences — recurrent networks** — why a normal network can't handle
    order, RNN hidden-state math introduced as "a summary that updates."
17. **Regularization & generalization** — overfitting shown by deliberately
    causing it, then dropout and weight decay as concrete fixes, each tied back
    to the loss function math.
18. **Phase C capstone** — image classifier (CNN) and a small sequence model
    (RNN), both in PyTorch, both compared against your Phase B from-scratch net.

## Phase D — Attention & Transformers (Lessons 19–23)
Math load: matrix multiplication as similarity search, softmax as weighted voting, positional encoding math.

19. **Attention as "weighted lookup"** — query/key/value derived from a plain
    English scenario (looking things up in a table) before any code.
20. **Self-attention, by hand** — a tiny 4-token example computed entirely by
    hand on paper, then typed, matching the numbers.
21. **The transformer block** — multi-head attention + feedforward + residual
    connections, each piece justified before it's typed.
22. **Positional encoding & why order needs to be re-added** — the sine/cosine
    scheme derived from "attention alone is order-blind."
23. **Capstone — a tiny transformer from scratch**, trained on a toy sequence
    task, entirely hand-built, no `nn.Transformer`.

---

## How each lesson file is structured
- **Concept, in plain English** (no code yet)
- **The math**, introduced with a worked numeric example on paper-sized numbers
- **Type this** — one cell at a time, each a few lines, run-and-check after each
- **What just happened** — ties the output back to the math above
- **Checkpoint exercise** — a small variation you do yourself before moving on

Say "next lesson" any time you're ready, or "redo lesson N" to get a fresh pass
at one you want to revisit.
