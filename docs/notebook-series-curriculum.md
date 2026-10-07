# Notebook Lab series: curriculum

Three series in Notebook Lab (`#/notebook-lab`), built on each other:

1. **Python from Zero**: no experience assumed. Both other series start here.
2. **Machine Learning**: from NumPy to Q-learning, every core algorithm written from scratch before the library version is used.
3. **Algorithms & Design Patterns**: data structures, algorithms and object design, taught together because patterns are how you organise algorithmic code that has to change.

The series are separate from the ML Lab (`#/lab/ml-lab`). The ML Lab teaches with simulations and checkpoints. These series teach by writing the code.

Status: **draft for approval**. Lesson titles and order may change until a lesson ships. After that its id is a progress key and must not change.

## What every lesson contains

A lesson is something you can learn from without another source, not a summary of one.

- **Prose that teaches.** It says why the idea exists (what goes wrong without it) before saying how it works. It defines every new term the first time it is used, and follows each idea with a small worked example.
- **Runnable demo cells that show something.** Every demo prints, plots or returns a visible result, and the prose says what to look for in it.
- **Predict, then run.** Before a revealing cell, the prose asks what the output will be.
- **Challenges that are graded.** Each has a starter, a hint and a test that checks behaviour, and the test's failure messages say what is wrong. A hidden reference solution must pass the test.
- **Runs in the browser.** Only packages Pyodide provides: numpy, pandas, matplotlib, scikit-learn, scipy, statsmodels, sympy. There is no PyTorch, so neural networks are built in NumPy.
- **Verified before shipping.** A checker runs every demo cell in Pyodide, checks that each one shows output, and runs every reference solution against its test.

Sizes: a lesson is one sitting (about 30–45 minutes), with 4–8 teaching sections and 2–4 challenges.

## Writing and checking a lesson

The lesson list, in order, is [src/tools/notebook-lab/series/manifest.js](../src/tools/notebook-lab/series/manifest.js). A lesson is the Markdown file `src/tools/notebook-lab/series/<series>/<slug>.md`, or a Jupyter notebook `<slug>.ipynb` used as it is (each Markdown cell becomes the explanation of the code cell after it, and a comment-only code cell becomes an empty editor to type into). Until one of those files exists, the sidebar shows the lesson as "soon". A lesson's id (`py-running-code`) is a learner's progress key, so never rename a slug once the lesson has shipped. Reordering the manifest is safe.

The format is parsed by [lessonFormat.js](../src/tools/notebook-lab/lessonFormat.js), which the app and the checker share:

````text
# Lesson title                      (must match the manifest)

Prose. Blank lines separate paragraphs. "## " starts a section, "### " a
subsection. Lists use "- " or "1. ". Tables use "| a | b |" rows.
Math: $inline$ and \[display\] (not $$).

```python type
a type-along cell: the code is shown to read, the editor starts empty,
and the learner types it in and runs it
```

```output
what it prints; the notebook compares the learner's run with this
```

```python
a demo cell, already filled in (the prose above it is shown with it)
```

```python error NameError
a demo meant to raise that error, to teach reading errors
```

::: challenge Title [easy|medium|hard]
Instructions.
```python starter
```
```python solution
```
```python test
assert ..., "message shown to the learner when it fails"
"SUCCESS: message shown when it passes"
```
Hint: one paragraph.
:::
````

Learners type the code: write demos as ```` ```python type ```` cells. Don't type the ```` ```output ```` blocks by hand; generate them by running the lesson in Pyodide, which also converts any plain ```` ```python ```` demos:

```text
node scripts/make_type_along.mjs py-running-code           # report what would change
node scripts/make_type_along.mjs py-running-code --write   # rewrite the file
```

It leaves out the expected output of a cell whose output changes from run to run (unseeded randomness, times), since no learner could match it. Seed the randomness if the output matters.

A challenge test runs after the learner's code, in the same namespace. It can also read `_stdout` (what the code printed) and `_source` (the code itself). Name any helper variables in a test with a leading underscore, so they cannot clash with the learner's names. Prose after the last cell is shown as text only.

Check a lesson with:

```text
node scripts/check_notebook_series.mjs py-running-code   # one lesson
node scripts/check_notebook_series.mjs python            # one series
node scripts/check_notebook_series.mjs                   # everything written
```

The checker enforces everything under "What every lesson contains" that a script can judge. That includes the minimum prose length, and, for Python from Zero, that no syntax is used before the lesson that teaches it. Teaching quality is judged by review.

---

## Series 1: Python from Zero (24 lessons)

| # | Lesson | You will be able to |
|---|---|---|
| 1 | Running code | Run a cell, use `print`, read an error message without panic |
| 2 | Numbers and variables | Do arithmetic, name values, predict integer vs float results |
| 3 | Strings | Index, slice, format and search text |
| 4 | Decisions | Use comparisons, `and`/`or`/`not`, `if`/`elif`/`else` |
| 5 | Lists | Build, index, slice and change lists; know what "mutable" means |
| 6 | `for` loops | Loop over lists and `range`, accumulate a result |
| 7 | `while` loops | Loop until a condition holds; use `break` and `continue` |
| 8 | Functions | Define functions with parameters and return values |
| 9 | Functions in depth | Scope, default and keyword arguments, returning several values |
| 10 | Dictionaries | Map keys to values, count things, loop over items |
| 11 | Tuples and sets | Choose between list, tuple, set and dict for a job |
| 12 | Names and references | Predict what aliasing and copying do to shared lists |
| 13 | Comprehensions | Write list, dict and set comprehensions and know when not to |
| 14 | Errors and exceptions | Read tracebacks, raise and catch exceptions |
| 15 | Debugging | Find a bug with prints, asserts and small experiments |
| 16 | Modules and the standard library | Import, and use `math`, `random`, `collections`, `itertools` |
| 17 | Files and text data | Read and write files, parse CSV by hand |
| 18 | Classes and objects | Define a class with attributes and methods |
| 19 | Special methods | `__repr__`, `__eq__`, `__len__`, operators; making objects behave like built-ins |
| 20 | Inheritance | Subclass, override and call `super()` |
| 21 | Iterators and generators | Write a generator, understand lazy evaluation |
| 22 | Functions as values | Pass functions around, `lambda`, `sorted(key=...)`, closures |
| 23 | Type hints and dataclasses | Annotate code and replace boilerplate classes |
| 24 | Testing your own code | Write test functions with `assert` and think in edge cases |

## Series 2: Machine Learning (74 lessons)

Prerequisite: Python from Zero.

### Part A: Numerical tools and the math behind ML

| # | Lesson | You will be able to |
|---|---|---|
| 1 | NumPy arrays | Create arrays, see why vectorised code beats loops |
| 2 | Indexing, shapes and broadcasting | Slice, mask, reshape; predict broadcast shapes |
| 3 | Plotting with matplotlib | Line, scatter and histogram plots that answer a question |
| 4 | Vectors | Norms, dot product, angle, distance, cosine similarity |
| 5 | Matrices as transformations | Matrix-vector product as a function; compose transformations |
| 6 | Solving linear systems | `solve`, inverse, rank; when a system has no unique answer |
| 7 | Eigenvectors and SVD | What they mean geometrically; compute and use them |
| 8 | Rates of change | Derivatives as slopes, computed numerically |
| 9 | Gradients and the chain rule | Partial derivatives, gradient vectors, gradient checking |
| 10 | Probability by simulation | Random variables, events, simulation to estimate probabilities |
| 11 | Distributions | Bernoulli, binomial, uniform, normal; sampling and densities |
| 12 | Expectation and variance | Compute them, and see the law of large numbers and the CLT |
| 13 | Estimation and uncertainty | Sampling distributions, standard error, confidence intervals, bootstrap |
| 14 | pandas: DataFrames | Load, select, filter and summarise tables |
| 15 | pandas: reshaping and joining | `groupby`, `merge`, pivot, cleaning messy columns |
| 16 | Exploring a dataset | A full exploratory analysis with plots and written findings |

### Part B: Supervised learning

| # | Lesson | You will be able to |
|---|---|---|
| 17 | What learning is | Data, model, loss, optimiser; why we hold out test data |
| 18 | Linear regression by least squares | Fit a line with the closed-form solution, from scratch |
| 19 | Loss functions | MSE, MAE, Huber; what each punishes |
| 20 | Gradient descent | Minimise a loss step by step; learning rate and divergence |
| 21 | Multiple regression, vectorised | Matrix form, batch gradient descent, feature scaling |
| 22 | Overfitting and the bias–variance trade-off | Polynomial features, learning curves |
| 23 | Regularisation | Ridge and lasso from scratch and in scikit-learn |
| 24 | Validation and cross-validation | Train/validation/test splits, k-fold, choosing hyperparameters |
| 25 | The perceptron | The first learning machine: algorithm, geometry, from scratch |
| 26 | What a perceptron cannot learn | Linear separability, convergence, the XOR problem |
| 27 | Logistic regression | Sigmoid, cross-entropy, gradient descent, from scratch |
| 28 | Classification metrics | Confusion matrix, precision, recall, F1, ROC and AUC |
| 29 | Softmax regression | Multiclass classification from scratch |
| 30 | k-nearest neighbours | Distance-based prediction, the curse of dimensionality |
| 31 | Naive Bayes | Bayes' rule as a classifier, text classification |
| 32 | Decision trees | Impurity, splits and a tree from scratch |
| 33 | Bagging and random forests | Variance reduction by averaging, from scratch |
| 34 | Boosting | AdaBoost and gradient boosting from scratch |
| 35 | Support vector machines | Margins, hinge loss, the kernel trick |
| 36 | The scikit-learn workflow | Estimators, pipelines, `ColumnTransformer` |
| 37 | Feature engineering | Encoding categories, missing values, interactions |
| 38 | Data leakage and imbalanced data | Spot leakage, resample, weight classes, pick thresholds |
| 39 | Hyperparameter search | Grid and random search, nested cross-validation |

### Part C: Unsupervised learning

| # | Lesson | You will be able to |
|---|---|---|
| 40 | k-means | Clustering from scratch; choosing k |
| 41 | Hierarchical clustering and DBSCAN | Clusters without choosing k in advance |
| 42 | Gaussian mixtures and EM | Soft clustering; the EM algorithm from scratch |
| 43 | PCA | Dimensionality reduction from scratch via SVD |
| 44 | Visualising high-dimensional data | t-SNE and what its pictures do and do not show |
| 45 | Anomaly detection | Density-based and isolation-forest methods |

### Part D: Neural networks, built in NumPy

| # | Lesson | You will be able to |
|---|---|---|
| 46 | From perceptron to neural network | Layers, the forward pass, why depth needs non-linearity |
| 47 | Activation functions | Sigmoid, tanh, ReLU and their gradients |
| 48 | Backpropagation by hand | Computational graphs and the chain rule on a small network |
| 49 | An automatic differentiation engine | Build a small autograd engine |
| 50 | Training a network | Mini-batch SGD, initialisation, loss curves, a digits classifier |
| 51 | Optimisers | Momentum, RMSProp and Adam from scratch |
| 52 | Regularising networks | Weight decay, dropout, early stopping, batch normalisation |
| 53 | Convolution | The convolution operation from scratch; filters and feature maps |
| 54 | Convolutional networks | Pooling, a small CNN trained on digit images |
| 55 | Recurrent networks | An RNN from scratch; vanishing gradients |
| 56 | LSTM and GRU | Gates, and why they keep information over long spans |
| 57 | Embeddings | Learned vectors for words and categories |
| 58 | Attention | Scaled dot-product attention from scratch |
| 59 | The transformer block | Multi-head attention, positional encoding, a tiny transformer |
| 60 | Autoencoders | Compression and reconstruction |
| 61 | Generative models | A variational autoencoder and a toy GAN |

### Part E: Probabilistic modelling and time

| # | Lesson | You will be able to |
|---|---|---|
| 62 | Bayesian inference | Priors, posteriors, MLE vs MAP |
| 63 | Time series | Temporal validation, baselines, autoregressive models |

### Part F: Reinforcement learning

| # | Lesson | You will be able to |
|---|---|---|
| 64 | The reinforcement learning problem | Agents, environments, rewards; a grid world |
| 65 | Multi-armed bandits | Exploration vs exploitation, epsilon-greedy, UCB |
| 66 | Markov decision processes | States, actions, returns, the Bellman equations |
| 67 | Dynamic programming | Policy iteration and value iteration |
| 68 | Monte Carlo methods | Learning values from complete episodes |
| 69 | Temporal-difference learning and SARSA | Learning from each step |
| 70 | Q-learning | Off-policy control; solve a grid world and a cliff walk |
| 71 | Deep Q-learning | Q-learning with a NumPy network, replay buffer, target network |
| 72 | Policy gradients | REINFORCE from scratch |

### Part G: Responsible practice and capstone

| # | Lesson | You will be able to |
|---|---|---|
| 73 | Interpreting models and checking them | Permutation importance, partial dependence, distribution shift, fairness checks |
| 74 | Capstone: from data to a defensible model | Carry a problem from raw data to a reported, validated model |

## Series 3: Algorithms & Design Patterns (86 lessons)

Prerequisite: Python from Zero.

### Part A: Thinking about algorithms

| # | Lesson | You will be able to |
|---|---|---|
| 1 | What an algorithm is | State a problem precisely; count steps |
| 2 | Big-O | O, Ω and Θ; read the growth of code; measure it with `timeit` |
| 3 | The cost of Python operations | What list, dict and string operations really cost |
| 4 | Amortised analysis | Why appending to a list is O(1) on average |

### Part B: Linear structures

| # | Lesson | You will be able to |
|---|---|---|
| 5 | Dynamic arrays | Build a growable array class |
| 6 | Linked lists | Singly and doubly linked lists from scratch |
| 7 | Stacks | Implement and use a stack; bracket matching, undo |
| 8 | Queues and deques | Queue, circular buffer, `collections.deque` |
| 9 | Hash tables | Hashing, collisions, resizing, from scratch |
| 10 | Sets and dictionary patterns | Counting, grouping, memo tables, lookups |

### Part C: Recursion, searching and sorting

| # | Lesson | You will be able to |
|---|---|---|
| 11 | Recursion | Base cases, the call stack, recursive thinking |
| 12 | Recurrences | Analyse recursive code; the master theorem |
| 13 | Invariants and correctness | Prove a loop correct with an invariant |
| 14 | Binary search | Classic and boundary variants, binary search on answers |
| 15 | Elementary sorts | Selection, insertion and bubble sort, with invariants |
| 16 | Merge sort | Divide and conquer sorting, stability |
| 17 | Quicksort and quickselect | Partitioning, expected running time |
| 18 | Sorting without comparisons | Counting and radix sort; the n log n lower bound |

### Part D: Trees

| # | Lesson | You will be able to |
|---|---|---|
| 19 | Binary trees | Build trees, traverse them recursively and iteratively |
| 20 | Binary search trees | Insert, search, delete |
| 21 | Balanced trees | AVL rotations and why height matters |
| 22 | Heaps and priority queues | Build a heap, heapsort, `heapq` |
| 23 | Tries | Prefix search and autocomplete |
| 24 | Segment trees and Fenwick trees | Range queries with updates |

### Part E: Graphs

| # | Lesson | You will be able to |
|---|---|---|
| 25 | Graph representations | Adjacency lists and matrices, modelling problems as graphs |
| 26 | Breadth-first search | Shortest paths in unweighted graphs, grids |
| 27 | Depth-first search | Components, cycle detection |
| 28 | Topological sort | Ordering dependencies |
| 29 | Dijkstra's algorithm | Weighted shortest paths with a heap |
| 30 | Bellman-Ford and Floyd-Warshall | Negative edges, all-pairs paths |
| 31 | Union-Find | Disjoint sets with path compression |
| 32 | Minimum spanning trees | Kruskal and Prim |
| 33 | A* search | Heuristic search on grids |

### Part F: Problem-solving techniques

| # | Lesson | You will be able to |
|---|---|---|
| 34 | Two pointers | Solve pair and partition problems in linear time |
| 35 | Sliding window | Subarray and substring problems |
| 36 | Prefix sums | Constant-time range sums, difference arrays |
| 37 | Monotonic stacks and queues | Next-greater element, window maximum |
| 38 | Divide and conquer | Closest pair, counting inversions |
| 39 | Greedy algorithms | Choose greedily and prove it with an exchange argument |
| 40 | Dynamic programming: memoisation | Overlapping subproblems, top-down DP |
| 41 | Dynamic programming: tabulation | Bottom-up tables, one-dimensional problems |
| 42 | Dynamic programming in two dimensions | LCS, edit distance, knapsack |
| 43 | Designing DP states | Interval, subset and bitmask DP |
| 44 | Backtracking | Permutations, subsets, N-queens, pruning |
| 45 | Bit manipulation | Masks, subsets as integers, common tricks |
| 46 | String algorithms | KMP, rolling hashes |
| 47 | Randomised algorithms | Randomised quicksort, reservoir sampling, hashing |

### Part G: Object design principles

| # | Lesson | You will be able to |
|---|---|---|
| 48 | Why design matters | See how code resists change; coupling and cohesion |
| 49 | Single responsibility | Split a class that does too much |
| 50 | Encapsulation and interfaces | Hide state, and use protocols and ABCs in Python |
| 51 | Composition over inheritance | Replace a fragile hierarchy with composed parts |
| 52 | Polymorphism and duck typing | Write code that works on anything with the right methods |
| 53 | SOLID | The five principles, each with a before and after |
| 54 | Dependency inversion and injection | Make code testable by passing its collaborators in |
| 55 | Refactoring | Recognise code smells and refactor in small safe steps |

### Part H: Design patterns

Each pattern lesson shows the problem it solves in plain code first, then the pattern, then the lighter Python way of getting the same result where one exists.

| # | Lesson | You will be able to |
|---|---|---|
| 56 | Strategy | Swap algorithms at run time |
| 57 | Factory method and simple factory | Decouple creating objects from using them |
| 58 | Abstract factory | Create families of related objects |
| 59 | Builder | Construct complex objects step by step |
| 60 | Singleton, and why to avoid it | Global state, and the module alternative |
| 61 | Prototype | Create objects by copying |
| 62 | Adapter | Make incompatible interfaces work together |
| 63 | Decorator | Add behaviour by wrapping; the pattern vs Python's `@decorators` |
| 64 | Facade | Give a simple front to a complicated subsystem |
| 65 | Composite | Treat trees of objects uniformly |
| 66 | Proxy | Lazy loading, caching and access control |
| 67 | Bridge | Separate an abstraction from its implementation |
| 68 | Flyweight | Share state to save memory |
| 69 | Observer | Publish and subscribe to events |
| 70 | Command | Represent actions as objects; undo and redo |
| 71 | State | Replace condition tangles with state objects |
| 72 | Template method | Fix an algorithm's skeleton, vary its steps |
| 73 | Iterator | Traverse a collection without exposing it |
| 74 | Chain of responsibility | Pass a request along handlers |
| 75 | Visitor | Add operations to a structure without changing it |
| 76 | Mediator | Centralise how objects talk to each other |
| 77 | Memento | Save and restore state |
| 78 | Interpreter | Evaluate a small language |
| 79 | Patterns vs simpler Python | When functions, modules and dataclasses replace a pattern |

### Part I: Putting it together

| # | Lesson | You will be able to |
|---|---|---|
| 80 | Testing algorithms | Property tests, brute-force oracles, invariant checks |
| 81 | Profiling and optimisation | Measure first, then speed up the part that matters |
| 82 | Project: LRU cache | Hash table plus linked list, behind a clean interface |
| 83 | Project: text editor with undo | Command and Memento over a gap buffer |
| 84 | Project: expression evaluator | Parser, Composite and Visitor |
| 85 | Project: job scheduler | Priority queues, topological order and Strategy |
| 86 | Capstone: route planner | Graph algorithms behind a well-designed API |
