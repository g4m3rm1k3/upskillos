// Greek letters in mathematics: what each one is commonly used for, with the equation it
// appears in, every symbol of that equation explained, and a worked example with numbers.
// Rendered by src/pages/GreekLettersReferencePage.jsx; checked by greek-letters-data.test.js
// (every formula renders, every link points somewhere).
//
// The point of the page: a Greek letter is not a definition. Its meaning comes from where
// it is defined. So each letter lists several meanings, and `beware` says which ones are
// easy to mix up.
//
// Fields per letter:
//   id, symbol, name, say (pronunciation), tex (LaTeX command), case ('lower' | 'upper'),
//   partner (id of the other case, if that has its own entry), variants (other shapes of
//   the same letter), frequency ('common' | 'field' | 'rare'), keywords (extra search words),
//   meanings: [{ field, role, latex, parts: [[symbol latex, what it is]], example, note }],
//     example: { given, steps: [latex], result } (all optional except given/steps)
//   beware (text)

const L = String.raw

export const FIELDS = [
  'Geometry', 'Algebra', 'Calculus', 'Linear algebra', 'Statistics', 'Probability',
  'Number theory', 'Physics', 'Computer science', 'Machine learning', 'Set theory',
]

export const FREQUENCY_LABELS = {
  common: 'Very common',
  field: 'Common in particular fields',
  rare: 'Rarely used',
}

export const GREEK_LETTERS = [
  // ── α ──────────────────────────────────────────────────────────────────────
  {
    id: 'alpha', symbol: 'α', name: 'alpha', say: 'AL-fuh', tex: L`\alpha`, case: 'lower', frequency: 'common',
    keywords: ['learning rate', 'step size', 'significance level', 'exponent'],
    meanings: [
      {
        field: 'Geometry', role: 'An angle',
        latex: L`\alpha + \beta + \gamma = 180^\circ`,
        parts: [[L`\alpha,\ \beta,\ \gamma`, 'the three angles of a triangle, named with the first three Greek letters'], [L`180^\circ`, 'what the angles of any triangle add up to']],
        example: { given: 'Two angles of a triangle are 50° and 60°. Find the third.', steps: [L`\gamma = 180^\circ - \alpha - \beta`, L`\gamma = 180^\circ - 50^\circ - 60^\circ = 70^\circ`] },
        note: 'The letters are only names. A triangle labelled with A, B, C would mean exactly the same.',
      },
      {
        field: 'Algebra', role: 'An exponent or parameter that sets the shape of a function',
        latex: L`f(x) = x^{\alpha}`,
        parts: [[L`x`, 'the input'], [L`\alpha`, 'a fixed number chosen in advance, not an input']],
        example: { given: 'Try different values of α.', steps: [L`\alpha = 2:\quad f(x) = x^2 \text{ (a parabola)}`, L`\alpha = \tfrac12:\quad f(x) = \sqrt{x}`, L`\alpha = -1:\quad f(x) = \tfrac{1}{x}`] },
        note: 'A parameter is a number you choose once and then keep fixed while the variable x changes.',
      },
      {
        field: 'Statistics', role: 'The significance level of a hypothesis test',
        latex: L`\text{reject } H_0 \text{ if } p < \alpha`,
        parts: [[L`H_0`, 'the null hypothesis, the "nothing is going on" claim'], [L`p`, 'the p-value: how surprising the data would be if H₀ were true'], [L`\alpha`, 'the cut-off chosen before looking at the data, often 0.05']],
        example: { given: 'A test gives p = 0.03, and α = 0.05 was chosen beforehand.', steps: [L`0.03 < 0.05`], result: 'So H₀ is rejected. α is also the chance of rejecting H₀ when it is actually true (a Type I error).' },
      },
      {
        field: 'Machine learning', role: 'The learning rate (step size) of an update',
        latex: L`Q(s,a) \leftarrow Q(s,a) + \alpha\,\big[\,\text{target} - Q(s,a)\,\big]`,
        parts: [[L`Q(s,a)`, 'the current estimate of the value of action a in state s'], [L`\text{target}`, 'what this one experience suggests the value should be'], [L`\alpha`, 'how far to move toward the target, between 0 and 1'], [L`\leftarrow`, '"replace with": the left side gets the value on the right']],
        example: { given: 'Q(s,a) = 2, the target is 5, α = 0.1.', steps: [L`Q \leftarrow 2 + 0.1\,(5 - 2) = 2 + 0.3 = 2.3`], result: 'α = 1 would jump straight to 5; α = 0 would never learn.' },
        note: 'This is Q-learning\'s update. In gradient descent the same role is often written η.',
      },
    ],
    beware: 'α as an angle, a significance level and a learning rate are three unrelated things. The surrounding text always says which.',
  },
  // ── β ──────────────────────────────────────────────────────────────────────
  {
    id: 'beta', symbol: 'β', name: 'beta', say: 'BAY-tuh (UK: BEE-tuh)', tex: L`\beta`, case: 'lower', frequency: 'common',
    keywords: ['regression coefficient', 'slope', 'intercept', 'type II error', 'power', 'beta distribution'],
    meanings: [
      {
        field: 'Geometry', role: 'An angle', latex: L`\alpha + \beta = 90^\circ`,
        parts: [[L`\alpha,\ \beta`, 'the two acute angles of a right triangle']],
        example: { given: 'In a right triangle, α = 35°.', steps: [L`\beta = 90^\circ - 35^\circ = 55^\circ`] },
      },
      {
        field: 'Statistics', role: 'Coefficients of a regression model',
        latex: L`y = \beta_0 + \beta_1 x + \varepsilon`,
        parts: [[L`y`, 'the quantity being predicted'], [L`x`, 'the input'], [L`\beta_0`, 'the intercept: y when x = 0'], [L`\beta_1`, 'the slope: how much y changes when x grows by 1'], [L`\varepsilon`, 'the error: what the line doesn\'t explain']],
        example: { given: 'β₀ = 1, β₁ = 2. Predict y at x = 3 (ignoring the error).', steps: [L`\hat y = 1 + 2 \cdot 3 = 7`], result: 'The hat on ŷ marks a prediction rather than a measured value.' },
      },
      {
        field: 'Statistics', role: 'The probability of a Type II error',
        latex: L`\text{power} = 1 - \beta`,
        parts: [[L`\beta`, 'the chance of NOT rejecting H₀ when it is actually false'], [L`1-\beta`, 'the power: the chance of detecting a real effect']],
        example: { given: 'A study is designed with β = 0.2.', steps: [L`\text{power} = 1 - 0.2 = 0.8`], result: 'An 80% chance of detecting the effect if it is real.' },
      },
      {
        field: 'Probability', role: 'A parameter of the beta distribution',
        latex: L`X \sim \mathrm{Beta}(\alpha, \beta), \qquad \mathbb{E}[X] = \frac{\alpha}{\alpha + \beta}`,
        parts: [[L`X`, 'a random number between 0 and 1, such as an unknown probability'], [L`\sim`, '"is distributed as"'], [L`\alpha,\ \beta`, 'two positive shape parameters'], [L`\mathbb{E}[X]`, 'the expected (average) value']],
        example: { given: 'α = 2, β = 3.', steps: [L`\mathbb{E}[X] = \frac{2}{2+3} = 0.4`] },
      },
    ],
    beware: 'β₀ and β₁ in a regression are not "the angle β". Subscripts number a family of related constants.',
  },
  // ── γ ──────────────────────────────────────────────────────────────────────
  {
    id: 'gamma', symbol: 'γ', name: 'gamma', say: 'GAM-uh', tex: L`\gamma`, case: 'lower', partner: 'Gamma', frequency: 'common',
    keywords: ['discount factor', 'euler-mascheroni', 'lorentz factor'],
    meanings: [
      {
        field: 'Geometry', role: 'An angle', latex: L`\gamma = 180^\circ - \alpha - \beta`,
        parts: [[L`\gamma`, 'the third angle of a triangle']],
      },
      {
        field: 'Machine learning', role: 'The discount factor in reinforcement learning',
        latex: L`G = r_1 + \gamma\, r_2 + \gamma^2 r_3 + \cdots`,
        parts: [[L`G`, 'the return: the total reward from now on'], [L`r_1, r_2, r_3`, 'the rewards one, two, three steps from now'], [L`\gamma`, 'between 0 and 1: how much a reward one step later is worth compared with now']],
        example: { given: 'Rewards 1, 1, 1 and γ = 0.9.', steps: [L`G = 1 + 0.9 \cdot 1 + 0.9^2 \cdot 1`, L`G = 1 + 0.9 + 0.81 = 2.71`], result: 'With γ = 0 only the next reward counts; near 1, distant rewards count almost fully.' },
      },
      {
        field: 'Calculus', role: 'The Euler–Mascheroni constant',
        latex: L`\gamma = \lim_{n\to\infty}\left(1 + \tfrac12 + \tfrac13 + \cdots + \tfrac1n - \ln n\right) \approx 0.5772`,
        parts: [[L`1 + \tfrac12 + \cdots + \tfrac1n`, 'the harmonic sum, which grows without limit'], [L`\ln n`, 'the natural logarithm, which grows at almost the same rate'], [L`\gamma`, 'the gap between them, which settles to a fixed number']],
      },
      {
        field: 'Physics', role: 'The Lorentz factor of special relativity',
        latex: L`\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}`,
        parts: [[L`v`, 'speed of the moving object'], [L`c`, 'speed of light']],
        example: { given: 'v = 0.6c.', steps: [L`\gamma = \frac{1}{\sqrt{1 - 0.36}} = \frac{1}{0.8} = 1.25`], result: 'A moving clock runs 1.25 times slower as seen from the rest frame.' },
      },
    ],
    beware: 'Lowercase γ (a constant, angle or factor) and uppercase Γ (usually the gamma function) are different symbols.',
  },
  {
    id: 'Gamma', symbol: 'Γ', name: 'Gamma (capital)', say: 'GAM-uh', tex: L`\Gamma`, case: 'upper', partner: 'gamma', frequency: 'field',
    keywords: ['gamma function', 'factorial'],
    meanings: [
      {
        field: 'Calculus', role: 'The gamma function: factorials for non-whole numbers',
        latex: L`\Gamma(n) = (n-1)! \quad\text{for whole } n \ge 1, \qquad \Gamma(z) = \int_0^\infty t^{z-1} e^{-t}\, dt`,
        parts: [[L`\Gamma`, 'the name of a function, not a variable'], [L`(n-1)!`, 'the factorial: 1 · 2 · … · (n − 1)'], [L`\int_0^\infty`, 'the integral that defines it for any positive number z']],
        example: { given: 'Evaluate Γ(5) and Γ(½).', steps: [L`\Gamma(5) = 4! = 24`, L`\Gamma\!\left(\tfrac12\right) = \sqrt{\pi} \approx 1.772`], result: 'The integral gives values between the factorials, so "½ factorial" makes sense: Γ(3/2) = √π/2.' },
        note: 'The shift by one (Γ(n) = (n−1)!, not n!) is a historical convention.',
      },
      {
        field: 'Calculus', role: 'A path in the plane (complex analysis)',
        latex: L`\oint_{\Gamma} f(z)\,dz`,
        parts: [[L`\Gamma`, 'the closed curve the integral goes around'], [L`\oint`, 'an integral around a closed curve']],
      },
    ],
    beware: 'Γ(x) followed by brackets is almost always the gamma function, not "Γ times x".',
  },
  // ── δ / Δ ──────────────────────────────────────────────────────────────────
  {
    id: 'delta', symbol: 'δ', name: 'delta', say: 'DEL-tuh', tex: L`\delta`, case: 'lower', partner: 'Delta', frequency: 'common',
    keywords: ['small change', 'kronecker', 'dirac', 'td error', 'tolerance'],
    meanings: [
      {
        field: 'Calculus', role: 'A small distance in the ε–δ definition of a limit',
        latex: L`|x - a| < \delta \;\Rightarrow\; |f(x) - L| < \varepsilon`,
        parts: [[L`\varepsilon`, 'how close f(x) must get to the limit L (chosen first, any positive size)'], [L`\delta`, 'how close x must be to a to guarantee that'], [L`\Rightarrow`, '"implies"']],
        example: { given: 'Show f(x) = 2x tends to 2 as x → 1.', steps: [L`|2x - 2| = 2|x - 1|`, L`2|x-1| < \varepsilon \iff |x - 1| < \tfrac{\varepsilon}{2}`, L`\text{choose } \delta = \tfrac{\varepsilon}{2}:\ \ \varepsilon = 0.01 \Rightarrow \delta = 0.005`], result: 'Whatever ε someone demands, there is a δ that works. That is what the limit means.' },
      },
      {
        field: 'Linear algebra', role: 'The Kronecker delta',
        latex: L`\delta_{ij} = \begin{cases} 1 & i = j \\ 0 & i \ne j \end{cases}`,
        parts: [[L`i, j`, 'two whole-number indices'], [L`\delta_{ij}`, '1 when they are equal, 0 otherwise: the entries of the identity matrix']],
        example: { given: 'Evaluate two entries.', steps: [L`\delta_{22} = 1, \qquad \delta_{23} = 0`] },
      },
      {
        field: 'Physics', role: 'The Dirac delta: an infinitely sharp spike',
        latex: L`\int_{-\infty}^{\infty} f(x)\,\delta(x - a)\,dx = f(a)`,
        parts: [[L`\delta(x-a)`, 'zero everywhere except at x = a, with total area 1'], [L`f(a)`, 'the integral picks out f\'s value at a']],
        example: { given: 'f(x) = x², a = 3.', steps: [L`\int x^2\,\delta(x - 3)\,dx = 3^2 = 9`] },
      },
      {
        field: 'Machine learning', role: 'The temporal-difference (TD) error',
        latex: L`\delta = r + \gamma\,V(s') - V(s)`,
        parts: [[L`r`, 'the reward just received'], [L`\gamma`, 'the discount factor'], [L`V(s'),\ V(s)`, 'the value estimates of the next state and the current state'], [L`\delta`, 'how much better or worse things went than expected']],
        example: { given: 'r = 1, γ = 0.9, V(s′) = 2, V(s) = 2.5.', steps: [L`\delta = 1 + 0.9 \cdot 2 - 2.5 = 0.3`], result: 'Positive: slightly better than expected, so V(s) is nudged up.' },
      },
    ],
    beware: 'Lowercase δ usually means something small or a specific function; capital Δ usually means a change or a named quantity. Don\'t swap them.',
  },
  {
    id: 'Delta', symbol: 'Δ', name: 'Delta (capital)', say: 'DEL-tuh', tex: L`\Delta`, case: 'upper', partner: 'delta', frequency: 'common',
    keywords: ['change', 'difference', 'discriminant', 'laplacian', 'slope', 'triangle'],
    meanings: [
      {
        field: 'Algebra', role: 'A change: "new value minus old value"',
        latex: L`\Delta x = x_2 - x_1, \qquad \text{slope} = \frac{\Delta y}{\Delta x}`,
        parts: [[L`x_1, x_2`, 'the starting and ending values'], [L`\Delta x`, 'read "delta x": one symbol, not Δ times x']],
        example: { given: 'A line goes through (1, 2) and (4, 8).', steps: [L`\Delta x = 4 - 1 = 3,\quad \Delta y = 8 - 2 = 6`, L`\text{slope} = \frac{6}{3} = 2`] },
      },
      {
        field: 'Algebra', role: 'The discriminant of a quadratic',
        latex: L`\Delta = b^2 - 4ac \quad\text{for}\quad ax^2 + bx + c = 0`,
        parts: [[L`a, b, c`, 'the coefficients of the quadratic'], [L`\Delta > 0`, 'two real roots'], [L`\Delta = 0`, 'one repeated root'], [L`\Delta < 0`, 'no real roots']],
        example: { given: 'x² − 5x + 6 = 0, so a = 1, b = −5, c = 6.', steps: [L`\Delta = (-5)^2 - 4\cdot1\cdot6 = 25 - 24 = 1 > 0`], result: 'Two real roots: x = 2 and x = 3. This Δ has nothing to do with change.' },
      },
      {
        field: 'Calculus', role: 'The Laplacian (sum of second derivatives)',
        latex: L`\Delta f = \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2}`,
        parts: [[L`\partial`, 'a partial derivative'], [L`\Delta f`, 'also written ∇²f']],
        example: { given: 'f(x, y) = x² + y².', steps: [L`\Delta f = 2 + 2 = 4`] },
      },
      {
        field: 'Geometry', role: 'A triangle',
        latex: L`\triangle ABC`,
        parts: [[L`A, B, C`, 'the corners']],
        note: 'Strictly this is the triangle sign △, which looks almost the same as Δ.',
      },
    ],
    beware: 'Do not assume Δ means "change". In ax² + bx + c it is the discriminant; in a PDE it is the Laplacian. Read the surrounding mathematics.',
  },
  // ── ε ──────────────────────────────────────────────────────────────────────
  {
    id: 'epsilon', symbol: 'ε', name: 'epsilon', say: 'EP-sih-lon', tex: L`\varepsilon`, case: 'lower', frequency: 'common',
    variants: [{ symbol: 'ϵ', tex: L`\epsilon`, note: 'The same letter in another shape. LaTeX\'s \\epsilon gives ϵ and \\varepsilon gives ε; authors pick one.' }],
    keywords: ['small number', 'error', 'tolerance', 'epsilon-greedy', 'machine epsilon', 'permittivity'],
    meanings: [
      {
        field: 'Calculus', role: 'An arbitrarily small positive number',
        latex: L`\forall\, \varepsilon > 0\ \exists\, \delta > 0 : \ |x-a|<\delta \Rightarrow |f(x)-L|<\varepsilon`,
        parts: [[L`\forall`, '"for every"'], [L`\exists`, '"there exists"'], [L`\varepsilon`, 'a tolerance someone else chooses: as small as they like, but positive']],
        note: 'See δ for a worked example. The idea: a statement holds however small ε is made.',
      },
      {
        field: 'Statistics', role: 'The error (noise) term of a model',
        latex: L`y = \beta_0 + \beta_1 x + \varepsilon`,
        parts: [[L`\varepsilon`, 'the part of y the model doesn\'t explain; assumed random with mean 0']],
      },
      {
        field: 'Machine learning', role: 'The exploration rate of ε-greedy',
        latex: L`a = \begin{cases} \text{a random action} & \text{with probability } \varepsilon \\ \arg\max_a Q(s,a) & \text{otherwise} \end{cases}`,
        parts: [[L`\arg\max_a Q(s,a)`, 'the action with the highest estimated value'], [L`\varepsilon`, 'how often to explore instead']],
        example: { given: 'ε = 0.1 with 4 possible actions.', steps: [L`P(\text{best action}) = (1 - 0.1) + \tfrac{0.1}{4} = 0.925`], result: 'Not 0.9: the random choice can also land on the best action.' },
      },
      {
        field: 'Computer science', role: 'Machine epsilon: the precision of floating point',
        latex: L`\varepsilon_{\text{mach}} = 2^{-52} \approx 2.22 \times 10^{-16}`,
        parts: [[L`\varepsilon_{\text{mach}}`, 'the gap between 1 and the next larger 64-bit float']],
        note: 'Why 0.1 + 0.2 == 0.3 is false in most languages: compare floats within a tolerance instead.',
      },
      {
        field: 'Physics', role: 'Permittivity', latex: L`\varepsilon_0 \approx 8.854 \times 10^{-12}\ \text{F/m}`,
        parts: [[L`\varepsilon_0`, 'the permittivity of free space, a physical constant']],
      },
    ],
    beware: 'ε is not ∈. The "element of" sign ∈ (x ∈ A, "x is in set A") is a different symbol that happens to look like ε.',
  },
  // ── ζ ──────────────────────────────────────────────────────────────────────
  {
    id: 'zeta', symbol: 'ζ', name: 'zeta', say: 'ZAY-tuh', tex: L`\zeta`, case: 'lower', frequency: 'field',
    keywords: ['riemann zeta', 'damping ratio'],
    meanings: [
      {
        field: 'Number theory', role: 'The Riemann zeta function',
        latex: L`\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s}`,
        parts: [[L`\sum_{n=1}^{\infty}`, 'add the terms for n = 1, 2, 3, … forever'], [L`s`, 'the input (a real number above 1 for this sum)']],
        example: { given: 'Euler\'s result for s = 2.', steps: [L`\zeta(2) = 1 + \tfrac14 + \tfrac19 + \cdots = \frac{\pi^2}{6} \approx 1.645`] },
      },
      {
        field: 'Physics', role: 'The damping ratio of an oscillator',
        latex: L`\zeta < 1:\ \text{underdamped}, \quad \zeta = 1:\ \text{critically damped}, \quad \zeta > 1:\ \text{overdamped}`,
        parts: [[L`\zeta`, 'how quickly oscillations die out']],
        note: 'A door closer is tuned near ζ = 1: it shuts quickly without swinging back.',
      },
    ],
  },
  // ── η ──────────────────────────────────────────────────────────────────────
  {
    id: 'eta', symbol: 'η', name: 'eta', say: 'AY-tuh (UK: EE-tuh)', tex: L`\eta`, case: 'lower', frequency: 'field',
    keywords: ['learning rate', 'efficiency', 'viscosity', 'gradient descent'],
    meanings: [
      {
        field: 'Machine learning', role: 'The learning rate of gradient descent',
        latex: L`\theta \leftarrow \theta - \eta\, \nabla L(\theta)`,
        parts: [[L`\theta`, 'the model\'s parameters'], [L`\nabla L(\theta)`, 'the gradient of the loss: which way the error increases fastest'], [L`\eta`, 'the step size']],
        example: { given: 'θ = 4, gradient 2, η = 0.1.', steps: [L`\theta \leftarrow 4 - 0.1 \cdot 2 = 3.8`] },
      },
      {
        field: 'Physics', role: 'Efficiency',
        latex: L`\eta = \frac{\text{useful energy out}}{\text{energy in}}`,
        parts: [[L`\eta`, 'a number between 0 and 1, often given as a percentage']],
        example: { given: 'A motor takes in 100 J and delivers 30 J of work.', steps: [L`\eta = \frac{30}{100} = 0.3 = 30\%`] },
      },
      { field: 'Physics', role: 'Viscosity of a fluid', latex: L`\eta`, parts: [[L`\eta`, 'resistance to flow: honey has a much larger η than water']] },
    ],
    beware: 'η looks like the Latin n with a long tail. In handwriting, make the tail obvious.',
  },
  // ── θ / Θ ──────────────────────────────────────────────────────────────────
  {
    id: 'theta', symbol: 'θ', name: 'theta', say: 'THAY-tuh (UK: THEE-tuh)', tex: L`\theta`, case: 'lower', partner: 'Theta', frequency: 'common',
    variants: [{ symbol: 'ϑ', tex: L`\vartheta`, note: 'Another shape of theta, written in one stroke. Same letter.' }],
    keywords: ['angle', 'polar coordinates', 'parameters', 'model parameters'],
    meanings: [
      {
        field: 'Geometry', role: 'An angle', latex: L`\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}}`,
        parts: [[L`\theta`, 'the angle the sides are measured from']],
        example: { given: 'θ = 30°.', steps: [L`\sin 30^\circ = \tfrac12`] },
      },
      {
        field: 'Geometry', role: 'The angle of polar coordinates',
        latex: L`x = r\cos\theta, \qquad y = r\sin\theta`,
        parts: [[L`r`, 'the distance from the origin'], [L`\theta`, 'the angle from the positive x-axis'], [L`x, y`, 'the ordinary (Cartesian) coordinates']],
        example: { given: 'r = 2, θ = π/3 (60°).', steps: [L`x = 2\cos\tfrac{\pi}{3} = 2 \cdot \tfrac12 = 1`, L`y = 2\sin\tfrac{\pi}{3} = 2 \cdot \tfrac{\sqrt3}{2} = \sqrt3`] },
        note: 'In spherical coordinates, mathematicians and physicists swap the roles of θ and φ. Always check the author\'s definition.',
      },
      {
        field: 'Statistics', role: 'The parameters of a model',
        latex: L`\hat y = f(x;\, \theta), \qquad \hat\theta = \text{an estimate of } \theta`,
        parts: [[L`x`, 'the input'], [L`\theta`, 'all the numbers the model learns, collected into one symbol'], [L`;`, 'separates inputs (before) from parameters (after)'], [L`\hat\theta`, 'theta-hat: a value estimated from data']],
      },
    ],
  },
  {
    id: 'Theta', symbol: 'Θ', name: 'Theta (capital)', say: 'THAY-tuh', tex: L`\Theta`, case: 'upper', partner: 'theta', frequency: 'field',
    keywords: ['big theta', 'asymptotic', 'complexity', 'tight bound'],
    meanings: [
      {
        field: 'Computer science', role: 'Big Theta: growth rate, bounded above and below',
        latex: L`f(n) = \Theta(g(n)) \iff c_1 g(n) \le f(n) \le c_2 g(n) \text{ for large } n`,
        parts: [[L`n`, 'the size of the input'], [L`c_1, c_2`, 'positive constants'], [L`\Theta(g(n))`, '"grows at the same rate as g, up to constant factors"']],
        example: { given: 'f(n) = 3n² + 5n.', steps: [L`3n^2 \le 3n^2 + 5n \le 8n^2 \text{ for } n \ge 1`, L`\Rightarrow\ 3n^2 + 5n = \Theta(n^2)`] },
      },
    ],
    beware: 'Big O gives an upper bound only, Big Ω a lower bound only, Big Θ both.',
  },
  // ── ι ──────────────────────────────────────────────────────────────────────
  {
    id: 'iota', symbol: 'ι', name: 'iota', say: 'eye-OH-tuh', tex: L`\iota`, case: 'lower', frequency: 'rare',
    keywords: ['inclusion map'],
    meanings: [
      {
        field: 'Set theory', role: 'An inclusion map', latex: L`\iota : \mathbb{Z} \to \mathbb{R}, \quad \iota(n) = n`,
        parts: [[L`\mathbb{Z},\ \mathbb{R}`, 'the integers and the real numbers'], [L`\iota`, 'sends each integer to itself, now seen as a real number']],
      },
    ],
    beware: 'Rare, because ι is easily mistaken for i or the dotless ı. "Not one iota" comes from it being the smallest Greek letter.',
  },
  // ── κ ──────────────────────────────────────────────────────────────────────
  {
    id: 'kappa', symbol: 'κ', name: 'kappa', say: 'KAP-uh', tex: L`\kappa`, case: 'lower', frequency: 'field',
    variants: [{ symbol: 'ϰ', tex: L`\varkappa`, note: 'A rarer shape of kappa.' }],
    keywords: ['curvature', 'condition number'],
    meanings: [
      {
        field: 'Calculus', role: 'Curvature: how sharply a curve bends',
        latex: L`\kappa = \frac{1}{R}`,
        parts: [[L`R`, 'the radius of the circle that best fits the curve at that point']],
        example: { given: 'A circle of radius 4.', steps: [L`\kappa = \tfrac14 = 0.25`], result: 'A straight line has κ = 0; a tight bend has large κ.' },
      },
      {
        field: 'Linear algebra', role: 'The condition number of a matrix',
        latex: L`\kappa(A) = \|A\|\,\|A^{-1}\|`,
        parts: [[L`\|A\|`, 'a norm: the largest factor by which A stretches a vector'], [L`\kappa(A)`, 'how much errors in the input can be magnified when solving Ax = b']],
        example: { given: 'A = diag(10, 0.1).', steps: [L`\|A\| = 10,\quad \|A^{-1}\| = 10`, L`\kappa(A) = 100`], result: 'Input errors can grow up to 100 times. κ near 1 is well-conditioned.' },
      },
    ],
    beware: 'κ and the Latin k look alike, and both are used for constants. Check the definition.',
  },
  // ── λ / Λ ──────────────────────────────────────────────────────────────────
  {
    id: 'lambda', symbol: 'λ', name: 'lambda', say: 'LAM-duh', tex: L`\lambda`, case: 'lower', partner: 'Lambda', frequency: 'common',
    keywords: ['eigenvalue', 'wavelength', 'decay rate', 'rate', 'poisson', 'lagrange multiplier', 'anonymous function', 'regularization'],
    meanings: [
      {
        field: 'Linear algebra', role: 'An eigenvalue',
        latex: L`A\mathbf{v} = \lambda \mathbf{v}`,
        parts: [[L`A`, 'a square matrix'], [L`\mathbf{v}`, 'an eigenvector: a non-zero vector whose direction A doesn\'t change'], [L`\lambda`, 'the eigenvalue: the factor A stretches v by']],
        example: { given: 'A = [[2, 0], [0, 3]], v = (1, 0).', steps: [L`A\mathbf{v} = (2, 0) = 2\,(1, 0)`, L`\Rightarrow\ \lambda = 2`] },
      },
      {
        field: 'Physics', role: 'Wavelength', latex: L`v = f\lambda`,
        parts: [[L`v`, 'wave speed'], [L`f`, 'frequency'], [L`\lambda`, 'the distance between two crests']],
        example: { given: 'Sound at 340 m/s with frequency 170 Hz.', steps: [L`\lambda = \frac{v}{f} = \frac{340}{170} = 2\ \text{m}`] },
      },
      {
        field: 'Calculus', role: 'A rate of exponential decay',
        latex: L`N(t) = N_0\, e^{-\lambda t}, \qquad t_{1/2} = \frac{\ln 2}{\lambda}`,
        parts: [[L`N_0`, 'the starting amount'], [L`t`, 'time'], [L`\lambda`, 'the decay rate'], [L`t_{1/2}`, 'the half-life']],
        example: { given: 'λ = 0.1 per year.', steps: [L`t_{1/2} = \frac{0.693}{0.1} \approx 6.93 \text{ years}`] },
      },
      {
        field: 'Probability', role: 'The rate (and mean) of a Poisson distribution',
        latex: L`P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}`,
        parts: [[L`X`, 'how many events happen in a fixed interval'], [L`\lambda`, 'the average number of events per interval']],
        example: { given: 'On average λ = 2 emails arrive per hour. Chance of none?', steps: [L`P(X = 0) = e^{-2} \approx 0.135`] },
      },
      {
        field: 'Computer science', role: 'An anonymous function (lambda calculus)',
        latex: L`(\lambda x.\ x + 1)\ 4 = 5`,
        parts: [[L`\lambda x.`, '"a function of x that returns…"'], [L`x + 1`, 'the body'], [L`4`, 'the argument it is applied to']],
        note: 'This is where Python\'s lambda and JavaScript\'s arrow functions come from.',
      },
      {
        field: 'Calculus', role: 'A Lagrange multiplier', latex: L`\nabla f = \lambda\, \nabla g`,
        parts: [[L`f`, 'what is optimised'], [L`g`, 'the constraint'], [L`\lambda`, 'a helper unknown; its value says how much the optimum would change if the constraint were loosened']],
      },
    ],
    beware: 'λ is one of the most overloaded letters. Eigenvalue, wavelength, rate, multiplier and function are all unrelated.',
  },
  {
    id: 'Lambda', symbol: 'Λ', name: 'Lambda (capital)', say: 'LAM-duh', tex: L`\Lambda`, case: 'upper', partner: 'lambda', frequency: 'field',
    keywords: ['eigenvalue matrix', 'diagonalization', 'cosmological constant'],
    meanings: [
      {
        field: 'Linear algebra', role: 'The diagonal matrix of eigenvalues',
        latex: L`A = Q \Lambda Q^{-1}, \qquad \Lambda = \begin{pmatrix} \lambda_1 & 0 \\ 0 & \lambda_2 \end{pmatrix}`,
        parts: [[L`Q`, 'a matrix whose columns are eigenvectors'], [L`\Lambda`, 'the eigenvalues on the diagonal, zeros elsewhere']],
      },
      { field: 'Physics', role: 'The cosmological constant', latex: L`\Lambda`, parts: [[L`\Lambda`, 'the energy density of empty space in Einstein\'s equations']] },
    ],
  },
  // ── μ ──────────────────────────────────────────────────────────────────────
  {
    id: 'mu', symbol: 'μ', name: 'mu', say: 'MYOO', tex: L`\mu`, case: 'lower', frequency: 'common',
    keywords: ['mean', 'average', 'expected value', 'measure', 'friction', 'micro'],
    meanings: [
      {
        field: 'Statistics', role: 'The population mean',
        latex: L`\mu = \frac{1}{N}\sum_{i=1}^{N} x_i`,
        parts: [[L`N`, 'the number of observations'], [L`\sum_{i=1}^{N}`, 'add up for i = 1 to N'], [L`i`, 'the index: which observation'], [L`x_i`, 'the i-th observation'], [L`\mu`, 'the result: the mean']],
        example: { given: 'The population is 2, 4, 6, 8.', steps: [L`\mu = \tfrac14\,(2 + 4 + 6 + 8)`, L`\mu = \tfrac{20}{4} = 5`], result: 'Add everything, divide by how many there are.' },
        note: 'μ is the mean of a whole population; the mean of a sample is written x̄ ("x-bar").',
      },
      {
        field: 'Physics', role: 'The coefficient of friction', latex: L`F_f = \mu N`,
        parts: [[L`F_f`, 'the friction force'], [L`N`, 'the normal force pressing the surfaces together'], [L`\mu`, 'a number for the pair of surfaces, no units']],
        example: { given: 'μ = 0.4 and N = 50 N.', steps: [L`F_f = 0.4 \times 50 = 20\ \text{N}`] },
      },
      {
        field: 'Calculus', role: 'A measure (size of a set)', latex: L`\mu([a, b]) = b - a`,
        parts: [[L`\mu`, 'assigns a size to sets; here, length (Lebesgue measure)']],
        example: { given: 'The interval [2, 5].', steps: [L`\mu([2,5]) = 5 - 2 = 3`] },
      },
      {
        field: 'Physics', role: 'The prefix micro- (one millionth)', latex: L`1\ \mu\text{m} = 10^{-6}\ \text{m}`,
        parts: [[L`\mu\text{m}`, 'micrometre: here μ is part of a unit, not a variable']],
      },
    ],
    beware: 'μ in statistics is a mean; in physics it may be friction or a unit prefix. Even inside statistics, μ is the population mean, not the sample mean x̄.',
  },
  // ── ν ──────────────────────────────────────────────────────────────────────
  {
    id: 'nu', symbol: 'ν', name: 'nu', say: 'NYOO', tex: L`\nu`, case: 'lower', frequency: 'field',
    keywords: ['frequency', 'degrees of freedom', 'poisson ratio'],
    meanings: [
      {
        field: 'Physics', role: 'Frequency (especially of light)', latex: L`E = h\nu`,
        parts: [[L`E`, 'the energy of one photon'], [L`h`, 'Planck\'s constant'], [L`\nu`, 'the light\'s frequency']],
      },
      {
        field: 'Statistics', role: 'Degrees of freedom', latex: L`\nu = n - 1`,
        parts: [[L`n`, 'the sample size'], [L`\nu`, 'how many values are free to vary, used to choose the t-distribution']],
        example: { given: 'A t-test on a sample of 10.', steps: [L`\nu = 10 - 1 = 9`] },
      },
    ],
    beware: 'ν (nu) looks almost exactly like the Latin v, which is also used for velocity. Read the definition.',
  },
  // ── ξ / Ξ ──────────────────────────────────────────────────────────────────
  {
    id: 'xi', symbol: 'ξ', name: 'xi', say: 'ksee or zy', tex: L`\xi`, case: 'lower', partner: 'Xi', frequency: 'field',
    keywords: ['mean value theorem', 'random variable', 'some point'],
    meanings: [
      {
        field: 'Calculus', role: '"Some point in between" (mean value theorem)',
        latex: L`f(b) - f(a) = f'(\xi)\,(b - a) \quad\text{for some } \xi \in (a, b)`,
        parts: [[L`f'(\xi)`, 'the slope of f at the point ξ'], [L`\xi`, 'a point whose existence is guaranteed, though its exact value may be unknown']],
        example: { given: 'f(x) = x² on [0, 2].', steps: [L`f(2) - f(0) = 4`, L`f'(\xi)\,(2 - 0) = 2\xi \cdot 2 = 4\xi`, L`4\xi = 4 \Rightarrow \xi = 1`] },
      },
      { field: 'Probability', role: 'A random variable', latex: L`\mathbb{E}[\xi]`, parts: [[L`\xi`, 'a random quantity, in some (especially Russian-tradition) texts where others write X']] },
    ],
    beware: 'ξ is hard to write by hand; practise it as a squiggle with three bumps.',
  },
  {
    id: 'Xi', symbol: 'Ξ', name: 'Xi (capital)', say: 'ksee', tex: L`\Xi`, case: 'upper', partner: 'xi', frequency: 'rare',
    meanings: [{ field: 'Physics', role: 'The grand canonical partition function (statistical mechanics)', latex: L`\Xi`, parts: [[L`\Xi`, 'sums over all states of a system that can exchange particles and energy']] }],
  },
  // ── ο ──────────────────────────────────────────────────────────────────────
  {
    id: 'omicron', symbol: 'ο', name: 'omicron', say: 'OM-ih-kron', tex: L`o`, case: 'lower', frequency: 'rare',
    meanings: [{ field: 'Computer science', role: 'Practically never used', latex: L`o`, parts: [[L`o`, 'omicron looks identical to the Latin o, so mathematicians avoid it. LaTeX has no \\omicron: you type o.']] }],
    beware: 'Little-o notation, f = o(g), uses the Latin letter o, not omicron.',
  },
  // ── π / Π ──────────────────────────────────────────────────────────────────
  {
    id: 'pi', symbol: 'π', name: 'pi', say: 'PIE', tex: L`\pi`, case: 'lower', partner: 'Pi', frequency: 'common',
    variants: [{ symbol: 'ϖ', tex: L`\varpi`, note: 'A rare variant shape, sometimes used for a different quantity.' }],
    keywords: ['circle', 'circumference', 'area', 'radians', 'policy', 'prime counting'],
    meanings: [
      {
        field: 'Geometry', role: 'The circle constant', latex: L`\pi = \frac{C}{d} \approx 3.14159`,
        parts: [[L`C`, 'circumference'], [L`d`, 'diameter'], [L`\pi`, 'the same number for every circle']],
        example: { given: 'Area and circumference of a circle of radius 3.', steps: [L`A = \pi r^2 = 9\pi \approx 28.27`, L`C = 2\pi r = 6\pi \approx 18.85`] },
      },
      {
        field: 'Geometry', role: 'Half a turn, in radians', latex: L`180^\circ = \pi \text{ rad}`,
        parts: [[L`\text{rad}`, 'radian: the angle whose arc equals the radius']],
        example: { given: 'Convert 60°.', steps: [L`60^\circ = 60 \cdot \frac{\pi}{180} = \frac{\pi}{3}`] },
      },
      {
        field: 'Machine learning', role: 'A policy in reinforcement learning', latex: L`\pi(a \mid s)`,
        parts: [[L`\pi`, 'the agent\'s rule for choosing actions'], [L`a \mid s`, '"action a, given state s"'], [L`\pi(a \mid s)`, 'the probability of choosing a in s']],
        note: 'Here π is not 3.14. Context alone tells them apart.',
      },
      {
        field: 'Number theory', role: 'The prime-counting function', latex: L`\pi(x) = \text{the number of primes} \le x`,
        parts: [[L`\pi(x)`, 'a function, not π times x']],
        example: { given: 'Primes up to 10.', steps: [L`2, 3, 5, 7 \Rightarrow \pi(10) = 4`] },
      },
    ],
    beware: 'π followed by brackets, π(x) or π(a|s), is usually a function, not 3.14159 × x.',
  },
  {
    id: 'Pi', symbol: 'Π', name: 'Pi (capital)', say: 'PIE', tex: L`\Pi`, case: 'upper', partner: 'pi', frequency: 'field',
    keywords: ['product', 'multiply'],
    meanings: [
      {
        field: 'Algebra', role: 'Product notation: multiply a sequence',
        latex: L`\prod_{i=1}^{n} a_i = a_1 \cdot a_2 \cdots a_n`,
        parts: [[L`\prod`, 'multiply the terms (as Σ adds them)'], [L`i = 1`, 'start index'], [L`n`, 'end index'], [L`a_i`, 'the i-th term']],
        example: { given: 'Multiply 1 to 4.', steps: [L`\prod_{i=1}^{4} i = 1 \cdot 2 \cdot 3 \cdot 4 = 24 = 4!`] },
        note: 'Typeset as \\prod, which is a larger sign than the letter \\Pi.',
      },
    ],
  },
  // ── ρ ──────────────────────────────────────────────────────────────────────
  {
    id: 'rho', symbol: 'ρ', name: 'rho', say: 'ROH', tex: L`\rho`, case: 'lower', frequency: 'common',
    variants: [{ symbol: 'ϱ', tex: L`\varrho`, note: 'Another shape of rho. Same letter.' }],
    keywords: ['density', 'correlation', 'spectral radius', 'radius'],
    meanings: [
      {
        field: 'Physics', role: 'Density', latex: L`\rho = \frac{m}{V}`,
        parts: [[L`m`, 'mass'], [L`V`, 'volume']],
        example: { given: '2 kg of material fills 0.001 m³.', steps: [L`\rho = \frac{2}{0.001} = 2000\ \text{kg/m}^3`] },
      },
      {
        field: 'Statistics', role: 'The population correlation', latex: L`\rho = \frac{\operatorname{Cov}(X, Y)}{\sigma_X \sigma_Y}, \quad -1 \le \rho \le 1`,
        parts: [[L`\operatorname{Cov}(X,Y)`, 'how X and Y vary together'], [L`\sigma_X, \sigma_Y`, 'their standard deviations'], [L`\rho`, '+1 a perfect rising line, −1 a perfect falling line, 0 no linear relation']],
        example: { given: 'Cov = 1, σ_X = 2, σ_Y = 3.', steps: [L`\rho = \frac{1}{2 \cdot 3} = \tfrac16 \approx 0.17`] },
      },
      {
        field: 'Linear algebra', role: 'The spectral radius', latex: L`\rho(A) = \max_i |\lambda_i|`,
        parts: [[L`\lambda_i`, 'the eigenvalues of A'], [L`\rho(A)`, 'the largest of their sizes']],
        example: { given: 'A has eigenvalues 3 and −5.', steps: [L`\rho(A) = \max(3, 5) = 5`], result: 'Repeated multiplication by A shrinks vectors to zero exactly when ρ(A) < 1.' },
      },
      { field: 'Geometry', role: 'A radial distance (cylindrical or spherical coordinates)', latex: L`\rho = \sqrt{x^2 + y^2}`, parts: [[L`\rho`, 'distance from the z-axis, in cylindrical coordinates']] },
    ],
    beware: 'ρ is not the Latin p. And "ρ" as density and "ρ" as correlation can both appear in one engineering problem.',
  },
  // ── σ / Σ ──────────────────────────────────────────────────────────────────
  {
    id: 'sigma', symbol: 'σ', name: 'sigma', say: 'SIG-muh', tex: L`\sigma`, case: 'lower', partner: 'Sigma', frequency: 'common',
    variants: [{ symbol: 'ς', tex: L`\varsigma`, note: 'The final sigma, used at the end of Greek words. Not used in mathematics.' }],
    keywords: ['standard deviation', 'variance', 'spread', 'permutation', 'stress', 'sigmoid'],
    meanings: [
      {
        field: 'Statistics', role: 'The standard deviation (spread)',
        latex: L`\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i - \mu)^2}`,
        parts: [[L`x_i`, 'each observation'], [L`\mu`, 'the mean'], [L`(x_i - \mu)^2`, 'how far each one is from the mean, squared so negatives don\'t cancel'], [L`\sigma^2`, 'the variance: the same thing before the square root']],
        example: { given: 'The population 2, 4, 6, 8, whose mean is μ = 5.', steps: [L`x_i - \mu:\ -3,\ -1,\ 1,\ 3`, L`\text{squares}:\ 9,\ 1,\ 1,\ 9 \quad(\text{sum } 20)`, L`\sigma^2 = \tfrac{20}{4} = 5, \qquad \sigma = \sqrt5 \approx 2.24`], result: 'Typically, a value is about 2.24 away from the mean.' },
      },
      {
        field: 'Machine learning', role: 'The sigmoid (logistic) function', latex: L`\sigma(x) = \frac{1}{1 + e^{-x}}`,
        parts: [[L`\sigma(x)`, 'squeezes any number into the range (0, 1)']],
        example: { given: 'Evaluate at 0.', steps: [L`\sigma(0) = \frac{1}{1 + 1} = 0.5`] },
      },
      {
        field: 'Algebra', role: 'A permutation', latex: L`\sigma = (1\ 2\ 3):\quad 1 \mapsto 2,\ 2 \mapsto 3,\ 3 \mapsto 1`,
        parts: [[L`\sigma`, 'a rearrangement of 1, 2, 3'], [L`\mapsto`, '"is sent to"']],
        example: { given: 'Apply σ twice to 1.', steps: [L`\sigma(\sigma(1)) = \sigma(2) = 3`] },
      },
      {
        field: 'Physics', role: 'Stress in a material', latex: L`\sigma = \frac{F}{A}`,
        parts: [[L`F`, 'force'], [L`A`, 'the cross-sectional area it acts on']],
        example: { given: '1000 N on 0.01 m².', steps: [L`\sigma = \frac{1000}{0.01} = 100\,000\ \text{Pa} = 100\ \text{kPa}`] },
      },
    ],
    beware: 'σ (a spread, a function or a stress) and Σ (adding up) are different symbols, not two fonts of one.',
  },
  {
    id: 'Sigma', symbol: 'Σ', name: 'Sigma (capital)', say: 'SIG-muh', tex: L`\Sigma`, case: 'upper', partner: 'sigma', frequency: 'common',
    keywords: ['summation', 'sum', 'add', 'covariance matrix', 'alphabet'],
    meanings: [
      {
        field: 'Algebra', role: 'Summation: add a sequence',
        latex: L`\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n`,
        parts: [[L`\sum`, 'add up'], [L`i`, 'the index, counting up by 1'], [L`i = 1`, 'where to start'], [L`n`, 'where to stop'], [L`x_i`, 'the term for each i']],
        example: { given: 'Two sums.', steps: [L`\sum_{i=1}^{4} i = 1 + 2 + 3 + 4 = 10`, L`\sum_{i=1}^{3} i^2 = 1 + 4 + 9 = 14`], result: 'A for loop in mathematical notation: for i from 1 to n, total += x[i].' },
        note: 'Typeset as \\sum, a larger sign than the letter \\Sigma.',
      },
      {
        field: 'Statistics', role: 'A covariance matrix',
        latex: L`X \sim \mathcal{N}(\boldsymbol\mu, \Sigma), \qquad \Sigma = \begin{pmatrix} 4 & 1 \\ 1 & 9 \end{pmatrix}`,
        parts: [[L`\boldsymbol\mu`, 'the vector of means'], [L`\Sigma`, 'variances on the diagonal, covariances off it'], [L`\mathcal{N}`, 'the normal distribution']],
        example: { given: 'Read the matrix above.', steps: [L`\sigma_1 = \sqrt4 = 2,\quad \sigma_2 = \sqrt9 = 3`, L`\rho = \frac{1}{2 \cdot 3} = \tfrac16`] },
      },
      { field: 'Computer science', role: 'An alphabet of symbols', latex: L`\Sigma = \{0, 1\}, \qquad \Sigma^*`, parts: [[L`\Sigma`, 'the symbols strings are made of'], [L`\Sigma^*`, 'all finite strings over them']] },
    ],
  },
  // ── τ ──────────────────────────────────────────────────────────────────────
  {
    id: 'tau', symbol: 'τ', name: 'tau', say: 'TAW (rhymes with "cow")', tex: L`\tau`, case: 'lower', frequency: 'field',
    keywords: ['time constant', 'torque', 'full turn', '2pi'],
    meanings: [
      {
        field: 'Physics', role: 'A time constant', latex: L`V(t) = V_0\, e^{-t/\tau}`,
        parts: [[L`V_0`, 'the starting value'], [L`\tau`, 'the time it takes to fall to 1/e (about 37%) of the start']],
        example: { given: 'After one time constant, t = τ.', steps: [L`V(\tau) = V_0\, e^{-1} \approx 0.368\, V_0`] },
      },
      {
        field: 'Physics', role: 'Torque', latex: L`\tau = rF\sin\theta`,
        parts: [[L`r`, 'distance from the pivot'], [L`F`, 'force'], [L`\theta`, 'the angle between them']],
        example: { given: 'r = 0.5 m, F = 10 N, θ = 90°.', steps: [L`\tau = 0.5 \cdot 10 \cdot \sin 90^\circ = 5\ \text{N·m}`] },
      },
      { field: 'Geometry', role: 'A full turn, 2π (an alternative convention)', latex: L`\tau = 2\pi \approx 6.283`, parts: [[L`\tau`, 'one full turn in radians; some authors prefer it to 2π']] },
    ],
  },
  // ── υ ──────────────────────────────────────────────────────────────────────
  {
    id: 'upsilon', symbol: 'υ', name: 'upsilon', say: 'OOP-sih-lon', tex: L`\upsilon`, case: 'lower', frequency: 'rare',
    meanings: [{ field: 'Physics', role: 'Rarely used', latex: L`\upsilon`, parts: [[L`\upsilon`, 'occasionally a velocity; avoided because it looks like the Latin u or v']] }],
  },
  // ── φ / Φ ──────────────────────────────────────────────────────────────────
  {
    id: 'phi', symbol: 'φ', name: 'phi', say: 'FIE (or FEE)', tex: L`\varphi`, case: 'lower', partner: 'Phi', frequency: 'common',
    variants: [{ symbol: 'ϕ', tex: L`\phi`, note: 'Another shape of phi. LaTeX\'s \\phi gives ϕ and \\varphi gives φ. Same letter.' }],
    keywords: ['angle', 'phase', 'golden ratio', 'totient', 'feature map'],
    meanings: [
      {
        field: 'Physics', role: 'A phase or angle', latex: L`x(t) = A\cos(\omega t + \varphi)`,
        parts: [[L`A`, 'amplitude'], [L`\omega`, 'angular frequency'], [L`t`, 'time'], [L`\varphi`, 'the phase: where in its cycle the motion starts']],
      },
      {
        field: 'Algebra', role: 'The golden ratio', latex: L`\varphi = \frac{1 + \sqrt5}{2} \approx 1.618, \qquad \varphi^2 = \varphi + 1`,
        parts: [[L`\varphi`, 'the positive solution of x² = x + 1']],
        example: { given: 'Check the defining property.', steps: [L`\varphi^2 \approx 2.618 = 1.618 + 1`] },
      },
      {
        field: 'Number theory', role: 'Euler\'s totient function', latex: L`\varphi(n) = \#\{\,k \le n : \gcd(k, n) = 1\,\}`,
        parts: [[L`\gcd(k,n) = 1`, 'k and n share no factor except 1'], [L`\#`, '"how many"']],
        example: { given: 'n = 9.', steps: [L`1, 2, 4, 5, 7, 8 \Rightarrow \varphi(9) = 6`] },
      },
      { field: 'Machine learning', role: 'A feature map', latex: L`\varphi(x) = (x,\ x^2)`, parts: [[L`\varphi`, 'turns an input into a list of features a linear model can use']] },
    ],
    beware: 'φ is not ∅. The empty set ∅ (a circle with a slash) is a different symbol. Also see θ: φ and θ swap roles between textbooks in spherical coordinates.',
  },
  {
    id: 'Phi', symbol: 'Φ', name: 'Phi (capital)', say: 'FIE', tex: L`\Phi`, case: 'upper', partner: 'phi', frequency: 'field',
    keywords: ['normal cdf', 'cumulative distribution', 'z-table', 'magnetic flux'],
    meanings: [
      {
        field: 'Probability', role: 'The standard normal cumulative distribution function', latex: L`\Phi(z) = P(Z \le z)`,
        parts: [[L`Z`, 'a standard normal random variable (mean 0, standard deviation 1)'], [L`\Phi(z)`, 'the chance Z comes out at most z']],
        example: { given: 'The 1.96 used in 95% confidence intervals.', steps: [L`\Phi(1.96) \approx 0.975`, L`P(-1.96 \le Z \le 1.96) \approx 0.975 - 0.025 = 0.95`] },
      },
      { field: 'Physics', role: 'Magnetic flux', latex: L`\Phi = B A \cos\theta`, parts: [[L`B`, 'field strength'], [L`A`, 'area'], [L`\theta`, 'angle between the field and the surface\'s normal']] },
    ],
  },
  // ── χ ──────────────────────────────────────────────────────────────────────
  {
    id: 'chi', symbol: 'χ', name: 'chi', say: 'KIE (rhymes with "sky")', tex: L`\chi`, case: 'lower', frequency: 'field',
    keywords: ['chi-square', 'euler characteristic', 'indicator function'],
    meanings: [
      {
        field: 'Statistics', role: 'The chi-square statistic', latex: L`\chi^2 = \sum_i \frac{(O_i - E_i)^2}{E_i}`,
        parts: [[L`O_i`, 'observed count in category i'], [L`E_i`, 'the count expected if the hypothesis is true'], [L`\chi^2`, 'one symbol, "chi-squared": large values mean the data disagree with the expectation']],
        example: { given: 'A coin tossed 40 times: 18 heads, 22 tails; a fair coin expects 20 and 20.', steps: [L`\chi^2 = \frac{(18-20)^2}{20} + \frac{(22-20)^2}{20} = 0.2 + 0.2 = 0.4`], result: 'Small: consistent with a fair coin.' },
      },
      {
        field: 'Geometry', role: 'The Euler characteristic', latex: L`\chi = V - E + F`,
        parts: [[L`V, E, F`, 'the numbers of vertices, edges and faces']],
        example: { given: 'A cube.', steps: [L`\chi = 8 - 12 + 6 = 2`], result: 'Every convex polyhedron gives 2.' },
      },
      { field: 'Set theory', role: 'An indicator (characteristic) function', latex: L`\chi_A(x) = \begin{cases} 1 & x \in A \\ 0 & x \notin A \end{cases}`, parts: [[L`\chi_A`, '1 inside the set A, 0 outside']] },
    ],
    beware: 'χ looks like the Latin x. In χ² the 2 is a square, not a footnote.',
  },
  // ── ψ / Ψ ──────────────────────────────────────────────────────────────────
  {
    id: 'psi', symbol: 'ψ', name: 'psi', say: 'SIGH (or PSIGH)', tex: L`\psi`, case: 'lower', partner: 'Psi', frequency: 'field',
    keywords: ['wavefunction', 'digamma'],
    meanings: [
      { field: 'Physics', role: 'A wavefunction (quantum mechanics)', latex: L`P(a \le x \le b) = \int_a^b |\psi(x)|^2\,dx`, parts: [[L`\psi(x)`, 'the quantum state of a particle'], [L`|\psi(x)|^2`, 'the probability density of finding it at x']] },
      {
        field: 'Calculus', role: 'The digamma function', latex: L`\psi(x) = \frac{\Gamma'(x)}{\Gamma(x)}`,
        parts: [[L`\Gamma`, 'the gamma function'], [L`\Gamma'`, 'its derivative']],
        example: { given: 'A known value.', steps: [L`\psi(1) = -\gamma \approx -0.5772`], result: 'γ here is the Euler–Mascheroni constant.' },
      },
      { field: 'Algebra', role: 'A generic function name', latex: L`\psi : X \to Y`, parts: [[L`\psi`, 'just a name, like f or g']] },
    ],
  },
  {
    id: 'Psi', symbol: 'Ψ', name: 'Psi (capital)', say: 'SIGH', tex: L`\Psi`, case: 'upper', partner: 'psi', frequency: 'rare',
    meanings: [{ field: 'Physics', role: 'A wavefunction, often of a whole system', latex: L`\Psi(x, t)`, parts: [[L`\Psi`, 'the state of a system depending on position and time']] }],
  },
  // ── ω / Ω ──────────────────────────────────────────────────────────────────
  {
    id: 'omega', symbol: 'ω', name: 'omega', say: 'oh-MAY-guh (UK: OH-mih-guh)', tex: L`\omega`, case: 'lower', partner: 'Omega', frequency: 'common',
    keywords: ['angular frequency', 'angular velocity', 'cube root of unity', 'ordinal'],
    meanings: [
      {
        field: 'Physics', role: 'Angular frequency', latex: L`\omega = 2\pi f`,
        parts: [[L`f`, 'frequency in cycles per second (Hz)'], [L`\omega`, 'the same rate in radians per second']],
        example: { given: 'Mains electricity at 50 Hz.', steps: [L`\omega = 2\pi \cdot 50 \approx 314.16\ \text{rad/s}`] },
      },
      {
        field: 'Algebra', role: 'A cube root of unity', latex: L`\omega = e^{2\pi i/3}, \qquad 1 + \omega + \omega^2 = 0`,
        parts: [[L`i`, 'the imaginary unit'], [L`\omega`, 'a complex number with ω³ = 1 other than 1 itself']],
      },
      { field: 'Set theory', role: 'The first infinite ordinal', latex: L`\omega = \{0, 1, 2, 3, \dots\}`, parts: [[L`\omega`, 'the order type of the natural numbers: "the first number after all the finite ones"']] },
    ],
    beware: 'ω looks like the Latin w. Lowercase ω and capital Ω have unrelated meanings.',
  },
  {
    id: 'Omega', symbol: 'Ω', name: 'Omega (capital)', say: 'oh-MAY-guh', tex: L`\Omega`, case: 'upper', partner: 'omega', frequency: 'field',
    keywords: ['sample space', 'big omega', 'lower bound', 'ohm', 'resistance', 'solid angle'],
    meanings: [
      {
        field: 'Probability', role: 'The sample space: every possible outcome', latex: L`\Omega = \{1, 2, 3, 4, 5, 6\}, \qquad P(\Omega) = 1`,
        parts: [[L`\Omega`, 'the set of all outcomes of a die roll'], [L`P(\Omega) = 1`, 'something in it certainly happens']],
      },
      {
        field: 'Computer science', role: 'Big Omega: a lower bound on growth', latex: L`f(n) = \Omega(g(n)) \iff f(n) \ge c\, g(n) \text{ for large } n`,
        parts: [[L`c`, 'a positive constant']],
        example: { given: 'Is n² = Ω(n)?', steps: [L`n^2 \ge 1 \cdot n \text{ for } n \ge 1 \Rightarrow n^2 = \Omega(n)`] },
      },
      {
        field: 'Physics', role: 'The ohm, the unit of resistance', latex: L`V = IR`,
        parts: [[L`V`, 'voltage (volts)'], [L`I`, 'current (amperes)'], [L`R`, 'resistance, measured in Ω']],
        example: { given: '12 V across 4 Ω.', steps: [L`I = \frac{12}{4} = 3\ \text{A}`], result: 'Here Ω is a unit, never a variable.' },
      },
    ],
  },
]

// Look-alikes: symbols easily mistaken for each other.
export const LOOK_ALIKES = [
  { a: L`\varepsilon`, b: L`\in`, text: 'ε (epsilon) vs ∈ ("is an element of"): x ∈ A means x is in the set A.' },
  { a: L`\varphi`, b: L`\varnothing`, text: 'φ (phi) vs ∅ (the empty set, a set with nothing in it).' },
  { a: L`\nu`, b: L`v`, text: 'ν (nu) vs the Latin v (often velocity).' },
  { a: L`\rho`, b: L`p`, text: 'ρ (rho) vs the Latin p.' },
  { a: L`\omega`, b: L`w`, text: 'ω (omega) vs the Latin w.' },
  { a: L`\kappa`, b: L`k`, text: 'κ (kappa) vs the Latin k.' },
  { a: L`\chi`, b: L`x`, text: 'χ (chi) vs the Latin x.' },
  { a: L`\iota`, b: L`i`, text: 'ι (iota) vs the Latin i.' },
  { a: L`\upsilon`, b: L`u`, text: 'υ (upsilon) vs the Latin u.' },
  { a: L`\Sigma`, b: L`\sum`, text: 'Σ the letter vs ∑ the summation sign: the same idea, but ∑ is typeset larger with limits above and below.' },
  { a: L`\Pi`, b: L`\prod`, text: 'Π the letter vs ∏ the product sign, likewise.' },
  { a: L`\Delta`, b: L`\triangle`, text: 'Δ (Delta) vs △ (a triangle).' },
]

// Capitals that look exactly like Latin capitals; mathematicians write the Latin letter instead.
export const LATIN_LOOKING_CAPITALS = [
  ['Α', 'alpha'], ['Β', 'beta'], ['Ε', 'epsilon'], ['Ζ', 'zeta'], ['Η', 'eta'], ['Ι', 'iota'], ['Κ', 'kappa'],
  ['Μ', 'mu'], ['Ν', 'nu'], ['Ο', 'omicron'], ['Ρ', 'rho'], ['Τ', 'tau'], ['Υ', 'upsilon'], ['Χ', 'chi'],
]
