import { heightAt, interval } from "../engine/fall.js"
const figure = stage => ({ figure: 'Motion', props: { stage } })
// compute works the answer out from the falling-ball engine, so lessons.test.js can check it.
const check = (prompt, answer, explain, misconceptions = [], compute) => ({ predict: { prompt, answer, explain, misconceptions, compute } })
// The opening chapter's six lessons, kept word for word: their ids and block order are progress keys.
export const FALL_LESSONS = [
  {
    id: 'observe', title: 'Watch before calculating',
    goal: 'Describe what changes during a fall, without needing a formula.',
    blocks: [
      { md: 'A ball is held above the ground. We let it go. What changes? Before naming any mathematics, watch. You need no algebra or programming to begin here. Each new word and symbol will be explained when we need it.' },
      { h: 'One ball. One clock.' },
      { md: 'Press **Play**. The ball moves straight down while the clock moves forward. Press **Pause**, or move the time slider yourself. The slider lets you inspect a moment; moving it backward replays the story rather than making gravity run backward.' },
      figure('observe'),
      { note: 'This is an idealized simulation, not a recording. The ball starts at rest, air resistance is ignored, and the downward acceleration is constant. We stop at first contact with the ground; there is no bounce. You do not need to understand acceleration yet: for now, observe that the motion speeds up.' },
      { h: 'Make an observation, not a guess about a formula' },
      { md: 'Replay the first half of the fall, then the second half. The ball travels farther during the second half, even though the two time intervals last equally long. That is evidence that its speed changes. We will measure this carefully before introducing a rule for it.' },
      { choice: { prompt: 'What changes as this ball falls?', options: [
        { text: 'Time increases and the ball’s height decreases.', why: 'The clock counts forward while the ball gets closer to the ground. These are two different quantities we can measure.' },
        { text: 'The ball moves sideways because time moves forward.', why: 'Time is not a direction in the physical scene. The ball falls vertically; the clock simply records when we observe it.' },
      ], answer: 0 } },
      { md: '**In your own words:** describe the fall to someone who cannot see the animation. Mention what changes and what stays fixed. Next we will give those observations numbers.' },
    ],
  },
  {
    id: 'measure', title: 'Give observations numbers',
    goal: 'Read time and height, explain their units, and identify the reference point.',
    blocks: [
      { md: '“High” and “later” describe the scene, but do not tell someone how to reproduce an observation. We need a scale, a reference point, and units.' },
      { h: 'What are we measuring?' },
      { md: '**Height** is vertical distance above the ground. We choose ground level as zero and measure upward in **meters**, abbreviated **m**. A height of 20 m means twenty lengths of one meter above that reference.\n\n**Elapsed time** is how long it has been since release. We choose release as time zero and measure in **seconds**, abbreviated **s**. At 0.5 s, half a second has passed. The decimal 0.5 means five tenths, which is the same amount as one half.' },
      figure('measure'),
      { md: 'Move the slider to 1 s. The height is 15 m. These numbers answer different questions: **when?** and **how high?** A bare “15” loses the unit and the meaning. Zero height means the ball reaches our reference level; zero time means our clock has just started.' },
      check('At release, the ball is 20 m above ground. At 1 s, it is 15 m above ground. How many meters has it fallen?', 5, 'The gap between 20 and 15 is 5: 20 − 15 = 5 m. It has fallen 5 m, but its height is still 15 m. Distance fallen and height are different measurements.', [{ answer: 15, feedback: '15 m is its height above ground. The question asks how much height it has lost since release.' }], () => heightAt(0) - heightAt(1)),
      { note: 'Always ask: what quantity, measured from which zero, in what units? Later a machine-learning input will need these same decisions.' },
    ],
  },
  {
    id: 'record', title: 'Keep a record of the fall',
    goal: 'Read paired measurements and compare equal time intervals.',
    blocks: [
      { md: 'A paused scene shows one moment. A **table** keeps several moments together. Each row below pairs a time with the height at that time. Select a row to inspect that observation in the scene.' },
      figure('table'),
      { md: 'The times 0, 0.5, 1, 1.5, and 2 s are separated by half a second each. Read consecutive heights: 20, 18.75, 15, 8.75, and 0 m. The decimal 18.75 means 18 whole meters plus 75 hundredths of a meter.\n\nFrom 0 to 0.5 s, the ball falls 20 − 18.75 = **1.25 m**. From 0.5 to 1 s, it falls 18.75 − 15 = **3.75 m**. The second distance is larger, although the elapsed time is the same. That comparison supports our observation that the ball is speeding up.' },
      check('From 1 s to 1.5 s, the height changes from 15 m to 8.75 m. How many meters does the ball fall during this half-second interval?', 6.25, 'Subtract the later height from the earlier height: 15 − 8.75 = 6.25 m. This exceeds the preceding half-second distance of 3.75 m.', [], () => heightAt(1) - heightAt(1.5)),
      { note: 'These are exact values from the chosen simulation. Actual measurements have uncertainty and may be rounded. A few observations alone do not prove a unique rule for all the moments between them.' },
    ],
  },
  {
    id: 'graph', title: 'A picture of a relationship',
    goal: 'Connect a moment, a table row, a graph point, and the notation h(t).',
    blocks: [
      { md: 'A **graph** gives each pair of numbers a position on a page. The horizontal scale, called an **axis**, records time in seconds. The vertical axis records height in meters. For the observation at 1 s and 15 m, move right to 1, then up to 15, and place a point.' },
      figure('graph'),
      { h: 'The curve is not the ball’s path' },
      { md: 'The ball falls straight down in the scene. The graph bends because it records **height against time**. Moving right on this graph means looking at a later moment, not moving the ball to the right. Select a row and compare all three views.\n\nThe dots are the sampled observations. The curve shows the heights supplied by our simulation between those samples. Connecting data with a curve requires a model; the dots alone do not specify every point between them.' },
      { h: 'Give the relationship a short name' },
      { md: 'A **variable** is a name for a quantity whose value can vary. Let $t$ name elapsed time. A **function** is a rule assigning one output to each allowed input. In our model, each time has one height. We write $h(t)$, pronounced “h of t,” for that height.\n\nThe letter $h$ names the height function. The parentheses say which input we are asking about; they do **not** mean multiplication here. $h(1)=15$ says: “at a time of 1 second, the height is 15 meters.” The equals sign means the expressions on either side have the same value. Here numerical times are in seconds and numerical heights are in meters.' },
      check('Read the table. What is h(1.5), the height in meters at 1.5 seconds?', 8.75, 'Select the row at 1.5 s. Its height is 8.75 m. The corresponding graph point is directly above 1.5 and level with 8.75.', [], () => heightAt(1.5)),
      { note: 'In this story, time is the input and height is the output. Later, an input might be a measurement fed into a prediction model. The meaning of the axes and units must always be stated again.' },
    ],
  },
  {
    id: 'change', title: 'Change has a direction',
    goal: 'Build ending minus starting, and interpret a negative height change.',
    blocks: [
      { md: 'So far we asked where the ball is. Now compare two moments. We call the earlier time the **start** and the later time the **end** of an interval. An interval is the stretch between them.' },
      { h: 'Ending value minus starting value' },
      { md: 'From 1 s to 2 s, height goes from 15 m to 0 m. The **change in height** is 0 − 15 = −15 m. The minus sign means the height decreased. A negative number records direction relative to zero; it is not a negative amount of physical distance.\n\nWhy subtract in this order? Starting value + change = ending value. Here 15 + (−15) = 0. Subtracting the starting value from both sides gives change = ending value − starting value.' },
      figure('change'),
      { h: 'A symbol for a calculation we already understand' },
      { md: 'The Greek capital letter $\\Delta$, pronounced “delta,” is shorthand for **change in**. Thus $\\Delta h$ means change in height and $\\Delta t$ means elapsed time. Neither is a new operation.\n\n$$\\Delta h = h_{\\text{end}} - h_{\\text{start}}$$\n\nThe small labels below $h$ are **subscripts**. They tell us which height: ending or starting. They are labels, not quantities to multiply. Similarly,\n\n$$\\Delta t = t_{\\text{end}} - t_{\\text{start}}.$$\n\nOur end time is later than our start time, so elapsed time is positive. Height change is negative during this downward motion.' },
      check('From 0 to 1 s, height goes from 20 m to 15 m. What is the signed change in height, in meters?', -5, 'Ending minus starting gives 15 − 20 = −5 m. The ball travels 5 m downward; its height changes by −5 m.', [{ answer: 5, feedback: '5 m is the distance fallen. For signed height change, use ending minus starting: 15 − 20.' }], () => interval(0, 1).change),
      { note: 'Keep the distinction: height is a position relative to ground; height change is signed; distance traveled is nonnegative. They answer different questions.' },
    ],
  },
  {
    id: 'rate', title: 'How much change per second?',
    goal: 'Calculate average velocity and connect its sign, units, and graph slope.',
    blocks: [
      { md: 'A height change alone does not tell us how fast the motion was. Falling 5 m in one second and falling 5 m in ten seconds give the same change but different rates. We need to account for elapsed time.' },
      { h: 'What does “per” mean?' },
      { md: '“Per second” means “for each second.” Divide a total change by the number of seconds to find an equivalent amount for one second. If height changes by −15 m over 1 s, the average is −15 ÷ 1 = −15 meters per second. If the same change took 3 s, the average would be −15 ÷ 3 = −5 meters per second.\n\nThis signed rate is **average velocity**. “Average” matters: it is a single rate for the whole interval. The ball need not move at that rate at every moment.' },
      { md: 'We write $\\bar v$ (“v bar”) for average velocity. The bar reminds us it is an average. The fraction line means division:\n\n$$\\bar v = \\frac{\\Delta h}{\\Delta t}. $$\n\nThe top of the fraction is height change; the bottom is elapsed time. Dividing meters by seconds gives **m/s**, read “meters per second.” A negative result means downward motion because we chose upward as positive.' },
      figure('rate'),
      { h: 'The same division appears on the graph' },
      { md: 'The straight orange line joins the two observations. Its **slope** is vertical change divided by horizontal change. Those changes are height and time on this graph, so the slope equals average velocity. The colored triangle shows exactly the quantities being divided. A line through two points on a curve is called a **secant line**.\n\nTry 0 to 1 s: (15 − 20) ÷ (1 − 0) = −5 m/s. Then try 1 to 2 s: (0 − 15) ÷ (2 − 1) = −15 m/s. Equal durations, different changes, different average velocities.' },
      check('For a fresh interval, use 0.5 s to 1.5 s. Heights are 18.75 m and 8.75 m. What is the average velocity in m/s?', -10, 'Height change: 8.75 − 18.75 = −10 m. Elapsed time: 1.5 − 0.5 = 1 s. Divide: −10 ÷ 1 = −10 m/s. A constant downward velocity of −10 m/s would give the same total height change over this interval.', [], () => interval(0.5, 1.5).velocity),
      { note: 'Average velocity is not generally velocity at either endpoint. An interval with zero duration would require division by zero, which is undefined. Understanding motion at one instant needs a new idea: a limit. That is the next planned chapter, not an assumption we have already made.' },
      { md: '**Explain it yourself:** why does the graph line slope downward? Why is its slope measured in m/s? Why can one average fail to describe the whole fall? Revisit the experiment until you can connect each answer to a measurement.' },
    ],
  },
]
