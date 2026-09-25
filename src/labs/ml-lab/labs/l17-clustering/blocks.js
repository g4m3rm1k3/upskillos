// Lesson order for Lab 17: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l17-unsupervised': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'ClustersInNoise', caption: 'k-means on points with no structure at all.' },
    { p: 3 },
    { figure: 'UnitsDecide', caption: 'The same three groups, with one feature recorded in much larger units.' },
    { p: 4 },
  ],
  'l17-kmeans': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'A cluster contains points at 2, 3, 4 and 11 on a line. Where does the update step move its centre?', answer: 5, explain: 'The mean: (2 + 3 + 4 + 11)/4 = 5. One far point pulls the centre toward it.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { figure: 'KmeansStepper', caption: 'k-means one half-step at a time. Dashed trails show where each centre has been.' },
  ],
  'l17-choosek': [
    { p: 0 }, { p: 1 },
    { figure: 'ElbowAndSilhouette', caption: 'Inertia (left) and mean silhouette (right) for k = 2…8.' },
    { p: 2 },
    { figure: 'SilhouetteCalc', caption: 'One point’s silhouette from its two mean distances.' },
    { predict: { prompt: 'A point has a = 3 and b = 2. What is its silhouette (b − a)/max(a, b)? (Three decimals.)', answer: -0.333, tolerance: 0.001, explain: '(2 − 3)/3 = −0.333: it is closer, on average, to another cluster.' } },
    { p: 3 },
    { figure: 'StabilityBars', caption: 'How much runs with different seeds agree, for each k.' },
    { p: 4 },
  ],
  'l17-shapes': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'KmeansVersusDbscan', caption: 'k-means (left) and DBSCAN (right) on the same points.' },
    { predict: { prompt: 'minPts = 4. A point has 5 points within ε, counting itself. Is it a core point? (1 = yes, 0 = no)', answer: 1, explain: '5 ≥ 4, so yes.' } },
    { p: 3 }, { p: 4 },
  ],
  'l17-anomaly': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'AnomalyFlags', caption: 'Distance to the nearest centre as an anomaly score, raw and relative to each cluster’s spread.' },
    { p: 3 },
    { predict: { prompt: 'You flag the top 2% of 500 points. How many are flagged?', answer: 10, explain: '0.02 × 500 = 10.' } },
    { p: 4 },
  ],
}
