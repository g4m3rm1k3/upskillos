import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const DICE = `from itertools import product
outcomes = list(product(range(1, 7), repeat=2))   # all 36 (first, second) pairs`

export default {
  id: 'd-01', slug: 'probability-foundations', track: 'D', order: 1,
  title: 'Probability Foundations', subtitle: 'Counting, Simulating and Conditioning',
  tags: ['probability', 'simulation', 'conditional', 'bayes', 'law-of-large-numbers'],
  prereqs: ['c-02', 'b-04'], unlocks: ['d-02', 'd-03'],
  hook: {
    question: 'How do you reason carefully about things that might or might not happen?',
    realWorldContext: 'Test results, model predictions and risk estimates are all probabilities. Most probability mistakes are not arithmetic mistakes: they come from dividing by the wrong total — confusing "the chance a sick person tests positive" with "the chance a positive tester is sick".',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Compute probabilities by counting equally likely outcomes, and check them by simulation. Combine events with "and", "or" and "given". Decide whether two events are independent by checking, not assuming. Use natural frequencies to reason about a test result.',
        '**The smallest example.** Roll two fair dice. There are 6 × 6 = **36** equally likely outcomes, (1,1) through (6,6). When outcomes are equally likely, the probability of an event is *(number of outcomes in the event) ÷ (total outcomes)*.',
        '| Event | Outcomes | Count | Probability |\n|---|---|---|---|\n| A: the sum is 7 | (1,6) (2,5) (3,4) (4,3) (5,2) (6,1) | 6 | 6/36 = 1/6 |\n| B: the first die shows 4 | (4,1) … (4,6) | 6 | 6/36 = 1/6 |\n| A and B | (4,3) | 1 | 1/36 |\n| A or B | 6 + 6 − 1 (do not count (4,3) twice) | 11 | 11/36 |',
        'The "or" rule is P(A or B) = P(A) + P(B) − P(A and B): adding counts the shared outcomes twice, so subtract them once.',
      ),
      check(
        'What is P(at least one die shows 6)?',
        ['2/6 = 12/36', '11/36', '1/36'],
        1,
        '6 outcomes have a 6 first and 6 have a 6 second, but (6,6) is in both: 6 + 6 − 1 = 11. Or count the opposite: 25 outcomes have no 6, so 1 − 25/36 = 11/36.',
      ),
      notebook('Counting and simulating', [
        demo(1, 'Stage 1 — Count the sample space', [
          'All 36 outcomes are listed, and each probability is a count divided by 36.',
        ], 'Run and match each line with the table. Then count P(the two dice are equal).', `${DICE}
A = [o for o in outcomes if sum(o) == 7]
B = [o for o in outcomes if o[0] == 4]
A_and_B = [o for o in A if o in B]
A_or_B = [o for o in outcomes if o in A or o in B]
print(len(outcomes), len(A), len(B), len(A_and_B), len(A_or_B))
print(len(A_or_B) / 36)`, { expectOutput: ['36 6 6 1 11', '0.3055555555555556'] }),
        demo(2, 'Stage 2 — Simulation approaches the count', [
          'Simulating many rolls and counting how often the event happens gives an estimate. The **law of large numbers** says the estimate settles towards the true probability as the number of trials grows — it wobbles for small samples.',
        ], 'Run. How far is each estimate from 1/6 ≈ 0.1667? Then change the seed and run again.', `import numpy as np
rng = np.random.default_rng(1)
for n in [10, 100, 10_000, 1_000_000]:
    rolls = rng.integers(1, 7, size=(n, 2))
    print(n, round(np.mean(rolls.sum(axis=1) == 7), 4))`, { expectOutput: ['1000000 0.16'] }),
      ]),
      prose(
        '**Conditioning: change the denominator.** P(A | B), "the probability of A **given** B", means: among the outcomes where B happened, what fraction also have A? The denominator shrinks from all 36 outcomes to the 6 in B.',
        'P(sum is 7 | first die is 4) = (outcomes with both) ÷ (outcomes with B) = 1 ÷ 6 = 1/6. As a formula: P(A | B) = P(A and B) ÷ P(B).',
        '**Independence** means that knowing B happened does not change the chance of A: P(A | B) = P(A). Equivalently, P(A and B) = P(A) × P(B). That is a *property to check*, not something to assume:',
        '| Event A | P(A) | P(A \\| first die is 4) | Independent of the first die? |\n|---|---|---|---|\n| sum is 7 | 6/36 = 1/6 | 1/6 | **yes** — every first value leaves exactly one way to reach 7 |\n| sum is 8 | 5/36 | 1/6 | **no** — a first die of 4 makes 8 more likely than average |',
        'A common error is the reverse: believing a fair coin that landed heads five times is "due" a tail. Separate flips are independent; the next flip is still 50/50.',
      ),
      check(
        'Are "the sum is 8" and "the first die shows 1" independent?',
        ['Yes', 'No — with a first die of 1, a sum of 8 is impossible, so P(sum is 8 | first is 1) = 0, not 5/36'],
        1,
        'Knowing the first die changed the probability, so the events are dependent.',
      ),
      notebook('Conditioning and independence', [
        demo(3, 'Stage 3 — Check independence by counting', [
          '`prob(event, given)` counts outcomes: the denominator is the outcomes where `given` holds.',
        ], 'Run and compare with the table. Then test "sum is 8" against "first die is 1".', `${DICE}
def prob(event, given=lambda o: True):
    pool = [o for o in outcomes if given(o)]
    return sum(event(o) for o in pool) / len(pool)

first_is_4 = lambda o: o[0] == 4
for name, event in [("sum 7", lambda o: sum(o) == 7), ("sum 8", lambda o: sum(o) == 8)]:
    print(name, round(prob(event), 4), round(prob(event, first_is_4), 4))`, { expectOutput: ['sum 7 0.1667 0.1667', 'sum 8 0.1389 0.1667'] }),
      ]),
      prose(
        '**Bayes\' rule with natural frequencies.** A disease affects 1% of people. A test detects 95% of cases (its *sensitivity*) but also gives a positive result for 5% of healthy people (its *false-positive rate*). You test positive. How likely is it that you have the disease? Picture 10,000 people:',
        '| | tests positive | tests negative | total |\n|---|---|---|---|\n| have the disease | 95 | 5 | 100 |\n| healthy | 495 | 9,405 | 9,900 |\n| **total** | **590** | 9,410 | 10,000 |',
        'Among the 590 positives, only 95 are ill: P(disease | positive) = 95 ÷ 590 ≈ **16%**. The 95% belongs to a different question — P(positive | disease) = 95 ÷ 100. Swapping the condition changes the denominator, and here the answer. Bayes\' rule, P(A | B) = P(B | A) × P(A) ÷ P(B), is the same calculation written as a formula.',
      ),
      notebook('Bayes', [
        demo(4, 'Stage 4 — The table and the formula agree', [
          'The natural-frequency table computed in code, then Bayes\' rule, for several prevalences.',
        ], 'Run. How does the answer change as the disease becomes more common?', `def p_disease_given_positive(prevalence, sensitivity=0.95, false_pos=0.05, people=10_000):
    ill = people * prevalence
    true_pos = ill * sensitivity
    false_pos_count = (people - ill) * false_pos
    return true_pos / (true_pos + false_pos_count)

for prev in [0.001, 0.01, 0.1, 0.5]:
    formula = 0.95 * prev / (0.95 * prev + 0.05 * (1 - prev))
    print(prev, round(p_disease_given_positive(prev), 3), round(formula, 3))`, { expectOutput: ['0.01 0.161 0.161', '0.5 0.95 0.95'] }),
      ]),
      prose('**Practice.** Challenge 1 counts outcomes. Challenge 2 uses the right denominator from a table. Challenge 3 is a fresh Bayes problem with an independence judgement.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Count, then simulate', 'medium', {
          prompt: 'For two dice, compute p_exact = P(the larger of the two dice is 5) by counting the 36 outcomes, and p_sim by simulating 200,000 rolls with the given random generator.',
          instructions: 'Use `max(o) == 5` for counting. For simulation, `rolls.max(axis=1) == 5`.',
          code: 'from itertools import product\nimport numpy as np\nrng = np.random.default_rng(7)\noutcomes = list(product(range(1, 7), repeat=2))\np_exact = None\np_sim = None',
          testCode: `assert p_exact is not None and abs(p_exact - 9 / 36) < 1e-12, f"9 outcomes have a maximum of 5: (5,1)...(5,5), (1,5)...(4,5). p_exact should be 9/36 = 0.25, got {p_exact}"
assert p_sim is not None and abs(p_sim - 0.25) < 0.005, f"With 200,000 rolls the simulated value should be within 0.005 of 0.25, got {p_sim}"
"SUCCESS: counting gives exactly 0.25 and simulation agrees closely."`,
          hint: 'p_exact = sum(max(o) == 5 for o in outcomes) / 36\nrolls = rng.integers(1, 7, size=(200_000, 2))\np_sim = np.mean(rolls.max(axis=1) == 5)',
          solution: 'from itertools import product\nimport numpy as np\nrng = np.random.default_rng(7)\noutcomes = list(product(range(1, 7), repeat=2))\np_exact = sum(max(o) == 5 for o in outcomes) / 36\nrolls = rng.integers(1, 7, size=(200_000, 2))\np_sim = float(np.mean(rolls.max(axis=1) == 5))',
          misconceptions: [{ code: 'p_exact = 11 / 36\np_sim = 0.25', feedback: '9 outcomes have a maximum of 5' }],
        }),
        exercise(12, 2, 'Challenge 2 — Which denominator?', 'medium', {
          prompt: 'Of 200 customers, the table shows plan and whether they cancelled. Compute p_cancel_given_basic, the probability a basic customer cancels, and p_basic_given_cancel, the probability a cancelling customer was on basic.',
          prose: ['| | cancelled | stayed | total |\n|---|---|---|---|\n| basic | 30 | 90 | 120 |\n| pro | 10 | 70 | 80 |\n| total | 40 | 160 | 200 |'],
          instructions: 'Both numerators are 30 (basic AND cancelled). The denominators differ: which group are you looking inside?',
          code: 'p_cancel_given_basic = 30 / 40\np_basic_given_cancel = 30 / 120',
          testCode: `assert abs(p_cancel_given_basic - 0.25) < 1e-12, "Given basic: look inside the 120 basic customers. 30 / 120 = 0.25. You divided by the number who cancelled"
assert abs(p_basic_given_cancel - 0.75) < 1e-12, "Given cancelled: look inside the 40 who cancelled. 30 / 40 = 0.75"
"SUCCESS: 25% of basic customers cancel, but 75% of cancellations are basic customers — same numerator, different denominators."`,
          hint: 'Given basic → divide by the basic total (120). Given cancelled → divide by the cancelled total (40).',
          solution: 'p_cancel_given_basic = 30 / 120\np_basic_given_cancel = 30 / 40',
          misconceptions: [{ code: 'p_cancel_given_basic = 30 / 40\np_basic_given_cancel = 30 / 120', feedback: 'You divided by the number who cancelled' }],
        }),
        exercise(13, 3, 'Challenge 3 — A spam filter\'s alarm', 'hard', {
          prompt: 'In a mailbox, 20% of emails are spam. A filter flags 90% of spam and 2% of genuine emails. Using 1,000 emails as natural frequencies, compute p_spam_given_flag. Then decide independent: are "is spam" and "is flagged" independent? (True or False.)',
          instructions: 'Build the counts: how many spam, how many flagged spam, how many genuine, how many flagged genuine. Then look inside the flagged emails. For independence, compare P(spam | flagged) with P(spam).',
          code: 'emails = 1000\np_spam_given_flag = None\nindependent = None',
          testCode: `assert p_spam_given_flag is not None, "Compute p_spam_given_flag"
assert abs(p_spam_given_flag - 0.9) > 0.01, "0.9 is P(flagged | spam). You need P(spam | flagged): look inside the flagged emails"
assert abs(p_spam_given_flag - 180 / 196) < 1e-9, f"200 spam → 180 flagged; 800 genuine → 16 flagged; 180 / 196 ≈ 0.918. Got {p_spam_given_flag}"
assert independent is False, "P(spam | flagged) ≈ 0.918 is far from P(spam) = 0.2, so knowing an email was flagged changes the chance it is spam: they are dependent"
"SUCCESS: about 92% of flagged emails are spam; flagging and spam are strongly dependent — which is exactly what a useful filter needs."`,
          hint: 'spam = 200, flagged_spam = 0.9 * 200 = 180; genuine = 800, flagged_genuine = 0.02 * 800 = 16; p = 180 / (180 + 16)',
          solution: 'emails = 1000\nspam = 0.2 * emails\nflagged_spam = 0.9 * spam\nflagged_genuine = 0.02 * (emails - spam)\np_spam_given_flag = flagged_spam / (flagged_spam + flagged_genuine)\nindependent = abs(p_spam_given_flag - 0.2) < 1e-9',
          misconceptions: [{ code: 'p_spam_given_flag = 0.9\nindependent = False', feedback: '0.9 is P(flagged | spam)' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'With equally likely outcomes, probability = favourable count ÷ total count; simulation estimates it and improves with more trials.',
    'P(A or B) = P(A) + P(B) − P(A and B): do not count shared outcomes twice.',
    'P(A | B) looks only inside B: the denominator changes.',
    'Independent means P(A | B) = P(A) — check it, do not assume it.',
    'Bayes with natural frequencies: count true and false positives out of a round number of people.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'What does P(A | B) measure?',
      options: ['The probability that A causes B', 'The fraction of outcomes with B that also have A', 'The probability of A and B together'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'A disease affects 1% of people; a test has 95% sensitivity and a 5% false-positive rate. You test positive. The chance you are ill is about:',
      options: ['95%', 'About 16% — most positives come from the many healthy people', '50%'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A fair coin landed heads 10 times in a row. What is the probability of heads next?',
      options: ['Less than 0.5 — tails is due', '0.5 — flips are independent', 'More than 0.5 — it is on a streak'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'P(A) = 0.3 and P(B) = 0.4. You are told A and B are independent. What is P(A and B)?',
      options: ['0.7', '0.12', 'It cannot be computed'],
      correct: 1,
    },
  ],
}
