// Guttag — Lesson 44: Clustering
// Auto-converted from src/docs/tutorials/guttag-python/lesson-44.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-44-clustering',
  slug: 'clustering',
  chapter: 7,
  order: 2,
  title: 'Clustering',
  subtitle: 'k-Means from Scratch',
  tags: ['unsupervised-learning', 'centroid', 'inertia', 'silhouette-score', 'elbow-method'],

  hook: {
    question: 'What is "Clustering", and why does it matter?',
    realWorldContext: 'The reader implements k-means clustering from scratch: initialize k centroids, assign each point to nearest centroid, recompute centroids, repeat until convergence. The transferable insight: k-means is UNSUPERVISED. There are no labels. The algorithm discovers structure by grouping nearby points. It minimizes within-cluster variance. It is sensitive to initialization (random restarts help) and requires you to choose k (the elbow method helps).',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The k-means algorithm, Full k-means loop, Inertia — measuring cluster quality, k-means sensitivity to initialization, Evaluating clusters — when there are no labels.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Unsupervised learning:** learning without ground-truth labels — it exists to discover hidden structures, groupings, or patterns in raw data where no "correct answer" is provided beforehand.\n- **Centroid:** the center point of a cluster — it serves as the representative prototype for all data points assigned to that group, allowing us to summarize a cluster mathematically.\n- **Inertia:** the sum of squared distances from each point to its assigned centroid — it provides a quantitative metric of cluster compactness to help evaluate whether our algorithm is converging to a tight grouping.\n- **Silhouette score:** a metric comparing a point\'s distance to its own cluster against its distance to the nearest neighboring cluster — it solves the problem of evaluating cluster quality when we have no ground-truth labels, by quantifying separation.\n- **Elbow method:** a heuristic approach to finding the optimal number of clusters $k$ — it exists to prevent guessing $k$ blindly by visually locating the point of diminishing returns in the inertia plot.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **math.sqrt:** A mathematical function to compute the square root.\n- **zip:** A built-in function to iterate over multiple iterables in parallel.\n- **random.sample:** A function to choose multiple unique random elements from a population.\n- **random.seed:** A function to initialize the internal state of the random number generator.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace `kmeans(6-point-dataset, k=2)`: 1. **Init centroids:** `random.sample` pulls two random starting coordinates, e.g., `[1, 1]` and `[6, 6]`. 2. **Assign iteration 1:** We loop over all points. `[1, 2]` is physically closer to `[1, 1]`, so it receives cluster ID `0`. `[5, 5]` is closer to `[6, 6]`, getting cluster ID `1`. 3. **Update centroids:** We average all coordinates in cluster `0`, shifting the center to `[1.33, 1.33]`. We average cluster `1`, shifting it to `[5.33, 5.33]`. 4. **Assign iteration 2:** We evaluate distances again. The borders haven\'t shifted enough to cross over any points, so assignments remain unchanged. 5. **Convergence check:** The deep equality check `new_assignments == assignments` passes. The `break` triggers. 6. **Inertia & Silhouette:** The resulting compact groupings yield a low `inertia` (tight internal squared distance) and a high `silhouette` score (~0.82, showing clear separation between the two clusters), proving the algorithm successfully discovered the underlying geometric truth without labels.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 44: Clustering',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Clustering',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The k-means algorithm',
              prose: [
                'How do we mathematically group a set of coordinates into discrete clusters when we don\'t know the categories in advance? Given a list of arbitrary points in 2D space, what would be your first step to determine which points "belong" together? If you randomly guessed two center points right now, how would you decide which data points belong to which center?',
                'This proves that by defining prototype centers (centroids) and mathematically mapping points to the centroid with the minimum Euclidean distance, data naturally segments into groups based on proximity.'
              ],
              typeIt: true,
              solution: 'import math\ndef temp_dist(a, b): return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))\npoints = [[1,1],[1,2],[2,1],[5,5],[5,6],[6,5]]\ncentroids = [[1,1],[6,6]]\nassignments = [0 if temp_dist(p, centroids[0]) < temp_dist(p, centroids[1]) else 1 for p in points]\nprint(assignments)\n# [0, 0, 0, 1, 1, 1]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'The k-means algorithm — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def euclidean_distance(a, b):` declares a new function taking two points `a` and `b`.\n- `zip(a, b)` aligns the individual dimensional coordinates of `a` and `b`.\n- `(ai - bi)**2` computes the squared difference for a single dimension.\n- `sum(...)` aggregates all squared dimensional differences into one scalar.\n- `math.sqrt(...)` takes the square root of that sum, giving actual physical distance.\n- `assignments = []` initializes an empty list to store the cluster ID for each point.\n- `distances = [euclidean_distance(point, c) for c in centroids]` constructs a temporary list mapping the point\'s distance to every single candidate center.\n- `min(distances)` finds the smallest distance in that list.\n- `.index(...)` retrieves the integer index (cluster ID) corresponding to that minimum distance.\n- `n_features = len(points[0])` calculates the dimensionality of our dataset based on the first point.\n- `cluster_points = [...]` uses a list comprehension to filter the dataset down to only the points matching the current `cluster_id`.\n- `if not cluster_points:` checks if any points actually fell into this cluster.\n- `new_centroids.append(None)` pushes a sentinel value for empty clusters so we don\'t accidentally divide by zero.\n- `sum(p[f] for p in cluster_points)/len(cluster_points)` averages the coordinates for the $f$-th feature across all points in the cluster.',
                '**Expected behavior.** Predicted confidently: Trace assign_clusters: point [1,1]: dist to [1,1]=0, dist to [6,6]=7.07 -> cluster 0. point [5,5]: dist to [1,1]=5.66, dist to [6,6]=1.41 -> cluster 1. All 6 points correctly assigned. update_centroids: cluster 0 = {[1,1],[1,2],[2,1]}, mean=[1.33,1.33].',
                '**CS lens.** The concept here is **Lloyd\'s Algorithm (Expectation-Maximization)**. By assigning data (Expectation) and updating parameters to fit that assignment (Maximization), we iteratively refine an unlabelled structure. You see this everywhere in CS: 1. Garbage collection tracing relies on iterative marking until convergence. 2. Routing protocols (like OSPF or BGP) update path weights iteratively until the network state settles. 3. Rendering engines simulate light bouncing (radiosity) across surfaces iteratively until the scene converges. 4. Data compression algorithms (like LBG for vector quantization) use the exact same iterative clustering logic to build color palettes.',
                '**SE lens.** **Design Principle:** Pure Functions and Statelessness. `assign_clusters` and `update_centroids` have no side effects and do not mutate the input lists. **Alternative NOT chosen:** We could have implemented a `Cluster` class that stores its own points and mutates its own centroid state internally (`cluster.add_point(p)`). **Real tradeoff:** A stateful object-oriented approach makes intuitive sense, but functional immutability here makes debugging the mathematical progression vastly simpler because we can perfectly snapshot the arrays at any discrete iteration.'
              ],
              typeIt: true,
              solution: 'import math\n\ndef euclidean_distance(a, b):\n    return math.sqrt(sum((ai - bi)**2 for ai, bi in zip(a, b)))\n\ndef assign_clusters(points, centroids):\n    \'\'\'Assign each point to its nearest centroid. Returns list of cluster IDs.\'\'\'\n    assignments = []\n    for point in points:\n        distances = [euclidean_distance(point, c) for c in centroids]\n        assignments.append(distances.index(min(distances)))\n    return assignments\n\ndef update_centroids(points, assignments, k):\n    \'\'\'Recompute centroid as mean of all points assigned to each cluster.\'\'\'\n    n_features = len(points[0])\n    new_centroids = []\n    for cluster_id in range(k):\n        cluster_points = [points[i] for i in range(len(points)) if assignments[i] == cluster_id]\n        if not cluster_points:  # empty cluster: keep old centroid\n            new_centroids.append(None)\n        else:\n            centroid = [sum(p[f] for p in cluster_points)/len(cluster_points)\n                       for f in range(n_features)]\n            new_centroids.append(centroid)\n    return new_centroids',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Full k-means loop',
              prose: [
                'How do we know when to stop updating centroids? If we apply `assign` and `update` over and over, what is the mathematical signal that our clusters are as good as they are going to get? If the assignments never change from one iteration to the next, is there any point in continuing?',
                'This proves that by comparing the next state to the current state, we can short-circuit a predetermined loop limit as soon as the system reaches a steady equilibrium.'
              ],
              typeIt: true,
              solution: 'state = 0\nfor i in range(10):\n    new_state = state + (1 if state < 3 else 0)\n    if new_state == state:\n        print(f"Converged at {i}")\n        break\n    state = new_state\n# Converged at 3',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Full k-means loop — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` pulls in Python\'s standard pseudo-random number generator.\n- `def kmeans(points, k, max_iters=100, seed=42):` defines the main entry function, providing defaults for iteration bounds and random seeding.\n- `random.seed(seed)` deterministically primes the random engine so our outputs don\'t flap randomly.\n- `random.sample(points, k)` pulls $k$ unique data points to serve as the initial generation of centroids.\n- `assignments = [0] * len(points)` pre-allocates an array of zeros representing the \'previous\' state of assignments.\n- `for iteration in range(max_iters):` starts a bounded loop, ensuring the algorithm won\'t hang infinitely if it oscillates.\n- `new_assignments = assign_clusters(...)` generates the next expected state based on the current centers.\n- `new_centroids = update_centroids(...)` shifts the centers based on the fresh assignments.\n- `if new_centroids[i] is None:` guards against a cluster having zero points assigned to it.\n- `new_centroids[i] = centroids[i]` safely rolls back the dead centroid to its previous known location.\n- `if new_assignments == assignments:` performs a deep equality check on the two lists to see if any single point changed alliances.\n- `break` exits the iteration limit early because steady-state has been reached.',
                '**Expected behavior.** Predicted confidently: Trace kmeans(points, k=2): init centroids (random). Iter 1: assign all points, update centroids. Iter 2: re-assign, update. Assignments same as iter 1: converged. Centroids: mean of group A = [1.5,1.5], group B = [5.5,5.5].',
                '**CS lens.** The concept here is **Convergence in Iterative Numerical Methods**. Many problems lack closed-form algebraic solutions. Instead, you start with a guess and refine it. 1. Newton-Raphson method for finding roots of functions. 2. PageRank calculating the relative importance of web pages. 3. Gradient descent training a neural network\'s weights. 4. Markov chain mixing times approaching a stationary distribution.',
                '**SE lens.** **Design Principle:** Defensive Bounding. The `max_iters` parameter forces a worst-case stop condition. **Alternative NOT chosen:** We could have used a `while True:` loop that only exits on absolute convergence. **Real tradeoff:** While mathematically pure k-means is proven to converge, floating-point inaccuracies or highly specific degenerate data can cause infinite oscillation between two equally valid states. Capping the loop guarantees the software halts.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef kmeans(points, k, max_iters=100, seed=42):\n    random.seed(seed)\n    # Initialize: pick k random points as starting centroids\n    centroids = random.sample(points, k)\n    assignments = [0] * len(points)\n\n    for iteration in range(max_iters):\n        new_assignments = assign_clusters(points, centroids)\n        new_centroids = update_centroids(points, new_assignments, k)\n        # Replace None centroids (empty clusters) with old ones\n        for i in range(k):\n            if new_centroids[i] is None:\n                new_centroids[i] = centroids[i]\n\n        # Check convergence: if assignments unchanged, stop\n        if new_assignments == assignments:\n            print(f\'Converged at iteration {iteration+1}\')\n            break\n        assignments = new_assignments\n        centroids = new_centroids\n\n    return centroids, assignments',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Inertia — measuring cluster quality',
              prose: [
                'If the algorithm finishes, how do we know if it did a good job? If we ask for $k=2$ clusters, but the data naturally forms 3 clusters, how could we mathematically detect that $k$ was poorly chosen? What happens to the distances inside a cluster if the grouping is terrible?',
                'This proves that squaring the distances from elements to their center heavily penalizes points that are far away, creating a singular metric (inertia) where lower is strictly better.'
              ],
              typeIt: true,
              solution: '# Distance from a fixed center (5)\ncenter = 5\nbad_cluster = [1, 9]\ngood_cluster = [4, 6]\nbad_inertia = sum((x-center)**2 for x in bad_cluster) # (16) + (16) = 32\ngood_inertia = sum((x-center)**2 for x in good_cluster) # (1) + (1) = 2\nprint(bad_inertia, good_inertia)\n# 32 2',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Inertia — measuring cluster quality — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def inertia(...)` takes the full state of a finished clustering run: points, final centers, and final assignments.\n- `total = 0` sets up an accumulator variable.\n- `for i, point in enumerate(points):` iterates over the dataset while preserving the index `i` so we can look up its assignment.\n- `centroid = centroids[assignments[i]]` fetches the exact center this specific point belongs to.\n- `sum((point[f] - centroid[f])**2 for f in range(len(point)))` computes the squared Euclidean distance without taking the square root.\n- `total += ...` adds this point\'s squared penalty to the global accumulator.',
                '**Expected behavior.** Predicted confidently: Trace inertia(points, centroids, assignments): for each point, compute squared distance to its assigned centroid, sum all. k=1: centroid at mean of all 12 points ~(5.33,5.33). Points at [1,1] are far: (1-5.33)^2+(1-5.33)^2=37.5. Sum all 12: ~300. k=3: three tight clusters: inertia ~12.',
                '**CS lens.** The concept here is a **Loss/Cost Function**. You compress complex system behavior into one number to be minimized. 1. Mean Squared Error (MSE) in linear regression. 2. Cross-entropy loss in classification neural networks. 3. Path cost functions in A* search algorithms. 4. Energy functions in simulated annealing.',
                '**SE lens.** **Design Principle:** Decoupled Evaluation. The `inertia` function is completely separated from the `kmeans` algorithm itself. **Alternative NOT chosen:** We could have calculated inertia inside the `kmeans` loop and returned it as a third element in the tuple. **Real tradeoff:** Decoupling evaluation allows us to compute the metric selectively (e.g., only after we\'ve finished looping multiple times) saving CPU cycles during the hot loop of the algorithm itself.'
              ],
              typeIt: true,
              solution: 'def inertia(points, centroids, assignments):\n    \'\'\'Sum of squared distances from each point to its centroid.\n       Lower inertia = tighter, more compact clusters.\'\'\'\n    total = 0\n    for i, point in enumerate(points):\n        centroid = centroids[assignments[i]]\n        total += sum((point[f] - centroid[f])**2 for f in range(len(point)))\n    return total',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'k-means sensitivity to initialization',
              prose: [
                'What happens if our initial random guess for the centers is incredibly unlucky? If $k=2$ and both random centers happen to spawn in the exact same clump of data, how will the algorithm recover? Will it always find the true global minimum?',
                'This proves that greedy optimization algorithms will gleefully halt at a local extreme (5) if they start close to it, completely missing the global extreme (9) that exists elsewhere in the space.'
              ],
              typeIt: true,
              solution: '# A simple greedy climber finding a peak\npeaks = [1, 2, 5, 4, 1, 9, 8, 2]\nstart_idx = 1\nwhile peaks[start_idx+1] > peaks[start_idx]:\n    start_idx += 1\nprint(f"Stuck at peak value: {peaks[start_idx]}")\n# Stuck at peak value: 5',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'k-means sensitivity to initialization — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def kmeans_bad_init(points, k):` defines a variant of our algorithm designed to fail.\n- `centroids = points[:k]` intentionally subverts the randomness by grabbing the first $k$ points, which in sorted data usually belong to the same cluster.\n- `for iteration in range(10):` runs a shortened identical loop to regular `kmeans`.\n- `return centroids, assignments, inertia(...)` returns the final state alongside its objective score so we can compare it to a good run.',
                '**Expected behavior.** Predicted confidently: Trace bad init: both initial centroids in cluster A. Some cluster B points may be assigned to the \'A-biased\' centroid. Algorithm may converge to suboptimal solution. Solution: k-means++ initialization (choose centroids spread out), or run multiple random restarts and pick best inertia.',
                '**CS lens.** The concept here is **Sensitivity to Initial Conditions**. Optimization algorithms behave wildly differently based on where they start. 1. Chaotic systems (like double pendulums) diverging based on micro-adjustments. 2. Weight initialization in neural nets causing vanishing/exploding gradients. 3. K-means++ algorithm specifically designed to space out initial seeds to fix this exact bug. 4. Ray marching artifacts depending on step size origins.',
                '**SE lens.** **Design Principle:** Reproducibility through seeding. **Alternative NOT chosen:** We could have just let `random.sample()` use system time implicitly. **Real tradeoff:** If we rely on implicit seeding, a user will run `kmeans()` and get different cluster shapes and different inertia scores randomly on every execution. Explicit seeding (`seed=42`) allows us to deterministically prove that bad starts exist without relying on chance to demonstrate the flaw.'
              ],
              typeIt: true,
              solution: '# Bad initialization: both centroids in same cluster\ndef kmeans_bad_init(points, k):\n    # Force bad initialization: first k points (all from cluster A)\n    centroids = points[:k]\n    assignments = [0] * len(points)\n    for iteration in range(10):\n        new_assignments = assign_clusters(points, centroids)\n        new_centroids = update_centroids(points, new_assignments, k)\n        for i in range(k):\n            if new_centroids[i] is None:\n                new_centroids[i] = centroids[i]\n        if new_assignments == assignments: break\n        assignments = new_assignments\n        centroids = new_centroids\n    return centroids, assignments, inertia(points, centroids, assignments)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Evaluating clusters — when there are no labels',
              prose: [
                'If $k=N$ (every point is its own cluster), inertia drops to zero, which looks "perfect" mathematically but is utterly useless functionally. How do we punish the algorithm for putting clusters too close together? If a point is tightly bound to its centroid, shouldn\'t we also verify that it is *far away* from the next closest cluster?',
                'This proves that by comparing internal cohesion against external separation, we generate a normalized score between -1 and 1 where higher numbers strictly mean "well separated."'
              ],
              typeIt: true,
              solution: 'my_dist = 1.0     # very close to my friends\nother_dist = 10.0 # very far from the next group\nscore = (other_dist - my_dist) / max(my_dist, other_dist)\nprint(score)\n# 0.9',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Evaluating clusters — when there are no labels — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def silhouette_score_point(point_idx, points, assignments):` defines a scoring function aimed at exactly one point in the dataset.\n- `assignments_list = assignments` aliases the array for clarity.\n- `cluster = assignments_list[point_idx]` determines the point\'s home cluster.\n- `same = [...]` constructs a list of all other coordinate points residing in that exact same home cluster.\n- `sum(...) / len(same)` averages the Euclidean distances to all peer points, defining `a`.\n- `other_clusters = set(assignments_list) - {cluster}` leverages Python sets to construct a unique collection of all competing clusters.\n- `min(...)` evaluates the mean distance to *every* other cluster and selects the lowest one (i.e., the closest neighboring cluster), defining `b`.\n- `return (b - a) / max(a, b)` normalizes the difference, bounding it securely between -1.0 and 1.0.',
                '**Expected behavior.** Predicted confidently: Trace silhouette for point [1,1] in cluster 0: same cluster: [1,2],[2,1],[2,2]. a=mean dist to those=mean(1,1,1.41)=1.14. Other cluster (1) points: [5,5],[5,6],[6,5],[6,6]. b=mean dist=5.66,6.08,6.40,7.07, mean=6.30. score=(6.30-1.14)/max=5.16/6.30=0.82. Good separation.',
                '**CS lens.** The concept here is **Normalization of Unbounded Metrics**. `a` and `b` could be distances of 0.5 or 50,000 depending on the scale of the raw data. 1. Audio volume compression capping massive dynamic range. 2. Cosine similarity scaling raw dot products into the [-1, 1] range. 3. TF-IDF normalizing word counts against document length. 4. Sigmoid functions clamping arbitrary neural network activations into a (0, 1) probability space.',
                '**SE lens.** **Design Principle:** O(N^2) computation tradeoffs. **Alternative NOT chosen:** We calculate `silhouette` per-point, forcing the caller to loop over the dataset, meaning the overall operation compares every point against every other point. **Real tradeoff:** This metric is exceptionally expensive to compute on massive datasets compared to `inertia` (which just compares points to their centroids). In production ML systems, you often compute silhouette scores on a small random sample of the data rather than the entire dataset to save processing time.'
              ],
              typeIt: true,
              solution: 'def silhouette_score_point(point_idx, points, assignments):\n    \'\'\'Silhouette coefficient for one point: (b-a)/max(a,b).\n       a = mean distance to points in same cluster.\n       b = mean distance to points in nearest other cluster.\n       Range: [-1, 1]. Higher = better separation.\'\'\'\n    assignments_list = assignments\n    cluster = assignments_list[point_idx]\n    point = points[point_idx]\n\n    # a: mean intra-cluster distance\n    same = [points[i] for i in range(len(points))\n            if assignments_list[i] == cluster and i != point_idx]\n    a = sum(euclidean_distance(point, p) for p in same) / len(same) if same else 0\n\n    # b: mean distance to nearest other cluster\n    other_clusters = set(assignments_list) - {cluster}\n    b = min(\n        sum(euclidean_distance(point, points[i]) for i in range(len(points))\n            if assignments_list[i] == c) / sum(1 for a2 in assignments_list if a2 == c)\n        for c in other_clusters\n    )\n    return (b - a) / max(a, b) if max(a, b) > 0 else 0',
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
      'Next lesson: Classification.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Unsupervised learning"?',
      options: [
        'the center point of a cluster — it serves as the representative prototype for all data points assigned to that group, allowing us to summarize a cluster mathematically.',
        'learning without ground-truth labels — it exists to discover hidden structures, groupings, or patterns in raw data where no "correct answer" is provided beforehand.',
        'a heuristic approach to finding the optimal number of clusters $k$ — it exists to prevent guessing $k$ blindly by visually locating the point of diminishing returns in the inertia plot.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Silhouette score"?',
      options: [
        'the sum of squared distances from each point to its assigned centroid — it provides a quantitative metric of cluster compactness to help evaluate whether our algorithm is converging to a tight grouping.',
        'the center point of a cluster — it serves as the representative prototype for all data points assigned to that group, allowing us to summarize a cluster mathematically.',
        'a metric comparing a point\'s distance to its own cluster against its distance to the nearest neighboring cluster — it solves the problem of evaluating cluster quality when we have no ground-truth labels, by quantifying separation.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Elbow method"?',
      options: [
        'a metric comparing a point\'s distance to its own cluster against its distance to the nearest neighboring cluster — it solves the problem of evaluating cluster quality when we have no ground-truth labels, by quantifying separation.',
        'a heuristic approach to finding the optimal number of clusters $k$ — it exists to prevent guessing $k$ blindly by visually locating the point of diminishing returns in the inertia plot.',
        'learning without ground-truth labels — it exists to discover hidden structures, groupings, or patterns in raw data where no "correct answer" is provided beforehand.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Inertia"?',
      options: [
        'the sum of squared distances from each point to its assigned centroid — it provides a quantitative metric of cluster compactness to help evaluate whether our algorithm is converging to a tight grouping.',
        'a heuristic approach to finding the optimal number of clusters $k$ — it exists to prevent guessing $k$ blindly by visually locating the point of diminishing returns in the inertia plot.',
        'the center point of a cluster — it serves as the representative prototype for all data points assigned to that group, allowing us to summarize a cluster mathematically.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Unsupervised learning** — learning without ground-truth labels — it exists to discover hidden structures, groupings, or patterns in raw data where no "correct answer" is provided beforehand.',
    '**Centroid** — the center point of a cluster — it serves as the representative prototype for all data points assigned to that group, allowing us to summarize a cluster mathematically.',
    '**Inertia** — the sum of squared distances from each point to its assigned centroid — it provides a quantitative metric of cluster compactness to help evaluate whether our algorithm is converging to a tight grouping.',
    '**Silhouette score** — a metric comparing a point\'s distance to its own cluster against its distance to the nearest neighboring cluster — it solves the problem of evaluating cluster quality when we have no ground-truth labels, by quantifying separation.',
    '**Elbow method** — a heuristic approach to finding the optimal number of clusters $k$ — it exists to prevent guessing $k$ blindly by visually locating the point of diminishing returns in the inertia plot.',
  ],

  checkpoints: ['read-intuition'],
}
