---
title: 2.5 — Visual hierarchy, imagery and a design critique
track: Frontend Developer Bootcamp — Design a Responsive Café Site
trackOrder: 50.02
runtime: none
---

Outcome: explain a visual decision in terms of a visitor's task, compare alternatives, and test a responsive composition.

### The story so far

You can change CSS and switch themes. The next question is which changes help a person understand the page. Good design is not a bag of fashionable effects. It coordinates information architecture, copy, hierarchy, spacing, color, imagery and interaction around a task. This workshop is a separate specimen so you can compare designs without disturbing the café app used by later lessons.

## Compose a hierarchy with a reason

A hierarchy gives unequal emphasis to unequal information. Here the heading identifies the experience, the first card answers the visit task, and one filled link marks the primary action. The menu is still findable without competing at the same visual weight.

Typography communicates through size, weight, line length and spacing together. A large heading with cramped line-height can be harder to read than a modest heading with room to breathe. `ch` approximates a character-based measure; 60ch is a starting point for this font, not exactly sixty characters or a universal accessibility threshold. Rem-based sizing respects the browser's base text size; test zoom and user settings.

Spacing behaves like punctuation. Smaller gaps group a heading with its explanation; larger gaps separate different tasks. This is proximity, one of the Gestalt grouping principles. Similarity groups repeated cards; alignment creates a reading path; figure/ground separates controls from their surroundings. These are perceptual tendencies, not rules that override content.

**Rule of thumb:** before adding a border, shadow or color, try solving grouping with spacing and alignment. Add a visual boundary when it clarifies ownership, not merely because a card looks empty.

```predict
question: If every action has the same strongest visual emphasis, is the primary action easier to identify?
choice: No
choice: Yes
answer: No
explain: Equal emphasis removes the intended prioritization; hierarchy depends on meaningful differences.
```

The small SVG is authored geometry, not a downloaded image. Its title and description communicate the useful relationship, while the text address remains available outside the picture. For photographs, choose a licensed source, record attribution when required, export an appropriately compressed image and specify intrinsic width/height to reserve space. Use srcset/sizes when several raster sizes are needed; CSS width alone does not reduce downloaded bytes. Lazy-load below-the-fold photos, not the main image people must see immediately. Decorative images get empty alt text; meaningful images describe information needed for the task, not every visible pixel.

Create the specimen and open it through your local server at design/typography.html. This is a workshop file; the final portfolio build includes the completed apps rather than every exercise.

```html file=design/typography.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Juniper design workshop</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #172b24; background: #fffdf7; line-height: 1.6; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { max-width: 66rem; margin-inline: auto; padding: clamp(1rem, 4vw, 3rem); }
    h1 { font-size: clamp(2rem, 6vw, 4rem); line-height: 1.1; max-width: 15ch; }
    h2 { font-size: 1.5rem; line-height: 1.25; }
    p { max-width: 60ch; }
    .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: .875rem; font-weight: 700; }
    .choices { display: grid; gap: 2rem; }
    article { border: 1px solid #62796c; border-radius: 1rem; padding: 1.5rem; min-width: 0; }
    article > * + * { margin-block-start: .75rem; }
    a { color: #176341; text-underline-offset: .2em; }
    .primary { display: inline-block; background: #176341; color: white; border-radius: .5rem; padding: .75rem 1.25rem; }
    :focus-visible { outline: 3px solid #176341; outline-offset: 4px; }
    svg { width: 100%; height: auto; display: block; }
    @media (min-width: 44rem) { .choices { grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Juniper Café · Neighborhood coffee</p>
    <h1>A calm place to start your day.</h1>
    <p>Fresh coffee, simple food and a quiet corner. Find the details you need before leaving home.</p>
    <div class="choices">
      <article>
        <svg viewBox="0 0 400 160" role="img" aria-labelledby="map-title map-desc">
          <title id="map-title">Illustrated location diagram</title>
          <desc id="map-desc">The café is next to the park on Oak Street. Diagram only; use the address for directions.</desc>
          <rect width="400" height="160" fill="#edf4ed"/>
          <path d="M0 110H400" stroke="#718778" stroke-width="28"/>
          <rect x="190" y="30" width="100" height="60" rx="8" fill="#176341"/>
          <text x="210" y="65" fill="white" font-size="18">Café</text>
          <text x="25" y="55" fill="#172b24" font-size="18">Park</text>
          <text x="140" y="145" fill="#172b24" font-size="16">Oak Street</text>
        </svg>
        <h2>Plan a visit</h2>
        <p>Open daily, 7 am–5 pm. Find us at 24 Oak Street beside the park.</p>
        <a class="primary" href="../cafe/index.html#visit">See visit details</a>
      </article>
      <article>
        <h2>Choose before you arrive</h2>
        <p>Explore coffee, tea and food, including clearly labeled dietary options.</p>
        <a href="../cafe/index.html#menu">Browse the menu</a>
      </article>
    </div>
  </main>
</body>
</html>
```

```check
page design/typography.html "document.querySelectorAll('h1').length" "1" server=static
page design/typography.html "document.querySelector('svg title').textContent" "Illustrated location diagram" server=static
```

## Review by task instead of taste

Compare the specimen at 360px and 1280px, then at 200% zoom. Identify the first three things your eye notices. If they are decoration, brand, and decoration again, important task information may be losing the contest.

Use this critique sequence:

| Lens | Evidence to collect | Possible revision |
|---|---|---|
| Hierarchy | Can a newcomer find hours and the visit action? | Move or emphasize the task information. |
| Typography | Does text remain readable at zoom without clipping? | Adjust measure, line-height or container constraints. |
| Grouping | Can a person tell which explanation belongs to which action? | Reduce internal gaps and enlarge gaps between groups. |
| Color | Does meaning survive without distinguishing two hues? | Add labels, shape or icons with text. |
| Imagery | Does the image answer a question or delay the answer? | Remove it, crop it differently or add useful alternative text. |
| Interaction | Does keyboard focus visibly identify the active control? | Repair outline, order and target spacing. |

For normal text, evaluate at least 4.5:1 contrast against its actual background; large text uses 3:1, and essential non-text control boundaries also have requirements. A color token passing in light mode says nothing about its dark-mode pair. Check real composited colors, not only palette swatches. These minimums do not make tiny or overly light-weight text comfortable.

Ask a participant to plan a visit, without telling them where to look. Record actions and confusion, then change one relevant design decision and retest. Do not turn a single preference into a universal claim. The following note is a structured record, not evidence of a session that has not happened.

```text file=design/critique.txt
Task: Find opening hours and the visit link.
Hypothesis: A clear visit card reduces searching through promotional content.
Observe: Record first action, hesitation, errors and whether the task completed without help.
Revise: Choose one change based on an observed problem.
Retest: Repeat the task and record remaining friction.
Limits: A small convenience sample cannot establish usability for every visitor.
```

```check
contains design/critique.txt "Hypothesis:"
```

## Your turn: make one defensible hierarchy change

Change the primary action label to Plan my visit. Keep the same working destination. Add Observed: and Decision: to the critique note after inspecting the narrow layout, and explain how the wording describes the next step. Record an actual observation, not the sample text from a reference.

```check
page design/typography.html "document.querySelector('.primary').textContent" "Plan my visit" server=static
contains design/critique.txt "Observed:"
contains design/critique.txt "Decision:"
```

```hints
nudge: Change the primary link text; keep its href.
concept: A label should predict what follows the action.
shape: Record the viewport and the visible outcome beside your decision.
```

## Diagnose, explain and review

Temporarily give every paragraph the heading size and every link a filled background. Explain how that changes prioritization, then restore the hierarchy. Test the actual link destination and the narrow viewport. A source check cannot judge visual quality or research honesty.

### Explain it without the reference

Explain the input, state transition and observable output of your change. Predict a failure before introducing it, record what actually happened, restore the code and rerun the check. Write the observed result, your explanation and one case these checks do not establish in your learning journal.
