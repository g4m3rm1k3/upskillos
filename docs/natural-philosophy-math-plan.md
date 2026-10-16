# Book of Nature: a mathematics series told through the people who made it

Working title, taken from Galileo: "Philosophy is written in this grand book, the universe ... in the language of mathematics."

This is the plan for a new interactive math lab, built as a new lab. Nothing existing is replaced or removed: `where-maths-comes-from` and the Notebook Lab math series (`docs/math-series-curriculum.md`) stay as they are.

This is the longest series in the project. It covers all of mathematics: everything a learner needs to master software engineering, computer science, physics, chemistry, engineering, AI and beyond. Mathematics is the shared foundation of those subjects, so this series is the foundation of the whole learning path.

## The idea in one paragraph

The learner works through the real problems that forced mathematics into existence: how to re-measure a flooded field, how big the Earth is, how to split the stakes of an unfinished game, why planets move the way they do. They try each problem themselves before seeing how the masters solved it. The voice is warm and storied (Devlin), the problems are honest and carefully sequenced (Jacobs), the thinking moves are Polya's, and rigor builds as the series goes, arriving at the moments history needed it. It is applied: every idea answers a question about the world. It comes in five-minute pieces.

## Principles

1. **Problem first, always.** Every moment opens with a question the learner can try right now. The explanation comes after the attempt, never before.
2. **The learner is the mathematician.** They meet the problem Eratosthenes, Fermat or Euler faced and make their own attempt. Then they see how the master did it and compare.
3. **Woven, not in subject order.** There is no "trig unit" or "calculus unit". Number, shape, change, chance, structure and measurement are threads that run through the whole series and come back deeper each time. Trigonometry first appears as shadows and sticks (Eratosthenes), returns as star charts (Ptolemy's chords), then as circles turning (Euler), and finally as waves (Fourier). Each return builds on the last.
4. **Not strictly chronological either.** History provides the stories, but the order is chosen for insight. An episode may jump centuries when one idea sets up another.
5. **Rigor arrives with a crisis.** A new level of rigor is introduced only when the learner has just watched something "obvious" fail. Rigor added only for its own sake is left for later passes, or left out.
6. **Applied.** Every idea is tied to something in the world: land, sky, money, motion, games, machines, signals.
7. **True history.** Popular math history is full of myths. Stories must be accurate. A legend too good to drop (Archimedes' bath, Galileo's tower, young Gauss and 1..100) is told and labelled as a legend.
8. **The picture does the explaining.** If a moment only works because of its paragraph, the moment is not finished.
9. **Never a formula to memorise.** Every formula is something the learner discovers, derives or rebuilds from a picture. If they forget it, they know how to get it back. A formula is a conclusion they reached, not a fact handed to them.
10. **Keep it interesting until they are a math person.** The first job is to turn the learner into someone who enjoys mathematics and thinks mathematically. Interest is never traded for completeness early on. Rigor waits until they want it.

## The learner's journey

The series turns an ordinary curious person into a mathematician, in four stages. The stages overlap: a little of the next stage always shows up early, the way a self-taught learner gets curious about proof long before they study it.

1. **Become a math person.** Play, puzzles, stories, pictures and patterns. The learner learns to notice, guess, test and explain. Mostly rigor levels 0 to 2. This takes a long time, and that is fine.
2. **Become rigorous.** Once they ask "but is it *always* true?" on their own, proof arrives as the answer to their own question. Levels 2 to 3.
3. **Go deep.** The full machinery of each area, built on the intuition already there. Levels 3 to 4.
4. **Go theoretical.** Abstraction, structure and the view across all of mathematics. Level 4.

Intuition always comes before rigor, and rigor always comes before depth and theory, for every idea. A learner may be at stage 3 in one thread and stage 1 in another.

## Mixed, like a self-taught learner

Someone who loves mathematics and learns on their own is never studying one subject at a time. They are partway through a book on primes, a puzzle collection and a history of calculus all at once, and each one feeds the others. The series works the same way.

- **Several stories run at once.** The learner is always partway through three or four strands: for example a history episode, a puzzle strand, a "how does the world work" strand (physics, chemistry, machines) and a "patterns in numbers" strand. Each day's moment comes from a different one.
- **Strands meet.** When an idea from one strand turns up in another (the triangular numbers from the handshake puzzle reappearing in Pascal's triangle), the lab points it out. Those connections are where mathematics starts to feel like one subject.
- **No subject blocks.** The episode map below is the order *within* each strand, not the order the learner sees. The lab interleaves them, keeping the dependencies between moments intact.

## The threads

| Thread | What it grows into |
|---|---|
| **Number** | counting → place value → fractions → irrationals → negatives → complex numbers → the real line |
| **Shape** | measuring land → similarity → proof → coordinates → trigonometry → curves → vectors |
| **Change** | rates → slopes → motion → derivatives → accumulation → integrals → differential equations |
| **Chance** | fair games → counting → probability → expectation → statistics → error and inference |
| **Structure** | parity → patterns → graphs → logic → algorithms → computation |
| **Measurement** | units → estimation → error → models → least squares → fitting the world |

Each moment is tagged with its thread or threads. The lab can show the learner a map of how far each thread has grown.

## The rigor ladder

Each moment states its level. Levels rise slowly across the series and are never skipped.

| Level | Name | What the learner does |
|---|---|---|
| 0 | **See it** | Notices a pattern in a picture or experiment |
| 1 | **Test it** | Checks it on many cases and tries to break it |
| 2 | **Explain it** | Gives a reason why it must hold (a picture proof, a pairing, a balance) |
| 3 | **Prove it** | Writes a short argument that covers every case |
| 4 | **Make it exact** | Uses precise definitions, because a crisis showed that intuition failed |

Crises that introduce a level (examples):
- The diagonal of a square has no whole-number ratio to its side. Levels 2 to 3: "obvious" is no longer good enough, so the Greeks invent proof.
- Infinitely small quantities give right answers but contradict themselves (Berkeley's "ghosts of departed quantities"). Level 4: limits.
- Plausible-looking probability arguments give two different answers to the same question. Level 3 for chance: count the cases carefully.

## The moment: five minutes, one insight

Every moment has the same six beats:

1. **Hook** (about 30 s). A question that creates curiosity, usually a real problem from history or the world.
2. **Play** (1 to 2 min). An interactive picture: drag, slide, stack, shade. No code and no wall of text.
3. **Predict** (about 30 s). The learner commits to an answer before the reveal.
4. **Reveal** (about 1 min). The picture shows *why*. This is where the master's thinking is shown and compared with the learner's attempt.
5. **Try it** (about 1 min). One small problem that uses the idea, checked instantly, with a hint on a wrong answer.
6. **Keep** (one sentence). The insight in a line, saved to the learner's collection.

Optional extras, never required:
- **Go deeper:** a longer problem, or a Python cell to explore further.
- **The story:** a short historical note about who, where and why.

### Quality bar (every moment must pass)

- [ ] One insight, not three.
- [ ] The learner attempts something before anything is explained.
- [ ] The picture explains it. Remove the prose and the picture still carries most of the idea.
- [ ] The prediction can be wrong in an interesting way.
- [ ] The "Try it" problem needs the insight; it cannot be solved by copying the reveal.
- [ ] It fits in five minutes for someone with no math background beyond the earlier moments.
- [ ] History is accurate; legends are labelled.
- [ ] No term is used before it has been met in an earlier moment.

## Polya's moves

These are the thinking tools. The learner collects them as cards. Early on, a moment names the move it uses. Later, the lab asks "Which move would you try?" before giving a hint.

| Move | First met in |
|---|---|
| Match things up | The shepherd's pebbles |
| Draw a picture | Odd numbers make squares |
| Try a small case | Handshakes |
| Pair things off | Adding 1 to 100 |
| Find what doesn't change | The broken chessboard |
| Work backwards | Egyptian false position |
| Group it | Notches on a bone |
| Make it simpler | Measuring the Earth (one angle, one distance) |
| Use a balance | Al-Khwarizmi's restoring and balancing |
| Squeeze it between two | Archimedes trapping π |
| Slice it up | Archimedes' areas; later, integrals |
| Change the viewpoint | Descartes' grid |
| Generalize | Pascal's triangle |

## Daily rhythm

- One new moment a day (five minutes), rotating between the learner's running strands.
- One review card: a "Keep" sentence or "Try it" from an earlier moment, spaced so old insights come back before they fade.
- Opening the lab resumes where the learner stopped. No setup, no menus to get through.

## Scope: all of mathematics, in five parts

The series is a spiral. Each part goes around all the threads again, higher up the rigor ladder, so a learner who stops after any part still has a complete, connected picture at that depth. The parts follow the learner's journey: Parts I and II make a math person, Part III makes them rigorous and deep, and Parts IV and V make them theoretical.

| Part | Story | Depth | Rigor |
|---|---|---|---|
| **I. The first tour** | Pebbles to Turing: how mathematics was discovered | Arithmetic through first calculus, probability and logic | 0 to 3 |
| **II. The working toolkit** | The 1700s and 1800s: mathematics as the engine of science | Everything high-school and early university math covers, done properly | 2 to 3 |
| **III. The university core** | The 1800s crises and their repairs | Undergraduate mathematics for scientists and engineers | 3 to 4 |
| **IV. The modern landscape** | The 1900s: structure, symmetry, infinity, information | Upper undergraduate and the gateways to research | 4 |
| **V. Frontiers** | Mathematics of the present day | Where each field is now, and how to read it | 4 |

### Part II: the working toolkit (outline)

Algebra done fluently (functions, polynomials, exponentials and logarithms, as the tools of growth and decay); the full trigonometry of circles, triangles and waves; vectors (forces, navigation); sequences and series; single-variable calculus done properly (rates, optimization, areas, volumes, motion); counting and discrete probability; statistics and data; matrices as transformations; first differential equations (cooling, populations, springs); numerical methods (Newton's method, approximating areas); proof techniques (induction, contradiction, cases) as Polya's moves made formal.

### Part III: the university core (outline)

Linear algebra in full (spaces, bases, eigenvalues, the SVD); multivariable and vector calculus (fields, gradient, divergence, curl, Green and Stokes, as the language of flow and electromagnetism); ordinary and partial differential equations (heat, waves, diffusion, Schrödinger); real analysis (the Berkeley crisis repaired completely); complex analysis; probability theory and statistical inference; discrete mathematics and graph theory; number theory and cryptography; optimization; Fourier analysis.

### Part IV: the modern landscape (outline)

Abstract algebra (groups as symmetry, rings, fields, Galois and the unsolvable quintic); non-Euclidean geometry (another crisis) leading to differential geometry and the curved spacetime of relativity; topology; set theory, infinity and Cantor; logic, Gödel and computability; measure theory and rigorous probability; functional analysis and Hilbert space (the mathematics of quantum mechanics); Noether's theorem (symmetry gives conservation laws); representation theory (symmetry in molecules and particles); dynamical systems and chaos; information theory; category theory as the view across everything.

### Part V: frontiers (outline)

Selected tours of living mathematics: the mathematics of machine learning and high-dimensional data, quantum information, modern number theory (Fermat's Last Theorem and what proved it), the classification of shapes (Poincaré and Perelman), random matrices, computer proofs and proof assistants. Each tour explains the questions, the key ideas and how to read further.

### What each subject draws on

The lab can show a learner the moments a target subject depends on, so they can see their path to it.

| Subject | Main mathematics |
|---|---|
| **Software engineering** | Logic, discrete math, counting, graphs, algorithms, basic probability |
| **Computer science** | All of the above, plus computability, complexity, number theory, linear algebra, information theory |
| **Physics** | Calculus, vectors, differential equations, linear algebra, vector calculus, Fourier analysis, complex numbers; later differential geometry, groups, Hilbert space |
| **Chemistry** | Algebra, logarithms, calculus, probability and statistics (statistical mechanics), linear algebra and differential equations (quantum chemistry), group theory (molecular symmetry) |
| **Engineering** | Calculus, differential equations, linear algebra, Fourier and Laplace transforms, numerical methods, statistics |
| **AI and machine learning** | Linear algebra, multivariable calculus, probability and statistics, optimization, information theory |

## Part I episode map

Each episode is about 6 to 10 moments, roughly one Great Courses lecture. The order mixes threads on purpose. Moment lists below Episode 1 are sketches and will be firmed up as each episode is written.

### 1. What is mathematics?
Number, Structure. Rigor 0 to 2.
1. **The shepherd's pebbles:** did a sheep go missing? Counting by matching, without numbers.
2. **Notches on a bone:** why we group in fives and tens, and what a base is.
3. **Odd numbers make squares:** 1+3+5+7 as growing pebble squares (the Pythagorean figurate numbers).
4. **Handshakes:** how many handshakes in a room of 10? Triangular numbers.
5. **Adding 1 to 100:** pairing from both ends (the Gauss schoolroom story, labelled as embellished).
6. **Odd and even pebbles:** why odd + odd is always even. The first "must be true".
7. **The broken chessboard:** remove two opposite corners. Can dominoes still cover it? Colouring as an invariant.
8. **So what is mathematics?** Patterns that *must* hold, and the reasons why. A first proof by picture.

### 2. Measuring the land
Egypt and Babylon. Shape, Number, Measurement.
Re-measuring fields after the Nile flood; areas by cutting and rearranging; unit fractions and the Rhind papyrus; false position (work backwards); the Babylonian base 60, and why an hour still has 60 minutes; YBC 7289 and √2 to six decimal places; Plimpton 322 and right triangles.

### 3. A stick, a shadow and the size of the Earth
Shape, Measurement. Trigonometry's first appearance.
Similar triangles and shadows (Thales and the pyramid, labelled where the sources are late); Eratosthenes measuring the Earth; angles as fractions of a turn; estimation and error; how far away the horizon is.

### 4. The crisis of the diagonal
Number, Structure. Rigor 2 to 3.
Ratios of whole numbers; the diagonal of a square; proof that √2 is not a ratio; why the Greeks turned to proof; Euclid's idea of starting from a few agreed facts; infinitely many primes.

### 5. Chance and fair play
Fermat and Pascal. Chance, Structure. Discrete math begins in earnest.
The problem of points (splitting the stakes of an unfinished game); listing outcomes; Pascal's triangle; counting arrangements and choices; expected value; why a plausible argument can give the wrong answer.

### 6. Trapping π
Archimedes. Shape, Change.
Squeezing a circle between polygons; areas by slicing (the method of exhaustion); the area of a circle from a rolled-out "pizza"; the volume of a sphere; levers and balance as a way to think.

### 7. Zero, place value and the balance
India and the Islamic world. Number, Structure.
Brahmagupta's zero and negative numbers (debts and fortunes); place value as a machine for computing; al-Khwarizmi's restoring and balancing (algebra); algorithms, and where the word comes from.

### 8. Duels over the cubic
Renaissance Italy. Number.
Fibonacci's merchant arithmetic and the rabbits; Tartaglia, Cardano and public problem contests; a formula that produces square roots of negatives on the way to a real answer; numbers that are "impossible" but useful.

### 9. Putting a grid on the world
Descartes and Fermat. Shape, Change.
Coordinates; equations as curves; lines and slopes; the parabola of a thrown ball; Fermat's tangents (seeds of the derivative).

### 10. The book of nature
Galileo and Kepler. Change, Measurement.
Balls rolling down ramps: distance grows as the square of time; speed changing steadily; Kepler fitting orbits from Tycho's data; ellipses; laws as patterns in measurements.

### 11. The mathematics of change
Newton and Leibniz. Change. Rigor 2.
Speed at an instant; slopes of curves; accumulation and area; the fundamental connection between the two; Leibniz's notation as a thinking tool; planetary orbits from one law.

### 12. Ghosts of departed quantities
Berkeley to Cauchy. Change, Number. Rigor 4.
Berkeley's objection; what "infinitely small" was hiding; limits; why the old answers were right; a first look at the real line.

### 13. Bridges, and the birth of e
Euler. Structure, Number, Change.
The seven bridges of Königsberg (graph theory); degrees and paths; compound interest and e; turning in circles: e, i and π meet.

### 14. Finding a lost planet
Gauss. Measurement, Chance.
The asteroid Ceres found, then lost behind the Sun; fitting a curve to messy observations; least squares; the bell curve of errors.

### 15. Every signal is a sum of waves
Fourier. Change, Shape. Trigonometry's last return.
Heat spreading through a bar; waves adding; building a square wave from smooth ones; sound and frequency.

### 16. Thinking as calculation
Boole to Turing. Structure.
True and false as algebra; logic gates; what an algorithm is; Turing's machine; questions no machine can answer. Bridges into the CS path.

Parts II to V get their own episode maps when Part I is under way.

## Building it

- **Location:** a new lab, `src/labs/book-of-nature/` (`meta.js` + `index.jsx`, discovered automatically; see [catalog-discovery.md](catalog-discovery.md)).
- **One file per moment, data-driven.** Each moment is a small module: hook text, a visual component, the prediction, the reveal, a checked problem, the keep line, plus tags for thread, rigor level and Polya move. The lab shell renders the six beats the same way every time, so a moment's author writes only its content and its visual.
- **Progress** follows the same ids-never-change rule as lessons.
- **Visuals** are custom React/SVG components, one per moment, reusing shared pieces (pebble grids, number lines, coordinate planes, sliders) as they emerge.
- Existing labs and series are left untouched.

## Build order

1. **Moment 1.3, "Odd numbers make squares"**, built in full (shell + visual + problem + move card). The user tries it as a learner. This is the quality test.
2. Fix whatever falls flat. Freeze the moment format and quality bar.
3. The rest of Episode 1, then review it as a whole.
4. Episodes in order, each checked in the browser before moving on.

## Status

| Item | State |
|---|---|
| Plan | Written 2026-10-15 |
| Moment 1.3 prototype | Built 2026-10-16 (`src/labs/book-of-nature/`); user approved it as the bar |
| Episode 1 | 1.1 to 1.6 written (1.4 to 1.6 on 2026-10-16, browser-checked); next 1.7 The broken chessboard |
