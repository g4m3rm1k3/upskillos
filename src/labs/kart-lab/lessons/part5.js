// Part 5: racing. Three frozen drivers on one track at once, simultaneous moves and two-way bumps,
// distribution shift from scripted to learned opponents, a fair tournament, and your own experiment.
import { tournament, ORDERS } from '../engine/race.js'
import { policyOf, unpack } from '../engine/tabular.js'
import baselines from '../baselines.json'
import M from '../engine/measured.json'

const named = id => baselines.find(d => d.id === id)
const policy = id => policyOf(unpack(named(id).checkpoint))
const cup = ids => { const t = tournament(ids.map(policy)); return { ids, ...t } }
const CUPS = [cup(['mint', 'coral', 'violet']), cup(['mint', 'sky', 'ember'])]
const pct = x => `${Math.round(100 * x)}%`
const cupTable = c => c.ids.map((id, k) => `| ${named(id).name} | ${pct(named(id).evaluation.sunlit[0])} | ${c.finishes[k]} of 6 | ${c.points[k]} |`).join('\n')

export const PART5 = {
  id: 'part5', title: 'Part 5 · Racing', lessons: [
    {
      id: 'kart-07-race', number: '5.1', title: 'Three learners on one track',
      goal: 'Step a race in which everyone decides from the same moment, resolve bumps fairly, and explain why practice results don\'t predict race results.',
      builds: ['kart-generalisation', 'kart-collisions'],
      blocks: [
        { md: `A race puts three frozen drivers on Sunlit Circuit for three laps. Each tick, all three **decide from the same snapshot** (no seat gets to see another's move first), then all three **move at once**. If two karts' paths touch during the tick (lesson 1.4's swept contact, now between two moving karts), **both** are stopped and both pay the penalty. Stopping one kart can put it in a third kart's way, so the check repeats until no new bump appears.

To a driver, the other karts are just traffic: where they are now. It can't see what they are about to do.` },
        {
          code: {
            file: 'race.py', fn: 'step_race', notes: [
              ['def step_race(race, policies, track=SUNLIT, laps=3):', ['One tick for all three karts. `policies[i]` drives kart `i`.']],
              ['cars = race["cars"]', ['The karts before this tick.']],
              ['if all(car["done"] for car in cars):', ['Everyone finished or out…']],
              ['return race', ['…nothing to do.']],
              ['actions = []', ['Everyone\'s decision, from the **same** snapshot.']],
              ['for i, car in enumerate(cars):', ['Each kart in turn, but all looking at the cars as they were.']],
              ['others = [as_traffic(c) for j, c in enumerate(cars) if j != i and not c["done"]]', ['The other karts still racing, as traffic.']],
              ['actions.append(policies[i](car, others, track))', ['This kart\'s action.']],
              ['moved = [step(car, actions[i], track, (), 6, laps) for i, car in enumerate(cars)]', ['Everyone moves as if alone: barriers and sweepers count, karts don\'t yet.']],
              ['bumped = set()', ['Karts already stopped by a bump.']],
              ['for _ in range(len(cars)):', ['At most three passes: each pass can only add new bumped karts.']],
              ['added = set()', ['Karts found touching in this pass.']],
              ['for i in range(len(cars)):', ['Every pair…']],
              ['for j in range(i + 1, len(cars)):', ['…once (j after i).']],
              ['if cars[i]["done"] or cars[j]["done"]:', ['Finished karts are parked off the road…']],
              ['if contact(path(cars[i], moved[i]), path(cars[j], moved[j]), track["length"]):', ['Did their moves this tick touch?']],
              ['added.add(i)', ['Both are involved.']],
              ['added.add(j)', ['Both karts are involved.']],
              ['changed = False', ['Nothing changed yet in this pass.']],
              ['for i in sorted(added):', ['Each involved kart…']],
              ['if i not in bumped:', ['…not already handled…']],
              ['bumped.add(i)', ['Mark it handled…']],
              ['changed = True', ['…and note that this pass changed something.']],
              ['moved[i] = step(cars[i], actions[i], track, (), 6, laps, kart_contact=True)', ['…is re-stepped with a forced bump: it stays where it was and pays the penalty. Both karts in a bump are treated the same: no seat has priority.']],
              ['if not changed:', ['No new bumps: settled.']],
              ['return {"cars": moved, "tick": race["tick"] + 1}', ['The new race state.']],
            ],
          },
        },
        {
          code: {
            file: 'race.py', fn: 'create_race', notes: [
              ['def create_race():', ['The starting grid.']],
              ['return {"cars": [reset(1, lane) for lane in range(3)], "tick": 0}', ['One kart per lane, all at sector 0.']],
            ],
          },
        },
        {
          code: {
            file: 'race.py', fn: 'as_traffic', notes: [
              ['def as_traffic(car):', ['What a driver knows about another kart.']],
              ['return {"p": car["p"], "lane": car["lane"], "next_p": car["p"], "next_lane": car["lane"]}', ['Where it is, and nothing about where it will go: its "next" position is its current one.']],
            ],
          },
        },
        {
          code: {
            file: 'race.py', fn: 'path', notes: [
              ['def path(before, after):', ['A kart\'s actual move this tick.']],
              ['return {"p": before["p"], "lane": before["lane"], "next_p": after["p"], "next_lane": after["lane"]}', ['From where it was to where it ended up: exactly what `contact` needs.']],
            ],
          },
        },
        { md: `Now the surprise. Every supplied driver was trained against **scripted** traffic (lesson 1.6): three practice karts moving steadily at one sector per tick in fixed lanes. Race opponents are **learned** drivers: they accelerate, brake and change lanes. Practice never showed anything like them.

| Driver | Test laps finished (scripted traffic) | Races finished | Points |
|---|---|---|---|
${cupTable(CUPS[0])}

Drivers that finish ${pct(named('mint').evaluation.sunlit[0])} to ${pct(named('violet').evaluation.sunlit[0])} of test laps fail to finish some races: 24 bumps (8 per lap) ends a race. When the situations at test time differ from the situations in training, results don't carry over. This is **distribution shift**, the most common reason a model that tested well fails in use.` },
        { figure: 'RaceReplay', caption: 'A race between the supplied drivers, tick by tick: decisions, bumps and positions. The 🏁 Race & watch tab shows the same races in 3D.' },
        {
          choice: {
            prompt: 'Why do all three karts decide from the same snapshot, instead of one after another?',
            options: [
              { text: 'So that no seat gets an advantage by seeing another kart\'s move first', why: 'Yes. Deciding in turn would let the last driver react to the others\' moves. A snapshot makes the race fair and the result independent of seat order.' },
              { text: 'Because it is faster to compute', why: 'It\'s about fairness: the order of computation must not change the outcome.' },
            ],
            answer: 0,
          },
        },
        { note: 'In a race, everyone decides from one snapshot and moves at once; touching paths stop both karts, repeated until settled. Drivers trained against scripted traffic meet **learned** opponents: **distribution shift**, measured as lost races.' },
      ],
    },

    {
      id: 'kart-tournament', number: '5.2', title: 'A fair tournament',
      goal: 'Rank a race, run every starting order, and award points so that the result depends on the drivers, not on luck or lanes.',
      builds: ['kart-07-race'],
      blocks: [
        { md: `Races are **deterministic**: the same three frozen drivers in the same lanes always produce exactly the same race. So running one race twice proves nothing new. But the **starting lane** matters a lot (lane 1 starts with the barrier at sector 15 in its path). A fair comparison runs every way of placing three drivers in three lanes: $3! = 6$ races. Each race awards 3, 2 and 1 points to finishers by time; exact ties share the points of the places they occupy; a driver who doesn't finish scores 0.` },
        {
          code: {
            file: 'race.py', fn: 'rank_race', notes: [
              ['def rank_race(race):', ['Who came where.']],
              ['order = list(range(len(race["cars"])))', ['Seats 0, 1, 2.']],
              ['return sorted(order, key=lambda i: (0, race["cars"][i]["ticks"]) if race["cars"][i]["finished"] else (1, -race["cars"][i]["p"]))', ['Sort by a **key tuple**: Python compares tuples item by item. Finishers get `(0, time)`, so they come first, fastest first; the rest get `(1, −distance)`, furthest first.']],
            ],
          },
        },
        {
          code: {
            file: 'race.py', fn: 'run_race', notes: [
              ['def run_race(policies, track=SUNLIT):', ['A whole race.']],
              ['race = create_race()', ['The grid.']],
              ['while not all(car["done"] for car in race["cars"]):', ['Until everyone is finished or out.']],
              ['race = step_race(race, policies, track)', ['One tick.']],
              ['return race', ['The final state.']],
            ],
          },
        },
        {
          code: {
            file: 'race.py', fn: 'tournament', notes: [
              ['def tournament(policies, track=SUNLIT):', ['Three drivers, six races.']],
              ['points = [0.0, 0.0, 0.0]', ['Per driver.']],
              ['finishes = [0, 0, 0]', ['Finishes per driver.']],
              ['for order in ORDERS:', ['Every arrangement: `ORDERS` lists all six, `(0, 1, 2)` to `(2, 1, 0)`.']],
              ['race = run_race([policies[k] for k in order], track)', ['Driver `order[0]` in lane 0, and so on.']],
              ['cars = race["cars"]', ['The karts at the end of the race.']],
              ['for seat, car in enumerate(cars):', ['Each lane\'s kart…']],
              ['if not car["finished"]:', ['…didn\'t finish: no points.']],
              ['driver = order[seat]', ['Which driver was in that lane.']],
              ['finishes[driver] += 1', ['Count the finish.']],
              ['better = len([c for c in cars if c["finished"] and c["ticks"] < car["ticks"]])', ['How many finished faster.']],
              ['tied = len([c for c in cars if c["finished"] and c["ticks"] == car["ticks"]])', ['How many finished in exactly the same time (counting itself).']],
              ['points[driver] += sum(3 - better - k for k in range(tied)) / tied', ['Share the points of the places the tied karts occupy: two tied for first share 3 + 2, getting 2.5 each.'], { tex: '\\frac{1}{t}\\sum_{k=0}^{t-1} (3 - b - k)' }],
              ['return points, finishes', ['Points and finishes per driver.']],
            ],
          },
        },
        {
          code: {
            file: 'race.py', fn: 'lane_draw', notes: [
              ['def lane_draw():', ['A control experiment: three **identical** drivers.']],
              ['return tournament([careful, careful, careful])', ['Over the six orders each driver starts twice in every lane, so identical drivers must tie: here 10 points each. That is the point of running all six: the lane draw cancels exactly. In any **single** race the lane decides a lot.']],
            ],
          },
        },
        { figure: 'TournamentFig', caption: 'Pick three drivers (supplied or your own) and run the six races.' },
        { python: { program: 'race', label: 'Run a tournament in real Python' } },
        { md: `Two tournaments of the supplied drivers:

| Driver | Test laps finished | Races finished | Points |
|---|---|---|---|
${cupTable(CUPS[1])}

Ember, the 75-weight linear driver, wins this one despite the lowest test-lap score. Sky (sensors) finishes fewer races than its test laps suggest. Six races are a small sample, and they all start from the same grid; read tournament points as a **description** of this matchup, not a verdict on the methods.` },
        {
          predict: {
            prompt: 'Two karts tie for first; the third finishes behind them. How many points does each tied kart get?',
            answer: 2.5, tolerance: 1e-9, compute: () => { const better = 0, tied = 2; let sum = 0; for (let k = 0; k < tied; k++) sum += 3 - better - k; return sum / tied },
            explain: 'They occupy first and second: $(3 + 2) / 2 = 2.5$ each. The third gets 1.',
          },
        },
        {
          predict: {
            prompt: 'How many races does a tournament of three drivers run?',
            answer: ORDERS.length, compute: () => ORDERS.length,
            explain: 'Every ordering of three drivers in three lanes: $3! = 6$.',
          },
        },
        { note: 'Deterministic races: vary the **conditions** (all 6 starting orders), not the repetitions. Shared points for ties, zero for not finishing. Even so, one tournament describes one matchup.' },
      ],
    },

    {
      id: 'kart-08-experiment', number: '5.3', title: 'Run your own driving experiment',
      goal: 'Design a controlled experiment, run it across seeds and tracks, and report it honestly; and know where to go next.',
      builds: ['kart-tournament'],
      blocks: [
        { md: `You have everything needed for real experiments: an environment, three learning methods, three observations, a held-out track, multi-seed testing and tournaments. **🧪 Train & compare** trains drivers in your browser with the same engine (and the same numbers) as the Python programs, tests them on both tracks, and saves them for **🏁 Race & watch**.

A challenge to start with: **train a driver that finishes more races than the supplied ones without losing test laps.** A plan:

1. **Hypothesis first.** For example: "SARSA with the sensor observation, trained 6,000 laps, will finish all 6 tournament races against Mint and Sky."
2. **One change at a time**, with everything else fixed.
3. **Several seeds** (lesson 3.9), and test on **both tracks** (lesson 4.1).
4. **Then race**, in a full six-race tournament.
5. **Report** all of it, including the runs that didn't work.` },
        { note: 'If you tune by looking at the same 50 test laps again and again, they stop being a fair test: you are fitting them. Keep a final check you only run once, such as a new tournament lineup or the other track.', kind: 'warn' },
        { md: `Where this lab stops, and where the field goes next:

- **Training against learned opponents** (self-play): put frozen copies of your own drivers in the practice traffic, so practice looks like racing. It attacks the distribution shift of lesson 5.1, and it is how game-playing systems from TD-Gammon to AlphaStar were trained.
- **Learned features**: a neural network reading the sensors (or the 3D view) and producing action values: DQN. The CartPole and QMaze labs build it from scratch.
- **Continuous control**: real steering angles and throttle, with policy-gradient methods (CartPole Lab's REINFORCE and A2C).
- **Partial observability**: give the driver memory of the last few observations (lesson 2.3).

For reference, the measured recipes: sector table ${pct(M.tables['q-sector'].sunlit)} / ${pct(M.tables['q-sector'].harbour)}, sensor table ${pct(M.tables['q-sensors'].sunlit)} / ${pct(M.tables['q-sensors'].harbour)}, linear ${pct(M.linear['0.01'].sunlit)} / ${pct(M.linear['0.01'].harbour)} (Sunlit / Harbour, five seeds).` },
        {
          choice: {
            prompt: 'Your new driver beats the supplied ones in one tournament. What can you conclude?',
            options: [
              { text: 'It won this matchup from these six starting orders; repeat with other opponents and other training seeds before claiming more', why: 'Yes. A deterministic tournament is one careful measurement of one matchup, not a statistical test of a method.' },
              { text: 'Its algorithm is generally better', why: 'One trained driver, one set of opponents, one track: that is not evidence about the algorithm.' },
            ],
            answer: 0,
          },
        },
        { note: 'Hypothesis, one change, several seeds, held-out tracks, full tournaments, honest reports. That is how you find out whether a learning idea works, here or anywhere.' },
      ],
    },
  ],
}
