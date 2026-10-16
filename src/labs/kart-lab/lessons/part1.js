// Part 1: a game as an environment. The agent–environment loop, the track as data, actions,
// swept collisions, rewards and returns, and drivers written by hand. Every number a predict
// block asks for is worked out by `compute` from the engine, which equals the Python programs.
import { reset, step, intent, contact, sweeperLane, careful, drive } from '../engine/kart.js'
import M from '../engine/measured.json'
import { f } from './util.js'

const at = (p, lane, speed) => ({ ...reset(1, lane), p, speed })
const pct = x => `${Math.round(100 * x)}%`
const barrierHit = (() => { const a = intent(at(12, 1, 1), 3); return contact(a, { p: 15, lane: 1, nextP: 15, nextLane: 1 }, 144) })()
const enterTime = (0.65 - 3) / -3
const carefulLap = drive(careful, 800001)

export const PART1 = {
  id: 'part1', title: 'Part 1 · A game as an environment', lessons: [
    {
      id: 'kart-01-agent-contract', number: '1.1', title: 'A game becomes a learning environment',
      goal: 'Describe the agent–environment loop, and drive one lap with `reset` and `step`.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `**Sunlit Circuit** is a small 3D kart racer. Three lanes run round a loop of 144 sectors, with barriers to dodge, two yellow sweepers that slide across the road, and other karts. This lab teaches you to train its drivers with **reinforcement learning**, from the first line of the game's code to drivers that can race on a track they have never seen.

1. **A game as an environment** (this part): the track, the moves, collisions, rewards, and drivers written by hand.
2. **What the driver knows**: turning a situation into a number a table can be indexed by.
3. **Learning to drive**: Q-learning, exploration, SARSA, maximisation bias and Double Q-learning, reward design, and judging a result honestly.
4. **Driving a track it has never seen**: why a table memorises, and how sensors and a linear function generalise.
5. **Racing**: three learners on one track, and a fair tournament.

It assumes basic Python: variables, \`if\`, \`for\`, functions, lists and dictionaries. Every line of every program is explained. **🏁 Race & watch** lets you drive against the trained drivers at any time; **🧪 Train & compare** trains your own.` },
        { h: 'The loop' },
        { md: `Every reinforcement learning problem has the same shape. An **agent** (the driver) and an **environment** (everything else: the track, the physics, the other karts) take turns:

1. the environment shows the agent its **state** $s_t$;
2. the agent picks an **action** $a_t$;
3. the environment moves on one step and reports a **reward** $r_{t+1}$ and the next state $s_{t+1}$.

Round and round until the **episode** ends, here one lap. The agent's job is to choose actions that make the total reward large. In code the environment is two functions. \`reset\` starts an episode and returns the first state. \`step\` takes the state and an action and returns the next state, with the reward inside it. (Gymnasium, the standard Python library of environments, uses exactly this \`reset\` / \`step\` shape.)` },
        {
          code: {
            file: 'kart.py', fn: 'reset', notes: [
              ['def reset(seed=1, lane=None):', ['`seed` decides the starting lane, so every lap can be repeated exactly; `lane` overrides it (the race puts one kart in each lane).']],
              ['if lane is None:', ['No lane given…']],
              ['lane = random.Random(seed).randrange(3)', ['…so a generator started from `seed` picks one: `randrange(3)` is 0, 1 or 2. Lanes are numbered from 0 in the code; the arena labels them 1 to 3.']],
              ['return {"p": 0, "lane": lane, "speed": 0, "ticks": 0, "crashes": 0, "total": 0.0,', ['The **state** is a dictionary: `p` the sector reached (0 to 143 on the first lap), the lane, the speed tier (0, 1 or 2), how many decisions so far (`ticks`), collisions so far, the reward so far…']],
            ],
          },
        },
        {
          code: {
            file: 'kart.py', fn: 'drive', notes: [
              ['def drive(policy, seed=1, track=SUNLIT, traffic=True):', ['A **policy** is a function from what the driver sees to an action. `drive` runs one lap with it.']],
              ['state = reset(seed)', ['Start the episode.']],
              ['while not state["done"]:', ['Until the lap ends: finished, out of time, or too many collisions.']],
              ['cars = scripted_traffic(state["ticks"], seed, track) if traffic else []', ['The practice traffic at this moment (lesson 1.6).']],
              ['state = step(state, policy(state, cars, track), track, cars)', ['**The loop in one line**: the policy chooses an action from the state; `step` returns the next state.']],
              ['return state', ['The final state: finished or not, collisions, total reward.']],
            ],
          },
        },
        { added: true, h: 'One lap starting, with real values' },
        { added: true, md: `The state is a **dictionary**: names on the left, values on the right. Here is a real lap starting (seed 1 puts the kart in lane 0), then two **Accelerate** moves. Actions are numbers too: \`ACTIONS = ["Left", "Coast", "Right", "Accelerate", "Brake"]\`, so Accelerate is \`3\`, its index in that list.

\`\`\`python
state = reset(1)
# {'p': 0, 'lane': 0, 'speed': 0, 'ticks': 0, 'crashes': 0, 'total': 0.0,
#  'done': False, 'finished': False, 'last': None}

state = step(state, 3)       # Accelerate
# {'p': 2, 'lane': 0, 'speed': 1, 'ticks': 1, 'crashes': 0, 'total': 0.1, 'done': False, ...
#  'last': {'action': 3, 'reward': 0.1,
#           'parts': {'progress': 0.3, 'time': -0.2, 'collision': 0, 'finish': 0}, 'hit': None}}

state = step(state, 3)       # Accelerate again
# {'p': 5, 'lane': 0, 'speed': 2, 'ticks': 2, 'total': 0.35, ...
#  'last': {'action': 3, 'reward': 0.25, ...}}
\`\`\`

Read it as: at speed tier 1 the kart covers 2 sectors (0 → 2), at tier 2 it covers 3 (2 → 5). The reward of each move is in \`state["last"]["reward"]\`, built from its \`parts\` (lesson 1.5), and \`total\` adds them up. \`step\` never changes the old dictionary; it returns a **new** one, so the code writes \`state = step(state, action)\`.

(Python actually prints the first reward as \`0.09999999999999998\`: computers store most decimals in binary, slightly off. It is 0.1 for every purpose here.)` },
        { figure: 'LapPlayer', caption: 'One lap, step by step, driven by a hand-written policy (lesson 1.6). Each step: the state, the action, and the reward.' },
        { python: { program: 'lap', label: 'Step through one lap in real Python' } },
        {
          choice: {
            prompt: 'Which part should change when you train a better driver?',
            options: [
              { text: 'The rules of the circuit, so it is easier', why: 'Then an improvement would mean nothing: you would be measuring a different game. The environment stays fixed.' },
              { text: 'The policy: the way it turns states into actions', why: 'Yes. Training changes the numbers inside the policy; `reset` and `step` never change.' },
              { text: 'The renderer, to move the kart faster', why: 'Drawing never changes the game: the 3D arena only shows the states that `step` returns.' },
            ],
            answer: 1,
          },
        },
        { note: '**Agent and environment** take turns: state → action → reward and next state. `reset` starts an episode, `step` advances it. A **policy** maps states to actions; learning means improving the policy.' },
      ],
    },

    {
      id: 'kart-track-data', number: '1.2', title: 'The track as data',
      goal: 'Read a track as a dictionary of lists, and compute where a sweeper is at any moment from a triangle wave.',
      builds: ['kart-01-agent-contract'],
      blocks: [
        { md: `A track is just data. Its **length** (144 sectors), its **barriers** (each a sector and a lane), and its **sweepers** (each a sector, and an offset in time). The 3D arena draws from these same lists; nothing about the game lives in the graphics.` },
        {
          code: {
            file: 'kart.py', from: 4, to: 17, caption: 'the two tracks', notes: [
              ['ACTIONS = ["Left", "Coast", "Right", "Accelerate", "Brake"]', ['The five actions, numbered 0 to 4 by their position in the list.']],
              ['SIZE = 0.65', ['How close two things must come to touch, in sectors along the road and in lanes across it (lesson 1.4).']],
              ['SUNLIT = {', ['A track is a dictionary.']],
              ['"barriers": [(15, 1), (26, 0), (38, 2)', ['Eleven barriers, each `(sector, lane)`: one at sector 15 in the middle lane, one at 26 in lane 0, …']],
              ['"sweepers": [(32, 0), (90, 13)],', ['Two sweepers, each `(sector, offset)`: they stay at their sector but slide across the lanes.']],
              ['HARBOUR = {', ['A second track with different barriers and sweepers. No driver ever practises on it: Part 4 uses it to test whether a driver learned to **drive** or only learned **this track**.']],
            ],
          },
        },
        { md: `A sweeper slides from lane 0 to lane 2 and back, again and again: every 48 decisions (**ticks**) it repeats. Its position is a **triangle wave**. Take the time within the cycle, the **phase**, with the remainder operator: $\\phi = (t + \\text{offset}) \\bmod 48$. For the first half of the cycle the sweeper moves out, $\\phi / 12$, reaching lane 2 at $\\phi = 24$; in the second half it comes back, $(48 - \\phi) / 12$.

$$\\text{lane}(t) = \\begin{cases} \\phi / 12 & \\phi \\le 24 \\\\ (48 - \\phi)/12 & \\phi > 24 \\end{cases}$$

It moves a twelfth of a lane per tick, so between ticks it is **between lanes**: lane 0.5 means half in lane 0 and half in lane 1.` },
        {
          code: {
            file: 'kart.py', fn: 'sweeper_lane', notes: [
              ['def sweeper_lane(tick, offset):', ['Where a sweeper is at time `tick`.']],
              ['phase = (tick + offset) % 48', ['`%` is the **remainder** after dividing: 50 % 48 is 2. It wraps time round the 48-tick cycle.'], { tex: '\\phi = (t + o) \\bmod 48', calc: q => [`(${q.tick} + ${q.offset}) % 48`, (q.tick + q.offset) % 48] }],
              ['if phase <= 24:', ['First half of the cycle…'], { logic: 'the sweeper is on its way out, from lane 0 to lane 2' }],
              ['return phase / 12', ['…moving out: 0 at phase 0, 2 at phase 24.']],
              ['return (48 - phase) / 12', ['Second half: coming back, 2 at phase 24, 0 at phase 48.']],
            ],
          },
        },
        {
          code: {
            file: 'kart.py', fn: 'sweepers', notes: [
              ['def sweepers(tick, track):', ['Every sweeper of a track at one moment.']],
              ['found = []', ['A list to fill.']],
              ['for p, offset in track["sweepers"]:', ['Each `(sector, offset)` pair, **unpacked** into two names.']],
              ['found.append({"p": p, "lane": sweeper_lane(tick, offset), "next_p": p,', ['A moving obstacle: where it is now, and (`next_p`, `next_lane`) where it will be one tick later. Collision checks need both (lesson 1.4).']],
              ['return found', ['The list of sweepers.']],
            ],
          },
        },
        {
          code: {
            file: 'kart.py', fn: 'barriers', notes: [
              ['def barriers(track):', ['The barriers, in the same form as sweepers, so one collision check handles both.']],
              ['found = []', ['A list to fill.']],
              ['for p, lane in track["barriers"]:', ['Each barrier.']],
              ['found.append({"p": p, "lane": lane, "next_p": p, "next_lane": lane, "kind": "barrier"})', ['A barrier doesn\'t move: its next position is its position.']],
              ['return found', ['All of them.']],
            ],
          },
        },
        { figure: 'TrackMap', caption: 'Both tracks unrolled into a strip. Move time and watch the sweepers slide; this is the same data the 3D arena draws.' },
        {
          predict: {
            prompt: 'Sunlit\'s second sweeper has offset 13. Which lane is it in at tick 20? (It can be between lanes.)',
            answer: sweeperLane(20, 13), tolerance: 1e-9, compute: () => sweeperLane(20, 13),
            explain: 'Phase $= (20 + 13) \\bmod 48 = 33$, past 24, so it is coming back: $(48 - 33) / 12 = 1.25$, a quarter of the way from lane 1 to lane 2.',
            misconceptions: [{ answer: 33 / 12, tolerance: 1e-9, feedback: 'Phase 33 is in the second half of the cycle: use $(48 - \\phi)/12$.' }],
          },
        },
        { note: 'A track is data: a length, barriers `(sector, lane)` and sweepers `(sector, offset)`. A sweeper\'s lane is a triangle wave of the time, $\\phi / 12$ out and $(48 - \\phi)/12$ back, with $\\phi = (t + o) \\bmod 48$.' },
      ],
    },

    {
      id: 'kart-actions', number: '1.3', title: 'Five actions and where they lead',
      goal: 'Compute where an action takes the kart, including the limits on lanes and speed.',
      builds: ['kart-track-data'],
      blocks: [
        { md: `The driver has five actions: **Left**, **Coast**, **Right**, **Accelerate** and **Brake**. The game follows the road by itself; the driver only chooses lanes and speed. Lanes are 0, 1 and 2; speed is a tier, 0, 1 or 2, and a kart at tier $v$ covers $v + 1$ sectors per tick. So even a braked kart creeps forward one sector a tick: there is no standing still.

\`intent\` works out where the kart is **trying** to go. Whether it gets there is \`step\`'s business: something may be in the way.` },
        {
          code: {
            file: 'kart.py', fn: 'clamp', notes: [
              ['def clamp(x, low, high):', ['Keep a number inside a range.']],
              ['return max(low, min(high, x))', ['`min(high, x)` cuts it off at the top, `max(low, …)` at the bottom: `clamp(3, 0, 2)` is 2, `clamp(-1, 0, 2)` is 0.'], { calc: q => [`max(${q.low}, min(${q.high}, ${q.x}))`, Math.max(q.low, Math.min(q.high, q.x))] }],
            ],
          },
        },
        {
          code: {
            file: 'kart.py', fn: 'intent', notes: [
              ['def intent(state, action):', ['Where the kart would like to go.']],
              ['lane = state["lane"]', ['Start from the current lane…']],
              ['if action == 0:', ['Left:']],
              ['lane = lane - 1', ['one lane down.']],
              ['if action == 2:', ['Right:']],
              ['lane = lane + 1', ['one lane up.']],
              ['speed = state["speed"]', ['Start from the current speed tier…']],
              ['if action == 3:', ['Accelerate:']],
              ['speed = speed + 1', ['one tier up.']],
              ['if action == 4:', ['Brake:']],
              ['speed = speed - 1', ['one tier down.']],
              ['lane = clamp(lane, 0, 2)', ['Left from lane 0 stays in lane 0: there is no lane −1.']],
              ['speed = clamp(speed, 0, 2)', ['Speed stays within tiers 0 to 2.']],
              ['return {"p": state["p"], "lane": state["lane"], "next_p": state["p"] + speed + 1,', ['The planned move: from `(p, lane)` now to `(next_p, next_lane)`, covering `speed + 1` sectors at the **new** speed. Changing lane happens during the same tick.'], { tex: 'p\' = p + v\' + 1' }],
            ],
          },
        },
        { figure: 'IntentFig', caption: 'Pick a state and an action: the planned move, drawn on the road.' },
        {
          predict: {
            prompt: 'A kart at sector 40, lane 2, speed tier 2 chooses **Right**. What is `next_p`?',
            answer: intent(at(40, 2, 2), 2).nextP, compute: () => intent(at(40, 2, 2), 2).nextP,
            explain: 'Right from lane 2 is clamped back to lane 2; speed stays at tier 2, covering 3 sectors: $40 + 2 + 1 = 43$.',
            misconceptions: [{ answer: 42, feedback: 'Tier 2 covers **3** sectors: speed + 1.' }],
          },
        },
        { note: '`intent` applies the action and the limits: lanes 0–2, speed tiers 0–2, and `speed + 1` sectors per tick. It returns the move as a pair of positions, now and next, ready for the collision check.' },
      ],
    },

    {
      id: 'kart-collisions', number: '1.4', title: 'Swept collisions: do two moving boxes touch?',
      goal: 'Decide whether two objects moving in straight lines touch during one tick, by intersecting two time intervals.',
      builds: ['kart-actions'],
      blocks: [
        { md: `A kart moving 3 sectors in one tick could jump straight over a barrier if we only checked where it ends up. So the game checks the whole **sweep** of each tick.

Think of every object as a box, $2 \\times 0.65$ wide in both directions (\`SIZE\`). Two boxes touch when they are close **along the road** and close **across the road** at the same moment. During one tick, time runs from $\\tau = 0$ to $\\tau = 1$ and everything moves in a straight line. Take the gap between them in one direction, $d$, and how fast it changes, $u$ (the difference of their movements). At time $\\tau$ the gap is $d + u\\tau$, and they overlap in that direction while

$$-0.65 < d + u\\tau < 0.65 \\quad\\Longleftrightarrow\\quad \\tau \\text{ between } \\frac{-0.65 - d}{u} \\text{ and } \\frac{0.65 - d}{u}$$

That is an **interval** of time. Do it for both directions and intersect the two intervals with $[0, 1]$. If anything is left, they touch: the latest entry must come before the earliest exit. If $u = 0$ the gap doesn't change: it is either always small enough (no limit from this direction) or never (no contact).

One more detail: the track is a **loop**, so sector 143 is right behind sector 0. The gap along the road is wrapped into $[-72, 72)$ with \`%\`, so a kart at 143 and one at 1 are 2 apart, not 142.` },
        {
          code: {
            file: 'kart.py', fn: 'contact', notes: [
              ['def contact(a, b, length):', ['`a` and `b` each have `p`, `lane` (now) and `next_p`, `next_lane` (one tick later).']],
              ['gap = (b["p"] - a["p"] + length / 2) % length - length / 2', ['The gap along the road, wrapped round the loop into $[-72, 72)$: shift by half a lap, wrap with `%`, shift back.'], { tex: 'd = ((p_b - p_a + L/2) \\bmod L) - L/2', calc: q => [`((${q.b.p} − ${q.a.p} + ${q.length / 2}) mod ${q.length}) − ${q.length / 2}`, (((q.b.p - q.a.p + q.length / 2) % q.length) + q.length) % q.length - q.length / 2] }],
              ['enter = 0.0', ['The intersection of the intervals so far: the whole tick, $[0, 1]$.']],
              ['leave = 1.0', ['Entering at 0 and leaving at 1: before any direction is checked, every moment is possible.']],
              ['for distance, velocity in ((gap, (b["next_p"] - b["p"]) - (a["next_p"] - a["p"])),', ['Two directions: along the road, and (next line) across it. In each, the gap $d$ and how fast it changes, $u$ = b\'s movement minus a\'s.']],
              ['if abs(velocity) < 1e-9:', ['The gap doesn\'t change in this direction…'], { logic: 'the gap stays the same all tick' }],
              ['if abs(distance) >= SIZE:', ['…and it is too big: they never meet.']],
              ['return False', ['No contact.']],
              ['t1 = (-SIZE - distance) / velocity', ['When the gap reaches −0.65…'], { calc: q => [`(−0.65 − ${f(q.distance)}) / ${f(q.velocity)}`, (-0.65 - q.distance) / q.velocity] }],
              ['t2 = (SIZE - distance) / velocity', ['…and +0.65. Between these two times they overlap in this direction.'], { calc: q => [`(0.65 − ${f(q.distance)}) / ${f(q.velocity)}`, (0.65 - q.distance) / q.velocity] }],
              ['enter = max(enter, min(t1, t2))', ['The overlap starts at the earlier of the two; the intersection starts at the **latest** start so far.'], { tex: '\\tau_{in} = \\max(\\tau_{in}, \\min(t_1, t_2))', calc: q => [`max(${f(q.enter)}, min(${f(q.t1)}, ${f(q.t2)}))`, Math.max(q.enter, Math.min(q.t1, q.t2))] }],
              ['leave = min(leave, max(t1, t2))', ['…and ends at the **earliest** end.'], { tex: '\\tau_{out} = \\min(\\tau_{out}, \\max(t_1, t_2))', calc: q => [`min(${f(q.leave)}, max(${f(q.t1)}, ${f(q.t2)}))`, Math.min(q.leave, Math.max(q.t1, q.t2))] }],
              ['if enter >= leave:', ['The intervals don\'t overlap…'], { logic: 'nothing is left of the intersection' }],
              ['return False', ['…so no contact.']],
              ['return enter < leave', ['Both directions overlap at some common moment: contact.']],
            ],
          },
        },
        { figure: 'ContactFig', caption: 'Two boxes during one tick. The bands show when each direction overlaps; contact needs a moment inside both.' },
        {
          predict: {
            prompt: 'A kart at sector 12, lane 1, speed tier 1 **accelerates**: it plans to reach sector 15 in the same lane. The barrier at sector 15, lane 1 is still. At what fraction of the tick do they first touch? (3 decimals)',
            answer: enterTime, tolerance: 0.0006, compute: () => { const a = intent(at(12, 1, 1), 3), b = { p: 15, lane: 1, nextP: 15, nextLane: 1 }, d = b.p - a.p, u = (b.nextP - b.p) - (a.nextP - a.p); return contact(a, b, 144) ? Math.max(0, Math.min((-0.65 - d) / u, (0.65 - d) / u)) : NaN },
            explain: `Along the road $d = 3$, $u = 0 - 3 = -3$: $t_1 = (-0.65 - 3)/-3 = 1.217$, $t_2 = (0.65 - 3)/-3 = 0.783$. Across, $d = 0$ and $u = 0$, always overlapping. So contact starts at $\\tau = 0.783$, before the tick ends: ${barrierHit ? 'a hit' : 'no hit'}.`,
            misconceptions: [{ answer: 1.217, tolerance: 0.001, feedback: 'That is when the overlap would end. Contact begins at the smaller of the two times.' }],
          },
        },
        {
          choice: {
            prompt: 'Why not just check whether the kart **ends** the tick on top of something?',
            options: [
              { text: 'A fast kart moves 3 sectors a tick and could jump clean over a barrier or another kart', why: 'Yes. Checking only end positions lets fast objects pass through each other ("tunnelling"). Sweeping the whole tick can\'t miss.' },
              { text: 'It would be slower to compute', why: 'It would be faster, but wrong.' },
            ],
            answer: 0,
          },
        },
        { note: 'Swept contact: for each direction, the gap $d + u\\tau$ is small for $\\tau$ in one interval; contact iff the intervals for both directions and $[0, 1]$ share a moment. The loop is handled by wrapping the gap with `%`.' },
      ],
    },

    {
      id: 'kart-03-rewards', number: '1.5', title: 'Tell it what success means',
      goal: 'Compute a transition\'s reward from its parts, and the discounted return of a lap.',
      builds: ['kart-collisions'],
      blocks: [
        { md: `\`step\` is the whole game in one function. It checks the planned move against every barrier, sweeper and kart; if anything touches, the kart **stops where it was**, in its old lane, at speed 0, and pays a collision penalty. Then it scores the move:

$$r = \\underbrace{0.15 \\times \\text{sectors advanced}}_{\\text{progress}} \\;\\underbrace{-\\; 0.2}_{\\text{time}} \\;\\underbrace{-\\; 6 \\times [\\text{hit}]}_{\\text{collision}} \\;+\\; \\underbrace{10 \\times [\\text{finished}]}_{\\text{finish}}$$

Each part is a design decision. Progress pays for moving forward; the time cost makes dawdling expensive (a full lap at top speed earns more than a slow one); the penalty makes collisions costly; the bonus marks the goal. Lesson 3.8 changes the penalty and measures what happens.` },
        {
          code: {
            file: 'kart.py', fn: 'step', notes: [
              ['def step(state, action, track=SUNLIT, traffic=(), penalty=6, laps=1, kart_contact=False):', ['`traffic` is the other karts; `laps` is 1 for practice, 3 for a race; `kart_contact` lets the race force a bump (Part 5).']],
              ['if state["done"]:', ['A finished episode doesn\'t move.']],
              ['return state', ['Unchanged.']],
              ['length = track["length"]', ['144.']],
              ['planned = intent(state, action)', ['Where the kart is trying to go.']],
              ['obstacle = None', ['Nothing hit yet.']],
              ['for o in barriers(track) + sweepers(state["ticks"], track):', ['Every barrier and sweeper (`+` joins the two lists).']],
              ['if obstacle is None and contact(planned, o, length):', ['The first one the move touches…']],
              ['obstacle = o', ['…is remembered.']],
              ['hit_kart = kart_contact or any(contact(planned, car, length) for car in traffic)', ['`any(…)` is True if at least one kart is touched.']],
              ['hit = obstacle is not None or hit_kart', ['Hit anything at all?']],
              ['p = min(state["p"] if hit else planned["next_p"], length * laps)', ['A hit stops the kart where it was; otherwise it moves. The finish line caps it.']],
              ['lane = state["lane"] if hit else planned["next_lane"]', ['A hit also undoes the lane change.']],
              ['speed = 0 if hit else planned["speed"]', ['…and the speed.']],
              ['crashes = state["crashes"] + (1 if hit else 0)', ['Count it.']],
              ['ticks = state["ticks"] + 1', ['One more decision.']],
              ['finished = p >= length * laps', ['Crossed the line.']],
              ['done = finished or ticks >= 210 * laps or crashes >= 8 * laps', ['The episode ends on finishing, after 210 decisions per lap, or after 8 collisions per lap.'], { logic: 'finished, out of time, or too many collisions' }],
              ['parts = {"progress": (p - state["p"]) * 0.15, "time": -0.2,', ['The reward\'s parts, kept separate so the arena can explain them.'], { tex: 'r = 0.15\\,\\Delta p - 0.2 - 6[\\text{hit}] + 10[\\text{finished}]' }],
              ['reward = sum(parts.values())', ['Their sum is the reward.']],
              ['what = "kart" if hit_kart else (obstacle["kind"] if obstacle is not None else None)', ['What was hit, for the arena\'s messages.']],
              ['return {"p": p, "lane": lane, "speed": speed, "ticks": ticks, "crashes": crashes,', ['The new state, with the reward added to the running total and the last move\'s details in `last`.']],
            ],
          },
        },
        { figure: 'RewardFig', caption: 'The real `step`, from sector 12 in the middle lane: a barrier waits at 15. Try each action.' },
        { md: `The agent should maximise not one reward but the **return**: all the rewards from now on. Future rewards are **discounted** by $\\gamma$ (gamma, 0.95 here) for each step of delay:

$$G_t = r_{t+1} + \\gamma\\, r_{t+2} + \\gamma^2 r_{t+3} + \\dots = \\sum_{k=0}^{\\infty} \\gamma^k\\, r_{t+k+1}$$

Discounting makes near rewards count more than far ones. With $\\gamma = 0.95$ a reward 20 steps away counts $0.95^{20} \\approx 0.36$ as much, so the driver mostly plans about $1/(1-\\gamma) = 20$ decisions ahead. A whole lap takes 50 to 100 decisions, so the finish bonus is far over the horizon at the start, and progress rewards are what guide the driver.` },
        {
          predict: {
            prompt: 'A clear move advances 2 sectors and doesn\'t finish the lap. What is its reward?',
            answer: step(at(30, 0, 1), 1).last.reward, tolerance: 1e-9, compute: () => step(at(30, 0, 1), 1).last.reward,
            explain: '$0.15 \\times 2 - 0.2 = 0.1$. No collision, no finish.',
            misconceptions: [{ answer: 0.3, tolerance: 1e-9, feedback: 'Every move also pays the time cost: −0.2.' }],
          },
        },
        {
          predict: {
            prompt: 'From sector 12, lane 1, speed tier 1, **Accelerate** hits the barrier at 15 (lesson 1.4). What is the reward?',
            answer: step(at(12, 1, 1), 3).last.reward, tolerance: 1e-9, compute: () => step(at(12, 1, 1), 3).last.reward,
            explain: 'The kart stays at 12, so no progress: $0 - 0.2 - 6 = -6.2$.',
            misconceptions: [{ answer: -6, feedback: 'The time cost still applies: −0.2 as well.' }, { answer: 0.25, tolerance: 1e-9, feedback: 'That would be three clear sectors. The barrier stops the move.' }],
          },
        },
        {
          predict: {
            prompt: 'The finish bonus of 10 is 40 decisions away. With $\\gamma = 0.95$, how much is it worth now? (2 decimals)',
            answer: 10 * 0.95 ** 40, tolerance: 0.006, compute: () => 10 * 0.95 ** 40,
            explain: '$10 \\times 0.95^{40} = 10 \\times 0.1285 = 1.29$. Far rewards fade: that is what the discount is for.',
          },
        },
        { note: '`step` is the whole game: plan, sweep for contact, stop on a hit, score. Reward = progress − time − collisions + finish. The driver maximises the **discounted return** $\\sum_k \\gamma^k r_{t+k+1}$, which with $\\gamma = 0.95$ looks about 20 decisions ahead.' },
      ],
    },

    {
      id: 'kart-rules', number: '1.6', title: 'Drivers written by hand',
      goal: 'Write and measure rule-based drivers, and say what a learned driver would need to beat them.',
      builds: ['kart-03-rewards'],
      blocks: [
        { md: `Before any learning, try writing a driver by hand. It sets the bar: a learned driver that can't beat a few lines of rules isn't worth much.

Practice laps have **scripted traffic**: three practice karts, one per lane, each moving one sector a tick from a starting place that depends on the lap's seed. They are predictable on purpose, so that practice is repeatable.` },
        {
          code: {
            file: 'kart.py', fn: 'scripted_traffic', notes: [
              ['def scripted_traffic(tick, seed, track=SUNLIT):', ['Where the three practice karts are at time `tick`.']],
              ['cars = []', ['One per lane.']],
              ['for lane in range(3):', ['Lanes 0, 1, 2.']],
              ['p = (seed * (lane + 3) + lane * 43 + tick) % track["length"]', ['A starting place spread out by the seed, plus one sector per tick, wrapped round the loop.'], { calc: q => [`(${q.seed} × ${q.lane + 3} + ${q.lane * 43} + ${q.tick}) % 144`, (q.seed * (q.lane + 3) + q.lane * 43 + q.tick) % 144] }],
              ['cars.append({"p": p, "lane": lane, "next_p": p + 1, "next_lane": lane})', ['A kart moving forward one sector in its lane.']],
              ['return cars', ['The three practice karts.']],
            ],
          },
        },
        { md: 'Three drivers. **Random** picks any action. **Flat out** always accelerates. **Careful** looks ahead in every lane (with the sensors of lesson 4.2: for each lane, 0 clear, 1 a hazard within 6 sectors, 2 one within 3) and moves away from danger.' },
        {
          code: {
            file: 'drivers.py', fn: 'careful', notes: [
              ['def careful(state, cars, track):', ['A policy: state in, action out.']],
              ['near = sensors(state, cars, track)', ['How dangerous each lane is ahead: 0, 1 or 2.']],
              ['lane = state["lane"]', ['Where we are.']],
              ['if near[lane] == 0:', ['Nothing ahead in this lane…'], { logic: 'this lane is clear' }],
              ['return 3', ['…so speed up.']],
              ['best = lane', ['Otherwise find the safest lane we can reach.']],
              ['for side in (lane - 1, lane + 1):', ['The lanes either side.']],
              ['if 0 <= side <= 2 and near[side] < near[best]:', ['A real lane, and safer.'], { logic: 'that lane exists and is less dangerous than the best so far' }],
              ['best = side', ['Remember it.']],
              ['if best < lane:', ['Safer on the left:']],
              ['return 0', ['steer left.']],
              ['if best > lane:', ['On the right:']],
              ['return 2', ['steer right.']],
              ['return 4 if state["speed"] > 0 else 1', ['Nowhere safer: slow down.']],
            ],
          },
        },
        {
          code: {
            file: 'drivers.py', fn: 'random_driver', notes: [
              ['def random_driver(seed=0):', ['Makes a policy with its own generator.']],
              ['rng = random.Random(seed)', ['Seeded, so the same random lap can be replayed.']],
              ['return lambda state, cars, track: rng.randrange(5)', ['A `lambda` is a small function written in place. This one ignores everything and returns 0 to 4.']],
            ],
          },
        },
        {
          code: {
            file: 'drivers.py', fn: 'flat_out', notes: [
              ['def flat_out(state, cars, track):', ['The simplest policy.']],
              ['return 3', ['Always Accelerate.']],
            ],
          },
        },
        {
          code: {
            file: 'drivers.py', fn: 'measure', notes: [
              ['def measure(driver, laps=30, track=SUNLIT, seed=800001):', ['Many laps, each with its own seed.']],
              ['finished = 0', ['Laps finished so far.']],
              ['hits = 0', ['Collisions so far.']],
              ['for i in range(laps):', ['Lap `i`…']],
              ['state = drive(driver, seed + i * 97, track)', ['…with seed 800001, 800098, 800195, …: seeds no practice lap ever uses (practice seeds are below 100,000).']],
              ['finished += 1 if state["finished"] else 0', ['Count finishes…']],
              ['hits += state["crashes"]', ['…and collisions.']],
              ['return finished / laps, hits / laps', ['The finish rate and the average collisions per lap.']],
            ],
          },
        },
        {
          code: {
            file: 'drivers.py', fn: 'try_careful', notes: [
              ['def try_careful(laps=30):', ['A function with nothing required, so the Python tab can call it.']],
              ['return measure(careful, laps)', ['Functions are values in Python: `careful` is passed in like any other argument, and `drive` calls it once per decision.']],
            ],
          },
        },
        { python: { program: 'rules', label: 'Measure the careful driver in real Python' } },
        { md: `Measured over 50 held-out laps:

| Driver | Sunlit: finished | hits per lap | Harbour: finished |
|---|---|---|---|
| Random | ${pct(M.rules.random.sunlit[0])} | ${M.rules.random.sunlit[1]} | ${pct(M.rules.random.harbour[0])} |
| Flat out | ${pct(M.rules.flat.sunlit[0])} | ${M.rules.flat.sunlit[1]} | ${pct(M.rules.flat.harbour[0])} |
| Careful | ${pct(M.rules.careful.sunlit[0])} | ${M.rules.careful.sunlit[1]} | ${pct(M.rules.careful.harbour[0])} |

Flat out rear-ends the practice traffic and is out after 8 collisions. Careful finishes most laps on both tracks, but its rule is crude: it brakes when boxed in and doesn't think about timing. A learned driver will have to beat **${pct(M.rules.careful.sunlit[0])}**.` },
        {
          predict: {
            prompt: `The careful driver's lap with seed 800001 on Sunlit: how many decisions does it take?`,
            answer: carefulLap.ticks, compute: () => drive(careful, 800001).ticks,
            explain: `${carefulLap.ticks} decisions with ${carefulLap.crashes} collisions, total reward ${f(carefulLap.total)}. A lap at top speed all the way would take 48.`,
          },
        },
        { note: `Hand-written rules set the bar: careful finishes ${pct(M.rules.careful.sunlit[0])} of laps. Rules are quick to write and easy to read, but every situation has to be foreseen by the person writing them. Learning finds its own rules from reward.` },
      ],
    },
  ],
}

