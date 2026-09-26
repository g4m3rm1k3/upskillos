import { MATH_LINKS } from '../../kit/mathLinks.js'

// Tasks in the app's own math tools, with numbers checked against the tool itself
// (src/courses/applied-statistics/viz/cltPopulations.test.js) and against this lab's Python.
export const tools = {
  sampling: {
    toolName: 'the CLT Simulator',
    href: MATH_LINKS['stat.clt'].href,
    buttonLabel: 'Open the central limit theorem lesson (Applied Statistics) in a new tab',
    title: 'Samples against sample means, in the statistics course',
    why: 'The Applied Statistics course’s CLT Simulator runs the experiment above with its own seeded generator, so you can repeat a run exactly and watch the histogram build. It draws from a right-skewed Gamma(2, 0.25) population — the same shape family as our build times, on a different scale.',
    steps: [
      'In the new tab, scroll to **CLT Simulator — Draw Samples, Watch the Bell Curve Emerge**.',
      'Choose **Right-skewed · Gamma(2, 0.25)**, set **n = 20** with the slider (arrow keys move it one step), and set **Seed** to **1**.',
      'Press **+1000** once. Under the histogram the simulator shows the last sample itself: 20 dots and their one mean.',
      'Read **Mean of the means** and **SD of the means (observed SE)**, and compare with the table below. Press **Reset**, then **+1000** again: the same seed gives the same numbers.',
    ],
    tolerance: 'two different random draws agree only to within their own sampling error, about ±0.004 for the SD here',
    compare: [
      ['Mean of the sample means', '0.5 (the population mean)', '0.5007 (5,000 means)', '0.497 (1,000 means, seed 1)'],
      ['SD of the sample means (the standard error)', 'σ/√n = 0.3536/√20 = 0.0791', '0.0783', '0.077'],
      ['Individual values behind the histogram', '1,000 × 20', '5,000 × 20 = 100,000', '20,000 (shown under the histogram)'],
    ],
    after: 'The histogram is a picture of **sample means**, not of the data: each bar counts means of 20 values, which is why it is narrow and nearly symmetric although the population is skewed.',
  },
}
