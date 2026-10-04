export default {
  order: 2,

  id: 'mg9-002',

  slug: 'exploration',

  title: 'Exploration',

  subtitle: 'Why an agent must sometimes do what looks worse, and five ways to make it, measured on a bandit and on Cliff Walk.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'exploration',
    'epsilon-greedy',
    'softmax',
    'ucb',
    'bandits',
  ],

  aliases: 'exploration exploitation epsilon greedy decay schedule softmax boltzmann temperature optimistic initial values ucb upper confidence bound multi-armed bandit glie',

  timeToComplete: 55,

  coreConcept: 'An agent learns only about what it tries. Always taking the action that currently looks best (exploiting) can lock it onto a mediocre choice; trying others (exploring) costs reward now for knowledge later. ε-greedy explores at random with probability ε, often decaying ε over time; softmax prefers better-looking actions by a temperature τ; optimistic initial values make untried actions look best, so a greedy agent tries them; UCB adds a bonus for actions tried rarely. To learn the optimal policy, every action must keep being tried, while the policy becomes greedy in the limit (GLIE).',

  prerequisites: ['mg9-001'],

  nextLesson: 'mg9-003',

  hook: {
    question: 'You find a restaurant you like. Do you go back every time, or try the new place, which might be better or worse? An agent faces that choice on every step, and its answer decides what it can ever learn.',
    realWorldContext: 'Recommendation systems, clinical trials and A/B tests are bandit problems; game AI tuned by learning faces the same trade-off. Sutton & Barto, chapter 2, introduces it with the 10-armed testbed used here.',
  },

  intuition: {
    prose: [
      '**The bandit.** The simplest setting has one state and ten actions, slot machines with unknown average payouts. The agent estimates each arm\'s value from the rewards it gets, $Q(a) \\leftarrow Q(a) + \\frac{1}{N(a)}[R - Q(a)]$: the same "old + step × (target − old)" as TD, with a target that is just the reward (cell 3). Before running cell 1, predict whether always taking the best-looking arm (greedy) does well: it does not. Over 200 problems it finds the best arm only 42% of the time by the end, and averages 1.01 reward per pull, against ε-greedy\'s 82% and 1.25 with ε = 0.1.',
      '**Why greedy fails.** An arm that pays badly on its first pull gets a low estimate and is never tried again, so the estimate is never corrected. Exploration is the only way to fix a wrong low estimate. ε = 0.01 explores less, so it is slower to find the best arm (61% by 1000 pulls) but wastes fewer pulls once it has: in the long run it overtakes ε = 0.1.',
      "**Optimism.** Start every estimate high (Q₀ = 5, above any arm's value). Every arm disappoints when tried, so the untried ones look best and a purely greedy agent tries them all. It is the best of cell 2's methods late on (1.41). On Cliff Walk every real return is negative, so Q₀ = 0 is already optimistic: greedy Q-learning (ε = 0) finds the 13-move walk on all 5 seeds with no random moves at all. With a pessimistic Q₀ = −100 it stops exploring early and keeps a longer walk on 3 of 5 seeds (greedy return −14.2 ± 1.1).",
      '**UCB and softmax.** UCB (upper confidence bound) picks $\\arg\\max_a [Q(a) + c\\sqrt{\\ln t / N(a)}]$: an arm tried rarely gets a large bonus, which shrinks as it is tried. Softmax (Boltzmann) picks $a$ with probability $e^{Q(a)/\\tau} / \\sum_b e^{Q(b)/\\tau}$: better-looking arms more often, but every arm sometimes; a high temperature τ is nearly random, a low one nearly greedy. Unlike ε-greedy, both explore *in proportion to* what they know.',
      "**Schedules.** In a sequential problem, exploration has a cost every step: on the cliff a random step next to the spikes falls off. Comparing over 5 seeds (200 episodes, α 0.5, γ 1), the average return of the last 50 training episodes is −43.4 ± 7.2 with ε constant at 0.1, −25.9 ± 8.1 with ε falling linearly from 0.3 to 0.01, −16.7 ± 2.1 falling exponentially, and −13.0 ± 0 for softmax with τ falling from 5 to 0.1. All of them, played greedily at the end, take the 13-move walk. Decaying exploration is how you explore early and exploit late; the theory's condition is GLIE: greedy in the limit, with infinite exploration.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: choosing how to explore',
        body: 'Step 1. Start simple: ε-greedy with ε around 0.1. Step 2. If exploration is costly during learning (falls, deaths), decay it: linear or exponential, to near 0. Step 3. If rewards are all negative and the problem is small, try a greedy agent with optimistic starting values. Step 4. Compare settings over several seeds; report the mean and spread of both the learning return and the final greedy score.',
      },
      {
        type: 'warning',
        title: 'Two numbers, two questions',
        body: '"How well did it do while learning?" (late training return, with exploration on) and "how good is what it learned?" (greedy score, exploration off) are different questions. On the cliff ε = 0.1 constant does worst at the first and as well as any at the second.',
      },
      {
        type: 'warning',
        title: 'Optimism only works when it is optimistic',
        body: 'Q₀ must be above the true values. On the cliff 0 is optimistic and −100 is not. With rewards that can be large and positive, a Q₀ of 0 is pessimistic, and a greedy agent stops exploring.',
      },
      {
        type: 'insight',
        title: 'What the picture shows (cell 4)',
        body: 'Misconception it contradicts: "exploring wastes reward". The greedy line rises fastest at first and then stays lowest; the methods that explore pay early and earn more later.',
      },
      {
        type: 'insight',
        title: 'In the ML Lab',
        body: "ML Lab lesson 37.2 derives ε-greedy's probabilities, and lesson 37.4 uses them in Q-learning. [Open the ML Lab](#/lab/ml-lab).",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: exploring a bandit',
        caption: 'Greedy, ε-greedy, optimistic starts, UCB and softmax on the 10-armed testbed, 200 runs each.',
        props: {
          lesson: {
            title: 'Exploration',
            subtitle: 'The 10-armed bandit.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Greedy against ε-greedy\nPredict first: does greedy win?',
                startCode: '// The 10-armed bandit: ten slot machines (actions). Arm a pays a reward drawn around its true value q*(a), with\n// spread 1; the true values are themselves drawn around 0 (spread 1) for each new problem. The agent does not\n// know them; it learns estimates Q(a) by trying arms. One "run" is a new problem played for 1000 pulls.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst argmaxRandom = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One run of a method: average reward and whether the best arm was pulled, at each step.\nfunction play(choose, { steps = 1000, q0 = 0, alpha = 0, seed }) {\n  const rand = seeded(seed), truth = Array.from({ length: 10 }, () => normal(rand)), best = truth.indexOf(Math.max(...truth))\n  const Q = new Array(10).fill(q0), N = new Array(10).fill(0), rewards = [], optimal = []\n  for (let t = 1; t <= steps; t++) {\n    const a = choose(Q, N, t, rand)\n    const r = truth[a] + normal(rand)\n    N[a]++\n    Q[a] += (alpha || 1 / N[a]) * (r - Q[a])          // sample average (α = 1/n), or a constant step\n    rewards.push(r); optimal.push(a === best ? 1 : 0)\n  }\n  return { rewards, optimal }\n}\nconst greedy = (Q, N, t, rand) => argmaxRandom(Q, rand)\nconst epsGreedy = (eps) => (Q, N, t, rand) => (rand() < eps ? Math.floor(rand() * 10) : argmaxRandom(Q, rand))\nconst ucb = (c) => (Q, N, t, rand) => { const u = Q.map((q, a) => (N[a] === 0 ? Infinity : q + c * Math.sqrt(Math.log(t) / N[a]))); return argmaxRandom(u, rand) }\nconst softmax = (tau) => (Q, N, t, rand) => { const m = Math.max(...Q), e = Q.map((q) => Math.exp((q - m) / tau)), z = e.reduce((a, b) => a + b, 0); let u = rand() * z, a = 0; while (a < 9 && u >= e[a]) { u -= e[a]; a++ } return a }\n// Averaged over runs: the mean reward and % best-arm pulls over steps 901–1000, and over all 1000.\nfunction average(choose, opts, runs = 200) {\n  let late = 0, lateOpt = 0, all = 0\n  for (let k = 0; k < runs; k++) {\n    const r = play(choose, { ...opts, seed: k + 1 })\n    late += r.rewards.slice(900).reduce((a, b) => a + b, 0) / 100\n    lateOpt += r.optimal.slice(900).reduce((a, b) => a + b, 0) / 100\n    all += r.rewards.reduce((a, b) => a + b, 0) / 1000\n  }\n  return { late: late / runs, lateOpt: lateOpt / runs, all: all / runs }\n}\nconst show = (name, r) => console.log(name.padEnd(28) + \'reward (last 100) \' + r.late.toFixed(2) + \', best arm \' + Math.round(r.lateOpt * 100) + \'%, reward (all 1000) \' + r.all.toFixed(2))\n\n// Greedy against ε-greedy, sample averages, 200 runs. Predict first: does always taking the best-looking arm win?\nshow(\'greedy (ε = 0)\', average(greedy, {}))\nshow(\'ε-greedy, ε = 0.01\', average(epsGreedy(0.01), {}))\nshow(\'ε-greedy, ε = 0.1\', average(epsGreedy(0.1), {}))',
              },
              {
                type: 'js',
                instruction: '### 2. Optimism, UCB and softmax\nPredict first: which earns most late on?',
                startCode: '// The 10-armed bandit: ten slot machines (actions). Arm a pays a reward drawn around its true value q*(a), with\n// spread 1; the true values are themselves drawn around 0 (spread 1) for each new problem. The agent does not\n// know them; it learns estimates Q(a) by trying arms. One "run" is a new problem played for 1000 pulls.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst argmaxRandom = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One run of a method: average reward and whether the best arm was pulled, at each step.\nfunction play(choose, { steps = 1000, q0 = 0, alpha = 0, seed }) {\n  const rand = seeded(seed), truth = Array.from({ length: 10 }, () => normal(rand)), best = truth.indexOf(Math.max(...truth))\n  const Q = new Array(10).fill(q0), N = new Array(10).fill(0), rewards = [], optimal = []\n  for (let t = 1; t <= steps; t++) {\n    const a = choose(Q, N, t, rand)\n    const r = truth[a] + normal(rand)\n    N[a]++\n    Q[a] += (alpha || 1 / N[a]) * (r - Q[a])          // sample average (α = 1/n), or a constant step\n    rewards.push(r); optimal.push(a === best ? 1 : 0)\n  }\n  return { rewards, optimal }\n}\nconst greedy = (Q, N, t, rand) => argmaxRandom(Q, rand)\nconst epsGreedy = (eps) => (Q, N, t, rand) => (rand() < eps ? Math.floor(rand() * 10) : argmaxRandom(Q, rand))\nconst ucb = (c) => (Q, N, t, rand) => { const u = Q.map((q, a) => (N[a] === 0 ? Infinity : q + c * Math.sqrt(Math.log(t) / N[a]))); return argmaxRandom(u, rand) }\nconst softmax = (tau) => (Q, N, t, rand) => { const m = Math.max(...Q), e = Q.map((q) => Math.exp((q - m) / tau)), z = e.reduce((a, b) => a + b, 0); let u = rand() * z, a = 0; while (a < 9 && u >= e[a]) { u -= e[a]; a++ } return a }\n// Averaged over runs: the mean reward and % best-arm pulls over steps 901–1000, and over all 1000.\nfunction average(choose, opts, runs = 200) {\n  let late = 0, lateOpt = 0, all = 0\n  for (let k = 0; k < runs; k++) {\n    const r = play(choose, { ...opts, seed: k + 1 })\n    late += r.rewards.slice(900).reduce((a, b) => a + b, 0) / 100\n    lateOpt += r.optimal.slice(900).reduce((a, b) => a + b, 0) / 100\n    all += r.rewards.reduce((a, b) => a + b, 0) / 1000\n  }\n  return { late: late / runs, lateOpt: lateOpt / runs, all: all / runs }\n}\nconst show = (name, r) => console.log(name.padEnd(28) + \'reward (last 100) \' + r.late.toFixed(2) + \', best arm \' + Math.round(r.lateOpt * 100) + \'%, reward (all 1000) \' + r.all.toFixed(2))\n\n// Two other ways to explore. Optimistic start: every Q(a) begins at +5, far above any arm\'s value, so every\n// untried arm looks best and gets tried (greedy, constant α = 0.1). UCB: add a bonus that is large for arms tried\n// rarely, c √(ln t / N(a)). Softmax: pull arms with probability ∝ exp(Q/τ). Predict first: which earns most late on?\nshow(\'ε-greedy, ε = 0.1, Q₀ = 0\', average(epsGreedy(0.1), { alpha: 0.1 }))\nshow(\'greedy, Q₀ = 5 (optimistic)\', average(greedy, { q0: 5, alpha: 0.1 }))\nshow(\'UCB, c = 2\', average(ucb(2), {}))\nshow(\'softmax, τ = 0.2\', average(softmax(0.2), {}))',
              },
              {
                type: 'js',
                instruction: '### 3. The same update as TD\nPredict first: the estimate after 2, 4, 9.',
                startCode: "// The update the bandit uses is the same shape as TD's: new = old + step × (target − old). With step 1/n it is the\n// exact average of the n rewards seen. Predict first: the estimate after rewards 2, 4 and 9.\nlet Q = 0, n = 0\nfor (const r of [2, 4, 9]) { n++; Q += (1 / n) * (r - Q); console.log('after ' + n + ' reward(s): Q = ' + Q) }\n// A constant step weights recent rewards more: after many steps, the reward k steps ago has weight α(1 − α)^k.\nconst alpha = 0.1\nconsole.log('constant α = 0.1: weights of the last 4 rewards ' + [0, 1, 2, 3].map((k) => +(alpha * (1 - alpha) ** k).toFixed(4)).join(', '))",
              },
              {
                type: 'js',
                instruction: '### 4. See it\nReward over time.',
                startCode: '// The 10-armed bandit: ten slot machines (actions). Arm a pays a reward drawn around its true value q*(a), with\n// spread 1; the true values are themselves drawn around 0 (spread 1) for each new problem. The agent does not\n// know them; it learns estimates Q(a) by trying arms. One "run" is a new problem played for 1000 pulls.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst argmaxRandom = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One run of a method: average reward and whether the best arm was pulled, at each step.\nfunction play(choose, { steps = 1000, q0 = 0, alpha = 0, seed }) {\n  const rand = seeded(seed), truth = Array.from({ length: 10 }, () => normal(rand)), best = truth.indexOf(Math.max(...truth))\n  const Q = new Array(10).fill(q0), N = new Array(10).fill(0), rewards = [], optimal = []\n  for (let t = 1; t <= steps; t++) {\n    const a = choose(Q, N, t, rand)\n    const r = truth[a] + normal(rand)\n    N[a]++\n    Q[a] += (alpha || 1 / N[a]) * (r - Q[a])          // sample average (α = 1/n), or a constant step\n    rewards.push(r); optimal.push(a === best ? 1 : 0)\n  }\n  return { rewards, optimal }\n}\nconst greedy = (Q, N, t, rand) => argmaxRandom(Q, rand)\nconst epsGreedy = (eps) => (Q, N, t, rand) => (rand() < eps ? Math.floor(rand() * 10) : argmaxRandom(Q, rand))\nconst ucb = (c) => (Q, N, t, rand) => { const u = Q.map((q, a) => (N[a] === 0 ? Infinity : q + c * Math.sqrt(Math.log(t) / N[a]))); return argmaxRandom(u, rand) }\nconst softmax = (tau) => (Q, N, t, rand) => { const m = Math.max(...Q), e = Q.map((q) => Math.exp((q - m) / tau)), z = e.reduce((a, b) => a + b, 0); let u = rand() * z, a = 0; while (a < 9 && u >= e[a]) { u -= e[a]; a++ } return a }\n// Averaged over runs: the mean reward and % best-arm pulls over steps 901–1000, and over all 1000.\nfunction average(choose, opts, runs = 200) {\n  let late = 0, lateOpt = 0, all = 0\n  for (let k = 0; k < runs; k++) {\n    const r = play(choose, { ...opts, seed: k + 1 })\n    late += r.rewards.slice(900).reduce((a, b) => a + b, 0) / 100\n    lateOpt += r.optimal.slice(900).reduce((a, b) => a + b, 0) / 100\n    all += r.rewards.reduce((a, b) => a + b, 0) / 1000\n  }\n  return { late: late / runs, lateOpt: lateOpt / runs, all: all / runs }\n}\nconst show = (name, r) => console.log(name.padEnd(28) + \'reward (last 100) \' + r.late.toFixed(2) + \', best arm \' + Math.round(r.lateOpt * 100) + \'%, reward (all 1000) \' + r.all.toFixed(2))\n\n// Reward over time, averaged over 200 runs (smoothed over 20 pulls): greedy (grey), ε = 0.1 (blue), optimistic\n// greedy (green), UCB (orange).\nfunction curve(choose, opts) {\n  const sum = new Array(1000).fill(0)\n  for (let k = 0; k < 200; k++) play(choose, { ...opts, seed: k + 1 }).rewards.forEach((r, i) => { sum[i] += r / 200 })\n  return sum.map((_, i) => sum.slice(Math.max(0, i - 19), i + 1).reduce((a, b) => a + b, 0) / Math.min(20, i + 1))\n}\nconst lines = [[curve(greedy, {}), \'#94a3b8\'], [curve(epsGreedy(0.1), {}), \'#60a5fa\'], [curve(greedy, { q0: 5, alpha: 0.1 }), \'#34d399\'], [curve(ucb(2), {}), \'#f59e0b\']]\nconst canvas = document.createElement(\'canvas\'), W = 420, H = 220\ncanvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = \'width: \' + W + \'px; height: \' + H + \'px; display: block; margin: 0 auto\'\ndocument.body.appendChild(canvas)\nconst g = canvas.getContext(\'2d\'); g.scale(2, 2); g.fillStyle = \'#0f1923\'; g.fillRect(0, 0, W, H)\nconst X = (i) => 40 + (i / 999) * (W - 56), Y = (v) => H - 28 - ((v + 0.25) / 1.95) * (H - 50)\ng.strokeStyle = \'#334155\'; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(999), Y(0)); g.stroke()\nfor (const [c, color] of lines) { g.strokeStyle = color; g.lineWidth = 1.6; g.beginPath(); c.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke() }\ng.fillStyle = \'#cbd5e1\'; g.font = \'11px sans-serif\'\ng.fillText(\'average reward\', 6, 16); g.fillText(\'0\', 26, Y(0) + 4); g.fillText(\'1.5\', 18, Y(1.5) + 4); g.fillText(\'pulls →\', W - 50, H - 8)\ng.fillText(\'grey greedy · blue ε 0.1 · green optimistic · orange UCB\', 100, 16)\nconsole.log(\'final smoothed reward: \' + lines.map(([c]) => c[999].toFixed(2)).join(\', \'))',
                showPreviewByDefault: true,
                outputHeight: 270,
              },
              {
                type: 'challenge',
                instruction: "### 5. Challenge: ε-greedy's probabilities\nThe cases below check it.",
                startCode: "// Write the probabilities of ε-greedy: each action gets ε/(number of actions), and the best action (or each of the\n// tied best, sharing it) also gets 1 − ε. Return a list, one probability per action.\nfunction epsilonGreedyProbs(Q, epsilon) {\n  return Q.map(() => 0)\n}\n\n// ── The check (leave this part as it is) ──\nconst near = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9)\nconst cases = [\n  { args: [[1, 5, 2], 0.3], want: [0.1, 0.8, 0.1], why: 'ε/3 = 0.1 each, and the best (5) also gets 1 − ε = 0.7' },\n  { args: [[0, 0, 0, 0], 0], want: [0.25, 0.25, 0.25, 0.25], why: 'with all tied, the four share 1 − ε equally' },\n  { args: [[3, 7, 7], 0.6], want: [0.2, 0.4, 0.4], why: 'ε/3 = 0.2 each; the two tied best share 0.4: 0.2 more each' },\n  { args: [[9, 1], 1], want: [0.5, 0.5], why: 'ε = 1 is uniformly random' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = epsilonGreedyProbs(...c.args)\n  const ok = Array.isArray(got) && near(got, c.want)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got [' + (Array.isArray(got) ? got.map((x) => +Number(x).toFixed(4)).join(', ') : got) + ']' + (ok ? '' : ', want [' + c.want.join(', ') + ']: ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is ε-greedy.' : passed + ' of 4 cases pass.')",
                solutionCode: "// Write the probabilities of ε-greedy: each action gets ε/(number of actions), and the best action (or each of the\n// tied best, sharing it) also gets 1 − ε. Return a list, one probability per action.\nfunction epsilonGreedyProbs(Q, epsilon) {\n  const best = Math.max(...Q), ties = Q.filter((q) => q === best).length\n  return Q.map((q) => epsilon / Q.length + (q === best ? (1 - epsilon) / ties : 0))\n}\n\n// ── The check (leave this part as it is) ──\nconst near = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9)\nconst cases = [\n  { args: [[1, 5, 2], 0.3], want: [0.1, 0.8, 0.1], why: 'ε/3 = 0.1 each, and the best (5) also gets 1 − ε = 0.7' },\n  { args: [[0, 0, 0, 0], 0], want: [0.25, 0.25, 0.25, 0.25], why: 'with all tied, the four share 1 − ε equally' },\n  { args: [[3, 7, 7], 0.6], want: [0.2, 0.4, 0.4], why: 'ε/3 = 0.2 each; the two tied best share 0.4: 0.2 more each' },\n  { args: [[9, 1], 1], want: [0.5, 0.5], why: 'ε = 1 is uniformly random' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = epsilonGreedyProbs(...c.args)\n  const ok = Array.isArray(got) && near(got, c.want)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got [' + (Array.isArray(got) ? got.map((x) => +Number(x).toFixed(4)).join(', ') : got) + ']' + (ok ? '' : ', want [' + c.want.join(', ') + ']: ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is ε-greedy.' : passed + ' of 4 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Ways to explore',
        props: {
          task: 'explore-compare',
          lesson: 'mg9-002',
          checkpoint: 'cp-mg9-002-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** ε-greedy picks each of $|\\mathcal{A}|$ actions with probability $\\varepsilon/|\\mathcal{A}|$, plus $1 - \\varepsilon$ for the greedy one (shared among ties): $\\pi(a \\mid s) = \\varepsilon/|\\mathcal{A}| + (1 - \\varepsilon)\\,[a = \\arg\\max_b Q(s, b)]$.',
      "With sample averages, each estimate is the mean of its rewards, so its error shrinks like $1/\\sqrt{N(a)}$. UCB's bonus $c\\sqrt{\\ln t / N(a)}$ is shaped like that error: it is an optimistic estimate, the top of a confidence interval, and its regret grows only logarithmically in t.",
      'Convergence of Q-learning and SARSA to the optimal policy needs every state–action pair visited infinitely often; SARSA additionally needs the policy to become greedy in the limit. ε-greedy with $\\varepsilon_t = 1/t$ is GLIE; a constant ε is not, which is why a constant-ε SARSA learns the value of the exploring policy (lesson 9.4).',
    ],
    equations: [
      {
        label: 'Incremental average',
        latex: 'Q_{n+1} = Q_n + \\frac{1}{n}\\,[R_n - Q_n]',
      },
      {
        label: 'ε-greedy',
        latex: '\\pi(a) = \\frac{\\varepsilon}{|\\mathcal{A}|} + (1 - \\varepsilon)\\,\\mathbb{1}[a = \\arg\\max_b Q(b)]',
      },
      {
        label: 'Softmax',
        latex: '\\pi(a) = \\frac{e^{Q(a)/\\tau}}{\\sum_b e^{Q(b)/\\tau}}',
      },
      {
        label: 'UCB',
        latex: 'A_t = \\arg\\max_a \\left[Q_t(a) + c\\sqrt{\\frac{\\ln t}{N_t(a)}}\\,\\right]',
      },
      {
        label: 'Constant-step weights',
        latex: 'Q_{n+1} = (1 - \\alpha)^n Q_1 + \\sum_{i=1}^{n} \\alpha (1 - \\alpha)^{n-i} R_i',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "Formal statement: for a bandit with sub-Gaussian rewards, UCB1's expected regret after t pulls is $O(\\sum_{a: \\Delta_a > 0} \\ln t / \\Delta_a)$, where $\\Delta_a$ is how much worse arm a is than the best (Auer, Cesa-Bianchi & Fischer, 2002); constant-ε greedy's regret grows linearly.",
      'Invariant: "with a constant step α, the weight on the reward k steps ago is $\\\\alpha(1-\\\\alpha)^k$ (cell 3): an" exponentially recency-weighted average, right for problems that change over time.',
      "Geometric picture: softmax's temperature slides between uniform (τ → ∞) and greedy (τ → 0) along a smooth path; ε-greedy jumps between the two.",
      'Where it goes: lesson 9.3 builds an agent for Breakout from scratch, and 9.4 shows the two TD control methods differ exactly in how exploration enters the target.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-002-ex1',
      title: 'ε-greedy probabilities',
      difficulty: 'easy',
      problem: 'Four actions, Q = [1, 4, 2, 4], ε = 0.2. The probabilities?',
      steps: [
        {
          expression: '0.2 / 4 = 0.05',
          annotation: "Each action's share of ε.",
          strategyTitle: 'Step 1: ε share',
        },
        {
          expression: '0.05 + 0.8 / 2 = 0.45',
          annotation: 'The two tied best share 1 − ε.',
          strategyTitle: 'Step 2: greedy share',
        },
      ],
      answer: '[0.05, 0.45, 0.05, 0.45]',
    },
    {
      id: 'mg9-002-ex2',
      title: 'A softmax choice',
      difficulty: 'medium',
      problem: 'Two actions with Q = [0, 1]. Probabilities at τ = 1 and τ = 0.1?',
      steps: [
        {
          expression: 'e^1 / (1 + e^1) \\approx 0.731',
          annotation: 'τ = 1.',
          strategyTitle: 'Step 1: warm',
        },
        {
          expression: 'e^{10} / (1 + e^{10}) \\approx 0.99995',
          annotation: 'τ = 0.1, nearly greedy.',
          strategyTitle: 'Step 2: cold',
        },
      ],
      answer: 'About 0.27 / 0.73 at τ = 1, and almost always the better action at τ = 0.1.',
    },
    {
      id: 'mg9-002-ex3',
      title: 'A UCB choice',
      difficulty: 'hard',
      problem: 't = 100. Arm 1: Q = 1.0, N = 80. Arm 2: Q = 0.8, N = 5. With c = 2, which does UCB pull?',
      steps: [
        {
          expression: '1.0 + 2\\sqrt{\\ln 100 / 80} \\approx 1.48',
          annotation: 'Arm 1.',
          strategyTitle: 'Step 1: arm 1',
        },
        {
          expression: '0.8 + 2\\sqrt{\\ln 100 / 5} \\approx 2.72',
          annotation: "Arm 2's bonus is large.",
          strategyTitle: 'Step 2: arm 2',
        },
      ],
      answer: 'Arm 2, tried rarely, so its estimate is uncertain and could be higher.',
    },
  ],

  challenges: [
    {
      id: 'mg9-002-ch1',
      title: "Greedy's trap",
      difficulty: 'easy',
      problem: 'Why can a greedy agent with Q₀ = 0 never discover that an arm with true value 2 is best, if its first pull paid −1?',
      hint: 'When is an estimate corrected?',
      answer: 'Its estimate becomes −1, below the others, so it is never chosen again and never corrected.',
      walkthrough: [],
    },
    {
      id: 'mg9-002-ch2',
      title: "Optimism's limit",
      difficulty: 'medium',
      problem: 'Why does optimism help at the start but not in a problem that changes later?',
      hint: 'When does an optimistic start stop having effect?',
      answer: 'The optimism wears off once every action has been tried a few times; if the problem changes afterwards, nothing drives the agent to try again.',
      walkthrough: [],
    },
    {
      id: 'mg9-002-ch3',
      title: 'Why decay on the cliff',
      difficulty: 'hard',
      problem: 'Explain why constant ε = 0.1 earns −43 while learning on the cliff but its greedy walk is optimal, while softmax earns −13 while learning.',
      hint: 'Where do random steps happen?',
      answer: 'Q-learning learns the greedy (edge) path regardless of exploration, but a random step on the edge falls off, so constant ε pays for exploration every episode. Softmax at a low temperature almost never picks a move whose Q is far below the best, and stepping into the spikes has a very low Q once learned, so it stops paying for those falls.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'ε',
        meaning: 'Probability of a random action in ε-greedy.',
      },
      {
        symbol: 'τ',
        meaning: 'Softmax temperature: high is random, low is greedy.',
      },
      {
        symbol: 'Q₀',
        meaning: 'Starting estimate; above the true values is optimistic.',
      },
      {
        symbol: 'N(a)',
        meaning: 'How often action a has been tried.',
      },
      {
        symbol: 'c',
        meaning: "UCB's exploration weight.",
      },
      {
        symbol: 'GLIE',
        meaning: 'Greedy in the limit, with infinite exploration.',
      },
    ],
    rulesOfThumb: [
      'Exploration fixes wrong low estimates; nothing else does.',
      'Decay exploration when it is costly during learning.',
      'Optimism must be above the true values.',
      'Report learning return and greedy score separately.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Exploring is wasted reward.',
      whyStudentsThinkIt: 'Random actions earn less now.',
      correctionExample: 'Greedy earns least after 1000 pulls (cells 1 and 4).',
      contrastCase: 'Once learning is done, exploring does waste reward; that is why ε decays.',
    },
    {
      falseBelief: 'ε-greedy with smaller ε is always better.',
      whyStudentsThinkIt: 'Fewer random actions.',
      correctionExample: 'ε = 0.01 finds the best arm far less often by 1000 pulls than ε = 0.1.',
      contrastCase: 'In the very long run ε = 0.01 overtakes.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An enemy whose mistakes during learning are cheap (a training mode).',
      competingTechniques: ['Constant ε-greedy', 'Optimistic greedy'],
      whyThisTechniqueWins: 'Cheap mistakes favour simple steady exploration; optimism helps most when rewards are known to be below a bound.',
    },
    {
      situation: 'A recommendation with millions of options tried rarely.',
      competingTechniques: ['UCB', 'ε-greedy'],
      whyThisTechniqueWins: 'UCB directs exploration to uncertain options instead of uniformly random ones.',
    },
  ],

  debugging: [
    {
      commonError: 'ε never decays to zero when evaluating.',
      symptom: 'The reported score is worse than the learned policy.',
      whyItHappened: 'Exploration is still on during the evaluation.',
      repairStrategy: 'Evaluate greedily (ε = 0), separately from training.',
    },
    {
      commonError: 'Ties always broken towards the first action.',
      symptom: 'A greedy agent with equal estimates repeats one action.',
      whyItHappened: 'argmax returns the first maximum.',
      repairStrategy: 'Break ties at random.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Implement ε-greedy, softmax and UCB, and compare them over runs.',
    explainVerbally: 'Explain exploration vs exploitation, optimism, schedules and GLIE.',
    detectIncorrectApplication: 'Spot pessimistic starts, missing tie-breaking and evaluation with exploration on.',
    transferToUnfamiliar: 'Choose an exploration method for a new problem.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-002-assess-1',
        type: 'choice',
        text: 'Three actions, Q = [2, 2, 1], ε = 0.3. The probability of the third action?',
        options: ['0.1', '0.3', '0', '0.35'],
        answer: '0.1',
        hint: 'It only gets its ε share.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-002-quiz-1',
      type: 'choice',
      text: 'Why does greedy do badly on the bandit?',
      options: [
        'A wrong low estimate is never corrected',
        'It explores too much',
        'Its step size is too big',
        'It uses UCB',
      ],
      answer: 'A wrong low estimate is never corrected',
      hints: ['Cell 1.'],
      reviewSection: 'Intuition — why greedy fails',
    },
    {
      id: 'mg9-002-quiz-2',
      type: 'choice',
      text: 'Optimistic initial values make a greedy agent explore because',
      options: [
        'Untried actions look better than tried ones',
        'They add randomness',
        'They lower α',
        'They change γ',
      ],
      answer: 'Untried actions look better than tried ones',
      hints: ['Optimism paragraph.'],
      reviewSection: 'Intuition — optimism',
    },
    {
      id: 'mg9-002-quiz-3',
      type: 'choice',
      text: 'A low softmax temperature τ is',
      options: ['Nearly greedy', 'Nearly random', 'Always optimistic', 'Equal to ε'],
      answer: 'Nearly greedy',
      hints: ['UCB and softmax paragraph.'],
      reviewSection: 'Intuition — UCB and softmax',
    },
    {
      id: 'mg9-002-quiz-4',
      type: 'choice',
      text: 'On Cliff Walk, which earned most while learning?',
      options: [
        'Softmax with τ decaying',
        'ε 0.1 constant',
        'ε linear decay',
        'They were equal',
      ],
      answer: 'Softmax with τ decaying',
      hints: ['Schedules paragraph.'],
      reviewSection: 'Intuition — schedules',
    },
    {
      id: 'mg9-002-quiz-5',
      type: 'choice',
      text: 'GLIE means',
      options: [
        'Greedy in the limit, with infinite exploration',
        'Greedy learning in episodes',
        'Gradient learning with infinite episodes',
        'A kind of UCB',
      ],
      answer: 'Greedy in the limit, with infinite exploration',
      hints: ['Math', 'convergence.'],
      reviewSection: 'Math',
    },
    {
      id: 'mg9-002-quiz-6',
      type: 'choice',
      text: "The bandit's sample-average update has the same form as TD's because",
      options: [
        'Both are old + step × (target − old)',
        'Both bootstrap',
        'Both use γ',
        'Both need episodes',
      ],
      answer: 'Both are old + step × (target − old)',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-002-1',
      label: 'Read exploration against exploitation',
      type: 'read',
    },
    {
      id: 'cp-mg9-002-2',
      label: 'Read optimism, UCB and softmax',
      type: 'read',
    },
    {
      id: 'cp-mg9-002-3',
      label: 'Run the bandit notebook',
      type: 'read',
    },
    {
      id: 'cp-mg9-002-4',
      label: 'Complete "Ways to explore" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-002-5',
      label: 'Compare optimistic and pessimistic starts',
      type: 'lab',
    },
    {
      id: 'cp-mg9-002-6',
      label: 'Work through the ε-greedy example',
      type: 'example',
    },
    {
      id: 'cp-mg9-002-7',
      label: 'Work through the UCB example',
      type: 'example',
    },
    {
      id: 'cp-mg9-002-8',
      label: 'Pass the ε-greedy challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
