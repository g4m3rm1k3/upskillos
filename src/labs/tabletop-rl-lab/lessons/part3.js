// Part 3: learning a turn from experience. The Q-table, ε-greedy, the TD target and update,
// Q-learning judged exactly against Part 2's answer, SARSA, step sizes, afterstates, and rare
// rewards. Long runs are recorded in engine/measured.json by tools/measure.mjs; a predict's
// `compute` reruns the engine, so the test suite checks every recorded number.
import { HANDS } from '../engine/dice.js'
import { KEPT, solve, startValue } from '../engine/turn.js'
import { train, trainAfter } from '../engine/learn.js'
import M from '../engine/measured.json'
import { f } from './util.js'

const T = M.turn
const last = xs => xs[xs.length - 1]
const optimum = box => startValue(solve(box).V[2])
const firstUpdates = (() => { const ups = []; train(5, { episodes: 30, onUpdate: u => ups.push(u) }); return ups })()
const firstNonzero = firstUpdates.find(u => u.before !== 0)
const show = h => `(${HANDS[h].join(', ')})`
const showKept = k => `(${KEPT[k].join(', ')}${KEPT[k].length === 1 ? ',' : ''})`

export const PART3 = {
  id: 'part3', title: 'Part 3 · Learning a turn from experience', lessons: [
    {
      id: 'learning-without-odds', number: '3.1', title: 'Learning without the odds',
      goal: 'Explain what a model-free learner sees and doesn\'t see, and how a Q-table stores what it learns.',
      builds: ['judging-any-policy'],
      blocks: [
        { md: `Part 2 solved a turn by using \`outcomes\`: the exact chance of every result of every reroll. That is a **model** of the world. Most real problems don't come with one. Nobody can list the exact chances of every next position in a car race, a robot's next camera image, or an opponent's next move. And even when the model exists, it can be too big to sum over, as Part 4 will show for the full scorecard.

**Reinforcement learning** learns from **experience** instead: play, see what happens, adjust. A **model-free** learner sees only what one turn shows it:

- the state it was in ($h$, $r$),
- the keep it chose ($k$),
- the hand that came up ($h'$), and
- the reward when the turn ended.

It never sees a probability. Here we have something most learning problems don't: Part 2's exact answer to grade it against.` },
        { md: `A **Q-table** stores one number per state and action: the learner's current estimate of $Q(s, a)$, the expected reward of taking $a$ in $s$ and playing on. Here the states are $(h, r)$ for 252 hands and $r \\in \\{2, 1\\}$; each has a row with one entry per keep. That is $2 \\times 4368 = 8736$ numbers.

In Python, a dictionary of dictionaries: \`Q[(hand, rolls_left)]\` is a row, and \`Q[(hand, rolls_left)][kept]\` one value. Rows are created only when first needed, all zeros.` },
        {
          code: {
            file: 'learn.py', fn: 'values', notes: [
              ['def values(Q, hand, rolls_left):', ['Every learner in this file reads and writes `Q` through this function, so a missing row is never a problem.']],
              ['key = (hand, rolls_left)', ['The state, as a tuple: usable as a dictionary key.']],
              ['if key not in Q:', ['First visit to this state.'], { logic: 'this state has never been seen' }],
              ['Q[key] = {}', ['A new, empty row…']],
              ['for kept in KEEPS[hand]:', ['…with every action of this hand. `KEEPS` is the dictionary of every hand\'s keeps that `exact.py` builds once (lesson 2.3); reusing it saves listing 32 masks again every time.']],
              ['Q[key][kept] = 0.0', ['…starting at 0.0: the learner\'s **initial estimate**. Every score is at least 0, so this starts low.'], { tex: 'Q_0(s, a) = 0' }],
              ['return Q[key]', ['The row (the same dictionary that is stored in `Q`: changing it changes `Q`).']],
            ],
          },
        },
        {
          choice: {
            prompt: 'Which of these does the Q-learner of this part **use**?',
            options: [
              { text: '`outcomes(kept)`, the exact chances of a reroll', why: 'That is the model, and it is exactly what a model-free learner does without. It only calls `reroll`, which throws real dice.' },
              { text: '`reroll(kept, rng)`: one actual roll of the dice', why: 'Yes. One sample of what happens, and nothing else. It must learn the averages from many such samples.' },
              { text: '`solve(box)`, the exact solution', why: 'Only to **grade** it, from outside. The learner itself never sees the answer key.' },
            ],
            answer: 1,
          },
        },
        { note: '**Model-based** (Part 2): know $P$, plan exactly. **Model-free** (Part 3): sample experience, estimate $Q$ by averaging. A Q-table holds one estimate per (state, action): 8,736 of them here.' },
      ],
    },

    {
      id: 'epsilon-greedy', number: '3.2', title: 'Exploring: ε-greedy and ties',
      goal: 'Implement ε-greedy action choice with random tie-breaking, and say why a learner that never explores can get stuck.',
      builds: ['learning-without-odds'],
      blocks: [
        { md: `To learn which keep is best, the learner has to **try** keeps. But to play well, it should use the keep it currently thinks is best. This is the **exploration–exploitation dilemma**.

The simplest compromise is **ε-greedy**: with a small chance ε (epsilon, say 0.1), choose any action at random; otherwise choose the one with the biggest value. Every action keeps being tried now and then, and most of the time the learner plays its best guess.

One detail matters more than it looks: **ties**. At the start every value is 0.0, so every keep ties for best. If ties always went to the first keep listed (here \`()\`, reroll everything), the learner would always reroll everything until something forced a change. So ties are broken **at random**.` },
        {
          code: {
            file: 'learn.py', fn: 'choose', notes: [
              ['def choose(Q, hand, rolls_left, epsilon, rng):', ['Used during training.']],
              ['row = values(Q, hand, rolls_left)', ['This state\'s values.']],
              ['if rng.random() < epsilon:', ['`rng.random()` is a float from 0 up to (not including) 1, so this is true with chance ε.'], { logic: 'explore, with chance ε' }],
              ['return rng.choice(list(row))', ['Any keep, all equally likely. `list(row)` is the row\'s keys: the keeps.']],
              ['best = max(row.values())', ['The biggest value in the row.']],
              ['tied = [kept for kept in row if row[kept] == best]', ['A **list comprehension**: every keep whose value equals the best. Usually one; at the start, all of them.']],
              ['return rng.choice(tied)', ['A random one of them: ties broken at random.']],
            ],
          },
        },
        {
          code: {
            file: 'learn.py', fn: 'greedy', notes: [
              ['def greedy(Q, hand, rolls_left):', ['The learned policy when we **judge** it: no exploring, and no randomness, so the same table always gives the same policy.']],
              ['row = values(Q, hand, rolls_left)', ['The row.']],
              ['return max(row, key=row.get)', ['The argmax, first on a tie, exactly as `best_keep` in Part 2.']],
            ],
          },
        },
        { figure: 'EpsilonFig', caption: 'A row of values and 1,000 choices drawn by `choose` with the same random numbers Python would use. Move ε and see how often each keep is picked.' },
        {
          predict: {
            prompt: 'A row has 12 keeps and one clear best. With ε = 0.1, what is the chance that `choose` picks the best keep? (3 decimals)',
            answer: 0.9 + 0.1 / 12, tolerance: 0.0006, compute: () => 0.9 + 0.1 / 12,
            explain: 'It is picked greedily with chance 0.9, **and** the random choice also lands on it with chance $0.1 \\times \\tfrac{1}{12}$: $0.9 + 0.0083 = 0.908$.',
            misconceptions: [{ answer: 0.9, tolerance: 0.0006, feedback: 'The random choice can land on the best keep too: add $0.1 \\times 1/12$.' }],
          },
        },
        {
          choice: {
            prompt: 'A learner uses ε = 0 (never explore) and breaks ties by taking the first keep. Aiming for Sixes, its first turn rerolls everything and scores 6. What happens next?',
            options: [
              { text: 'It learns that rerolling everything is good, keeps doing it, and never discovers that keeping 6s is better', why: 'Yes. `()` now has a positive value and every other keep is still 0, so `()` always wins. Without exploration a learner can lock onto the first thing that worked.' },
              { text: 'It soon tries keeping sixes because they score more', why: 'It has no way to know that without trying, and with ε = 0 it never tries anything but its current best.' },
            ],
            answer: 0,
          },
        },
        { note: '**ε-greedy**: random with chance ε, otherwise greedy, ties at random. **Greedy** (no ε, first on ties) is how a learned table is judged. Too little exploration can lock a learner in; this part will meet that again in lesson 3.6.' },
      ],
    },

    {
      id: 'td-update', number: '3.3', title: 'The TD target and the update',
      goal: 'Derive the Q-learning target from the Bellman equation, and compute an update $Q \\leftarrow Q + \\alpha(\\text{target} - Q)$ by hand from real numbers.',
      builds: ['epsilon-greedy', 'planning-backwards'],
      blocks: [
        { md: `Part 2's Bellman equation says what a value **should** be:

$$Q(h, k) = \\sum_{h'} P(h' \\mid k)\\, \\Big[ R + \\max_{k'} Q(h', k') \\Big]$$

where $R$ is 0 after a reroll, or the score when the turn ends (and then there is no next $Q$). The learner can't compute this sum: it doesn't know $P$. But it has just seen **one** term of it: one actual $h'$, drawn with exactly the probability $P(h' \\mid k)$. So the quantity in brackets, for the $h'$ that came up, is a **sample** of the right-hand side. Its average over many turns **is** the sum.

That sample is the **TD target** (TD for **temporal difference**, because it compares estimates at two successive times):

$$\\text{target} = r + \\gamma \\max_{k'} Q(h', k')$$

and the learner nudges its old estimate toward it:

$$Q(h, k) \\leftarrow Q(h, k) + \\alpha\\, \\big[\\, \\text{target} - Q(h, k) \\,\\big]$$

The difference in brackets is the **TD error**: how surprised the learner was. α (alpha), the **step size**, says how far to move: $\\alpha = 1$ jumps all the way to the target; $\\alpha = 0.1$ moves a tenth of the way. γ (gamma), the **discount**, shrinks future reward; within one turn there is no reason to prefer points sooner, so $\\gamma = 1$.` },
        {
          symbols: [
            ['Q(h, k)', 'Q of h, k', 'the current estimate for keeping $k$ from $h$', 'row[kept]'],
            ['r', 'r', 'the reward of this step: 0 after a reroll, the score at the end', 'reward'],
            ['\\gamma', 'gamma', 'the discount on the future: 1 here', 'gamma'],
            ['\\max_{k\'} Q(h\', k\')', 'max over k prime of Q of h prime, k prime', 'the best value in the next state\'s row', 'max(next_row.values())'],
            ['\\alpha', 'alpha', 'the step size', 'alpha (or 1/n: `step`)'],
            ['\\delta', 'delta', 'the TD error: target − Q', 'target - row[kept]'],
          ],
        },
        {
          code: {
            file: 'learn.py', fn: 'train', notes: [
              ['def train(box, episodes=20000, alpha=0.1, epsilon=0.1, method="q", gamma=1.0, seed=0, every=0):', ['An **episode** is one turn. `method` picks Q-learning or SARSA (lesson 3.5); `alpha=None` picks step size 1/n (lesson 3.6); `every` asks for the exact grade of the policy every so often (lesson 3.4).']],
              ['rng = random.Random(seed)', ['All the randomness of the run: dice, exploration, ties.']],
              ['Q = {}', ['The Q-table, empty: rows appear as states are visited.']],
              ['N = {}', ['How many times each (state, keep) has been updated, for step size 1/n.']],
              ['curve = []', ['The policy\'s exact grade along the way.']],
              ['for episode in range(episodes):', ['One turn per trip.']],
              ['hand = tuple(sorted(roll(5, rng)))', ['The first roll.']],
              ['rolls_left = 2', ['Two decisions to come.']],
              ['kept = choose(Q, hand, rolls_left, epsilon, rng)', ['The first action, ε-greedy.']],
              ['while True:', ['Until the turn ends (the `break` below).']],
              ['next_hand = reroll(kept, rng)', ['**Act**: keep, roll the rest. The learner sees the result, not its chance.']],
              ['if rolls_left == 1:', ['That was the last roll: the turn is over.'], { logic: 'that was the third roll' }],
              ['reward = score(next_hand, box)', ['The reward, at last.']],
              ['future = 0.0', ['No next state: the future is worth nothing.']],
              ['reward = 0', ['A reroll earns nothing by itself.']],
              ['next_kept = choose(Q, next_hand, rolls_left - 1, epsilon, rng)', ['Choose the **next** action now. Q-learning doesn\'t need it for its target, but the turn will use it, and SARSA\'s target does.']],
              ['next_row = values(Q, next_hand, rolls_left - 1)', ['The next state\'s row.']],
              ['if method == "sarsa":', ['SARSA: lesson 3.5.']],
              ['future = next_row[next_kept]', ['The value of the action actually chosen next.']],
              ['future = max(next_row.values())', ['Q-learning: the value of the **best** next action, whatever is actually chosen.'], { tex: '\\max_{k\'} Q(h\', k\')' }],
              ['target = reward + gamma * future', ['The TD target.'], { tex: '\\text{target} = r + \\gamma \\max_{k\'} Q(h\', k\')', calc: q => [`${f(q.reward)} + ${f(q.gamma)} × ${f(q.future)}`, q.reward + q.gamma * q.future] }],
              ['row = values(Q, hand, rolls_left)', ['The row of the state the action was taken in.']],
              ['key = (hand, rolls_left, kept)', ['The (state, action) being updated.']],
              ['N[key] = N.get(key, 0) + 1', ['`N.get(key, 0)` is `N[key]`, or 0 if it isn\'t there yet. One more update of this entry.']],
              ['step = alpha if alpha is not None else 1 / N[key]', ['The step size: α, or 1/n for a plain average (lesson 3.6). `is not None` is how Python tests for `None`.']],
              ['row[kept] = row[kept] + step * (target - row[kept])', ['**The update**: move the old value a step toward the target.'], { tex: 'Q(h, k) \\leftarrow Q(h, k) + \\alpha\\,[\\text{target} - Q(h, k)]' }],
              ['if rolls_left == 1:', ['Was that the end of the turn?']],
              ['hand, kept, rolls_left = next_hand, next_kept, rolls_left - 1', ['Move on: the next state becomes the current one, and the action already chosen for it becomes the current action. All three change at once.']],
              ['if every and (episode + 1) % every == 0:', ['Every `every` turns (`%` is the remainder: it is 0 exactly at multiples)…'], { logic: 'grading is on, and this turn is a multiple of `every`' }],
              ['curve.append(evaluate(lambda h, r: greedy(Q, h, r), box))', ['…grade the greedy policy exactly with Part 2\'s `evaluate`. `lambda h, r: …` is a small function written in place: the policy "whatever the table says now".']],
              ['return Q, curve', ['The table and its grades.']],
            ],
          },
        },
        { figure: 'UpdateStepper', caption: 'The first updates of a real run (Sixes, α = 0.1, ε = 0.1, seed 0), exactly as Python makes them. Step through and check the arithmetic.' },
        { md: `In the first turns almost every update changes nothing: the reward is 0 and the next row is all zeros, so the target is 0 and so is the old value. Values only start to move when a turn **ends with points**, and then the news travels backwards one step at a time: the last decision learns first, and the first decision learns from the last decision's values. That backward travel is the learned version of Part 2's backward induction.` },
        {
          predict: {
            prompt: `A real update from this run: holding ${show(firstNonzero.hand)} with ${firstNonzero.rollsLeft} roll left, the learner kept ${showKept(firstNonzero.kept)}. Its old value was ${f(firstNonzero.before)}; the turn ended with ${show(firstNonzero.next)}, scoring ${firstNonzero.reward} in Sixes. With α = 0.1, what is the new value?`,
            answer: firstNonzero.after, tolerance: 1e-9, compute: () => { const ups = []; train(5, { episodes: 30, onUpdate: u => ups.push(u) }); return ups.find(u => u.before !== 0).after },
            explain: `The turn ended, so target = ${firstNonzero.reward} + 1 × 0 = ${firstNonzero.reward}. New value = ${f(firstNonzero.before)} + 0.1 × (${firstNonzero.reward} − ${f(firstNonzero.before)}) = **${f(firstNonzero.after)}**.`,
            misconceptions: [{ answer: firstNonzero.reward, feedback: 'That is the target. With α = 0.1 the value only moves a tenth of the way there.' }, { answer: firstNonzero.before + 0.1 * firstNonzero.reward, tolerance: 1e-9, feedback: 'Close: the step is α × (target − **old value**), not α × target.' }],
          },
        },
        { note: 'One update: target = $r + \\gamma \\max_{k\'} Q(h\', k\')$, error = target − $Q$, $Q \\mathrel{+}= \\alpha \\times$ error. The target is **one sample** of the Bellman equation\'s right-hand side; averaging many samples replaces knowing $P$.' },
      ],
    },

    {
      id: 'q-learning-judged', number: '3.4', title: 'Q-learning, graded against the exact answer',
      goal: 'Train Q-learning on three boxes, read its exact learning curve against the optimum, and explain why 8,736 values learn slowly.',
      builds: ['td-update', 'judging-any-policy'],
      blocks: [
        { md: `In most of machine learning you can only see a learner's **training reward**: noisy, and polluted by its own exploring. Here we can do better. Every 5,000 turns, take the greedy policy from the table and **evaluate it exactly** with Part 2's \`evaluate\`. The curve that comes out has no noise from grading at all: every wiggle is a real change in the policy.

Run Q-learning (α = 0.1, ε = 0.1, seed 0) for 50,000 turns on three boxes:

| Box | Exact optimum | After 5,000 turns | After 50,000 turns |
|---|---|---|---|
| Sixes | ${f(T[5].optimum)} | ${f(T[5].q[0])} | ${f(last(T[5].q))} |
| Small straight | ${f(T[9].optimum)} | ${f(T[9].q[0])} | ${f(last(T[9].q))} |
| Chance | ${f(T[12].optimum)} | ${f(T[12].q[0])} | ${f(last(T[12].q))} |

It learns, but slowly, and Chance is **stuck**: flat at ${f(last(T[12].q))} for 45,000 turns.` },
        { figure: 'LearnCurves', props: { learner: 'q', box: 5 }, caption: 'A learner trained live in your browser with the same random numbers Python would use, graded exactly every few thousand turns. The dashed line is the optimum from Part 2.' },
        { python: { program: 'learn', label: 'Step through Q-learning in real Python' } },
        { md: `Why so slow? Count. There are 8,736 values. Each update changes one. A turn makes two updates, so 50,000 turns make 100,000: about **11 per value** on average, and far fewer for keeps that the policy rarely picks. Each update moves a value only 10% of the way toward a target that is itself one noisy sample.

Yet the policy only needs the **ordering** of values within each row to be right. The learner is spending most of its effort on rows and keeps that rarely matter. Lesson 3.7 cuts the number of values to learn by a factor of 12.` },
        {
          predict: {
            prompt: 'Q-learning on Sixes (α = 0.1, ε = 0.1, seed 0): what is its greedy policy\'s exact expected score after 50,000 turns? (3 decimals; it takes a moment)',
            answer: last(T[5].q), tolerance: 0.0006, compute: () => last(train(5, { episodes: 50000, alpha: 0.1, every: 50000 }).curve),
            explain: `${f(last(T[5].q))} against the optimum ${f(T[5].optimum)}: barely more than half. The perfect Sixes rule is simple (keep every 6), yet the table has not found it in most rows.`,
          },
        },
        {
          choice: {
            prompt: 'The curve is the **exact** value of the greedy policy. Why does it still go down sometimes?',
            options: [
              { text: 'An update can change which keep is best in some row to a worse one, because the values are noisy estimates', why: 'Yes. A lucky or unlucky sample can push a worse keep above a better one. The policy really got worse; the grading is exact.' },
              { text: 'Because `evaluate` uses random dice', why: '`evaluate` throws no dice: it sums over exact chances.' },
            ],
            answer: 0,
          },
        },
        { note: 'Exact grading shows the learner as it really is: progress, plateaus and setbacks. 8,736 values × noisy samples × small steps = slow. The next three lessons each attack one of those three factors.' },
      ],
    },

    {
      id: 'sarsa', number: '3.5', title: 'SARSA: learning the policy you follow',
      goal: 'State the SARSA target, explain on-policy against off-policy learning, and compare SARSA with Q-learning on the same turns.',
      builds: ['q-learning-judged'],
      blocks: [
        { md: `Q-learning's target uses the **best** next value, $\\max_{k'} Q(h', k')$, even when the action actually taken next is a random exploring one. It learns the values of the optimal policy while behaving differently: it is **off-policy**.

**SARSA** uses the value of the action **actually chosen** next:

$$\\text{target} = r + \\gamma\\, Q(h', k'_{\\text{chosen}})$$

Its name lists what one update uses: **S**tate, **A**ction, **R**eward, next **S**tate, next **A**ction. SARSA learns the values of the policy it is following, exploring included: it is **on-policy**. Since ε-greedy sometimes makes a random keep, SARSA's values for a state include the cost of those mistakes, and come out a little lower than Q-learning's.

In \`train\`, the only difference is one line: \`future = next_row[next_kept]\` instead of \`max(next_row.values())\`. That is why the next action was chosen before the update.` },
        { figure: 'LearnCurves', props: { learner: 'sarsa', box: 9 }, caption: 'Switch between Q-learning and SARSA on the same box, seed and settings.' },
        { md: `Measured over 50,000 turns (α = 0.1, ε = 0.1, seed 0):

| Box | Optimum | Q-learning | SARSA |
|---|---|---|---|
| Sixes | ${f(T[5].optimum)} | ${f(last(T[5].q))} | ${f(last(T[5].sarsa))} |
| Small straight | ${f(T[9].optimum)} | ${f(last(T[9].q))} | ${f(last(T[9].sarsa))} |
| Full house | ${f(T[8].optimum)} | ${f(last(T[8].q))} | ${f(last(T[8].sarsa))} |

Here they are close. A turn has only two decisions, and an exploring keep on the last roll costs a little; there is no cliff to fall off. In problems where one exploring step can be a disaster (KartLab's barriers, QMaze's cliff), SARSA learns noticeably more careful routes.` },
        {
          choice: {
            prompt: 'At the end of training, SARSA\'s values are compared with the exact optimal $Q^*$ of Part 2. Which is true?',
            options: [
              { text: 'They aim at $Q^\\pi$ for the ε-greedy policy, which is below $Q^*$ because exploring sometimes wastes the last roll', why: 'Yes. On-policy values include the behaviour\'s imperfection. With ε → 0 the two targets agree.' },
              { text: 'They aim at $Q^*$ exactly, like Q-learning', why: 'That is Q-learning\'s target. SARSA\'s next value is the exploring action\'s, not the best one\'s.' },
            ],
            answer: 0,
          },
        },
        { note: '**Q-learning**: target uses $\\max$, learns the optimal values (off-policy). **SARSA**: target uses the next action taken, learns the values of the behaviour it follows (on-policy). Same code but for one line.' },
      ],
    },

    {
      id: 'step-sizes', number: '3.6', title: 'Step sizes: averages, noise and getting stuck',
      goal: 'Show that step size 1/n makes each value an exact average, explain how a constant α remembers its starting value, and use that to explain the stuck Chance curve.',
      builds: ['sarsa'],
      blocks: [
        { md: `What does the update **do** to a value over many visits? Suppose the targets for one entry are $x_1, x_2, \\dots$ and use step $\\alpha_n = 1/n$ on the $n$-th visit:

$$Q_n = Q_{n-1} + \\frac{1}{n}(x_n - Q_{n-1}) = \\frac{n-1}{n}\\,Q_{n-1} + \\frac{1}{n}\\,x_n$$

With $Q_0 = 0$: $Q_1 = x_1$, $Q_2 = \\tfrac12 Q_1 + \\tfrac12 x_2 = \\tfrac{x_1 + x_2}{2}$, and by induction $Q_n = \\tfrac1n \\sum_{i=1}^n x_i$: **exactly the average** of the targets so far. The update rule with $\\alpha = 1/n$ is just a way to keep a running average without storing the samples.

With a **constant** $\\alpha$ it is different. Unrolling the same rule:

$$Q_n = (1-\\alpha)^n Q_0 + \\sum_{i=1}^{n} \\alpha (1-\\alpha)^{n-i} x_i$$

a weighted average that trusts recent targets most, plus a term $(1-\\alpha)^n Q_0$: the **starting value is still in there**. With α = 0.1 and $Q_0 = 0$, after 5 visits a value is still only $1 - 0.9^5 = 41\\%$ of the way to its targets' average. And a constant α never stops wobbling: each new noisy target moves it by α × (error).` },
        { figure: 'StepSizeFig', caption: 'The same stream of noisy targets (the score of one Chance keep, sampled with Python\'s dice) averaged two ways. 1/n settles on the true mean; α = 0.1 starts far too low and keeps wobbling.' },
        { md: `Now the stuck Chance curve makes sense. In Chance every target is positive. The keep that the greedy policy happens to pick is visited constantly, and its value climbs to about its true worth, around 20. Every other keep is visited only by exploration, a handful of times, and after a few visits at α = 0.1 its value is still a fraction of its worth: **it looks worse than it is**, so it never wins the argmax and never gets visited enough to catch up. The learner is stuck with whatever it found first.

With step 1/n the first visit already sets a value to a full sample of its worth, so a good keep tried even once by exploration can compete. Measured (ε = 0.1, seed 0, 50,000 turns):

| Box | Optimum | Q-learning, α = 0.1 | Q-learning, 1/n |
|---|---|---|---|
| Sixes | ${f(T[5].optimum)} | ${f(last(T[5].q))} | ${f(last(T[5].qAvg))} |
| Small straight | ${f(T[9].optimum)} | ${f(last(T[9].q))} | ${f(last(T[9].qAvg))} |
| Chance | ${f(T[12].optimum)} | ${f(last(T[12].q))} | ${f(last(T[12].qAvg))} |` },
        { figure: 'LearnCurves', props: { learner: 'q', box: 12, avg: true }, caption: 'Chance with step 1/n: no longer stuck. Toggle the step size to compare.' },
        {
          predict: {
            prompt: 'Constant α = 0.1, starting at $Q_0 = 0$, every target exactly 20. What is the value after 5 updates? (3 decimals)',
            answer: 20 * (1 - 0.9 ** 5), tolerance: 0.0006, compute: () => { let q = 0; for (let i = 0; i < 5; i++) q += 0.1 * (20 - q); return q },
            explain: '$Q_5 = (1 - 0.9^5) \\times 20 = 0.40951 \\times 20 = 8.190$. Less than half of a value it has been told five times. With 1/n it would be exactly 20 after the first update.',
            misconceptions: [{ answer: 10, feedback: 'That is 5 × α × 20, as if each step added 2. But each step adds a tenth of the **remaining** gap, which shrinks.' }],
          },
        },
        {
          choice: {
            prompt: 'If 1/n is so good, why would anyone use a constant α?',
            options: [
              { text: 'When what is being estimated changes over time, a constant α keeps adapting, while 1/n gives an old sample as much weight as a new one', why: 'Yes. In Q-learning the targets themselves depend on other estimates that are still improving, so the thing being averaged drifts. Constant α tracks drift; 1/n is ideal only for a fixed target. In practice both appear.' },
              { text: 'Because 1/n is slower to compute', why: 'It costs one counter per entry: nothing.' },
            ],
            answer: 0,
          },
        },
        { note: 'Step 1/n = exact running average. Constant α = recency-weighted average that remembers its starting value as $(1-\\alpha)^n Q_0$ and never stops wobbling. Starting values and step sizes decide what a learner can discover, not just how fast.' },
      ],
    },

    {
      id: 'afterstates', number: '3.7', title: 'Many keeps, one future: afterstates',
      goal: 'Recognise that a keep\'s value depends only on the dice kept, learn those values directly, and measure the speed-up.',
      builds: ['step-sizes', 'value-of-a-keep'],
      blocks: [
        { md: `Look again at lesson 2.2's formula: $Q_1(h, k) = \\sum_{h'} P(h' \\mid k)\\, V_0(h')$. The hand $h$ **isn't on the right-hand side**. Keeping $(6, 6)$ from $(1, 3, 4, 6, 6)$ and keeping $(6, 6)$ from $(2, 2, 5, 6, 6)$ lead to exactly the same future. The Q-table stores them as two separate numbers, learned separately; in fact, $(6, 6)$ with two rolls left can be kept from 21 different hands.

The situation **after the decision but before the dice** (here: the kept dice and the rolls left) is called an **afterstate**. Its value $W(r, k)$ is all a decision needs:

$$Q_r(h, k) = W(r, k) \\qquad \\pi(h, r) = \\arg\\max_{k \\in \\mathcal A(h)} W(r, k)$$

There are 462 different sets of kept dice, so 924 afterstate values instead of 8,736 Q-values, and **every** time a set of dice is kept, from whatever hand, its one value learns. The TD update is the same idea: after the reroll, the target is the best $W$ of the new hand's keeps (or its score at the end).` },
        {
          code: {
            file: 'learn.py', fn: 'after_value', notes: [
              ['def after_value(W, rolls_left, kept):', ['`W` is a plain dictionary from `(rolls_left, kept)` to a value.']],
              ['return W.get((rolls_left, kept), 0.0)', ['0.0 for an afterstate never updated, without storing it.']],
            ],
          },
        },
        {
          code: {
            file: 'learn.py', fn: 'choose_after', notes: [
              ['def choose_after(W, hand, rolls_left, epsilon, rng):', ['ε-greedy, as before, but each keep is judged by `after_value`.']],
              ['options = KEEPS[hand]', ['The actions, from the table built once in `exact.py`.']],
              ['if rng.random() < epsilon:', ['Explore with chance ε…']],
              ['return rng.choice(options)', ['…any keep.']],
              ['best = max(after_value(W, rolls_left, kept) for kept in options)', ['The best value among this hand\'s keeps. `max(… for …)` takes a **generator expression**: like a list comprehension without building the list.']],
              ['tied = [kept for kept in options if after_value(W, rolls_left, kept) == best]', ['All keeps sharing it…']],
              ['return rng.choice(tied)', ['…one at random.']],
            ],
          },
        },
        {
          code: {
            file: 'learn.py', fn: 'greedy_after', notes: [
              ['def greedy_after(W, hand, rolls_left):', ['For grading.']],
              ['return max(KEEPS[hand], key=lambda kept: after_value(W, rolls_left, kept))', ['The first keep with the biggest afterstate value.']],
            ],
          },
        },
        {
          code: {
            file: 'learn.py', fn: 'train_after', notes: [
              ['def train_after(box, episodes=20000, alpha=None, epsilon=0.1, seed=0, every=0):', ['The same settings as `train`, with 1/n as the default step.']],
              ['rng = random.Random(seed)', ['One generator for the run.']],
              ['W = {}', ['Afterstate values.']],
              ['N = {}', ['Visit counts, for 1/n.']],
              ['curve = []', ['Exact grades.']],
              ['for episode in range(episodes):', ['One turn per trip.']],
              ['hand = tuple(sorted(roll(5, rng)))', ['First roll.']],
              ['for rolls_left in (2, 1):', ['The two decisions. Simpler than `train`\'s `while` loop: the next action\'s value isn\'t needed (the target takes the best).']],
              ['kept = choose_after(W, hand, rolls_left, epsilon, rng)', ['Choose what to keep.']],
              ['hand = reroll(kept, rng)', ['Roll: the afterstate becomes a new hand.']],
              ['if rolls_left == 1:', ['End of the turn.']],
              ['target = score(hand, box)', ['The reward is the target.']],
              ['target = max(after_value(W, 1, k) for k in KEEPS[hand])', ['Otherwise, the best afterstate available from the new hand with one roll left.'], { tex: '\\text{target} = \\max_{k\' \\in \\mathcal A(h\')} W(1, k\')' }],
              ['key = (rolls_left, kept)', ['The afterstate being updated.']],
              ['N[key] = N.get(key, 0) + 1', ['Count the visit.']],
              ['step = alpha if alpha is not None else 1 / N[key]', ['α or 1/n.']],
              ['W[key] = after_value(W, rolls_left, kept) + step * (target - after_value(W, rolls_left, kept))', ['The same update as always.'], { tex: 'W(r, k) \\leftarrow W(r, k) + \\alpha\\,[\\text{target} - W(r, k)]' }],
              ['if every and (episode + 1) % every == 0:', ['Grade every so often…']],
              ['curve.append(evaluate(lambda h, r: greedy_after(W, h, r), box))', ['…exactly.']],
              ['return W, curve', ['The values and grades.']],
            ],
          },
        },
        { figure: 'LearnCurves', props: { learner: 'after', box: 5, avg: true }, caption: 'The afterstate learner. Compare it with the Q-table on the same box.' },
        { python: { program: 'after', label: 'Step through the afterstate learner in real Python' } },
        { md: `Measured, step 1/n, ε = 0.1, seed 0, 50,000 turns:

| Box | Optimum | Q-table | Afterstates | Afterstate values learned |
|---|---|---|---|---|
| Sixes | ${f(T[5].optimum)} | ${f(last(T[5].qAvg))} | **${f(last(T[5].afterAvg))}** | ${T[5].afterAvgSize} |
| Small straight | ${f(T[9].optimum)} | ${f(last(T[9].qAvg))} | **${f(last(T[9].afterAvg))}** | ${T[9].afterAvgSize} |
| Chance | ${f(T[12].optimum)} | ${f(last(T[12].qAvg))} | **${f(last(T[12].afterAvg))}** | ${T[12].afterAvgSize} |

After only **5,000** turns the afterstate learner on Sixes is at ${f(T[5].afterAvg[0])}, already better than the Q-table after 50,000.

This is the most important idea in this part. **The representation decides how much a learner must learn.** Nothing about the update changed; we only stopped storing the same fact 21 times. Part 4 does the same thing one level up, for the whole scorecard.` },
        {
          predict: {
            prompt: 'The afterstate learner on Small straight (step 1/n, ε = 0.1, seed 0): exact expected score after 50,000 turns? (3 decimals)',
            answer: last(T[9].afterAvg), tolerance: 0.0006, compute: () => last(trainAfter(9, { episodes: 50000, every: 50000 }).curve),
            explain: `${f(last(T[9].afterAvg))}, within ${f(T[9].optimum - last(T[9].afterAvg))} of the optimum ${f(T[9].optimum)}.`,
          },
        },
        {
          choice: {
            prompt: 'Why can the afterstate learner use the same value for keeping `(6, 6)` from different hands, when the Q-table can\'t?',
            options: [
              { text: 'Because where the turn goes next depends only on the kept dice and rolls left: the hand they came from is forgotten the moment the others are rerolled', why: 'Yes. Two decisions with the same afterstate have the same future, so the same value. Spotting that is free knowledge the learner no longer has to discover 21 times.' },
              { text: 'Because the afterstate learner knows the transition probabilities', why: 'It doesn\'t: it learns from the same rolls of real dice as Q-learning. It only uses the structure of the game: what a keep leaves behind.' },
            ],
            answer: 0,
          },
        },
        { note: 'An **afterstate** is the situation right after a decision, before chance acts. When many state-action pairs lead to the same afterstate, learn the afterstate\'s value instead: here 924 values instead of 8,736, and near-perfect play in 50,000 turns.' },
      ],
    },

    {
      id: 'rare-rewards', number: '3.8', title: 'When reward is rare: the Yahtzee box',
      goal: 'Explain why sparse rewards make learning slow, using the Yahtzee box\'s measured curves against its exact optimum.',
      builds: ['afterstates', 'markov-chain'],
      blocks: [
        { md: `Every learner so far eventually did well. Now aim for the **Yahtzee** box. Its exact optimum is ${f(T[11].optimum)}, and you already know the perfect policy: chase the biggest group (lesson 2.6 proved it). Measured after 50,000 turns (ε = 0.1, seed 0):

| Learner | α = 0.1 | 1/n |
|---|---|---|
| Q-table, Q-learning | ${f(last(T[11].q))} | ${f(last(T[11].qAvg))} |
| Q-table, SARSA | ${f(last(T[11].sarsa))} | ${f(last(T[11].sarsaAvg))} |
| Afterstates | ${f(last(T[11].after))} | ${f(last(T[11].afterAvg))} |

Even the afterstate learner reaches less than two thirds of the optimum. Why is this box so much harder than Sixes?` },
        { md: `**The reward is rare.** A turn scores 50 or **0**, and even played perfectly it scores 50 only about one turn in 22. In most turns every target is 0, which teaches only "this didn't work this time". A keep that is truly better gets few successes to prove it, and with ε-greedy exploring at random, the learner rarely follows a promising path to the end.

Compare Sixes: almost every turn scores something, and every extra 6 gives a little more. The reward **grades** every attempt. That difference, between **dense** and **sparse** rewards, is one of the main reasons some reinforcement learning problems take minutes and others take weeks.

Ways out, each with a cost: much more experience; exploring in a smarter way than at random; **reward shaping** (paying for progress, say for each extra matching die, which risks teaching the wrong goal); or knowledge about the problem's structure, like the afterstates that helped here.` },
        { figure: 'LearnCurves', props: { learner: 'after', box: 11, avg: true, episodes: 100000 }, caption: 'The Yahtzee box. Try more turns, both step sizes, and both learners.' },
        {
          predict: {
            prompt: 'Played perfectly, what fraction of turns aimed at the Yahtzee box earn **no reward at all**? (3 decimals)',
            answer: 1 - T[11].optimum / 50, tolerance: 0.0006, compute: () => 1 - optimum(11) / 50,
            explain: `$1 - ${f(T[11].optimum)}/50 = 0.954$: more than 95% of turns, even perfect ones, end with a target of 0.`,
          },
        },
        {
          choice: {
            prompt: 'You "shape" the reward: 10 points per die matching the biggest group at the end of the turn, plus 50 for a Yahtzee. What is the risk?',
            options: [
              { text: 'The learner optimises the shaped reward, which may not be the real goal: it could, for example, learn to settle for four of a kind', why: 'Yes. A learner maximises what it is paid, not what you meant. Shaping must be designed so the best shaped policy is still the best real one (there is theory for that: potential-based shaping).' },
              { text: 'None: more reward always helps', why: 'More **signal** helps; but a different reward defines a different problem, with possibly a different best policy.' },
            ],
            answer: 0,
          },
        },
        { note: '**Sparse rewards** give the learner little to learn from. Dense rewards grade every attempt. Here the exact optimum shows exactly how far short the learners fall, something you almost never get to see.' },
      ],
    },
  ],
}

