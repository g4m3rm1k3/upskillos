// Part 2: what the driver knows. The sector observation packed into one number, the hazard mask
// as bits, and partial observability: one observation, several situations.
import { reset, step, observe, hazardMask, decodeKey, N_KEYS, SUNLIT } from '../engine/kart.js'

const me = { ...reset(1, 0), p: 50, speed: 1 }
const ahead = d => ({ p: 50 + d, lane: 0, nextP: 51 + d, nextLane: 0 })

export const PART2 = {
  id: 'part2', title: 'Part 2 · What the driver knows', lessons: [
    {
      id: 'kart-02-observations', number: '2.1', title: 'What does the driver actually know?',
      goal: 'Pack an observation of four parts into one table index, unpack it again, and count the indexes.',
      builds: ['kart-rules'],
      blocks: [
        { md: `The arena shows a 3D race. The driver sees none of it: no pixels. It receives a few numbers, the **observation**, and the first learning drivers use four:

| Part | Values | Meaning |
|---|---|---|
| sector | 0 – 143 | where on the lap the kart is |
| lane | 0 – 2 | which lane |
| speed | 0 – 2 | speed tier |
| mask | 0 – 7 | which lanes have a kart or sweeper close by (next lesson) |

A table needs **one** number per observation, to index a row. The trick is the same as writing a number in digits, except that each "digit" has its own base: the mask has 8 values, speed 3, lane 3. So

$$\\text{key} = ((\\text{sector} \\times 3 + \\text{lane}) \\times 3 + \\text{speed}) \\times 8 + \\text{mask}$$

Every combination gets a different key, from 0 to $144 \\times 3 \\times 3 \\times 8 - 1$. This is called **mixed-radix** encoding. Going back is division with remainders: $\\text{mask} = \\text{key} \\bmod 8$, $\\text{speed} = \\lfloor \\text{key} / 8 \\rfloor \\bmod 3$, and so on.` },
        {
          code: {
            file: 'observe.py', fn: 'observe', notes: [
              ['def observe(state, traffic, track=SUNLIT):', ['The observation as one number.']],
              ['sector = state["p"] % track["length"]', ['On laps after the first (in a race), sector 150 is sector 6 of the next lap.'], { calc: q => [`${q.state.p} % ${q.track.length}`, q.state.p % q.track.length] }],
              ['mask = hazard_mask(state, traffic, track)', ['Next lesson.']],
              ['return ((sector * 3 + state["lane"]) * 3 + state["speed"]) * 8 + mask', ['Mixed radix: each part times the sizes of the parts after it.'], { tex: 'k = ((s \\cdot 3 + \\ell) \\cdot 3 + v) \\cdot 8 + m' }],
            ],
          },
        },
        { figure: 'KeyFig', caption: 'Set the four parts and read the key; or type a key and decode it.' },
        {
          predict: {
            prompt: 'What is the key for sector 12, lane 1, speed tier 1 and mask 0?',
            answer: observe({ ...reset(1, 1), p: 12, speed: 1, ticks: 200 }, [], { ...SUNLIT, sweepers: [] }), compute: () => ((12 * 3 + 1) * 3 + 1) * 8 + 0,
            explain: '$((12 \\times 3 + 1) \\times 3 + 1) \\times 8 + 0 = (37 \\times 3 + 1) \\times 8 = 112 \\times 8 = 896$.',
            misconceptions: [{ answer: 12 + 1 + 1, feedback: 'Adding the parts would give many observations the same number. Each part is multiplied by the sizes of the parts after it.' }],
          },
        },
        {
          predict: {
            prompt: 'How many different keys are there?',
            answer: N_KEYS, compute: () => 144 * 3 * 3 * 8,
            explain: '$144 \\times 3 \\times 3 \\times 8 = 10{,}368$ observations, each with 5 action values: a table of 51,840 numbers.',
          },
        },
        {
          predict: {
            prompt: 'Decode key 3609: which **sector** is it?',
            answer: decodeKey(3609).sector, compute: () => Math.floor(3609 / 72),
            explain: 'Everything below the sector is $3 \\times 3 \\times 8 = 72$ values, so sector $= \\lfloor 3609 / 72 \\rfloor = 50$; the remainder 9 is lane 0, speed 1, mask 1.',
          },
        },
        { added: true, h: 'Key and action: the two indexes for everything' },
        { added: true, md: `From here on, two whole numbers describe every decision the driver makes:

- the **key**: what the driver sees, packed into one number (this lesson);
- the **action**: what it does, 0 to 4, the index into \`ACTIONS = ["Left", "Coast", "Right", "Accelerate", "Brake"]\` (lesson 1.3).

The lap in lesson 1.1, after two Accelerate moves, is at sector 5, lane 0, speed 2, with nothing near (mask 0): key $((5 \\times 3 + 0) \\times 3 + 2) \\times 8 + 0 = 376$, which is what \`observe\` returns there.

The table the driver learns (Part 3) is a dictionary from a key to a list of 5 numbers, one per action:

\`\`\`python
Q = {}
row(Q, 376)        # [0.0, 0.0, 0.0, 0.0, 0.0], made the first time key 376 is seen
Q[376][3]          # the value of Accelerate (action 3) when the key is 376
\`\`\`

So every value the driver learns is looked up as **\`Q[key][action]\`**: the key picks the row, the action picks the place in it. When a line of later code is confusing, ask first: *which key, which action?*` },
        { note: 'The driver gets numbers, not pixels: sector, lane, speed, hazard mask, packed into one **key** by mixed radix. 10,368 keys. Note that the sector is in it: this observation knows **where on this track** it is. Part 4 shows what that costs.' },
      ],
    },

    {
      id: 'kart-hazard-mask', number: '2.2', title: 'Hazards as bits',
      goal: 'Build the hazard mask with bitwise OR and shifts, and read which lanes it flags.',
      builds: ['kart-02-observations'],
      blocks: [
        { md: `Barriers never move, so knowing the sector is enough to learn where they are. Karts and sweepers move, so the driver needs to sense them. The **hazard mask** answers three yes-or-no questions, one per lane: is a kart or sweeper in this lane, alongside or up to 4 sectors ahead?

Three yes/no answers fit in three **bits** of one number: bit 0 for lane 0 (worth 1), bit 1 for lane 1 (worth 2), bit 2 for lane 2 (worth 4). Mask 5 is $101$ in binary: lanes 0 and 2 flagged. Setting bit $\\ell$ is \`mask = mask | (1 << lane)\`: \`1 << lane\` is $2^\\ell$, and \`|\` (bitwise OR) turns that bit on without touching the others.` },
        {
          code: {
            file: 'observe.py', fn: 'ahead', notes: [
              ['def ahead(p, other, length):', ['Distance ahead, round the loop.']],
              ['return (other - p) % length', ['Python\'s `%` never gives a negative here: something 1 sector **behind** is 143 ahead.'], { calc: q => [`(${q.other} − ${q.p}) % ${q.length}`, ((q.other - q.p) % q.length + q.length) % q.length] }],
            ],
          },
        },
        {
          code: {
            file: 'observe.py', fn: 'touches', notes: [
              ['def touches(thing, lane):', ['Is a moving thing in this lane, now or by the end of the tick?']],
              ['return abs(lane - thing["lane"]) <= SIZE or abs(lane - thing["next_lane"]) <= SIZE', ['Within 0.65 of the lane now, or next. A sweeper at lane 0.5 touches lanes 0 and 1.'], { logic: 'close to this lane now, or one tick from now' }],
            ],
          },
        },
        {
          code: {
            file: 'observe.py', fn: 'hazard_mask', notes: [
              ['def hazard_mask(state, traffic, track=SUNLIT):', ['Karts and sweepers only: barriers are learned through the sector.']],
              ['length = track["length"]', ['144.']],
              ['mask = 0', ['No bits set.']],
              ['for thing in list(traffic) + sweepers(state["ticks"], track):', ['Every kart and sweeper.']],
              ['d = ahead(state["p"], thing["p"], length)', ['How far ahead it is.']],
              ['if d <= 4 or d >= length - SIZE:', ['Up to 4 ahead, or alongside (just behind counts too).'], { logic: 'within 4 sectors ahead, or alongside' }],
              ['for lane in range(3):', ['Each lane it might be in…']],
              ['if touches(thing, lane):', ['If it is (or will be) in that lane…'], { logic: 'the hazard is close to this lane now or next tick' }],
              ['mask = mask | (1 << lane)', ['…gets its bit set.'], { tex: 'm \\leftarrow m \\;\\text{OR}\\; 2^{\\ell}' }],
              ['return mask', ['0 to 7.']],
            ],
          },
        },
        { figure: 'MaskFig', caption: 'Drag a kart and a sweeper around ours; watch the three bits and the mask.' },
        {
          predict: {
            prompt: 'A kart 2 sectors ahead in lane 0, and a sweeper alongside at lane 1.5 (between lanes 1 and 2), moving toward lane 2. What is the mask?',
            answer: 1 | 2 | 4, compute: () => hazardMask({ ...reset(1, 0), p: 30 }, [{ p: 32, lane: 0, nextP: 33, nextLane: 0 }, { p: 30, lane: 1.5, nextP: 30, nextLane: 1.5833 }], { ...SUNLIT, sweepers: [] }),
            explain: 'Lane 0 from the kart (1); the sweeper at 1.5 is within 0.65 of lanes 1 and 2 (2 + 4). $1 + 2 + 4 = 7$: every lane flagged.',
            misconceptions: [{ answer: 3, feedback: 'Lane 1.5 is 0.5 from lane 2 as well, so lane 2 is flagged too.' }],
          },
        },
        { note: 'Three lanes, three bits: bit $\\ell$ = hazard in lane $\\ell$. `1 << lane` makes the bit, `|` sets it. The mask says **whether**, not how far or how fast.' },
      ],
    },

    {
      id: 'kart-partial-observability', number: '2.3', title: 'One observation, several situations',
      goal: 'Find two situations with the same observation but different outcomes, and explain what that does to a learner.',
      builds: ['kart-hazard-mask'],
      blocks: [
        { md: `In lesson 1.5 the **state** was everything about the kart: position, lane, speed, ticks, the traffic. The driver sees less: an **observation**. When the observation contains everything that matters for the future, it has the **Markov property** and the driver loses nothing. Ours doesn't.

Take our kart at sector 50, lane 0, speed tier 1, with a practice kart ahead in lane 0. Whether that kart is 1, 2, 3 or 4 sectors ahead, the mask says the same thing, "lane 0 has a hazard", and the key is the same: **${observe(me, [ahead(1)])}**. But **Accelerate** does very different things:

| Kart ahead at | Key | Accelerate: hit? | Reward |
|---|---|---|---|
${[1, 2, 3, 4].map(d => { const s = step(me, 3, SUNLIT, [ahead(d)]); return `| ${d} sectors | ${observe(me, [ahead(d)])} | ${s.last.hit ? 'yes, the kart' : 'no'} | ${s.last.reward.toFixed(2)} |` }).join('\n')}

The table has **one** value for Accelerate in key ${observe(me, [ahead(1)])}. Sometimes the action costs −6.2 and sometimes it gains +0.25; the value learns the **average** over the situations the driver happens to meet. This is **partial observability**, and the observation is **aliased**: several states share one name.` },
        { figure: 'AliasFig', caption: 'The four situations of the table, drawn. Same key; different futures.' },
        { md: `Aliasing doesn't make learning impossible: it makes the best achievable policy worse, and it makes values average over hidden differences. There are two remedies, and real systems use both:

1. **Observe more**: add the distance to the nearest kart, its speed, the sweeper's direction. Each addition multiplies the table's size.
2. **Remember**: include the last few observations, so the driver can infer what it can't see (a kart that was 4 ahead and is now 3 is slower than us). That's what recurrent networks and frame stacking do in deep RL.

The sensors of Part 4 take the first road, carefully: more information, but a much **smaller** table.` },
        {
          choice: {
            prompt: 'Why does the mask flag a sweeper that is still a tick away from a lane (via `next_lane`)?',
            options: [
              { text: 'So the observation shows where the sweeper will be when the kart moves, removing one kind of aliasing', why: 'Yes. Without it, "sweeper about to enter my lane" and "sweeper leaving my lane" would look the same. Looking one tick ahead tells them apart.' },
              { text: 'Because sweepers are faster than karts', why: 'They move a twelfth of a lane per tick: slow. The point is the direction of movement, which a snapshot can\'t show.' },
            ],
            answer: 0,
          },
        },
        { note: 'An observation is **Markov** if it carries everything the future depends on. Ours is **aliased**: one key, several situations, one averaged value. Observing more, or remembering, are the two ways out.' },
      ],
    },
  ],
}

