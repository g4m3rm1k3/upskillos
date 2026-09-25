import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-03', slug: 'linear-functions-and-slope', track: 'B', order: 3,
  title: 'Linear Functions and Slope', subtitle: 'The Simplest Relationship',
  tags: ['linear', 'slope', 'intercept', 'residuals', 'least-squares'],
  prereqs: ['b-02', 'a-08'], unlocks: ['b-04', 'b-05', 'c-02'],
  hook: {
    question: 'What does a rate of change look like — and how do you find it from data?',
    realWorldContext: 'A straight line is the simplest model of how one quantity depends on another: a fixed starting amount plus a fixed amount per unit. Reading its slope and intercept in real units — and knowing when the line does not fit — is the foundation for regression and for every linear model that follows.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Compute a slope from two measurements and state it in units. Interpret a line\'s intercept, and recognise when it has no sensible meaning. Compute residuals and read their signs. Interpret a line fitted to data.',
        '**The smallest example.** A taxi ride of 2 km cost £7. A ride of 5 km cost £13. Assume the fare is a fixed charge plus a price per km — a **linear** relationship.',
        '1. Change in distance: 5 − 2 = 3 km.\n2. Change in fare: 13 − 7 = £6.\n3. **Slope** = change in fare ÷ change in distance = 6 ÷ 3 = **£2 per km**.\n4. **Intercept**: go back 2 km from the first ride: 7 − 2 × 2 = **£3**, the fare for 0 km — the fixed charge.',
        'So fare = 2 × distance + 3, the pattern y = m·x + b with slope m = 2 and intercept b = 3. The slope is always in *y units per x unit*; the intercept is in *y units*.',
      ),
      check(
        'Using fare = 2 × distance + 3, what does an 8 km ride cost?',
        ['£16', '£19', '£13'],
        1,
        '2 × 8 + 3 = 19: the fixed £3 plus £2 for each of the 8 km.',
      ),
      notebook('Slope from two measurements', [
        demo(1, 'Stage 1 — Slope and intercept from two points', [
          'The same steps as above, in code, then the line through the two measurements.',
        ], 'Run. Then change the second ride to 5 km costing £14 and predict the new slope and intercept.', 'from opencalc import Figure\nx1, y1 = 2, 7     # km, pounds\nx2, y2 = 5, 13\nm = (y2 - y1) / (x2 - x1)\nb = y1 - m * x1\nprint(f"slope = {m} pounds per km, intercept = {b} pounds")\nprint("fare for 8 km:", m * 8 + b)\n\nfig = Figure(xmin=0, xmax=9, ymin=0, ymax=22, title="Taxi fare")\nfig.grid().axes()\nfig.xlabel("distance (km)").ylabel("fare (pounds)")\nfig.plot(lambda x: m * x + b, color="blue")\nfig.point([x1, y1], color="amber", label="2 km")\nfig.point([x2, y2], color="amber", label="5 km")\nfig.show()', { expectOutput: ['slope = 2.0 pounds per km, intercept = 3.0 pounds', 'fare for 8 km: 19.0'] }),
      ]),
      prose(
        '**Reading a slope and an intercept.** The slope is a *rate*: how much y changes when x increases by one unit. The intercept is the value of y when x is 0 — which is only meaningful if x = 0 is a sensible situation.',
        '| Line | Slope means | Intercept means |\n|---|---|---|\n| fare = 2·km + 3 | +£2 for each extra km | £3 fixed charge: sensible |\n| score = 4.5·hours + 52 | +4.5 points per extra hour of study | 52 points with no study: plausible, but check the data contains hours near 0 |\n| weight = 0.9·height − 90 | +0.9 kg per extra cm | −90 kg at 0 cm height: **meaningless** — nobody is 0 cm tall |',
        'An intercept far outside the range of the data is an *extrapolation*. It is needed to draw the line, but it is not a claim about what really happens there.',
      ),
      check(
        'A line fitted to adults gives weight = 0.9 × height(cm) − 90. What should you say about the intercept of −90 kg?',
        ['Babies weigh −90 kg', 'It is needed to place the line but has no real meaning, because heights near 0 cm are far outside the data', 'The line is wrong'],
        1,
        'The line only describes the range of heights it was fitted to. Reading it at 0 cm is extrapolation.',
      ),
      prose(
        '**Residuals: how far off is the line?** Real data do not fall exactly on a line. For each point, the **residual** is *actual minus predicted*: positive when the point is above the line, negative when below. For the line y = 2x and five measurements:',
        '| x | actual y | predicted 2x | residual | point is |\n|---|---|---|---|---|\n| 1 | 2.1 | 2 | +0.1 | above |\n| 2 | 3.9 | 4 | −0.1 | below |\n| 3 | 6.2 | 6 | +0.2 | above |\n| 4 | 7.8 | 8 | −0.2 | below |\n| 5 | 10.1 | 10 | +0.1 | above |',
        'Small residuals with no pattern in their signs suggest the line describes the data well. Residuals that are positive at both ends and negative in the middle (or the reverse) suggest the data curve and a straight line is the wrong shape.',
      ),
      notebook('Residuals', [
        demo(2, 'Stage 2 — The residual table', [
          'Residuals computed for every point at once with arrays, then drawn as dashed segments from each point to the line.',
        ], 'Run and compare with the table. Then change the line to y = 2x + 0.3 and see how the signs change.', 'from opencalc import Figure\nimport numpy as np\nxs = np.array([1, 2, 3, 4, 5])\nys = np.array([2.1, 3.9, 6.2, 7.8, 10.1])\nm, b = 2, 0\npredicted = m * xs + b\nresiduals = ys - predicted\nprint(np.round(residuals, 2))\nprint("above:", (residuals > 0).sum(), "below:", (residuals < 0).sum())\n\nfig = Figure(xmin=0, xmax=6, ymin=0, ymax=12)\nfig.grid().axes()\nfig.scatter(xs.tolist(), ys.tolist(), color="blue")\nfig.plot(lambda x: m * x + b, color="amber")\nfor xi, yi, pi in zip(xs, ys, predicted):\n    fig.line([xi, yi], [xi, pi], color="red", dashed=True)\nfig.show()', { expectOutput: ['[ 0.1 -0.1  0.2 -0.2  0.1]', 'above: 3 below: 2'] }),
      ]),
      prose(
        '**The best-fitting line.** To compare candidate lines, add up the squared residuals — the **sum of squared residuals** (SSR). Squaring stops positive and negative residuals cancelling, and penalises large misses more. The **least squares** line is the line with the smallest SSR. `np.polyfit(x, y, 1)` finds it and returns `[slope, intercept]`. When the x values are not all equal there is exactly one such line (Lesson D.03 derives the formula).',
        'A fitted line describes the **mean relationship**: the average y to expect at each x. It minimises squared error *on the data it was fitted to*; it does not promise the same accuracy on new data. The residuals describe what it leaves out — their pattern tells you whether the straight-line shape is right, and their spread tells you how much individual points vary around it.',
      ),
      notebook('Least squares', [
        demo(3, 'Stage 3 — Compare two candidate lines', [
          'Two lines fitted by eye, compared by SSR. The smaller SSR fits these points better.',
        ], 'Predict which line has the smaller SSR, then run. Then try your own m and b and beat both.', 'import numpy as np\nxs = np.array([1, 2, 3, 4, 5])\nys = np.array([2.1, 3.9, 6.2, 7.8, 10.1])\nfor m, b in [(2, 0), (1.8, 0.5)]:\n    ssr = ((ys - (m * xs + b)) ** 2).sum()\n    print(f"y = {m}x + {b}: SSR = {ssr:.3f}")', { expectOutput: ['y = 2x + 0: SSR = 0.110', 'y = 1.8x + 0.5: SSR = 0.540'] }),
        demo(4, 'Stage 4 — The least squares line and what it says', [
          '`np.polyfit` finds the line with the smallest possible SSR. The printed sentence interprets the slope in words.',
        ], 'Run. Is its SSR smaller than both lines in Stage 3? Then state the slope\'s meaning for your own made-up units.', 'import numpy as np\nxs = np.array([1, 2, 3, 4, 5])\nys = np.array([2.1, 3.9, 6.2, 7.8, 10.1])\nm, b = np.polyfit(xs, ys, 1)\nssr = ((ys - (m * xs + b)) ** 2).sum()\nprint(f"y = {m:.2f}x + {b:.2f}, SSR = {ssr:.3f}")\nprint(f"Each 1-unit increase in x goes with an average increase of {m:.2f} in y.")', { expectOutput: ['y = 1.99x + 0.05, SSR = 0.107'] }),
      ]),
      prose('**Practice.** Challenge 1 finds a slope and intercept from two measurements. Challenge 2 computes residuals. Challenge 3 is a fresh problem: fit a line to new data and interpret it.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — A phone plan', 'easy', {
          prompt: 'A phone plan cost 12 pounds in a month with 100 MB of data and 21 pounds in a month with 400 MB. Assuming a fixed fee plus a price per MB, compute slope (pounds per MB) and intercept (the fixed fee).',
          instructions: 'Slope is change in cost divided by change in data. Then use one of the months to find the intercept.',
          code: 'mb1, cost1 = 100, 12\nmb2, cost2 = 400, 21\nslope = None\nintercept = None',
          testCode: `assert slope is not None, "Replace None"
assert abs(slope - 100/3) > 1e-6, "That is change in data divided by change in cost. Slope is change in COST divided by change in DATA"
assert abs(slope - 0.03) < 1e-9, f"slope should be 9 / 300 = 0.03 pounds per MB, got {slope}"
assert abs(intercept - 9) < 1e-9, f"intercept should be 12 - 0.03 * 100 = 9 pounds, got {intercept}"
"SUCCESS: 9 pounds a month plus 3 pence per MB."`,
          hint: 'slope = (cost2 - cost1) / (mb2 - mb1); intercept = cost1 - slope * mb1',
          solution: 'mb1, cost1 = 100, 12\nmb2, cost2 = 400, 21\nslope = (cost2 - cost1) / (mb2 - mb1)\nintercept = cost1 - slope * mb1',
          misconceptions: [{ code: 'mb1, cost1 = 100, 12\nmb2, cost2 = 400, 21\nslope = (mb2 - mb1) / (cost2 - cost1)\nintercept = 0', feedback: 'Slope is change in COST divided by change in DATA' }],
        }),
        exercise(12, 2, 'Challenge 2 — Residual signs', 'medium', {
          prompt: 'For the line hours_slept = −0.5 × coffees + 8, compute residuals (actual minus predicted) for the data, and count how many points lie above the line (n_above).',
          instructions: 'Use arrays: `predicted = -0.5 * coffees + 8`. Residual = actual − predicted.',
          code: 'import numpy as np\ncoffees = np.array([0, 1, 2, 3, 4])\nhours_slept = np.array([8.2, 7.4, 7.1, 6.3, 6.1])\nresiduals = None\nn_above = None',
          testCode: `import numpy as np
assert residuals is not None, "Compute residuals"
assert not np.allclose(residuals, [-0.2, 0.1, -0.1, 0.2, -0.1]), "The signs are flipped: that is predicted minus actual. Residual = actual - predicted"
assert np.allclose(residuals, [0.2, -0.1, 0.1, -0.2, 0.1]), f"Expected [0.2, -0.1, 0.1, -0.2, 0.1], got {residuals}"
assert n_above == 3, f"Points above the line have positive residuals: 3 of them. Got {n_above}"
"SUCCESS: positive residual = point above the line."`,
          hint: 'residuals = hours_slept - (-0.5 * coffees + 8); n_above = (residuals > 0).sum()',
          solution: 'import numpy as np\ncoffees = np.array([0, 1, 2, 3, 4])\nhours_slept = np.array([8.2, 7.4, 7.1, 6.3, 6.1])\nresiduals = hours_slept - (-0.5 * coffees + 8)\nn_above = (residuals > 0).sum()',
          misconceptions: [{ code: 'import numpy as np\ncoffees = np.array([0, 1, 2, 3, 4])\nhours_slept = np.array([8.2, 7.4, 7.1, 6.3, 6.1])\nresiduals = (-0.5 * coffees + 8) - hours_slept\nn_above = 2', feedback: 'The signs are flipped' }],
        }),
        exercise(13, 3, 'Challenge 3 — Interpret a fitted line', 'medium', {
          prompt: 'Fit a least squares line to flat sizes (square metres) and monthly rents. Store the slope as rent_per_m2, the predicted rent for a 70 m2 flat as rent_70, and whether the intercept is a meaningful rent (intercept_meaningful, True or False).',
          prose: ['The data covers flats from 35 to 95 square metres. Think about what "a flat of 0 square metres" would mean before you decide about the intercept.'],
          instructions: 'Use `np.polyfit(size_m2, rent, 1)`, which returns [slope, intercept]. Predict by plugging 70 into the line.',
          code: 'import numpy as np\nsize_m2 = np.array([35, 48, 55, 62, 70, 81, 95])\nrent = np.array([780, 905, 990, 1040, 1150, 1235, 1410])\nrent_per_m2 = None\nrent_70 = None\nintercept_meaningful = None',
          testCode: `import numpy as np
m, b = np.polyfit(size_m2, rent, 1)
assert rent_per_m2 is not None and abs(rent_per_m2 - b) > 1, "polyfit returns [slope, intercept]: the first value is the slope"
assert abs(rent_per_m2 - m) < 1e-6, f"rent_per_m2 should be the fitted slope, about {m:.2f} per square metre"
assert abs(rent_70 - (m * 70 + b)) < 1e-6, f"rent_70 should be slope * 70 + intercept, about {m * 70 + b:.0f}"
assert intercept_meaningful is False, "The intercept is the rent of a 0 square metre flat — far outside the 35–95 range of the data, so it is only needed to place the line"
"SUCCESS: about 10.4 per extra square metre; a 70 m2 flat is predicted at about 1138; the intercept (about 410) is an extrapolation."`,
          hint: 'rent_per_m2, intercept = np.polyfit(size_m2, rent, 1); rent_70 = rent_per_m2 * 70 + intercept',
          solution: 'import numpy as np\nsize_m2 = np.array([35, 48, 55, 62, 70, 81, 95])\nrent = np.array([780, 905, 990, 1040, 1150, 1235, 1410])\nrent_per_m2, intercept = np.polyfit(size_m2, rent, 1)\nrent_70 = rent_per_m2 * 70 + intercept\nintercept_meaningful = False',
          misconceptions: [{ code: 'import numpy as np\nsize_m2 = np.array([35, 48, 55, 62, 70, 81, 95])\nrent = np.array([780, 905, 990, 1040, 1150, 1235, 1410])\nrent_per_m2, intercept = np.polyfit(size_m2, rent, 1)\nrent_70 = rent_per_m2 * 70 + intercept\nintercept_meaningful = True', feedback: 'far outside the 35–95 range' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Slope = change in y ÷ change in x, in y units per x unit.',
    'Intercept = y when x is 0 — meaningful only if x = 0 is a sensible, observed situation.',
    'Residual = actual − predicted: positive above the line, negative below.',
    'Least squares picks the line with the smallest sum of squared residuals — unique when the x values vary.',
    'A pattern in residual signs means the straight-line shape is wrong; their spread is how much points vary around it.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'A line gives cost = 0.25 × minutes + 5. What does 0.25 mean?',
      options: ['A fixed charge of 0.25', 'Cost increases by 0.25 for each extra minute', 'The cost of a call of 0 minutes'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'A point lies below a fitted line. Its residual (actual − predicted) is:',
      options: ['positive', 'negative', 'zero'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Why square residuals before adding them up?',
      options: [
        'To make the numbers smaller',
        'So positive and negative residuals cannot cancel, and large misses count more',
        'Because polyfit requires it',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Residuals are positive at small x, negative in the middle, and positive at large x. What does that suggest?',
      options: ['The line fits well', 'The data curve, so a straight line is the wrong shape', 'The intercept is wrong'],
      correct: 1,
    },
  ],
}
