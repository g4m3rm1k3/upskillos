// Guttag — Lesson 45: Classification
// Auto-converted from src/docs/tutorials/guttag-python/lesson-45.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-45-classification',
  slug: 'classification',
  chapter: 7,
  order: 3,
  title: 'Classification',
  subtitle: 'k-Nearest Neighbors from Scratch',
  tags: ['k-nearest-neighbors-knn', 'euclidean-distance', 'non-parametric-model', 'feature-normalization', 'leave-one-out-cross-validation'],

  hook: {
    question: 'What is "Classification", and why does it matter?',
    realWorldContext: 'The reader implements k-Nearest Neighbors (kNN) from scratch: for a new point, find the k nearest training points, take a majority vote of their labels. They also implement feature normalization and leave-one-out cross-validation. The transferable insight: kNN is a non-parametric model: it stores the entire training set and makes decisions at prediction time. It has no \'training\' phase (just memory). Prediction is O(n * d) where n=training size and d=features. Its weakness: slow at large scale; its strength: no assumptions about data distribution.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: kNN classification from scratch, Effect of k on the decision boundary, Feature normalization — why distance metrics need it, Leave-one-out cross-validation, kNN for regression.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **k-Nearest Neighbors (kNN):** A non-parametric classification algorithm that predicts the label of a new data point by finding the \'k\' closest training examples and taking a majority vote among their labels. It has no separate training phase; it stores the dataset and computes distances at prediction time.\n- **Euclidean distance:** The straight-line distance between two points in Euclidean space, computed as the square root of the sum of squared differences of their coordinates. It is used here to measure how "close" two data points are.\n- **Non-parametric model:** A machine learning model that makes no strong assumptions about the form of the mapping function, typically growing in complexity with the size of the dataset. kNN is non-parametric because it just memorizes the data.\n- **Feature normalization:** The process of scaling individual features to have a similar range (often [0, 1]). Without normalization, features with large numerical ranges will incorrectly dominate distance calculations.\n- **Leave-one-out cross-validation:** An evaluation technique where each point in the dataset is used once as a test set while all other points serve as the training set, maximizing the data used for training in small datasets.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **math.sqrt:** A mathematical function from the Python standard library that computes the square root.\n- **sum:** A built-in Python function that adds up the items of an iterable.\n- **zip:** A built-in Python function that iterates over several iterables in parallel, producing tuples.\n- **list.sort:** A built-in method of Python lists that sorts the list in place.\n- **collections.Counter.most_common:** A method of the Counter class that returns a list of the n most common elements and their counts.\n- **random.seed:** A standard library function that initializes the internal state of the random number generator.\n- **random.gauss:** A standard library function generating Gaussian (normal) distributed random numbers.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace what happens when we call `knn_predict([3,3], k=3)` on our initial 6-point training set `X_train = [[1,1],[1,2],[2,1],[5,5],[5,6],[6,5]]` with labels `[\'A\',\'A\',\'A\',\'B\',\'B\',\'B\']`: 1. **Compute distances:** The model compares `[3,3]` to every point in memory. - To `[1,1]`: `sqrt((3-1)^2 + (3-1)^2) = sqrt(8) = 2.83` -> A - To `[1,2]`: `sqrt((3-1)^2 + (3-2)^2) = sqrt(5) = 2.24` -> A - To `[2,1]`: `sqrt((3-2)^2 + (3-1)^2) = sqrt(5) = 2.24` -> A - To `[5,5]`: `sqrt((3-5)^2 + (3-5)^2) = sqrt(8) = 2.83` -> B - To `[5,6]`: `sqrt(13) = 3.61` -> B - To `[6,5]`: `sqrt(13) = 3.61` -> B 2. **Sort and slice:** It sorts these tuples by distance: `2.24(A), 2.24(A), 2.83(A), 2.83(B), 3.61(B), 3.61(B)`. It slices the top `k=3`: `[A, A, A]`. 3. **Vote:** `Counter` tallies `[A, A, A]`. The most common label is `A`. This trace holds true whether we are validating with LOO-CV or scaling features first—the core logic remains a simple, non-parametric lookup and vote.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 45: Classification',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Classification',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'kNN classification from scratch',
              prose: [
                'How can we classify a new data point based on existing data without fitting a mathematical curve? Given a set of points with known labels in a 2D space, what would be the most intuitive way to decide the label of a new, unknown point? How might looking at its closest neighbors help?',
                '*Predicted confidently: Distance: 5.0, Vote: A.* This proves that we can easily compute the straight-line Euclidean distance between two points, and we can extract the most frequent label from a list using `Counter`.'
              ],
              typeIt: true,
              solution: 'import math\nfrom collections import Counter\n\n# Calculate distance between [1, 1] and [4, 5]\n# delta_x = 3, delta_y = 4. Distance = sqrt(3^2 + 4^2) = 5.0\ndist = math.sqrt(sum((ai - bi)**2 for ai, bi in zip([1, 1], [4, 5])))\nprint(f"Distance: {dist}")\n\n# Majority vote among 3 neighbors\nlabels = [\'A\', \'A\', \'B\']\nvote = Counter(labels).most_common(1)[0][0]\nprint(f"Vote: {vote}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'kNN classification from scratch — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import math` — brings in mathematical functions, specifically `math.sqrt`.\n- `from collections import Counter` — imports the `Counter` class for tallying items.\n- `def euclidean_distance(a, b):` — defines a function taking two equal-length numeric lists.\n- `zip(a, b)` — pairs up the coordinates from lists `a` and `b`.\n- `(ai - bi)**2` — calculates the squared difference for each pair.\n- `sum(...)` — adds all the squared differences together.\n- `math.sqrt(...)` — takes the square root of the sum to get the final Euclidean distance.\n- `distances = [...]` — builds a list comprehension of tuples pairing each point\'s distance with its label.\n- `distances.sort(key=lambda pair: pair[0])` — sorts the list of tuples in-place using the distance (the first element of the tuple) as the key.\n- `distances[:k]` — slices the first `k` elements, which are the closest ones.\n- `labels = [label for _, label in k_nearest]` — extracts just the labels from those nearest neighbor tuples.\n- `Counter(labels)` — creates a dictionary-like tally of the labels.\n- `.most_common(1)` — returns a list of the 1 most frequent element, in the format `[(label, count)]`.\n- `[0][0]` — extracts the first tuple from that list, and then the first item of that tuple (the label string itself).\n- `return vote` — returns the majority label as the final prediction.',
                '**Expected behavior.** *Predicted confidently:* ``` kNN(k=3) predict [2, 2] -> A kNN(k=3) predict [3, 3] -> A kNN(k=3) predict [4, 4] -> B kNN(k=3) predict [5, 4] -> B ```',
                '**CS lens.** The **k-Nearest Neighbors (kNN)** algorithm is an example of instance-based learning. Instead of building a generalized mathematical model from the data (like a regression line), it simply stores the data and defers computation until prediction time. Real-world appearances: - Recommendation systems finding "users similar to you". - Image recognition matching feature vectors against a database of known images. - Anomaly detection spotting points that are unusually far from their neighbors.',
                '**SE lens.** Design principle: **Eager vs. Lazy Evaluation**. kNN is a "lazy" learner because it does zero work during training (it just stores the data `X_train`, `y_train`). The tradeoff is that training is instant `O(1)`, but prediction is expensive `O(n * d)` because it must scan the entire dataset for every new query. Eager models (like neural networks) take hours to train but milliseconds to predict.'
              ],
              typeIt: true,
              solution: 'import math\nfrom collections import Counter\n\ndef euclidean_distance(a, b):\n    return math.sqrt(sum((ai - bi)**2 for ai, bi in zip(a, b)))\n\ndef knn_predict(X_train, y_train, x_new, k):\n    \'\'\'Classify x_new using k nearest neighbors from X_train.\'\'\'\n    # Step 1: compute distance from x_new to every training point\n    distances = [(euclidean_distance(x_new, X_train[i]), y_train[i])\n                 for i in range(len(X_train))]\n    # Step 2: sort by distance, take k nearest\n    distances.sort(key=lambda pair: pair[0])\n    k_nearest = distances[:k]\n    # Step 3: majority vote among k nearest labels\n    labels = [label for _, label in k_nearest]\n    vote = Counter(labels).most_common(1)[0][0]\n    return vote\n\nX_train = [[1,1],[1,2],[2,1],[5,5],[5,6],[6,5]]\ny_train = [\'A\',\'A\',\'A\',\'B\',\'B\',\'B\']\n\nfor x_new in [[2,2],[3,3],[4,4],[5,4]]:\n    pred = knn_predict(X_train, y_train, x_new, k=3)\n    print(f\'kNN(k=3) predict {x_new} -> {pred}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Effect of k on the decision boundary',
              prose: [
                'If `k=1`, the model listens to the single closest point; if `k` is the size of the whole dataset, it just picks the most common overall label. How does varying `k` change where the algorithm draws the line between "Class A" and "Class B"? How might a model perform if it listens too closely to individual noisy points?',
                '*Predicted confidently: Accuracy: 0.75* This proves we can evaluate how many predictions matched the ground truth by iterating through them and dividing by the total count.'
              ],
              typeIt: true,
              solution: '# Throwaway evaluation logic\npreds = [\'A\', \'A\', \'B\', \'A\']\ntruths = [\'A\', \'A\', \'B\', \'B\']\ncorrect = sum(1 for p, t in zip(preds, truths) if p == t)\nprint(f"Accuracy: {correct / len(preds)}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Effect of k on the decision boundary — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def knn_accuracy(...)` — defines a function to test predictions against true labels.\n- `sum(1 for i in range(len(X_test)) if ...)` — a generator expression that yields a `1` for every prediction that correctly matches the test label, and sums them up.\n- `import random` — brings in Python\'s random number generator module.\n- `random.seed(42)` — sets a global seed so runs are reproducible.\n- `def make_cluster(...)` — creates a localized group of points.\n- `random.gauss(0, noise)` — samples noise from a normal distribution centered at 0 with standard deviation `noise`.\n- `X = cluster_A + cluster_B` — concatenates the lists of points.\n- `y = [\'A\']*20 + [\'B\']*20` — creates a target label list matching the features list.\n- `X[:split]` and `X[split:]` — slice the data into a training segment (first 32) and test segment (last 8).\n- `for k in [1, 3, 5, 9, 15]:` — loops through a set of hyperparameter values for `k`.',
                '**Expected behavior.** *Predicted confidently:* ``` k= 1: accuracy=0.875 k= 3: accuracy=1.000 k= 5: accuracy=1.000 k= 9: accuracy=1.000 k=15: accuracy=0.750 ```',
                '**CS lens.** The **Decision boundary** is the dividing line (or hypersurface) in the feature space where the model flips from predicting one class to another. k=1 creates a highly jagged boundary that perfectly surrounds every training point (overfitting noise). k=15 creates a smoother, more generalized boundary (but risks underfitting if details matter). Real-world applications: - Tuning a spam filter to balance aggressive catching versus false positives. - Edge detection thresholds in computer vision. - Setting credit score cutoffs for loan approvals.',
                '**SE lens.** Design principle: **Hyperparameter Parameterization**. Instead of hardcoding `k=3` deep inside the predict loop, `k` is bubbled up as an explicit parameter. This allows testing harnesses to iterate over it without changing the core algorithm. The alternative (hardcoding it) prevents automated tuning.'
              ],
              typeIt: true,
              solution: 'def knn_accuracy(X_train, y_train, X_test, y_test, k):\n    correct = sum(1 for i in range(len(X_test))\n                  if knn_predict(X_train, y_train, X_test[i], k) == y_test[i])\n    return correct / len(X_test)\n\nimport random\nrandom.seed(42)\n\n# Generate data: two Gaussian clusters\ndef make_cluster(center, n, noise=0.5, seed=0):\n    random.seed(seed)\n    return [[center[0] + random.gauss(0, noise),\n             center[1] + random.gauss(0, noise)]\n            for _ in range(n)]\n\ncluster_A = make_cluster([1,1], 20, seed=0)\ncluster_B = make_cluster([3,3], 20, seed=1)\nX = cluster_A + cluster_B\ny = [\'A\']*20 + [\'B\']*20\n\n# Simple 80/20 split:\nsplit = 32\nX_tr, y_tr = X[:split], y[:split]\nX_te, y_te = X[split:], y[split:]\n\nfor k in [1, 3, 5, 9, 15]:\n    acc = knn_accuracy(X_tr, y_tr, X_te, y_te, k)\n    print(f\'k={k:2d}: accuracy={acc:.3f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Feature normalization — why distance metrics need it',
              prose: [
                'If we use `euclidean_distance` on a dataset predicting student success based on "hours studied" (0 to 10) and "income" (0 to 100,000), a difference of 5 hours is dwarfed by a difference of 100 dollars. How do we prevent features with large numeric ranges from shouting down smaller, potentially more important features?',
                '*Predicted confidently: Scaled: 0.429* This proves that subtracting the minimum and dividing by the range scales any number linearly between 0 and 1 relative to its minimum and maximum bounds.'
              ],
              typeIt: true,
              solution: '# Scale 5 within a range of 2 to 9\nval = 5\nv_min, v_max = 2, 9\nscaled = (val - v_min) / (v_max - v_min)\nprint(f"Scaled: {scaled:.3f}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Feature normalization — why distance metrics need it — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `X_raw = [[d[\'hours\'], d[\'income\']] for d in data]` — converts a list of dicts into a 2D list of features.\n- `pred_raw = knn_predict(...)` — predicts the label using unscaled data, resulting in a distance computation completely dominated by income.\n- `def normalize(X):` — defines a function to scale the dataset.\n- `n_features = len(X[0])` — calculates the number of columns (features) based on the first row.\n- `mins = [min(...) ...]` — extracts the minimum value for each column using a list comprehension over the rows.\n- `maxs = [max(...) ...]` — extracts the maximum value for each column.\n- `ranges = [maxs[f] - mins[f] ...]` — computes the difference between max and min, falling back to 1 to prevent division by zero.\n- `(X[i][f] - mins[f]) / ranges[f]` — applies the min-max formula to scale the specific cell into a 0 to 1 range.\n- `new_norm = [...]` — manually normalizes the single test point using the exact same logic.\n- `pred_norm = knn_predict(...)` — makes a new prediction on the normalized dataset.',
                '**Expected behavior.** *Predicted confidently:* ``` Without normalization: fail With normalization: pass ```',
                '**CS lens.** **Feature normalization** prevents dimension dominance. Because Euclidean distance uses squared differences, a difference of 10,000 becomes 100,000,000, completely overwriting a difference of 5 which becomes 25. Real-world applications: - Adjusting raw sensor data (e.g. pressure in Pascals vs temperature in Celsius). - Preparing image pixels (0-255) for neural networks (0-1). - Transforming financial metrics where stock prices and trade volumes have wildly different scales.',
                '**SE lens.** Design principle: **Separation of Concerns**. We normalize the data outside of `knn_predict`. The algorithm should only care about finding neighbors; it shouldn\'t also be responsible for sanitizing or reshaping the input space. The tradeoff is the developer must manually remember to normalize new test points before passing them in.'
              ],
              typeIt: true,
              solution: 'data = [\n    {\'hours\': 2, \'income\': 20000, \'label\': \'fail\'},\n    {\'hours\': 8, \'income\': 21000, \'label\': \'pass\'},\n    {\'hours\': 3, \'income\': 80000, \'label\': \'fail\'},\n    {\'hours\': 9, \'income\': 81000, \'label\': \'pass\'},\n]\n\nX_raw = [[d[\'hours\'], d[\'income\']] for d in data]\ny = [d[\'label\'] for d in data]\nnew_point_raw = [5, 50000]\n\npred_raw = knn_predict(X_raw, y, new_point_raw, k=2)\nprint(f\'Without normalization: {pred_raw}\')\n\ndef normalize(X):\n    n_features = len(X[0])\n    mins  = [min(X[i][f] for i in range(len(X))) for f in range(n_features)]\n    maxs  = [max(X[i][f] for i in range(len(X))) for f in range(n_features)]\n    ranges = [maxs[f] - mins[f] if maxs[f] != mins[f] else 1 for f in range(n_features)]\n    return [[(X[i][f] - mins[f]) / ranges[f] for f in range(n_features)] for i in range(len(X))]\n\nX_norm = normalize(X_raw)\nnew_norm = [(5 - 2)/(9-2), (50000-20000)/(81000-20000)]\npred_norm = knn_predict(X_norm, y, new_norm, k=2)\nprint(f\'With normalization: {pred_norm}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Leave-one-out cross-validation',
              prose: [
                'If you only have 8 data points, a 20% test split means testing on less than 2 points, which is completely unreliable. How can we test a model\'s accuracy on small datasets without losing precious training examples?',
                '*Predicted confidently:* ``` Test: p1, Train: [\'p2\', \'p3\'] Test: p2, Train: [\'p1\', \'p3\'] Test: p3, Train: [\'p1\', \'p2\'] ``` This proves we can systematically exclude exactly one element via its index `i`, leaving all others for the training set, repeating until every point has been the test case once.'
              ],
              typeIt: true,
              solution: '# Throwaway leave-one-out simulation\nX_mock = [\'p1\', \'p2\', \'p3\']\nfor i in range(len(X_mock)):\n    test = X_mock[i]\n    train = [X_mock[j] for j in range(len(X_mock)) if j != i]\n    print(f"Test: {test}, Train: {train}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Leave-one-out cross-validation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def leave_one_out_cv(X, y, k):` — defines the cross-validation function.\n- `n = len(X)` — captures the total number of data points.\n- `correct = 0` — initializes a counter for accurate predictions.\n- `for i in range(n):` — loops once for every single point in the dataset.\n- `X_train = [X[j] for j in range(n) if j != i]` — builds a new training list that includes every feature row except the `i`th one.\n- `y_train = [y[j] for j in range(n) if j != i]` — builds a matching label list excluding the `i`th label.\n- `pred = knn_predict(...)` — asks the model to predict the single left-out point `X[i]` using the rest of the data.\n- `if pred == y[i]:` — checks if the predicted label matches the actual left-out label.\n- `correct += 1` — increments the success count.\n- `return correct / n` — calculates the final accuracy ratio over all `n` folds.',
                '**Expected behavior.** *Predicted confidently:* ``` k=1: LOO-CV accuracy = 1.000 k=3: LOO-CV accuracy = 1.000 k=5: LOO-CV accuracy = 0.875 ```',
                '**CS lens.** **Leave-one-out cross-validation** (LOO-CV) is the extreme end of k-fold cross-validation, where the number of folds equals the number of data points. It provides an unbiased estimate of model performance because it tests every single point, but it requires retraining the model `n` times. Real-world uses: - Medical datasets with extremely low patient counts (e.g., rare diseases). - Early-stage prototype datasets. - Baseline robust accuracy metrics for deterministic models like kNN.',
                '**SE lens.** Design principle: **Deterministic Testing**. In typical machine learning, random 80/20 splits mean accuracy bounces around on every run unless you manage seeds carefully. LOO-CV is completely deterministic: for a given dataset and `k`, the accuracy is a strict mathematical certainty, making it highly reproducible in unit tests. The tradeoff is compute time: looping `n` times scales poorly for large datasets.'
              ],
              typeIt: true,
              solution: 'def leave_one_out_cv(X, y, k):\n    \'\'\'Test each point by training on all others, predicting it.\n       Returns accuracy across all n folds.\'\'\'\n    n = len(X)\n    correct = 0\n    for i in range(n):\n        # Exclude point i from training\n        X_train = [X[j] for j in range(n) if j != i]\n        y_train = [y[j] for j in range(n) if j != i]\n        # Predict point i\n        pred = knn_predict(X_train, y_train, X[i], k)\n        if pred == y[i]:\n            correct += 1\n    return correct / n\n\nX = [[1,1],[1,2],[2,1],[2,2],[5,5],[5,6],[6,5],[6,6]]\ny = [\'A\',\'A\',\'A\',\'A\',\'B\',\'B\',\'B\',\'B\']\n\nfor k in [1, 3, 5]:\n    cv_acc = leave_one_out_cv(X, y, k)\n    print(f\'k={k}: LOO-CV accuracy = {cv_acc:.3f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'kNN for regression',
              prose: [
                'If the training data points are prices, taking a "majority vote" of the 3 nearest prices doesn\'t make sense ($100.10, $100.12, $99.98 are all different values, so a vote ties 1-1-1). How can we modify our nearest-neighbor logic to predict a continuous numerical value instead of a category?',
                '*Predicted confidently: Average: 11.0* This proves that switching from a categorical tally to a simple mathematical mean transforms the final step into a continuous numerical prediction.'
              ],
              typeIt: true,
              solution: '# Throwaway average simulation\nnearest_values = [10.0, 12.0, 11.0]\navg = sum(nearest_values) / len(nearest_values)\nprint(f"Average: {avg}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'kNN for regression — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def knn_regress(...)` — defines the regression variant of our model.\n- `distances = [...]` and `distances.sort(...)` — exactly mirrors the classification logic to find closest neighbors.\n- `k_nearest_values = [val for _, val in distances[:k]]` — extracts the target values (not categories) of the `k` closest neighbors.\n- `return sum(k_nearest_values) / len(k_nearest_values)` — computes and returns the arithmetic mean of those values.\n- `X_train = [[x] for x in range(0, 20, 2)]` — generates a 1D training dataset: `[[0], [2], [4], ...]`.\n- `y_train = [x[0]**2 + random.gauss(0, 5) ...]` — computes the target value as `x^2` but adds Gaussian noise to simulate messy real-world data.\n- `pred = knn_regress(X_train, y_train, [7], k)` — asks the model to predict the value for a point (`x=7`) that isn\'t in the training set.',
                '**Expected behavior.** *Predicted confidently:* ``` k=1: kNN-regression predict f(7)=... k=3: kNN-regression predict f(7)=... k=5: kNN-regression predict f(7)=... ``` *(Exact values depend on noise generation, but approximate to 36, 67, and smooth averages.)*',
                '**CS lens.** **Regression** is a supervised learning task where the output is a continuous number. kNN handles this beautifully by simply changing the final step. Because it takes a local average, kNN regression naturally creates a stepped, jagged prediction curve that follows the data closely, unlike linear regression which forces a straight line through everything. Real-world uses: - Real estate algorithms estimating house prices based on comparable nearby homes. - Weather forecasting based on historical days with similar atmospheric conditions.',
                '**SE lens.** Design principle: **Code Reuse vs. Duplication**. We duplicated the distance-sorting logic inside `knn_regress`. An alternative design would be extracting `get_nearest_neighbors()` into its own function, and having both `knn_predict` and `knn_regress` call it. The tradeoff: duplicating 3 lines of code keeps each function self-contained and easy to read top-to-bottom for a tutorial, whereas extracting it adds indirection. In a production library like `scikit-learn`, they share a common base class to prevent duplication.'
              ],
              typeIt: true,
              solution: 'def knn_regress(X_train, y_train, x_new, k):\n    \'\'\'Predict continuous value by averaging k nearest neighbors\' values.\'\'\'\n    distances = [(euclidean_distance(x_new, X_train[i]), y_train[i])\n                 for i in range(len(X_train))]\n    distances.sort(key=lambda pair: pair[0])\n    k_nearest_values = [val for _, val in distances[:k]]\n    return sum(k_nearest_values) / len(k_nearest_values)\n\n# Approximate f(x) = x^2 from noisy samples:\nimport random; random.seed(0)\nX_train = [[x] for x in range(0, 20, 2)]\ny_train = [x[0]**2 + random.gauss(0, 5) for x in X_train]\n\n# Predict at x=7:\nfor k in [1, 3, 5]:\n    pred = knn_regress(X_train, y_train, [7], k)\n    print(f\'k={k}: kNN-regression predict f(7)={pred:.2f}, true=49\')',
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
      'Next lesson: Evaluating Models.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Leave-one-out cross-validation"?',
      options: [
        'The straight-line distance between two points in Euclidean space, computed as the square root of the sum of squared differences of their coordinates. It is used here to measure how "close" two data points are.',
        'A non-parametric classification algorithm that predicts the label of a new data point by finding the \'k\' closest training examples and taking a majority vote among their labels. It has no separate training phase; it stores the dataset and computes distances at prediction time.',
        'An evaluation technique where each point in the dataset is used once as a test set while all other points serve as the training set, maximizing the data used for training in small datasets.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Non-parametric model"?',
      options: [
        'An evaluation technique where each point in the dataset is used once as a test set while all other points serve as the training set, maximizing the data used for training in small datasets.',
        'A machine learning model that makes no strong assumptions about the form of the mapping function, typically growing in complexity with the size of the dataset. kNN is non-parametric because it just memorizes the data.',
        'The straight-line distance between two points in Euclidean space, computed as the square root of the sum of squared differences of their coordinates. It is used here to measure how "close" two data points are.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Euclidean distance"?',
      options: [
        'A machine learning model that makes no strong assumptions about the form of the mapping function, typically growing in complexity with the size of the dataset. kNN is non-parametric because it just memorizes the data.',
        'The process of scaling individual features to have a similar range (often [0, 1]). Without normalization, features with large numerical ranges will incorrectly dominate distance calculations.',
        'The straight-line distance between two points in Euclidean space, computed as the square root of the sum of squared differences of their coordinates. It is used here to measure how "close" two data points are.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Feature normalization"?',
      options: [
        'The process of scaling individual features to have a similar range (often [0, 1]). Without normalization, features with large numerical ranges will incorrectly dominate distance calculations.',
        'A non-parametric classification algorithm that predicts the label of a new data point by finding the \'k\' closest training examples and taking a majority vote among their labels. It has no separate training phase; it stores the dataset and computes distances at prediction time.',
        'A machine learning model that makes no strong assumptions about the form of the mapping function, typically growing in complexity with the size of the dataset. kNN is non-parametric because it just memorizes the data.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**k-Nearest Neighbors (kNN)** — A non-parametric classification algorithm that predicts the label of a new data point by finding the \'k\' closest training examples and taking a majority vote among their labels. It has no separate training phase; it stores the dataset and computes distances at prediction time.',
    '**Euclidean distance** — The straight-line distance between two points in Euclidean space, computed as the square root of the sum of squared differences of their coordinates. It is used here to measure how "close" two data points are.',
    '**Non-parametric model** — A machine learning model that makes no strong assumptions about the form of the mapping function, typically growing in complexity with the size of the dataset. kNN is non-parametric because it just memorizes the data.',
    '**Feature normalization** — The process of scaling individual features to have a similar range (often [0, 1]). Without normalization, features with large numerical ranges will incorrectly dominate distance calculations.',
    '**Leave-one-out cross-validation** — An evaluation technique where each point in the dataset is used once as a test set while all other points serve as the training set, maximizing the data used for training in small datasets.',
  ],

  checkpoints: ['read-intuition'],
}
