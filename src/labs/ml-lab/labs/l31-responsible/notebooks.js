// Lab 31 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The tickets are a NumPy re-run of the playground's simulation (same settings, its own random draws): region B's severity signal is noisier, and one pooled logistic score serves both regions.

export const extras = {
  'l31-data': {
    formulaTex: '$$|\\text{extract}| = |\\text{features}| + |\\text{audit}|$$',
    mathCode: {
      rows: [
        ['features', '[c for c, (perm, use) in inventory.items() if use == "feature"]', 'Permitted columns the model needs.'],
        ['audit', 'use.startswith("audit")', 'Held separately to check groups; never a model input.'],
        ['leak', 'len(after) * after.mean() - len(before) * before.mean()', 'Two published averages reveal one person\'s value.'],
      ],
    },
    notebook: {
      title: 'Lab 31.1 · Permission, privacy and purpose',
      intro: 'A data inventory turned into a minimal training extract, and an aggregate that leaks.',
      cells: [
        {
          title: 'Inventory, extract and a leak',
          prose: '**Predict** how many of the 14 columns the training extract keeps.',
          code: `import numpy as np
# 31.1 A data inventory: every column, whether the agreement permits it for this purpose, and why it would be used.
inventory = {
    "ticket_id":        ("permitted", "join key only"),
    "created_at":       ("permitted", "feature"),           # hour and weekday are derived from it
    "product":          ("permitted", "feature"),
    "severity_words":   ("permitted", "feature"),
    "recent_outages":   ("permitted", "feature"),
    "account_tier":     ("permitted", "feature"),
    "region":           ("permitted for audit", "audit only: never a model input"),
    "customer_name":    ("not needed", ""),
    "customer_email":   ("not needed", ""),
    "phone":            ("not needed", ""),
    "free_text":        ("contains personal details", ""),
    "agent_name":       ("not permitted for this purpose", "would turn triage into staff evaluation"),
    "agent_notes":      ("contains personal details", ""),
    "billing_address":  ("not needed", ""),
}
features = [c for c, (perm, use) in inventory.items() if use == "feature"]
audit = [c for c, (perm, use) in inventory.items() if use.startswith("audit")]
extract = features + audit
print(f"{len(inventory)} columns held; training extract: {len(features)} features + {len(audit)} audit column = {len(extract)}")
print("left out:", [c for c in inventory if c not in extract and c != "ticket_id"])

# Aggregates can leak: publish the mean resolution time of a team, then again after one person joins.
before = np.array([3.1, 4.0, 2.7, 5.2])                 # hours, four existing members
after = np.append(before, 9.6)                          # a new member's first month
revealed = len(after) * after.mean() - len(before) * before.mean()
print(f"two published averages ({before.mean():.3f} h, {after.mean():.3f} h) reveal the newcomer's value: {revealed:.1f} h")`,
        },
      ],
    },
  },
  'l31-subgroups': {
    formulaTex: '$$\\mathrm{TPR}_g = \\frac{\\mathrm{TP}_g}{\\mathrm{TP}_g + \\mathrm{FN}_g}$$',
    mathCode: {
      rows: [
        ['$g$', 'm = group == g', 'The tickets of one region.'],
        ['$\\mathrm{TPR}_g$', 'tp / pos', 'Recall: the share of truly urgent tickets that get flagged.'],
        ['interval', 'wilson(k, n)', 'A 95% interval for each group\'s recall (Lab 05).'],
        ['calibration', 'score[k].mean(), y[k].mean()', 'Predicted against observed rate, within one group.'],
      ],
    },
    notebook: {
      title: 'Lab 31.2 · Subgroup evaluation',
      intro: 'Every metric by region with its sample size and an interval, calibration by region, and how much the gap itself varies.',
      cells: [
        {
          title: 'The audit table',
          prose: '**Predict** which region has the lower recall, and by roughly how much.',
          code: `import numpy as np

def simulate(n=3000, base_a=0.2, base_b=0.35, noise_a=0.8, noise_b=1.6, seed=17):
    """Tickets from two regions; region B's severity signal is recorded less precisely (more noise)."""
    rng = np.random.default_rng(seed)
    group = np.where(rng.random(n) < 0.6, "A", "B")
    y = (rng.random(n) < np.where(group == "A", base_a, base_b)).astype(int)        # truly needs escalation
    signal = np.where(y == 1, 1.5, -1.5) + np.where(group == "A", noise_a, noise_b) * rng.normal(size=n)
    return group, y, signal

def fit_scorer(signal, y, steps=400, lr=0.5):
    """One logistic score for everyone, fitted on the pooled data: the model never sees the region."""
    a = b = 0.0
    for _ in range(steps):
        e = 1 / (1 + np.exp(-(a * signal + b))) - y
        a -= lr * np.mean(e * signal); b -= lr * np.mean(e)
    return lambda s: 1 / (1 + np.exp(-(a * s + b)))

group, y, signal = simulate()
score = fit_scorer(signal, y)(signal)

def rates(y, flagged):
    tp, fp = np.sum(flagged & (y == 1)), np.sum(flagged & (y == 0))
    pos, neg = np.sum(y == 1), np.sum(y == 0)
    return dict(n=len(y), base=pos / len(y), selection=flagged.mean(), tpr=tp / pos, fpr=fp / neg, ppv=tp / (tp + fp), pos=pos)

def wilson(k, n, z=1.96):
    """A 95% interval for a proportion k/n (Lab 05)."""
    p = k / n; c = (p + z * z / (2 * n)) / (1 + z * z / n); h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return c - h, c + h

flagged = score >= 0.5
print("group     n   base  selected  recall (95% interval)   false-pos  precision")
for g in ["A", "B", "all"]:
    m = group == g if g != "all" else np.ones(len(y), bool)
    r = rates(y[m], flagged[m])
    lo, hi = wilson(round(r["tpr"] * r["pos"]), r["pos"])
    print(f"{g:4s} {r['n']:5d}  {r['base']:.3f}  {r['selection']:.3f}     {r['tpr']:.3f} ({lo:.3f}–{hi:.3f})     {r['fpr']:.3f}      {r['ppv']:.3f}")`,
        },
        {
          title: 'Calibration within each group',
          prose: '**Predict**: among region B tickets scored about 0.7, is the observed rate above or below 0.7?',
          code: `# Calibration within each group: among tickets scored about p, what fraction truly needed escalation?
bins = np.minimum((score * 5).astype(int), 4)
for g in ["A", "B"]:
    m = group == g
    row = []
    for b in range(5):
        k = m & (bins == b)
        if k.sum() >= 15:
            row.append(f"{score[k].mean():.2f}→{y[k].mean():.2f}")
    print(f"region {g}: score → observed rate   " + "   ".join(row))`,
        },
        {
          title: 'The gap is noisy too',
          prose: 'Thirty fresh samples of the same world. **Predict** the spread of the recall gap.',
          code: `# How much does the gap itself vary? The same world, 30 fresh samples of 3,000 tickets.
gaps = []
for seed in range(100, 130):
    g, yy, s = simulate(seed=seed)
    sc = fit_scorer(s, yy)(s)
    gaps.append(100 * (np.mean(sc[(g == "A") & (yy == 1)] >= 0.5) - np.mean(sc[(g == "B") & (yy == 1)] >= 0.5)))
print(f"recall gap over 30 samples: mean {np.mean(gaps):.1f} points, smallest {min(gaps):.1f}, largest {max(gaps):.1f}")`,
        },
      ],
    },
  },
  'l31-fairness': {
    formulaTex: '$$P(\\hat y = 1 \\mid g) \\ \\text{vs}\\ \\mathrm{TPR}_g \\ \\text{vs}\\ \\mathrm{PPV}_g$$',
    mathCode: {
      rows: [
        ['$P(\\hat y = 1 \\mid g)$', 'flagged[m].mean()', 'Selection rate (demographic parity).'],
        ['$\\mathrm{TPR}_g$', 'r[\'tpr\']', 'Recall (equal opportunity).'],
        ['$\\mathrm{PPV}_g$', 'r[\'ppv\']', 'Precision (predictive parity).'],
        ['$t_B$', 'at(0.5, t_b)', 'A separate threshold for region B.'],
      ],
    },
    notebook: {
      title: 'Lab 31.3 · Fairness criteria and their trade-offs',
      intro: 'A perfect model that fails demographic parity, and a threshold that equalizes recall at a price.',
      cells: [
        {
          title: 'The audit again',
          prose: 'As in 31.2.',
          code: `import numpy as np

def simulate(n=3000, base_a=0.2, base_b=0.35, noise_a=0.8, noise_b=1.6, seed=17):
    """Tickets from two regions; region B's severity signal is recorded less precisely (more noise)."""
    rng = np.random.default_rng(seed)
    group = np.where(rng.random(n) < 0.6, "A", "B")
    y = (rng.random(n) < np.where(group == "A", base_a, base_b)).astype(int)        # truly needs escalation
    signal = np.where(y == 1, 1.5, -1.5) + np.where(group == "A", noise_a, noise_b) * rng.normal(size=n)
    return group, y, signal

def fit_scorer(signal, y, steps=400, lr=0.5):
    """One logistic score for everyone, fitted on the pooled data: the model never sees the region."""
    a = b = 0.0
    for _ in range(steps):
        e = 1 / (1 + np.exp(-(a * signal + b))) - y
        a -= lr * np.mean(e * signal); b -= lr * np.mean(e)
    return lambda s: 1 / (1 + np.exp(-(a * s + b)))

group, y, signal = simulate()
score = fit_scorer(signal, y)(signal)

def rates(y, flagged):
    tp, fp = np.sum(flagged & (y == 1)), np.sum(flagged & (y == 0))
    pos, neg = np.sum(y == 1), np.sum(y == 0)
    return dict(n=len(y), base=pos / len(y), selection=flagged.mean(), tpr=tp / pos, fpr=fp / neg, ppv=tp / (tp + fp), pos=pos)

def wilson(k, n, z=1.96):
    """A 95% interval for a proportion k/n (Lab 05)."""
    p = k / n; c = (p + z * z / (2 * n)) / (1 + z * z / n); h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return c - h, c + h

flagged = score >= 0.5
print("group     n   base  selected  recall (95% interval)   false-pos  precision")
for g in ["A", "B", "all"]:
    m = group == g if g != "all" else np.ones(len(y), bool)
    r = rates(y[m], flagged[m])
    lo, hi = wilson(round(r["tpr"] * r["pos"]), r["pos"])
    print(f"{g:4s} {r['n']:5d}  {r['base']:.3f}  {r['selection']:.3f}     {r['tpr']:.3f} ({lo:.3f}–{hi:.3f})     {r['fpr']:.3f}      {r['ppv']:.3f}")`,
        },
        {
          title: 'Criteria that conflict',
          prose: '**Predict** what happens to region B’s precision when its threshold is lowered to match A’s recall.',
          code: `# A perfect model flags exactly the true cases. Demographic parity still fails when base rates differ.
for g in ["A", "B"]:
    m = group == g
    print(f"perfect model, region {g}: selection rate {y[m].mean():.3f}, recall 1.000, false-positive rate 0.000")

# One threshold for everyone, then a lower threshold for region B chosen to match A's recall.
def at(t_a, t_b):
    flagged = np.where(group == "A", score >= t_a, score >= t_b)
    return {g: rates(y[group == g], flagged[group == g]) for g in ["A", "B"]}
target = at(0.5, 0.5)["A"]["tpr"]
t_b = max(t for t in np.arange(0.05, 0.51, 0.01) if at(0.5, t)["B"]["tpr"] >= target)
for label, (ta, tb) in [("one threshold 0.50", (0.5, 0.5)), (f"B's threshold {t_b:.2f}", (0.5, t_b))]:
    r = at(ta, tb)
    print(f"{label:19s} recall A {r['A']['tpr']:.3f}  B {r['B']['tpr']:.3f} | false-pos A {r['A']['fpr']:.3f}  B {r['B']['fpr']:.3f} | precision A {r['A']['ppv']:.3f}  B {r['B']['ppv']:.3f}")`,
        },
      ],
    },
  },
  'l31-oversight': {
    formulaTex: '$$\\text{defer} \\iff |s - 0.5| \\le w$$',
    mathCode: {
      rows: [
        ['$s$', 'score', 'The model\'s score for one ticket.'],
        ['$w$', 'w', 'Half-width of the review band.'],
        ['automated', 'np.abs(score - 0.5) > w', 'Decided by the model; the rest go to a person.'],
      ],
    },
    notebook: {
      title: 'Lab 31.4 · Explainability and human oversight',
      intro: 'A review band swept from 0 to 0.25, the widest band a reviewer can handle, and why rubber-stamping is not oversight.',
      cells: [
        {
          title: 'Review band and capacity',
          prose: '**Predict** the accuracy of the automated tickets when about 9% go to review.',
          code: `import numpy as np

def simulate(n=3000, base_a=0.2, base_b=0.35, noise_a=0.8, noise_b=1.6, seed=17):
    """Tickets from two regions; region B's severity signal is recorded less precisely (more noise)."""
    rng = np.random.default_rng(seed)
    group = np.where(rng.random(n) < 0.6, "A", "B")
    y = (rng.random(n) < np.where(group == "A", base_a, base_b)).astype(int)        # truly needs escalation
    signal = np.where(y == 1, 1.5, -1.5) + np.where(group == "A", noise_a, noise_b) * rng.normal(size=n)
    return group, y, signal

def fit_scorer(signal, y, steps=400, lr=0.5):
    """One logistic score for everyone, fitted on the pooled data: the model never sees the region."""
    a = b = 0.0
    for _ in range(steps):
        e = 1 / (1 + np.exp(-(a * signal + b))) - y
        a -= lr * np.mean(e * signal); b -= lr * np.mean(e)
    return lambda s: 1 / (1 + np.exp(-(a * s + b)))

group, y, signal = simulate()
score = fit_scorer(signal, y)(signal)

# A review band: scores within w of 0.5 go to a person; the rest are automated.
correct = (score >= 0.5) == (y == 1)
print("  w   reviewed  automated share  accuracy of automated")
for w in [0, 0.05, 0.1, 0.15, 0.2, 0.25]:
    auto = np.abs(score - 0.5) > w
    print(f"{w:4.2f}   {np.sum(~auto):5d}       {auto.mean():.3f}            {correct[auto].mean():.3f}")
capacity = 200                                           # tickets a reviewer can handle per 3,000
widths = np.arange(0, 0.41, 0.01)
best = max(w for w in widths if np.sum(np.abs(score - 0.5) <= w) <= capacity)
print(f"widest band within {capacity} reviews: w = {best:.2f} ({np.sum(np.abs(score - 0.5) <= best)} tickets)")

# Oversight check: how often do reviewers overrule the model? A rate near 0 means rubber-stamping.
review = np.abs(score - 0.5) <= best
print(f"in the band the model is right on {correct[review].mean():.0%} of tickets — a reviewer who always agrees adds nothing")`,
        },
      ],
    },
  },
  'l31-card': {
    formulaTex: '$$\\text{false alarms per } 100 = 100\\,(1 - \\mathrm{PPV})$$',
    mathCode: {
      rows: [
        ['REQUIRED', '["intended_use", "out_of_scope", "limitations"]', 'The card is refused without them.'],
        ['PPV', 'r[\'ppv\']', 'Precision of the group.'],
        ['frequency', 'round(100 * (1 - r[\'ppv\']))', 'False alarms per 100 flags: easier to read than a percentage.'],
      ],
    },
    notebook: {
      title: 'Lab 31.5 · Model cards and honest communication',
      intro: 'A model card generator that refuses to run without limitations, filled from the audit.',
      cells: [
        {
          title: 'The audit again',
          prose: 'As in 31.2.',
          code: `import numpy as np

def simulate(n=3000, base_a=0.2, base_b=0.35, noise_a=0.8, noise_b=1.6, seed=17):
    """Tickets from two regions; region B's severity signal is recorded less precisely (more noise)."""
    rng = np.random.default_rng(seed)
    group = np.where(rng.random(n) < 0.6, "A", "B")
    y = (rng.random(n) < np.where(group == "A", base_a, base_b)).astype(int)        # truly needs escalation
    signal = np.where(y == 1, 1.5, -1.5) + np.where(group == "A", noise_a, noise_b) * rng.normal(size=n)
    return group, y, signal

def fit_scorer(signal, y, steps=400, lr=0.5):
    """One logistic score for everyone, fitted on the pooled data: the model never sees the region."""
    a = b = 0.0
    for _ in range(steps):
        e = 1 / (1 + np.exp(-(a * signal + b))) - y
        a -= lr * np.mean(e * signal); b -= lr * np.mean(e)
    return lambda s: 1 / (1 + np.exp(-(a * s + b)))

group, y, signal = simulate()
score = fit_scorer(signal, y)(signal)

def rates(y, flagged):
    tp, fp = np.sum(flagged & (y == 1)), np.sum(flagged & (y == 0))
    pos, neg = np.sum(y == 1), np.sum(y == 0)
    return dict(n=len(y), base=pos / len(y), selection=flagged.mean(), tpr=tp / pos, fpr=fp / neg, ppv=tp / (tp + fp), pos=pos)

def wilson(k, n, z=1.96):
    """A 95% interval for a proportion k/n (Lab 05)."""
    p = k / n; c = (p + z * z / (2 * n)) / (1 + z * z / n); h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return c - h, c + h

flagged = score >= 0.5
print("group     n   base  selected  recall (95% interval)   false-pos  precision")
for g in ["A", "B", "all"]:
    m = group == g if g != "all" else np.ones(len(y), bool)
    r = rates(y[m], flagged[m])
    lo, hi = wilson(round(r["tpr"] * r["pos"]), r["pos"])
    print(f"{g:4s} {r['n']:5d}  {r['base']:.3f}  {r['selection']:.3f}     {r['tpr']:.3f} ({lo:.3f}–{hi:.3f})     {r['fpr']:.3f}      {r['ppv']:.3f}")`,
        },
        {
          title: 'The card',
          prose: '**Predict** how many of every 100 region B flags are false alarms.',
          code: `REQUIRED = ["intended_use", "out_of_scope", "limitations"]
def model_card(fields, table):
    missing = [k for k in REQUIRED if not fields.get(k, "").strip()]
    if missing:
        raise ValueError(f"model card is missing: {', '.join(missing)}")
    rows = "\\n".join(f"| {g} | {r['n']} | {r['tpr']:.1%} | {r['fpr']:.1%} | {r['ppv']:.1%} | about {round(100 * (1 - r['ppv']))} in 100 |" for g, r in table.items())
    return (f"# Model card: {fields['name']}\\n\\n## Intended use\\n{fields['intended_use']}\\n\\n## Out of scope\\n{fields['out_of_scope']}\\n\\n"
            f"## Evaluation (threshold 0.5)\\n| group | tickets | recall | false-positive rate | precision | false alarms per 100 flags |\\n|---|---|---|---|---|---|\\n{rows}\\n\\n"
            f"## Limitations\\n{fields['limitations']}\\n")

table = {g: rates(y[group == g], (score >= 0.5)[group == g]) for g in ["A", "B"]}
fields = dict(name="Ticket escalation classifier 1.3.0",
              intended_use="Suggest which tickets an on-call engineer reviews first; a person makes every escalation decision.",
              out_of_scope="Closing tickets automatically; evaluating staff.")
try:
    model_card(fields, table)
except ValueError as e:
    print("refused:", e)
gap = 100 * (table["A"]["tpr"] - table["B"]["tpr"])
fields["limitations"] = (f"Recall in region B is {gap:.0f} points lower than in region A (n = {table['B']['n']}); "
                         "B's severity data are less structured. B tickets in the review band always go to a person.")
print(model_card(fields, table))`,
        },
      ],
    },
  },
}
