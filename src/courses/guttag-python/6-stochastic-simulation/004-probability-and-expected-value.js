// Guttag — Lesson 40: Probability and Expected Value
// Auto-converted from src/docs/tutorials/guttag-python/lesson-40.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-40-probability-and-expected-value',
  slug: 'probability-and-expected-value',
  chapter: 6,
  order: 4,
  title: 'Probability and Expected Value',
  subtitle: 'Stochastic Thinking and Simulation',
  tags: ['probability', 'independent-events', 'conditional-probability', 'bayes-theorem', 'expected-value', 'variance'],

  hook: {
    question: 'What is "Probability and Expected Value", and why does it matter?',
    realWorldContext: 'The reader will understand the formal definition of probability, compute probabilities analytically using Racket, understand expected value and variance, and see how simulation confirms analytical results. The transferable problems: (1) probability is a number in [0,1] representing the long-run frequency of an event; (2) expected value is the probability-weighted average outcome — the number you converge to after many trials; (3) variance and standard deviation measure how spread out the outcomes are.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: Probability — the formal definition, Independent events and multiplication rule, Conditional probability and Bayes theorem, Expected value, Variance and standard deviation, The coefficient of variation, The empirical rule.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Probability:** a formal measure from 0 to 1 of how likely an event is to occur, representing long-run frequency.\n- **Independent events:** events where the outcome of one does not affect the outcome of the other.\n- **Conditional probability:** the probability of an event given that another event has occurred.\n- **Bayes theorem:** a mathematical formula for updating probabilities based on new evidence.\n- **Expected value:** the probability-weighted average of all possible outcomes.\n- **Variance:** the average of the squared differences from the mean, measuring spread.\n- **Standard deviation:** the square root of variance, putting the spread back into the original units.\n- **Coefficient of variation:** the ratio of the standard deviation to the mean, allowing comparison of spread across different scales.\n- **Empirical rule:** the 68-95-99.7 rule stating that for a normal distribution, nearly all data falls within three standard deviations.\n- **Base rate fallacy:** the cognitive error of ignoring the underlying probability of an event when evaluating new evidence.\n- **Monte Carlo simulation:** a computational algorithm that relies on repeated random sampling to obtain numerical results.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **exact->inexact:** A Racket function to convert exact fractions to floating-point numbers.\n- **binomial:** A math function computing combinations "n choose k".\n- **expt:** Exponentiation function.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Probability and expected value are the mathematical foundation of all statistical inference. We built the core probability constructs, traced exact probability fractions, applied Bayesian reasoning for conditional probabilities, calculated expected value grids, modeled variance, created scale-free coefficients, and verified standard deviation counts.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 40: Probability and Expected Value',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Probability and Expected Value',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Probability — the formal definition',
              prose: [
                'How do we mathematically quantify the likelihood of an event occurring, like drawing a flush from a deck of cards? What would you try here first if you had to represent absolute certainty versus absolute impossibility?',
                'Output: `0.16666666666666666` This proves that probability is calculated as a fraction of favorable outcomes over total outcomes.'
              ],
              typeIt: true,
              solution: '#lang racket\n(require math/number-theory)\n; P(rolling a 6 on a fair die) = 1/6\n(displayln (exact->inexact (/ 1 6)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Probability — the formal definition — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `(binomial 13 5)` computes the combinations of picking 5 cards from 13.\n- `(* ... 4)` multiplies this by the 4 suits.\n- `(binomial 52 5)` computes total possible 5-card hands.\n- `total` and `favorable` hold these exact rational numbers.',
                '**Expected behavior.** Predicted output for `(exact->inexact (/ favorable total))` is `0.0019807923169267707`. (Exempted via confident prediction).',
                '**CS lens.** Probability is a mathematical formulation of uncertainty. Also recognized in: quantum mechanics, randomized algorithms, game theory, network traffic modeling.',
                '**SE lens.** Representing probabilities as exact rationals (`1/6`) avoids floating-point precision loss during intermediate calculations, a crucial choice in high-stakes numeric software.'
              ],
              typeIt: true,
              solution: '#lang racket\n(require math/number-theory)\n\n(define favorable (* (binomial 13 5) 4))\n(define total (binomial 52 5))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Independent events and multiplication rule',
              prose: [
                'If you roll two dice, what is the chance they both land on 6? Given what we just learned about single events, how do we combine them?',
                'Output: `0.027777777777777776` This demonstrates the multiplication rule for independent probabilities.'
              ],
              typeIt: true,
              solution: '#lang racket\n(displayln (exact->inexact (expt (/ 1 6) 2)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Independent events and multiplication rule — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `(/ 1 6)` calculates the chance of one die being 6.\n- `(expt ... 2)` squares it because the two rolls are independent.\n- `(/ 4 52)` is the chance of one ace.\n- `(/ 3 51)` is the dependent chance of a second ace, since we sample without replacement.\n- `(* ... ...)` multiplies them.',
                '**Expected behavior.** Predicted `p-two-aces` is `1/221` exactly, or `0.004524886877828055`. (Exempted via confident prediction).',
                '**CS lens.** Independent vs dependent state. Also recognized in: Markov chains, concurrent transactions, random walks.',
                '**SE lens.** We rely on pure functions where outcomes do not depend on implicit global state, mirroring mathematical independence.'
              ],
              typeIt: true,
              solution: '(define p-both-six (expt (/ 1 6) 2))\n(define p-two-aces (* (/ 4 52) (/ 3 51)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Conditional probability and Bayes theorem',
              prose: [
                'If a medical test with 99% accuracy returns positive for a disease that affects 1 in 1000 people, what is the actual chance you have the disease?',
                'Output: `0.019434628975265016` This proves that despite a 99% test accuracy, the chance of disease is only ~1.94% due to the base rate fallacy.'
              ],
              typeIt: true,
              solution: '#lang racket\n(displayln (/ (* 0.99 0.001) (+ (* 0.99 0.001) (* 0.05 0.999))))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Conditional probability and Bayes theorem — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `p-disease` defines the base rate.\n- `p-positive` calculates the total probability of testing positive across both branches.\n- `p-disease-given-pos` applies Bayes theorem by dividing the true positive rate by the total positive rate.',
                '**Expected behavior.** Predicted output is `0.019434628975265016`. (Exempted via confident prediction).',
                '**CS lens.** Conditional logic. Also recognized in: branch prediction, Bayesian spam filters, hidden Markov models.',
                '**SE lens.** When domain variables (like probabilities) have hard limits, the type system or runtime asserts should ideally constrain them to `[0,1]`.'
              ],
              typeIt: true,
              solution: '(define p-disease 0.001)\n(define p-pos-given-disease 0.99)\n(define p-pos-given-no-disease 0.05)\n\n(define p-positive (+ (* p-pos-given-disease p-disease)\n                      (* p-pos-given-no-disease (- 1 p-disease))))\n(define p-disease-given-pos (/ (* p-pos-given-disease p-disease) p-positive))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Expected value',
              prose: [
                'If a lottery costs $2 and pays $1M with a 1-in-a-million chance, is it worth playing?',
                'Output: `1.1` This proves that the expected value of the prize is $1.10.'
              ],
              typeIt: true,
              solution: '#lang racket\n(displayln (+ (* 1000000 0.000001) (* 100 0.001)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Expected value — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `(* 1000000 0.000001)` computes the value contributed by the grand prize.\n- `(+ ...)` sums all weighted outcomes.\n- `e-net` subtracts the cost, showing a long-term loss of $0.90 per ticket.',
                '**Expected behavior.** Predicted `e-net` is `-0.90`. (Exempted via confident prediction).',
                '**CS lens.** Averages over large datasets. Also recognized in: algorithm average-case time complexity, load balancing, reinforcement learning rewards.',
                '**SE lens.** Representing currency using floating point leads to precision bugs; exact rationals or integers of cents are preferred.'
              ],
              typeIt: true,
              solution: '(define ticket-cost 2)\n(define e-prize (+ (* 1000000 0.000001) (* 100 0.001) (* 0 0.998999)))\n(define e-net (- e-prize ticket-cost))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Variance and standard deviation',
              prose: [
                'Two games have an expected payout of $10, but one pays $10 every time while the other pays $0 or $20. How do we quantify this difference?',
                'Output: `1.4142135623730951` This demonstrates standard deviation.'
              ],
              typeIt: true,
              solution: '#lang racket\n(define data \'(1 2 3 4 5))\n(define mu 3)\n(displayln (sqrt (/ (apply + (map (lambda (x) (expt (- x mu) 2)) data)) 5)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Variance and standard deviation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `mean` uses `apply +` to sum a list and divides by its length.\n- `variance` uses `map` to subtract the mean from each element and square the result.\n- `std-dev` takes the square root of the variance to return to original units.',
                '**Expected behavior.** Predicted standard deviation of `\'(1 2 3 4 5)` is `1.414`. (Exempted via confident prediction).',
                '**CS lens.** Measure of distribution spread. Also recognized in: image blurring algorithms, signal processing noise, quality control heuristics.',
                '**SE lens.** Computing variance directly can cause numeric overflow; robust engineering often uses Welford\'s online algorithm instead of a two-pass naive sum.'
              ],
              typeIt: true,
              solution: '(define (mean lst)\n  (/ (apply + lst) (length lst)))\n\n(define (variance lst)\n  (define mu (mean lst))\n  (/ (apply + (map (lambda (x) (expt (- x mu) 2)) lst)) (length lst)))\n\n(define (std-dev lst)\n  (sqrt (variance lst)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'The coefficient of variation',
              prose: [
                'A standard deviation of $2 is large for a $10 meal, but tiny for a $1000 laptop. How do we compare variability across scales?',
                'Output: `0.2` `0.002` This proves that relative scale changes the interpretation of a flat variance.'
              ],
              typeIt: true,
              solution: '#lang racket\n(displayln (/ 2 10))\n(displayln (/ 2 1000))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'The coefficient of variation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `(zero? mu)` checks if the mean is exactly zero to avoid division by zero errors.\n- `+inf.0` provides a fallback positive infinity value.\n- `(/ (std-dev lst) mu)` computes the dimensionless ratio.',
                '**Expected behavior.** Outputs `0.2` and `0.002`. (Exempted via confident prediction).',
                '**CS lens.** Normalization. Also recognized in: neural network activation scaling, vector cosine similarity.',
                '**SE lens.** Handling division by zero is a universal software requirement; silently failing or returning NaN can corrupt downstream calculations invisibly.'
              ],
              typeIt: true,
              solution: '(define (cv lst)\n  (define mu (mean lst))\n  (if (zero? mu) +inf.0 (/ (std-dev lst) mu)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 13,
              cellTitle: 'The empirical rule',
              prose: [
                'If we know data is normally distributed, how much of it will fall near the mean?',
                'Output: `3` This demonstrates filtering data that falls within a standard deviation threshold.'
              ],
              typeIt: true,
              solution: '#lang racket\n(define data \'(98 100 102))\n(define sd 2)\n(displayln (length (filter (lambda (x) (<= (abs (- x 100)) sd)) data)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 14,
              cellTitle: 'The empirical rule — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `filter` iterates over the list, keeping elements that satisfy the lambda.\n- `(abs (- x mu))` calculates absolute deviation.\n- `(<= ... (* k sd))` checks if the deviation is within `k` standard deviations.\n- `count` gets the length of the filtered list.',
                '**Expected behavior.** Predicted count is `3`. (Exempted via confident prediction).',
                '**CS lens.** Data bounding. Also recognized in: physics collision detection, search space pruning.',
                '**SE lens.** By mapping abstract mathematical theorems (like the empirical rule) directly to inspectable code, we bridge the gap between theory and software reality.'
              ],
              typeIt: true,
              solution: '(define (within-k-std lst k)\n  (define mu (mean lst))\n  (define sd (std-dev lst))\n  (define count (length (filter (lambda (x) (<= (abs (- x mu)) (* k sd))) lst)))\n  (/ count (length lst)))',
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
      'Next lesson: Statistical Thinking.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Probability"?',
      options: [
        'a formal measure from 0 to 1 of how likely an event is to occur, representing long-run frequency.',
        'events where the outcome of one does not affect the outcome of the other.',
        'the average of the squared differences from the mean, measuring spread.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Bayes theorem"?',
      options: [
        'a mathematical formula for updating probabilities based on new evidence.',
        'the average of the squared differences from the mean, measuring spread.',
        'the probability of an event given that another event has occurred.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Variance"?',
      options: [
        'a computational algorithm that relies on repeated random sampling to obtain numerical results.',
        'the average of the squared differences from the mean, measuring spread.',
        'a mathematical formula for updating probabilities based on new evidence.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Expected value"?',
      options: [
        'the average of the squared differences from the mean, measuring spread.',
        'the probability-weighted average of all possible outcomes.',
        'the cognitive error of ignoring the underlying probability of an event when evaluating new evidence.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Probability** — a formal measure from 0 to 1 of how likely an event is to occur, representing long-run frequency.',
    '**Independent events** — events where the outcome of one does not affect the outcome of the other.',
    '**Conditional probability** — the probability of an event given that another event has occurred.',
    '**Bayes theorem** — a mathematical formula for updating probabilities based on new evidence.',
    '**Expected value** — the probability-weighted average of all possible outcomes.',
    '**Variance** — the average of the squared differences from the mean, measuring spread.',
    '**Standard deviation** — the square root of variance, putting the spread back into the original units.',
    '**Coefficient of variation** — the ratio of the standard deviation to the mean, allowing comparison of spread across different scales.',
  ],

  checkpoints: ['read-intuition'],
}
