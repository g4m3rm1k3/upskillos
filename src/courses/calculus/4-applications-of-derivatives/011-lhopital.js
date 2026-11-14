// FILE: src/content/chapter-3/05-lhopital.js
import lhopitalUrl from '../diagrams/calc-lhopital.svg?url';
import limitsInfinityUrl from '../diagrams/calc-limits-infinity.svg?url';
import lhopitalTableUrl from '../diagrams/calc-lhopital-table.svg?url';
export default {
  id: "ch3-005",
  slug: "lhopital",
  chapter: 3,
  order: 7,
  title: "L'Hôpital's Rule",
  subtitle:
    "When limits produce 0/0 or ∞/∞, differentiate numerator and denominator separately — a consequence of the MVT",
  tags: [
    "l'hopital",
    "l'hopital's rule",
    "indeterminate forms",
    "limits",
    "0/0",
    "infinity over infinity",
    "Cauchy MVT",
    "indeterminate powers",
    "sinc function",
  ],

  hook: {
    question:
      "In Chapter 1 you computed lim(x→0) sin(x)/x = 1 using the squeeze theorem and an intricate geometric argument. But what if you could just differentiate numerator and denominator separately: d/dx[sin(x)] = cos(x), d/dx[x] = 1, giving cos(0)/1 = 1? That shortcut is L'Hôpital's Rule, and it works because the Mean Value Theorem relates the original ratio to the ratio of derivatives.",
    realWorldContext:
      "L'Hôpital's Rule handles all seven indeterminate forms: 0/0, ∞/∞, 0·∞, ∞−∞, 1^∞, 0^0, and ∞^0. These forms appear throughout mathematics and science. The sinc function sin(x)/x (fundamental to signal processing and Fourier analysis) is evaluated at x=0 via L'Hôpital. Population models give 1^∞ limits at long time scales. The normal distribution's bell curve involves evaluating e^(-x²) limits. Laplace transforms require evaluating ∞/∞ forms. In physics, the formula for intensity from a single slit diffraction pattern contains a sin(x)/x factor evaluated at x=0. L'Hôpital's rule is the systematic solution to all of these cases.",
    previewVisualizationId: "LHopitalViz",
  },

  intuition: {
    blocks: [
      {
        type: 'prose',
        paragraphs: [
      "In Chapter 1, you learned that some limits produce the indeterminate form 0/0 — and you handled them by factoring, conjugate multiplication, or trigonometric identities. But those were tricks for special cases. L'Hôpital's Rule is the general weapon: whenever both numerator and denominator approach 0 (or both approach ∞), you can replace the limit of the ratio with the limit of the ratio of derivatives. It sounds almost too simple to be true, but it works because near the limit point, both f(x) and g(x) look like their tangent lines — and the ratio of tangent lines is exactly f'(a)/g'(a).",
      "The basic idea is beautifully simple once you understand linear approximation. Suppose f(c) = 0 and g(c) = 0. Near x = c, both functions are well approximated by their linearizations: f(x) ≈ f'(c)(x-c) and g(x) ≈ g'(c)(x-c) (since f(c) = g(c) = 0, the constant terms vanish). Dividing: f(x)/g(x) ≈ f'(c)(x-c)/[g'(c)(x-c)] = f'(c)/g'(c). The (x-c) factors cancel! L'Hôpital's Rule is the formal version of this linear approximation argument. Near a zero of both numerator and denominator, both functions look like their derivatives times (x-c), and the (x-c) factors cancel in the ratio.",
      "The formal statement: if lim_{x→c} f(x) = 0 and lim_{x→c} g(x) = 0, and if lim_{x→c} f'(x)/g'(x) exists (or equals ±∞), and g'(x) ≠ 0 near c (except possibly at c itself), then lim_{x→c} f(x)/g(x) = lim_{x→c} f'(x)/g'(x). The same rule applies when f(x) → ±∞ and g(x) → ±∞ (the ∞/∞ form), and also for one-sided limits and limits as x → ±∞. The rule can be applied repeatedly: if f'/g' is still 0/0, apply it again. Each application simplifies the problem, typically by reducing the degree of the functions involved.",
        ],
      },
      { type: 'image', src: lhopitalUrl, alt: 'Two curves both hitting zero at a — their ratio approaches the ratio of their slopes', caption: 'When f/g gives 0/0 or ∞/∞, differentiate numerator and denominator separately.' },
      {
        type: 'prose',
        paragraphs: [
      "The other five indeterminate forms (0·∞, ∞-∞, 1^∞, 0^0, ∞^0) all convert to 0/0 or ∞/∞ through algebraic manipulation. For 0·∞: write f(x)·g(x) = f(x)/(1/g(x)) = 0/0, or g(x)/(1/f(x)) = ∞/∞. Which form to use depends on which gives a simpler derivative. For the power forms 1^∞, 0^0, ∞^0: take logarithms. If L = lim f(x)^{g(x)}, then ln(L) = lim g(x)·ln(f(x)). This converts the power form to a 0·∞ limit in the exponent, which then converts to 0/0 or ∞/∞. After evaluating ln(L) = K, conclude L = e^K.",
      "The historical context is extraordinary. L'Hôpital's Rule appears in the 1696 book Analyse des infiniment petits pour l'intelligence des lignes courbes — the first textbook ever published on differential calculus, written by Guillaume de l'Hôpital, a French marquis and amateur mathematician. However, the rule was actually discovered by Johann Bernoulli, who was employed by l'Hôpital as a private tutor. L'Hôpital paid Bernoulli a retainer for the right to use his mathematical discoveries exclusively. The rule in the book was Bernoulli's. L'Hôpital died in 1704; Bernoulli only went public with his claim to the rule after l'Hôpital's death. Correspondence later found in the Bernoulli archive confirmed the story. L'Hôpital's Rule is one of mathematics' most famous cases of misattributed credit.",
        ],
      },
      { type: 'image', src: limitsInfinityUrl, alt: 'Degree comparison for ∞/∞ forms — L\'Hôpital generalizes this technique', caption: 'L\'Hôpital\'s rule applies to all 0/0 and ∞/∞ forms, not just rational functions.' },
      {
        type: 'prose',
        paragraphs: [
      "Critical warning: L'Hôpital's Rule applies ONLY when the limit is genuinely indeterminate (0/0 or ∞/∞). It cannot be applied to a limit like lim_{x→1} (x²-1)/(x-1) if you have not first verified that both numerator and denominator approach 0 (they do — it's 0/0 form). More dangerously, some students apply L'Hôpital to non-indeterminate limits: lim_{x→1} (x+2)/(x-1) approaches 3/0 = ±∞, not 0/0. Applying L'Hôpital here gives lim 1/1 = 1, which is wrong. The correct answer is ±∞ (the limit does not exist). Always verify the indeterminate form FIRST.",
      "Another important limitation: L'Hôpital's Rule can fail even when it seems applicable. Consider lim_{x→∞} (x + sin(x))/x. This appears to be ∞/∞. The rule would give (1 + cos(x))/1, which has no limit as x → ∞ (since cos(x) oscillates). Yet the original limit clearly exists: (x + sin(x))/x = 1 + sin(x)/x → 1 + 0 = 1 (since |sin(x)/x| ≤ 1/x → 0). L'Hôpital's Rule says: IF the limit of f'/g' exists, THEN lim f/g equals it. It says nothing about what happens when f'/g' has no limit. The failure of L'Hôpital does not imply the original limit fails — you must use another method.",
        ],
      },
      { type: 'image', src: lhopitalTableUrl, alt: 'L\'Hôpital\'s rule formula and table of all seven indeterminate forms with strategies', caption: 'Seven indeterminate forms: 0/0 and ∞/∞ apply directly; 0·∞, ∞−∞, 0⁰, 1^∞, ∞⁰ all require algebraic rewriting first.' },
    ],
    callouts: [
      {
        type: "history",
        title: "L'Hôpital Bought Bernoulli's Math",
        body: "Guillaume de l'Hôpital (1661–1704) hired Johann Bernoulli as a private mathematics tutor in 1691 and paid him a monthly salary in exchange for exclusive rights to his mathematical discoveries. The rule in l'Hôpital's 1696 textbook was entirely Bernoulli's. L'Hôpital died before Bernoulli made his claim public. Bernoulli's correspondence confirming this was found in the early 20th century. The rule is still called 'L'Hôpital's Rule' by universal tradition — perhaps the most famous case of mathematical credit being given to a benefactor rather than the discoverer.",
      },
      {
        type: "warning",
        title: "Verify Indeterminate Form FIRST",
        body: "NEVER apply L'Hôpital's Rule without first confirming the limit is 0/0 or ∞/∞. lim_{x→0} (x+1)/x² is NOT indeterminate — it is 1/0 = ∞. Applying L'Hôpital gives 1/(2x) → ∞, which accidentally gives the right answer here, but the method is invalid. Always write '0/0 form' or '∞/∞ form' before applying the rule.",
      },
      {
        type: "misconception",
        title: "L'Hôpital is NOT the Quotient Rule",
        body: "L'Hôpital's Rule: lim f/g = lim f'/g' — differentiate numerator and denominator SEPARATELY.\nQuotient Rule: d/dx[f/g] = (f'g - fg')/g² — completely different!\nThe two formulas look similar but compute entirely different things. Mixing them up is a catastrophic error. L'Hôpital applies to LIMITS; the quotient rule applies to DERIVATIVES.",
      },
      {
        type: "theorem",
        title: "L'Hôpital's Rule",
        body: "If \\lim_{x \\to c} f(x) = \\lim_{x \\to c} g(x) = 0 \\text{ (or both } \\to \\pm\\infty\\text{)},\\\\ g'(x) \\ne 0 \\text{ near } c, \\text{ and } \\lim_{x \\to c} \\frac{f'(x)}{g'(x)} \\text{ exists, then}\\\\ \\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}",
      },
    ],
    visualizations: [
      {
        id: "LHopitalViz",
        title: "L'Hôpital's Rule — Side-by-Side",
        mathBridge:
          "Try the limit lim_{x→0} sin(x)/x. Direct substitution gives 0/0. Apply L'Hôpital: differentiate numerator and denominator separately — d/dx[sin(x)] = cos(x), d/dx[x] = 1. New limit: cos(0)/1 = 1. Confirm visually: as x → 0, the ratio sin(x)/x approaches 1. Now try lim_{x→0} (1 − cos(x))/x². Two applications of L'Hôpital needed: first gives sin(x)/(2x) = 0/0 again, second gives cos(x)/2 → 1/2.",
        caption:
          "L'Hôpital's Rule resolves sin(x)/x → 1 as x → 0: replace the limit of ratio with limit of ratio of derivatives.",
      },
    ],
  },

  math: {
    prose: [
      "Formal statement — 0/0 case: Suppose f and g are differentiable on an open interval I containing c (except possibly at c), f(c) = g(c) = 0 (or both approach 0), and g'(x) ≠ 0 for x ∈ I with x ≠ c. If lim_{x→c} f'(x)/g'(x) = L (where L is finite, +∞, or -∞), then lim_{x→c} f(x)/g(x) = L. The rule applies equally for one-sided limits (x → c⁺ or x → c⁻) and for limits as x → ±∞.",
      "Converting 0·∞ to 0/0 or ∞/∞: if lim f(x) = 0 and lim g(x) = ∞, write f(x)·g(x) = f(x)/(1/g(x)) (now 0/0) or f(x)·g(x) = g(x)/(1/f(x)) (now ∞/∞). Choose the form that gives a simpler derivative. Typically: if one function is a polynomial or algebraic (easy to differentiate repeatedly), put it in the denominator as 1/polynomial. If one factor is an exponential (which reproduces under differentiation), the algebra often simplifies after one or two applications.",
      "Converting ∞-∞ to 0/0: write f(x) - g(x) = 1/(1/f(x)) - 1/(1/g(x)) and combine fractions, or find a common structure. Example: lim_{x→0⁺} (1/sin(x) - 1/x) = lim (x - sin(x))/(x·sin(x)) — now 0/0 form.",
      "Power forms — 1^∞, 0^0, ∞^0: let L = lim f(x)^{g(x)}. Take natural logs: ln(L) = lim g(x)·ln(f(x)). This is a 0·∞ form (for 0^0: g→0, ln(f)→-∞; for 1^∞: g→∞, ln(f)→0; for ∞^0: g→0, ln(f)→∞). Convert to 0/0 or ∞/∞ and apply L'Hôpital. After finding ln(L) = K, conclude L = e^K. The most important examples: lim_{x→∞}(1+1/x)^x = e (1^∞ form, gives ln(L) = 1), and lim_{x→0⁺} x^x = 1 (0^0 form, gives ln(L) = lim x·ln(x) = 0).",
      "Proof of L'Hôpital's Rule via Cauchy's MVT (0/0 case): Since f(c) = g(c) = 0, the Cauchy MVT applies to f and g on [c, x] (or [x,c]) for x near c: f(x)/g(x) = [f(x)-f(c)]/[g(x)-g(c)] = f'(t)/g'(t) for some t strictly between c and x. As x → c, t → c (since t is trapped between c and x). Therefore lim_{x→c} f(x)/g(x) = lim_{t→c} f'(t)/g'(t) = L. ∎",
    ],
    callouts: [
      {
        type: "definition",
        title: "The Seven Indeterminate Forms",
        body: "\\frac{0}{0}, \\quad \\frac{\\infty}{\\infty}, \\quad 0 \\cdot \\infty, \\quad \\infty - \\infty, \\quad 1^\\infty, \\quad 0^0, \\quad \\infty^0",
        extra:
          "All seven reduce to 0/0 or ∞/∞ through algebraic manipulation. The power forms use L'Hôpital on the logarithm.",
      },
      {
        type: "definition",
        title: "Conversion Strategy for Indeterminate Forms",
        body: "0 \\cdot \\infty \\to \\frac{0}{1/\\infty} = \\frac{0}{0} \\quad \\text{or} \\quad \\frac{\\infty}{1/0} = \\frac{\\infty}{\\infty}\\\\ f^g \\to e^{g \\ln f}: \\text{ apply L'Hôpital to } g \\ln f",
      },
    ],
    visualizations: [
      {
        id: "PythonNotebook",
        title: "Python Lab: Verify All 7 Indeterminate Forms Numerically",
        caption:
          "Compute limits numerically by approaching from both sides and compare to L'Hôpital's analytical answer. Expose the failure case.",
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: "0/0 and ∞/∞: numerical approach vs L'Hôpital",
              prose: [
                "**Strategy**: approach x → c from both sides with small steps and watch f(x)/g(x) converge.",
                "L'Hôpital's theoretical answer: differentiate numerator & denominator separately.",
              ],
              instructions:
                "Run this cell then change f/g to any 0/0 limit you want to verify.",
              code: `import math

def numerical_limit(f, g, c, side='both', steps=8):
    """Approach x -> c and print f(x)/g(x)."""
    deltas = [10**(-k) for k in range(1, steps+1)]
    sign   = -1 if side == 'left' else 1
    print(f"Approaching x -> {c} from {'left' if side=='left' else 'right'}:")
    for d in deltas:
        x   = c + sign * d
        try:
            ratio = f(x) / g(x)
            print(f"  x={x:>14.10f}  f(x)/g(x) = {ratio:.12f}")
        except ZeroDivisionError:
            print(f"  x={x:.10f}  ZeroDivisionError")

# Example 1: sin(x)/x  -> 1  as x->0  (0/0 form)
print("=" * 55)
print("lim(x->0) sin(x)/x   [L'Hopital: cos(0)/1 = 1]")
print("=" * 55)
numerical_limit(math.sin, lambda x: x, c=0, side='right')

# Example 2: (e^x - 1)/x -> 1 as x->0  (0/0 form)
print()
print("=" * 55)
print("lim(x->0) (e^x-1)/x  [L'Hopital: e^0/1 = 1]")
print("=" * 55)
numerical_limit(lambda x: math.exp(x)-1, lambda x: x, c=0, side='right')`,
              output: "",
              status: "idle",
              figureJson: null,
            },
            {
              id: 2,
              cellTitle: "0·∞, 1^∞, 0^0 power forms \u2014 all resolve via ln",
              prose: [
                "**Trick**: for $f(x)^{g(x)}$, take $\\ln L = \\lim g(x)\\ln f(x)$, then $L = e^{\\ln L}$.",
                "| Form | Example | Answer |",
                "|---|---|---|",
                "| $0 \\cdot \\infty$ | $x \\ln x \\to 0^+$ | $0$ |",
                "| $0^0$ | $x^x \\to 0^+$ | $1$ |",
                "| $1^\\infty$ | $(1+1/x)^x \\to \\infty$ | $e$ |",
              ],
              code: `import math

print("Form 0*inf: lim(x->0+) x*ln(x)")
for x in [0.1, 0.01, 0.001, 0.0001, 0.00001]:
    print(f"  x={x:>8.5f}  x*ln(x) = {x*math.log(x):>12.8f}")
print("  L'Hopital answer: 0")

print()
print("Form 0^0: lim(x->0+) x^x")
for x in [0.1, 0.01, 0.001, 0.0001]:
    print(f"  x={x:>8.5f}  x^x = {x**x:.10f}")
print("  L'Hopital answer: 1 (ln L = lim x*ln(x) = 0 => L=e^0=1)")

print()
print("Form 1^inf: lim(x->inf) (1 + 1/x)^x")
for x in [10, 100, 1000, 10000, 100000]:
    print(f"  x={x:>8}  (1+1/x)^x = {(1+1/x)**x:.10f}")
print(f"  True value of e = {math.e:.10f}")
print("  L'Hopital answer: e (ln L = lim x*ln(1+1/x) = 1 => L=e^1=e)")`,
              output: "",
              status: "idle",
              figureJson: null,
            },
            {
              id: 3,
              cellTitle: "L'Hôpital failure: (x + sin x)/x",
              prose: [
                "Applying the rule: $\\lim \\frac{1+\\cos x}{1}$ — no limit (oscillates).",
                "Yet the original limit clearly equals **1** by algebra.",
                "The rule **requires** $\\lim f'/g'$ to exist — if it doesn't, you must use another method.",
              ],
              code: `from opencalc import Figure
import math

# The original limit DOES exist: (x+sin x)/x = 1 + sin(x)/x -> 1
print("Original limit: (x + sin x) / x")
for x in [10, 100, 1000, 10000]:
    val = (x + math.sin(x)) / x
    print(f"  x={x:>6}  value = {val:.10f}")
print("Correct limit = 1 (squeeze theorem)")

# But L'Hopital gives (1 + cos x)/1 which oscillates
print()
print("L'Hopital suggests: (1 + cos x)/1")
for x in [10, 100, 1000, 10000]:
    val = 1 + math.cos(x)
    print(f"  x={x:>6}  1+cos(x) = {val:.6f}  (oscillates between 0 and 2)")

# Plot to visualize the oscillation
fig = Figure(xmin=0, xmax=50, ymin=-0.5, ymax=2.5,
    title="(x+sin x)/x = 1 (true limit), but (1+cos x) oscillates")
fig.grid().axes()
fig.plot(lambda x: (x+math.sin(x))/x if x>0 else 1,
    color='blue', label='(x+sin x)/x', width=2.5)
fig.plot(lambda x: 1+math.cos(x), color='red',
    label="L'Hopital candidate 1+cos(x)", width=1.5)
fig.hline(1, color='amber', dashed=True)
fig.show()`,
              output: "",
              status: "idle",
              figureJson: null,
            },
            {
              id: 4,
              challengeType: "write",
              challengeTitle:
                "Your Turn: Evaluate lim(x→0) (1 − cos x)/x² three ways",
              difficulty: "medium",
              prompt:
                "Compute lim(x→0) (1-cos x)/x².\n\n1. Numerically: approach x=0 and observe the value converging\n2. L'Hôpital: apply twice (0/0 form each time)\n3. Power series: 1 - cos x = x²/2 - x⁴/24 + ..., so (1-cos x)/x² ≈ 1/2\n\nAnswer: 1/2",
              hint: "L'Hôpital step 1: sin(x)/(2x) — still 0/0. Step 2: cos(x)/2 → 1/2.",
              code: `import math

# Step 1: numerical approach
print("Numerical approach to lim(x->0) (1 - cos x) / x^2:")
for x in [0.1, 0.01, 0.001, 0.0001]:
    val = (1 - math.cos(x)) / x**2
    print(f"  x={x:>7.4f}  value = {val:.10f}")
print()

# YOUR CODE - Step 2: verify with L'Hopital (just print the answer)
# print("L'Hopital: first d(1-cos x)/d(x^2) = sin(x)/(2x) ... still 0/0")
# print("Second application: cos(x)/2 -> 1/2")

# YOUR CODE - Step 3: power series check
# from decimal import Decimal
# import math
# x = 0.001
# cos_approx = 1 - x**2/2 + x**4/24   # first two nonzero terms of cos
# print(f"Power series (1 - cos_approx)/x^2 = {(1-cos_approx)/x**2:.10f}")`,
              output: "",
              status: "idle",
              figureJson: null,
            },
          ],
        },
      },
    ],
  },

  rigor: {
    prose: [
      "Complete proof of L'Hôpital's Rule (0/0 case) using Cauchy's MVT: Let f, g be continuous on [a,b], differentiable on (a,b), with f(c) = g(c) = 0 and g'(x) ≠ 0 on (a,b). For any x ≠ c in (a,b), the Cauchy MVT applies to f and g on the interval [min(c,x), max(c,x)]: there exists t strictly between c and x such that f'(t)[g(x)-g(c)] = g'(t)[f(x)-f(c)]. Since f(c) = g(c) = 0: f'(t)·g(x) = g'(t)·f(x). Since g'(t) ≠ 0 (by hypothesis) and g(x) ≠ 0 for x near c (since g'≠0 and g(c)=0, g is locally monotone, so g(x) ≠ 0 near c): f(x)/g(x) = f'(t)/g'(t). As x → c, t → c (since t is strictly between c and x). Therefore lim_{x→c} f(x)/g(x) = lim_{t→c} f'(t)/g'(t) = L. ∎",
      "Why the ∞/∞ case is harder: when f(x) → ∞ and g(x) → ∞, we cannot write f(x)/g(x) = [f(x)-0]/[g(x)-0] because f(c) ≠ 0. The Cauchy MVT trick requires f(c) = 0 and g(c) = 0. For the ∞/∞ case, a different argument is needed — typically via the Stolz-Cesàro theorem (the discrete analog) or by showing lim f/g = lim f'/g' using a more delicate limit argument involving writing f(x)/g(x) = [f(x)-f(a)]/[g(x)-g(a)]·[1 - f(a)/f(x)]/[1 - g(a)/g(x)] and taking a → c. The ∞/∞ proof is found in Rudin's Principles of Mathematical Analysis.",
      "When L'Hôpital fails: the rule requires lim f'/g' to exist. If f'/g' oscillates without a limit, the rule gives no information — but the original limit may still exist. The canonical example: lim_{x→∞} (x + sin(x))/x. Applying the rule: lim (1 + cos(x))/1 = lim (1 + cos(x)), which oscillates between 0 and 2 — no limit. Yet (x + sin(x))/x = 1 + sin(x)/x → 1 + 0 = 1 by the squeeze theorem. L'Hôpital's rule said nothing wrong — it was inapplicable, since lim f'/g' does not exist. The lesson: if L'Hôpital gives an indeterminate result or oscillation, try another method. The failure of L'Hôpital does not imply the original limit fails.",
      "Repeated application: the rule can be applied as many times as necessary, as long as each intermediate limit is still 0/0 or ∞/∞. For example, lim_{x→0} (1-cos(x))/x² is 0/0. Apply: lim sin(x)/(2x) — still 0/0. Apply again: lim cos(x)/2 = 1/2. Each application removes one degree of the Taylor polynomial in both numerator and denominator, eventually leaving a well-defined limit. For polynomials, the number of applications equals the common order of vanishing at c.",
    ],
    callouts: [
      {
        type: "warning",
        title: "L'Hôpital Can Fail Even for ∞/∞",
        body: "lim_{x→∞} (x+sin x)/x = 1, but applying L'Hôpital gives lim (1+cos x)/1, which has no limit. The rule does not apply here — lim f'/g' must exist for the rule to be valid. The absence of a limit for f'/g' is not a contradiction; it just means L'Hôpital cannot be used.",
      },
    ],
    visualizations: [],
  },

  examples: [
    {
      id: "ch3-005-ex1",
      title: "Classic: lim(x→0) sin(x)/x",
      problem:
        "\\text{Evaluate } \\displaystyle\\lim_{x \\to 0} \\frac{\\sin(x)}{x} \\text{ using L'Hôpital's Rule.}",

      steps: [
        {
          expression:
            "\\text{Verify: } \\sin(0) = 0, \\; 0 \\text{ in denominator} \\Rightarrow \\frac{0}{0} \\text{ form} \\checkmark",
          annotation:
            "Always verify the indeterminate form before applying L'Hôpital.",
          strategyTitle:
            "Step 1: Verify the indeterminate form — substitute and check for 0/0 or ∞/∞",
          checkpoint:
            "L'Hôpital's Rule ONLY applies to 0/0 or ∞/∞. What happens if you substitute and get 5/0? Can you use L'Hôpital?",
          hints: [
            "Level 1: Substitute x = 0 (or whatever the limit point is) into numerator and denominator separately. If both give 0, it's 0/0 form — L'Hôpital applies.",
            "Level 2: If direct substitution gives a/0 with a ≠ 0, the limit is ±∞ (not indeterminate). L'Hôpital does NOT apply — the limit either diverges or doesn't exist.",
            "Level 3: The other 5 indeterminate forms (0·∞, ∞−∞, 1^∞, 0⁰, ∞⁰) require algebraic manipulation FIRST to convert them to 0/0 or ∞/∞ before L'Hôpital can be applied.",
          ],
        },
        {
          expression:
            "\\lim_{x \\to 0} \\frac{\\sin(x)}{x} \\overset{\\text{L'H}}{=} \\lim_{x \\to 0} \\frac{\\cos(x)}{1}",
          annotation:
            "Apply L'Hôpital: differentiate numerator (sin(x))' = cos(x) and denominator (x)' = 1 separately.",
          strategyTitle:
            "Step 2: Apply L'Hôpital — differentiate numerator and denominator SEPARATELY",
          checkpoint:
            "Critical warning: L'Hôpital means d/dx[numerator] / d/dx[denominator] — NOT the quotient rule on the whole fraction. Are you differentiating top and bottom separately?",
          hints: [
            "Level 1: Take the derivative of the numerator. Take the derivative of the denominator. Write the new fraction of those two derivatives.",
            "Level 2: L'Hôpital's Rule: if lim[f(x)/g(x)] = 0/0 or ∞/∞, then lim[f(x)/g(x)] = lim[f'(x)/g'(x)]. This is NOT the quotient rule — it's two separate derivatives.",
            "Level 3: The intuition: near the limit point, f(x) ≈ f'(a)(x−a) and g(x) ≈ g'(a)(x−a). Their ratio f(x)/g(x) ≈ f'(a)/g'(a) as x → a — the (x−a) factors cancel.",
          ],
        },
        {
          expression: "= \\frac{\\cos(0)}{1} = \\frac{1}{1} = 1",
          annotation:
            "Substitute x = 0. No longer indeterminate. The limit is 1.",
          strategyTitle:
            "Step 3: Evaluate the new limit — direct substitution if no longer indeterminate",
          checkpoint:
            "After applying L'Hôpital, is the new limit still 0/0 or ∞/∞? If yes, you may need to apply L'Hôpital again.",
          hints: [
            "Level 1: Substitute the limit point into the new fraction f'(x)/g'(x). If it gives a finite number, that is the answer.",
            "Level 2: If the new limit is still 0/0, apply L'Hôpital a second time. You may need to apply it multiple times for harder limits.",
            "Level 3: Always verify: can you get the same answer by an alternate method (factoring, Taylor series)? For ex3, factoring gives x²+x+1 → 3. For ex1, the squeeze theorem gives the same result 1.",
          ],
        },
      ],
      conclusion:
        "lim(x→0) sin(x)/x = 1, confirmed by L'Hôpital. This matches the squeeze-theorem result from Chapter 1. L'Hôpital is much faster but requires knowing the derivative of sin(x), which was itself proved using the squeeze theorem limit. Avoid circular reasoning.",
    },
    {
      id: "ch3-005-ex2",
      title: "lim(x→0) (e^x - 1)/x",
      problem: "\\displaystyle\\lim_{x \\to 0} \\frac{e^x - 1}{x}",
      steps: [
        {
          expression:
            "e^0 - 1 = 0, \\; x = 0 \\Rightarrow 0/0 \\text{ form} \\checkmark",
          annotation: "Verify: both numerator and denominator approach 0.",
          strategyTitle:
            "Step 1: Verify the indeterminate form — substitute and check for 0/0 or ∞/∞",
          checkpoint:
            "L'Hôpital's Rule ONLY applies to 0/0 or ∞/∞. What happens if you substitute and get 5/0? Can you use L'Hôpital?",
          hints: [
            "Level 1: Substitute x = 0 (or whatever the limit point is) into numerator and denominator separately. If both give 0, it's 0/0 form — L'Hôpital applies.",
            "Level 2: If direct substitution gives a/0 with a ≠ 0, the limit is ±∞ (not indeterminate). L'Hôpital does NOT apply — the limit either diverges or doesn't exist.",
            "Level 3: The other 5 indeterminate forms (0·∞, ∞−∞, 1^∞, 0⁰, ∞⁰) require algebraic manipulation FIRST to convert them to 0/0 or ∞/∞ before L'Hôpital can be applied.",
          ],
        },
        {
          expression:
            "\\lim_{x \\to 0} \\frac{e^x - 1}{x} \\overset{\\text{L'H}}{=} \\lim_{x \\to 0} \\frac{e^x}{1} = e^0 = 1",
          annotation:
            "Differentiate: (e^x - 1)' = e^x. (x)' = 1. The limit is e^0 = 1.",
          strategyTitle:
            "Step 2: Apply L'Hôpital — differentiate numerator and denominator SEPARATELY",
          checkpoint:
            "Critical warning: L'Hôpital means d/dx[numerator] / d/dx[denominator] — NOT the quotient rule on the whole fraction. Are you differentiating top and bottom separately?",
          hints: [
            "Level 1: Take the derivative of the numerator. Take the derivative of the denominator. Write the new fraction of those two derivatives.",
            "Level 2: L'Hôpital's Rule: if lim[f(x)/g(x)] = 0/0 or ∞/∞, then lim[f(x)/g(x)] = lim[f'(x)/g'(x)]. This is NOT the quotient rule — it's two separate derivatives.",
            "Level 3: The intuition: near the limit point, f(x) ≈ f'(a)(x−a) and g(x) ≈ g'(a)(x−a). Their ratio f(x)/g(x) ≈ f'(a)/g'(a) as x → a — the (x−a) factors cancel.",
          ],
        },
      ],
      conclusion:
        "lim(x→0) (e^x - 1)/x = 1. This is the limit definition of e^x's derivative at x=0, confirming that (d/dx)[e^x]|_{x=0} = 1. L'Hôpital makes this immediate.",
    },
    {
      id: "ch3-005-ex3",
      title: "lim(x→1) (x³ - 1)/(x - 1)",
      problem: "\\displaystyle\\lim_{x \\to 1} \\frac{x^3 - 1}{x - 1}",
      steps: [
        {
          expression:
            "1^3 - 1 = 0, \\; 1 - 1 = 0 \\Rightarrow 0/0 \\text{ form}",
          annotation: "Verify indeterminate form.",
          strategyTitle:
            "Step 1: Verify the indeterminate form — substitute and check for 0/0 or ∞/∞",
          checkpoint:
            "L'Hôpital's Rule ONLY applies to 0/0 or ∞/∞. What happens if you substitute and get 5/0? Can you use L'Hôpital?",
          hints: [
            "Level 1: Substitute x = 0 (or whatever the limit point is) into numerator and denominator separately. If both give 0, it's 0/0 form — L'Hôpital applies.",
            "Level 2: If direct substitution gives a/0 with a ≠ 0, the limit is ±∞ (not indeterminate). L'Hôpital does NOT apply — the limit either diverges or doesn't exist.",
            "Level 3: The other 5 indeterminate forms (0·∞, ∞−∞, 1^∞, 0⁰, ∞⁰) require algebraic manipulation FIRST to convert them to 0/0 or ∞/∞ before L'Hôpital can be applied.",
          ],
        },
        {
          expression:
            "\\lim_{x \\to 1} \\frac{x^3-1}{x-1} \\overset{\\text{L'H}}{=} \\lim_{x \\to 1} \\frac{3x^2}{1} = 3(1)^2 = 3",
          annotation:
            "Apply L'Hôpital: differentiate numerator 3x², denominator 1.",
          strategyTitle:
            "Step 2: Apply L'Hôpital — differentiate numerator and denominator SEPARATELY",
          checkpoint:
            "Critical warning: L'Hôpital means d/dx[numerator] / d/dx[denominator] — NOT the quotient rule on the whole fraction. Are you differentiating top and bottom separately?",
          hints: [
            "Level 1: Take the derivative of the numerator. Take the derivative of the denominator. Write the new fraction of those two derivatives.",
            "Level 2: L'Hôpital's Rule: if lim[f(x)/g(x)] = 0/0 or ∞/∞, then lim[f(x)/g(x)] = lim[f'(x)/g'(x)]. This is NOT the quotient rule — it's two separate derivatives.",
            "Level 3: The intuition: near the limit point, f(x) ≈ f'(a)(x−a) and g(x) ≈ g'(a)(x−a). Their ratio f(x)/g(x) ≈ f'(a)/g'(a) as x → a — the (x−a) factors cancel.",
          ],
        },
        {
          expression:
            "\\text{Check by factoring: } \\frac{x^3-1}{x-1} = \\frac{(x-1)(x^2+x+1)}{x-1} = x^2+x+1 \\to 3 \\text{ as } x \\to 1",
          annotation:
            "Alternative: factor. Same answer confirms L'Hôpital is correct.",
          strategyTitle:
            "Step 3: Evaluate the new limit — direct substitution if no longer indeterminate",
          checkpoint:
            "After applying L'Hôpital, is the new limit still 0/0 or ∞/∞? If yes, you may need to apply L'Hôpital again.",
          hints: [
            "Level 1: Substitute the limit point into the new fraction f'(x)/g'(x). If it gives a finite number, that is the answer.",
            "Level 2: If the new limit is still 0/0, apply L'Hôpital a second time. You may need to apply it multiple times for harder limits.",
            "Level 3: Always verify: can you get the same answer by an alternate method (factoring, Taylor series)? For ex3, factoring gives x²+x+1 → 3. For ex1, the squeeze theorem gives the same result 1.",
          ],
        },
      ],
      conclusion:
        "The limit is 3. Both L'Hôpital and factoring work; the factoring approach is neater when the factorization is obvious. L'Hôpital is preferable for transcendental functions where factoring is impossible.",
    },
    {
      id: "ch3-005-ex4",
      title: "lim(x→∞) x·e^(-x): 0·∞ Form",
      problem: "\\displaystyle\\lim_{x \\to \\infty} x \\cdot e^{-x}",
      steps: [
        {
          expression:
            "x \\to \\infty, \\; e^{-x} \\to 0 \\Rightarrow 0 \\cdot \\infty \\text{ form}",
          annotation: "Identify the indeterminate form.",
        },
        {
          expression:
            "x \\cdot e^{-x} = \\frac{x}{e^x} \\Rightarrow \\frac{\\infty}{\\infty} \\text{ form}",
          annotation:
            "Rewrite as a ratio: move e^{-x} to the denominator as e^x.",
        },
        {
          expression:
            "\\lim_{x \\to \\infty} \\frac{x}{e^x} \\overset{\\text{L'H}}{=} \\lim_{x \\to \\infty} \\frac{1}{e^x} = 0",
          annotation:
            "Apply L'Hôpital: (x)' = 1, (e^x)' = e^x. The result 1/e^x → 0 as x → ∞.",
        },
      ],
      conclusion:
        "lim(x→∞) x·e^{-x} = 0. Exponential growth dominates polynomial growth. More generally, lim_{x→∞} x^n e^{-x} = 0 for any fixed n — apply L'Hôpital n times, each time reducing the power of x by 1.",
    },
    {
      id: "ch3-005-ex5",
      title: "lim(x→0⁺) x·ln(x): 0·∞ Form",
      problem: "\\displaystyle\\lim_{x \\to 0^+} x \\ln(x)",
      steps: [
        {
          expression:
            "x \\to 0^+, \\; \\ln(x) \\to -\\infty \\Rightarrow 0 \\cdot (-\\infty) \\text{ form}",
          annotation: "Identify: 0·∞ indeterminate form.",
        },
        {
          expression:
            "x \\ln(x) = \\frac{\\ln(x)}{1/x} \\Rightarrow \\frac{-\\infty}{+\\infty} \\text{ form}",
          annotation: "Rewrite: put 1/x in denominator. Now ∞/∞ form.",
        },
        {
          expression:
            "\\lim_{x \\to 0^+} \\frac{\\ln(x)}{1/x} \\overset{\\text{L'H}}{=} \\lim_{x \\to 0^+} \\frac{1/x}{-1/x^2}",
          annotation: "Differentiate: (ln x)' = 1/x, (1/x)' = -1/x².",
        },
        {
          expression:
            "= \\lim_{x \\to 0^+} \\frac{1/x \\cdot x^2}{-1} = \\lim_{x \\to 0^+} \\frac{-x^2/x}{1} = \\lim_{x \\to 0^+} (-x) = 0",
          annotation:
            "Simplify the ratio: (1/x)/(-1/x²) = (1/x)·(-x²) = -x → 0.",
        },
      ],
      conclusion:
        "lim(x→0⁺) x ln(x) = 0. Although ln(x) → -∞ as x → 0⁺, the factor x → 0 wins. This result appears in the entropy formula -x·ln(x) → 0 as x → 0 (a probability of 0 contributes 0 to entropy), which is important in information theory.",
    },
    {
      id: "ch3-005-ex6",
      title: "lim(x→0⁺) x^x: 0^0 Form",
      problem: "\\displaystyle\\lim_{x \\to 0^+} x^x",
      steps: [
        {
          expression:
            "x \\to 0^+, \\; \\text{base} = x \\to 0, \\; \\text{exponent} = x \\to 0 \\Rightarrow 0^0 \\text{ form}",
          annotation: "Identify the 0^0 indeterminate form.",
        },
        {
          expression:
            "L = \\lim_{x \\to 0^+} x^x \\Rightarrow \\ln(L) = \\lim_{x \\to 0^+} x \\ln(x)",
          annotation: "Take logarithm of both sides: ln(x^x) = x·ln(x).",
        },
        {
          expression:
            "\\lim_{x \\to 0^+} x \\ln(x) = 0 \\quad (\\text{from Example 5})",
          annotation: "We computed this limit in Example 5 above.",
        },
        {
          expression: "\\ln(L) = 0 \\Rightarrow L = e^0 = 1",
          annotation: "Since ln(L) = 0, exponentiate: L = e^0 = 1.",
        },
      ],
      conclusion:
        "lim(x→0⁺) x^x = 1. The 0^0 indeterminate form resolves to 1 in this case. Note: 0^0 is not always 1 — the value depends on how the base and exponent approach 0. The function f(x) = x^x approaches 1 as x → 0⁺, and by convention 0^0 = 1 in combinatorics.",
    },
    {
      id: "ch3-005-ex7",
      title: "lim(x→∞) (1 + 1/x)^x = e: the 1^∞ Form",
      problem:
        "\\displaystyle\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x",
      steps: [
        {
          expression:
            "\\text{Base} = 1 + 1/x \\to 1, \\; \\text{Exponent} = x \\to \\infty \\Rightarrow 1^\\infty \\text{ form}",
          annotation: "Identify the 1^∞ indeterminate form.",
        },
        {
          expression:
            "L = \\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^x \\Rightarrow \\ln(L) = \\lim_{x\\to\\infty} x \\cdot \\ln\\!\\left(1+\\frac{1}{x}\\right)",
          annotation:
            "Take logarithm. Now we have a 0·∞ form: x → ∞ and ln(1+1/x) → 0.",
        },
        {
          expression:
            "x \\cdot \\ln(1+1/x) = \\frac{\\ln(1 + 1/x)}{1/x} \\Rightarrow \\frac{0}{0} \\text{ form as } x \\to \\infty",
          annotation:
            "Rewrite as ratio (1/x in denominator). Both numerator and denominator → 0.",
        },
        {
          expression:
            "\\overset{\\text{L'H}}{=} \\lim_{x\\to\\infty} \\frac{\\frac{-1/x^2}{1+1/x}}{-1/x^2} = \\lim_{x\\to\\infty} \\frac{1}{1+1/x}",
          annotation:
            "Apply L'Hôpital. Numerator derivative: d/dx[ln(1+1/x)] = (1/(1+1/x))·(-1/x²). Denominator derivative: d/dx[1/x] = -1/x². The -1/x² factors cancel.",
        },
        {
          expression: "= \\lim_{x\\to\\infty} \\frac{1}{1 + 0} = 1",
          annotation: "As x → ∞, 1/x → 0, so the limit is 1.",
        },
        {
          expression: "\\ln(L) = 1 \\Rightarrow L = e^1 = e",
          annotation:
            "Exponentiate: L = e. This is the definition of e as a limit.",
        },
      ],
      conclusion:
        "lim(x→∞)(1+1/x)^x = e. This is one of the most important limits in mathematics — it is sometimes taken as the definition of e. L'Hôpital makes the proof systematic. The limit (1+r/n)^n → e^r as n → ∞ is the basis of continuous compounding in finance.",
    },
    {
      id: "ch3-005-ex8",
      title: "Classic (0/0): lim(x→2) (x²-4)/(x-2)",
      problem: "\\text{Evaluate } \\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}",
      steps: [
        {
          expression: "\\frac{4 - 4}{0} = \\frac{0}{0} \\checkmark",
          annotation: "Plug in x=2: indeterminate 0/0 form.",
          strategyTitle: "Step 1: Verify indeterminate form",
          checkpoint:
            "Always check if the limit produces 0/0 or ∞/∞ before applying L'Hôpital.",
        },
        {
          expression: "x^2 - 4 = (x-2)(x+2)",
          annotation: "Factor the numerator using difference of squares.",
          strategyTitle: "Step 2: Algebra first — factor",
          checkpoint:
            "L'Hôpital is not always needed. Algebra often solves 0/0 forms directly.",
        },
        {
          expression: "\\frac{(x-2)(x+2)}{x-2}",
          annotation: "Substitute the factored form.",
          strategyTitle: "Step 3: Cancel common factors",
        },
        {
          expression: "x+2",
          annotation: "Cancel (x-2) from numerator and denominator.",
          strategyTitle: "Step 4: Simplify",
        },
        {
          expression: "2+2 = 4",
          annotation: "Evaluate at x=2.",
          strategyTitle: "Step 5: Evaluate the limit",
        },
      ],
      conclusion:
        "The limit is 4. Notice: No L'Hôpital needed — algebra solved it. This is the key insight: indeterminate forms often hide algebraic simplifications.",
    },
    {
      id: "ch3-005-ex9",
      title: "Radical (∞-∞): lim(x→∞) (√(x²+5x) - x)",
      problem:
        "\\text{Evaluate } \\lim_{x \\to \\infty} \\left( \\sqrt{x^2 + 5x} - x \\right)",
      steps: [
        {
          expression: "\\infty - \\infty \\text{ form}",
          annotation: "Identify the indeterminate form.",
          strategyTitle: "Step 1: Identify indeterminate form",
        },
        {
          expression:
            "\\frac{(\\sqrt{x^2+5x}-x)(\\sqrt{x^2+5x}+x)}{\\sqrt{x^2+5x}+x}",
          annotation: "Multiply by conjugate to rationalize.",
          strategyTitle: "Step 2: Multiply by conjugate",
        },
        {
          expression:
            "\\frac{(x^2+5x) - x^2}{\\sqrt{x^2+5x}+x} = \\frac{5x}{\\sqrt{x^2+5x}+x}",
          annotation: "Apply difference of squares: numerator becomes 5x.",
          strategyTitle: "Step 3: Apply identity",
        },
        {
          expression:
            "\\sqrt{x^2+5x} = \\sqrt{x^2(1 + 5/x)} = x\\sqrt{1 + 5/x}",
          annotation: "Factor x from the radical.",
          strategyTitle:
            "Step 4: Factor (x) — this is the skipped step students miss",
        },
        {
          expression: "\\frac{5x}{x\\sqrt{1+5/x} + x}",
          annotation: "Substitute: denominator becomes x(√(1+5/x) + 1).",
          strategyTitle: "Step 5: Factor out (x)",
        },
        {
          expression:
            "\\frac{5x}{x(\\sqrt{1+5/x}+1)} = \\frac{5}{\\sqrt{1+5/x}+1}",
          annotation: "Cancel x from numerator and denominator.",
          strategyTitle: "Step 6: Cancel (x)",
        },
        {
          expression: "\\frac{5}{1+1} = \\frac{5}{2}",
          annotation: "As x→∞, 5/x→0, so √(1+5/x)→1.",
          strategyTitle: "Step 7: Evaluate limit",
        },
      ],
      conclusion:
        "The limit is 5/2. The key algebraic step (factoring x from the radical) is often skipped in textbooks, leaving students confused.",
    },
    {
      id: "ch3-005-ex10",
      title: "(0·∞): lim(x→0⁺) x·ln(x)",
      problem: "\\text{Evaluate } \\lim_{x \\to 0^+} x \\ln(x)",
      steps: [
        {
          expression:
            "x \\to 0^+, \\; \\ln(x) \\to -\\infty \\Rightarrow 0 \\cdot (-\\infty)",
          annotation: "Identify: 0·∞ indeterminate form.",
          strategyTitle: "Step 1: Identify form",
        },
        {
          expression: "x \\ln(x) = \\frac{\\ln(x)}{1/x}",
          annotation: "Rewrite product as fraction.",
          strategyTitle: "Step 2: Rewrite as fraction",
        },
        {
          expression: "\\frac{-\\infty}{\\infty} \\text{ form}",
          annotation: "New form: ∞/∞.",
          strategyTitle: "Step 3: New indeterminate form",
        },
        {
          expression: "\\overset{\\text{L'H}}{=} \\frac{1/x}{-1/x^2} = -x",
          annotation:
            "Apply L'Hôpital: differentiate numerator and denominator.",
          strategyTitle: "Step 4: Apply L'Hôpital",
        },
        {
          expression: "\\lim_{x \\to 0^+} (-x) = 0",
          annotation: "Evaluate: -x → 0 as x → 0⁺.",
          strategyTitle: "Step 5: Evaluate limit",
        },
      ],
      conclusion:
        "The limit is 0. Rewriting products as fractions is a critical algebraic skill for indeterminate forms.",
    },
    {
      id: "ch3-005-ex11",
      title: "Exponential (1^∞): lim(x→∞) (1+2/x)^x",
      problem:
        "\\text{Evaluate } \\lim_{x \\to \\infty} \\left(1 + \\frac{2}{x}\\right)^x",
      steps: [
        {
          expression: "1^\\infty \\text{ form}",
          annotation: "Identify: 1^∞ indeterminate form.",
          strategyTitle: "Step 1: Identify form",
        },
        {
          expression: "y = \\left(1 + \\frac{2}{x}\\right)^x",
          annotation: "Let y equal the expression.",
          strategyTitle: "Step 2: Take natural log",
        },
        {
          expression: "\\ln(y) = x \\ln\\left(1 + \\frac{2}{x}\\right)",
          annotation: "Take ln of both sides.",
          strategyTitle: "Step 3: Apply ln",
        },
        {
          expression: "\\frac{\\ln(1+2/x)}{1/x}",
          annotation: "Rewrite as fraction.",
          strategyTitle: "Step 4: Rewrite as fraction",
        },
        {
          expression:
            "\\overset{\\text{L'H}}{=} \\frac{\\frac{-2/x^2}{1+2/x}}{-1/x^2} = \\frac{2}{1+2/x}",
          annotation: "Apply L'Hôpital.",
          strategyTitle: "Step 5: Apply L'Hôpital",
        },
        {
          expression: "\\ln(y) = 2",
          annotation: "As x→∞, 2/x→0, so limit is 2.",
          strategyTitle: "Step 6: Evaluate",
        },
        {
          expression: "y = e^2",
          annotation: "Exponentiate: y = e^2.",
          strategyTitle: "Step 7: Exponentiate",
        },
      ],
      conclusion:
        "The limit is e². Logarithms convert exponential indeterminate forms to 0/0 or ∞/∞ forms.",
    },
  ],

  story: {
    title: "The Forbidden Division",
    subtitle: "Computing lim sin(x)/x as x → 0 produces 0/0. That expression is undefined. Yet the limit exists and equals 1. Here is why — and the rule that makes all such limits systematic.",
    acts: [
      {
        label: 'The Scene',
        title: 'A Limit That Should Not Exist',
        content: `Consider the limit:
\\[\\lim_{x \\to 0} \\frac{\\sin x}{x}\\]

Try to evaluate it by direct substitution: plug in $x = 0$.

Numerator: $\\sin 0 = 0$.
Denominator: $0$.

The expression becomes $\\dfrac{0}{0}$.

Division by zero is undefined. So this limit is... undefined?

No. Try computing $\\dfrac{\\sin x}{x}$ for small values of $x$:
- $x = 0.1$: $\\dfrac{\\sin 0.1}{0.1} \\approx \\dfrac{0.09983}{0.1} = 0.9983$
- $x = 0.01$: $\\dfrac{\\sin 0.01}{0.01} \\approx \\dfrac{0.009999}{0.01} = 0.9999$
- $x = 0.001$: ratio $\\approx 0.999999$

The ratio is clearly approaching 1. The limit exists — it is just that plugging in $x = 0$ cannot reveal it.

This is the hallmark of an **indeterminate form**: a limit where direct substitution gives $\\frac{0}{0}$ (or $\\frac{\\infty}{\\infty}$) — meaningless as an arithmetic expression, but potentially meaningful as a limiting process. L'Hôpital's Rule resolves all such cases.`,
      },
      {
        label: 'Act I',
        title: 'What a Limit Is — Approached, Not Reached',
        content: `Before we can handle indeterminate forms, we need a precise definition of what a limit means.

**Definition:** $\\displaystyle\\lim_{x \\to c} f(x) = L$ means: as $x$ gets arbitrarily close to $c$ (but never equal to $c$), $f(x)$ gets arbitrarily close to $L$.

The key word is **never equal to $c$**. The limit describes what the function *approaches*, not what it *equals* at $c$. The value $f(c)$ is irrelevant — or $f$ might not even be defined at $c$.

**Direct substitution** works when $f$ is continuous at $c$ (no jumps or holes): then $\\lim_{x\\to c} f(x) = f(c)$. But it fails when:
1. $f(c)$ is undefined (like $\\frac{\\sin x}{x}$ at $x = 0$)
2. $f(c)$ exists but $\\lim_{x \\to c} f(x) \\neq f(c)$ (a removable discontinuity)

**Why is $\\frac{0}{0}$ indeterminate?**

$\\dfrac{0}{0}$ has no arithmetic meaning — division by zero is undefined. But as a *limit*, the numerator and denominator both approach zero simultaneously. Their *ratio* could approach anything: 1, 3, 0, $\\infty$, or not exist at all. The form $\\frac{0}{0}$ tells you direct substitution failed — it says nothing about the actual limit value.

For example:
- $\\lim_{x \\to 0} \\dfrac{x}{x} = 1$ ($0/0$ form, limit is 1)
- $\\lim_{x \\to 0} \\dfrac{x^2}{x} = 0$ ($0/0$ form, limit is 0)
- $\\lim_{x \\to 0} \\dfrac{x}{x^2}$ does not exist ($0/0$ form, blows up)

Same form, completely different answers. This is why $\\frac{0}{0}$ is "indeterminate" — it does not determine the limit.`,
      },
      {
        label: 'Act II',
        title: 'Why the Rule Works — Linear Approximation Near a Zero',
        content: `L'Hôpital's Rule is not magic. It follows from linear approximation, which you already know.

**Recall:** near any differentiable point $c$, a function looks like its tangent line. Specifically, if $f(c) = 0$, then near $x = c$:
\\[f(x) \\approx f'(c)(x - c)\\]

Why? The linearization is $f(x) \\approx f(c) + f'(c)(x - c)$. When $f(c) = 0$, the constant term vanishes, leaving only the slope term.

**Now consider the ratio $\dfrac{f(x)}{g(x)}$ where both $f(c) = 0$ and $g(c) = 0$.**

Near $x = c$, both functions look like their derivatives times $(x - c)$:
\\[f(x) \\approx f'(c)(x - c)\\]
\\[g(x) \\approx g'(c)(x - c)\\]

Divide:
\\[\\frac{f(x)}{g(x)} \\approx \\frac{f'(c)(x - c)}{g'(c)(x - c)}\\]

The factor $(x - c)$ appears in both numerator and denominator. **Cancel it:**
\\[\\frac{f(x)}{g(x)} \\approx \\frac{f'(c)}{g'(c)}\\]

Taking the limit as $x \\to c$: if $f'(c)$ and $g'(c)$ exist and $g'(c) \\neq 0$:
\\[\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\frac{f'(c)}{g'(c)}\\]

This is L'Hôpital's Rule. It works because both functions, near their shared zero, are proportional to $(x - c)$ — and that common factor cancels in the ratio.`,
      },
      {
        label: 'Act III',
        title: 'Applying the Rule — Step by Step',
        content: `Now we apply L'Hôpital's Rule to actual problems. The key requirement: **verify the indeterminate form first**.

**Always write the form check before applying the rule.**

---

**Example 1:** $\\displaystyle\\lim_{x \\to 0} \\dfrac{\\sin x}{x}$

Check: $\\sin 0 = 0$ and denominator $= 0$. **Form: $0/0$. ✓**

Differentiate numerator: $\\dfrac{d}{dx}[\\sin x] = \\cos x$.
Differentiate denominator: $\\dfrac{d}{dx}[x] = 1$.

Apply rule:
\\[\\lim_{x \\to 0} \\frac{\\sin x}{x} = \\lim_{x \\to 0} \\frac{\\cos x}{1} = \\frac{\\cos 0}{1} = \\frac{1}{1} = 1\\]

---

**Example 2:** $\\displaystyle\\lim_{x \\to 0} \\dfrac{e^x - 1}{x}$

Check: $e^0 - 1 = 0$ and denominator $= 0$. **Form: $0/0$. ✓**

Differentiate numerator: $\\dfrac{d}{dx}[e^x - 1] = e^x$.
Differentiate denominator: $\\dfrac{d}{dx}[x] = 1$.

\\[\\lim_{x \\to 0} \\frac{e^x - 1}{x} = \\lim_{x \\to 0} \\frac{e^x}{1} = e^0 = 1\\]

---

**Example 3: applying twice.** $\\displaystyle\\lim_{x \\to 0} \\dfrac{x - \\sin x}{x^3}$

Check: numerator $= 0 - 0 = 0$, denominator $= 0$. **Form: $0/0$. ✓**

First application: $\\dfrac{1 - \\cos x}{3x^2}$. Check again: $1 - \\cos 0 = 0$, denominator $= 0$. Still $0/0$. Apply again:
$\\dfrac{\\sin x}{6x}$. Still $0/0$ at $x = 0$. Apply once more: $\\dfrac{\\cos x}{6}$.

At $x = 0$: $\\dfrac{\\cos 0}{6} = \\dfrac{1}{6}$.

Each application is valid because the form was verified at each step.`,
      },
      {
        label: 'Act IV',
        title: 'The ∞/∞ Form and Chaining',
        content: `L'Hôpital's Rule also applies when both numerator and denominator approach $\\pm\\infty$.

**Formal statement (both forms):**

If $\\lim_{x \\to c} f(x) = 0$ and $\\lim_{x \\to c} g(x) = 0$, **or** if both limits are $\\pm\\infty$, and if $g'(x) \\neq 0$ near $c$, and if $\\lim_{x \\to c} \\frac{f'(x)}{g'(x)}$ exists (or is $\\pm\\infty$), then:
\\[\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}\\]

The rule also applies for one-sided limits and for $x \\to \\pm\\infty$.

**Example:** $\\displaystyle\\lim_{x \\to \\infty} \\dfrac{\\ln x}{x}$

Check: $\\ln x \\to \\infty$ and $x \\to \\infty$. **Form: $\\infty/\\infty$. ✓**

Differentiate: $\\dfrac{1/x}{1} = \\dfrac{1}{x} \\to 0$.

So $\\lim_{x \\to \\infty} \\dfrac{\\ln x}{x} = 0$. Logarithm grows far slower than $x$.

**Critical warning:** verify the form **every time**, including after each application. If the form is not $0/0$ or $\\infty/\\infty$, L'Hôpital's Rule does not apply. Applying it to a non-indeterminate limit can give a wrong answer.

**Example of misuse:** $\\displaystyle\\lim_{x \\to 0} \\dfrac{x + 1}{x - 1}$. Numerator $\\to 1 \\neq 0$. This is NOT $0/0$ form. The correct limit is $\\frac{1}{-1} = -1$. Applying L'Hôpital would give $\\frac{1}{1} = 1$ — wrong.`,
      },
      {
        label: 'Act V',
        title: 'The Seven Indeterminate Forms',
        content: `L'Hôpital's Rule directly handles $0/0$ and $\\infty/\\infty$. Five other forms — $0 \\cdot \\infty$, $\\infty - \\infty$, $1^\\infty$, $0^0$, $\\infty^0$ — all convert to one of those two through algebra.

**Form $0 \\cdot \\infty$:** write as a fraction.

$\\lim f(x) \\cdot g(x)$ where $f \\to 0$ and $g \\to \\infty$. Rewrite as $\\dfrac{f(x)}{1/g(x)}$ (now $0/0$) or $\\dfrac{g(x)}{1/f(x)}$ (now $\\infty/\\infty$). Choose whichever fraction differentiates more simply.

**Form $\\infty - \\infty$:** find a common denominator or factor.

$\\lim (f(x) - g(x))$ where both $\\to \\infty$. Algebraically combine into one fraction, then check for $0/0$ or $\\infty/\\infty$.

**Forms $1^\\infty$, $0^0$, $\\infty^0$:** take the logarithm.

If $L = \\lim f(x)^{g(x)}$, then $\\ln L = \\lim g(x) \\cdot \\ln f(x)$. The exponent is now a product — apply the $0 \\cdot \\infty$ conversion, then L'Hôpital. Once you find $\\ln L = K$, conclude $L = e^K$.

**Example:** $\\displaystyle\\lim_{x \\to 0^+} x^x$ — form $0^0$.

Let $L = \\lim x^x$. Then $\\ln L = \\lim x \\ln x$ — form $0 \\cdot (-\\infty)$.

Rewrite: $\\dfrac{\\ln x}{1/x}$ — form $-\\infty/\\infty$. Apply L'Hôpital:
\\[\\frac{1/x}{-1/x^2} = \\frac{1/x \\cdot x^2}{-1} = \\frac{x}{-1} = -x \\to 0\\]

So $\\ln L = 0$, which gives $L = e^0 = 1$.`,
      },
    ],
    resolution: `**L'Hôpital's Rule — formal statement:**

If $\\lim_{x \\to c} f(x) = \\lim_{x \\to c} g(x) = 0$ or both $= \\pm\\infty$, and $g'(x) \\neq 0$ near $c$, and $\\lim_{x \\to c} f'(x)/g'(x)$ exists, then:
\\[\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}\\]

**The six-step procedure:**

1. **Substitute** to identify the form. Write "form: $0/0$" or "form: $\\infty/\\infty$" explicitly.
2. **If not one of those two forms**, do not apply L'Hôpital. Use algebra or direct evaluation.
3. **Differentiate** numerator and denominator **separately** (NOT the quotient rule).
4. **Check the new limit** — if still $0/0$ or $\\infty/\\infty$, apply again.
5. **Verify** that $g'(x) \\neq 0$ near $c$.
6. **Evaluate** the final limit by substitution.

**The most important distinction:** L'Hôpital is $\\lim f/g = \\lim f'/g'$. The quotient rule is $(f/g)' = (f'g - fg')/g^2$. They look similar and compute completely different things. L'Hôpital applies to **limits**. The quotient rule applies to **derivatives**. Confusing them is catastrophic.`,
  },

  challenges: [
    {
      id: "ch3-005-ch1",
      difficulty: "hard",
      problem:
        "Prove that lim(x→0) (1-cos(x))/x² = 1/2 in three ways: (a) geometric, (b) L'Hôpital, (c) power series.",
      hint: 'The power of multiple perspectives! L\'Hopital is systematic, but the identity 1-cos(x) = 2sin²(x/2) shows the "hidden" square that balances the x² in the denominator. The series method is the ultimate "cheat code"—it literally shows you the result in the first term.',
      walkthrough: [
        {
          expression: "\\text{(a) Geometric / Trigonometric Identity:}",
          annotation: "Method (a).",
        },
        {
          expression:
            "\\frac{1-\\cos(x)}{x^2} = \\frac{2\\sin^2(x/2)}{x^2} = \\frac{2\\sin^2(x/2)}{4(x/2)^2} = \\frac{1}{2}\\left(\\frac{\\sin(x/2)}{x/2}\\right)^2",
          annotation:
            "Use the half-angle identity 1-cos(x) = 2sin²(x/2). Rewrite x² = 4(x/2)².",
        },
        {
          expression:
            "\\to \\frac{1}{2} \\cdot 1^2 = \\frac{1}{2} \\quad \\text{as } x \\to 0 \\text{ (since } \\sin(\\theta)/\\theta \\to 1\\text{)}",
          annotation: "As x → 0, x/2 → 0, so sin(x/2)/(x/2) → 1. ∎",
        },
        {
          expression: "\\text{(b) L'Hôpital twice:}",
          annotation: "Method (b). Both numerator and denominator → 0 twice.",
        },
        {
          expression:
            "\\lim \\frac{1-\\cos x}{x^2} \\overset{\\text{L'H}}{=} \\lim \\frac{\\sin x}{2x} \\overset{\\text{L'H}}{=} \\lim \\frac{\\cos x}{2} = \\frac{1}{2}",
          annotation:
            "First L'Hôpital: (1-cos x)' = sin x, (x²)' = 2x. Still 0/0. Second L'Hôpital: (sin x)' = cos x, (2x)' = 2. Evaluate at 0: cos(0)/2 = 1/2. ∎",
        },
        { expression: "\\text{(c) Power series:}", annotation: "Method (c)." },
        {
          expression:
            "\\cos(x) = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots",
          annotation: "Taylor series for cos(x) around 0.",
        },
        {
          expression:
            "1 - \\cos(x) = \\frac{x^2}{2} - \\frac{x^4}{24} + \\cdots",
          annotation: "Subtract from 1.",
        },
        {
          expression:
            "\\frac{1-\\cos x}{x^2} = \\frac{1}{2} - \\frac{x^2}{24} + \\cdots \\to \\frac{1}{2} \\text{ as } x \\to 0",
          annotation: "Divide by x². As x → 0, higher-order terms vanish. ∎",
        },
      ],
      answer:
        "All three methods give 1/2. The power series method is most elegant once the series is known. The geometric method is most elementary. L'Hôpital is most systematic.",
    },
    {
      id: "ch3-005-ch2",
      difficulty: "medium",
      problem: "Find lim(x→0⁺) (sin(x))^{tan(x)}. This is a 0^0 form.",
      hint: 'The logarithmic "unfolding" is key. Any time the variable is in both the base and the exponent, take the ln. This converts a "vertical growth" problem into a "horizontal product" problem.',
      walkthrough: [
        {
          expression: "L = \\lim_{x \\to 0^+} (\\sin x)^{\\tan x}",
          annotation: "As x → 0⁺: sin(x) → 0 and tan(x) → 0, giving 0^0 form.",
        },
        {
          expression:
            "\\ln L = \\lim_{x \\to 0^+} \\tan(x) \\cdot \\ln(\\sin x)",
          annotation: "Take logarithm.",
        },
        {
          expression:
            "= \\lim_{x \\to 0^+} \\frac{\\ln(\\sin x)}{\\cot x} \\Rightarrow \\frac{-\\infty}{+\\infty} \\text{ form}",
          annotation:
            "Rewrite: tan(x)·ln(sin x) = ln(sin x)/(1/tan x) = ln(sin x)/cot(x). As x → 0⁺: ln(sin x) → -∞ and cot(x) → +∞.",
        },
        {
          expression:
            "\\overset{\\text{L'H}}{=} \\lim_{x \\to 0^+} \\frac{\\cos(x)/\\sin(x)}{-\\csc^2(x)} = \\lim_{x \\to 0^+} \\frac{\\cos x}{\\sin x} \\cdot (-\\sin^2 x) = \\lim_{x \\to 0^+} (-\\sin x \\cos x)",
          annotation:
            "Apply L'Hôpital. Numerator derivative: d/dx[ln(sin x)] = cos(x)/sin(x). Denominator derivative: d/dx[cot(x)] = -csc²(x) = -1/sin²(x). Ratio: (cos x/sin x) / (-1/sin²x) = -cos x · sin x.",
        },
        {
          expression:
            "\\lim_{x \\to 0^+} (-\\sin x \\cos x) = -\\sin(0)\\cos(0) = -0 \\cdot 1 = 0",
          annotation: "Evaluate the limit: -sin(0)cos(0) = 0.",
        },
        {
          expression: "\\ln L = 0 \\Rightarrow L = e^0 = 1",
          annotation: "Exponentiate.",
        },
      ],
      answer:
        "lim(x→0⁺) (sin x)^{tan x} = 1. This 0^0 power form evaluates to 1, consistent with the general pattern: when the exponent goes to 0 faster than the log of the base goes to -∞, the limit is 1.",
    },
    {
      id: "ch3-005-ch3",
      difficulty: "hard",
      problem:
        "Show that L'Hôpital's Rule fails for lim(x→∞) (x + sin(x))/x even though the limit exists. Explain WHY it fails.",
      hint: 'The rule is a "bridge" that only works if the other side of the bridge is stable. If the derivative oscillates, the bridge collapses, and you must find another way to cross (like the Squeeze Theorem).',
      walkthrough: [
        {
          expression:
            "\\lim_{x \\to \\infty} \\frac{x + \\sin(x)}{x} = \\frac{\\infty}{\\infty} \\text{ form}",
          annotation:
            "Both x + sin(x) → ∞ and x → ∞, so this appears to be ∞/∞.",
        },
        {
          expression:
            "\\text{Attempt L'Hôpital: } \\lim_{x \\to \\infty} \\frac{(x+\\sin x)\'}{x\'} = \\lim_{x\\to\\infty} \\frac{1 + \\cos x}{1}",
          annotation: "Apply L'Hôpital.",
        },
        {
          expression:
            "\\lim_{x \\to \\infty} (1 + \\cos x) \\text{ does not exist}",
          annotation: "cos(x) oscillates between -1 and 1 forever. No limit.",
        },
        {
          expression: "\\text{But the original limit DOES exist:}",
          annotation: "Compute by elementary means.",
        },
        {
          expression: "\\frac{x + \\sin x}{x} = 1 + \\frac{\\sin x}{x}",
          annotation:
            "Divide numerator and denominator by x (equivalently, split the fraction).",
        },
        {
          expression:
            "\\left|\\frac{\\sin x}{x}\\right| \\leq \\frac{1}{|x|} \\to 0 \\text{ as } x \\to \\infty",
          annotation:
            "The squeeze theorem (or bound): |sin x| ≤ 1 always, so |sin(x)/x| ≤ 1/x → 0.",
        },
        {
          expression:
            "\\therefore \\lim_{x\\to\\infty} \\frac{x + \\sin x}{x} = 1 + 0 = 1",
          annotation: "The original limit is 1.",
        },
        {
          expression:
            "\\text{Why L'Hôpital fails: } \\lim_{x\\to\\infty} \\frac{f'(x)}{g'(x)} \\text{ must EXIST}",
          annotation:
            "L'Hôpital's theorem states: IF lim f'/g' = L, THEN lim f/g = L. It does NOT say: if lim f'/g' fails to exist, then lim f/g fails. The condition 'lim f'/g' exists' is part of the hypothesis, not the conclusion. Here lim f'/g' doesn't exist, so the rule simply does not apply — but the original limit still exists.",
        },
      ],
      answer:
        "L'Hôpital requires lim f'/g' to exist. Here lim (1+cos x)/1 does not exist (oscillates), so L'Hôpital does not apply. The original limit lim(x+sin x)/x = 1 exists and is found by elementary algebra. This shows L'Hôpital's Rule is a one-directional implication: [lim f'/g' exists and equals L] ⟹ [lim f/g = L]. The contrapositive: lim f/g ≠ L does NOT imply lim f'/g' ≠ L.",
    },
  ],

  crossRefs: [
    {
      lessonSlug: "mean-value-theorem",
      label: "Mean Value Theorem",
      context:
        "L'Hôpital's Rule is proved using Cauchy's Generalized MVT. Understanding the MVT is essential for the rigorous proof.",
    },
    {
      lessonSlug: "curve-sketching",
      label: "Curve Sketching",
      context:
        "Computing asymptotes of functions like ln(x)/x as x → ∞ requires L'Hôpital (∞/∞ form). L'Hôpital is the tool for limits that arise in asymptote analysis.",
    },
    {
      lessonSlug: "linear-approximation",
      label: "Linear Approximation",
      context:
        "The intuition for L'Hôpital (f(x)/g(x) ≈ f'(c)(x-c)/[g'(c)(x-c)] near a common zero) is linearization. The rule IS linear approximation applied to ratios.",
    },
  ],

  checkpoints: [
    "read-intuition",
    "read-math",
    "read-rigor",
    "completed-example-1",
    "completed-example-2",
    "completed-example-3",
    "completed-example-4",
    "completed-example-5",
    "completed-example-6",
    "completed-example-7",
    "attempted-challenge-hard-1",
    "attempted-challenge-medium",
    "attempted-challenge-hard-2",
  ],

  quiz: [
    {
      id: "lhop-q1",
      type: "choice",
      text: "L'Hôpital's Rule may only be applied when the limit has which form(s)?",
      options: [
        "$0/1$ or $1/0$",
        "$0/0$ or $\\infty/\\infty$",
        "Any fraction limit",
        "$0/0$ only",
      ],
      answer: "$0/0$ or $\\infty/\\infty$",
      hints: [
        "The rule requires an indeterminate form. $0/0$ and $\\infty/\\infty$ are the two direct cases; all other indeterminate forms must first be converted to one of these.",
      ],
      reviewSection: "Warning — Verify indeterminate form first",
    },
    {
      id: "lhop-q2",
      type: "input",
      text: "Apply L'Hôpital's Rule to $\\lim_{x \\to 0} \\frac{\\sin x}{x}$. Differentiate numerator and denominator separately and evaluate. Enter the limit value.",
      answer: "1",
      hints: [
        "This is $0/0$ form. Differentiate: numerator $\\to \\cos x$, denominator $\\to 1$. Limit $= \\cos(0)/1 = 1$.",
      ],
      reviewSection: "Hook — $\\sin(x)/x$ via L'Hôpital",
    },
    {
      id: "lhop-q3",
      type: "input",
      text: "Evaluate $\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}$ using L'Hôpital's Rule (it is $0/0$ form). Enter the limit.",
      answer: "4",
      hints: [
        "Differentiate: numerator $\\to 2x$, denominator $\\to 1$. Limit $= 2(2)/1 = 4$.",
        "(Check: factor gives $(x-2)(x+2)/(x-2) = x+2 \\to 4$. ✓)",
      ],
      reviewSection: "Math — Applying L'Hôpital to $0/0$",
    },
    {
      id: "lhop-q4",
      type: "input",
      text: "Evaluate $\\lim_{x \\to 0} \\frac{1 - \\cos x}{x^2}$ using L'Hôpital's Rule. You may need to apply it twice. Enter the exact value.",
      answer: "1/2",
      hints: [
        "First application ($0/0$): $\\frac{\\sin x}{2x}$ — still $0/0$.",
        "Second application: $\\frac{\\cos x}{2} \\to \\frac{1}{2}$.",
      ],
      reviewSection: "Rigor — Repeated application of L'Hôpital",
    },
    {
      id: "lhop-q5",
      type: "input",
      text: "Evaluate $\\lim_{x \\to \\infty} \\frac{x^2}{e^x}$ using L'Hôpital's Rule ($\\infty/\\infty$ form). Apply it twice. Enter the limit.",
      answer: "0",
      hints: [
        "First: $\\frac{2x}{e^x}$ — still $\\infty/\\infty$.",
        "Second: $\\frac{2}{e^x} \\to 0$ as $x \\to \\infty$.",
      ],
      reviewSection: "Math — $\\infty/\\infty$ form with exponential",
    },
    {
      id: "lhop-q6",
      type: "choice",
      text: "L'Hôpital's Rule states $\\lim f/g = \\lim f'/g'$. What distinguishes this from the Quotient Rule?",
      options: [
        "L'Hôpital differentiates $f/g$ as a whole; Quotient Rule differentiates $f$ and $g$ separately",
        "L'Hôpital applies to LIMITS of indeterminate forms; the Quotient Rule computes the DERIVATIVE of a quotient function",
        "L'Hôpital and the Quotient Rule are the same formula in different notation",
        "L'Hôpital only works at $x = 0$; Quotient Rule works everywhere",
      ],
      answer:
        "L'Hôpital applies to LIMITS of indeterminate forms; the Quotient Rule computes the DERIVATIVE of a quotient function",
      hints: [
        "L'Hôpital: $\\lim f/g = \\lim f'/g'$ (separate derivatives, applied to a limit). Quotient Rule: $(f/g)' = (f'g - fg')/g^2$ (derivative of the ratio as a new function).",
      ],
      reviewSection: "Misconception — L'Hôpital is not the Quotient Rule",
    },
    {
      id: "lhop-q7",
      type: "input",
      text: "Evaluate $\\lim_{x \\to 0} \\frac{e^x - 1}{x}$. Identify the form, apply L'Hôpital's Rule, and enter the limit.",
      answer: "1",
      hints: [
        "$0/0$ form. Differentiate: numerator $\\to e^x$, denominator $\\to 1$. Limit $= e^0/1 = 1$.",
      ],
      reviewSection: "Math — Exponential $0/0$ limit",
    },
    {
      id: "lhop-q8",
      type: "input",
      text: "Evaluate $\\lim_{x \\to 0} \\frac{\\tan x}{x}$. This is $0/0$ form. Apply L'Hôpital once. Enter the limit.",
      answer: "1",
      hints: [
        "Differentiate: $\\tan x \\to \\sec^2 x$, $x \\to 1$. Limit $= \\sec^2(0)/1 = 1/1 = 1$.",
      ],
      reviewSection: "Math — Trig $0/0$ limit",
    },
    {
      id: "lhop-q9",
      type: "choice",
      text: "Consider $\\lim_{x \\to 1} \\frac{x + 2}{x - 1}$. A student applies L'Hôpital and gets $\\lim 1/1 = 1$. Is this correct?",
      options: [
        "Yes — L'Hôpital always applies to fractions",
        "No — the limit is NOT $0/0$ form (denominator $\\to 0$ but numerator $\\to 3 \\ne 0$), so L'Hôpital cannot be used",
        "Yes — since the denominator $\\to 0$, the rule applies",
        "No — the student differentiated incorrectly",
      ],
      answer:
        "No — the limit is NOT $0/0$ form (denominator $\\to 0$ but numerator $\\to 3 \\ne 0$), so L'Hôpital cannot be used",
      hints: [
        "At $x=1$: numerator $\\to 3 \\ne 0$, denominator $\\to 0$. The form is $3/0 = \\pm\\infty$, not $0/0$. L'Hôpital does not apply.",
      ],
      reviewSection: "Warning — Verify indeterminate form first",
    },
    {
      id: "lhop-q10",
      type: "input",
      text: "Evaluate $\\lim_{x \\to 0} \\frac{x - \\sin x}{x^3}$ using L'Hôpital's Rule. Apply the rule as many times as needed. Enter the exact value.",
      answer: "1/6",
      hints: [
        "1st ($0/0$): $\\frac{1 - \\cos x}{3x^2}$. 2nd ($0/0$): $\\frac{\\sin x}{6x}$. 3rd ($0/0$): $\\frac{\\cos x}{6} \\to \\frac{1}{6}$.",
      ],
      reviewSection: "Rigor — Three applications of L'Hôpital",
    },
  ],
    walkthroughs: [
    {
      id: 'wt-lhopital-ultimate',
      title: "L'Hôpital's Rule – When Limits Fight Back",
      prereqs: ['Limits at infinity', 'Derivatives as rates', 'Indeterminate forms'],
      svgId: 'WalkthroughViz',
      vizProps: { fn1: 'Math.sin(x)', fn2: 'x', comparison: true, a: -1.5, b: 1.5, xMin: -2, xMax: 2, label1: 'f(x) = sin x', label2: 'g(x) = x — both \u2192 0 as x \u2192 0' },
      problem: "State, prove intuitively, and apply L'Hôpital's Rule to resolve indeterminate forms of type 0/0 and ∞/∞.",
      steps: [
        {
          label: 'REGISTRY – The Players',
          visualNote: 'Two functions f(x) and g(x) approaching the same point. Their graphs get closer and closer, creating a 0/0 or ∞/∞ stalemate.',
          strategy: 'Name the combatants clearly before the battle begins.',
          explanation: 'We have two functions f(x) and g(x). As x approaches some value a (or infinity), both f(x) and g(x) approach either 0 or infinity at the same time. This creates an indeterminate form 0/0 or ∞/∞ — the limit "fights back" and refuses to give a clear answer. L\'Hôpital\'s Rule is the referee that breaks the tie by looking at the derivatives instead of the original functions.',
          math: '\\lim_{x \\to a} \\frac{f(x)}{g(x)} \\quad \\text{where it is 0/0 or } \\infty/\\infty'
        },
        {
          label: 'The Rule Itself',
          visualNote: 'The original fraction f/g is crossed out and replaced by f\'/g\'.',
          strategy: 'Replace the original limit with the limit of the derivatives — but only when the conditions are met.',
          explanation: 'If the limit of f/g is indeterminate (0/0 or ∞/∞) and if the limit of f\'/g\' exists, then the original limit equals the new one. This works because near the trouble point, the behavior of f and g is dominated by how fast they are changing — their derivatives. The rule essentially says: when the functions themselves are tied, look at their rates of change to break the tie.',
          math: '\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f\'(x)}{g\'(x)} \\quad \\text{(when conditions hold)}'
        },
        {
          label: 'Why does it work? Intuitive proof sketch',
          visualNote: 'A small secant line on f and on g. Their slopes (derivatives) are shown as the "local behavior".',
          strategy: 'Think in terms of local linear approximations (tangent lines).',
          explanation: 'Near the point a, both f and g can be approximated by their tangent lines: f(x) ≈ f(a) + f\'(a)(x-a) and same for g. When f(a) = g(a) = 0 (the 0/0 case), the ratio f(x)/g(x) ≈ [f\'(a)(x-a)] / [g\'(a)(x-a)] = f\'(a)/g\'(a). The (x-a) terms cancel, leaving the ratio of the derivatives. This is why the rule works — we are replacing the functions with their best linear approximations, and the ratio simplifies beautifully.',
          math: '\\frac{f(x)}{g(x)} \\approx \\frac{f\'(a)(x-a)}{g\'(a)(x-a)} = \\frac{f\'(a)}{g\'(a)}'
        },
        {
          label: 'Example 1 – Classic 0/0 form (polynomial)',
          visualNote: 'f(x) = x² - 1, g(x) = x - 1 as x→1. Both go to 0.',
          strategy: 'Direct substitution gives 0/0 → apply L\'Hôpital once.',
          explanation: 'Plug in x=1: numerator 1-1=0, denominator 1-1=0 — stalemate. Differentiate top and bottom: 2x / 1. Now plug in x=1: 2/1 = 2. The limit is 2. Notice how simple the derivatives made it — no factoring needed.',
          math: '\\lim_{x \\to 1} \\frac{x^2 - 1}{x - 1} = \\lim_{x \\to 1} \\frac{2x}{1} = 2'
        },
        {
          label: 'Example 2 – ∞/∞ form (exponential vs polynomial)',
          visualNote: 'f(x) = e^x, g(x) = x^3 as x→∞. Both go to infinity.',
          strategy: 'Apply L\'Hôpital repeatedly until the form is resolved.',
          explanation: 'As x→∞, e^x and x^3 both race to infinity — indeterminate ∞/∞. Differentiate: e^x / 3x² — still ∞/∞. Again: e^x / 6x — still ∞/∞. Again: e^x / 6 → ∞. So the original limit is infinity. Exponential growth beats any polynomial, and L\'Hôpital reveals this after three applications.',
          math: '\\lim_{x \\to \\infty} \\frac{e^x}{x^3} = \\lim_{x \\to \\infty} \\frac{e^x}{3x^2} = \\lim_{x \\to \\infty} \\frac{e^x}{6x} = \\lim_{x \\to \\infty} \\frac{e^x}{6} = \\infty'
        },
        {
          label: 'Example 3 – trigonometric 0/0',
          visualNote: 'f(x) = sin x, g(x) = x as x→0.',
          strategy: 'Classic limit that students usually memorize — now justified by L\'Hôpital.',
          explanation: 'Direct substitution: sin(0)/0 = 0/0. Derivatives: cos x / 1. At x=0: 1/1 = 1. This proves the famous limit lim_{x→0} sin x / x = 1 without using geometric arguments or squeeze theorem.',
          math: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = \\lim_{x \\to 0} \\frac{\\cos x}{1} = 1'
        },
        {
          label: 'When NOT to use L\'Hôpital (common pitfalls)',
          visualNote: 'A red "X" over a case where the limit of derivatives does not exist or is not indeterminate.',
          strategy: 'The rule only applies to 0/0 and ∞/∞. If the limit of f\'/g\' does not exist, the original limit may still exist or may not.',
          explanation: 'L\'Hôpital is not a magic wand. If after differentiating you still have indeterminate form, keep going. If the derivatives’ limit does not exist, you cannot conclude anything about the original limit. Always check the conditions first.',
          gotcha: 'Never apply L\'Hôpital to limits that are not 0/0 or ∞/∞ (e.g., 1/∞ or 5/2).'
        }
      ],
      variations: [
        { question: 'What is lim_{x→0} (1 - cos x)/x² ?', hint: '0/0 form. Apply L\'Hôpital twice: first sin x / 2x, then cos x / 2 → 1/2.' },
        { question: 'Why can we apply L\'Hôpital multiple times?', hint: 'As long as each new ratio is still indeterminate, the conditions remain satisfied.' }
      ]
    }
  ],

  spiral: {
    recoveryPoints: [
      {
        label: "Limits (Ch. 1)",
        note: "L'Hôpital's Rule resolves limits that look like 0/0 or ∞/∞ — the indeterminate forms you saw in Chapter 1 but could not always evaluate",
      },
      {
        label: "Linear Approximation (Lesson 2)",
        note: "The intuition behind L'Hôpital: near x = a, f(x) ≈ f'(a)(x−a) and g(x) ≈ g'(a)(x−a), so f(x)/g(x) ≈ f'(a)/g'(a)",
      },
      {
        label: "Mean Value Theorem (Lesson 1)",
        note: "L'Hôpital's Rule is proved using the Cauchy Mean Value Theorem, a generalization of the ordinary MVT",
      },
    ],
    futureLinks: [
      {
        label: "Improper Integrals (Ch. 4)",
        note: "Improper integrals like ∫₀^∞ xe^{−x}dx involve limits of the form 0·∞ — L'Hôpital (after algebraic manipulation) resolves them",
      },
      {
        label: "Taylor Series (Ch. 5)",
        note: "L'Hôpital is a shortcut for limits that Taylor series would resolve more transparently — for limits like sin(x)/x, both methods give 1",
      },
      {
        label: "Indeterminate Forms in Physics",
        note: "The sinc function sin(x)/x appears in optics diffraction patterns; its limit at 0 is 1 by L'Hôpital, critical for understanding wave interference",
      },
    ],
  },
};
