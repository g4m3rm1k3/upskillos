import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const DATA = 'distance_km = [2, 3, 5, 5, 8, 10, 12, 15, 18, 20, 25, 30]\nminutes = [9, 12, 17, 60, 24, 27, 31, 37, 41, 46, 54, 63]'

export default {
  id: 'b-02', slug: 'plotting-foundations', track: 'B', order: 2,
  title: 'Plotting and Visualization Foundations', subtitle: 'Turning Numbers into Pictures',
  tags: ['visualization', 'opencalc', 'plot', 'scatter', 'histogram', 'figure'],
  prereqs: ['b-01'], unlocks: ['b-03', 'b-04'],
  hook: {
    question: 'What does a distribution LOOK like — and why does looking matter?',
    realWorldContext: 'A plot can show in a second what a column of numbers hides: a cluster, a trend, one value that does not belong. But a plot is also a set of choices — which marks, which bins, which axis range — and different choices can tell different stories about the same data.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Choose a plot that answers a stated question. Read a plot\'s axes, units and marks, and check it against the table of numbers behind it. Explain how bin width and axis range change what a plot suggests. Make an observation from a plot and back it with numbers.',
        '**One small dataset for the whole lesson.** Twelve people reported how far they commute and how long it takes:',
        '| person | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| distance (km) | 2 | 3 | 5 | 5 | 8 | 10 | 12 | 15 | 18 | 20 | 25 | 30 |\n| time (minutes) | 9 | 12 | 17 | 60 | 24 | 27 | 31 | 37 | 41 | 46 | 54 | 63 |',
        '**Three questions, three plots.** A plot should answer a question you can state in words.',
        '| Question | Plot | Marks |\n|---|---|---|\n| How are commute times spread out? | **histogram** | bars; bar height = how many values fall in a range (a *bin*) |\n| Do longer distances take longer? | **scatter plot** | one dot per person at (distance, time) |\n| How does something change over an ordered axis, such as time? | **line plot** | points joined in x order |',
        'Every plot has the same anatomy: what each **axis** measures and in which **units**, what each **mark** stands for, and the **scale** — the range and spacing of each axis. Label the axes with quantity and units, or the reader has to guess.',
      ),
      notebook('A distribution', [
        demo(1, 'Stage 1 — A histogram and the table behind it', [
          'The histogram splits the range of times into 6 equal bins and draws one bar per bin. `np.histogram` computes exactly the counts the bars show, so every bar is one row of the printed table.',
        ], 'Run. Match each bar to a row of the table. Which bin holds the value 60, and why does that bin look taller than you might expect?', `from opencalc import Figure
import numpy as np
${DATA}

counts, edges = np.histogram(minutes, bins=6)
for c, lo, hi in zip(counts, edges[:-1], edges[1:]):
    print(f"{lo:5.1f} to {hi:5.1f} min: {c}")

fig = Figure(xmin=5, xmax=67, ymin=0, ymax=4, title="Commute times")
fig.xlabel("commute time (minutes)").ylabel("number of people")
fig.histogram(minutes, bins=6, color="blue")
fig.show()`, { expectOutput: [' 9.0 to  18.0 min: 3', '54.0 to  63.0 min: 3'] }),
      ]),
      prose(
        '**Bins change the story.** A histogram depends on its bins. Too few bins hide structure; too many turn a small dataset into a row of 0s and 1s that is mostly noise. With only 12 values, a handful of bins is plenty.',
        '| bins | counts for the 12 times | what it suggests |\n|---|---|---|\n| 2 | 6, 6 | "half short, half long" — almost no detail |\n| 6 | 3, 1, 2, 2, 1, 3 | spread over the whole range |\n| 24 | mostly 0s and 1s | noise; no shape can be trusted |',
      ),
      check(
        'Why is a histogram with 24 bins a poor choice for these 12 values?',
        ['It is too slow to draw', 'Most bins hold 0 or 1 values, so the bar heights are mostly noise', 'Histograms need exactly 10 bins'],
        1,
        'With far more bins than a small dataset can fill, each bar reflects the luck of which values landed where, not the shape of the distribution.',
      ),
      notebook('Bins', [
        demo(2, 'Stage 2 — The same data, three bin counts', [
          'Only the counts are printed here; the next lines draw the 2-bin version.',
        ], 'Predict how the 2-bin histogram will look, then run. Then change bins=2 to bins=24 and look at the result.', `from opencalc import Figure
import numpy as np
${DATA}

for bins in [2, 6, 24]:
    counts, _ = np.histogram(minutes, bins=bins)
    print(bins, "bins:", counts.tolist())

fig = Figure(xmin=5, xmax=67, ymin=0, ymax=8, title="2 bins")
fig.xlabel("commute time (minutes)").ylabel("number of people")
fig.histogram(minutes, bins=2, color="amber")
fig.show()`, { expectOutput: ['2 bins: [6, 6]', '6 bins: [3, 1, 2, 2, 1, 3]'] }),
      ]),
      prose(
        '**A relationship: the scatter plot.** Each dot is one person: its x position is their distance and its y position their time. A cloud rising from left to right suggests that longer distances take longer. A dot far from the pattern of the others is an *outlier* worth investigating — here, person 3 took 60 minutes for 5 km.',
        'The table equivalent is the same data sorted by distance, with a minutes-per-km column: most people take roughly 2 to 6 minutes per km, and person 3 takes 12.',
        '**Scale and honesty.** The axis range changes the impression. Starting a bar chart\'s value axis above zero makes small differences look huge; squeezing a scatter plot\'s range hides spread. Choose ranges that show all the data and, for bars, start at zero.',
      ),
      notebook('A relationship', [
        demo(3, 'Stage 3 — Scatter plot and minutes per km', [
          'The printed column is the numerical check on what the plot shows.',
        ], 'Run. Find the outlier in the plot, then find it in the printed table. Then give person 3 a time of 20 minutes and run again.', `from opencalc import Figure
${DATA}

for i, (d, m) in enumerate(zip(distance_km, minutes)):
    print(i, d, "km", m, "min", round(m / d, 1), "min/km")

fig = Figure(xmin=0, xmax=32, ymin=0, ymax=70, title="Distance and commute time")
fig.xlabel("distance (km)").ylabel("time (minutes)")
fig.scatter(distance_km, minutes, color="blue", radius=4)
fig.point([5, 60], color="red", label="person 3")
fig.show()`, { expectOutput: ['3 5 km 60 min 12.0 min/km', '11 30 km 63 min 2.1 min/km'] }),
      ]),
      prose(
        '**Change over an ordered axis: the line plot.** Joining points with lines implies that the x values are ordered and that the in-between values make sense — months, hours, distances along a route. Joining unordered points (people in the order they answered a survey) draws lines that mean nothing.',
      ),
      notebook('Change over time', [
        demo(4, 'Stage 4 — A line plot of monthly averages', [
          'The average commute for each of six months. Here x is ordered, so connecting the points is meaningful.',
        ], 'Run. Which month changed most from the one before? Check your answer with the printed differences.', `from opencalc import Figure
months = [1, 2, 3, 4, 5, 6]
avg_minutes = [34.0, 33.5, 36.0, 41.5, 38.0, 35.5]
print([round(b - a, 1) for a, b in zip(avg_minutes, avg_minutes[1:])])

fig = Figure(xmin=0.5, xmax=6.5, ymin=0, ymax=45, title="Average commute by month")
fig.xlabel("month").ylabel("average time (minutes)")
fig.plot(months, avg_minutes, color="green")
fig.scatter(months, avg_minutes, color="green", radius=3)
fig.show()`, { expectOutput: ['[-0.5, 2.5, 5.5, -3.5, -2.5]'] }),
      ]),
      callout('tip', 'Before you trust a plot', '- Can you state the question it answers?\n- Are both axes labelled with a quantity and a unit?\n- For a histogram: would a different number of bins change your conclusion?\n- For bars: does the value axis start at zero?\n- Can you point to the numbers (a table) that back up what you see?'),
      prose('**Practice.** The checkers read your figure\'s elements (bins, marks, labels), so they can tell whether you drew what was asked. Challenge 3 is a fresh problem: choose the right plot for each question.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — A labelled histogram', 'easy', {
          prompt: 'Draw a histogram of minutes with 4 bins. Label the x axis with the quantity and unit, and the y axis with what the bar height counts.',
          instructions: 'Keep the name fig for your Figure and make fig.show() the last line.',
          code: `from opencalc import Figure
${DATA}
fig = Figure(xmin=5, xmax=67, ymin=0, ymax=6)
fig.show()`,
          testCode: `hists = [e for e in fig._elements if e["type"] == "histogram"]
assert hists, "No histogram found: call fig.histogram(minutes, bins=4)"
assert len(hists[0]["edges"]) == 5, f"Use 4 bins; your histogram has {len(hists[0]['edges']) - 1}"
assert sum(hists[0]["counts"]) == 12, "The histogram should use all 12 values of minutes"
assert fig._xlabel and "min" in fig._xlabel.lower(), "Label the x axis with the quantity and its unit, e.g. 'commute time (minutes)'"
assert fig._ylabel, "Label the y axis: what does a bar's height count?"
"SUCCESS: a 4-bin histogram with both axes labelled."`,
          hint: 'fig.xlabel("commute time (minutes)").ylabel("number of people")\nfig.histogram(minutes, bins=4)',
          solution: `from opencalc import Figure
${DATA}
fig = Figure(xmin=5, xmax=67, ymin=0, ymax=6)
fig.xlabel("commute time (minutes)").ylabel("number of people")
fig.histogram(minutes, bins=4, color="blue")
fig.show()`,
          misconceptions: [{ code: `from opencalc import Figure
${DATA}
fig = Figure(xmin=5, xmax=67, ymin=0, ymax=6)
fig.histogram(minutes, bins=4)
fig.show()`, feedback: 'Label the x axis' }],
        }),
        exercise(12, 2, 'Challenge 2 — An observation backed by numbers', 'medium', {
          prompt: 'Draw a scatter plot of distance (x) against minutes (y) with labelled axes. Then record what you see: direction ("positive", "negative" or "none") and outlier, the index of the person who least fits the pattern.',
          instructions: 'Decide from the plot, then confirm with numbers, for example the minutes-per-km values from Stage 3.',
          code: `from opencalc import Figure
${DATA}
fig = Figure(xmin=0, xmax=32, ymin=0, ymax=70)
direction = None
outlier = None
fig.show()`,
          testCode: `pts = [e for e in fig._elements if e["type"] == "scatter"]
assert pts and len(pts[0]["xs"]) == 12, "Draw a scatter plot of all 12 people: fig.scatter(distance_km, minutes)"
assert pts[0]["xs"] == distance_km, "Put distance on the x axis and minutes on the y axis"
assert fig._xlabel and fig._ylabel, "Label both axes with quantity and unit"
assert direction == "positive", "As distance increases, time tends to increase: that is a positive relationship"
assert outlier == 3, "Look for the dot far from the rising pattern: person 3 took 60 minutes for 5 km (12 min/km)"
"SUCCESS: a positive relationship, with person 3 as the outlier — worth asking what happened on that commute."`,
          hint: 'fig.scatter(distance_km, minutes); direction = "positive"; outlier is the index with the largest minutes per km.',
          solution: `from opencalc import Figure
${DATA}
fig = Figure(xmin=0, xmax=32, ymin=0, ymax=70)
fig.xlabel("distance (km)").ylabel("time (minutes)")
fig.scatter(distance_km, minutes)
direction = "positive"
rates = [m / d for d, m in zip(distance_km, minutes)]
outlier = rates.index(max(rates))
fig.show()`,
          misconceptions: [{ code: `from opencalc import Figure
${DATA}
fig = Figure(xmin=0, xmax=32, ymin=0, ymax=70)
fig.xlabel("distance (km)").ylabel("time (minutes)")
fig.scatter(distance_km, minutes)
direction = "positive"
outlier = 11
fig.show()`, feedback: 'person 3 took 60 minutes for 5 km' }],
        }),
        exercise(13, 3, 'Challenge 3 — Choose the plot', 'medium', {
          prompt: 'For each question, store the plot that answers it: q_spread, q_relationship and q_trend, each one of "histogram", "scatter" or "line". Then draw the plot for q_trend using the weekly data given.',
          prose: [
            '- q_spread: how varied are the delivery times of 200 parcels?\n- q_relationship: do heavier parcels take longer to deliver?\n- q_trend: how did the average delivery time change over 8 weeks?',
          ],
          instructions: 'For the trend plot, keep the weeks in order on the x axis and label both axes.',
          code: 'from opencalc import Figure\nweeks = [1, 2, 3, 4, 5, 6, 7, 8]\navg_days = [2.4, 2.6, 2.5, 3.1, 3.4, 3.0, 2.8, 2.7]\nq_spread = None\nq_relationship = None\nq_trend = None\nfig = Figure(xmin=0.5, xmax=8.5, ymin=0, ymax=4)\nfig.show()',
          testCode: `assert q_spread == "histogram", "How varied one quantity is (its distribution) is a histogram question"
assert q_relationship == "scatter", "How two quantities relate, one dot per parcel, is a scatter question"
assert q_trend == "line", "Change over an ordered axis such as weeks is a line-plot question"
curves = [e for e in fig._elements if e["type"] == "curve"]
assert curves, "Draw the weekly averages as a line: fig.plot(weeks, avg_days)"
assert list(curves[0]["xs"]) == sorted(curves[0]["xs"]), "Keep the weeks in order along the x axis"
assert fig._xlabel and fig._ylabel, "Label both axes"
"SUCCESS: histogram for spread, scatter for a relationship, line for an ordered trend."`,
          hint: 'fig.plot(weeks, avg_days, color="green"); fig.xlabel("week").ylabel("average delivery time (days)")',
          solution: 'from opencalc import Figure\nweeks = [1, 2, 3, 4, 5, 6, 7, 8]\navg_days = [2.4, 2.6, 2.5, 3.1, 3.4, 3.0, 2.8, 2.7]\nq_spread = "histogram"\nq_relationship = "scatter"\nq_trend = "line"\nfig = Figure(xmin=0.5, xmax=8.5, ymin=0, ymax=4)\nfig.xlabel("week").ylabel("average delivery time (days)")\nfig.plot(weeks, avg_days, color="green")\nfig.show()',
          misconceptions: [{ code: 'from opencalc import Figure\nq_spread = "line"\nq_relationship = "scatter"\nq_trend = "line"\nfig = Figure()', feedback: 'is a histogram question' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Start from a question: histogram for spread, scatter for a relationship, line for change over an ordered axis.',
    'Label every axis with quantity and unit; know what each mark stands for.',
    'Bin width changes a histogram\'s story — check a few choices, especially with small data.',
    'Axis ranges can exaggerate or hide: bars start at zero; show all the data.',
    'Back each visual observation with numbers from the table behind the plot.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why look at a plot as well as summary statistics?',
      options: [
        'Python requires it',
        'Very different datasets can share the same mean, spread and correlation (Anscombe\'s quartet); the plot shows the actual shape',
        'Plots are more precise than numbers',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'You recorded survey answers in the order people responded. Should you join the points with a line?',
      options: [
        'Yes, lines are clearer',
        'No — response order is not a meaningful ordered axis, so the lines between points would suggest a trend that does not exist',
        'Only if there are more than 100 points',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A bar chart\'s value axis starts at 95 and shows bars of 96 and 98. What is the risk?',
      options: [
        'None',
        'The 98 bar looks three times taller than 96, although the values differ by about 2%',
        'The bars cannot be drawn',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'What does the height of a histogram bar show?',
      options: ['One observation\'s value', 'How many values fall within that bar\'s range (its bin)', 'The mean of the data'],
      correct: 1,
    },
  ],
}
