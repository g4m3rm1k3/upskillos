// Sample datasets to practise on, each with what its columns mean, where it
// comes from, and things to try. A "try" is a list of steps the lab carries
// out on the dataset's sheet:
//   { kind: 'cells', at: 'G1', rows: [[input, …], …] }   write cells (formulas included)
//   { kind: 'code', at: 'G1', lang: 'py', source }        a Python cell
//   { kind: 'chart', type, source, title?, trendline?, xTitle?, yTitle? }
//   { kind: 'rule', source, rule }                        a colour rule
// Places ("at") are beside the data; if something is already there, the lab
// moves along to the next free columns.
import { housePrices, shopSales, studyHours } from './synthetic.js'

const csvRows = (text) => text.trim().split('\n').map((line) => line.split(','))

const KNN_IRIS = `# k-nearest neighbours: to classify a flower, find the k flowers whose
# measurements are closest to it and take their most common species.
rows = xl("A2:E151")
flowers = [(row[:4], row[4]) for row in rows]

def distance(a, b):
    # Straight-line (Euclidean) distance between two lists of measurements.
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

def predict(point, others, k=5):
    nearest = sorted(others, key=lambda other: distance(point, other[0]))[:k]
    votes = [species for _, species in nearest]
    return max(sorted(set(votes)), key=votes.count)

# Leave-one-out testing: predict each flower from all the others, so the
# model is never marked on a flower it has already seen.
correct = 0
for i, (point, species) in enumerate(flowers):
    if predict(point, flowers[:i] + flowers[i + 1:]) == species:
        correct += 1

[["Flowers", len(flowers)], ["Correctly classified", correct], ["Accuracy", correct / len(flowers)]]`

const KMEANS_IRIS = `# k-means clustering: find 3 groups in the petal measurements without being
# told the species, then compare the groups with the real species.
rows = xl("C2:E151")
points = [row[:2] for row in rows]
species = [row[2] for row in rows]

def distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

# Start with three points far apart: the first point, then repeatedly the
# point farthest from the centres chosen so far.
centres = [points[0]]
while len(centres) < 3:
    centres.append(max(points, key=lambda p: min(distance(p, c) for c in centres)))

for step in range(100):
    # 1. Give each point to its nearest centre.
    groups = [min(range(3), key=lambda k: distance(p, centres[k])) for p in points]
    # 2. Move each centre to the middle (mean) of its points.
    moved = []
    for k in range(3):
        members = [p for p, g in zip(points, groups) if g == k]
        moved.append([sum(v) / len(members) for v in zip(*members)])
    if moved == centres:
        break  # nothing moved: finished
    centres = moved

# How many of each species ended up in each group.
names = sorted(set(species))
table = [["Group"] + names]
for k in range(3):
    table.append([f"Group {k + 1}"] + [sum(1 for g, s in zip(groups, species) if g == k and s == n) for n in names])
table`

const KNN_WINE = `# k-nearest neighbours on the wines, twice: with the raw measurements and
# with every column rescaled to the same spread (standardised).
rows = xl("A2:N179")
X = [row[:13] for row in rows]
y = [row[13] for row in rows]

def accuracy(X, k=5):
    def distance(a, b):
        return sum((p - q) ** 2 for p, q in zip(a, b)) ** 0.5
    correct = 0
    for i in range(len(X)):
        others = [(X[j], y[j]) for j in range(len(X)) if j != i]
        nearest = sorted(others, key=lambda o: distance(X[i], o[0]))[:k]
        votes = [label for _, label in nearest]
        if max(sorted(set(votes)), key=votes.count) == y[i]:
            correct += 1
    return correct / len(X)

# Standardise: subtract each column's mean and divide by its standard deviation.
columns = list(zip(*X))
means = [sum(c) / len(c) for c in columns]
sds = [(sum((v - m) ** 2 for v in c) / (len(c) - 1)) ** 0.5 for c, m in zip(columns, means)]
scaled = [[(v - m) / s for v, m, s in zip(row, means, sds)] for row in X]

[["Measurements", "Accuracy"], ["As measured", accuracy(X)], ["Standardised", accuracy(scaled)]]`

const DESCENT_STUDY = `# Gradient descent: start with a guess for the line score = m * hours + b,
# then repeatedly nudge m and b in the direction that makes the mean squared
# error smaller. This is how most machine-learning models are trained.
rows = xl("A2:B51")
hours = [r[0] for r in rows]
scores = [r[1] for r in rows]
n = len(hours)

m, b = 0.0, 0.0      # the first guess
rate = 0.01          # how big each nudge is (the learning rate)
for step in range(20000):
    errors = [m * x + b - y for x, y in zip(hours, scores)]
    m -= rate * 2 * sum(e * x for e, x in zip(errors, hours)) / n
    b -= rate * 2 * sum(errors) / n

mse = sum((m * x + b - y) ** 2 for x, y in zip(hours, scores)) / n
[["Slope m", round(m, 3)], ["Intercept b", round(b, 3)], ["Mean squared error", round(mse, 2)]]`

const REGRESSION_HOUSES = `# Multiple linear regression:
#   price = b0 + b1 * area + b2 * bedrooms + b3 * distance
# Fit on the first 90 houses, then test on the 30 the model has not seen.
rows = xl("A2:D121")
train, test = rows[:90], rows[90:]

def solve(A, v):
    # Gaussian elimination: solves A w = v for w.
    n = len(v)
    M = [A[i][:] + [v[i]] for i in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]

# Least squares: the weights solve (XᵀX) w = Xᵀy, the "normal equations".
X = [[1.0] + r[:3] for r in train]
y = [r[3] for r in train]
XtX = [[sum(a[i] * a[j] for a in X) for j in range(4)] for i in range(4)]
Xty = [sum(a[i] * t for a, t in zip(X, y)) for i in range(4)]
w = solve(XtX, Xty)

def predict(r):
    return w[0] + w[1] * r[0] + w[2] * r[1] + w[3] * r[2]

rmse = (sum((predict(r) - r[3]) ** 2 for r in test) / len(test)) ** 0.5
[["Term", "Fitted", "Rule used to make the data"],
 ["Intercept", round(w[0], 2), 50],
 ["Per m² of floor area", round(w[1], 2), 2.1],
 ["Per bedroom", round(w[2], 2), 8],
 ["Per km from the centre", round(w[3], 2), -4.5],
 ["Typical error on unseen houses (RMSE)", round(rmse, 1), ""]]`

export const DATASETS = [
  {
    id: 'shop-orders',
    title: 'Bike shop orders',
    summary: 'A year of orders from a bike shop: 402 rows with dates, towns, items, prices, quantities and channels. Data Science Studio works through it lesson by lesson; it has mistakes in it on purpose.',
    origin: 'Made up by Data Science Studio’s generator (src/labs/data-science-studio/python/data.py), so the truth behind it is known: 18 prices are missing, some town names are typed differently, two prices were typed in pence, and two orders were entered twice.',
    columns: [['order_id', 'A label for the order, A1001 to A1400.'], ['date', 'The day of the order in 2025, as text YYYY-MM-DD.'], ['town', 'Leeds, York, Harrogate or Wakefield, sometimes typed in lower case or with a space after.'], ['item', 'Bike, Helmet, Lights, Lock, Inner tube or Service.'], ['price', 'The price of one, in pounds; blank if it was never typed.'], ['quantity', 'How many.'], ['channel', 'shop or web.']],
    rows: async () => { const { HEADER, makeOrders } = await import('../../data-science-studio/engine/data.js'); return [HEADER, ...makeOrders()] },
    tries: [
      { label: 'Count the orders of each item (lesson 1.1)', learn: 'GROUPBY counts the rows for each item: the same as count_values in Python.', steps: [{ kind: 'cells', at: 'I1', rows: [['=GROUPBY(D1:D403, A1:A403, COUNTA, 3, 0)']] }] },
      { label: 'Missing prices, and the mean two ways (lesson 1.4)', learn: 'AVERAGE skips the blank prices; dividing the sum by the number of orders counts them as 0, and comes out lower.', steps: [{ kind: 'cells', at: 'I1', rows: [['Missing prices', '=COUNTBLANK(E2:E403)'], ['Mean, blanks skipped', '=AVERAGE(E2:E403)'], ['Mean, blanks as 0', '=SUM(E2:E403)/COUNTA(A2:A403)']] }] },
      { label: 'Mean and median price of each item (lessons 2.2 and 2.7)', learn: 'For the lights, the mean is far above the median: two prices were typed in pence.', steps: [{ kind: 'cells', at: 'I1', rows: [['Mean'], ['=GROUPBY(D1:D403, E1:E403, AVERAGE, 3, 0)']] }, { kind: 'cells', at: 'L1', rows: [['Median'], ['=GROUPBY(D1:D403, E1:E403, MEDIAN, 3, 0)']] }] },
      { label: 'Spread of the prices (lesson 2.4)', learn: 'VAR.S divides by n − 1, VAR.P by n; the quartiles use the same rule as pandas.', steps: [{ kind: 'cells', at: 'I1', rows: [['Variance (sample)', '=VAR.S(E2:E403)'], ['Variance (population)', '=VAR.P(E2:E403)'], ['Standard deviation', '=STDEV.S(E2:E403)'], ['Q1', '=QUARTILE.INC(E2:E403, 1)'], ['Median', '=MEDIAN(E2:E403)'], ['Q3', '=QUARTILE.INC(E2:E403, 3)']] }] },
      { label: 'Items sold by item and channel (lesson 2.8)', learn: 'PIVOTBY makes the pivot table: one row per item, one column per channel, totals included.', steps: [{ kind: 'cells', at: 'I1', rows: [['=PIVOTBY(D1:D403, G1:G403, F1:F403, SUM)']] }] },
    ],
  },
  {
    id: 'iris',
    title: 'Iris flowers',
    summary: '150 iris flowers of three species, with the length and width of their petals and sepals. The classic first dataset for classification.',
    origin: 'Real data, measured by Edgar Anderson and published by R. A. Fisher in 1936. Public domain.',
    columns: [['Sepal length / width (cm)', 'The sepals are the green leaves under the petals.'], ['Petal length / width (cm)', 'The coloured petals.'], ['Species', 'setosa, versicolor or virginica: what a model tries to predict.']],
    rows: async () => csvRows((await import('./iris.js')).default),
    tries: [
      { label: 'Scatter chart of petal length against width', learn: 'Each dot is a flower. The setosa flowers form a separate group at the bottom left: that is why they are easy to classify.', steps: [{ kind: 'chart', type: 'scatter', source: 'C1:D151', title: 'Petals', xTitle: 'Petal length (cm)', yTitle: 'Petal width (cm)' }] },
      { label: 'Average of each measurement by species', learn: 'GROUPBY splits the flowers by species and averages each column: the species differ most in their petals.', steps: [{ kind: 'cells', at: 'G1', rows: [['=GROUPBY(E1:E151, A1:D151, AVERAGE, 3, 0)']] }] },
      { label: 'Classify with k-nearest neighbours (Python)', learn: 'A model that predicts a species from the 5 most similar flowers, tested on each flower in turn. Read the code: it is about twenty lines.', steps: [{ kind: 'code', at: 'G7', lang: 'py', source: KNN_IRIS, size: [3, 2] }] },
      { label: 'Find groups with k-means clustering (Python)', learn: 'Clustering finds groups without being told the answers (unsupervised learning). The table shows how well the groups match the real species.', steps: [{ kind: 'code', at: 'G12', lang: 'py', source: KMEANS_IRIS, size: [4, 4] }] },
    ],
  },
  {
    id: 'wine',
    title: 'Wine chemistry',
    summary: '178 wines from three grape cultivars, with 13 chemical measurements each. Good for classification, and for seeing why scaling matters.',
    origin: 'Real data: Aeberhard, S. & Forina, M. (1992), Wine, UCI Machine Learning Repository, doi:10.24432/C5PC7J. Licence CC BY 4.0.',
    columns: [['Alcohol … Proline', '13 measurements from a chemical analysis. They have very different sizes: Proline is in the hundreds, Hue is around 1.'], ['Cultivar', 'Which of three grape varieties the wine came from.']],
    rows: async () => csvRows((await import('./wine.js')).default),
    tries: [
      { label: 'Average of each measurement by cultivar', learn: 'Compare the cultivars column by column: which measurements tell them apart?', steps: [{ kind: 'cells', at: 'P1', rows: [['=GROUPBY(N1:N179, A1:M179, AVERAGE, 3, 0)']] }] },
      { label: 'Scatter chart of colour intensity against hue', learn: 'Two measurements that separate the cultivars quite well.', steps: [{ kind: 'chart', type: 'scatter', source: 'J1:K179', title: 'Colour and hue', xTitle: 'Colour intensity', yTitle: 'Hue' }] },
      { label: 'k-nearest neighbours, with and without scaling (Python)', learn: 'Distances are dominated by the biggest numbers (Proline), so the raw model mostly ignores the other 12 measurements. Standardising each column first changes the accuracy a lot.', steps: [{ kind: 'code', at: 'P6', lang: 'py', source: KNN_WINE, size: [3, 2] }] },
    ],
  },
  {
    id: 'study',
    title: 'Study hours and exam scores',
    summary: '50 students: how long each studied, their attendance and their exam score. For correlation and fitting a line.',
    origin: 'Made up for practice, with the rule score = 35 + 5.5 × hours + random noise. A good fit should find a slope near 5.5.',
    columns: [['Hours studied', 'Hours of revision, 0.5 to 10.'], ['Exam score', 'Out of 100.'], ['Attendance (%)', 'Share of classes attended.']],
    rows: async () => { const r = studyHours(); return r.map(([h, a, s]) => [h, s, a]) },
    tries: [
      { label: 'Scatter chart with a best-fit line', learn: 'The line\'s equation and R² appear on the chart: the slope is the extra marks per hour of study.', steps: [{ kind: 'chart', type: 'scatter', source: 'A1:B51', title: 'Exam score by hours studied', xTitle: 'Hours studied', yTitle: 'Exam score', trendline: true }] },
      { label: 'Fit the line with formulas', learn: 'SLOPE and INTERCEPT give the least-squares line; RSQ says how much of the variation it explains; FORECAST.LINEAR uses it to predict.', steps: [{ kind: 'cells', at: 'E1', rows: [['Slope', '=SLOPE(B2:B51, A2:A51)'], ['Intercept', '=INTERCEPT(B2:B51, A2:A51)'], ['R²', '=RSQ(B2:B51, A2:A51)'], ['Correlation', '=CORREL(A2:A51, B2:B51)'], ['Score predicted for 8 hours', '=FORECAST.LINEAR(8, B2:B51, A2:A51)']] }] },
      { label: 'Learn the line by gradient descent (Python)', learn: 'Instead of a formula, start from a guess and improve it step by step, the way neural networks are trained. It should land on the same slope and intercept as SLOPE and INTERCEPT.', steps: [{ kind: 'code', at: 'E8', lang: 'py', source: DESCENT_STUDY, size: [3, 2] }] },
    ],
  },
  {
    id: 'houses',
    title: 'House prices',
    summary: '120 houses with floor area, bedrooms, distance to the town centre and price. For regression with several inputs.',
    origin: 'Made up for practice, with price = 50 + 2.1 × area + 8 × bedrooms − 4.5 × distance + random noise (in thousands).',
    columns: [['Floor area (m²)', 'The size of the house.'], ['Bedrooms', '1 to 5.'], ['Distance to centre (km)', 'Further out is usually cheaper.'], ['Price (thousands)', 'What a model tries to predict.']],
    rows: async () => housePrices(),
    tries: [
      { label: 'Scatter chart of price against floor area', learn: 'Bigger houses cost more, but the dots spread out: the other inputs matter too.', steps: [{ kind: 'chart', type: 'scatter', source: 'A1:A121,D1:D121', title: 'Price by floor area', xTitle: 'Floor area (m²)', yTitle: 'Price (thousands)', trendline: true }] },
      { label: 'Multiple regression with LINEST', learn: 'LINEST fits all three inputs at once. It lists the coefficients backwards: distance, bedrooms, area, then the intercept.', steps: [{ kind: 'cells', at: 'F1', rows: [['Per km', 'Per bedroom', 'Per m²', 'Intercept'], ['=LINEST(D2:D121, A2:C121)']] }] },
      { label: 'Fit and test a model (Python)', learn: 'Fits on 90 houses and measures the error on 30 it has not seen, the honest way to judge a model. Compare the fitted numbers with the rule the data were made from.', steps: [{ kind: 'code', at: 'F4', lang: 'py', source: REGRESSION_HOUSES, size: [6, 3] }] },
    ],
  },
  {
    id: 'sales',
    title: 'Monthly shop sales',
    summary: 'Three years of monthly sales for three shops and two products: 216 rows to sort, filter, pivot and chart.',
    origin: 'Made up for practice, with steady growth and a yearly pattern (busy Decembers).',
    columns: [['Month', 'Year and month, as text such as 2024-03.'], ['Shop', 'Northgate, Riverside or Old Town.'], ['Product', 'Notebooks or Pens.'], ['Units', 'How many were sold.'], ['Revenue', 'Units × price.']],
    rows: async () => shopSales(),
    tries: [
      { label: 'Revenue by shop and year (pivot table)', learn: 'PIVOTBY with LEFT(month, 4) groups the months into years.', steps: [{ kind: 'cells', at: 'G1', rows: [['=PIVOTBY(B1:B217, LEFT(A1:A217, 4), E1:E217, SUM)']] }] },
      { label: 'Monthly revenue as a line chart', learn: 'GROUPBY adds up each month across the shops; the line shows growth and the December peaks.', steps: [{ kind: 'cells', at: 'G7', rows: [['=GROUPBY(A1:A217, E1:E217, SUM, 3, 0)']] }, { kind: 'chart', type: 'line', source: 'G7:H43', title: 'Revenue per month' }] },
      { label: 'Colour the best months', learn: 'A colour rule marks the top 10% of revenue rows.', steps: [{ kind: 'rule', source: 'E2:E217', rule: { kind: 'top', count: 10, percent: true, style: 'green' } }] },
    ],
  },
]
