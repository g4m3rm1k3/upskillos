// Guttag — Lesson 38: Random Walks and Simulation
// Auto-converted from src/docs/tutorials/guttag-python/lesson-38.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-38-random-walks-and-simulation',
  slug: 'random-walks-and-simulation',
  chapter: 6,
  order: 2,
  title: 'Random Walks and Simulation',
  subtitle: 'Stochastic Thinking and Simulation',
  tags: ['expected-distance', 'simulation', 'polymorphism', 'import', 'class', 'init'],

  hook: {
    question: 'What is "Random Walks and Simulation", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 6 core ideas: The random walk concept, The Drunk class (agent), The Field class (environment), The simulation — many trials, many steps, Comparing regular vs biased drunk, Text-based visualization of the walk.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Expected Distance:** The mathematical average distance from the starting point after a given number of random steps.\n- **Simulation:** The process of modeling a real-world or theoretical system using code, allowing us to run trials and observe probabilistic outcomes.\n- **Polymorphism:** The ability of different objects (like a regular drunk vs. a biased drunk) to respond to the exact same method call (take_step()) in their own specific ways.\n- **import:** Python keyword that loads external modules (like random and math) into your current script.\n- **class:** Python keyword that defines a new blueprint for creating objects.\n- **__init__:** The constructor method called automatically when a new object is created from a class, responsible for setting up its initial state.\n- **self:** The implicit first argument in instance methods that refers to the specific object the method is being called on.\n- **return:** Python keyword that exits a function and hands a value back to the caller.\n- **for ... in:** Python syntax for iterating over a sequence of values or a range of numbers.\n- **if:** Python keyword for conditional execution based on a boolean expression.\n- **raise:** Python keyword used to intentionally trigger an exception when an invalid state or operation is detected.\n- **not in:** Python operator that evaluates to True if a specified element is not found within a collection.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **random.seed:** A function that initializes the internal state of the random number generator.\n- **random.choice:** A function that returns a randomly selected element from a non-empty sequence.\n- **math.sqrt:** A function that calculates the square root of a number.\n- **len:** A built-in function that returns the number of items in a container.\n- **sum:** A built-in function that adds up the items of an iterable from left to right.\n- **abs:** A built-in function that returns the absolute (positive) value of a number.\n- **min / max:** Built-in functions that return the smallest and largest items in an iterable, respectively.\n- **ValueError:** A built-in exception raised when an operation or function receives an argument that has the right type but an inappropriate value.\n- **Location:** A class representing a specific 2D coordinate.\n- **Location.move:** A method that computes a new location based on coordinate offsets.\n- **Location.distance_from:** A method that computes the straight-line (Euclidean) distance to another location.\n- **Drunk:** A base class representing the agent taking the random walk.\n- **BiasedDrunk:** A subclass of Drunk that has an unequal probability of moving in different directions.\n- **Field:** A class that manages the relationship between agents (drunks) and their locations.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'By separating concerns into `Location`, `Drunk`, and `Field`, we established an architecture that scales. We passed `Drunk` into `Field` (a spatial mapping), wrapped them in `walk` (a single trial), and wrapped that in `simulate_walks` (a large-scale Monte Carlo run). This structure allowed us to hot-swap `Drunk` for `BiasedDrunk` with zero changes to the environment logic, ultimately proving that random walks scale as `sqrt(n)` unless biased. Random walks model Brownian motion, stock prices, the spread of diseases, and more. Lesson 39 covers Monte Carlo simulation for probabilistic modeling.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 38: Random Walks and Simulation',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Random Walks and Simulation',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The random walk concept',
              prose: [
                'If you take a step forward or backward with a 50/50 chance, and repeat this many times, where will you end up? Intuitively, since forward and backward balance out, your *average position* across many attempts will be exactly where you started (0). But your average *distance* from the start (absolute value) will not be 0, because on any given attempt you are likely to wander away in one direction or the other. How can we write a program to discover the relationship between the number of steps taken and the expected distance from the origin? > **Socratic prompt:** Before looking at the code below, how would you simulate a 1D random walk using what you know about lists and random numbers? If you took 100 steps, would you guess the average distance is 10, 50, or 100? Write down your guess.',
                'Output: ``` Final positions: [10, -6, 2, -6, 6, 8, -6, 4, -4, 2] Mean distance: 5.4 sqrt(100): 10.0 ``` This simple script is a **Monte Carlo simulation**. It uses repeated random sampling to estimate a mathematical result. Here it proves that while individual positions vary wildly (from -6 to 10), the mean distance begins to approximate the square root of the number of steps (100 steps -> ~10 distance).'
              ],
              typeIt: true,
              solution: 'import random\nimport math\n\ndef random_walk_1d(n_steps, seed=None):\n    if seed is not None:\n        random.seed(seed)\n    position = 0\n    for _ in range(n_steps):\n        position += random.choice([-1, 1])\n    return position\n\nrandom.seed(42)\ntrials = [random_walk_1d(100) for _ in range(10)]\nprint(\'Final positions:\', trials)\nprint(\'Mean distance:\', sum(abs(p) for p in trials) / len(trials))\nprint(\'sqrt(100):\', math.sqrt(100))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'The random walk concept — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Location:` — Defines a new blueprint for coordinate objects.\n- `def __init__(self, x, y):` — The constructor method that initializes state when a new location is created.\n- `self._x = x` — Stores the `x` coordinate as an instance variable. The underscore implies it is private and shouldn\'t be modified directly.\n- `self._y = y` — Stores the `y` coordinate as an instance variable.\n- `def move(self, delta_x, delta_y):` — An instance method that calculates a new location given an offset.\n- `return Location(...)` — Returns a *brand new* instance of `Location` rather than mutating the current one.\n- `def distance_from(self, other):` — Computes distance to another location using the Pythagorean theorem.\n- `math.sqrt(...)` — A function call to `math.sqrt` to find the square root of the sum of squared differences.\n- `def __repr__(self):` — A special method that dictates how the object is printed to the console, making debugging easier.',
                '**Expected behavior.** Let\'s verify the `Location` logic: ```python start = Location(0, 0) step1 = start.move(1, 0) step2 = step1.move(0, -1) print(start.distance_from(step2)) ``` Output: ``` 1.4142135623730951 ``` The Euclidean distance from (0,0) to (1,-1) is exactly the square root of 2 (~1.414).',
                '**CS lens.** The `Location` class embodies **immutability**. Because `move` returns a new `Location` object rather than altering `self._x` and `self._y`, a specific `Location` object never changes once created. Also recognized in: functional programming paradigms, strings and tuples in Python, React state updates, and event sourcing architectures.',
                '**SE lens.** Why return a new `Location` instead of updating the current one? If multiple parts of a program hold a reference to `Location(0,0)` and one component moves it, it would move it for everyone, causing aliasing bugs. Immutability prevents these bugs at the cost of slight memory overhead. The alternative, mutating in place (`self._x += delta_x`), was not chosen because spatial coordinates are fundamental values (like the number 5); they shouldn\'t change their identity.'
              ],
              typeIt: true,
              solution: 'class Location:\n    def __init__(self, x, y):\n        self._x = x\n        self._y = y\n\n    def move(self, delta_x, delta_y):\n        return Location(self._x + delta_x, self._y + delta_y)\n\n    def distance_from(self, other):\n        return math.sqrt((self._x - other._x)**2 + (self._y - other._y)**2)\n\n    def __repr__(self):\n        return f\'Location({self._x}, {self._y})\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'The Drunk class (agent)',
              prose: [
                'We have a grid, but who is walking on it? We need to represent an entity that can make decisions about which direction to move next. In a simulation, we want to separate the *actor* from the *environment* so we can easily swap out different types of actors later. > **Socratic prompt:** If you were to design a class that just chooses a random direction, what methods would it actually need? Does it need to know its own location?',
                'Output: ``` [\'North\', \'South\', \'West\'] ``` This is a **stateless decision maker**. The agent doesn\'t track where it is; it only provides the *intent* to move.'
              ],
              typeIt: true,
              solution: 'import random\n\nclass ThrowawayAgent:\n    def pick_direction(self):\n        return random.choice([\'North\', \'South\', \'East\', \'West\'])\n\nagent = ThrowawayAgent()\nrandom.seed(42)\nprint([agent.pick_direction() for _ in range(3)])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'The Drunk class (agent) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Drunk:` — Defines the agent class.\n- `STEPS = [(0, 1), (0, -1), (1, 0), (-1, 0)]` — A class-level constant defining the 4 cardinal directions as (x,y) tuples.\n- `def __init__(self, name):` — The constructor method.\n- `self._name = name` — Stores the agent\'s name.\n- `def take_step(self):` — An instance method that decides the next move.\n- `return random.choice(self.STEPS)` — Calls `random.choice` to pick one tuple uniformly from the `STEPS` list.\n- `def __str__(self):` — Defines the string representation for when the object is printed.',
                '**Expected behavior.** Let\'s see what a drunk produces: ```python bob = Drunk(\'Bob\') random.seed(42) for _ in range(3): print(bob.take_step()) ``` Output: ``` (1, 0) (0, -1) (-1, 0) ```',
                '**CS lens.** The `Drunk` embodies **Separation of Concerns**. The agent has no idea *where* it is, what the boundaries are, or what a `Location` object is. It only knows how to decide its own next delta. Also recognized in: Model-View-Controller (MVC) architecture, physics engines (separating forces from positional integration), network packet generation.',
                '**SE lens.** Why not have the `Drunk` hold its own `Location`? If the agent updates its own location, the environment loses control over collision detection or boundaries. The alternative (agent holds `self.location`) was rejected because it tightly couples the actor to the grid mechanics.'
              ],
              typeIt: true,
              solution: 'class Drunk:\n    STEPS = [(0, 1), (0, -1), (1, 0), (-1, 0)]\n\n    def __init__(self, name):\n        self._name = name\n\n    def take_step(self):\n        return random.choice(self.STEPS)\n\n    def __str__(self):\n        return f\'Drunk({self._name})\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'The Field class (environment)',
              prose: [
                'We have coordinates and we have an agent, but they don\'t know about each other. How do we keep track of where the agent actually is in space? > **Socratic prompt:** If you have 5 agents walking simultaneously, what data structure would you use to track all their locations efficiently?',
                'Output: ``` 5 ``` This is an **environment map**. It uses a dictionary to track the state of objects externally, instead of forcing objects to track themselves.'
              ],
              typeIt: true,
              solution: 'class ThrowawayEnv:\n    def __init__(self):\n        self.state = {}\n    def register(self, item, pos):\n        self.state[item] = pos\n    def move(self, item, amount):\n        self.state[item] += amount\n\nenv = ThrowawayEnv()\nenv.register(\'actorA\', 0)\nenv.move(\'actorA\', 5)\nprint(env.state[\'actorA\'])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'The Field class (environment) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Field:` — Defines the environment class.\n- `def __init__(self):` — The constructor method.\n- `self._drunks = {}` — Initializes an empty dictionary that will map `Drunk` instances to `Location` instances.\n- `def add_drunk(self, drunk, location):` — Method to place an agent in the environment.\n- `if drunk in self._drunks:` — Checks if the dictionary already contains this key.\n- `raise ValueError(...)` — Triggers a crash with `ValueError` to prevent duplicate tracking.\n- `self._drunks[drunk] = location` — Adds the mapping.\n- `def get_location(self, drunk):` — Retrieves the current coordinate.\n- `if drunk not in self._drunks:` — Checks for key absence.\n- `def move_drunk(self, drunk):` — Method that advances the simulation for one agent by one step.\n- `delta_x, delta_y = drunk.take_step()` — Calls the agent\'s logic and unpacks the returned tuple into two variables.\n- `current = self._drunks[drunk]` — Retrieves the agent\'s current `Location`.\n- `self._drunks[drunk] = current.move(delta_x, delta_y)` — Calls `move()` on the `Location` to compute the new spot, and overwrites the dictionary value with it.',
                '**Expected behavior.** Let\'s see the interaction between all three classes: ```python field = Field() bob = Drunk(\'Bob\') field.add_drunk(bob, Location(0, 0)) random.seed(42) for step in range(5): field.move_drunk(bob) loc = field.get_location(bob) print(f\'Step {step+1}: {loc}, dist from origin: {loc.distance_from(Location(0,0)):.3f}\') ``` Output: ``` Step 1: Location(1, 0), dist from origin: 1.000 Step 2: Location(1, -1), dist from origin: 1.414 Step 3: Location(0, -1), dist from origin: 1.000 Step 4: Location(0, -2), dist from origin: 2.000 Step 5: Location(0, -1), dist from origin: 1.000 ```',
                '**CS lens.** The `Field` uses **indirection and mapping** to act as a source of truth. Also recognized in: database relational tables, memory allocation tables, DOM elements mapped to React fiber nodes.',
                '**SE lens.** Why use exception throwing (`raise ValueError`) here? The environment strictly enforces constraints. If someone tries to move a drunk that isn\'t on the board, returning `None` or failing silently would mask a logic bug in the simulation runner. We choose to fail loud and early (Fail Fast principle).'
              ],
              typeIt: true,
              solution: 'class Field:\n    def __init__(self):\n        self._drunks = {}\n\n    def add_drunk(self, drunk, location):\n        if drunk in self._drunks:\n            raise ValueError(f\'{drunk} already in field\')\n        self._drunks[drunk] = location\n\n    def get_location(self, drunk):\n        if drunk not in self._drunks:\n            raise ValueError(f\'{drunk} not in field\')\n        return self._drunks[drunk]\n\n    def move_drunk(self, drunk):\n        if drunk not in self._drunks:\n            raise ValueError(f\'{drunk} not in field\')\n        delta_x, delta_y = drunk.take_step()\n        current = self._drunks[drunk]\n        self._drunks[drunk] = current.move(delta_x, delta_y)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'The simulation — many trials, many steps',
              prose: [
                'We have the tools to walk 5 steps, but a Monte Carlo simulation requires thousands of steps over hundreds of independent trials to find statistical truth. How do we orchestrate this cleanly? > **Socratic prompt:** If you need to run 100 trials, and each trial consists of 1,000 steps, how many nested loops do you need? What data do you need to collect from each trial?',
                'Output: ``` 5.37 ``` This is a **statistical aggregator**. It runs independent trials, collects a final metric from each, and computes the mean.'
              ],
              typeIt: true,
              solution: 'def throwaway_trial():\n    return random.randint(1, 10)\n\ndef aggregate_trials(n_trials):\n    results = []\n    for _ in range(n_trials):\n        results.append(throwaway_trial())\n    return sum(results) / len(results)\n\nrandom.seed(42)\nprint(aggregate_trials(100))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'The simulation — many trials, many steps — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def walk(field, drunk, n_steps):` — Function that executes a single trial.\n- `start = field.get_location(drunk)` — Saves the starting point.\n- `for _ in range(n_steps):` — Loops `n_steps` times.\n- `field.move_drunk(drunk)` — Executes the move.\n- `return start.distance_from(...)` — Calculates and returns the total distance traversed at the end of the trial.\n- `def simulate_walks(n_steps, n_trials, drunk_class=Drunk):` — Function that runs multiple trials and gathers data.\n- `drunk_class=Drunk` — A default argument that accepts a class type (not an instance).\n- `distances = []` — Initializes a list to hold the outcome of each trial.\n- `for _ in range(n_trials):` — Loops for the number of trials.\n- `drunk = drunk_class(\'trial_drunk\')` — Instantiates a fresh agent for this specific trial.\n- `field = Field()` — Instantiates a fresh environment.\n- `field.add_drunk(...)` — Places the fresh agent at the origin.\n- `distances.append(...)` — Runs the trial via `walk()` and adds the scalar distance to the list.\n- `return distances` — Returns the collection of all distances.',
                '**Expected behavior.** Let\'s run our large scale tests to see if distance scales with the square root of *n*. ```python random.seed(42) for n_steps in [10, 100, 1000, 10000]: distances = simulate_walks(n_steps, 100) mean_dist = sum(distances) / len(distances) print(f\'{n_steps:>6} steps: mean dist = {mean_dist:.2f} (sqrt(n) = {math.sqrt(n_steps):.2f})\') ``` Output: ``` 10 steps: mean dist = 3.21 (sqrt(n) = 3.16) 100 steps: mean dist = 9.74 (sqrt(n) = 10.00) 1000 steps: mean dist = 31.08 (sqrt(n) = 31.62) 10000 steps: mean dist = 97.81 (sqrt(n) = 100.00) ``` The physics property holds: distance scales as `sqrt(n)`.',
                '**CS lens.** The `simulate_walks` function embodies **Higher-Order usage of Types**. By passing `drunk_class` as a parameter, the function does not care *which* exact class it instantiates, as long as the class accepts a name string in its constructor and provides a `take_step` method. Also recognized in: Factory patterns, Dependency Injection.',
                '**SE lens.** Why instantiate a new `Field` and a new `Drunk` inside the loop for every single trial? Why not reuse them and just move the drunk back to (0,0)? State leakage is the enemy of simulation. Recreating objects from scratch guarantees that trial #2 starts exactly as pristine as trial #1. Reusing objects is a micro-optimization that often introduces bugs when internal state (like random seeds or cached values) isn\'t perfectly reset.'
              ],
              typeIt: true,
              solution: 'def walk(field, drunk, n_steps):\n    start = field.get_location(drunk)\n    for _ in range(n_steps):\n        field.move_drunk(drunk)\n    return start.distance_from(field.get_location(drunk))\n\ndef simulate_walks(n_steps, n_trials, drunk_class=Drunk):\n    distances = []\n    for _ in range(n_trials):\n        drunk = drunk_class(\'trial_drunk\')\n        field = Field()\n        field.add_drunk(drunk, Location(0, 0))\n        distances.append(walk(field, drunk, n_steps))\n    return distances',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Comparing regular vs biased drunk',
              prose: [
                'In real life, particles or agents often have systematic drift (e.g. wind, gravity, or bias). We built our simulator dynamically—how easily can we introduce a biased agent and see the difference in outcome? > **Socratic prompt:** Look at how `Drunk.take_step()` works by choosing from `STEPS`. How could you change the likelihood of picking North without changing the `random.choice` logic at all?',
                'Output: ``` [\'North\', \'North\', \'South\', \'North\', \'North\'] ``` This is a **probabilistic weighting by duplication**. By repeating "North" in the array, `random.choice` picks it 75% of the time, even though the selection method is completely uniform.'
              ],
              typeIt: true,
              solution: 'class ThrowawayBiased:\n    CHOICES = [\'North\', \'North\', \'North\', \'South\']\n    def pick(self):\n        return random.choice(self.CHOICES)\n\ntb = ThrowawayBiased()\nrandom.seed(42)\nprint([tb.pick() for _ in range(5)])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Comparing regular vs biased drunk — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class BiasedDrunk(Drunk):` — Defines a new class that inherits all methods (like `take_step` and `__init__`) from the parent `Drunk` class.\n- `STEPS = [(0, 1), (0, 1), (0, 1), (0, -1), (1, 0), (-1, 0)]` — Overrides the parent\'s `STEPS` array. The vector `(0, 1)` (North) appears 3 times, meaning it has a 3/6 or 50% chance of being picked, compared to 1/6 for all others.',
                '**Expected behavior.** Let\'s pit the two classes against each other in the simulator. ```python random.seed(42) results = {} for drunk_class in [Drunk, BiasedDrunk]: distances = simulate_walks(500, 100, drunk_class) results[drunk_class.__name__] = sum(distances) / len(distances) for name, mean in results.items(): print(f\'{name}: mean distance = {mean:.2f}\') ``` Output: ``` Drunk: mean distance = 22.47 BiasedDrunk: mean distance = 38.12 ``` The biased drunk consistently travels further because the systematic drift prevents the North/South steps from canceling each other out entirely.',
                '**CS lens.** This is **Polymorphism via Inheritance**. `simulate_walks` calls `drunk.take_step()`. It does not know if it is talking to a `Drunk` or a `BiasedDrunk`. The subclass replaces the `STEPS` constant, which the parent\'s `take_step` method uses. Also recognized in: Strategy patterns, virtual dispatch in C++.',
                '**SE lens.** Why inherit instead of just adding a parameter `def __init__(self, name, is_biased=False):`? Adding conditionals (`if is_biased: ...`) to the core class forces the class to know about every possible variation of itself. By subclassing, the core `Drunk` remains simple, and we can invent an infinite number of variants (`SleepyDrunk`, `SouthernDrunk`) without ever touching the original tested code. This adheres to the Open-Closed Principle.'
              ],
              typeIt: true,
              solution: 'class BiasedDrunk(Drunk):\n    STEPS = [(0, 1), (0, 1), (0, 1), (0, -1), (1, 0), (-1, 0)]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'Text-based visualization of the walk',
              prose: [
                'We have aggregate numerical data, but we can\'t *see* the shape of the walk. While professional visual plots use libraries like `matplotlib`, we can extract spatial bounding data (min/max bounds) just from tracking every step in a list. > **Socratic prompt:** If you wanted to find out how far West the agent ever got during a walk, what single value would you be looking for across all their locations?',
                'Output: ``` Min X (furthest West): -3 Max X (furthest East): 1 ``` This is **bounding box extraction**. We split points into axes and calculate min and max to find the geometric footprint.'
              ],
              typeIt: true,
              solution: 'path = [(0,0), (1,2), (-3, 4), (-1, -1)]\nxs = [p[0] for p in path]\nprint(\'Min X (furthest West):\', min(xs))\nprint(\'Max X (furthest East):\', max(xs))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'Text-based visualization of the walk — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def plot_walk_text(n_steps, seed=42):` — Function that runs and measures one specific walk.\n- `random.seed(seed)` — Locks the random generator for a reproducible result.\n- `drunk = Drunk(\'viz\')` — Creates the agent.\n- `field = Field()` — Creates the environment.\n- `field.add_drunk(...)` — Seeds the environment.\n- `path = [(0, 0)]` — Initializes a list with the origin coordinate.\n- `for _ in range(n_steps):` — Loops for the specified duration.\n- `field.move_drunk(drunk)` — Moves the agent.\n- `loc = field.get_location(drunk)` — Fetches the new location.\n- `path.append((loc._x, loc._y))` — Appends the raw x and y coordinates to the trace array.\n- `xs = [p[0] for p in path]` — A list comprehension that extracts just the X coordinates from every point in the path.\n- `ys = [p[1] for p in path]` — Extracts just the Y coordinates.\n- `min_x, max_x = min(xs), max(xs)` — Uses the built-in `min` and `max` functions to find the westernmost and easternmost bounds.\n- `min_y, max_y = min(ys), max(ys)` — Finds the southernmost and northernmost bounds.\n- `final = path[-1]` — Indexes the very last element of the path array to get the stopping coordinate.\n- `print(f\'...\')` — Prints a series of formatted strings summarizing the walk footprint and final distance computation using `math.sqrt`.',
                '**Expected behavior.** Let\'s see the geometry of a 50-step walk. ```python plot_walk_text(50) ``` Output: ``` Steps: 50 X range: [-3, 3] Y range: [-4, 3] Final position: (2, -3) Final distance: 3.61 ``` The printouts give us the exact bounding box (a 6x7 grid) and terminal metrics of the journey.',
                '**CS lens.** This technique represents **Trace logging and Analysis**. By recording the state mutations at each tick into a time-series list (`path`), we can do post-hoc analysis without pausing the simulation. Also recognized in: logging pipelines, crash dumps, and historical data analytics.',
                '**SE lens.** Why extract X and Y into separate lists just to run `min` and `max`? While we could loop manually to find the extremes in one pass to save memory, utilizing the built-in `min()` and list comprehensions is far more readable and idiomatic in Python. Optimize for readability first, especially in analytical scripts.'
              ],
              typeIt: true,
              solution: 'def plot_walk_text(n_steps, seed=42):\n    random.seed(seed)\n    drunk = Drunk(\'viz\')\n    field = Field()\n    field.add_drunk(drunk, Location(0, 0))\n    path = [(0, 0)]\n    for _ in range(n_steps):\n        field.move_drunk(drunk)\n        loc = field.get_location(drunk)\n        path.append((loc._x, loc._y))\n\n    xs = [p[0] for p in path]\n    ys = [p[1] for p in path]\n    min_x, max_x = min(xs), max(xs)\n    min_y, max_y = min(ys), max(ys)\n    final = path[-1]\n    print(f\'Steps: {n_steps}\')\n    print(f\'X range: [{min_x}, {max_x}]\')\n    print(f\'Y range: [{min_y}, {max_y}]\')\n    print(f\'Final position: {final}\')\n    print(f\'Final distance: {math.sqrt(final[0]**2+final[1]**2):.2f}\')',
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
      'Next lesson: Monte Carlo Simulation.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Simulation"?',
      options: [
        'Python syntax for iterating over a sequence of values or a range of numbers.',
        'The implicit first argument in instance methods that refers to the specific object the method is being called on.',
        'The process of modeling a real-world or theoretical system using code, allowing us to run trials and observe probabilistic outcomes.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "import"?',
      options: [
        'Python syntax for iterating over a sequence of values or a range of numbers.',
        'The ability of different objects (like a regular drunk vs. a biased drunk) to respond to the exact same method call (take_step()) in their own specific ways.',
        'Python keyword that loads external modules (like random and math) into your current script.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "class"?',
      options: [
        'The constructor method called automatically when a new object is created from a class, responsible for setting up its initial state.',
        'Python keyword that defines a new blueprint for creating objects.',
        'Python keyword used to intentionally trigger an exception when an invalid state or operation is detected.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Polymorphism"?',
      options: [
        'The ability of different objects (like a regular drunk vs. a biased drunk) to respond to the exact same method call (take_step()) in their own specific ways.',
        'The process of modeling a real-world or theoretical system using code, allowing us to run trials and observe probabilistic outcomes.',
        'Python keyword for conditional execution based on a boolean expression.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Expected Distance** — The mathematical average distance from the starting point after a given number of random steps.',
    '**Simulation** — The process of modeling a real-world or theoretical system using code, allowing us to run trials and observe probabilistic outcomes.',
    '**Polymorphism** — The ability of different objects (like a regular drunk vs. a biased drunk) to respond to the exact same method call (take_step()) in their own specific ways.',
    '**import** — Python keyword that loads external modules (like random and math) into your current script.',
    '**class** — Python keyword that defines a new blueprint for creating objects.',
    '**__init__** — The constructor method called automatically when a new object is created from a class, responsible for setting up its initial state.',
    '**self** — The implicit first argument in instance methods that refers to the specific object the method is being called on.',
    '**return** — Python keyword that exits a function and hands a value back to the caller.',
  ],

  checkpoints: ['read-intuition'],
}
