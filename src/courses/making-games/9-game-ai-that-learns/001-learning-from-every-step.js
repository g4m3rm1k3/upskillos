export default {
  order: 1,

  id: 'mg9-001',

  slug: 'learning-from-every-step',

  title: 'Learning from Every Step',

  subtitle: 'Temporal-difference learning, against Monte Carlo, worked by hand and then watched update by update in Game Studio.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'temporal-difference',
    'td-learning',
    'monte-carlo',
  ],

  aliases: 'td learning temporal difference td(0) monte carlo bootstrapping prediction control td error random walk value function step size alpha',

  timeToComplete: 60,

  coreConcept: 'To learn a value you need a target to move it towards. Monte Carlo waits until the episode ends and uses the return it actually got, G_t. Temporal-difference learning (TD) uses one step of experience and its own estimate of what comes next, R_{t+1} + γ V(S_{t+1}): it learns from every step, before the episode ends, by bootstrapping. The difference between that target and the current estimate is the TD error, δ; every TD method moves its estimate α δ. Q-learning is the same idea for the value of each action.',

  prerequisites: ['mg8-001'],

  nextLesson: 'mg9-002',

  hook: {
    question: 'A game of Breakout lasts 80 seconds. Should the agent wait until the end to learn anything, or can it learn from each moment, guessing how the rest will go and correcting the guess as it plays?',
    realWorldContext: "TD learning (Sutton, 1988) is how most reinforcement learning learns: TD-Gammon learned backgammon from it, Q-learning and DQN are TD methods, and neuroscientists found that dopamine neurons signal something very like the TD error. Sutton & Barto, chapter 6, is this lesson's reference, and its examples are the ones used here.",
  },

  intuition: {
    prose: [
      '**Prediction and control.** Two problems share these ideas. *Prediction*: for a fixed way of acting (a policy π), how good is each state? That is the state-value function $V^\\pi(s) = \\mathbb{E}_\\pi[G_t \\mid S_t = s]$, the expected return from s. *Control*: find the best way of acting. Control (Q-learning, the bonus lesson) is built on prediction, so this lesson starts there.',
      "**The random walk** (Sutton & Barto, Example 6.2) is the standard test. Five states, A to E, in a row; each episode starts at C and steps left or right with equal chance. Off the left end it ends with reward 0, off the right with reward 1. With $\\gamma = 1$, a state's value is the chance of ending on the right: 1/6, 2/6, …, 5/6. Before running cell 1, predict V(C): 1/2, by symmetry.",
      '**Monte Carlo** waits for the end of the episode and moves each visited state towards the return it got: $V(S_t) \\leftarrow V(S_t) + \\alpha[G_t - V(S_t)]$. The target $G_t$ is real, an actual outcome, but it is only known at the end, and it carries all the randomness of the rest of the episode. (Updating every visit to a state is *every-visit* MC; updating only its first visit is *first-visit* MC. Both converge.)',
      '**TD(0)** updates after every step, towards one real reward plus its *estimate* of the next state: $V(S_t) \\leftarrow V(S_t) + \\alpha[R_{t+1} + \\gamma V(S_{t+1}) - V(S_t)]$, with $V$ of a terminal state 0. Using an estimate inside the target is **bootstrapping**. The bracket is the **TD error** $\\delta_t = R_{t+1} + \\gamma V(S_{t+1}) - V(S_t)$: how much better or worse the step turned out than predicted. Before running cell 2, predict which states one episode changes under each: Monte Carlo changes every state it visited; TD(0), starting from equal values, changes only the state next to the end, because only there does the target differ from the estimate.',
      "**Which learns faster?** TD's target has less variance (one step of randomness instead of a whole episode's), but it is biased by the current estimates; Monte Carlo's is unbiased but noisy. On the random walk TD wins (cell 3): after 100 episodes, averaged over 100 runs, TD(0) with $\\alpha = 0.05$ has an error of 0.035 against Monte Carlo's 0.090. A large $\\alpha$ learns fast and then jitters: TD with $\\alpha = 0.1$ is ahead at 25 episodes (0.056) but levels off near 0.05, because each update chases the latest sample.",
      "**From prediction to control.** Learn the value of each *action* instead, $Q(s, a)$, and use the best next action in the target: $Q(S_t, A_t) \\leftarrow Q(S_t, A_t) + \\alpha[R_{t+1} + \\gamma \\max_{a'} Q(S_{t+1}, a') - Q(S_t, A_t)]$. That is Q-learning, a TD method. Cell 4 does one update by hand, exactly as Game Studio's Step shows it; the Try it card then has you step through and predict updates on Cliff Walk.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: one TD update',
        body: 'Step 1. Read the step: S, A, R and S′ (and whether S′ ends the episode). Step 2. The target: R + γ × (the estimate of S′: V(S′) for prediction, max Q(S′, ·) for Q-learning), or R alone if S′ is terminal. Step 3. The TD error: δ = target − current estimate. Step 4. Move the estimate: new = old + α δ.',
      },
      {
        type: 'warning',
        title: 'A terminal state has no future',
        body: 'The commonest bug in TD code: bootstrapping from the state after the end. When S′ is terminal the target is R alone. (An episode cut short by a step limit is different: the game had not ended, so you still bootstrap.)',
      },
      {
        type: 'warning',
        title: 'The step size is a trade-off',
        body: 'α = 1 replaces the estimate with the last target; a tiny α barely moves. On Cliff Walk, Q-learning with α = 0.5 finds the 13-move walk in 200 episodes; with α = 0.05 its greedy walk does not reach the chest at all (−200, the step limit). Theory asks for a step size that shrinks (Σα = ∞, Σα² < ∞); in practice a constant α tracks a changing problem and is tuned.',
      },
      {
        type: 'insight',
        title: 'What the picture shows (cell 5)',
        body: 'Misconception it contradicts: "waiting for the real outcome must be more accurate". Monte Carlo\'s target is exact on average, yet TD\'s error falls faster: averaging one step of noise at a time beats averaging whole episodes of it.',
      },
      {
        type: 'insight',
        title: 'In the ML Lab',
        body: "The ML Lab's lab 37 covers the same ground in its own gridworld: lesson 37.2 the Bellman expectation equation and policy evaluation, 37.4 the Q-learning update. [Open the ML Lab](#/lab/ml-lab).",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: Monte Carlo and TD(0)',
        caption: 'The random walk, one episode learned two ways, error curves over 100 runs, and one Q-learning update.',
        props: {
          lesson: {
            title: 'Learning from every step',
            subtitle: 'Monte Carlo against TD(0).',
            cells: [
              {
                type: 'js',
                instruction: '### 1. The random walk\nPredict first: V(C).',
                startCode: "// The random walk: five states A to E in a row, starting at C. Each step goes left or right with equal chance.\n// Off the left end the episode ends with reward 0, off the right end with reward 1; every other step earns 0.\n// With γ = 1 a state's value is the chance of ending on the right. (Game Studio's random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst NAMES = ['A', 'B', 'C', 'D', 'E']\n// One episode: the states visited (0 to 4) and the rewards after each step.\nfunction episode(rand) {\n  let s = 2\n  const states = [], rewards = []\n  for (;;) {\n    states.push(s)\n    s += rand() < 0.5 ? -1 : 1\n    if (s < 0) { rewards.push(0); return { states, rewards } }\n    if (s > 4) { rewards.push(1); return { states, rewards } }\n    rewards.push(0)\n  }\n}\n\n// Before running: predict V(C), the chance of ending on the right from the middle.\n// The true values satisfy V(s) = ½ V(left) + ½ V(right) (the Bellman equation for this policy), with the ends 0\n// and 1. Solve it by sweeping until nothing changes:\nlet V = [0.5, 0.5, 0.5, 0.5, 0.5]\nfor (let k = 0; k < 2000; k++) V = V.map((_, s) => 0.5 * (s === 0 ? 0 : V[s - 1]) + 0.5 * (s === 4 ? 1 : V[s + 1]))\nconsole.log('true values: ' + V.map((v, s) => NAMES[s] + ' ' + v.toFixed(4)).join(', '))\nconst e = episode(seeded(3))\nconsole.log('one episode: ' + e.states.map((s) => NAMES[s]).join(' → ') + ' → ' + (e.rewards.at(-1) ? 'right (reward 1)' : 'left (reward 0)'))",
              },
              {
                type: 'js',
                instruction: '### 2. One episode, two ways\nPredict first: which states TD(0) changes.',
                startCode: "// The random walk: five states A to E in a row, starting at C. Each step goes left or right with equal chance.\n// Off the left end the episode ends with reward 0, off the right end with reward 1; every other step earns 0.\n// With γ = 1 a state's value is the chance of ending on the right. (Game Studio's random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst NAMES = ['A', 'B', 'C', 'D', 'E']\n// One episode: the states visited (0 to 4) and the rewards after each step.\nfunction episode(rand) {\n  let s = 2\n  const states = [], rewards = []\n  for (;;) {\n    states.push(s)\n    s += rand() < 0.5 ? -1 : 1\n    if (s < 0) { rewards.push(0); return { states, rewards } }\n    if (s > 4) { rewards.push(1); return { states, rewards } }\n    rewards.push(0)\n  }\n}\n\n// The same episode, learned two ways, starting from V = 0.5 everywhere, α = 0.1, γ = 1.\n// Monte Carlo waits for the episode's end, then moves each visited state towards the return G it actually got:\n//   V(S_t) ← V(S_t) + α [G_t − V(S_t)]\n// TD(0) updates after every step, towards the reward plus its estimate of the next state (bootstrapping):\n//   V(S_t) ← V(S_t) + α [R_{t+1} + γ V(S_{t+1}) − V(S_t)]      (V of a terminal state is 0)\n// Predict first: after this one episode, which states does TD(0) change?\nconst e = episode(seeded(3)), alpha = 0.1\nconst mc = [0.5, 0.5, 0.5, 0.5, 0.5], td = [0.5, 0.5, 0.5, 0.5, 0.5]\n// Monte Carlo: G_t is the sum of the rewards from t on (γ = 1).\nfor (let t = 0; t < e.states.length; t++) {\n  const G = e.rewards.slice(t).reduce((a, b) => a + b, 0)\n  mc[e.states[t]] += alpha * (G - mc[e.states[t]])\n}\n// TD(0): each step's target is R + V(next), or R alone when the step ends the episode.\nfor (let t = 0; t < e.states.length; t++) {\n  const next = t + 1 < e.states.length ? td[e.states[t + 1]] : 0\n  td[e.states[t]] += alpha * (e.rewards[t] + next - td[e.states[t]])\n}\nconsole.log('episode: ' + e.states.map((s) => NAMES[s]).join(' → ') + ', return ' + e.rewards.reduce((a, b) => a + b, 0))\nconsole.log('Monte Carlo: ' + mc.map((v, s) => NAMES[s] + ' ' + v.toFixed(4)).join(', '))\nconsole.log('TD(0):       ' + td.map((v, s) => NAMES[s] + ' ' + v.toFixed(4)).join(', '))",
              },
              {
                type: 'js',
                instruction: '### 3. Many episodes\nPredict first: which is closer after 100 episodes.',
                startCode: "// The random walk: five states A to E in a row, starting at C. Each step goes left or right with equal chance.\n// Off the left end the episode ends with reward 0, off the right end with reward 1; every other step earns 0.\n// With γ = 1 a state's value is the chance of ending on the right. (Game Studio's random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst NAMES = ['A', 'B', 'C', 'D', 'E']\n// One episode: the states visited (0 to 4) and the rewards after each step.\nfunction episode(rand) {\n  let s = 2\n  const states = [], rewards = []\n  for (;;) {\n    states.push(s)\n    s += rand() < 0.5 ? -1 : 1\n    if (s < 0) { rewards.push(0); return { states, rewards } }\n    if (s > 4) { rewards.push(1); return { states, rewards } }\n    rewards.push(0)\n  }\n}\n\n// Over many episodes. The error is the root mean square of V − true value over A to E, averaged over 100 runs\n// (each run starts again from 0.5 everywhere). Predict first: after 100 episodes, which is closer?\nconst TRUE = [1, 2, 3, 4, 5].map((k) => k / 6)\nconst rms = (V) => Math.sqrt(V.reduce((a, v, s) => a + (v - TRUE[s]) ** 2, 0) / 5)\nfunction learn(method, alpha, episodes, seed) {\n  const rand = seeded(seed), V = [0.5, 0.5, 0.5, 0.5, 0.5], errs = [rms(V)]\n  for (let n = 0; n < episodes; n++) {\n    const e = episode(rand)\n    for (let t = 0; t < e.states.length; t++) {\n      const target = method === 'mc' ? e.rewards.slice(t).reduce((a, b) => a + b, 0) : e.rewards[t] + (t + 1 < e.states.length ? V[e.states[t + 1]] : 0)\n      V[e.states[t]] += alpha * (target - V[e.states[t]])\n    }\n    errs.push(rms(V))\n  }\n  return errs\n}\nconst average = (method, alpha) => { const runs = Array.from({ length: 100 }, (_, k) => learn(method, alpha, 100, k + 1)); return runs[0].map((_, i) => runs.reduce((a, r) => a + r[i], 0) / runs.length) }\nfor (const [method, alpha] of [['td', 0.1], ['td', 0.05], ['mc', 0.03], ['mc', 0.01]]) {\n  const err = average(method, alpha)\n  console.log((method === 'td' ? 'TD(0)' : 'Monte Carlo') + ' α ' + alpha + ': error ' + [0, 10, 25, 50, 100].map((n) => 'after ' + n + ' ' + err[n].toFixed(3)).join(', '))\n}",
              },
              {
                type: 'js',
                instruction: '### 4. One Q-learning update\nPredict first: the new Q(S, right).',
                startCode: "// From predicting to controlling: the same TD idea, for the value of each action. One update on the cliff, as\n// Game Studio's Step shows it. The Walker is in (column 3, row 2), moves right (R = −1) to (column 4, row 2),\n// where Q(S′, ·) = [−3, −2.5, −50, −4] for up, right, down, left. Q(S, right) was −2. α = 0.5, γ = 1.\n// Predict first: the new Q(S, right) under Q-learning.\nconst q = -2, r = -1, nextRow = [-3, -2.5, -50, -4], alpha = 0.5, gamma = 1\nconst target = r + gamma * Math.max(...nextRow)      // R + γ max_a′ Q(S′, a′)\nconst delta = target - q                             // the TD error\nconsole.log('target ' + target + ', δ ' + delta + ', new Q(S, right) ' + (q + alpha * delta))",
              },
              {
                type: 'js',
                instruction: '### 5. See it\nThe error curves.',
                startCode: "// The random walk: five states A to E in a row, starting at C. Each step goes left or right with equal chance.\n// Off the left end the episode ends with reward 0, off the right end with reward 1; every other step earns 0.\n// With γ = 1 a state's value is the chance of ending on the right. (Game Studio's random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst NAMES = ['A', 'B', 'C', 'D', 'E']\n// One episode: the states visited (0 to 4) and the rewards after each step.\nfunction episode(rand) {\n  let s = 2\n  const states = [], rewards = []\n  for (;;) {\n    states.push(s)\n    s += rand() < 0.5 ? -1 : 1\n    if (s < 0) { rewards.push(0); return { states, rewards } }\n    if (s > 4) { rewards.push(1); return { states, rewards } }\n    rewards.push(0)\n  }\n}\n\n// The error curves of cell 3, drawn: TD(0) (blue, α 0.1) and Monte Carlo (orange, α 0.03), averaged over 100 runs.\nconst TRUE = [1, 2, 3, 4, 5].map((k) => k / 6)\nconst rms = (V) => Math.sqrt(V.reduce((a, v, s) => a + (v - TRUE[s]) ** 2, 0) / 5)\nfunction learn(method, alpha, seed) {\n  const rand = seeded(seed), V = [0.5, 0.5, 0.5, 0.5, 0.5], errs = [rms(V)]\n  for (let n = 0; n < 100; n++) {\n    const e = episode(rand)\n    for (let t = 0; t < e.states.length; t++) {\n      const target = method === 'mc' ? e.rewards.slice(t).reduce((a, b) => a + b, 0) : e.rewards[t] + (t + 1 < e.states.length ? V[e.states[t + 1]] : 0)\n      V[e.states[t]] += alpha * (target - V[e.states[t]])\n    }\n    errs.push(rms(V))\n  }\n  return errs\n}\nconst curve = (m, a) => { const runs = Array.from({ length: 100 }, (_, k) => learn(m, a, k + 1)); return runs[0].map((_, i) => runs.reduce((s, r) => s + r[i], 0) / 100) }\nconst td = curve('td', 0.1), mc = curve('mc', 0.03)\nconst canvas = document.createElement('canvas'), W = 420, H = 220\ncanvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = 'width: ' + W + 'px; height: ' + H + 'px; display: block; margin: 0 auto'\ndocument.body.appendChild(canvas)\nconst g = canvas.getContext('2d'); g.scale(2, 2); g.fillStyle = '#0f1923'; g.fillRect(0, 0, W, H)\nconst X = (n) => 44 + n * 3.6, Y = (e) => H - 30 - (e / 0.25) * (H - 50)\ng.strokeStyle = '#334155'; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(100), Y(0)); g.moveTo(X(0), Y(0)); g.lineTo(X(0), Y(0.25)); g.stroke()\nfor (const [c, color] of [[td, '#60a5fa'], [mc, '#f59e0b']]) { g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); c.forEach((e, n) => (n ? g.lineTo(X(n), Y(e)) : g.moveTo(X(n), Y(e)))); g.stroke() }\ng.fillStyle = '#cbd5e1'; g.font = '11px sans-serif'\ng.fillText('error', 6, Y(0.25) + 4); g.fillText('0.25', 14, Y(0.25) + 14); g.fillText('0', 30, Y(0) + 4)\ng.fillText('episodes →', X(100) - 60, H - 10); g.fillText('blue: TD(0), α 0.1   orange: Monte Carlo, α 0.03', 60, 16)\nconsole.log('after 100 episodes: TD(0) ' + td[100].toFixed(3) + ', Monte Carlo ' + mc[100].toFixed(3))",
                showPreviewByDefault: true,
                outputHeight: 270,
              },
              {
                type: 'challenge',
                instruction: '### 6. Challenge: write TD(0)\nThe cases below check it.',
                startCode: "// Write TD(0)'s update for a state value: given V(S), the reward R, V(S′) and whether the step ended the episode,\n// return the new V(S).\nfunction tdUpdate(v, reward, vNext, done, alpha, gamma) {\n  return v\n}\n\n// ── The check: cases with the answers a correct update gives (leave this part as it is) ──\nconst cases = [\n  { args: [0.5, 0, 0.6, false, 0.1, 1], want: 0.51, why: 'the target is R + γ V(S′); move α of the way from V(S) to it' },\n  { args: [0.5, 1, 0.9, true, 0.1, 1], want: 0.55, why: 'this step ended the episode: the target is R alone, there is no V(S′)' },\n  { args: [2, -1, 4, false, 0.5, 0.9], want: 2.3, why: 'γ discounts V(S′): target −1 + 0.9 × 4 = 2.6, so 2 + 0.5 × 0.6' },\n  { args: [0, 0, 1, false, 1, 0.5], want: 0.5, why: 'with α = 1 the new value is the target itself' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = tdUpdate(...c.args)\n  const ok = typeof got === 'number' && Math.abs(got - c.want) < 1e-9\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + (typeof got === 'number' ? +got.toFixed(6) : got) + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is TD(0).' : passed + ' of 4 cases pass.')",
                solutionCode: "// Write TD(0)'s update for a state value: given V(S), the reward R, V(S′) and whether the step ended the episode,\n// return the new V(S).\nfunction tdUpdate(v, reward, vNext, done, alpha, gamma) {\n  const target = reward + (done ? 0 : gamma * vNext)\n  return v + alpha * (target - v)\n}\n\n// ── The check: cases with the answers a correct update gives (leave this part as it is) ──\nconst cases = [\n  { args: [0.5, 0, 0.6, false, 0.1, 1], want: 0.51, why: 'the target is R + γ V(S′); move α of the way from V(S) to it' },\n  { args: [0.5, 1, 0.9, true, 0.1, 1], want: 0.55, why: 'this step ended the episode: the target is R alone, there is no V(S′)' },\n  { args: [2, -1, 4, false, 0.5, 0.9], want: 2.3, why: 'γ discounts V(S′): target −1 + 0.9 × 4 = 2.6, so 2 + 0.5 × 0.6' },\n  { args: [0, 0, 1, false, 1, 0.5], want: 0.5, why: 'with α = 1 the new value is the target itself' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = tdUpdate(...c.args)\n  const ok = typeof got === 'number' && Math.abs(got - c.want) < 1e-9\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + (typeof got === 'number' ? +got.toFixed(6) : got) + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is TD(0).' : passed + ' of 4 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Step through TD updates',
        props: {
          task: 'td-step',
          lesson: 'mg9-001',
          checkpoint: 'cp-mg9-001-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** The value of a policy satisfies the Bellman expectation equation $V^\\pi(s) = \\mathbb{E}_\\pi[R_{t+1} + \\gamma V^\\pi(S_{t+1}) \\mid S_t = s]$, because $G_t = R_{t+1} + \\gamma G_{t+1}$. Monte Carlo estimates the left-hand form $\\mathbb{E}[G_t]$ from samples of $G_t$; TD(0) estimates the right-hand form from samples of $R_{t+1} + \\gamma V(S_{t+1})$, with its own V standing in for $V^\\pi$.',
      'Both are stochastic approximation: $V \\leftarrow V + \\alpha(\\text{sample} - V)$ is a running average. With step sizes that satisfy $\\sum_t \\alpha_t = \\infty$ and $\\sum_t \\alpha_t^2 < \\infty$ (such as $1/n$), tabular TD(0) converges to $V^\\pi$ with probability 1 for any fixed policy; with a constant small α it converges in the mean. On a fixed batch of data, batch TD finds the value of the maximum-likelihood Markov model of the data (the certainty-equivalence estimate) while batch MC finds the values that best fit the returns seen.',
      'The TD error links the two: the Monte Carlo error is the discounted sum of TD errors, $G_t - V(S_t) = \\sum_{k=t}^{T-1} \\gamma^{k-t}\\delta_k$ (exactly, if V does not change during the episode). TD applies each piece as it arrives instead of all at the end.',
    ],
    equations: [
      {
        label: 'Monte Carlo',
        latex: 'V(S_t) \\leftarrow V(S_t) + \\alpha\\,[G_t - V(S_t)]',
      },
      {
        label: 'TD(0)',
        latex: 'V(S_t) \\leftarrow V(S_t) + \\alpha\\,[R_{t+1} + \\gamma V(S_{t+1}) - V(S_t)]',
      },
      {
        label: 'TD error',
        latex: '\\delta_t = R_{t+1} + \\gamma V(S_{t+1}) - V(S_t)',
      },
      {
        label: 'MC error as TD errors',
        latex: 'G_t - V(S_t) = \\sum_{k=t}^{T-1} \\gamma^{k-t} \\delta_k',
      },
      {
        label: 'Q-learning',
        latex: "Q(S_t, A_t) \\leftarrow Q(S_t, A_t) + \\alpha\\,[R_{t+1} + \\gamma \\max_{a'} Q(S_{t+1}, a') - Q(S_t, A_t)]",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Formal statement: for a finite MDP and a fixed policy, tabular TD(0) with Robbins–Monro step sizes converges to $V^\\pi$ with probability 1 (Dayan, 1992; Jaakkola, Jordan & Singh, 1994).',
      'Invariant: in the random walk, the true values are the unique solution of $V(s) = \\tfrac12 V(s-1) + \\tfrac12 V(s+1)$ with $V = 0$ off the left and 1 off the right: a straight line, $V(s) = (s+1)/6$.',
      "Geometric picture: each update pulls one coordinate of the value vector towards a noisy target; Monte Carlo's targets scatter around the truth, TD's scatter less but around the current estimate, which moves.",
      'Where it goes: lesson 9.2 asks how the agent should explore while it learns, 9.3 applies all of this to Breakout from scratch, and 9.4 compares the two TD control methods, SARSA and Q-learning.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-001-ex1',
      title: 'A TD(0) update',
      difficulty: 'easy',
      problem: 'V(C) = 0.5, the walk steps to D (reward 0) where V(D) = 0.6; α = 0.1, γ = 1. New V(C)?',
      steps: [
        {
          expression: '\\delta = 0 + 1 \\times 0.6 - 0.5 = 0.1',
          annotation: 'The TD error.',
          strategyTitle: 'Step 1: δ',
        },
        {
          expression: '0.5 + 0.1 \\times 0.1 = 0.51',
          annotation: 'Move α of the way.',
          strategyTitle: 'Step 2: update',
        },
      ],
      answer: "0.51 (the challenge's first case).",
    },
    {
      id: 'mg9-001-ex2',
      title: 'A Monte Carlo update',
      difficulty: 'medium',
      problem: "The episode C, D, E then off the right end (reward 1). V = 0.5 everywhere, α = 0.1, γ = 1. MC's new V(C)?",
      steps: [
        {
          expression: 'G_0 = 0 + 0 + 1 = 1',
          annotation: 'The return from C.',
          strategyTitle: 'Step 1: the return',
        },
        {
          expression: '0.5 + 0.1 \\times (1 - 0.5) = 0.55',
          annotation: 'Towards the return.',
          strategyTitle: 'Step 2: update',
        },
      ],
      answer: '0.55. TD(0) would leave V(C) at 0.5 after this episode, since V(D) = V(C).',
    },
    {
      id: 'mg9-001-ex3',
      title: 'The MC error is a sum of TD errors',
      difficulty: 'hard',
      problem: 'With V fixed during the episode C → D → off the right end (γ = 1), show G_0 − V(C) = δ_0 + δ_1.',
      steps: [
        {
          expression: '\\delta_0 = 0 + V(D) - V(C),\\ \\delta_1 = 1 + 0 - V(D)',
          annotation: 'The two TD errors.',
          strategyTitle: 'Step 1: δs',
        },
        {
          expression: '\\delta_0 + \\delta_1 = 1 - V(C) = G_0 - V(C)',
          annotation: 'V(D) cancels, so the sum telescopes.',
          strategyTitle: 'Step 2: add',
        },
      ],
      answer: 'The intermediate estimates cancel, leaving the return minus the first estimate.',
    },
  ],

  challenges: [
    {
      id: 'mg9-001-ch1',
      title: 'Why bootstrap?',
      difficulty: 'easy',
      problem: 'Give one advantage of TD over Monte Carlo in a game that never ends.',
      hint: 'When does Monte Carlo update?',
      answer: 'Monte Carlo cannot update until an episode ends; TD updates after every step, so it learns in continuing tasks and early in long episodes.',
      walkthrough: [],
    },
    {
      id: 'mg9-001-ch2',
      title: 'The step size',
      difficulty: 'medium',
      problem: 'Why does TD(0) with α = 0.1 level off near an error of 0.05 on the random walk, while α = 0.05 keeps improving?',
      hint: 'What does a constant α do with the latest sample?',
      answer: 'With a constant α the estimate keeps moving a fixed fraction towards each new noisy target, so it jitters around the truth; a smaller α averages over more samples and jitters less, but learns more slowly at first.',
      walkthrough: [],
    },
    {
      id: 'mg9-001-ch3',
      title: 'Terminal states',
      difficulty: 'hard',
      problem: 'Explain why bootstrapping from the state after a terminal step is wrong, but bootstrapping after a time-limit cut-off is right.',
      hint: 'Does the game have a future at that point?',
      answer: 'A terminal state has value 0 by definition: nothing can follow it, so the target is R. An episode stopped by a step limit had not ended; the state reached still has a future, so its estimate belongs in the target, or the agent learns that running out of time is the same as ending.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'V^π(s)',
        meaning: 'Expected return from s, following π.',
      },
      {
        symbol: 'G_t',
        meaning: "The actual return from step t (Monte Carlo's target).",
      },
      {
        symbol: 'R + γV(S′)',
        meaning: "TD(0)'s target: one real reward and an estimate.",
      },
      {
        symbol: 'δ',
        meaning: 'The TD error: target − estimate.',
      },
      {
        symbol: 'α',
        meaning: 'Step size: how far each update moves.',
      },
      {
        symbol: 'bootstrapping',
        meaning: 'Using an estimate inside a target.',
      },
    ],
    rulesOfThumb: [
      'Every TD update is target − estimate, times α.',
      'Terminal next state means target = R.',
      'TD learns during the episode; Monte Carlo after it.',
      'Tune α against noise; average results over runs.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Monte Carlo is always more accurate because it uses real returns.',
      whyStudentsThinkIt: 'Real outcomes sound better than guesses.',
      correctionExample: "On the random walk TD's error after 100 episodes is lower (cell 3).",
      contrastCase: "With very bad initial estimates and few states visited, MC's unbiased targets can win early.",
    },
    {
      falseBelief: 'A bigger α always learns faster.',
      whyStudentsThinkIt: 'Bigger steps move more.',
      correctionExample: 'TD with α 0.1 levels off at a higher error than α 0.05.',
      contrastCase: 'Early on, the bigger α is ahead.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An agent in a game with no natural end (a racing game that loops).',
      competingTechniques: ['Monte Carlo', 'TD'],
      whyThisTechniqueWins: 'TD needs no episode end to learn.',
    },
    {
      situation: 'Values must be unbiased estimates of real outcomes for a report.',
      competingTechniques: ['TD', 'Monte Carlo'],
      whyThisTechniqueWins: "Monte Carlo averages actual returns; TD's estimates are biased by its own guesses until converged.",
    },
  ],

  debugging: [
    {
      commonError: 'Bootstrapping from a terminal state.',
      symptom: 'Values near the end creep away from the rewards there.',
      whyItHappened: 'V(terminal) was used instead of 0.',
      repairStrategy: 'Use target = R when the step ends the episode.',
    },
    {
      commonError: 'Updating with the new value of S′ after changing it.',
      symptom: 'Subtly different numbers from the textbook.',
      whyItHappened: 'The order of updates changed the target.',
      repairStrategy: 'Read the target from the values before the update.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write TD(0) and one Q-learning update, and compute updates by hand.',
    explainVerbally: 'Explain bootstrapping, the TD error, and TD against Monte Carlo.',
    detectIncorrectApplication: 'Spot a terminal-state bootstrap and a badly chosen α.',
    transferToUnfamiliar: 'Apply TD prediction to a new chain or game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-001-assess-1',
        type: 'choice',
        text: 'V(S) = 1, R = 2, V(S′) = 3, γ = 0.5, α = 0.5, S′ not terminal. New V(S)?',
        options: ['2.25', '2.5', '1.5', '3'],
        answer: '2.25',
        hint: 'Target 2 + 1.5 = 3.5; 1 + 0.5 × 2.5.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-001-quiz-1',
      type: 'choice',
      text: "TD(0)'s target is",
      options: ['R + γ V(S′)', 'G_t', 'V(S′)', 'R only, always'],
      answer: 'R + γ V(S′)',
      hints: ['Cell 2.'],
      reviewSection: 'Intuition — TD(0)',
    },
    {
      id: 'mg9-001-quiz-2',
      type: 'choice',
      text: 'Bootstrapping means',
      options: [
        'Using an estimate in the target',
        'Restarting the episode',
        'Sampling with replacement',
        'Starting values at zero',
      ],
      answer: 'Using an estimate in the target',
      hints: ['The TD(0) paragraph.'],
      reviewSection: 'Intuition — TD(0)',
    },
    {
      id: 'mg9-001-quiz-3',
      type: 'choice',
      text: 'After one episode from equal starting values, TD(0) changes',
      options: [
        'Only the state next to the end',
        'Every visited state',
        'No states',
        'Only the start state',
      ],
      answer: 'Only the state next to the end',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-001-quiz-4',
      type: 'choice',
      text: 'When S′ is terminal, the TD target is',
      options: ['R', 'R + γ V(S′)', '0', 'V(S)'],
      answer: 'R',
      hints: ['Warning — a terminal state has no future.'],
      reviewSection: 'Warning — terminal states',
    },
    {
      id: 'mg9-001-quiz-5',
      type: 'choice',
      text: 'On the random walk after 100 episodes, the lowest error is',
      options: [
        'TD(0), α 0.05',
        'Monte Carlo, α 0.03',
        'Monte Carlo, α 0.01',
        'TD(0), α 0.1',
      ],
      answer: 'TD(0), α 0.05',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-001-quiz-6',
      type: 'choice',
      text: 'Q-learning is',
      options: [
        'A TD method for action values',
        'A Monte Carlo method',
        'A planning method that needs the model',
        'A policy-gradient method',
      ],
      answer: 'A TD method for action values',
      hints: ['From prediction to control.'],
      reviewSection: 'Intuition — from prediction to control',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-001-1',
      label: 'Read prediction, Monte Carlo and TD(0)',
      type: 'read',
    },
    {
      id: 'cp-mg9-001-2',
      label: 'Read bootstrapping and the TD error',
      type: 'read',
    },
    {
      id: 'cp-mg9-001-3',
      label: 'Run the notebook: one episode two ways, and the error curves',
      type: 'read',
    },
    {
      id: 'cp-mg9-001-4',
      label: 'Complete "Step through TD updates" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-001-5',
      label: 'Predict three updates correctly in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-001-6',
      label: 'Work through the TD(0) update example',
      type: 'example',
    },
    {
      id: 'cp-mg9-001-7',
      label: 'Work through the MC error as TD errors example',
      type: 'example',
    },
    {
      id: 'cp-mg9-001-8',
      label: 'Pass the write-TD(0) challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
