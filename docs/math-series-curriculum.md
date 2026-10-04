# Notebook Lab series: Mathematics Through Computation

The fourth Notebook Lab series. One mathematics curriculum, from quantities and units to graduate-level topics, learned through applications and computation. The specification it implements is [math seires.md](math%20seires.md).

Status: **draft**. Lesson titles and order may change until a lesson ships. After that its id is a progress key and must not change.

## Principles

- **The mathematics comes first.** Each lesson starts from a problem that makes the mathematics necessary (a machine, a measurement, a signal, a network), teaches the least needed to solve it, and then deepens it.
- **Python is the universal computational layer.** Every lesson can be completed in Python, in the existing Pyodide notebook. Libraries appear when a problem needs them: NumPy when there are many values, Matplotlib when a picture answers the question, SymPy when exact algebra helps, SciPy when a robust solver beats a hand-written one, pandas when there are real data tables.
- **OpenMAT is a secondary environment, never required.** OpenMAT (the app's MATLAB-style engine) appears where its notation makes the mathematics more transparent: matrices, linear systems, numerical methods, signals, ODEs. OpenMAT cells are demonstrations; graded challenges are always Python. No learner is blocked by not knowing MATLAB.
- **Spiral, not school order.** The main path is a first tour that touches every major idea at an intuitive level, then deepening blocks that return to each thread with more mathematics and rigour, then advanced topics where the earlier mathematics is reused. Later lessons say "use derivatives to solve this", not "let us review derivatives".
- **Every substantial concept has a computational experiment and a real application.**
- **Rigour rises.** Intuition, experiment, calculation, notation, generalisation, definition, proof. The deepening blocks add definitions and derivations; the advanced block adds proofs.
- **Implement once from scratch, then use the library.** Every major numerical method is written by hand before `numpy.linalg`, `scipy.integrate` or `scipy.optimize` is trusted with it, and the two are compared.

The learner has finished Python from Zero (or knows variables, loops, functions, lists, dictionaries and classes). Every mathematical use of code must still be taught: connect the operation to explicit Python steps before using compact notation or library shortcuts. Prior Python knowledge does not imply knowledge of NumPy, summation notation, or mathematical programming. Follow the [learning-path and reference standard](math-notebook-teaching-standard.md) for new notebooks and revisions.

## Lesson format and standard

The same format and standard as the other series (see [notebook-series-curriculum.md](notebook-series-curriculum.md)): prose that teaches, a predict-before-running prompt before revealing cells, demo cells that show something, 2–4 graded challenges with tests and hints, checked by `node scripts/check_notebook_series.mjs`. Lessons are about one sitting.

Additions for this series:

- **OpenMAT cells.** A fenced block marked `openmat` is a runnable OpenMAT demo cell: the notebook runs it with the in-browser OpenMAT engine and shows its text output and any figure. The checker runs these cells too. Use them only where the lesson's computational mode includes OpenMAT, pair them with the same idea in Python, and explain both the mathematics and any unfamiliar syntax needed to understand the computation.
- **Mathematics in prose.** `$inline$` and `\[display\]` LaTeX, as in the other series.
- **Applications are concrete and engineering-flavoured** where they can be: machining, mechanisms, sensors, vibration, robotics, CAD, process data, plus physics, chemistry, biology, finance and computing. Data sets are generated in the lesson or come from scikit-learn and SciPy (Pyodide has no network access).

## Computational modes

Each lesson in the tables below is classified, as the specification asks:

- **req**: python_required. The concept cannot be explored properly without computation.
- **py**: python_primary. Python is the main environment.
- **py+om**: python_plus_openmat. Both environments contribute; the lesson has OpenMAT cells.
- **om?**: openmat_optional. Python handles the lesson; one OpenMAT cell shows the same mathematics in matrix notation.
- **concept**: conceptual_only. Mostly reasoning and proof; computation only to check.

## Threads

Lessons belong to one or more threads, so a learner can follow a thread through the spiral (the thread codes appear in the tables):

Q quantities and measurement · ALG algebra and modelling · FN functions · GEO geometry · TRIG trigonometry · VEC vectors · CPX complex numbers · LA linear algebra · MG matrices as geometry · CALC single-variable calculus · SER sequences and series · ODE differential equations · PHYS mathematical physics · NUM numerical mathematics · PROB probability · STAT statistics · MV multivariable and vector calculus · OPT optimisation · SIG Fourier and signals · CTRL control · DISC logic, sets and proof · GRAPH graph theory · COMB combinatorics · NT number theory · INFO information theory · CS mathematics of computing · GAME game theory · DYN dynamical systems · PDE partial differential equations · RA real analysis · CA complex analysis · ABS abstract algebra · TEN tensors · DG differential geometry · CG computational geometry · ML machine-learning mathematics.

## Main path

### Pass 1: A first tour (lessons 1–54)

Every major area at an intuitive, computational level, in an order where each application motivates the next idea. The order follows the specification's suggested opening.

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 1 | numbers-exact-and-approximate | Numbers, exact and approximate | Q NUM | req | machine dimensions, physical constants |
| 2 | quantities-and-units | Quantities and units | Q | py | feeds, speeds and unit mistakes |
| 3 | ratios-rates-and-scaling | Ratios, rates and scaling | Q ALG | py | gear ratios, drawings to scale |
| 4 | powers-and-orders-of-magnitude | Powers and orders of magnitude | Q | py | scientific notation, Fermi estimates |
| 5 | formulas-as-functions | Formulas as functions | ALG FN | py | engineering formulas as code |
| 6 | plotting-a-relationship | Plotting a relationship | FN | req | position and temperature over time |
| 7 | arrays | Arrays: computing on many values | Q LA | req | sensor logs |
| 8 | coordinates-and-distance | Coordinates and distance | GEO | py | CAD points and hole spacing |
| 9 | lines-and-slope | Lines, slope and calibration | ALG FN | py | calibrating a sensor |
| 10 | motion-in-one-dimension | Motion in one dimension | CALC PHYS | req | a conveyor's position log |
| 11 | average-rate-of-change | Average rate of change | CALC | py | speed from position data |
| 12 | angles-and-rotation | Angles, radians and rotation | TRIG | py | spindles and angular speed |
| 13 | sine-and-cosine-from-rotation | Sine and cosine from rotation | TRIG | req | crank and piston position |
| 14 | vectors | Vectors: size and direction | VEC | py | forces and displacements |
| 15 | components-and-resultants | Components and resultants | VEC | om? | forces on a bracket |
| 16 | projectile-motion | Projectile motion | VEC ALG PHYS | req | throwing and launching |
| 17 | two-equations-two-unknowns | Two equations, two unknowns | ALG | py | mixtures and circuits |
| 18 | matrices-as-systems | Matrices: a system in one object | LA | py+om | solving Ax = b |
| 19 | matrices-that-move-points | Matrices that move points | MG LA | py+om | 2D graphics transforms |
| 20 | the-derivative-appears | Instantaneous rate: the derivative appears | CALC | req | velocity from position |
| 21 | newtons-second-law | Newton's second law, simulated | PHYS ODE | req | a cart pushed by a force |
| 22 | accumulation | Accumulation: from rate back to total | CALC | req | distance from a speedometer |
| 23 | work-and-energy | Work and energy | PHYS CALC | py | lifting, springs, braking |
| 24 | exponential-change | Exponential growth and decay | Q FN ODE | py | cooling and radioactive decay |
| 25 | logarithms | Logarithms and log scales | Q FN | py | decibels, pH, earthquakes |
| 26 | probability-by-simulation | Probability by simulation | PROB | req | defective parts in a batch |
| 27 | random-variables | Random variables and distributions | PROB | req | measurement noise |
| 28 | statistics-from-measurements | Statistics from measurements | STAT | py | gauge readings |
| 29 | fitting-a-line | Fitting a line to data | STAT LA | om? | calibration by least squares |
| 30 | finding-the-best | Finding the best: optimisation | OPT CALC | py | the cheapest can |
| 31 | walking-downhill | Walking downhill: gradient descent | OPT | req | fitting by descent |
| 32 | functions-of-two-variables | Functions of two variables | MV FN | req | a plate's temperature |
| 33 | partial-derivatives-and-the-gradient | Partial derivatives and the gradient | MV | req | which way is hotter |
| 34 | the-jacobian | The Jacobian: how outputs follow inputs | MV MG | req | a two-link arm's sensitivity |
| 35 | eigenvectors-through-vibration | Eigenvectors through vibration | LA ODE | py+om | two masses on springs |
| 36 | laws-as-rates | Differential equations: laws as rates | ODE | req | tank draining, cooling |
| 37 | the-spring-mass-system | The spring–mass system | ODE PHYS | req | a machine mount |
| 38 | waves-amplitude-frequency-phase | Waves: amplitude, frequency and phase | TRIG SIG | req | mains voltage, vibration |
| 39 | building-signals-from-sines | Building signals from sines | SIG | req | a square wave from harmonics |
| 40 | seeing-frequencies | Seeing frequencies: the spectrum | SIG | py+om | finding a vibration's source |
| 41 | sampling-and-aliasing | Sampling and aliasing | SIG | req | wagon wheels and sensors |
| 42 | graphs-and-networks | Graphs and networks | GRAPH | py | conveyors and routes |
| 43 | shortest-paths | Shortest paths | GRAPH OPT | py | routing a forklift |
| 44 | counting-possibilities | Counting possibilities | COMB | py | test cases and passwords |
| 45 | bayes-theorem | Updating beliefs: Bayes' theorem | PROB | py | which machine caused the fault |
| 46 | directions-of-most-variation | Directions of most variation: PCA | LA STAT ML | py+om | shape measurements |
| 47 | compressing-with-the-svd | Compressing with the SVD | LA | py+om | image compression |
| 48 | the-chain-rule-and-learning | The chain rule and learning | CALC ML | req | a one-neuron model learning |
| 49 | solving-equations-numerically | Solving equations numerically | NUM | req | the angle that fits |
| 50 | when-numbers-betray-you | When numbers betray you | NUM | req | catastrophic cancellation |
| 51 | robot-arm-kinematics | Robot arm kinematics | MG VEC OPT | req | reaching a target |
| 52 | heat-flow-on-a-bar | Heat flow on a bar | PDE NUM | req | a heated shaft |
| 53 | a-vibrating-string | A vibrating string | PDE SIG | req | guitar strings and cables |
| 54 | first-tour-capstone | Capstone: simulate a machine | many | req | a vibrating, heating motor |

### Pass 2: Deepening (lessons 55–270)

Each block returns to threads met in the first tour, adds the mathematics they skipped, formal definitions and derivations, and harder applications. Blocks are ordered so that each can use the ones before it; within a block the order is the teaching order.

#### Block A: Quantities, algebra and functions

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 55 | fractions-and-exact-arithmetic | Fractions and exact arithmetic | Q NUM | py | gear trains with exact ratios |
| 56 | relative-change-and-error | Percentages, relative change and relative error | Q STAT | py | tolerances and inflation |
| 57 | dimensional-analysis | Dimensional analysis | Q PHYS | py | pendulums and pipe flow |
| 58 | floating-point | How computers store numbers | NUM | req | why 0.1 + 0.2 is not 0.3 |
| 59 | error-propagation | Propagating measurement error | Q STAT | py | a volume from measured lengths |
| 60 | rearranging-formulas | Rearranging formulas, with SymPy | ALG | py | solving for the quantity you need |
| 61 | inequalities-and-tolerances | Inequalities and tolerances | ALG | py | fits and limits |
| 62 | absolute-value | Absolute value and error bands | ALG | py | deviation from nominal |
| 63 | domain-and-range | Functions: domain, range and mapping | FN DISC | py | valid sensor inputs |
| 64 | composition-and-inverses | Composition and inverse functions | FN | py | sensor chains, calibration curves |
| 65 | transforming-graphs | Shifting, stretching and reflecting graphs | FN | req | aligning signals |
| 66 | quadratics | Quadratics in depth | ALG FN | py | braking distance, vertex form |
| 67 | polynomials | Polynomials: roots, factors and multiplicity | ALG | py | beam deflection curves |
| 68 | rational-functions | Rational functions, poles and asymptotes | FN | py | lens and filter responses |
| 69 | piecewise-functions | Piecewise functions | FN | py | trapezoidal motion profiles |
| 70 | power-laws | Power laws and log–log plots | FN STAT | req | scaling of animals and machines |
| 71 | sequences | Sequences, arithmetic and geometric | SER | py | depreciation, tool wear |
| 72 | recurrences | Recurrences and iteration | SER DYN | req | loans and populations |
| 73 | parametric-curves | Parametric curves | FN GEO | req | toolpaths |
| 74 | polar-curves | Polar curves | FN TRIG | req | cams and spirals |
| 75 | nonlinear-systems | Systems of nonlinear equations | ALG NUM | py | intersecting curves, mechanisms |

#### Block B: Geometry, trigonometry, vectors and complex numbers

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 76 | triangles-and-similarity | Triangles and similarity | GEO | py | surveying, scale models |
| 77 | right-triangle-trigonometry | Right-triangle trigonometry | TRIG | py | slopes, ramps and forces |
| 78 | inverse-trig-and-atan2 | Inverse trigonometry and atan2 | TRIG | py | angles from measurements |
| 79 | trig-identities | Trigonometric identities, by computation | TRIG | py | simplifying models |
| 80 | laws-of-sines-and-cosines | The laws of sines and cosines | TRIG GEO | py | triangulation |
| 81 | circles-arcs-and-tangents | Circles, arcs and tangents | GEO | py | CNC arcs and belt drives |
| 82 | areas-of-polygons | Areas of polygons | GEO CG | py | the shoelace formula, sheet metal |
| 83 | volumes-and-mass-properties | Volumes and mass properties | GEO | py | stock, castings and tanks |
| 84 | conic-sections | Conic sections | GEO | py | reflectors and orbits |
| 85 | the-dot-product | The dot product | VEC | om? | work, lighting, angles |
| 86 | projections-and-closest-points | Projections and closest points | VEC CG | py | distance from a point to a line |
| 87 | the-cross-product | The cross product | VEC | om? | torque and surface normals |
| 88 | lines-and-planes-in-3d | Lines and planes in 3D | VEC GEO | py | ray casting and fixtures |
| 89 | coordinate-frames | Coordinate frames | VEC MG | py | machine and part coordinates |
| 90 | complex-numbers | Complex numbers | CPX | py | equations with no real roots |
| 91 | the-complex-plane | The complex plane and polar form | CPX | py | magnitude and phase |
| 92 | eulers-formula | Euler's formula | CPX TRIG | req | rotation as multiplication |
| 93 | roots-of-unity | Roots of complex numbers | CPX | py | polygons and symmetric patterns |
| 94 | phasors-and-ac-circuits | Phasors and AC circuits | CPX PHYS | py+om | impedance |
| 95 | affine-transformations | Affine transformations and homogeneous coordinates | MG LA | py+om | moving parts in a drawing |
| 96 | rotations-in-3d | Rotations in 3D | MG | py+om | orientation, Euler angles, gimbal lock |
| 97 | camera-projection | Camera projection and perspective | MG | req | rendering a 3D part |

#### Block C: Linear algebra

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 98 | linear-combinations-and-span | Linear combinations and span | LA | py+om | mixing alloys |
| 99 | independence-basis-dimension | Independence, basis and dimension | LA | py+om | redundant sensors |
| 100 | matrix-multiplication | Matrix multiplication in depth | LA MG | py+om | chained transforms |
| 101 | gaussian-elimination | Gaussian elimination from scratch | LA NUM | py+om | truss forces |
| 102 | pivoting-and-lu | Pivoting and LU decomposition | LA NUM | py+om | many right-hand sides |
| 103 | rank-and-solution-sets | Rank and solution sets | LA | py+om | over- and under-determined systems |
| 104 | null-space-and-column-space | Null space and column space | LA | py+om | mechanisms that can move |
| 105 | determinants | Determinants: area, volume and orientation | LA MG | py+om | when a transform flattens space |
| 106 | inverse-matrices | Inverse matrices, and why to avoid them | LA NUM | py+om | undoing a transform |
| 107 | change-of-basis | Change of basis | LA MG | py+om | the same vector in two frames |
| 108 | eigenvalues | Eigenvalues and the characteristic polynomial | LA | py+om | natural frequencies |
| 109 | diagonalisation | Diagonalisation and matrix powers | LA DYN | py+om | Markov chains, long-run behaviour |
| 110 | orthogonality | Orthogonality and Gram–Schmidt | LA | py+om | independent measurements |
| 111 | least-squares | Least squares: projection onto a subspace | LA STAT | py+om | overdetermined calibration |
| 112 | qr-decomposition | QR decomposition | LA NUM | py+om | stable least squares |
| 113 | the-svd | The singular value decomposition | LA | py+om | the shape of a transform |
| 114 | principal-components | Principal component analysis | LA STAT ML | py+om | sensor data reduction |
| 115 | positive-definite-matrices | Positive-definite matrices and quadratic forms | LA OPT | py+om | energy and bowls |
| 116 | condition-numbers | Condition numbers | LA NUM | py+om | how errors grow in a solve |
| 117 | iterative-solvers | Iterative solvers | LA NUM | py+om | large sparse systems |

#### Block D: Calculus

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 118 | limits | Limits | CALC RA | py | approaching a value numerically |
| 119 | continuity | Continuity | CALC RA | py | when models jump |
| 120 | derivative-rules | The derivative and its basic rules | CALC | py | SymPy checks numeric slopes |
| 121 | product-and-quotient-rules | The product and quotient rules | CALC | py | power and efficiency |
| 122 | the-chain-rule | The chain rule | CALC | py | nested physical models |
| 123 | exponential-log-and-trig-derivatives | Derivatives of exponential, logarithmic and trigonometric functions | CALC | py | oscillation and decay |
| 124 | implicit-differentiation | Implicit differentiation | CALC | py | constrained geometry |
| 125 | related-rates | Related rates | CALC | py | filling tanks, sliding ladders |
| 126 | higher-derivatives | Higher derivatives, jerk and curvature | CALC PHYS | req | smooth motion profiles |
| 127 | linear-approximation | Linear approximation and differentials | CALC NUM | py | error estimates |
| 128 | optimisation-with-derivatives | Optimisation with derivatives | CALC OPT | py | design trade-offs |
| 129 | newtons-method | Newton's method and its convergence | CALC NUM | py+om | inverse kinematics of a link |
| 130 | riemann-sums | Riemann sums | CALC | req | area from samples |
| 131 | the-definite-integral | The definite integral | CALC | py | net change |
| 132 | fundamental-theorem | The fundamental theorem of calculus | CALC | py | rate and accumulation, linked |
| 133 | substitution | Integration by substitution | CALC | py | SymPy checks |
| 134 | integration-by-parts | Integration by parts | CALC | py | moments and transforms |
| 135 | partial-fractions | Partial fractions | CALC ALG | py | rational integrands |
| 136 | numerical-integration | Numerical integration: trapezoid and Simpson | CALC NUM | py+om | integrating measured data |
| 137 | work-and-fluid-force | Work and fluid force | CALC PHYS | py | pumping tanks, dam walls |
| 138 | centre-of-mass | Centre of mass and moments | CALC PHYS | py | balancing parts |
| 139 | average-value-and-rms | Average value and RMS | CALC SIG | py | AC power, vibration level |
| 140 | improper-integrals | Improper integrals | CALC | py | escape velocity, probability tails |
| 141 | convergence-of-sequences | Convergence of sequences | SER RA | py | iterative algorithms |
| 142 | infinite-series | Infinite series | SER | py | bouncing balls, decimals |
| 143 | power-series | Power series | SER | py | functions as polynomials |
| 144 | taylor-series | Taylor series | SER CALC | req | how calculators compute sin |
| 145 | taylor-error | Taylor error bounds and small-angle approximations | SER PHYS NUM | py | the pendulum approximation |

#### Block E: Differential equations and physics

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 146 | slope-fields | Slope fields | ODE | req | seeing solutions before solving |
| 147 | eulers-method | Euler's method and its error | ODE NUM | py+om | step size and accuracy |
| 148 | separable-equations | Separable equations | ODE | py | draining and decay |
| 149 | linear-first-order | Linear first-order equations | ODE | py | RC circuits, mixing tanks |
| 150 | logistic-growth | Logistic growth | ODE DYN | py | populations and adoption |
| 151 | second-order-linear | Second-order linear equations | ODE | py | the characteristic equation |
| 152 | damping | Damping | ODE PHYS | py+om | shock absorbers |
| 153 | forced-oscillation | Forced oscillation and resonance | ODE PHYS SIG | req | machine vibration near resonance |
| 154 | runge-kutta | Runge–Kutta and solve_ivp | ODE NUM | py+om | accurate simulation |
| 155 | energy-and-integrators | Energy drift and symplectic integrators | ODE NUM PHYS | req | long-running simulations |
| 156 | the-pendulum | The pendulum, beyond small angles | ODE PHYS | req | clocks and cranes |
| 157 | drag | Drag and terminal velocity | ODE PHYS | req | falling and thrown objects |
| 158 | coupled-oscillators | Coupled oscillators | ODE LA PHYS | py+om | multi-storey buildings, drivetrains |
| 159 | phase-space | Phase space | ODE DYN | req | reading a system's behaviour |
| 160 | equilibria-and-stability | Equilibria and stability | ODE DYN LA | py+om | balancing and tipping |
| 161 | predator-prey | Predator–prey systems | ODE DYN | req | ecology |
| 162 | epidemic-models | Epidemic models | ODE DYN | req | SIR and vaccination |
| 163 | reaction-kinetics | Chemical reaction kinetics | ODE | req | rate laws and equilibrium |
| 164 | orbits | Orbits | ODE PHYS | req | satellites and Kepler's laws |
| 165 | rigid-body-rotation | Rigid-body rotation | PHYS MG | req | spinning parts and inertia |

#### Block F: Probability and statistics

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 166 | sample-spaces-and-events | Sample spaces and events | PROB DISC | py | inspection outcomes |
| 167 | probability-rules | The rules of probability | PROB | py | system reliability |
| 168 | conditional-probability | Conditional probability | PROB | py | test results |
| 169 | independence | Independence | PROB | py | redundancy that isn't |
| 170 | counting-and-probability | Counting and probability | PROB COMB | py | lotteries and sampling plans |
| 171 | discrete-distributions | Discrete distributions | PROB | py | defects, arrivals, failures |
| 172 | expectation | Expectation | PROB | py | average cost of a policy |
| 173 | variance | Variance and standard deviation | PROB | py | process variation |
| 174 | continuous-distributions | Continuous distributions and densities | PROB CALC | py | measurement error models |
| 175 | the-normal-distribution | The normal distribution | PROB | py | tolerance stacks |
| 176 | exponential-and-poisson-processes | Exponential waiting times and Poisson processes | PROB | req | breakdowns and queues |
| 177 | joint-distributions | Joint distributions and covariance | PROB LA | py | two correlated measurements |
| 178 | law-of-large-numbers | The law of large numbers | PROB | req | why averages settle |
| 179 | central-limit-theorem | The central limit theorem | PROB | req | why normal curves are everywhere |
| 180 | monte-carlo | Monte Carlo methods | PROB NUM | req | risk and integration |
| 181 | data-tables | Data tables with pandas | STAT | py | a production log |
| 182 | descriptive-statistics | Descriptive statistics | STAT | py | summarising a process |
| 183 | visualising-data | Visualising distributions | STAT | req | histograms, box plots |
| 184 | sampling-distributions | Sampling distributions and standard error | STAT | req | how precise is an average |
| 185 | confidence-intervals | Confidence intervals | STAT | py | reporting a measurement |
| 186 | hypothesis-tests | Hypothesis tests | STAT | py | did the new tool help |
| 187 | effect-size-and-power | Effect size and power | STAT | req | how many samples to take |
| 188 | correlation | Correlation | STAT | py | relationships and confounders |
| 189 | regression-in-depth | Linear regression in depth | STAT LA | py+om | calibration with uncertainty |
| 190 | residuals | Residual analysis | STAT | py | when a line is the wrong model |
| 191 | multiple-regression | Multiple and polynomial regression | STAT LA | py | several factors at once |
| 192 | anova | ANOVA and experimental design | STAT | py | comparing machines |
| 193 | design-of-experiments | Designing experiments | STAT | py | factorial designs in a factory |
| 194 | bootstrap | The bootstrap | STAT | req | uncertainty without formulas |
| 195 | bayesian-statistics | Bayesian statistics | STAT PROB | req | updating a failure rate |
| 196 | maximum-likelihood | Maximum likelihood | STAT OPT ML | req | fitting distributions |

#### Block G: Multivariable calculus, vector calculus and optimisation

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 197 | surfaces-and-contours | Surfaces and contour plots | MV | req | terrain and temperature maps |
| 198 | partial-derivatives | Partial derivatives in depth | MV | py | sensitivity analysis |
| 199 | directional-derivatives | Directional derivatives and tangent planes | MV | py | slopes in any direction |
| 200 | multivariable-chain-rule | The multivariable chain rule and computational graphs | MV ML | req | backpropagation by hand |
| 201 | jacobians | Jacobians in depth | MV MG | py+om | coordinate changes, robot speeds |
| 202 | hessians | Hessians and curvature | MV OPT | py+om | classifying stationary points |
| 203 | unconstrained-optimisation | Unconstrained optimisation | OPT | py | fitting and design |
| 204 | gradient-descent | Gradient descent in depth | OPT ML | req | learning rates and convergence |
| 205 | momentum-and-adaptive-steps | Momentum and adaptive steps | OPT ML | req | ravines and plateaus |
| 206 | newton-optimisation | Newton's method for optimisation | OPT NUM | py+om | fast convergence near the minimum |
| 207 | convexity | Convex functions and convex sets | OPT | py | when local is global |
| 208 | lagrange-multipliers | Constrained optimisation and Lagrange multipliers | OPT MV | py | the best box from a sheet |
| 209 | linear-programming | Linear programming | OPT | py+om | production planning |
| 210 | integer-programming | Integer programming | OPT COMB | py | cutting stock, scheduling |
| 211 | multi-objective-optimisation | Multi-objective optimisation | OPT | req | Pareto fronts in design |
| 212 | double-integrals | Double integrals | MV CALC | py | mass of a plate |
| 213 | change-of-variables | Polar, cylindrical and spherical coordinates | MV | py | pipes, tanks and domes |
| 214 | triple-integrals | Triple integrals | MV | py | volumes and moments of inertia |
| 215 | vector-fields | Vector fields | MV PHYS | req | flow and force fields |
| 216 | gradient-fields-and-potentials | Gradient fields and potentials | MV PHYS | py | conservative forces |
| 217 | divergence-and-curl | Divergence and curl | MV PHYS | req | sources and swirls in a flow |
| 218 | line-integrals | Line integrals and work | MV PHYS | py | work along a path |
| 219 | surface-integrals-and-flux | Surface integrals and flux | MV PHYS | py | flow through a surface |
| 220 | greens-theorem | Green's theorem | MV | py | area by walking the boundary |
| 221 | divergence-and-stokes-theorems | The divergence and Stokes theorems | MV PHYS | py | conservation laws |

#### Block H: Numerical mathematics

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 222 | rounding-and-cancellation | Rounding error and cancellation | NUM | req | stable formulas |
| 223 | conditioning-and-stability | Conditioning and stability | NUM | py | problem versus algorithm |
| 224 | root-finding | Root finding: bisection, secant and Newton compared | NUM | py+om | orders of convergence |
| 225 | interpolation | Polynomial interpolation | NUM | py+om | Runge's phenomenon |
| 226 | splines | Splines | NUM CG | py+om | smooth toolpaths |
| 227 | numerical-differentiation | Numerical differentiation and its errors | NUM CALC | req | truncation versus rounding |
| 228 | quadrature | Gaussian and adaptive quadrature | NUM | py | integrating hard functions |
| 229 | stiff-equations | Stiff equations and implicit methods | NUM ODE | py+om | fast and slow chemistry |
| 230 | finite-differences | Finite differences for boundary problems | NUM PDE | py+om | a loaded beam |
| 231 | sparse-matrices | Sparse matrices | NUM LA | py | large grids |
| 232 | fixed-point-iteration | Fixed-point iteration and convergence | NUM RA | py | when iterations settle |

#### Block I: Fourier analysis, signals and control

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 233 | periodic-signals | Periodic signals | SIG | py | rotating machinery |
| 234 | fourier-series | Fourier series | SIG SER | py+om | square, sawtooth, Gibbs |
| 235 | the-fourier-transform | The Fourier transform | SIG CALC | py | pulses and spectra |
| 236 | the-dft | The discrete Fourier transform | SIG LA | py+om | the DFT as a matrix |
| 237 | the-fft | The fast Fourier transform | SIG CS | req | from O(n²) to O(n log n) |
| 238 | nyquist-and-reconstruction | Sampling theory and reconstruction | SIG | req | choosing a sample rate |
| 239 | windowing-and-leakage | Windowing and spectral leakage | SIG | py+om | measuring a tone accurately |
| 240 | convolution | Convolution | SIG | py+om | smoothing and echoes |
| 241 | filters | Digital filters | SIG CTRL | py+om | removing noise from a sensor |
| 242 | correlation-of-signals | Cross-correlation and autocorrelation | SIG STAT | py | finding delays and periods |
| 243 | noise-and-power-spectra | Noise and power spectral density | SIG PROB | req | separating signal from noise |
| 244 | spindle-vibration-analysis | Analysing spindle vibration | SIG STAT | py+om | a bearing fault in real data |
| 245 | feedback | Feedback and control | CTRL ODE | req | thermostats and cruise control |
| 246 | transfer-functions | Transfer functions, poles and zeros | CTRL CPX | py+om | first- and second-order systems |
| 247 | step-and-frequency-response | Step response and Bode plots | CTRL SIG | py+om | how fast and how stable |
| 248 | pid-control | PID control | CTRL | req | positioning an axis |
| 249 | state-space | State-space models | CTRL LA | py+om | many inputs and outputs |
| 250 | controllability-and-observability | Controllability and observability | CTRL LA | py+om | what can be steered and seen |
| 251 | kalman-filter | The Kalman filter | CTRL PROB LA | req | fusing noisy sensors |

#### Block J: Discrete mathematics and the mathematics of computing

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 252 | logic-and-propositions | Logic and propositions | DISC | py | safety interlocks |
| 253 | boolean-algebra | Truth tables and Boolean algebra | DISC CS | py | simplifying logic circuits |
| 254 | sets | Sets and set operations | DISC | py | inventory and databases |
| 255 | relations | Relations and equivalence classes | DISC | py | grouping parts |
| 256 | functions-as-mappings | Functions as mappings | DISC FN | py | injective, surjective, bijective |
| 257 | quantifiers | Quantifiers and specifications | DISC | concept | writing exact requirements |
| 258 | proof-techniques | Proof techniques | DISC | concept | direct, contrapositive, contradiction |
| 259 | induction | Mathematical induction | DISC CS | concept | loop correctness, sums |
| 260 | pigeonhole-and-inclusion-exclusion | Pigeonhole and inclusion–exclusion | COMB | py | collisions and overlaps |
| 261 | binomial-coefficients | Binomial coefficients and Pascal's triangle | COMB | py | paths and probabilities |
| 262 | generating-functions | Generating functions | COMB SER | py | counting with algebra |
| 263 | graph-theory | Graph theory: degrees, paths and trees | GRAPH | py | networks of machines |
| 264 | network-flow | Network flow and matching | GRAPH OPT | py | conveyor capacity, job assignment |
| 265 | divisibility-and-gcd | Divisibility, primes and the Euclidean algorithm | NT | py | gear tooth counts |
| 266 | modular-arithmetic | Modular arithmetic | NT ABS | py | check digits and clocks |
| 267 | modular-inverses-and-crt | Modular inverses and the Chinese remainder theorem | NT | py | combining periodic events |
| 268 | rsa | Fast exponentiation, Fermat and RSA | NT CS | py | public-key encryption |
| 269 | entropy | Entropy and information | INFO PROB | py | how much a message tells you |
| 270 | coding-and-compression | Coding, compression and error correction | INFO CS | py | Huffman and Hamming codes |
| 271 | automata | Automata and regular languages | CS DISC | py | parsing machine codes |
| 272 | computability-and-complexity | Computability and complexity | CS | concept | what computers cannot do |

### Pass 3: Advanced mathematics and synthesis (lessons 273–310)

Topics introduced when the earlier mathematics makes them reachable, with rising rigour, followed by capstones that combine everything.

| # | Slug | Lesson | Threads | Mode | Application |
|---|---|---|---|---|---|
| 273 | markov-chains | Markov chains | PROB LA | py+om | machine states and page rank |
| 274 | random-walks-and-brownian-motion | Random walks and Brownian motion | PROB PHYS | req | diffusion |
| 275 | stochastic-differential-equations | Stochastic differential equations | PROB ODE | req | noisy dynamics, finance |
| 276 | game-theory | Strategic games and Nash equilibrium | GAME | py | competing suppliers |
| 277 | mixed-strategies-and-zero-sum | Mixed strategies and zero-sum games | GAME OPT | py+om | minimax by linear programming |
| 278 | repeated-and-evolutionary-games | Repeated and evolutionary games | GAME DYN | req | cooperation and populations |
| 279 | bifurcations | Bifurcations | DYN | req | when behaviour suddenly changes |
| 280 | chaos | Chaos: the logistic map and the Lorenz system | DYN | req | weather and sensitivity |
| 281 | heat-equation | The heat equation | PDE | py+om | heat treatment |
| 282 | wave-equation | The wave equation | PDE | py+om | vibrating cables |
| 283 | laplace-equation | Laplace's equation | PDE | py+om | steady temperature and potential |
| 284 | separation-of-variables | Separation of variables and Fourier solutions | PDE SIG | py | exact solutions to check numerics |
| 285 | pde-stability | Stability of numerical PDE schemes | PDE NUM | req | why simulations blow up |
| 286 | advection-and-diffusion | Advection and diffusion | PDE PHYS | req | pollutants in a river |
| 287 | complex-functions | Complex functions and conformal maps | CA | req | flow around shapes |
| 288 | analytic-functions | Complex differentiability and the Cauchy–Riemann equations | CA | py | potential flow |
| 289 | contour-integrals | Contour integrals and residues | CA | py | real integrals the easy way |
| 290 | groups-and-symmetry | Groups and symmetry | ABS | py | symmetries of parts and puzzles |
| 291 | rings-and-fields | Rings, fields and finite fields | ABS NT | py | error-correcting codes |
| 292 | real-numbers-and-completeness | The real numbers and completeness | RA | concept | why limits exist |
| 293 | rigorous-limits | Rigorous limits: epsilon and N, epsilon and delta | RA | concept | guarantees for algorithms |
| 294 | mean-value-and-taylor-theorems | The mean value and Taylor theorems | RA | concept | proving error bounds |
| 295 | uniform-convergence | Uniform convergence | RA | py | when limits of functions behave |
| 296 | metric-spaces | Metric spaces | RA TOP | concept | distance in general |
| 297 | tensors | Tensors and Einstein summation | TEN LA | py | stress, inertia and einsum |
| 298 | curves-curvature-torsion | Curves: curvature and torsion | DG | req | smooth toolpaths and roads |
| 299 | surfaces-and-geodesics | Surfaces, normals and geodesics | DG | req | shortest paths on surfaces |
| 300 | computational-geometry | Computational geometry | CG | py | point in polygon, convex hulls |
| 301 | bezier-and-b-splines | Bézier curves and B-splines | CG NUM | req | CAD curves |
| 302 | fractals | Fractals and dimension | DYN GEO | req | coastlines and Mandelbrot |
| 303 | capstone-physics-engine | Capstone: a physics engine | PHYS ODE NUM | req | |
| 304 | capstone-vibrating-machine | Capstone: modelling a vibrating machine | ODE LA SIG | py+om | |
| 305 | capstone-sensor-signal | Capstone: analysing a sensor signal | SIG STAT | req | |
| 306 | capstone-robot-arm | Capstone: solving a robot arm | MG MV OPT | req | |
| 307 | capstone-cad-kernel | Capstone: a small CAD geometry kernel | CG GEO NUM | req | |
| 308 | capstone-fitting-a-model | Capstone: fitting a physical model to data | STAT OPT | req | |
| 309 | capstone-heat-treatment | Capstone: simulating heat treatment | PDE NUM | py+om | |
| 310 | capstone-investigation | Capstone: an engineering investigation | all | req | |

## Infrastructure

Lessons use the existing Notebook Lab and Pyodide notebook. The one extension this series needs is runnable OpenMAT cells inside a lesson, described under "Lesson format and standard". Lesson metadata beyond the manifest (threads, mode, application) is recorded in the tables above and, for the app, in `src/tools/notebook-lab/series/mathCatalog.js` once the "related lessons" view is built.
