# Machine Learning for Dummies: Learning Is Tuning Numbers

## The one idea behind everything here

Every algorithm in this series, from the maze to CartPole to neural networks, is the same three-part game:

1. **Knobs.** A list of numbers the program is allowed to change. (The math books call them *parameters*, *weights*, *theta*, or "the values to tune".)
2. **A score.** One number saying how badly the current knob settings are doing. (*Loss*, *cost*, *error*, *wrongness*.)
3. **A way to nudge.** A rule for turning the knobs so the score gets better.

"Learning" is nothing more than repeating step 3 until step 2 stops improving. The algorithms differ only in **what the knobs are** (a table? a formula's weights?) and **how they nudge** (try everything? follow a slope? try random changes?).

Your suspicion is right: the maze algorithm really is filling in a grid. CartPole really is a handful of numbers deciding "push left or right". And a neuron is what you get when the knobs sit inside a formula instead of a table. The lessons make that precise by building each one.

## How to use these lessons

- **One growing file.** Create `learning_lab.py`. Every lesson adds to the bottom of that same file. Type everything yourself.
- **Your visualiser.** Each step tells you what to look at (a variable, a dict, a list). Run, look, then move on.
- **Each lesson has:** the idea, typing steps with explanations of how the data is stored and what each function expects, guided exploration (copy the file, change one named thing, look, come back), a challenge, and a "decoder" that translates the math symbols into the code you wrote.
- **Challenges** have solutions in `solutions.md`. Try first.
- **Numbers.** Random seeds make results repeatable on your machine, but exact digits may differ slightly from mine. The *shape* of the result (what gets better, what blows up) should match.

## Lessons in this batch

| # | Lesson | Knobs are... | Nudge method |
|---|--------|--------------|--------------|
| 1 | Knobs and Wrongness (taxi fares) | 2 numbers in an object | try every combination |
| 2 | Feeling the Slope | the same 2 numbers | wiggle and follow the slope |
| 3 | The Maze: The Table Is the Knobs | a grid of numbers (dict) | move each entry toward a better guess |
| 4 | CartPole and Neurons | 4 weights in a formula | random nudges, keep what's better |

## Coming next (not built yet)

5. Stacking neurons into layers; why a single formula isn't enough
6. Computing slopes for many knobs at once (backpropagation) without wiggling
7. Replacing the maze table with a neural network (the "deep Q" idea), learning CartPole properly
8. Decision trees and k-means: knobs that aren't numbers in a formula

Later lessons connect directly to your existing ML/math and dynamic programming series.
