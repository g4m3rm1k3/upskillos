export default {
  order: 5,

  id: 'mg9-005',

  slug: 'expected-sarsa-and-double-q-learning',

  title: 'Expected SARSA and Double Q-learning',

  subtitle: 'Two fixes to the basic updates, one for noise and one for a bias hidden in the max, each measured.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'expected-sarsa',
    'double-q-learning',
    'maximization-bias',
  ],

  aliases: 'expected sarsa double q-learning maximization bias overestimation max of noisy estimates double estimator step size variance',

  timeToComplete: 50,

  coreConcept: "Expected SARSA replaces SARSA's sampled next action with an average over what the policy might do, R + γ Σ π(a′|S′) Q(S′, a′): the same expectation with less noise, so it tolerates larger step sizes. Double Q-learning fixes a bias in Q-learning: the max of noisy estimates is too high on average, so Q-learning overrates actions whose estimates are lucky. It keeps two tables, lets one choose the best next action and the other value it, so the choice and the valuation do not share the same luck.",

  prerequisites: ['mg9-004'],

  nextLesson: 'mg9-006',

  hook: {
    question: 'Ten slot machines all pay nothing on average. You try each once and pick the one that paid most. How much do you expect it to pay next time, and how much did you think it would?',
    realWorldContext: "Overestimation from a max is everywhere: the winner's curse in auctions, the best-looking result among many experiments. In reinforcement learning it led to Double Q-learning (van Hasselt, 2010) and Double DQN (2016), now standard. Sutton & Barto, sections 6.6–6.7.",
  },

  intuition: {
    prose: [
      '**The max is biased.** Cell 1: ten actions, every one truly worth 0; estimate each from a single noisy sample and take the largest. On average that largest estimate is 1.54, not 0 (with 5 samples each, 0.70; with 20, 0.35). Whichever estimate happens to be high is the one the max picks. Before running it, predict whether the max is near 0: it is not, and it shrinks only as estimates get better.',
      "**Double estimation.** Choose the best action with one set of estimates, and read its value from a second, independent set: on average 0.003, close to the truth. The second set has no reason to share the first's luck.",
      "**Maximization bias in Q-learning** (Sutton & Barto, Example 6.7; cell 2). From A, right ends the episode with 0; left leads to B, where ten actions each end with a reward around −0.1, noisily. Left is worse, but $\\max_a Q(B, a)$ is pushed up by B's luckiest action, so Q-learning goes left up to 96% of the time early on (86% in the first 50 episodes, averaged over 300 runs). With ε = 0.1 the best possible is 5%. Double Q-learning keeps two tables, each updated on half the steps, with the target $R + \\gamma Q_B(S', \\arg\\max_a Q_A(S', a))$ for table A (and the mirror for B): it peaks at 53% and falls fast.",
      "**Expected SARSA.** SARSA's target depends on the single A′ it happens to choose; Expected SARSA averages over the policy, $R + \\gamma \\sum_{a'} \\pi(a' \\mid S') Q(S', a')$, which is SARSA's target with the noise of A′ removed. Cell 3 on the cliff: with α = 1 (each update replaces the old value with the target), SARSA's return collapses to −102.7 per episode while Expected SARSA's improves to −24.8. In Game Studio's Compare the same settings give −91.1 ± 15.4 against −22.3 ± 2.1.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: choosing among the four updates',
        body: 'Step 1. Rewards noisy, many actions? Q-learning may overestimate: try Double Q-learning. Step 2. Learning on-policy (exploration costs)? Prefer Expected SARSA to SARSA: same answer, less noise. Step 3. Large step sizes help early learning: Expected SARSA tolerates them best. Step 4. Compare the candidates over seeds, on both the learning return and the greedy score.',
      },
      {
        type: 'warning',
        title: 'Double Q-learning is not two Q-learners',
        body: 'The two tables must cross: the table being updated chooses the action, the other one values it. Using the same table for both is ordinary Q-learning with half the data. Act on their sum (or average).',
      },
      {
        type: 'warning',
        title: "Expected SARSA's average uses the current policy",
        body: "The probabilities π(a′|S′) are the exploring policy's, at the current ε (or τ). With ε = 0 it is exactly Q-learning.",
      },
      {
        type: 'insight',
        title: 'What the picture shows (cell 4)',
        body: 'Misconception it contradicts: "more data fixes a biased estimate quickly". Q-learning\'s line climbs to 96% left before it slowly comes down; the bias is strongest exactly when estimates are new.',
      },
      {
        type: 'insight',
        title: 'In the ML Lab',
        body: 'ML Lab lesson 37.4 measures the same overestimation on its gridworld (a learned value of 4.89 against a true 4.64). [Open the ML Lab](#/lab/ml-lab).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: bias and noise',
        caption: 'The max of noisy estimates, Example 6.7, step sizes on the cliff, and the bias over time.',
        props: {
          lesson: {
            title: 'Expected SARSA and Double Q-learning',
            subtitle: 'Two fixes, measured.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. The max of noisy estimates\nPredict first: is the max near 0?',
                startCode: "const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// The max of noisy estimates is biased. Ten actions, every one truly worth 0. Estimate each from n noisy samples\n// (spread 1) and take the largest estimate, as Q-learning's max does. Predict first: is the max near 0?\n// Double estimation: choose the best action with one set of samples, and value it with a second, independent set.\nconst rand = seeded(7)\nfor (const n of [1, 5, 20]) {\n  const single = [], double = []\n  for (let trial = 0; trial < 2000; trial++) {\n    const est = () => Array.from({ length: 10 }, () => mean(Array.from({ length: n }, () => normal(rand))))\n    const A = est(), B = est()\n    single.push(Math.max(...A))\n    double.push(B[A.indexOf(Math.max(...A))])\n  }\n  console.log(n + ' samples each: max of the estimates ' + mean(single).toFixed(3) + ', double estimate ' + mean(double).toFixed(3) + ' (truth 0)')\n}",
              },
              {
                type: 'js',
                instruction: '### 2. Maximization bias\nPredict first: how often each goes left.',
                startCode: "const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// Sutton & Barto's Example 6.7. From A: right ends the episode with 0; left goes to B with 0. B has 10 actions, each\n// ending the episode with a reward drawn around −0.1 (spread 1). So left is worse on average, but some of B's\n// noisy estimates will look positive. ε 0.1, α 0.1, γ 1. A is state 0, B is state 1.\nfunction run(method, episodes, seed) {\n  const rand = seeded(seed), QA = [[0, 0], new Array(10).fill(0)], QB = [[0, 0], new Array(10).fill(0)], lefts = []\n  const sum = (s) => QA[s].map((q, a) => q + (method === 'double' ? QB[s][a] : 0))\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  const choose = (s) => (rand() < 0.1 ? Math.floor(rand() * QA[s].length) : greedyOf(sum(s)))\n  for (let ep = 0; ep < episodes; ep++) {\n    const a = choose(0)\n    lefts.push(a === 0 ? 1 : 0)\n    const steps = a === 0 ? [[0, 0, 1], [1, choose(1), -1]] : [[0, 1, -1]]   // [state, action, next state (−1: end)]\n    for (const [s, act, next] of steps) {\n      const r = s === 1 ? -0.1 + normal(rand) : 0\n      if (method === 'double' && rand() < 0.5) {\n        const target = r + (next < 0 ? 0 : QA[next][greedyOf(QB[next])])\n        QB[s][act] += 0.1 * (target - QB[s][act])\n      } else {\n        const target = r + (next < 0 ? 0 : method === 'double' ? QB[next][greedyOf(QA[next])] : Math.max(...QA[next]))\n        QA[s][act] += 0.1 * (target - QA[s][act])\n      }\n    }\n  }\n  return lefts\n}\nconst share = (method, upTo) => mean(Array.from({ length: 300 }, (_, k) => mean(run(method, 300, k + 1).slice(0, upTo))))\n\n// Predict first: how often does each go left in its first 10, 50 and 300 episodes? (The best possible with ε 0.1 is\n// 5%: left only by a random step.)\nfor (const method of ['q', 'double']) {\n  console.log((method === 'q' ? 'Q-learning       ' : 'Double Q-learning') + ': left in the first 10 episodes ' + Math.round(share(method, 10) * 100) + '%, first 50 ' + Math.round(share(method, 50) * 100) + '%, all 300 ' + Math.round(share(method, 300) * 100) + '%')\n}",
              },
              {
                type: 'js',
                instruction: '### 3. Step sizes on the cliff\nPredict first: SARSA at α = 1.',
                startCode: "const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], START = 3, CHEST = 47\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  return { next: x * 4 + y, reward: -1, done: x * 4 + y === CHEST }\n}\nfunction train(method, alpha, seed, episodes = 500) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = [], eps = 0.1\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  const choose = (s) => (rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s]))\n  const expected = (row) => { const best = Math.max(...row), ties = row.filter((q) => q === best).length; return row.reduce((t, q) => t + (eps / 4 + (q === best ? (1 - eps) / ties : 0)) * q, 0) }\n  for (let ep = 0; ep < episodes; ep++) {\n    let s = START, a = choose(s), total = 0\n    for (let t = 0; t < 1000; t++) {\n      const r = move(s, a), a2 = choose(r.next)\n      const future = r.done ? 0 : method === 'sarsa' ? Q[r.next][a2] : method === 'expected' ? expected(Q[r.next]) : Math.max(...Q[r.next])\n      Q[s][a] += alpha * (r.reward + future - Q[s][a])\n      total += r.reward\n      if (r.done) break\n      s = r.next; a = method === 'sarsa' ? a2 : choose(s)\n    }\n    returns.push(total)\n  }\n  return returns\n}\n\n// Expected SARSA's target averages over what the policy might do next instead of sampling one A′, so it is less\n// noisy, and it tolerates a large step size. Average return per episode over all 500 (5 seeds), by α.\n// Predict first: what happens to SARSA at α = 1?\nfor (const method of ['sarsa', 'expected', 'q']) {\n  const row = [0.1, 0.5, 1].map((alpha) => mean([1, 2, 3, 4, 5].map((seed) => mean(train(method, alpha, seed)))).toFixed(1))\n  console.log((method === 'sarsa' ? 'SARSA         ' : method === 'expected' ? 'Expected SARSA' : 'Q-learning    ') + ' α 0.1: ' + row[0] + ', α 0.5: ' + row[1] + ', α 1: ' + row[2])\n}",
              },
              {
                type: 'js',
                instruction: '### 4. See it\nGoing left, episode by episode.',
                startCode: "const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst normal = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// Sutton & Barto's Example 6.7. From A: right ends the episode with 0; left goes to B with 0. B has 10 actions, each\n// ending the episode with a reward drawn around −0.1 (spread 1). So left is worse on average, but some of B's\n// noisy estimates will look positive. ε 0.1, α 0.1, γ 1. A is state 0, B is state 1.\nfunction run(method, episodes, seed) {\n  const rand = seeded(seed), QA = [[0, 0], new Array(10).fill(0)], QB = [[0, 0], new Array(10).fill(0)], lefts = []\n  const sum = (s) => QA[s].map((q, a) => q + (method === 'double' ? QB[s][a] : 0))\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  const choose = (s) => (rand() < 0.1 ? Math.floor(rand() * QA[s].length) : greedyOf(sum(s)))\n  for (let ep = 0; ep < episodes; ep++) {\n    const a = choose(0)\n    lefts.push(a === 0 ? 1 : 0)\n    const steps = a === 0 ? [[0, 0, 1], [1, choose(1), -1]] : [[0, 1, -1]]   // [state, action, next state (−1: end)]\n    for (const [s, act, next] of steps) {\n      const r = s === 1 ? -0.1 + normal(rand) : 0\n      if (method === 'double' && rand() < 0.5) {\n        const target = r + (next < 0 ? 0 : QA[next][greedyOf(QB[next])])\n        QB[s][act] += 0.1 * (target - QB[s][act])\n      } else {\n        const target = r + (next < 0 ? 0 : method === 'double' ? QB[next][greedyOf(QA[next])] : Math.max(...QA[next]))\n        QA[s][act] += 0.1 * (target - QA[s][act])\n      }\n    }\n  }\n  return lefts\n}\nconst share = (method, upTo) => mean(Array.from({ length: 300 }, (_, k) => mean(run(method, 300, k + 1).slice(0, upTo))))\n\n// How often each goes left, episode by episode (averaged over 300 runs): Q-learning (orange) against Double\n// Q-learning (blue). The dashed line is 5%, the best possible while exploring with ε 0.1.\nconst curve = (method) => { const runs = Array.from({ length: 300 }, (_, k) => run(method, 300, k + 1)); return runs[0].map((_, i) => mean(runs.map((r) => r[i]))) }\nconst lines = [[curve('q'), '#f59e0b'], [curve('double'), '#60a5fa']]\nconst canvas = document.createElement('canvas'), W = 420, H = 210\ncanvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = 'width: ' + W + 'px; height: ' + H + 'px; display: block; margin: 0 auto'\ndocument.body.appendChild(canvas)\nconst g = canvas.getContext('2d'); g.scale(2, 2); g.fillStyle = '#0f1923'; g.fillRect(0, 0, W, H)\nconst X = (i) => 40 + (i / 299) * (W - 56), Y = (v) => H - 28 - v * (H - 50)\ng.strokeStyle = '#475569'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(0), Y(0.05)); g.lineTo(X(299), Y(0.05)); g.stroke(); g.setLineDash([])\nfor (const [c, color] of lines) { g.strokeStyle = color; g.lineWidth = 1.8; g.beginPath(); c.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke() }\ng.fillStyle = '#cbd5e1'; g.font = '11px sans-serif'\ng.fillText('% left from A', 6, 16); g.fillText('100%', 6, Y(1) + 4); g.fillText('5%', 18, Y(0.05) + 4); g.fillText('episodes →', W - 70, H - 8)\ng.fillText('orange: Q-learning · blue: Double Q-learning', 110, 16)\nconsole.log('peak left: Q-learning ' + Math.round(Math.max(...lines[0][0]) * 100) + '%, Double Q-learning ' + Math.round(Math.max(...lines[1][0]) * 100) + '%')",
                showPreviewByDefault: true,
                outputHeight: 260,
              },
              {
                type: 'challenge',
                instruction: "### 5. Challenge: Double Q-learning's target\nThe cases below check it.",
                startCode: "// Write Double Q-learning's target for the table being updated: the updated table picks the best next action, and\n// the OTHER table says what it is worth. (When the step ends the episode, the target is the reward alone.)\nfunction doubleTarget(reward, mineNext, otherNext, done, gamma) {\n  return 0\n}\n\n// ── The check (leave this part as it is) ──\nconst cases = [\n  { args: [-1, [1, 5, 2], [3, 0, 4], false, 1], want: -1, why: 'my table picks action 1 (5); the other table values it at 0: −1 + 0' },\n  { args: [0, [2, 1], [7, 9], false, 0.5], want: 3.5, why: 'my table picks action 0 (2); the other says 7: 0.5 × 7' },\n  { args: [4, [9, 9], [1, 1], true, 1], want: 4, why: 'the step ended the episode: the reward alone' },\n  { args: [1, [0, 3, 3], [5, 2, 2], false, 1], want: 3, why: 'my table picks action 1 (the first of the tied 3s); the other values it at 2' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = doubleTarget(...c.args)\n  const ok = typeof got === 'number' && Math.abs(got - c.want) < 1e-9\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + (typeof got === 'number' ? +got.toFixed(6) : got) + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is Double Q-learning.' : passed + ' of 4 cases pass.')",
                solutionCode: "// Write Double Q-learning's target for the table being updated: the updated table picks the best next action, and\n// the OTHER table says what it is worth. (When the step ends the episode, the target is the reward alone.)\nfunction doubleTarget(reward, mineNext, otherNext, done, gamma) {\n  if (done) return reward\n  const best = mineNext.indexOf(Math.max(...mineNext))\n  return reward + gamma * otherNext[best]\n}\n\n// ── The check (leave this part as it is) ──\nconst cases = [\n  { args: [-1, [1, 5, 2], [3, 0, 4], false, 1], want: -1, why: 'my table picks action 1 (5); the other table values it at 0: −1 + 0' },\n  { args: [0, [2, 1], [7, 9], false, 0.5], want: 3.5, why: 'my table picks action 0 (2); the other says 7: 0.5 × 7' },\n  { args: [4, [9, 9], [1, 1], true, 1], want: 4, why: 'the step ended the episode: the reward alone' },\n  { args: [1, [0, 3, 3], [5, 2, 2], false, 1], want: 3, why: 'my table picks action 1 (the first of the tied 3s); the other values it at 2' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = doubleTarget(...c.args)\n  const ok = typeof got === 'number' && Math.abs(got - c.want) < 1e-9\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + (typeof got === 'number' ? +got.toFixed(6) : got) + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is Double Q-learning.' : passed + ' of 4 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Four ways to update',
        props: {
          task: 'all-four',
          lesson: 'mg9-005',
          checkpoint: 'cp-mg9-005-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** For estimates $\\hat{Q}(a) = Q(a) + \\epsilon_a$ with zero-mean noise, $\\mathbb{E}[\\max_a \\hat{Q}(a)] \\ge \\max_a \\mathbb{E}[\\hat{Q}(a)] = \\max_a Q(a)$ (Jensen's inequality: max is convex), with equality only without noise. Q-learning's target uses this max at every step, and the excess propagates backwards through bootstrapping.",
      'The double estimator $\\hat{Q}_B(\\arg\\max_a \\hat{Q}_A(a))$ is unbiased for the value of the action A chooses, and on average no higher than $\\max_a Q(a)$: it can underestimate, but does not overestimate.',
      "Expected SARSA's target is the conditional expectation of SARSA's over A′, so it has the same mean and no more variance (the law of total variance); with lower variance a larger α converges without chasing noise.",
    ],
    equations: [
      {
        label: 'Overestimation',
        latex: '\\mathbb{E}[\\max_a \\hat{Q}(a)] \\ge \\max_a Q(a)',
      },
      {
        label: 'Double Q-learning (update A)',
        latex: "Q_A(S, A) \\leftarrow Q_A(S, A) + \\alpha\\,[R + \\gamma\\,Q_B(S', \\arg\\max_a Q_A(S', a)) - Q_A(S, A)]",
      },
      {
        label: 'Expected SARSA',
        latex: "Q(S, A) \\leftarrow Q(S, A) + \\alpha\\,[R + \\gamma \\textstyle\\sum_{a'} \\pi(a' \\mid S')\\,Q(S', a') - Q(S, A)]",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "Formal statement: tabular Double Q-learning converges to $Q^*$ under the same conditions as Q-learning (van Hasselt, 2010); Expected SARSA converges under SARSA's conditions and, with a greedy target policy, is Q-learning.",
      'Invariant: with no noise in rewards or transitions, all four updates have the same fixed point for a greedy target policy; the differences are in how fast and how steadily they get there.',
      'Geometric picture: the max picks the highest of a cloud of points scattered around the truth, always from its upper edge; the double estimator picks with one cloud and reads from another.',
      'Where it goes: 9.6 turns comparisons like these into experiments you can report.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-005-ex1',
      title: 'A Double Q target',
      difficulty: 'easy',
      problem: 'Updating table A. Q_A(S′, ·) = [1, 5, 2], Q_B(S′, ·) = [3, 0, 4], R = −1, γ = 1. Target?',
      steps: [
        {
          expression: "\\arg\\max_a Q_A(S', a) = 1",
          annotation: 'A chooses (value 5).',
          strategyTitle: 'Step 1: A chooses',
        },
        {
          expression: "-1 + Q_B(S', 1) = -1 + 0 = -1",
          annotation: 'B values it.',
          strategyTitle: 'Step 2: B values',
        },
      ],
      answer: "−1 (Q-learning's would be −1 + 5 = 4).",
    },
    {
      id: 'mg9-005-ex2',
      title: 'An Expected SARSA target',
      difficulty: 'medium',
      problem: 'Q(S′, ·) = [−9, −8, −40, −10], ε-greedy with ε = 0.1, R = −1, γ = 1. Target?',
      steps: [
        {
          expression: '\\pi = [0.025, 0.925, 0.025, 0.025]',
          annotation: 'ε/4 each, plus 0.9 for the best.',
          strategyTitle: 'Step 1: probabilities',
        },
        {
          expression: '-1 + (0.025 \\cdot -9 + 0.925 \\cdot -8 + 0.025 \\cdot -40 + 0.025 \\cdot -10) = -9.875',
          annotation: "The policy's average.",
          strategyTitle: 'Step 2: average',
        },
      ],
      answer: "−9.875, as lesson 9.4's cell 1 printed.",
    },
    {
      id: 'mg9-005-ex3',
      title: 'The size of the bias',
      difficulty: 'hard',
      problem: 'Two actions worth 0, each estimated from one sample with noise ±1 (each sign equally likely). Expected max?',
      steps: [
        {
          expression: '\\tfrac14(1) + \\tfrac14(1) + \\tfrac14(1) + \\tfrac14(-1) = 0.5',
          annotation: 'The max is −1 only when both are −1.',
          strategyTitle: 'Step 1: cases',
        },
      ],
      answer: '0.5, though both are worth 0.',
    },
  ],

  challenges: [
    {
      id: 'mg9-005-ch1',
      title: 'Why two tables cross',
      difficulty: 'easy',
      problem: 'Why must the other table value the action the first one chose?',
      hint: 'Whose luck would it share?',
      answer: "The chosen action is the one whose estimate is lucky in the first table; the second table's estimate of it has independent noise, so it is not inflated.",
      walkthrough: [],
    },
    {
      id: 'mg9-005-ch2',
      title: "SARSA's noise",
      difficulty: 'medium',
      problem: 'Why does SARSA suffer more than Expected SARSA when α = 1?',
      hint: 'What does α = 1 do with one noisy target?',
      answer: "With α = 1 each update replaces the value with one target; SARSA's target depends on one random A′, so values jump about; Expected SARSA's target averages over A′.",
      walkthrough: [],
    },
    {
      id: 'mg9-005-ch3',
      title: 'Shrinking bias',
      difficulty: 'hard',
      problem: "Cell 1's max estimate falls from 1.54 to 0.70 to 0.35 as samples go from 1 to 5 to 20. Why roughly halving each time?",
      hint: "How does an average's noise shrink with n?",
      answer: "The noise of an average of n samples shrinks like 1/√n; 1/√5 ≈ 0.45 and 1/√20 ≈ 0.22 of the single-sample noise, and the max's excess scales with the noise.",
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'max bias',
        meaning: 'The max of noisy estimates is too high on average.',
      },
      {
        symbol: 'Q_A, Q_B',
        meaning: "Double Q-learning's two tables.",
      },
      {
        symbol: 'Σ π Q',
        meaning: "Expected SARSA's average over next actions.",
      },
      {
        symbol: 'double estimator',
        meaning: 'Choose with one estimate, value with another.',
      },
    ],
    rulesOfThumb: [
      'Suspect overestimation when rewards are noisy and actions many.',
      'Expected SARSA over SARSA when you can compute π.',
      'Report both learning return and greedy score.',
    ],
  },

  misconceptions: [
    {
      falseBelief: "Q-learning's values are unbiased because each update is.",
      whyStudentsThinkIt: 'Each target is a sample.',
      correctionExample: 'The max inside the target picks lucky estimates (cell 1).',
      contrastCase: 'Without noise there is no bias.',
    },
    {
      falseBelief: 'Double Q-learning learns twice as fast.',
      whyStudentsThinkIt: 'Two tables.',
      correctionExample: 'Each table gets half the updates; the gain is less bias, not speed.',
      contrastCase: "Its policy uses both tables' sum.",
    },
  ],

  transferPrompts: [
    {
      situation: 'A game with random loot drops as rewards.',
      competingTechniques: ['Q-learning', 'Double Q-learning'],
      whyThisTechniqueWins: "Noisy rewards inflate Q-learning's max; Double Q-learning resists it.",
    },
    {
      situation: 'Fast early learning matters, with exploration costly.',
      competingTechniques: ['SARSA with a small α', 'Expected SARSA with a large α'],
      whyThisTechniqueWins: "Expected SARSA's low-noise target tolerates a large step.",
    },
  ],

  debugging: [
    {
      commonError: 'Double Q-learning that chooses and values with the same table.',
      symptom: 'Same overestimation as Q-learning.',
      whyItHappened: 'The tables do not cross.',
      repairStrategy: 'Choose with the updated table, value with the other.',
    },
    {
      commonError: 'Expected SARSA with the wrong ε in π.',
      symptom: "Values between SARSA's and Q-learning's that do not match the policy.",
      whyItHappened: 'π must be the current exploring policy.',
      repairStrategy: 'Compute π from the current ε (or τ).',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Implement Expected SARSA and Double Q-learning and reproduce Example 6.7.',
    explainVerbally: 'Explain maximization bias and how each fix works.',
    detectIncorrectApplication: 'Spot uncrossed tables and a wrong π.',
    transferToUnfamiliar: 'Pick an update for a noisy game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-005-assess-1',
        type: 'choice',
        text: 'In Example 6.7 with ε = 0.1, the best possible share of left moves is',
        options: ['5%', '0%', '10%', '50%'],
        answer: '5%',
        hint: 'Left only by a random step, half of ε.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-005-quiz-1',
      type: 'choice',
      text: 'Ten actions worth 0, one sample each. The average max estimate is about',
      options: ['1.54', '0', '−1.54', '0.1'],
      answer: '1.54',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-005-quiz-2',
      type: 'choice',
      text: "Double Q-learning's target for table A uses",
      options: [
        "A's best next action, valued by B",
        "A's max",
        "B's max",
        "The average of A and B's max",
      ],
      answer: "A's best next action, valued by B",
      hints: ['Double estimation.'],
      reviewSection: 'Intuition — maximization bias',
    },
    {
      id: 'mg9-005-quiz-3',
      type: 'choice',
      text: 'Early in Example 6.7, Q-learning goes left',
      options: ['Up to 96% of the time', '5% of the time', 'Never', '50% of the time'],
      answer: 'Up to 96% of the time',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg9-005-quiz-4',
      type: 'choice',
      text: "Expected SARSA's target differs from SARSA's by",
      options: [
        'Averaging over the next action instead of sampling it',
        'Using the max',
        'Using two tables',
        'Ignoring γ',
      ],
      answer: 'Averaging over the next action instead of sampling it',
      hints: ['Expected SARSA paragraph.'],
      reviewSection: 'Intuition — Expected SARSA',
    },
    {
      id: 'mg9-005-quiz-5',
      type: 'choice',
      text: 'At α = 1 on the cliff',
      options: [
        'Expected SARSA holds up; SARSA collapses',
        'Both collapse',
        'SARSA is best',
        'Q-learning cannot learn',
      ],
      answer: 'Expected SARSA holds up; SARSA collapses',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-005-quiz-6',
      type: 'choice',
      text: 'With ε = 0, Expected SARSA is',
      options: ['Q-learning', 'SARSA', 'Monte Carlo', 'Double Q-learning'],
      answer: 'Q-learning',
      hints: ['Warning on π.'],
      reviewSection: "Warning — Expected SARSA's average",
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-005-1',
      label: 'Read why the max is biased',
      type: 'read',
    },
    {
      id: 'cp-mg9-005-2',
      label: 'Read Double Q-learning and Expected SARSA',
      type: 'read',
    },
    {
      id: 'cp-mg9-005-3',
      label: 'Run the notebook: Example 6.7 and step sizes',
      type: 'read',
    },
    {
      id: 'cp-mg9-005-4',
      label: 'Complete "Four ways to update" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-005-5',
      label: 'Compare SARSA and Expected SARSA at α = 1',
      type: 'lab',
    },
    {
      id: 'cp-mg9-005-6',
      label: 'Work through the Double Q target example',
      type: 'example',
    },
    {
      id: 'cp-mg9-005-7',
      label: 'Work through the size-of-the-bias example',
      type: 'example',
    },
    {
      id: 'cp-mg9-005-8',
      label: 'Pass the Double Q-learning challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
