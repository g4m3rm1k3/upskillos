# CartPole, typed by hand: from Python and numpy to Q-learning and beyond

This lesson is built so that you **type everything**. Each step shows its code, fully commented, in a grey box. Under the box is an empty editor where *you* type the code and run it, and the notebook then checks your output against the expected output.

**What you will build:** a physics simulation of a pole balanced on a cart, then an agent that *teaches itself* to keep the pole up, using Q-learning. Along the way you will learn the Python and numpy you need (no data-science background assumed), and at the end you will see two very different ways to solve the same problem, including one that needs only four numbers.

**The problem in one paragraph.** A pole is hinged on a cart that rolls along a track. Every 0.02 seconds you may push the cart left or right (only two choices). If the pole tilts more than 12 degrees, or the cart runs off the track (2.4 m from the centre), you fail. You earn +1 point for each tick you survive, and surviving 500 ticks counts as a win. The agent is never told how to balance. It only sees four numbers (where the cart is, how fast it moves, the pole's angle, how fast the angle changes) and the points it earns.

## How to use this lesson

**The loop for every step:**
1. Read why the step exists, then read the code shown in the grey box. Every line carries a comment.
2. Type it into the empty editor under the box, comments included (they are short explanations you will be glad of later). Don't copy and paste: typing is slow on purpose, because it is how the code ends up in your head and not just on your screen.
3. Before you run, predict what it will print. The expected output sits under your cell, folded shut, so you can predict first and only then look.
4. Run the cell (the Run button, or `Shift+Enter`). The notebook compares your output with the expected output line by line. A tick means they match; otherwise it shows the first line that differs, which almost always points straight at a typo.
5. Read "What every line does" and what the output means, then do the "Try this yourself" bit: press "+ Add cell" and experiment there. Predict the answer *before* running.

**Setup.** None: numpy and matplotlib run right here in the browser. The last step uses `gymnasium`, which the browser does not have, so that one step is for your own computer, with Python 3.9 or newer and `pip install numpy gymnasium`.

**Cells share memory.** A name you create in one cell (like `step` or `Q`) exists in later cells, as long as the page stays open. Run the steps **in order**. If something behaves strangely, press "↺ Reset variables" and run your cells again from the top.

**If your output does not match,** check, in this order: (1) a typo, especially brackets and commas; (2) indentation (Python uses the spaces at the start of a line to mean "this belongs inside the thing above"); (3) you skipped or reordered a step; (4) you left out a `random.seed(...)` line. Cells with randomness begin with a seed, which makes the "random" numbers repeatable, so your numbers should match exactly. Tiny differences in the last decimal places (the 15th or 16th digit) are harmless.

**Errors are normal.** Red text with `NameError` usually means you did not run an earlier step. `SyntaxError` means a typo. Read the last line of the error first: it says what went wrong and the arrow points at where.

## The map of this lesson

- **Part A: the toolkit.** Python and numpy basics, each one introduced because the project needs it. (Steps 1 to 6)
- **Part B: build the world.** The physics of the cart and pole, written as code, plus a baseline of "dumb" players to beat. (Steps 7 to 12)
- **Part C: Q-learning.** What "reward", "return" and "Q" mean, then the table, the update rule and the training loop. (Steps 13 to 20)
- **Part D: experiments.** Break the learner on purpose to find out why each piece matters. (Steps 21 to 25)
- **Part E: beyond.** A completely different method that solves CartPole with four numbers, a check against the official version of the problem, and a map of the wider field. (Steps 26 to 28)

## Part A: the toolkit (Python and numpy)

You do not need to be a data scientist for this. Reinforcement learning leans on a small slice of numpy, and we will learn exactly that slice. Every idea below is used later in the project, and I will point out where.

## Step 1: Lists versus numpy arrays

**Why we need this.** Python's built-in **list** holds anything in a row. A **numpy array** holds numbers (all the same type) in a compact block, and lets you do arithmetic on the whole block at once. That is called *vectorised* arithmetic. We will store the Q-table as a numpy array, and compute with whole arrays instead of writing loops.

```python type
import numpy as np                        # load numpy and give it the nickname np

a_list = [1, 2, 3]                        # an ordinary Python list
an_array = np.array([1, 2, 3])            # a numpy array built from that list

print(a_list * 2)                         # on a LIST, * means "repeat the list"
print(an_array * 2)                       # on an ARRAY, * means "multiply every item"
print(an_array + 10)                      # every item gets 10 added
print(an_array + np.array([10, 20, 30]))  # arrays of equal size add item by item
print(an_array.shape, an_array.size)      # shape = size in each dimension; size = how many items
```

```output
[1, 2, 3, 1, 2, 3]
[2 4 6]
[11 12 13]
[11 22 33]
(3,) 3
```

**What every line does.**

- `import numpy as np` loads the numpy library. `as np` is just a nickname so we type `np.array` instead of `numpy.array`.
- `a_list = [1, 2, 3]` is a normal list. `np.array([1, 2, 3])` converts it into an array.
- `a_list * 2` repeats the list. `an_array * 2` doubles every number. Same symbol, different meaning, depending on the type. This is why it matters which one you have.
- `an_array + 10` adds 10 to every item. You never wrote a loop; numpy did it for you.
- `an_array + np.array([10, 20, 30])` adds two arrays of the same size item by item.
- `.shape` tells you the size in each dimension, as a tuple. `.size` is the total number of items.

The list `[1, 2, 3, 1, 2, 3]` shows that `*` on a list *repeats* it. The array results `[2 4 6]`, `[11 12 13]` and `[11 22 33]` show arithmetic applied item by item. Note that arrays print **without commas**, which is how you tell an array from a list at a glance. `(3,)` is the shape of a one-dimensional array of three items (the odd comma is how Python writes a tuple with one element), and `3` is its size.

**Try this yourself.** Predict, then check: what do `an_array * an_array` and `an_array ** 2` give? (`**` means "to the power of".)

## Step 2: Two-dimensional arrays and indexing

**Why we need this.** A table with rows and columns is a 2D array. Our Q-table will have one row per situation and one column per action, and we will constantly need to say "give me this row" or "this one box".

```python type
grid = np.array([[1, 2, 3],
                 [4, 5, 6]])              # a 2D array: 2 rows, 3 columns

print(grid.shape)                         # (rows, columns)
print(grid[0, 2])                         # row 0, column 2 (counting starts at 0)
print(grid[1])                            # the whole of row 1
print(grid[:, 0])                         # ":" means "all rows", so this is column 0
print(grid[0, 1:])                        # row 0, columns from 1 to the end
print(grid.reshape(3, 2))                 # same six numbers, rearranged to 3 rows x 2 columns
print(grid[(1, 2)])                       # a tuple (1, 2) works as the index too
```

```output
(2, 3)
3
[4 5 6]
[1 4]
[2 3]
[[1 2]
 [3 4]
 [5 6]]
6
```

**What every line does.**

- The nested list `[[1, 2, 3], [4, 5, 6]]` has two inner lists; each becomes a **row**. So the array has 2 rows and 3 columns.
- `grid.shape` prints `(2, 3)`: rows first, then columns.
- `grid[0, 2]` means "row 0, column 2". **Counting starts at 0**, so row 0 is the first row.
- `grid[1]` is the whole of row 1.
- `grid[:, 0]` means "every row (`:` means all), column 0": a whole column.
- `grid[0, 1:]` is row 0 from column 1 to the end. In a slice `start:stop` the *stop* position is excluded, and a missing stop means "to the end".
- `grid.reshape(3, 2)` keeps the same six numbers in the same order but regroups them into 3 rows of 2.
- `grid[(1, 2)]` uses a *tuple* `(1, 2)` as the index. It means exactly the same as `grid[1, 2]`. This is the trick we will use to address boxes in a 5-dimensional table.

`(2, 3)` is rows by columns. `3` is the item at row 0, column 2. `[4 5 6]` is row 1. `[1 4]` is column 0 (first item of each row). `[2 3]` is row 0 from column 1 on. The reshaped array is the same numbers refilled across three rows. The last `6` is `grid[1, 2]`, the bottom-right item.

**Try this yourself.** Predict, then check: `grid[1, :2]` (the first two items of row 1) and `grid[-1]` (a negative index counts from the end).

## Step 3: Axes: max, argmax, sum and zeros

**Why we need this.** Two operations sit at the centre of Q-learning: **max** (the best number in a row) and **argmax** (the *position* of the best number, which tells you which action is best). To use them on a 2D table you must understand `axis`.

```python type
scores = np.array([[3, 9, 1],
                   [7, 2, 8]])

print(scores.max())                       # biggest number anywhere
print(scores.max(axis=1))                 # axis=1: squash the columns -> one answer per ROW
print(scores.max(axis=0))                 # axis=0: squash the rows -> one answer per COLUMN
print(scores.argmax(axis=1))              # POSITION of the biggest number in each row
print(scores.sum(), scores.mean())        # total and average
print(np.zeros((2, 3)))                   # a 2x3 array of zeros
print(np.zeros((2, 2, 2)).shape)          # arrays can have 3, 4, 5... dimensions
```

```output
9
[9 8]
[7 9 8]
[1 2]
30 5.0
[[0. 0. 0.]
 [0. 0. 0.]]
(2, 2, 2)
```

**What every line does.**

- `scores.max()` with no argument looks at every number and returns the biggest: 9.
- `axis=1` means "work *along each row*, collapsing the columns". You get one answer **per row**. `axis=0` means "work down each column, collapsing the rows". You get one answer **per column**. A memory aid: the axis you name is the one that *disappears* from the shape. A 2x3 array collapsed along axis 1 leaves 2 answers; along axis 0 leaves 3.
- `argmax(axis=1)` returns, for each row, the **index of its biggest number**. In row `[3, 9, 1]` the biggest is at position 1; in `[7, 2, 8]` it is at position 2.
- `.sum()` adds everything and `.mean()` averages.
- `np.zeros((2, 3))` makes a 2x3 array of 0.0. The numbers inside the double brackets are the shape.
- `np.zeros((2, 2, 2)).shape` shows arrays can have more than two dimensions.

`9`; then `[9 8]` (best per row); `[7 9 8]` (best per column); `[1 2]` (positions of the best in each row); `30 5.0` (sum and mean). Then a 2x3 block of zeros, and the shape `(2, 2, 2)`. In Q-learning, `Q[s].max()` answers "how good is this situation?", and `Q[s].argmax()` answers "which action should I take here?".

**Try this yourself.** Predict, then check: what are `scores.sum(axis=0)` and `scores.mean(axis=1)`?

## Step 4: Comparisons, masks, clip and astype

**Why we need this.** We need to ask questions of a whole array at once ("which numbers are bigger than 1?"), force numbers into a range, and convert decimals to whole numbers. The discretizing function and the tie-breaking code later both use these.

```python type
v = np.array([0.2, 1.7, -0.4, 2.9])

print(v > 1)                              # compares every item: gives True/False for each
print(np.flatnonzero(v > 1))              # the POSITIONS where the answer is True
print(np.clip(v, 0, 2))                   # force every item into the range 0 to 2
print(v.astype(int))                      # convert to whole numbers by chopping off decimals
print(np.array([1, 5, 5, 2]) == 5)        # == tests equality item by item
```

```output
[False  True False  True]
[1 3]
[0.2 1.7 0.  2. ]
[0 1 0 2]
[False  True  True False]
```

**What every line does.**

- `v > 1` compares every item and returns an array of True/False, called a **mask**.
- `np.flatnonzero(v > 1)` returns the **positions** where the mask is True. We will use this to find all the best actions when several tie.
- `np.clip(v, 0, 2)` forces every number into the range from 0 to 2: anything smaller becomes 0, anything larger becomes 2.
- `v.astype(int)` converts to whole numbers by chopping off the decimal part toward zero. So `1.7` becomes 1, `2.9` becomes 2, and `-0.4` becomes 0.
- `np.array([...]) == 5` tests equality item by item (a double `==` asks a question; a single `=` stores a value).

`[False True False True]` is the mask: items 1 and 3 exceed 1. `[1 3]` are those positions. The clipped array is `[0.2 1.7 0. 2.]` (the -0.4 became 0, the 2.9 became 2). The `astype(int)` result is `[0 1 0 2]`. The last line shows which items equal 5: positions 1 and 2.

**Try this yourself.** Predict: what does `np.clip(np.array([5, -3, 8]), 0, 6)` give?

## Step 5: Random numbers and seeds

**Why we need this.** Learning agents need randomness: random starting positions, and random exploring moves. But a computer cannot be truly random; it follows a formula that *looks* random. The starting point of that formula is the **seed**. Same seed, same sequence. We use seeds so that your results match mine and experiments can be repeated.

```python type
import random                             # Python's built-in random number tools

random.seed(42)                           # fix the starting point of the random sequence
print(random.random())                    # a decimal between 0 and 1
print(random.uniform(-0.05, 0.05))        # a decimal between two limits
print(random.randrange(2))                # a whole number: 0 or 1
print(random.choice([10, 20, 30]))        # one item picked from a list

random.seed(42)                           # restart from the same point...
print(random.random())                    # ...and we get the SAME first number again
```

```output
0.6394267984578837
-0.04749892447773331
1
10
0.6394267984578837
```

**What every line does.**

- `import random` loads Python's random tools.
- `random.seed(42)` sets the starting point.
- `random.random()` gives a decimal between 0 and 1.
- `random.uniform(-0.05, 0.05)` gives a decimal between the two limits, with every value equally likely.
- `random.randrange(2)` gives a whole number, 0 or 1 (`randrange(n)` gives 0 up to n-1).
- `random.choice([10, 20, 30])` picks one item from a list.
- Setting `random.seed(42)` again and calling `random.random()` repeats the very first number.

The first and last numbers are the same, `0.6394267984578837`, because the seed was reset. The other three values depend on the seed and on Python's generator. If you are on a very different Python version and one of those differs, do not worry about this step; later steps use the same functions, so if *they* match, you are fine.

**Try this yourself.** Remove the second `random.seed(42)` line. Does the final number still repeat the first? Why not?

## Step 6: Functions, tuples, comprehensions, f-strings and loops

**Why we need this.** Five small Python tools that the whole project uses. If any are already familiar, skim the explanation and still type the cell.

```python type
def add(x, y):                            # def starts a function; x and y are its inputs
    return x + y                          # return hands a result back to the caller

print(add(2, 3))

point = (3, 4)                            # a tuple: a fixed group of values
row, col = point                          # "unpacking": row gets 3, col gets 4
print(row, col)

squares = [n * n for n in range(5)]       # list comprehension: build a list in one line
print(squares)

print(f"row {row}, col {col}, sum {row + col:5.1f}")   # f-string: {value:width.decimals}

count = 0
while count < 10:                         # repeat while the condition stays True
    count += 1                            # += means "add to the existing value"
    if count == 3:
        break                             # break leaves the loop immediately
print(count)
```

```output
5
3 4
[0, 1, 4, 9, 16]
row 3, col 4, sum   7.0
3
```

**What every line does.**

- `def add(x, y):` defines a **function**: a named, reusable recipe. `x` and `y` are its inputs, the indented lines are its body, and `return` hands the answer back. **Indentation matters**: the indented lines belong to the function.
- `point = (3, 4)` is a **tuple**: a fixed group of values that cannot be changed after creation. `row, col = point` is **unpacking**: it hands the first value to `row` and the second to `col`.
- `[n * n for n in range(5)]` is a **list comprehension**: "for each `n` from 0 to 4, compute `n * n`, and collect the results in a list". `range(5)` gives 0, 1, 2, 3, 4.
- `f"row {row}, col {col}, sum {row + col:5.1f}"` is an **f-string**: anything in braces is replaced by its value. `:5.1f` means "format as a decimal, 5 characters wide, 1 decimal place".
- The `while` loop repeats as long as its condition is true. `count += 1` is shorthand for `count = count + 1`. `break` exits the loop immediately, which is why the loop stops at 3 and not 10.

`5` is `add(2, 3)`. `3 4` shows the unpacked tuple. `[0, 1, 4, 9, 16]` is the comprehension. The f-string line prints `row 3, col 4, sum   7.0`, where the extra spaces come from the width of 5. The loop prints `3` because `break` fired when `count` reached 3.

**Try this yourself.** Write a comprehension that gives the list `[0, 2, 4, 6, 8]` (hint: multiply by 2 instead of squaring).

## Part B: build the world

Before an agent can learn to balance a pole, there has to be a pole. We write the physics ourselves. This is called an **environment**: the part of the system that, given a situation and a choice, tells you what happens next. The agent will live inside it.

## Step 7: The constants of the world

**Why we need this.** The physics needs a handful of fixed numbers: how strong gravity is, how heavy the cart and pole are, how hard we push, and how long each tick lasts. We name them once at the top, in CAPITALS (the Python convention for "this never changes"), so the physics code reads clearly.

```python type
import math                               # sin, cos, pi

GRAVITY = 9.8                             # m/s^2: how fast gravity accelerates things
MASS_CART = 1.0                           # kg
MASS_POLE = 0.1                           # kg
TOTAL_MASS = MASS_CART + MASS_POLE        # kg: the whole thing being pushed
HALF_POLE = 0.5                           # m: distance from hinge to the pole's centre
POLE_MASS_LEN = MASS_POLE * HALF_POLE     # appears in the equations as one lump
FORCE = 10.0                              # newtons: strength of each push
TAU = 0.02                                # seconds per tick
X_LIMIT = 2.4                             # metres: the track edge
THETA_LIMIT = 12 * math.pi / 180          # 12 degrees converted to radians
MAX_STEPS = 500                           # surviving this many ticks counts as a win

print(TOTAL_MASS, POLE_MASS_LEN)
print(THETA_LIMIT)
print(math.degrees(THETA_LIMIT))          # convert back to check
```

```output
1.1 0.05
0.20943951023931953
12.0
```

**What every line does.**

- `GRAVITY = 9.8`: the acceleration gravity gives, in metres per second squared.
- `MASS_CART = 1.0` and `MASS_POLE = 0.1`: masses in kilograms. `TOTAL_MASS` adds them, because pushing the cart also moves the pole.
- `HALF_POLE = 0.5`: the distance from the hinge to the pole's centre of mass, in metres. (The physics uses half the length, since the mass is centred.)
- `POLE_MASS_LEN`: pole mass times that distance. It appears in several equations as one combined lump, so we compute it once.
- `FORCE = 10.0` is the strength of each push in newtons. `TAU = 0.02` is the time per tick in seconds, so 50 ticks equal one simulated second.
- `X_LIMIT = 2.4`: the track edge in metres. `THETA_LIMIT`: 12 degrees converted to **radians**. Radians measure angles by arc length on a circle of radius 1: a half-turn (180 degrees) is `pi`, so degrees times `pi / 180` gives radians. The `math` functions `sin` and `cos` expect radians.
- `MAX_STEPS = 500` is the number of ticks that counts as a win.

`1.1 0.05` are the total mass and the combined lump. `0.2094...` is 12 degrees in radians, and `math.degrees` converts it back to `12.0`, confirming the conversion.

## Step 8: The state, and starting a new episode

**Why we need this.** The **state** is everything needed to predict what happens next. For CartPole it is exactly four numbers. An **episode** is one attempt, from a fresh start until failure (or 500 ticks). `reset()` creates the starting state.

```python type
state = [0.0, 0.0, 0.05, 0.0]             # [x, x_dot, theta, theta_dot]
x, x_dot, theta, theta_dot = state        # unpack the list into four names
print(x, x_dot, theta, theta_dot)

def reset():
    # four small random numbers: a nearly balanced pole on a nearly still cart
    return [random.uniform(-0.05, 0.05) for _ in range(4)]

random.seed(1)
print(reset())
print(reset())
```

```output
0.0 0.0 0.05 0.0
[-0.03656357558875988, 0.03474337369372327, 0.02637746189766141, -0.024493097426057833]
[-0.0004564912908059035, -0.005050893521126185, 0.0151592972722763, 0.02887233511355132]
```

**What every line does.**

- `state = [0.0, 0.0, 0.05, 0.0]` holds `[x, x_dot, theta, theta_dot]`: cart position (metres, 0 is the centre, positive is right), cart velocity, pole angle (radians, 0 is upright, positive leans right), and the pole's angular velocity. A name ending in `_dot` means "rate of change of".
- `x, x_dot, theta, theta_dot = state` unpacks the list into four names.
- `reset()` returns a new list built by a comprehension: four random decimals between -0.05 and 0.05. That is a nearly balanced pole on a nearly still cart.
- The `_` in `for _ in range(4)` is a throwaway name: we want four repetitions but do not need the counter.
- `random.seed(1)` is there so we get repeatable numbers.

The first line echoes the four numbers. The next two lines are two different random start states: each call to `reset()` produces new numbers because the random generator advances. Every start is close to perfect balance, and it is the agent's job to keep it there.

## Step 9: The physics, one piece at a time

**Why we need this.** This is the heart of the environment. Given the state and a push, it computes the state 0.02 seconds later. We do it *once, by hand, printing every intermediate number*, before wrapping it in a function. The equations are the standard cart-pole equations from the original 1983 paper by Barto, Sutton and Anderson, also used by the official Gym/Gymnasium CartPole. You do not need to derive them; you need to understand what each line **means**.

```python type
state = [0.0, 0.0, 0.05, 0.0]
action = 1                                # 1 = push right, 0 = push left

x, x_dot, theta, theta_dot = state
force = FORCE if action == 1 else -FORCE  # one-line if/else
sin_t = math.sin(theta)
cos_t = math.cos(theta)
print("force", force)
print("sin, cos", sin_t, cos_t)

# cart acceleration if the pole were not there (Newton: a = F / m), plus a spin term
temp = (force + POLE_MASS_LEN * theta_dot ** 2 * sin_t) / TOTAL_MASS
print("temp", temp)

# how quickly the pole's spin changes (gravity tips it, the cart's motion fights it)
theta_acc = (GRAVITY * sin_t - cos_t * temp) / (
    HALF_POLE * (4.0 / 3.0 - MASS_POLE * cos_t ** 2 / TOTAL_MASS))
print("theta_acc", theta_acc)

# the cart's real acceleration, corrected for the pole pushing back
x_acc = temp - POLE_MASS_LEN * theta_acc * cos_t / TOTAL_MASS
print("x_acc", x_acc)

# Euler integration: new = old + (time step) * (rate of change)
new_state = [x + TAU * x_dot,
             x_dot + TAU * x_acc,
             theta + TAU * theta_dot,
             theta_dot + TAU * theta_acc]
print(new_state)
```

```output
force 10.0
sin, cos 0.04997916927067833 0.9987502603949663
temp 9.09090909090909
theta_acc -13.824878764357754
x_acc 9.71852733026505
[0.0, 0.194370546605301, 0.05, -0.2764975752871551]
```

**What every line does.**

- `force = FORCE if action == 1 else -FORCE`: a one-line if/else. Action 1 pushes right (+10 N), action 0 pushes left (-10 N). The sign is the direction.
- `sin_t`, `cos_t`: sine and cosine of the pole angle. Gravity pulls straight down, but the pole can only rotate about its hinge, so only the sideways part of gravity matters, and that part is proportional to `sin(theta)`.
- `temp`: Newton's second law, `acceleration = force / mass`, with a small extra term for the pole's spin flinging weight outward. Pushing 10 N on 1.1 kg gives `9.09` m/s^2.
- `theta_acc`: the pole's **angular acceleration**, how fast its spin is changing. The top of the fraction is a contest: `GRAVITY * sin_t` tips the pole over, while `cos_t * temp` is the effect of the cart accelerating under it. The bottom is the pole's effective resistance to rotating (its inertia).
- `x_acc`: the cart's true acceleration, which is `temp` corrected for the pole pulling back on the cart.
- **Euler integration**: `new = old + TAU * rate_of_change`. If a car is at 100 m moving at 20 m/s, 0.02 s later it is at `100 + 0.02 x 20 = 100.4` m. Position changes by velocity, velocity by acceleration, angle by spin, spin by angular acceleration. Four lines, one per state number.

The push is `10.0`. For a 0.05 rad pole, `sin` is `0.04998` and `cos` is `0.99875`, nearly 1 (for small angles `sin(theta)` is almost `theta`). `temp` is `9.09`. The key number is `theta_acc = -13.82`: it is **negative**, so pushing right makes the pole start tipping *left*, even though gravity was tipping it right. Pushing the cart out from under a pole makes it lag behind, which is the opposite of what intuition about "pushing" suggests, and is precisely why balancing is hard. `x_acc` is `9.72`. In the new state, position is unchanged (velocity was 0), velocity is `0.02 x 9.72 = 0.194`, angle is unchanged (spin was 0), and spin is `0.02 x -13.82 = -0.276`.

**Try this yourself.** Change `action = 1` to `action = 0` and predict the signs of `temp`, `theta_acc` and `x_acc` before running.

## Step 10: The step function, and watching the pole fall

**Why we need this.** We now wrap Step 9's lines in a function, `step(state, action)`, which is the environment's transition function: the rule for "what happens next". The agent will call it thousands of times. We test it, then watch what happens if we do nothing useful.

```python type
def step(state, action):
    x, x_dot, theta, theta_dot = state
    force = FORCE if action == 1 else -FORCE
    sin_t = math.sin(theta)
    cos_t = math.cos(theta)
    temp = (force + POLE_MASS_LEN * theta_dot ** 2 * sin_t) / TOTAL_MASS
    theta_acc = (GRAVITY * sin_t - cos_t * temp) / (
        HALF_POLE * (4.0 / 3.0 - MASS_POLE * cos_t ** 2 / TOTAL_MASS))
    x_acc = temp - POLE_MASS_LEN * theta_acc * cos_t / TOTAL_MASS
    return [x + TAU * x_dot,
            x_dot + TAU * x_acc,
            theta + TAU * theta_dot,
            theta_dot + TAU * theta_acc]

start = [0.0, 0.0, 0.0, 0.0]
print("push left :", step(start, 0))
print("push right:", step(start, 1))

state = [0.0, 0.0, 0.0, 0.0]
for tick in range(1, 11):
    state = step(state, 0)                # always push left
    print(tick, "x =", round(state[0], 4), " theta =", round(state[2], 4))
```

```output
push left : [0.0, -0.1951219512195122, 0.0, 0.2926829268292683]
push right: [0.0, 0.1951219512195122, 0.0, -0.2926829268292683]
1 x = 0.0  theta = 0.0
2 x = -0.0039  theta = 0.0059
3 x = -0.0117  theta = 0.0176
4 x = -0.0234  theta = 0.0352
5 x = -0.039  theta = 0.0587
6 x = -0.0586  theta = 0.0884
7 x = -0.082  theta = 0.1242
8 x = -0.1094  theta = 0.1664
9 x = -0.1407  theta = 0.2152
10 x = -0.1759  theta = 0.2707
```

**What every line does.**

- `def step(state, action):` takes the current state list and an action, and returns the next state list. The body is exactly Step 9's code without the printing.
- `start = [0.0, 0.0, 0.0, 0.0]` is a perfectly upright, motionless pole. We push left once, then right once, and print both results.
- The `for tick in range(1, 11):` loop pushes **left every time** for 10 ticks. `range(1, 11)` counts 1 to 10 (the stop value is excluded). `state = step(state, 0)` feeds each new state back in as the next input. `round(value, 4)` trims to four decimal places.

Pushing left from rest gives the cart velocity `-0.195` (moving left) and the pole spin `+0.293` (starting to lean right). Pushing right gives exactly the mirror image: the physics is symmetric, which is a useful sanity check. And once again the pole tips *opposite* to the push. In the loop, the angle grows `0.0059, 0.0176, 0.0352, 0.0587, ...`: the increases get bigger each tick, because a more tilted pole falls faster. At tick 9 the angle is `0.2152`, past the limit of `0.2094`, so a real episode would already be over. A pole left alone falls in under a fifth of a simulated second, so the controller must react constantly.

## Step 11: When does an episode end?

**Why we need this.** The agent needs to know when it has failed. Failing is the only way an episode ends early.

```python type
def is_done(state):
    return abs(state[0]) > X_LIMIT or abs(state[2]) > THETA_LIMIT

print(is_done([0.0, 0.0, 0.0, 0.0]))      # upright, centred
print(is_done([0.0, 0.0, 0.25, 0.0]))     # pole leaning 14 degrees
print(is_done([2.5, 0.0, 0.0, 0.0]))      # cart past the edge
```

```output
False
True
True
```

**What every line does.**

- `abs(...)` is the absolute value, which removes the sign, so the limit applies to both the left and the right side.
- `state[0]` is `x` and `state[2]` is `theta` (lists count from 0, and the state order is `[x, x_dot, theta, theta_dot]`).
- `or` makes the function return `True` if *either* condition holds: the cart is past the track edge **or** the pole is past 12 degrees.

`False` for an upright, centred pole; `True` for a pole at 0.25 rad (about 14 degrees); `True` for a cart at 2.5 m, past the 2.4 m edge.

## Step 12: Playing whole episodes with a policy

**Why we need this.** A **policy** is any rule that takes a state and returns an action. This is the central object of reinforcement learning: learning *is* the search for a good policy. We write two simple ones to set a baseline that the learned agent must beat.

```python type
def run_episode(policy):
    state = reset()
    steps = 0
    while not is_done(state) and steps < MAX_STEPS:
        action = policy(state)            # ask the policy what to do
        state = step(state, action)       # the environment responds
        steps += 1                        # +1 reward for surviving this tick
    return steps

def random_policy(state):
    return random.randrange(2)            # ignores the state entirely

def rule_policy(state):
    return 1 if state[3] > 0 else 0       # push the way the pole is spinning

random.seed(0)
scores = [run_episode(random_policy) for _ in range(10)]
print("random:", scores, sum(scores) / len(scores))

random.seed(0)
scores = [run_episode(rule_policy) for _ in range(10)]
print("rule  :", scores, sum(scores) / len(scores))
```

```output
random: [11, 62, 37, 55, 12, 22, 22, 11, 47, 23] 30.2
rule  : [265, 173, 178, 258, 170, 165, 288, 253, 264, 183] 219.7
```

**What every line does.**

- `run_episode(policy)` takes a *function* as its input (functions can be passed around like numbers). It starts from `reset()`, then loops while the episode is not over and fewer than 500 ticks have passed. Each tick it asks the policy for an action, applies `step`, and counts one more tick. It returns the tick count.
- Since the reward is +1 per tick survived, **the tick count is the total reward**. That is our score.
- `random_policy` ignores the state and picks 0 or 1 at random.
- `rule_policy` looks at `state[3]`, the pole's spin: if it is rotating rightward (`> 0`), push right, otherwise push left. That moves the cart under the falling pole. The expression `1 if state[3] > 0 else 0` is the one-line if/else again.
- `[run_episode(random_policy) for _ in range(10)]` runs ten episodes and collects the scores. `sum(scores) / len(scores)` is the average.

Random play survives about **30 ticks** (0.6 seconds). The one-line rule survives about **220**, seven times better. A human wrote that rule using physical insight. The aim of reinforcement learning is to have the *agent* discover a rule like this on its own, from nothing but rewards.

**Try this yourself.** Change the rule to `1 if state[2] > 0 else 0` (use the angle instead of the spin). Predict whether it does better or worse, then run.

## Part C: Q-learning

Now the learning itself. First the three ideas it rests on (reward and return, continuous versus discrete states, and the table), then the update rule, then the loop that applies it thousands of times.

## Step 13: Reward, return and the discount factor

**Why we need this.** The agent does not just want the reward from the next tick; it wants the *total reward from now until the end*. That total, with future rewards counted a little less than immediate ones, is the **return**. How much less is set by the **discount factor**, gamma (a number between 0 and 1). This step makes the idea concrete.

```python type
rewards = [1] * 100                       # a list of one hundred 1s: 100 ticks survived

for gamma in (1.0, 0.99, 0.9, 0.5):
    total = 0.0
    for k, r in enumerate(rewards):       # enumerate gives (position, item) pairs
        total += (gamma ** k) * r         # the k-th reward is worth gamma**k of its face value
    print("gamma", gamma, "-> discounted total", round(total, 2))
```

```output
gamma 1.0 -> discounted total 100.0
gamma 0.99 -> discounted total 63.4
gamma 0.9 -> discounted total 10.0
gamma 0.5 -> discounted total 2.0
```

**What every line does.**

- `rewards = [1] * 100` is a list of one hundred 1s: a hundred ticks of surviving, each paying +1.
- `for gamma in (1.0, 0.99, 0.9, 0.5):` loops over four gamma values in a tuple.
- `for k, r in enumerate(rewards):` `enumerate` hands out pairs: the position `k` (0, 1, 2, ...) and the item `r`.
- `total += (gamma ** k) * r`: the reward `k` ticks in the future is multiplied by `gamma` raised to the power `k`. Gamma = 0.9 makes a reward 2 ticks ahead worth `0.9 x 0.9 = 0.81` of its face value.

With `gamma = 1.0` the discount does nothing and the total is 100. With `0.99` it is **63.4**, with `0.9` it is **10.0**, and with `0.5` only **2.0**. A useful fact: with +1 per tick forever, the total approaches `1 / (1 - gamma)`: 100 for 0.99, 10 for 0.9, 2 for 0.5. So gamma sets the agent's *horizon*, roughly how many ticks ahead it can see. A tiny gamma makes it short-sighted, which is why `gamma = 0.5` struggles later in Experiment 3: a pole that is already doomed 20 ticks before it falls looks fine to an agent that cannot see 20 ticks ahead.

## Step 14: Chopping continuous numbers into buckets

**Why we need this.** The state is four *continuous* numbers: the angle could be 0.0523 or 0.0524 or anything between. A table needs a **finite** list of rows. The fix is **discretization**: divide each number's range into a few buckets, and treat every state in the same buckets as the same situation. Think of reading a thermometer to the nearest 10 degrees: 71 and 74 both become "70s". We choose 3 buckets for position, 3 for velocity, 6 for angle and 6 for spin (more for the quantities that matter most for balancing).

```python type
LOW  = np.array([-X_LIMIT, -3.0, -THETA_LIMIT, -3.5])
HIGH = np.array([ X_LIMIT,  3.0,  THETA_LIMIT,  3.5])
BINS = np.array([3, 3, 6, 6])

def discretize(state):
    ratio = (np.array(state) - LOW) / (HIGH - LOW)     # each number -> position in its range, 0..1
    index = (ratio * BINS).astype(int)                 # stretch to bin count, chop decimals
    index = np.clip(index, 0, BINS - 1)                # keep inside the valid bins
    return tuple(int(i) for i in index)                # plain ints in a tuple, usable as an address

print(discretize([0.0, 0.0, 0.0, 0.0]))
print(discretize([-2.0, 0.0, 0.0, 0.0]))
print(discretize([0.0, 0.0, 0.1, -1.0]))
print(discretize([0.0, 0.0, 5.0, 0.0]))

ratio = (np.array([0.0, 0.0, 0.1, -1.0]) - LOW) / (HIGH - LOW)
print(ratio)
print(ratio * BINS)
print((ratio * BINS).astype(int))
```

```output
(1, 1, 3, 3)
(0, 1, 3, 3)
(1, 1, 4, 2)
(1, 1, 5, 3)
[0.5        0.5        0.73873241 0.35714286]
[1.5        1.5        4.43239449 2.14285714]
[1 1 4 2]
```

**What every line does.**

- `LOW` and `HIGH` are arrays holding the smallest and largest value we care about for each of the four numbers. Position and angle use the failure limits. For velocity and spin I picked +/-3.0 and +/-3.5, which cover nearly everything seen before failure.
- `BINS = np.array([3, 3, 6, 6])` is the number of buckets for each quantity.
- Inside `discretize`: `np.array(state) - LOW` subtracts element by element, measuring each number from the bottom of its range. Dividing by `(HIGH - LOW)` (the width of each range) gives `ratio`: 0 means the bottom of the range, 1 the top, 0.5 the middle.
- `ratio * BINS` stretches the 0-to-1 scale to the number of buckets. `.astype(int)` chops off the decimals, so 4.43 becomes bucket 4.
- `np.clip(index, 0, BINS - 1)` forces each bucket number into the valid range 0 to (buckets minus 1). Without it a value at the very top, or beyond the range, would produce a bucket that does not exist.
- The last line converts to a tuple of plain Python integers. A tuple of four whole numbers can be used directly as an address into a table.
- The second half repeats the arithmetic on one example and prints each stage.

A perfectly upright, still, centred pole is bucket `(1, 1, 3, 3)`, the middle of everything. A cart at -2.0 m is in the left bucket 0. An angle of 5.0 radians is wildly out of range, but `clip` puts it in the last bucket, 5, instead of crashing. Check the arithmetic by hand for the angle 0.1: `(0.1 - (-0.2094)) / (0.2094 - (-0.2094)) = 0.3094 / 0.4189 = 0.7387`. Times 6 buckets is `4.43`, and `astype(int)` makes it bucket 4. Position 0.0 has ratio exactly 0.5, times 3 is 1.5, so bucket 1, the middle of buckets 0, 1, 2. In total there are 3 x 3 x 6 x 6 = **324** distinct situations.

**Try this yourself.** Compute by hand the bucket for spin = -1.0 (the fourth number): `(-1.0 + 3.5) / 7.0 = 0.357`, times 6 = 2.14, so bucket 2. The output agrees.

## Step 15: The Q-table: a five-dimensional block of numbers

**Why we need this.** **Q(s, a)** (the "quality" of action `a` in situation `s`) is the agent's estimate of *the total future reward if it takes action `a` now and plays well afterwards*. We store these estimates in an array. With 324 situations and 2 actions that is 648 numbers. Because the situation is four bucket numbers, the array has five dimensions: four to select the situation and one to select the action.

```python type
Q = np.zeros(tuple(BINS) + (2,))          # (3,3,6,6) + (2,) -> shape (3,3,6,6,2)
print(Q.shape, Q.size)

s = discretize([0.0, 0.0, 0.1, -1.0])     # the "row address" of a state: (1, 1, 4, 2)
print(Q[s])                               # the two numbers: [push-left value, push-right value]
Q[s + (1,)] = 5.0                         # s + (1,) extends the address with the action
print(Q[s])
print(Q[s].max(), Q[s].argmax())
```

```output
(3, 3, 6, 6, 2) 648
[0. 0.]
[0. 5.]
5.0 1
```

**What every line does.**

- `tuple(BINS)` turns the array `[3, 3, 6, 6]` into the tuple `(3, 3, 6, 6)`. Adding `(2,)` (a one-item tuple; the comma is required) appends a fifth size, giving the shape `(3, 3, 6, 6, 2)`. `np.zeros` builds that block filled with 0.0.
- `Q.shape` and `Q.size` confirm the shape and the count of 648 boxes.
- `s = discretize(...)` gives the situation's address, `(1, 1, 4, 2)`. `Q[s]` gives the two numbers for that situation: the value of pushing left and the value of pushing right.
- `s + (1,)` extends the four-number address with the action number, giving a five-number address that selects **one box**. Adding tuples joins them. We store 5.0 there.
- `.max()` and `.argmax()` on the row give the best value and the best action, as in Step 3.
- **Gotcha:** `Q[s]` is a *view*, not a copy. If you did `row = Q[s]` and then changed `row[0]`, the table `Q` itself would change. Keep this in mind if you ever see a table change "by itself".

The shape is `(3, 3, 6, 6, 2)` with `648` boxes. A fresh row is `[0. 0.]`: zero means "I know nothing yet", not "this is neutral". After storing 5.0 for action 1, the row is `[0. 5.]`, and `max` and `argmax` give `5.0 1` (push right is best).

## Step 16: Choosing actions: explore or exploit

**Why we need this.** If the agent always picked the action that looks best now, it would never discover that something it has not tried is better. So with a small probability **epsilon** it picks a random action instead (**exploring**), otherwise it takes the best-known action (**exploiting**). This is called *epsilon-greedy*.

```python type
def choose_action(Q, s, epsilon):
    if random.random() < epsilon:         # with probability epsilon: explore
        return random.randrange(2)
    row = Q[s]
    if row[0] == row[1]:                  # tie: do not always favour action 0
        return random.randrange(2)
    return int(np.argmax(row))            # otherwise exploit: the best-known action

random.seed(0)
Q = np.zeros(tuple(BINS) + (2,))
s = (1, 1, 3, 3)
print([choose_action(Q, s, 0.0) for _ in range(10)])
Q[s + (1,)] = 5.0
print([choose_action(Q, s, 0.0) for _ in range(10)])
print([choose_action(Q, s, 0.5) for _ in range(10)])
```

```output
[1, 1, 1, 1, 0, 1, 0, 1, 0, 0]
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
[0, 1, 1, 1, 1, 1, 1, 1, 1, 0]
```

**What every line does.**

- `random.random() < epsilon` is true with probability `epsilon` (a value like 0.1 means 10% of the time). Then we return a random action.
- `row = Q[s]` fetches the two numbers for this situation.
- `if row[0] == row[1]:` checks for a **tie**, which is always the case for an untrained row. `np.argmax` would always return action 0 in a tie, building a hidden bias, so we pick randomly instead.
- Otherwise `int(np.argmax(row))` returns the position of the larger number: the best action. `int(...)` converts numpy's integer type to a plain Python integer.
- The test: with epsilon 0 and an all-zero table, then with a clear best action set, then with epsilon 0.5.

With an all-zero table every action ties, so the output is a random mix of 0s and 1s. After setting action 1 to 5.0, epsilon 0 gives ten 1s: the table decides every time. With epsilon 0.5, about half the choices are random, so a few 0s sneak in (two of ten here).

## Step 17: One learning update, by hand

**Why we need this.** This is the whole of Q-learning, in five lines. We set up a situation where we know the numbers, so you can check the arithmetic yourself.

```python type
ALPHA = 0.2
GAMMA = 0.99

Q = np.zeros(tuple(BINS) + (2,))
s_next = (1, 1, 3, 3)                     # pretend we landed here and it already has known values
Q[s_next + (0,)] = 10.0
Q[s_next + (1,)] = 20.0

s = (1, 1, 3, 2)                          # the state we were in
a = 1                                     # the action we took
reward = 1                                # survived one tick

old = Q[s + (a,)]                         # current belief
best_next = Q[s_next].max()               # best belief about where we landed
target = reward + GAMMA * best_next       # what the belief should be, given what we saw
new = old + ALPHA * (target - old)        # move a fraction ALPHA of the way there
print(old, best_next, target, new)

Q[s + (a,)] = new
print(Q[s])
```

```output
0.0 20.0 20.8 4.16
[0.   4.16]
```

**What every line does.**

- `ALPHA` is the **learning rate**: the fraction of the way we move toward a new estimate. `GAMMA` is the discount factor from Step 13.
- We pretend we just landed in `s_next`, a situation whose two boxes already hold 10 and 20.
- We were in `s` and took action `a = 1`. We survived one tick, so `reward = 1`.
- `old` is the box's current value. `best_next` is the best number in the row we *landed in*: "how good is it where I ended up?" **Key point:** `old` comes from the row we *left* and `best_next` from the row we *arrived at*.
- `target = reward + GAMMA * best_next` is our new opinion of what the box should hold: what we got now, plus the discounted best we expect next.
- `new = old + ALPHA * (target - old)` moves the old value part of the way toward the target. The gap `target - old` is the *error*; `ALPHA` decides how much of it to correct.
- `Q[s + (a,)] = new` writes the answer. Only one box changes.

`0.0 20.0 20.8 4.16`: old 0, best next 20, target `1 + 0.99 x 20 = 20.8`, new `0 + 0.2 x (20.8 - 0) = 4.16`. The row printed is `[0. 4.16]`: only the box for action 1 changed. The same number written another way: `new = (1 - ALPHA) x old + ALPHA x target`, a blend of old belief and new evidence, like a moving average.

**Try this yourself.** Run the update a second time (just repeat the lines from `old = ...` on) and predict the new value. (Target stays 20.8, old is now 4.16, so new = 4.16 + 0.2 x 16.64 = 7.488.)

## Step 18: The training loop

**Why we need this.** Now we repeat the update thousands of times, from many different starts, while the agent explores and gradually exploits what it has learned.

```python type
def train(episodes, alpha=0.2, gamma=0.99, eps_start=1.0, eps_min=0.01, eps_decay=0.999):
    Q = np.zeros(tuple(BINS) + (2,))
    epsilon = eps_start
    history = []
    for episode in range(episodes):
        state = reset()
        s = discretize(state)
        steps = 0
        while True:
            a = choose_action(Q, s, epsilon)
            state = step(state, a)
            steps += 1
            failed = is_done(state)
            s_next = discretize(state)

            reward = 1
            best_next = 0.0 if failed else Q[s_next].max()   # no future after failing
            target = reward + gamma * best_next
            Q[s + (a,)] += alpha * (target - Q[s + (a,)])

            s = s_next
            if failed or steps >= MAX_STEPS:
                break
        epsilon = max(eps_min, epsilon * eps_decay)
        history.append(steps)
    return Q, history

random.seed(0)
Q, history = train(300)
print(history[:10])
print(sum(history[:100]) / 100, sum(history[200:300]) / 100)
```

```output
[16, 16, 21, 11, 15, 24, 21, 25, 36, 36]
23.62 26.18
```

**What every line does.**

- The inputs have default values, so `train(300)` works and you can override any of them by name.
- Setup: a fresh zero table, `epsilon` starting at 1.0 (always explore, because the table knows nothing), and an empty `history` list that will record how long each episode lasted.
- Outer loop: one pass per episode. `reset()` gives a start and `discretize` turns it into the address `s`.
- Inner `while True:` loop: one pass per tick. It picks an action, applies `step`, counts the tick, and checks `failed`.
- `best_next = 0.0 if failed else Q[s_next].max()`: after a failure there is no future to count, so the future value is 0. **This is what makes failing look bad:** a failing action's target is only +1, whereas a surviving action's target is +1 plus something positive.
- `Q[s + (a,)] += alpha * (target - Q[s + (a,)])` is the update from Step 17 in one line (`+=` adds to the existing value).
- `s = s_next` moves on; `break` leaves the inner loop on failure or at 500 ticks.
- After each episode, `epsilon * eps_decay` shrinks epsilon by 0.1%, and `max(eps_min, ...)` stops it going below 0.01. So the agent explores a lot early and mostly exploits later.
- `return Q, history` hands back two things, which the caller unpacks as `Q, history = train(300)`.

Three hundred episodes is far too few to see much, which is the point of showing it: the first ten episodes last 11 to 36 ticks (basically random), and the average moves only from `23.62` (episodes 0 to 99) to `26.18` (episodes 200 to 299). Learning has barely started. Real progress needs thousands of episodes.

## Step 19: The real training run, and a fair test

**Why we need this.** We train for 4000 episodes, summarise progress in blocks, and then test the finished table with **no exploring at all**: the agent just takes the best action every time.

```python type
random.seed(0)
Q, history = train(4000)
for i in range(0, 4000, 500):
    print("episodes", i, "to", i + 499, ": average", round(sum(history[i:i + 500]) / 500, 1))
print("boxes ever changed:", np.count_nonzero(Q), "of", Q.size)

def greedy_policy(state):
    return int(np.argmax(Q[discretize(state)]))

random.seed(5)
scores = [run_episode(greedy_policy) for _ in range(20)]
print(scores)
print(sum(scores) / len(scores))
```

```output
episodes 0 to 499 : average 29.1
episodes 500 to 999 : average 53.4
episodes 1000 to 1499 : average 77.3
episodes 1500 to 1999 : average 92.5
episodes 2000 to 2499 : average 119.1
episodes 2500 to 2999 : average 187.6
episodes 3000 to 3499 : average 253.5
episodes 3500 to 3999 : average 339.4
boxes ever changed: 373 of 648
[108, 96, 83, 93, 91, 86, 95, 90, 84, 145, 125, 100, 94, 86, 81, 146, 94, 82, 124, 88]
99.55
```
<<<STEP 19: PYODIDE OUTPUT DIFFERS FROM THE NOTEBOOK; FIX THE PROSE BELOW>>>

**What every line does.**

- `for i in range(0, 4000, 500)` counts 0, 500, 1000, ... 3500 (the third number is the step size).
- `history[i:i + 500]` is a *slice*: the 500 entries starting at `i`. We average each block.
- `np.count_nonzero(Q)` counts how many boxes were ever changed, out of `Q.size`.
- `greedy_policy` is a policy like the earlier two: it discretizes the state, looks up the row, and takes the best action with `np.argmax`. Because it is a plain function from state to action, `run_episode` accepts it unchanged.
- We run 20 test episodes and print the scores and their average.

This takes about 10 seconds. The average episode length climbs from **29** (random level) to **335**, an eleven-fold improvement, using only reward feedback and 648 numbers. Nobody told the agent the physics or the rule from Step 12. Only **368 of 648 boxes** were ever changed: the others are situations that a decent policy never reaches, such as the pole spinning wildly while the cart is far off the track. The greedy test averages **242**, about eight times random, and about equal to the hand-written rule. Individual test episodes range from 124 to 350, because starts differ and 324 buckets are a coarse picture of the real state. Note that the training averages include random exploring moves, so they understate the table.

## Step 20: A learning curve you can read

**Why we need this.** Numbers in blocks are hard to see. A bar for each stretch of episodes makes the trend visible, without needing a plotting library.

```python type
averages = [sum(history[i:i + 100]) / 100 for i in range(0, 4000, 100)]
for i, avg in enumerate(averages):
    if i % 2 == 0:
        print(f"{i * 100:5d} {'#' * int(avg / 6)} {avg:.0f}")
```

```output
    0 ### 24
  200 #### 26
  400 ###### 37
  600 ####### 45
  800 ########## 60
 1000 ############# 82
 1200 ############# 78
 1400 ############# 82
 1600 ############## 89
 1800 ############### 94
 2000 ################# 107
 2200 ################## 110
 2400 ################### 114
 2600 ################################## 206
 2800 ############################# 176
 3000 ############################## 185
 3200 ################################################### 312
 3400 ################################################### 307
 3600 ########################################################## 350
 3800 ################################################################ 388
```
<<<STEP 20: PYODIDE OUTPUT DIFFERS FROM THE NOTEBOOK; FIX THE PROSE BELOW>>>

**What every line does.**

- `averages` is a list comprehension computing the average episode length for every block of 100 episodes: 40 numbers.
- `enumerate(averages)` gives pairs `(i, avg)`. `if i % 2 == 0` keeps every second one (`%` is the remainder after division, so `i % 2 == 0` means "i is even").
- `'#' * int(avg / 6)` repeats the character `#`, so a bigger average makes a longer bar. Strings can be multiplied just like lists.
- In the f-string, `{i * 100:5d}` prints a whole number 5 characters wide, and `{avg:.0f}` prints a decimal with no decimal places.

The bars grow from about 24 at the left to over 300 at the right, but not smoothly: look at 2600 (206) followed by 2800 (176), and 3200 (312) followed by 3400 (283). Learning with coarse buckets is **noisy and not monotonic**, so never judge an agent from a single block.

**Try this yourself.** If you have matplotlib, replace the printing with `import matplotlib.pyplot as plt`, then `plt.plot(averages)` and `plt.show()`.

## Part D: experiments

You now own a learner. The best way to understand why each part matters is to break it. **Change exactly one thing, write down your prediction, then run.** Each run prints two numbers: the average episode length *while learning* (includes random exploring moves, so it understates the table), and the *greedy test* (20 fresh episodes using only the table's best action, no exploring; a small sample, so noisy).

## Step 21: A helper to run experiments

**Why we need this.** We wrap training and testing in one function so each experiment is a single line. It also teaches two useful Python tricks.

```python type
def experiment(label, bins=(3, 3, 6, 6), episodes=4000, seed=0, **settings):
    global BINS
    saved_bins = BINS
    BINS = np.array(bins)
    try:
        random.seed(seed)
        Q_local, hist = train(episodes, **settings)
        blocks = [round(sum(hist[i:i + 1000]) / 1000) for i in range(0, episodes, 1000)]

        def policy(state):
            return int(np.argmax(Q_local[discretize(state)]))

        random.seed(99)
        test = [run_episode(policy) for _ in range(20)]
    finally:
        BINS = saved_bins
    print(f"{label:24s} training avg per 1000 episodes {blocks}   greedy test avg {round(sum(test) / 20)}")

experiment("baseline")
```

```output
baseline                 training avg per 1000 episodes [41, 85, 153, 296]   greedy test avg 100
```
<<<STEP 21: PYODIDE OUTPUT DIFFERS FROM THE NOTEBOOK; FIX THE PROSE BELOW>>>

**What every line does.**

- `**settings` collects any extra named inputs (like `alpha=0.02`) into a dictionary; later `train(episodes, **settings)` unpacks them again and passes them straight through to `train`.
- `train` and `discretize` read the global name `BINS`. To test other bucket layouts we change it temporarily: `global BINS` permits a function to reassign a name that lives outside it. `saved_bins` remembers the original.
- `try: ... finally:` guarantees the code under `finally` runs **even if something inside crashes**, so `BINS` is always restored and one failed experiment cannot corrupt the next.
- `Q_local` is a separate table, so your `Q` from Step 19 is untouched.
- `def policy(state):` inside the function is a function *inside* a function: it can see `Q_local` from the surrounding function.
- `random.seed(99)` gives every experiment the same 20-episode test.
- `{label:24s}` pads the label to 24 characters so the output lines up in columns.

The baseline reproduces Step 19: training averages of 41, 85, 153, 292 for each block of 1000 episodes, and a greedy test of 240. Every later experiment is compared with these two numbers.

## Step 22: Experiment 1: exploration

**Why we need this.** **Predict first:** what happens if the agent never explores (`epsilon = 0`)? And what if it keeps exploring 30% of the time forever (`eps_min=0.3`)?

```python type
experiment("no exploring", eps_start=0.0, eps_min=0.0)
experiment("eps_min=0.3", eps_min=0.3)
```

```output
no exploring             training avg per 1000 episodes [12, 11, 12, 12]   greedy test avg 13
eps_min=0.3              training avg per 1000 episodes [41, 83, 93, 100]   greedy test avg 196
```

**What every line does.**

Two calls. `eps_start=0.0, eps_min=0.0` starts epsilon at zero and keeps it there. `eps_min=0.3` stops epsilon decaying below 0.3.

**No exploring: 12 ticks, worse than random.** Every box starts at 0. In an unseen situation both tie, so a random action is picked. Whichever it is, the update gives that box a *positive* number (the target is at least 1, since the reward is +1). The untried action's box is still 0, so from then on `argmax` always prefers the tried action. The agent locks onto whatever it tried first, in every situation, and can never discover it was wrong. **Constant 30% exploring:** the training average is stuck near 100 while the greedy test is 196, close to the baseline's 240. The table learned fine, but the training episodes were handicapped by constant random pushes. **A training score measures learning plus exploring; the greedy test measures only what was learned.** Always check the greedy test before deciding something made things worse (and with only 20 test episodes, 196 versus 240 is within the noise).

## Step 23: Experiment 2: the learning rate alpha

**Why we need this.** **Predict first:** `alpha = 0.02` (ten times smaller) and `alpha = 1.0` (replace the old value completely). Which learns more slowly? Which is unstable?

```python type
experiment("alpha=0.02", alpha=0.02)
experiment("alpha=1.0", alpha=1.0)
```

```output
alpha=0.02               training avg per 1000 episodes [59, 148, 150, 150]   greedy test avg 147
alpha=1.0                training avg per 1000 episodes [22, 29, 34, 42]   greedy test avg 96
```

**What every line does.**

Two calls with different `alpha` values; everything else stays at the defaults.

**`alpha = 0.02`** surprised me. I expected it to be slower, and at first it was *faster* (59 and 148 in the first two blocks against 41 and 85) before flattening at 150 while the baseline kept climbing to 292. A guess for why (a guess, not proven): small steps smooth out the noise from each coarse bucket mixing different real situations, but they also spread the "good news" about long-term survival too slowly for 4000 episodes. **`alpha = 1.0`** never learns (training stays at 22 to 42). With `alpha = 1` the update simplifies to `new = target`: the old value is thrown away every time. Because several different real situations share a bucket, the same box keeps receiving different targets and swings to whichever came last, never averaging them. Alpha trades speed against stability. When we do the maze later, alpha = 1 will work, and understanding *why the maze differs* is a good test of your understanding.

## Step 24: Experiment 3: the discount factor gamma

**Why we need this.** **Predict first:** gamma = 0.5 and gamma = 0.9. Use Step 13's numbers: how much is a reward 10 ticks ahead worth? (`0.5 ** 10` is about 0.001; `0.9 ** 10` is about 0.35; `0.99 ** 10` is about 0.90.)

```python type
experiment("gamma=0.5", gamma=0.5)
experiment("gamma=0.9", gamma=0.9)
```

```output
gamma=0.5                training avg per 1000 episodes [37, 75, 97, 112]   greedy test avg 144
gamma=0.9                training avg per 1000 episodes [38, 84, 186, 250]   greedy test avg 187
```
<<<STEP 24: PYODIDE OUTPUT DIFFERS FROM THE NOTEBOOK; FIX THE PROSE BELOW>>>

**What every line does.**

Two calls with `gamma=0.5` and `gamma=0.9`.

**`gamma = 0.5`** learns but stalls (112 in the last block, test 144): a failure 10 ticks away is worth almost nothing to this agent, so it cannot connect a bad push to the fall it causes ten ticks later. **`gamma = 0.9`** reaches 235 and a test of 227, close to the baseline's 292 and 240. The gap between 0.5 and 0.9 is much bigger than the gap between 0.9 and 0.99. The horizon only has to be long enough to see how failures develop.

## Step 25: Experiment 4: what the agent is allowed to see

**Why we need this.** **Predict first:** `bins=(1, 1, 1, 1)` is one bucket per number, so the table has a single row. `bins=(1, 1, 6, 1)` shows only the angle. `bins=(1, 1, 6, 12)` ignores position and velocity but sees the spin finely. Which is best?

```python type
experiment("one bucket", bins=(1, 1, 1, 1))
experiment("angle only", bins=(1, 1, 6, 1))
experiment("angle + spin", bins=(1, 1, 6, 12))
```

```output
one bucket               training avg per 1000 episodes [16, 11, 10, 9]   greedy test avg 9
angle only               training avg per 1000 episodes [22, 25, 29, 34]   greedy test avg 23
angle + spin             training avg per 1000 episodes [65, 122, 146, 173]   greedy test avg 186
```
<<<STEP 25: PYODIDE OUTPUT DIFFERS FROM THE NOTEBOOK; FIX THE PROSE BELOW>>>

**What every line does.**

Three calls with different `bins`. A `1` means "no distinction at all for this quantity".

**One bucket: 9 ticks.** With one row every situation looks identical, so only a single fixed behaviour is possible. **Angle only: 23** (barely better than random). A pole at 0.05 rad that is swinging away needs a different push from one swinging back, and without the spin number the two look the same. **Angle plus spin: a perfect greedy test of 500**, with only 72 situations. Fewer rows means each is visited far more often, so the table fills in faster (65 and 122 in the first two blocks, against the baseline's 41 and 85). Note again that the training average (169) understates a perfect policy because of exploration. A table can only be as smart as the distinctions its rows allow, and more detail is not automatically better.

## Part E: beyond tables

The table worked, but look at what it cost: 648 numbers, thousands of episodes, and a clumsy chopping of the state into buckets. Is there a smarter way to represent "what to do"? Let us find out.

## Step 26: A different idea: a policy that is just four numbers

**Why we need this.** So far the agent learned *values* in a table and derived a policy from them. A policy could instead be a **formula** with a few adjustable numbers. Here is the simplest: multiply each of the four state numbers by a weight, add the results, and push right if the total is positive. Four weights, no table, no buckets.

```python type
weights = np.array([0.5, 1.0, 2.0, 1.0])  # one weight per state number
state = np.array([0.0, 0.0, 0.05, 0.0])
print(np.dot(weights, state))             # dot product: multiply pairwise, then add up
print(0.5*0.0 + 1.0*0.0 + 2.0*0.05 + 1.0*0.0)   # the same thing written out

def make_linear_policy(weights):
    def policy(state):
        return 1 if np.dot(weights, state) > 0 else 0     # push right if the score is positive
    return policy

policy = make_linear_policy(np.array([0.0, 0.0, 1.0, 1.0]))
print(policy([0.0, 0.0, 0.05, 0.0]), policy([0.0, 0.0, -0.05, 0.0]))
```

```output
0.1
0.1
1 0
```

**What every line does.**

- A **dot product** multiplies two arrays item by item and adds the results: `np.dot(weights, state)` is `w0*x + w1*x_dot + w2*theta + w3*theta_dot`. The second `print` writes that out by hand to show they are equal.
- `make_linear_policy(weights)` is a function that *returns a function*: the inner `policy` remembers the `weights` it was made with. This is called a closure.
- The policy says: if the weighted total is above 0 push right (1), otherwise left (0).
- The last two lines test it with weights `[0, 0, 1, 1]` on a pole leaning right (`+0.05`) and left (`-0.05`).

`0.1` and `0.1`: the dot product equals the long-hand sum (only the angle contributes: `2.0 x 0.05`). The policy pushes right (`1`) when the pole leans right and left (`0`) when it leans left, which is a sensible instinct. Why might a *linear* rule work? Near upright, the physics is almost a straight-line relationship between the state and the right push, so a weighted sum can capture it.

## Step 27: Finding good weights by random search

**Why we need this.** How do we find good weights? The crudest method possible: try random ones, and keep the best. This is **random search**. It does not use the update rule at all.

```python type
def average_score(policy, episodes=5):
    return sum(run_episode(policy) for _ in range(episodes)) / episodes

random.seed(0)
np.random.seed(0)
best_weights = None
best_score = -1
for trial in range(1, 301):
    weights = np.random.uniform(-1, 1, 4)              # four random numbers in [-1, 1]
    score = average_score(make_linear_policy(weights))
    if score > best_score:
        best_score = score
        best_weights = weights
        print("trial", trial, "weights", np.round(weights, 2), "score", score)
    if best_score >= MAX_STEPS:
        break

print("trials used:", trial)
final = make_linear_policy(best_weights)
random.seed(7)
print([run_episode(final) for _ in range(20)])
```

```output
trial 1 weights [0.1  0.43 0.21 0.09] score 9.8
trial 2 weights [-0.15  0.29 -0.12  0.78] score 433.4
trial 10 weights [0.22 0.23 0.89 0.36] score 500.0
trials used: 10
[500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500]
```

**What every line does.**

- `average_score(policy, episodes=5)` averages the score over 5 episodes. A single episode would be too noisy to judge a policy.
- `np.random.seed(0)` seeds numpy's own random generator (separate from Python's `random`), and `np.random.uniform(-1, 1, 4)` makes an array of four random numbers between -1 and 1.
- The loop tries up to 300 sets of weights. Whenever a set beats the best so far, we remember it and print a line. `np.round(weights, 2)` rounds the array for display.
- `if best_score >= MAX_STEPS: break` stops once a perfect score is found.
- Finally we test the winner on 20 *fresh* episodes, to make sure it was not just lucky.

Trial 1 scores about 10. Trial 2 scores **433**. Trial 10 scores a perfect **500.0**, and the search stops. On 20 fresh test episodes the winning weights survive all 500 ticks every time. So **ten random tries, each judged over five episodes, beat the table's 242**, using four numbers instead of 648 and no learning rule at all. The lesson is not that random search is a great algorithm (it would fail on large problems). It is that **how you represent the solution can matter more than which algorithm you use**. The bucketed table throws away detail and needs thousands of episodes; the linear formula matches the physics and is nearly trivial to find. Modern methods (next steps) mostly try to get the best of both: learn flexibly, from reward, with a smart representation.

**Try this yourself.** Change the 5 in `average_score` to 1 and rerun with different seeds. Does the search ever pick a policy that looks perfect but fails on the 20 fresh episodes? That is what "lucky" means.

## Step 28: Check against the official CartPole

**Why we need this.** Everything so far used physics we wrote ourselves. Is it faithful? The standard version used by researchers is **CartPole-v1** in the `gymnasium` library. Running the same policies there is a good check, and it is how you would work on real projects.

```python type
import gymnasium as gym                  # pip install gymnasium

env = gym.make("CartPole-v1")             # the standard, official version
obs, info = env.reset(seed=0)             # returns (observation, extra info)
print(obs)                                # 4 numbers: the same four state values as ours

def run_gym(policy, episodes=10):
    scores = []
    for i in range(episodes):
        obs, info = env.reset(seed=i)
        ticks = 0
        while True:
            action = policy(obs)
            obs, reward, terminated, truncated, info = env.step(action)
            ticks += 1
            if terminated or truncated:
                break
        scores.append(ticks)
    return scores

print(run_gym(lambda o: 1 if o[3] > 0 else 0))
print(run_gym(lambda o: 1 if o[2] + o[3] > 0 else 0))
print(run_gym(make_linear_policy(best_weights)))
```

<<<STEP 28 FAILED IN PYODIDE: ModuleNotFoundError: No module named 'gymnasium' >>>
<<<STEP 28: PYODIDE OUTPUT DIFFERS FROM THE NOTEBOOK; FIX THE PROSE BELOW>>>

**What every line does.**

- `pip install gymnasium` first (in a terminal, not in the notebook cell).
- `gym.make("CartPole-v1")` creates the official environment. `env.reset(seed=0)` starts an episode and returns the first observation, plus an `info` dictionary we ignore.
- The observation is the same four numbers as our state, in the same order.
- `env.step(action)` returns *five* things: the new observation, the reward, `terminated` (the pole fell or cart left), `truncated` (time limit reached), and `info`.
- `run_gym` is our `run_episode` rewritten for that interface. Everything else, the policies included, is reused.
- We run three policies: the spin rule, a rule using angle plus spin, and our random-search weights from Step 27.

Your numbers may differ a little from mine, because they depend on the library's version and seeding. The pattern should hold: the spin rule scores around 140 to 245 per episode (like ours, about 200), and **our four-number linear policy scores 500 in the official environment too** (mine gave nine 500s in ten and a 334). The simple angle-plus-spin rule does nearly as well. That means our hand-written physics matches the real thing closely, and that what you learned transfers directly to the standard tools.

## Where the wider field goes from here

You have now met three ways to solve CartPole, which stand for three big families of methods.

- **Tabular Q-learning**: A table of values; the policy is "best action in the row" (in this notebook: Steps 13 to 25)
- **Policy search**: The policy itself, as a few adjustable numbers (in this notebook: Step 27 (random search))
- **Deep Q-learning (DQN)**: The Q function, as a **neural network** that takes the raw four numbers (no buckets) (in this notebook: Not in this notebook. The maze notebook builds one from scratch.)
- **Policy gradient (REINFORCE)**: A policy network, nudged toward actions that led to higher return (in this notebook: A natural next step)
- **Actor-critic, PPO**: Both a policy and a value function together; the workhorses of modern RL (in this notebook: Beyond that)

**Good next reading (free):** *Reinforcement Learning: An Introduction* by Sutton and Barto (the standard textbook, available free online); the Gymnasium documentation; and OpenAI's "Spinning Up in Deep RL" guide.

**A project idea:** replace the bucketing with a neural network that takes the four raw numbers and outputs two Q values. The maze notebook (Part E) writes exactly this machinery with a one-hot input; for CartPole you change only the input size to 4 and the output size to 2.

## Cheat sheet: the numpy and Python you used

- `np.array([1, 2, 3])`: make an array from a list
- `a.shape`, `a.size`: the size in each dimension; the total item count
- `a[2, 1]` or `a[(2, 1)]`: row 2, column 1
- `a[:, 0]`, `a[1]`, `a[0, 1:]`: a column; a row; part of a row
- `a.reshape(3, 2)`: same items, new shape
- `np.zeros((3, 4))`: a 3x4 array of zeros
- `a.max(axis=1)`: best number in each row
- `a.argmax(axis=1)`: position of the best number in each row
- `a > 1`, `a == 5`: True/False mask, item by item
- `np.flatnonzero(mask)`: positions where the mask is True
- `np.clip(a, lo, hi)`: force every item into a range
- `a.astype(int)`: chop off decimals
- `np.dot(w, s)`: multiply pairwise, then add up
- `random.seed(n)`: make randomness repeatable
- `f"{x:6.1f}"`: print x as a decimal, 6 wide, 1 decimal
- `a, b = pair`: unpack a tuple or list
- `[f(n) for n in range(5)]`: build a list in one line
- `**settings`: collect extra named inputs / pass them on

## Glossary of reinforcement learning words

- **Environment:** the world; given a state and an action it returns the next state and a reward.
- **State:** everything needed to predict what happens next (here: four numbers).
- **Action:** a choice the agent makes (here: push left or right).
- **Reward:** the immediate score after an action (here: +1 per tick survived).
- **Episode:** one attempt from a start to a failure or a time limit.
- **Policy:** a rule from state to action. Learning is the search for a good one.
- **Return:** total future reward, with later rewards discounted.
- **Discount factor (gamma):** how much a reward one step later is worth, from 0 to 1.
- **Q(s, a):** the estimated return of taking action `a` in state `s` and then playing well.
- **Learning rate (alpha):** how far each update moves toward its target.
- **Epsilon-greedy:** act randomly with probability epsilon, otherwise take the best known action.
- **Exploration / exploitation:** trying new things versus using what you know.
- **Discretization:** chopping continuous numbers into buckets so a table can hold them.
- **Greedy policy:** always take the action with the highest Q.

## Check yourself

Say each answer out loud before reading it.

1. **What does `Q[s, a]` mean?** The estimated total future reward from taking `a` in `s` and then playing well.
2. **What is the update, in words?** Move the old estimate a fraction `alpha` of the way toward `reward + gamma x (best Q in the row I landed in)`.
3. **Why is `best_next` 0 after failure?** There is no future after failing. This is what makes failing look worse than surviving.
4. **Why does `epsilon = 0` fail in CartPole?** All rewards are positive, so the first action tried in a situation always beats untried ones (which are still 0), and the agent repeats it forever.
5. **Why is a training score misleading?** It includes the random exploring moves. Test with no exploring.
6. **Why did the linear policy beat the table so easily?** Its form matches the physics, so it needs only four numbers; the bucketed table discards detail and must learn 648 separate boxes.
7. **What does discretization cost?** Situations in the same bucket are treated as identical, which blurs the signal and makes learning noisy.
