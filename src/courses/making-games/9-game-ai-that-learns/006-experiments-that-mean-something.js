export default {
  order: 6,

  id: 'mg9-006',

  slug: 'experiments-that-mean-something',

  title: 'Experiments That Mean Something',

  subtitle: 'One run proves little. Seeds, spread, confidence intervals, parameter studies, and what γ really chooses.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'experiments',
    'hyperparameters',
    'statistics',
    'reporting',
  ],

  aliases: 'seeds variance standard deviation standard error confidence interval parameter study step size alpha discount gamma learning curve report results reproducibility',

  timeToComplete: 50,

  coreConcept: 'A learning run is random: a different seed gives a different result, so one run is one sample. Run every setting over several seeds (the same seeds for each), report the mean with its spread, and know how sure the mean is: its 95% confidence interval is about mean ± t × sd / √n, which shrinks only like 1/√n. A parameter study sweeps one setting at a time this way. Some settings change what the agent wants rather than how well it learns: γ decides how much a later reward counts, so it changes the right answer itself.',

  prerequisites: ['mg9-005'],

  nextLesson: 'mg9-007',

  hook: {
    question: 'You change α from 0.3 to 0.5 and the score goes up by 5. Did α help, or did you get a luckier run? How would you know, and what would you write in a report?',
    realWorldContext: 'Reinforcement learning results are notoriously sensitive to seeds: a 2018 study (Henderson et al., "Deep Reinforcement Learning that Matters") showed published comparisons that disappeared over more seeds. Reporting means, spreads and the number of runs is now expected, in papers and in assignments.',
  },

  intuition: {
    prose: [
      '**One run is one sample.** Cell 1 runs the same Q-learning on the cliff with 10 seeds: the average return over 100 episodes ranges from −73.1 to −92.7 (mean −83.6, sample sd 5.7). A single run tells you the setting can give anything in that range. Before running it, predict how far apart the best and worst are.',
      '**How sure is a mean?** Its standard error is $s/\\sqrt{n}$; a 95% confidence interval is $\\bar{x} \\pm t_{n-1}\\, s/\\sqrt{n}$ (t ≈ 2.26 for 10 runs, near 2 for many). Cell 2: ±9.1 with 5 seeds, ±4.1 with 10, ±3.3 with 20, ±2.0 with 50. Halving the interval takes four times the seeds. Two settings whose intervals overlap a lot have not been shown to differ.',
      "**A parameter study** (cell 3, and drawn in cell 5) sweeps one setting with everything else fixed, the same seeds each. On the cliff, the bigger α the better over 100 episodes: −209.7 at 0.05, −83.6 at 0.5, −71.2 at 0.9. That is because the cliff has no randomness except the agent's own; where rewards or moves are noisy, large α chases noise (lesson 9.5: SARSA at α = 1). Conclusions hold for the problem you measured, not in general.",
      '**γ is a choice, not a knob to tune for score.** Cell 4: a corridor with +1 one step away and +10 nine steps the other way. The far exit is worth $10\\gamma^9$ now, so the agent should go for it only if $\\gamma > 0.1^{1/9} \\approx 0.774$. Learned with exploring starts (each episode in a random cell): γ = 1, 0.9 and 0.8 go right; 0.7 and 0.5 take the near +1. Changing γ changes what "best" means. Choose it for what you want, then tune α and exploration.',
      "**What to report.** The setting (every parameter), the number of seeds and that they were shared, the mean and its interval (or the sample standard deviation and n), the learning curve averaged over seeds, and both questions from lesson 9.2: return while learning, and greedy score after. Game Studio's Compare reports the last two as mean ± sample sd over its seeds.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: an experiment you can report',
        body: 'Step 1. Fix everything but the one thing you study. Step 2. Choose seeds in advance, the same for every setting; at least 5, more if results are close. Step 3. Record each run: the curve, the late learning return, the greedy score. Step 4. Report mean ± 95% interval (or sd and n), and the averaged curves. Step 5. Claim a difference only if it is larger than the uncertainty.',
      },
      {
        type: 'warning',
        title: 'Do not tune on the seeds you report',
        body: "Trying many settings and reporting the best on the same seeds picks luck. Tune on some seeds, then report on fresh ones (Game Studio's greedy checks and final score use different seeds for the same reason).",
      },
      {
        type: 'warning',
        title: 'Sample, not population, standard deviation',
        body: 'The spread of runs estimates the spread of all possible runs, so divide by n − 1, not n. With few seeds it matters: for 2 runs the two differ by a factor √2.',
      },
      {
        type: 'insight',
        title: 'What the picture shows (cell 5)',
        body: 'Misconception it contradicts: "a parameter study gives one best value". The curve with its bars shows which differences are larger than the uncertainty, and which neighbouring values are indistinguishable.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: experiments',
        caption: 'Seeds, intervals, a step-size study, what γ chooses, and the study drawn.',
        props: {
          lesson: {
            title: 'Experiments that mean something',
            subtitle: 'Seeds, spread and parameters.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. One run is one sample\nPredict first: how far apart are the best and worst seed?',
                startCode: "// The cliff and Q-learning, as in lessons 9.4 and 9.5 (12 × 4, −1 a move, −100 and back to the start for the spikes).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], START = 3, CHEST = 47\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  return { next: x * 4 + y, reward: -1, done: x * 4 + y === CHEST }\n}\nfunction train({ alpha = 0.5, gamma = 1, eps = 0.1, episodes = 100, seed = 1 }) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  for (let ep = 0; ep < episodes; ep++) {\n    let s = START, total = 0\n    for (let t = 0; t < 500; t++) {\n      const a = rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s]), r = move(s, a)\n      Q[s][a] += alpha * (r.reward + (r.done ? 0 : gamma * Math.max(...Q[r.next])) - Q[s][a])\n      total += r.reward; s = r.next\n      if (r.done) break\n    }\n    returns.push(total)\n  }\n  // The greedy walk's return (60 moves at most).\n  let s = START, g = 0\n  for (let k = 0; k < 60 && s !== CHEST; k++) { const r = move(s, Q[s].indexOf(Math.max(...Q[s]))); g += r.reward; s = r.next }\n  return { returns, greedy: s === CHEST ? g : null }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\nconst sd = (xs) => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))\n\n// One run is one sample. Q-learning, 100 episodes, α 0.5, ε 0.1: the average return over all 100 episodes, for\n// 10 different seeds. Predict first: how far apart are the best and worst seed?\nconst results = Array.from({ length: 10 }, (_, k) => mean(train({ seed: k + 1 }).returns))\nconsole.log('seeds 1–10: ' + results.map((x) => x.toFixed(1)).join(', '))\nconsole.log('best ' + Math.max(...results).toFixed(1) + ', worst ' + Math.min(...results).toFixed(1) + ', mean ' + mean(results).toFixed(1) + ', sample sd ' + sd(results).toFixed(1))",
              },
              {
                type: 'js',
                instruction: '### 2. How sure is a mean?\nPredict first: how many seeds halve the interval?',
                startCode: "// The cliff and Q-learning, as in lessons 9.4 and 9.5 (12 × 4, −1 a move, −100 and back to the start for the spikes).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], START = 3, CHEST = 47\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  return { next: x * 4 + y, reward: -1, done: x * 4 + y === CHEST }\n}\nfunction train({ alpha = 0.5, gamma = 1, eps = 0.1, episodes = 100, seed = 1 }) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  for (let ep = 0; ep < episodes; ep++) {\n    let s = START, total = 0\n    for (let t = 0; t < 500; t++) {\n      const a = rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s]), r = move(s, a)\n      Q[s][a] += alpha * (r.reward + (r.done ? 0 : gamma * Math.max(...Q[r.next])) - Q[s][a])\n      total += r.reward; s = r.next\n      if (r.done) break\n    }\n    returns.push(total)\n  }\n  // The greedy walk's return (60 moves at most).\n  let s = START, g = 0\n  for (let k = 0; k < 60 && s !== CHEST; k++) { const r = move(s, Q[s].indexOf(Math.max(...Q[s]))); g += r.reward; s = r.next }\n  return { returns, greedy: s === CHEST ? g : null }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\nconst sd = (xs) => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))\n\n// How sure is a mean? Its standard error is sd / √n, and a 95% confidence interval is about mean ± 2 × sd / √n\n// (more exactly ± t × sd / √n, with t = 2.26 for 10 seeds, 2.09 for 20, 2.01 for 50). Predict first: how many\n// seeds halve the interval of 5?\nconst t95 = { 5: 2.78, 10: 2.26, 20: 2.09, 50: 2.01 }\nfor (const n of [5, 10, 20, 50]) {\n  const xs = Array.from({ length: n }, (_, k) => mean(train({ seed: k + 1 }).returns))\n  const half = t95[n] * sd(xs) / Math.sqrt(n)\n  console.log(n + ' seeds: mean ' + mean(xs).toFixed(1) + ' ± ' + half.toFixed(1) + ' (95% interval)')\n}",
              },
              {
                type: 'js',
                instruction: '### 3. A parameter study\nPredict first: is the best α the biggest?',
                startCode: "// The cliff and Q-learning, as in lessons 9.4 and 9.5 (12 × 4, −1 a move, −100 and back to the start for the spikes).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], START = 3, CHEST = 47\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  return { next: x * 4 + y, reward: -1, done: x * 4 + y === CHEST }\n}\nfunction train({ alpha = 0.5, gamma = 1, eps = 0.1, episodes = 100, seed = 1 }) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  for (let ep = 0; ep < episodes; ep++) {\n    let s = START, total = 0\n    for (let t = 0; t < 500; t++) {\n      const a = rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s]), r = move(s, a)\n      Q[s][a] += alpha * (r.reward + (r.done ? 0 : gamma * Math.max(...Q[r.next])) - Q[s][a])\n      total += r.reward; s = r.next\n      if (r.done) break\n    }\n    returns.push(total)\n  }\n  // The greedy walk's return (60 moves at most).\n  let s = START, g = 0\n  for (let k = 0; k < 60 && s !== CHEST; k++) { const r = move(s, Q[s].indexOf(Math.max(...Q[s]))); g += r.reward; s = r.next }\n  return { returns, greedy: s === CHEST ? g : null }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\nconst sd = (xs) => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))\n\n// A parameter study: the average return over 100 episodes for several step sizes, 10 seeds each, with its 95%\n// interval. Predict first: is the best α the biggest? (The cliff has no randomness but the agent's own.)\nfor (const alpha of [0.05, 0.1, 0.3, 0.5, 0.9]) {\n  const xs = Array.from({ length: 10 }, (_, k) => mean(train({ alpha, seed: k + 1 }).returns))\n  console.log('α ' + String(alpha).padEnd(4) + ': ' + mean(xs).toFixed(1) + ' ± ' + (2.26 * sd(xs) / Math.sqrt(10)).toFixed(1))\n}",
              },
              {
                type: 'js',
                instruction: '### 4. γ chooses what the agent wants\nPredict first: which way for each γ.',
                startCode: '// The discount γ decides what the agent wants. A corridor of 11 cells: the agent starts in cell 1. Stepping off at\n// cell 0 earns +1 at once; walking to cell 10 earns +10, nine steps later. No other rewards. With γ, the far exit is\n// worth 10 γ⁹ now, against 1 for the near one: it should go right only if γ > 0.1^(1/9) ≈ 0.774.\n// Each episode starts in a random cell ("exploring starts"), so the far end is learned too; then we read the\n// learned choice in cell 1.\n// Predict first: which way does it learn to go for γ = 1, 0.9, 0.8, 0.7 and 0.5?\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nfunction learn(gamma, seed) {\n  const rand = seeded(seed), Q = Array.from({ length: 11 }, () => [0, 0])          // actions: 0 left, 1 right\n  for (let ep = 0; ep < 3000; ep++) {\n    let s = 1 + Math.floor(rand() * 9)\n    for (let t = 0; t < 100; t++) {\n      const a = rand() < 0.2 ? Math.floor(rand() * 2) : Q[s][1] > Q[s][0] ? 1 : Q[s][0] > Q[s][1] ? 0 : Math.floor(rand() * 2)\n      const next = s + (a === 1 ? 1 : -1), done = next === 0 || next === 10, r = next === 0 ? 1 : next === 10 ? 10 : 0\n      Q[s][a] += 0.1 * (r + (done ? 0 : gamma * Math.max(...Q[next])) - Q[s][a])\n      if (done) break\n      s = next\n    }\n  }\n  return Q[1][1] > Q[1][0] ? \'right (+10 later)\' : \'left (+1 now)\'\n}\nfor (const gamma of [1, 0.9, 0.8, 0.7, 0.5]) console.log(\'γ \' + gamma + \': \' + learn(gamma, 1) + \', far exit worth \' + (10 * gamma ** 9).toFixed(2) + \' now\')',
              },
              {
                type: 'js',
                instruction: '### 5. See it\nThe α study with its intervals.',
                startCode: "// The cliff and Q-learning, as in lessons 9.4 and 9.5 (12 × 4, −1 a move, −100 and back to the start for the spikes).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], START = 3, CHEST = 47\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  return { next: x * 4 + y, reward: -1, done: x * 4 + y === CHEST }\n}\nfunction train({ alpha = 0.5, gamma = 1, eps = 0.1, episodes = 100, seed = 1 }) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const greedyOf = (row) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n  for (let ep = 0; ep < episodes; ep++) {\n    let s = START, total = 0\n    for (let t = 0; t < 500; t++) {\n      const a = rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s]), r = move(s, a)\n      Q[s][a] += alpha * (r.reward + (r.done ? 0 : gamma * Math.max(...Q[r.next])) - Q[s][a])\n      total += r.reward; s = r.next\n      if (r.done) break\n    }\n    returns.push(total)\n  }\n  // The greedy walk's return (60 moves at most).\n  let s = START, g = 0\n  for (let k = 0; k < 60 && s !== CHEST; k++) { const r = move(s, Q[s].indexOf(Math.max(...Q[s]))); g += r.reward; s = r.next }\n  return { returns, greedy: s === CHEST ? g : null }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\nconst sd = (xs) => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))\n\n// The parameter study drawn: mean return over 100 episodes against α, with 95% interval bars (10 seeds each).\nconst alphas = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9]\nconst points = alphas.map((alpha) => { const xs = Array.from({ length: 10 }, (_, k) => mean(train({ alpha, seed: k + 1 }).returns)); return [alpha, mean(xs), 2.26 * sd(xs) / Math.sqrt(10)] })\nconst canvas = document.createElement('canvas'), W = 420, H = 220\ncanvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = 'width: ' + W + 'px; height: ' + H + 'px; display: block; margin: 0 auto'\ndocument.body.appendChild(canvas)\nconst g = canvas.getContext('2d'); g.scale(2, 2); g.fillStyle = '#0f1923'; g.fillRect(0, 0, W, H)\nconst lo = Math.min(...points.map((p) => p[1] - p[2])), hi = Math.max(...points.map((p) => p[1] + p[2]))\nconst X = (a) => 50 + a * (W - 80), Y = (v) => H - 30 - ((v - lo) / (hi - lo)) * (H - 60)\ng.strokeStyle = '#60a5fa'; g.lineWidth = 2; g.beginPath(); points.forEach(([a, m], i) => (i ? g.lineTo(X(a), Y(m)) : g.moveTo(X(a), Y(m)))); g.stroke()\nfor (const [a, m, e] of points) { g.strokeStyle = '#94a3b8'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(a), Y(m - e)); g.lineTo(X(a), Y(m + e)); g.stroke(); g.fillStyle = '#60a5fa'; g.beginPath(); g.arc(X(a), Y(m), 3, 0, 2 * Math.PI); g.fill() }\ng.fillStyle = '#cbd5e1'; g.font = '11px sans-serif'\ng.fillText('mean return, 100 episodes (95% bars)', 8, 14); g.fillText(hi.toFixed(0), 8, Y(hi) + 4); g.fillText(lo.toFixed(0), 8, Y(lo) + 4)\nfor (const a of [0.1, 0.5, 0.9]) g.fillText('α ' + a, X(a) - 12, H - 10)\nconst best = points.reduce((b, p) => (p[1] > b[1] ? p : b))\nconsole.log('best α in this study: ' + best[0] + ' (' + best[1].toFixed(1) + ')')",
                showPreviewByDefault: true,
                outputHeight: 270,
              },
              {
                type: 'challenge',
                instruction: '### 6. Challenge: report a result\nThe cases below check it.',
                startCode: "// Report a result properly: write summary(xs), returning { mean, sd, half } where sd is the SAMPLE standard deviation\n// (divide by n − 1) and half is the 95% interval's half-width, t × sd / √n, with t given.\nfunction summary(xs, t) {\n  return { mean: 0, sd: 0, half: 0 }\n}\n\n// ── The check (leave this part as it is) ──\nconst near = (a, b) => Math.abs(a - b) < 1e-6\nconst cases = [\n  { args: [[2, 4, 4, 4, 5, 5, 7, 9], 2.36], want: { mean: 5, sd: 2.13809, half: 1.78399 }, why: 'mean 5; sample sd √(32/7) ≈ 2.138; half 2.36 × 2.138 / √8' },\n  { args: [[-13, -13, -13], 4.3], want: { mean: -13, sd: 0, half: 0 }, why: 'identical results: no spread' },\n  { args: [[1, 3], 12.71], want: { mean: 2, sd: 1.41421, half: 12.71 }, why: 'two seeds: sd √2, and t for 1 degree of freedom is huge' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = summary(...c.args)\n  const ok = got && ['mean', 'sd', 'half'].every((k) => typeof got[k] === 'number' && Math.abs(got[k] - c.want[k]) < 1e-4)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + JSON.stringify(got && { mean: +Number(got.mean).toFixed(5), sd: +Number(got.sd).toFixed(5), half: +Number(got.half).toFixed(5) }) + (ok ? '' : ', want ' + JSON.stringify(c.want) + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 3 cases pass: mean ± 95% interval.' : passed + ' of 3 cases pass.')",
                solutionCode: "// Report a result properly: write summary(xs), returning { mean, sd, half } where sd is the SAMPLE standard deviation\n// (divide by n − 1) and half is the 95% interval's half-width, t × sd / √n, with t given.\nfunction summary(xs, t) {\n  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n\n  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1))\n  return { mean, sd, half: t * sd / Math.sqrt(n) }\n}\n\n// ── The check (leave this part as it is) ──\nconst near = (a, b) => Math.abs(a - b) < 1e-6\nconst cases = [\n  { args: [[2, 4, 4, 4, 5, 5, 7, 9], 2.36], want: { mean: 5, sd: 2.13809, half: 1.78399 }, why: 'mean 5; sample sd √(32/7) ≈ 2.138; half 2.36 × 2.138 / √8' },\n  { args: [[-13, -13, -13], 4.3], want: { mean: -13, sd: 0, half: 0 }, why: 'identical results: no spread' },\n  { args: [[1, 3], 12.71], want: { mean: 2, sd: 1.41421, half: 12.71 }, why: 'two seeds: sd √2, and t for 1 degree of freedom is huge' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = summary(...c.args)\n  const ok = got && ['mean', 'sd', 'half'].every((k) => typeof got[k] === 'number' && Math.abs(got[k] - c.want[k]) < 1e-4)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + JSON.stringify(got && { mean: +Number(got.mean).toFixed(5), sd: +Number(got.sd).toFixed(5), half: +Number(got.half).toFixed(5) }) + (ok ? '' : ', want ' + JSON.stringify(c.want) + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 3 cases pass: mean ± 95% interval.' : passed + ' of 3 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'A parameter study',
        props: {
          task: 'experiments',
          lesson: 'mg9-006',
          checkpoint: 'cp-mg9-006-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** For n independent runs with results $x_i$, the sample mean $\\bar{x} = \\frac1n\\sum x_i$ estimates the setting's expected result; the sample variance $s^2 = \\frac{1}{n-1}\\sum (x_i - \\bar{x})^2$ is unbiased for the runs' variance (dividing by n − 1 corrects for measuring around $\\bar{x}$ instead of the true mean).",
      "The mean's standard error is $\\sigma/\\sqrt n$, estimated by $s/\\sqrt n$. With results roughly normal, the 95% interval uses Student's t with n − 1 degrees of freedom: 12.71 for 2 runs, 2.78 for 5, 2.26 for 10, 2.01 for 50. To compare two settings, Welch's t-test uses both means, spreads and counts; shared seeds (common random numbers) make paired comparisons more sensitive.",
      'γ and the return: $G_t = \\sum_k \\gamma^k R_{t+k+1}$, so a reward k steps ahead is weighted $\\gamma^k$. The effective horizon is about $1/(1 - \\gamma)$ steps: 10 for 0.9, 100 for 0.99.',
    ],
    equations: [
      {
        label: 'Sample standard deviation',
        latex: 's = \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar{x})^2}',
      },
      {
        label: '95% interval',
        latex: '\\bar{x} \\pm t_{n-1}\\,\\frac{s}{\\sqrt{n}}',
      },
      {
        label: 'Far against near',
        latex: '10\\,\\gamma^9 > 1 \\iff \\gamma > 0.1^{1/9} \\approx 0.774',
      },
      {
        label: 'Effective horizon',
        latex: 'H \\approx \\frac{1}{1 - \\gamma}',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Formal statement: with n i.i.d. runs, the t-interval covers the true mean 95% of the time if results are normal, and approximately so for moderate n otherwise (central limit theorem).',
      'Invariant: scaling every reward by c > 0 scales returns by c and leaves the optimal policy unchanged; adding a constant to every reward does not (it changes how episode length is valued), unless done by potential-based shaping.',
      "Geometric picture: each setting is a cloud of results; a comparison asks whether the clouds' centres are further apart than their spreads allow.",
      'Where it goes: 9.7 asks how many states a design should have, measured the same way.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-006-ex1',
      title: 'An interval',
      difficulty: 'easy',
      problem: '10 seeds give mean −83.6 and sample sd 5.7. The 95% interval (t = 2.26)?',
      steps: [
        {
          expression: '2.26 \\times 5.7 / \\sqrt{10} \\approx 4.1',
          annotation: 'The half-width.',
          strategyTitle: 'Step 1: half-width',
        },
      ],
      answer: '−83.6 ± 4.1, as cell 2 prints.',
    },
    {
      id: 'mg9-006-ex2',
      title: 'Seeds needed',
      difficulty: 'medium',
      problem: 'With sd 6, how many seeds give a half-width under 1 (t ≈ 2)?',
      steps: [
        {
          expression: '2 \\times 6 / \\sqrt{n} < 1 \\Rightarrow \\sqrt{n} > 12',
          annotation: 'Solve for n.',
          strategyTitle: 'Step 1: solve',
        },
      ],
      answer: 'More than 144 seeds; precision is expensive.',
    },
    {
      id: 'mg9-006-ex3',
      title: 'Choosing γ',
      difficulty: 'hard',
      problem: 'A reward of 5 arrives 20 steps away; a reward of 1 now. For which γ is the later one worth more?',
      steps: [
        {
          expression: '5\\gamma^{20} > 1 \\iff \\gamma > 0.2^{1/20} \\approx 0.923',
          annotation: 'Compare discounted values.',
          strategyTitle: 'Step 1: compare',
        },
      ],
      answer: 'γ above about 0.923.',
    },
  ],

  challenges: [
    {
      id: 'mg9-006-ch1',
      title: 'Overlap',
      difficulty: 'easy',
      problem: 'A scores −80 ± 6, B −84 ± 6 (95% intervals). Is A better?',
      hint: 'Do the intervals overlap?',
      answer: 'Not shown: the intervals overlap heavily; more seeds (or a paired test on shared seeds) are needed.',
      walkthrough: [],
    },
    {
      id: 'mg9-006-ch2',
      title: 'Why shared seeds',
      difficulty: 'medium',
      problem: 'Why use the same seeds for every setting?',
      hint: 'What makes two runs differ?',
      answer: 'Then the settings meet the same random situations, so differences come from the settings, not luck; paired comparisons become more sensitive.',
      walkthrough: [],
    },
    {
      id: 'mg9-006-ch3',
      title: 'γ as a horizon',
      difficulty: 'hard',
      problem: "Breakout's agent decides 15 times a second with γ = 0.97. How far ahead does it effectively look, in seconds?",
      hint: '1/(1 − γ) steps.',
      answer: 'About 33 steps, a little over 2 seconds; enough to see a brick or a lost ball coming after a hit.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'x̄',
        meaning: 'The mean over seeds.',
      },
      {
        symbol: 's',
        meaning: 'The sample standard deviation (n − 1).',
      },
      {
        symbol: 's/√n',
        meaning: "The mean's standard error.",
      },
      {
        symbol: 't',
        meaning: "Student's t multiplier for a 95% interval.",
      },
      {
        symbol: 'γ^k',
        meaning: 'How much a reward k steps ahead counts.',
      },
      {
        symbol: '1/(1 − γ)',
        meaning: 'The effective horizon in steps.',
      },
    ],
    rulesOfThumb: [
      'Never compare single runs.',
      'Same seeds for every setting.',
      'Report mean, interval (or sd and n), and curves.',
      'Choose γ for what you want; then tune α.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'A higher score from one run means a better setting.',
      whyStudentsThinkIt: 'The number went up.',
      correctionExample: 'Ten seeds of one setting span 19.6 (cell 1).',
      contrastCase: 'With many seeds and non-overlapping intervals, it does.',
    },
    {
      falseBelief: 'γ is tuned like α.',
      whyStudentsThinkIt: 'Both are parameters.',
      correctionExample: 'γ changes which exit is best (cell 4).',
      contrastCase: 'α only changes how fast and how steadily it learns.',
    },
  ],

  transferPrompts: [
    {
      situation: 'Writing up an assignment comparing ε schedules.',
      competingTechniques: [
        'One run each',
        'with the best curve shown',
        'Ten shared seeds each',
        'mean ± interval and averaged curves',
      ],
      whyThisTechniqueWins: 'Only the second supports a claim.',
    },
    {
      situation: 'An NPC should value safety now over treasure far away.',
      competingTechniques: ['A small γ', 'A big γ with a safety reward'],
      whyThisTechniqueWins: 'A small γ discounts the treasure; but shaping the reward states the goal more directly. Both are choices of what to want.',
    },
  ],

  debugging: [
    {
      commonError: 'Population sd (dividing by n).',
      symptom: 'Intervals too narrow with few seeds.',
      whyItHappened: 'The sample formula divides by n − 1.',
      repairStrategy: 'Use n − 1.',
    },
    {
      commonError: 'Different seeds per setting.',
      symptom: 'Noisy comparisons.',
      whyItHappened: 'Each setting met different luck.',
      repairStrategy: 'Share the seeds.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Run and report a parameter study with intervals.',
    explainVerbally: 'Explain seeds, spread, intervals, and what γ chooses.',
    detectIncorrectApplication: 'Spot single-run claims and γ tuned for score.',
    transferToUnfamiliar: 'Design the experiments for a new comparison.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-006-assess-1',
        type: 'choice',
        text: 'Quadrupling the number of seeds makes the interval',
        options: ['Half as wide', 'A quarter as wide', 'The same', 'Twice as wide'],
        answer: 'Half as wide',
        hint: '1/√n.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-006-quiz-1',
      type: 'choice',
      text: "Over 10 seeds, the same setting's average return ranged from −73.1 to",
      options: ['−92.7', '−74', '−200', '−13'],
      answer: '−92.7',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-006-quiz-2',
      type: 'choice',
      text: 'A 95% interval for a mean of n runs is about',
      options: ['mean ± t × s / √n', 'mean ± s', 'mean ± s / n', 'mean ± 2s'],
      answer: 'mean ± t × s / √n',
      hints: ['Cell 2.'],
      reviewSection: 'Intuition — how sure is a mean',
    },
    {
      id: 'mg9-006-quiz-3',
      type: 'choice',
      text: 'On the cliff, over 100 episodes, the best α of 0.05–0.9 was',
      options: ['0.9', '0.05', '0.3', 'They were equal'],
      answer: '0.9',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-006-quiz-4',
      type: 'choice',
      text: 'In the corridor, the agent goes for the far +10 when',
      options: ['10γ⁹ > 1', 'γ = 1 only', 'Always', 'γ < 0.5'],
      answer: '10γ⁹ > 1',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg9-006-quiz-5',
      type: 'choice',
      text: 'The sample standard deviation divides by',
      options: ['n − 1', 'n', '√n', 'n + 1'],
      answer: 'n − 1',
      hints: ['Warning — sample sd.'],
      reviewSection: 'Warning — sample standard deviation',
    },
    {
      id: 'mg9-006-quiz-6',
      type: 'choice',
      text: 'The effective horizon for γ = 0.9 is about',
      options: ['10 steps', '0.9 steps', '90 steps', '1 step'],
      answer: '10 steps',
      hints: ['1/(1 − γ).'],
      reviewSection: 'Math',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-006-1',
      label: 'Read why one run is one sample',
      type: 'read',
    },
    {
      id: 'cp-mg9-006-2',
      label: 'Read intervals and reporting',
      type: 'read',
    },
    {
      id: 'cp-mg9-006-3',
      label: 'Run the notebook: seeds, α study, γ corridor',
      type: 'read',
    },
    {
      id: 'cp-mg9-006-4',
      label: 'Complete "A parameter study" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-006-5',
      label: 'Repeat it with 10 seeds',
      type: 'lab',
    },
    {
      id: 'cp-mg9-006-6',
      label: 'Work through the interval example',
      type: 'example',
    },
    {
      id: 'cp-mg9-006-7',
      label: 'Work through the choosing-γ example',
      type: 'example',
    },
    {
      id: 'cp-mg9-006-8',
      label: 'Pass the reporting challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
