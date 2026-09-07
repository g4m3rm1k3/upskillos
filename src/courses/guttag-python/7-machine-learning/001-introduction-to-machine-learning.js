// Guttag — Lesson 43: Introduction to Machine Learning
// Auto-converted from src/docs/tutorials/guttag-python/lesson-43.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-43-introduction-to-machine-learning',
  slug: 'introduction-to-machine-learning',
  chapter: 7,
  order: 1,
  title: 'Introduction to Machine Learning',
  subtitle: 'What It Is and What It Isn\'t',
  tags: ['rule-based-programming', 'machine-learning', 'feature', 'label', 'training-set', 'test-set'],

  hook: {
    question: 'What is "Introduction to Machine Learning", and why does it matter?',
    realWorldContext: 'The reader understands what machine learning IS: learning a function from labeled examples (supervised) or discovering structure in unlabeled data (unsupervised). They implement a nearest-centroid classifier from scratch in Python. No libraries. The transferable insight: machine learning does not \'think\'. It finds the function f such that f(x) approximately equals y on the training data. Generalization (doing well on NEW data) is the entire challenge. Overfitting (doing well on training data, poorly on new data) is the central failure mode.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: What machine learning is: learning from examples, Features and labels — the vocabulary of ML, Nearest-centroid classifier from scratch, Train/test split and accuracy, Overfitting vs. underfitting.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Rule-based programming:** Writing explicit if/then logic to solve a problem. It exists because some domains have clear, specifiable rules.\n- **Machine learning:** Inferring rules from data pairs (input, output). It exists to solve problems where rules are too complex to write by hand.\n- **Feature:** A measurable property of the input (x values). It exists to represent raw data as structured numbers a model can process.\n- **Label:** The output category or number to predict (y values). It exists to give the model a target to learn from (in supervised learning).\n- **Training set:** (feature, label) pairs used to learn. It exists to teach the model the underlying relationship.\n- **Test set:** Held-out (feature, label) pairs. It exists to measure the model\'s generalization to unseen data.\n- **Model:** The learned function f(features) -> predicted_label. It exists to make predictions on new data.\n- **Feature vector:** One row of input data. It exists to group all features for a single example.\n- **Centroid:** The mean position of a set of points. It exists to represent the "center" of a class in geometric space.\n- **Euclidean distance:** The straight-line distance between two points. It exists to measure similarity (closer = more similar).\n- **Generalization:** How well the model performs on data it has NOT seen. It exists because the goal is not memorizing the past, but predicting the future.\n- **Overfitting:** The model learns training data TOO well and fails on new data. It exists as the primary failure mode of complex models.\n- **Underfitting:** The model is too simple and fails even on training data. It exists when the model lacks capacity to learn the relationship.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **math.sqrt:** A mathematical function to calculate the square root of a number.\n- **sum:** A built-in function to add items of an iterable.\n- **zip:** A built-in function that aggregates elements from two or more iterables.\n- **random.seed:** A function to initialize the random number generator.\n- **random.shuffle:** A function to shuffle a list in place.\n- **collections.Counter:** A dict subclass for counting hashable objects.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace classifying a new data point `[3,3]` using a nearest-centroid classifier through all the concept units we built today: 1. **Feature Extraction:** The raw input is quantified into a feature vector `[3, 3]`. 2. **Label Lookup:** The model separates known data into features and true labels to understand what categories exist. 3. **Centroid Computation:** The model groups the training vectors by their labels and calculates their geometric centers (centroids). 4. **Distance Comparison:** The `predict_nearest_centroid` function computes the Euclidean distance between `[3,3]` and each computed center, avoiding the trap of memorizing previous points (overfitting) or guessing blindly (underfitting). 5. **Generalization Check:** By holding out `[3,3]` in a test set, we calculate accuracy to prove that our model learned the real structure of the data and can predict entirely new scenarios.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 43: Introduction to Machine Learning',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Introduction to Machine Learning',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'What machine learning is: learning from examples',
              prose: [
                'How do we program a computer to solve a problem when the rules are too complicated to write down? What if we don\'t know the exact threshold between "cold" and "comfortable" temperatures, but we have a list of past examples? How can we make the computer figure out the rules from the examples?',
                'This output proves that the rule-based system correctly classifies the data because we explicitly wrote the thresholds. A machine learning approach would infer these thresholds directly from the `training_data` pairs without the `classify_temperature_rule_based` function.'
              ],
              typeIt: true,
              solution: '# Traditional programming: you write the rules\ndef classify_temperature_rule_based(temp_celsius):\n    if temp_celsius < 0:\n        return \'freezing\'\n    elif temp_celsius < 15:\n        return \'cold\'\n    elif temp_celsius < 25:\n        return \'comfortable\'\n    else:\n        return \'hot\'\n\n# Machine learning: learn the rules FROM DATA\n# Training data: (input, correct_output) pairs\ntraining_data = [\n    (-10, \'freezing\'), (-5, \'freezing\'), (0, \'freezing\'),\n    (5, \'cold\'),  (10, \'cold\'),  (14, \'cold\'),\n    (18, \'comfortable\'), (22, \'comfortable\'), (24, \'comfortable\'),\n    (28, \'hot\'), (32, \'hot\'), (38, \'hot\'),\n]\n\n# The ML system learns the threshold values from data, not from programmer\n# If we got the data but not the rules, we could still make a classifier\nfor temp, label in training_data[:3]:\n    print(f\'temp={temp}: rule_based={classify_temperature_rule_based(temp)}, true={label}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'What machine learning is: learning from examples — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def classify_temperature_rule_based(temp_celsius):` defines a traditional function taking one argument.\n- `if temp_celsius < 0:` checks an explicit, hardcoded threshold.\n- `return \'freezing\'` returns the explicit label.\n- `elif temp_celsius < 15:` checks the next explicit threshold.\n- `return \'cold\'` returns the next label.\n- `elif temp_celsius < 25:` checks the next explicit threshold.\n- `return \'comfortable\'` returns the label.\n- `else:` provides the default case.\n- `return \'hot\'` returns the final label.',
                '**Expected behavior.** Predicted confidently: The function returns labels based on explicit thresholds.',
                '**CS lens.** **Machine Learning Paradigm.** In computer science, this represents the shift from deduction (rules -> data -> answers) to induction (data -> answers -> rules). Real-world applications include spam filtering, image recognition, and language translation.',
                '**SE lens.** **Design Principle: Explicit Rules vs. Learned Models.** Writing explicit rules is deterministic and easy to debug. The alternative NOT chosen here is immediately using an ML model for a simple problem. The tradeoff: ML models are harder to interpret and debug, but they scale to problems where rules are impossible to write by hand (like vision).'
              ],
              typeIt: true,
              solution: '# classifier.py\ndef classify_temperature_rule_based(temp_celsius):\n    if temp_celsius < 0:\n        return \'freezing\'\n    elif temp_celsius < 15:\n        return \'cold\'\n    elif temp_celsius < 25:\n        return \'comfortable\'\n    else:\n        return \'hot\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Features and labels — the vocabulary of ML',
              prose: [
                'How do we represent data so a computer can learn from it? How do we separate the information we know from the answer we want to predict?',
                'This proves that complex data can be structured into arrays of features paired with a target outcome labels.'
              ],
              typeIt: true,
              solution: '# Example: predict study outcome from hours studied\ntraining_features = [1, 2, 3, 4, 5, 6, 7, 8]\ntraining_labels   = [\'fail\',\'fail\',\'fail\',\'pass\',\'pass\',\'pass\',\'pass\',\'pass\']\n\n# Feature matrix (multiple features per example):\nstudents = [\n    {\'hours\': 1, \'prev_score\': 50},\n    {\'hours\': 3, \'prev_score\': 60},\n    {\'hours\': 5, \'prev_score\': 70},\n    {\'hours\': 7, \'prev_score\': 80},\n]\nfor s in students:\n    print(f\'hours={s["hours"]}, prev={s["prev_score"]}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Features and labels — the vocabulary of ML — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `training_data = [` assigns a new list to a variable.\n- `(-10, \'freezing\'),` creates a tuple where `-10` is the feature and `\'freezing\'` is the label.\n- `(-5, \'freezing\'),` adds another tuple with a feature and label.\n- `(0, \'freezing\'),` adds another tuple with a feature and label.\n- `(5, \'cold\'),` adds another tuple.\n- `(10, \'cold\'),` adds another tuple.\n- `(14, \'cold\'),` adds another tuple.\n- `(18, \'comfortable\'),` adds another tuple.\n- `(22, \'comfortable\'),` adds another tuple.\n- `(24, \'comfortable\'),` adds another tuple.\n- `(28, \'hot\'),` adds another tuple.\n- `(32, \'hot\'),` adds another tuple.\n- `(38, \'hot\'),` adds another tuple.\n- `]` closes the list.',
                '**Expected behavior.** Predicted confidently: The `training_data` variable simply holds a list of tuples.',
                '**CS lens.** **Data Representation.** In computer science, abstract concepts must be encoded as quantifiable data structures. Real-world uses include encoding images as pixel matrices, audio as frequency arrays, and text as word embeddings.',
                '**SE lens.** **Design Principle: Separation of Data and Logic.** Here, data is stored separately from rules. The alternative NOT chosen is hardcoding data inside the function logic. The tradeoff: separating data makes the system flexible to new data, but requires building a mechanism to parse and use it.'
              ],
              typeIt: true,
              solution: 'training_data = [\n    (-10, \'freezing\'), (-5, \'freezing\'), (0, \'freezing\'),\n    (5, \'cold\'),  (10, \'cold\'),  (14, \'cold\'),\n    (18, \'comfortable\'), (22, \'comfortable\'), (24, \'comfortable\'),\n    (28, \'hot\'), (32, \'hot\'), (38, \'hot\'),\n]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Nearest-centroid classifier from scratch',
              prose: [
                'Given new data points, how do we classify them automatically? If we know the average position of each class, can we use distance to guess the label of a new point?',
                'This run proves that by computing the center of known groups, we can accurately classify unknown points by finding their shortest distance to those centers.'
              ],
              typeIt: true,
              solution: 'import math\n\ndef euclidean_distance(a, b):\n    return math.sqrt(sum((ai - bi)**2 for ai, bi in zip(a, b)))\n\ndef train_nearest_centroid(X_train, y_train):\n    classes = set(y_train)\n    centroids = {}\n    for cls in classes:\n        class_points = [X_train[i] for i in range(len(y_train)) if y_train[i] == cls]\n        n = len(class_points)\n        n_features = len(class_points[0])\n        centroid = [sum(p[f] for p in class_points) / n for f in range(n_features)]\n        centroids[cls] = centroid\n    return centroids\n\ndef predict_nearest_centroid(centroids, x):\n    best_class = None\n    best_dist = float(\'inf\')\n    for cls, centroid in centroids.items():\n        d = euclidean_distance(x, centroid)\n        if d < best_dist:\n            best_dist = d\n            best_class = cls\n    return best_class\n\nX_train = [[1,1],[1,2],[2,1],[5,5],[5,6],[6,5]]\ny_train = [\'A\',\'A\',\'A\',\'B\',\'B\',\'B\']\n\ncentroids = train_nearest_centroid(X_train, y_train)\nprint(f\'Centroid A: {centroids["A"]}\')\nprint(f\'Centroid B: {centroids["B"]}\')\n\nfor point in [[2,2],[4,4],[6,6]]:\n    pred = predict_nearest_centroid(centroids, point)\n    print(f\'Point {point} -> class {pred}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Nearest-centroid classifier from scratch — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import math` imports the standard library math functions.\n- `def euclidean_distance(a, b):` defines a function to compute distance between two vectors.\n- `return math.sqrt(sum((ai - bi)**2 for ai, bi in zip(a, b)))` pairs coordinates with `zip`, computes squared differences, sums them, and takes the square root.\n- `def train_nearest_centroid(X_train, y_train):` defines the training function mapping features to labels.\n- `classes = set(y_train)` finds unique labels.\n- `centroids = {}` initializes a dictionary for class centers.\n- `for cls in classes:` iterates over each unique label.\n- `class_points = [X_train[i] for i in range(len(y_train)) if y_train[i] == cls]` filters feature vectors matching the current label.\n- `n = len(class_points)` gets the count of points in the class.\n- `n_features = len(class_points[0])` gets the dimensionality of the vectors.\n- `centroid = [sum(p[f] for p in class_points) / n for f in range(n_features)]` computes the mean coordinate across all dimensions.\n- `centroids[cls] = centroid` stores the computed centroid.\n- `return centroids` returns the model state.\n- `def predict_nearest_centroid(centroids, x):` defines the prediction function.\n- `best_class = None` starts with no prediction.\n- `best_dist = float(\'inf\')` starts with infinite distance.\n- `for cls, centroid in centroids.items():` iterates through learned class centers.\n- `d = euclidean_distance(x, centroid)` calculates distance to the center.\n- `if d < best_dist:` checks if this is the closest center yet.\n- `best_dist = d` updates the shortest distance.\n- `best_class = cls` updates the predicted class.\n- `return best_class` yields the final prediction.',
                '**Expected behavior.** Predicted confidently: These functions correctly define a training and inference loop for a centroid-based classifier.',
                '**CS lens.** **Geometric Representation.** In computer science, data items can be mapped into a high-dimensional space where similarity is quantified by geometric distance. Real-world applications include recommendation engines mapping user preferences and search engines comparing document relevance.',
                '**SE lens.** **Design Principle: Model State Independence.** The training function returns a standard dictionary rather than keeping state inside a class. The alternative NOT chosen is an Object-Oriented approach encapsulating the data. The tradeoff: pure functions returning plain data are extremely easy to test and serialize, but lack built-in boundaries for enforcing usage constraints.'
              ],
              typeIt: true,
              solution: 'import math\n\ndef euclidean_distance(a, b):\n    return math.sqrt(sum((ai - bi)**2 for ai, bi in zip(a, b)))\n\ndef train_nearest_centroid(X_train, y_train):\n    classes = set(y_train)\n    centroids = {}\n    for cls in classes:\n        class_points = [X_train[i] for i in range(len(y_train)) if y_train[i] == cls]\n        n = len(class_points)\n        n_features = len(class_points[0])\n        centroid = [sum(p[f] for p in class_points) / n for f in range(n_features)]\n        centroids[cls] = centroid\n    return centroids\n\ndef predict_nearest_centroid(centroids, x):\n    best_class = None\n    best_dist = float(\'inf\')\n    for cls, centroid in centroids.items():\n        d = euclidean_distance(x, centroid)\n        if d < best_dist:\n            best_dist = d\n            best_class = cls\n    return best_class',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Train/test split and accuracy',
              prose: [
                'If a model memorizes all the answers, it will look perfectly accurate on the data it has seen. How do we measure if the model has actually learned the underlying pattern instead of just memorizing the past?',
                'This execution proves that the data can be cleanly divided into two non-overlapping sets to fairly evaluate model performance.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef train_test_split(X, y, test_size=0.2, seed=42):\n    random.seed(seed)\n    indices = list(range(len(X)))\n    random.shuffle(indices)\n    split = int(len(X) * (1 - test_size))\n    train_idx = indices[:split]\n    test_idx  = indices[split:]\n    X_train = [X[i] for i in train_idx]\n    y_train = [y[i] for i in train_idx]\n    X_test  = [X[i] for i in test_idx]\n    y_test  = [y[i] for i in test_idx]\n    return X_train, X_test, y_train, y_test\n\ndef accuracy(y_true, y_pred):\n    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)\n    return correct / len(y_true)\n\nX = [[1,1],[1,2],[2,1],[2,2],[4,4],[5,5],[5,6],[6,5],[6,6],[5,4]]\ny = [\'A\',\'A\',\'A\',\'A\',\'B\',\'B\',\'B\',\'B\',\'B\',\'B\']\nX_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3)\nprint(f"Train size: {len(X_tr)}, Test size: {len(X_te)}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Train/test split and accuracy — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` imports the standard random number tools.\n- `def train_test_split(X, y, test_size=0.2, seed=42):` defines a split function with defaults.\n- `random.seed(seed)` fixes the random number generator so splits are reproducible.\n- `indices = list(range(len(X)))` creates a list of all row indices.\n- `random.shuffle(indices)` randomly reorders the indices in-place.\n- `split = int(len(X) * (1 - test_size))` calculates the cutoff index for training.\n- `train_idx = indices[:split]` gets the training indices.\n- `test_idx = indices[split:]` gets the test indices.\n- `X_train = [X[i] for i in train_idx]` selects training features.\n- `y_train = [y[i] for i in train_idx]` selects training labels.\n- `X_test = [X[i] for i in test_idx]` selects test features.\n- `y_test = [y[i] for i in test_idx]` selects test labels.\n- `return X_train, X_test, y_train, y_test` yields the four separated components.\n- `def accuracy(y_true, y_pred):` defines a function to measure success rate.\n- `correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)` counts how many predicted labels equal the true labels.\n- `return correct / len(y_true)` calculates the ratio of correct predictions.',
                '**Expected behavior.** Predicted confidently: The functions cleanly partition arrays into non-overlapping groups and calculate percentages.',
                '**CS lens.** **Generalization vs Memorization.** In computer science, algorithms are often evaluated on their ability to generalize to unseen situations, not just on their performance on historical data. Real-world implementations include A/B testing web features or cross-validating statistical models.',
                '**SE lens.** **Design Principle: Determinism in Testing.** The use of a fixed random seed makes the data split reproducible. The alternative NOT chosen is fully random splits on every run. The tradeoff: fixed seeds allow for predictable test cases and debugging, but may hide performance variations that random splits would expose.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef train_test_split(X, y, test_size=0.2, seed=42):\n    random.seed(seed)\n    indices = list(range(len(X)))\n    random.shuffle(indices)\n    split = int(len(X) * (1 - test_size))\n    train_idx = indices[:split]\n    test_idx  = indices[split:]\n    X_train = [X[i] for i in train_idx]\n    y_train = [y[i] for i in train_idx]\n    X_test  = [X[i] for i in test_idx]\n    y_test  = [y[i] for i in test_idx]\n    return X_train, X_test, y_train, y_test\n\ndef accuracy(y_true, y_pred):\n    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)\n    return correct / len(y_true)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Overfitting vs. underfitting',
              prose: [
                'What happens when a model learns the training data perfectly but performs horribly on new data? Conversely, what if the model is so simple it fails to learn anything useful at all from the training data?',
                'This output proves that a memorizing classifier fails entirely on data it has never seen because it captures noise as rules (overfitting), whereas the majority classifier ignores data altogether and returns a single guess (underfitting).'
              ],
              typeIt: true,
              solution: '# Overfitting: memorizing classifier\nclass MemorizingClassifier:\n    def fit(self, X, y):\n        self.memory = dict(zip(map(tuple, X), y))\n\n    def predict(self, x):\n        return self.memory.get(tuple(x), \'UNKNOWN\')\n\nmc = MemorizingClassifier()\nX_tr = [[1,1],[2,2],[5,5]]\ny_tr = [\'A\',\'A\',\'B\']\nmc.fit(X_tr, y_tr)\nprint(mc.predict([1,1]))   # A (seen in training)\nprint(mc.predict([3,3]))   # UNKNOWN (not seen!)\n\n# Underfitting: majority classifier\nclass MajorityClassifier:\n    def fit(self, X, y):\n        from collections import Counter\n        self.majority = Counter(y).most_common(1)[0][0]\n\n    def predict(self, x):\n        return self.majority',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Overfitting vs. underfitting — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from collections import Counter` imports the counting utility.\n- `class MemorizingClassifier:` begins the overfit class definition.\n- `def fit(self, X, y):` defines the training method.\n- `self.memory = dict(zip(map(tuple, X), y))` turns list features into hashable tuples and zips them into a dictionary with labels.\n- `def predict(self, x):` defines the prediction method.\n- `return self.memory.get(tuple(x), \'UNKNOWN\')` performs an exact lookup, failing if the point wasn\'t perfectly memorized.\n- `class MajorityClassifier:` begins the underfit class definition.\n- `def fit(self, X, y):` defines the training method.\n- `self.majority = Counter(y).most_common(1)[0][0]` counts label frequencies and stores only the most common one.\n- `def predict(self, x):` defines the prediction method.\n- `return self.majority` completely ignores the input features and always returns the majority guess.',
                '**Expected behavior.** Predicted confidently: The classifiers return either perfectly memorized exact matches or the single majority label.',
                '**CS lens.** **Bias-Variance Tradeoff.** In computer science, models balance bias (simplifying assumptions leading to underfitting) and variance (sensitivity to small data fluctuations leading to overfitting). Real-world applications manage this by using regularization, dropping out neural network nodes, or pruning decision trees.',
                '**SE lens.** **Design Principle: The Simplest Baseline.** The `MajorityClassifier` represents a dummy baseline. The alternative NOT chosen is comparing complex models only against each other. The tradeoff: dummy models provide a minimum performance floor for sanity-checking, but do not provide real business value on their own.'
              ],
              typeIt: true,
              solution: 'from collections import Counter\n\nclass MemorizingClassifier:\n    def fit(self, X, y):\n        self.memory = dict(zip(map(tuple, X), y))\n\n    def predict(self, x):\n        return self.memory.get(tuple(x), \'UNKNOWN\')\n\nclass MajorityClassifier:\n    def fit(self, X, y):\n        self.majority = Counter(y).most_common(1)[0][0]\n\n    def predict(self, x):\n        return self.majority',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a cell\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      'Next lesson: Clustering.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Label"?',
      options: [
        '(feature, label) pairs used to learn. It exists to teach the model the underlying relationship.',
        'The model learns training data TOO well and fails on new data. It exists as the primary failure mode of complex models.',
        'The output category or number to predict (y values). It exists to give the model a target to learn from (in supervised learning).'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Rule-based programming"?',
      options: [
        'The model learns training data TOO well and fails on new data. It exists as the primary failure mode of complex models.',
        'Writing explicit if/then logic to solve a problem. It exists because some domains have clear, specifiable rules.',
        'Held-out (feature, label) pairs. It exists to measure the model\'s generalization to unseen data.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Machine learning"?',
      options: [
        'Inferring rules from data pairs (input, output). It exists to solve problems where rules are too complex to write by hand.',
        '(feature, label) pairs used to learn. It exists to teach the model the underlying relationship.',
        'The model is too simple and fails even on training data. It exists when the model lacks capacity to learn the relationship.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Test set"?',
      options: [
        'Held-out (feature, label) pairs. It exists to measure the model\'s generalization to unseen data.',
        'Inferring rules from data pairs (input, output). It exists to solve problems where rules are too complex to write by hand.',
        '(feature, label) pairs used to learn. It exists to teach the model the underlying relationship.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Rule-based programming** — Writing explicit if/then logic to solve a problem. It exists because some domains have clear, specifiable rules.',
    '**Machine learning** — Inferring rules from data pairs (input, output). It exists to solve problems where rules are too complex to write by hand.',
    '**Feature** — A measurable property of the input (x values). It exists to represent raw data as structured numbers a model can process.',
    '**Label** — The output category or number to predict (y values). It exists to give the model a target to learn from (in supervised learning).',
    '**Training set** — (feature, label) pairs used to learn. It exists to teach the model the underlying relationship.',
    '**Test set** — Held-out (feature, label) pairs. It exists to measure the model\'s generalization to unseen data.',
    '**Model** — The learned function f(features) -> predicted_label. It exists to make predictions on new data.',
    '**Feature vector** — One row of input data. It exists to group all features for a single example.',
  ],

  checkpoints: ['read-intuition'],
}
