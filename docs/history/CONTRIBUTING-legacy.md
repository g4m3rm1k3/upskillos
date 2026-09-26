# Contributing to upSkillOS

Thanks for helping improve open-calc. This guide covers everything you need to add a lesson, a visualization, or fix a bug — including the pitfalls that are easy to miss.

> **New here?** The fastest way to start is the interactive in-app tutorial. Open the app, click the **?** button in the top navigation bar, and follow the "Your First Lesson" walkthrough. It downloads starter templates, steps through each field, and explains how to register your lesson. Come back here when you're ready to understand the full schema.

---

## Development workflow

### One-time setup

1. **Fork** the repository on GitHub (the button, top-right of the repo page) — this creates your own copy at `github.com/your-username/upskillos`.
2. **Clone your fork** to your machine:
   ```bash
   git clone https://github.com/your-username/upskillos.git
   cd upskillos
   npm install
   ```
   Cloning your fork automatically sets up a remote named `origin` pointing at *your* copy — not the original project.
3. **Add the original repository as a second remote**, named `upstream`:
   ```bash
   git remote add upstream https://github.com/g4m3rm1k3/upskillos.git
   git remote -v   # confirm: origin = your fork, upstream = the real project
   ```
   This is the step that makes staying in sync possible at all — without it, `git pull` only ever talks to your fork, which doesn't move on its own when the real project gets new commits.

### Before you start any change — sync first

```bash
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main   # keeps your fork's main up to date too, optional but tidy
```

**This answers "do I just pull changes?" — not quite.** A plain `git pull` on your fork's `main` only fetches from `origin` (your fork), and your fork doesn't automatically track the real project. You have to `fetch upstream` explicitly. `merge --ff-only` (rather than a plain `merge`) is a safety check: it only succeeds if your `main` hasn't drifted, and refuses loudly instead of silently creating a merge commit if it has — if you haven't touched your fork's `main` directly (you shouldn't; always work on branches), this should always succeed.

### Make your change

```bash
git checkout -b fix-golf-tolerance     # branch BEFORE editing anything, off an up-to-date main
# ...make focused changes...
git add <files>
git commit -m "clear message explaining why, not just what"
```

One concern per PR — a bug fix and an unrelated refactor in the same PR make it slower to review and harder to revert if something's wrong. Run `npm run build` locally before opening a PR — a clean build catches most import errors and broken references before a reviewer ever sees them.

### Before opening (or updating) your PR — sync again

If any time has passed since you branched, `upstream/main` may have moved. Check and reconcile before pushing:

```bash
git fetch upstream
git merge-base --is-ancestor upstream/main HEAD && echo "you're current, nothing to do"
```

If that doesn't print "you're current," bring the new commits into your branch (a plain `merge` here is the simplest, safest default — it adds one merge commit rather than rewriting your branch's history, which matters once a PR is open and someone may have already reviewed or pulled your branch):

```bash
git merge upstream/main
# resolve any conflicts if git reports them, then:
git push origin fix-golf-tolerance
```

A concrete cautionary example from this repo's own history: PR #7 sat for a while before merging, and its branch ended up 41 commits behind `upstream/main` by the time it was reviewed — which made its diff look far larger and scarier than the actual change really was. Syncing regularly while a PR is open (or right before opening it) avoids that entirely.

### Open the pull request

Push your branch to **your fork** (`origin`, not `upstream` — you don't have push access to the real repo, and don't need it):

```bash
git push -u origin fix-golf-tolerance
```

Then open the PR on GitHub — it'll offer to compare `your-username:fix-golf-tolerance` against `g4m3rm1k3:main` automatically. Give it a clear summary; for UI or visualization changes, include a screenshot or short screen recording.

### Want the *why*, not just the steps?

The commands above are the practical minimum. For a from-scratch, hands-on explanation of what a branch, a fetch, and a merge actually *are* underneath these commands — including a disposable practice repo where you can experiment risk-free — see the lesson series in [`src/docs/UpSkillOS work/git-fundamentals/`](src/docs/UpSkillOS%20work/git-fundamentals/01-branch-before-you-change-anything.md), written from this project's own real git sessions, mistakes included.

### Every code change ships with a lesson

This repo's standing convention: any non-trivial code change — a new
feature, a refactor, a real bug fix — gets a paired lesson written in
`src/docs/UpSkillOS work/<topic>/`, following the exact template in
[`LessonSchema.md`](src/docs/UpSkillOS%20work/LessonSchema.md). The
point isn't documentation for its own sake — it's turning every commit
into material that teaches the software engineering and CS principles
actually behind the diff, with real, executed output for every concept,
not assumed or hand-waved output. See any folder under `UpSkillOS work/`
for the format in practice (`canvas-notes-lab/` and `lab-registry-autofind/`
are recent, complete examples).

---

## 1. Adding a new lesson

All lesson content lives in `src/content/{course-folder}/`. Each file exports a single JS object. Here is the complete format with every supported field:

```javascript
export default {
  // ── Identity ────────────────────────────────────────────────────────────
  id: 'ch2-001',                         // unique, used for cross-refs
  slug: 'differentiation-rules',         // URL segment
  chapter: 2,                            // must match the chapter's `number` field in index.js
                                         // For calc: a number (0–6). For other courses: a string.
                                         // e.g. chapter: 'geometry-1' or chapter: 'tetris.1'
  order: 1,
  title: 'Differentiation Rules',
  subtitle: 'One-line teaser shown in the chapter index',
  tags: ['power rule', 'product rule'],  // drives video tag-matching and search
  aliases: 'alternate search terms',     // extra search index terms

  // ── Hook ────────────────────────────────────────────────────────────────
  hook: {
    question: 'The motivating question shown at the top of the lesson.',
    realWorldContext: 'Why this matters in the real world.',
    previewVisualizationId: 'PowerRulePattern', // shown in chapter index card
  },

  // ── Intuition ───────────────────────────────────────────────────────────
  intuition: {
    prose: [
      // Array of paragraph strings. Supports inline math with $...$
      // e.g. 'The derivative of $x^n$ is $nx^{n-1}$.'
    ],
    callouts: [
      {
        type: 'insight',   // insight | warning | definition | theorem | mnemonic | proof-map
        title: 'Title',
        body: '\\LaTeX expression',
      },
    ],
    visualizations: [
      {
        id: 'PowerRulePattern',           // must exist in VizFrame.jsx
        title: 'Power Rule Pattern',
        mathBridge: 'Connects $f(x)=x^n$ to its derivative $nx^{n-1}$ visually.',
        caption: 'Short caption under the visualization.',
        props: {},                         // optional: initial props to pass
      },
    ],
  },

  // ── Math ────────────────────────────────────────────────────────────────
  math: {
    prose: [ /* same format as intuition.prose */ ],
    callouts: [ /* same format */ ],
    visualizationId: 'DifferentiationRulesDemo', // single legacy field (still works)
    visualizationProps: {},                       // props for the above
    visualizations: [ /* same array format as intuition.visualizations */ ],
  },

  // ── Rigor ───────────────────────────────────────────────────────────────
  rigor: {
    prose: [ /* optional */ ],
    callouts: [ /* optional */ ],
    visualizationId: 'MyProofViz',  // syncs currentStep with proofSteps below
    visualizationProps: {},
    visualizations: [ /* additional vizzes shown below the proof */ ],
    proofSteps: [
      {
        expression: '\\frac{d}{dx}[x^n] = nx^{n-1}',
        annotation: 'Explanation shown in the sidebar for this step.',
      },
    ],
    title: 'Optional title for the proof block',
  },

  // ── Examples ────────────────────────────────────────────────────────────
  examples: [
    {
      id: 'ch2-001-ex1',                   // REQUIRED — must be unique
      title: 'Differentiating a Polynomial',
      problem: '\\text{Find } f\'(x) \\text{ for } f(x) = 5x^4 - 3x^2.',
      steps: [
        {
          expression: "f'(x) = 20x^3 - 6x",
          annotation: 'Apply the power rule to each term.',
        },
      ],
      conclusion: 'One-sentence takeaway.',
      visualizations: [
        {
          id: 'PowerRulePattern',
          title: 'Power Rule Pattern',
          caption: 'Caption connecting the visualization to this specific example.',
        },
      ],
      // Legacy alternative — also works:
      // visualizationId: 'PowerRulePattern',
      // params: {},
    },
  ],

  // ── Challenges ──────────────────────────────────────────────────────────
  challenges: [
    {
      id: 'ch2-001-ch1',
      difficulty: 'easy',           // easy | medium | hard
      problem: '\\text{Differentiate } f(x) = x^7.',
      hint: 'Apply the power rule: bring the exponent down as a coefficient.',
      walkthrough: [
        {
          expression: "f'(x) = 7x^6",
          annotation: 'Power rule: exponent 7 drops down, new exponent is 6.',
        },
      ],
      answer: "f'(x) = 7x^6",
    },
  ],

  // ── Quiz ────────────────────────────────────────────────────────────────
  // REQUIRED — every lesson must end with a quiz array (see Section 1c)
  quiz: [
    {
      id: 'differentiation-rules-q1',   // format: {lesson-slug}-q{N}
      type: 'choice',                    // 'choice' | 'input'
      text: 'What is $\\dfrac{d}{dx}[x^5]$?',
      options: ['$5x^4$', '$x^4$', '$5x^6$', '$4x^5$'],
      answer: '$5x^4$',                  // must exactly match one options string
      hints: [
        'Apply the power rule: bring the exponent down as a coefficient.',
      ],
      reviewSection: 'Math tab — power rule',
    },
    {
      id: 'differentiation-rules-q2',
      type: 'input',
      text: 'Find $\\dfrac{d}{dx}[3x^4 - 2x]$.',
      answer: '12*x^3 - 2',             // valid mathjs expression (see Section 1c)
      hints: [
        'Apply the power rule term-by-term.',
        'Power rule: $d/dx[3x^4] = 12x^3$; $d/dx[-2x] = -2$.',
      ],
      reviewSection: 'Math tab — power rule',
    },
  ],
}
```

### Content writing rules

- **Prose strings** support mixed math using `$...$` for inline expressions: `'The derivative of $x^n$ is $nx^{n-1}$.'`
- **LaTeX in expression fields** is rendered as a centered block. Escape backslashes as `\\` inside JS strings: `'\\frac{d}{dx}[x^n] = nx^{n-1}'`
- Every `examples` entry **must have an `id`** field (format: `ch{chapter}-{lesson_order}-ex{N}`).
- Keep notation consistent with neighboring lessons — check what symbols they use for the same concepts.
- Do not add a `visualizations` entry whose ID is not registered in `VizFrame.jsx`. The lesson will silently show nothing.

---

## 1b. Lesson Narrative Style Standard

Lessons must read like a chapter of a textbook, not a reference card. The chain rule (`src/content/chapter-2/02-chain-rule.js`) is the canonical example. Every lesson converted or written from scratch should follow this standard.

### The three narrative markers in `intuition.prose`

The `intuition.prose` array must open and close with bold story-arc headers. Use `**...**` syntax (rendered as bold by the prose parser).

```javascript
intuition: {
  prose: [
    // ── Opening: orient the student ──────────────────────────────────────
    '**Where you are in the story:** You have just learned X. That gave you Y. But it cannot handle Z. This lesson closes that gap.',

    // ── Body: build understanding with analogies ──────────────────────────
    'First, think about this concept as an analogy...',
    'A more precise way to see this is...',
    'Here is a worked example in prose before the formal treatment...',

    // ── Closing: forward pointer ─────────────────────────────────────────
    '**Where this is heading:** Now that you have X, the next lesson immediately builds on it by doing Y. Seeing the connection upfront is the point.',
  ],
}
```

The three required markers are:
| Marker | Purpose |
|---|---|
| `**Where you are in the story:**` | Connects to the previous lesson; explains what gap this lesson fills |
| `**Why this matters:**` | (optional but preferred) Names a real-world or within-calculus motivation |
| `**Where this is heading:**` | Forward pointer to the next lesson; makes the chapter arc visible |

### The sequencing callout

Every lesson must include a `type: 'sequencing'` callout in `intuition.callouts` that shows exactly where the lesson sits in the chapter flow:

```javascript
{
  type: 'sequencing',
  title: 'Lesson N of M — Chapter Title',
  body: '**Previous:** One-line description of the prior lesson.\n**This lesson:** One-line description of what this lesson teaches.\n**Next:** One-line description of the next lesson.',
},
```

This callout is how students know they are not lost. It must appear first (or second) in `intuition.callouts`.

### Visualization `mathBridge` instructions

`mathBridge` text is not a description of the visualization — it is a **lesson inside a lesson**. It should give the student explicit step-by-step instructions for what to do and what to observe, following this pattern:

```javascript
{
  id: 'SomeVizId',
  title: 'Descriptive Title',
  mathBridge: 'Before pressing play, identify [something]. Step 1: Set X to Y and verify Z. Step 2: Change A to B — watch C happen. This is [concept] doing its job. The key lesson: [one sentence takeaway].',
  caption: 'Short caption — the one thing to notice.',
}
```

Rules:
- Always start with what the student should do **before** interacting.
- Use numbered steps (`Step 1: ...`, `Step 2: ...`) when there is a sequence to follow.
- End with "The key lesson: ..." to make the mathematical point explicit.
- The caption should be one sentence that could stand alone as a label.

### Analogies and concrete examples in prose

Every `intuition.prose` block should include at least one concrete analogy. The chain rule uses gears, relay races, and onion peeling. Good analogies share these traits:
- They can be described in one or two sentences.
- They make the *structure* of the math visible, not just the answer.
- They transfer — a student can return to the analogy when stuck.

Avoid analogies that require long setup or domain expertise the student may not have.

### Callout types — extended list

In addition to the types listed in Section 1, the following are used in lesson-style content:

| Type | Use |
|---|---|
| `sequencing` | Chapter position map (Previous / This / Next) — required in every lesson |
| `insight` | A short but non-obvious mathematical observation |
| `real-world` | A LaTeX-illustrated connection to physics, engineering, or computing |
| `strategy` | A decision tree or step-by-step workflow for problem solving |
| `proof-map` | A numbered sequence of logical steps (used in `intuition` when a mini-proof belongs in the concept section) |

---

## 1c. Content Quality Standards

Every lesson passes through three stages before it is considered complete. The standards below define what each stage looks like. Do not submit a PR for a lesson below **Review-Ready**.

### Lesson states

| State | What it means |
|---|---|
| **Draft** | File exists, identity fields filled in, prose is rough notes |
| **Review-Ready** | Meets all minimum requirements below — ready for feedback |
| **Complete** | Meets all requirements + has passed a content review |

### Minimum requirements (Review-Ready)

**Identity**
- [ ] `id` is unique across the entire codebase (search for it before using it)
- [ ] `slug` is lowercase, hyphen-separated, no spaces, ≤ 4 words
- [ ] `chapter` matches the chapter `number` in the chapter's `index.js`
- [ ] `order` is correct — no two lessons in the same chapter share the same `order`
- [ ] `title` is a clear question or concept name ≤ 8 words
- [ ] `subtitle` is one descriptive sentence ≤ 15 words
- [ ] `tags` includes at least 3 searchable terms that students would actually type

**Hook**
- [ ] `question` is a genuine curiosity-generating question a real person would ask
- [ ] `realWorldContext` names a specific domain (physics, engineering, computing, finance) and explains *why this concept is needed there* — not just that it exists
- [ ] The hook does not begin teaching — it only creates the need to know

**Intuition**
- [ ] `prose` has at least 4 paragraphs (for a typical lesson)
- [ ] The first prose entry begins with the `**Where you are in the story:**` narrative marker
- [ ] At least one paragraph uses a concrete physical or visual analogy
- [ ] Inline formulas use `$...$` syntax; display formulas use `$...$`
- [ ] All symbols introduced in prose are also listed in `semantics.core`
- [ ] A `type: 'sequencing'` callout is present

**Visualizations**
- [ ] Every `id` in `visualizations` exists in `VizFrame.jsx`
- [ ] Every `mathBridge` follows the pattern: orient → numbered steps → "The key lesson:"
- [ ] Captions are one sentence that stands alone without reading the `mathBridge`

**Math / Rigor (if present)**
- [ ] Definitions are stated precisely — no ambiguous pronouns
- [ ] Examples have both `problem` and `solution` (or `steps` + `conclusion`)
- [ ] All examples have unique `id` fields
- [ ] Proof steps in `rigor.proofSteps` each have a complete `annotation` — not just the expression

**Quiz**
- [ ] Minimum 5 questions; 8–10 for a full lesson
- [ ] Order: recall → computation → conceptual
- [ ] Every question has a unique `id` in `{lesson-slug}-q{N}` format
- [ ] `input` answers are valid mathjs expressions (test them at [mathjs.org](https://mathjs.org/))
- [ ] `choice` answers are verbatim copies of one option string
- [ ] At least one question tests conceptual understanding, not just computation

**Supporting sections**
- [ ] `semantics` covers every symbol used in the lesson
- [ ] `spiral.recoveryPoints` has 1–3 entries with specific connection notes
- [ ] `spiral.futureLinks` has 1–3 entries with specific dependency notes
- [ ] `mentalModel` has 3–5 entries, each ≤ 10 words, in student-voice language

### Quality bar for prose

The following phrases indicate prose that needs revision:

| Weak pattern | What to do instead |
|---|---|
| "As you can see" / "Clearly" | State what the student sees or why it's clear |
| "It can be shown that" | Show it, or link to the rigor section where it is shown |
| "Simply" / "Just" | Remove — what is simple to an expert is not simple to a learner |
| "In conclusion" | The closing must say something new, not summarize the summary |
| Analogy with no follow-through | Return to the analogy when introducing the formula |
| Formula introduced before motivation | Move any formula below its intuitive explanation |

### Math accuracy checklist

Before submitting, verify:
- [ ] Every formula appears correctly rendered in the dev build (`npm run dev`)
- [ ] Notation is consistent with neighboring lessons (same symbols, same conventions)
- [ ] No sign errors, coefficient errors, or limit errors in worked examples
- [ ] The conclusion of every example is explicitly stated, not left implicit
- [ ] Edge cases and restrictions (domain, continuity requirements) are noted where relevant

---

## 1d. Quiz Section Standard

Every lesson must end with a `quiz` array. This is the primary self-check mechanism — it drives the mastery star in the sidebar. Do not omit it.

### How the quiz works (implementation details)

The quiz is rendered by `src/components/lesson/LessonQuizBlock.jsx`. Understanding how it works helps you write correct quizzes:

- **`input` grading:** The grader uses [mathjs](https://mathjs.org/) to evaluate the student's answer and the correct answer as math expressions, testing at several numeric sample points (x=2.7183, t=1.4142, n=3). Expressions that are symbolically equivalent pass even if written differently. String fallback: normalized case- and whitespace-insensitive comparison.
- **Auto-prepended typing guide:** For `input` questions, the grader automatically prepends a "How to type math" hint (showing `x^2`, `sqrt(x)`, `2*x`, `pi`, etc.) as the very first hint level. You do not need to write this yourself — your hints array starts at hint level 2.
- **`choice` grading:** Exact string match against `answer`. The `answer` string must be identical to one of the `options` strings character-for-character (including any LaTeX).
- **Mastery scoring:** ≥ 80% correct = **Mastered** (green); 50–79% = **Partial Credit** (amber); < 50% = **Needs Review** (red). Score is persisted to `localStorage` per lesson.

### Full quiz schema

```javascript
quiz: [
  // — Multiple choice —
  {
    id: 'chain-rule-q1',              // REQUIRED — format: {lesson-slug}-q{N}
    type: 'choice',
    text: 'For $y = f(g(x))$, the chain rule gives $dy/dx =$',
    options: [
      "$f'(x) \\cdot g'(x)$",
      "$f'(g(x)) \\cdot g'(x)$",     // ← answer must exactly match this string
      "$f'(g'(x))$",
      "$f(g'(x)) \\cdot g(x)$",
    ],
    answer: "$f'(g(x)) \\cdot g'(x)$",  // verbatim copy of the correct option
    hints: [
      'Differentiate the outside function at the inside, then multiply by the inner derivative.',
    ],
    reviewSection: 'Intuition tab — outside-inside method',
  },

  // — Free-input (mathjs-graded) —
  {
    id: 'chain-rule-q2',
    type: 'input',
    text: 'Find $\\dfrac{d}{dx}[(3x+1)^5]$.',
    answer: '5*(3*x+1)^4 * 3',        // valid mathjs expression; equivalent forms also accepted
    hints: [
      // Hint (2/2) — first shown after the auto-prepended typing guide
      'Outside function: $u^5$; inside: $3x+1$. Derivative of outside at inside is $5(3x+1)^4$.',
      // Hint (2/2) — bigger nudge
      'Multiply by the inner derivative: $d/dx[3x+1] = 3$. Result: $5(3x+1)^4 \\cdot 3$.',
    ],
    reviewSection: 'Math tab — chain rule with power functions',
  },
],
```

### Quiz writing rules

| Rule | Detail |
|---|---|
| **Coverage** | At least one question per major concept. 8–10 questions covers a full lesson; 5–7 is the minimum. |
| **Question order** | Recall first (What is the formula?), then computation (Evaluate this), then conceptual (Why does this condition matter?). |
| **`id` format** | `{lesson-slug}-q{N}`, 1-indexed. The `chain-rule` lesson uses `chain-rule-q1`, `chain-rule-q2`, etc. |
| **`input` answer format** | Write as a valid [mathjs](https://mathjs.org/docs/expressions/syntax.html) expression: `12*x^3 - 2`, `sqrt(x^2+9)`, `x / sqrt(x^2+9)`, `pi/4`. Equivalent forms are accepted. Avoid ambiguous notation. |
| **`choice` answer format** | Verbatim copy of the correct option string — including all LaTeX. Even a space difference causes a mismatch. |
| **`hints` count** | For `input`: your array is hints 2 and 3 (hint 1 is the auto-injected typing guide). One substantive hint is fine; two is better. For `choice`: one hint pointing to the concept is sufficient. |
| **`reviewSection`** | Pattern: `"Tab name — section title"` e.g. `'Math tab — twin pillars'`. Shown below an incorrect answer so students know where to look. |
| **LaTeX in `text` and `options`** | Use `$...$` for inline math. Escape backslashes as `\\`: `$\\dfrac{d}{dx}$`. |
| **Conceptual questions** | At least one `choice` question per quiz that tests understanding, not just computation. These are the hardest to fake — include them. |

---

## 2. Adding a new visualization

### Step 1 — Create the component

Add a `.jsx` file in:
- `src/components/viz/d3/` for 2D D3 visualizations
- `src/components/viz/three/` for 3D Three.js visualizations
- `src/components/viz/react/` for pure React visualizations (sliders, interactive proofs, games)

### Step 2 — Component API

Every visualization receives a `params` prop. For proof-synced visualizations, `params.currentStep` is automatically incremented as the user steps through the proof.

```jsx
export default function MyViz({ params = {} }) {
  const { currentStep = 0 } = params

  // D3 pattern — use a ResizeObserver so the viz is responsive
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const draw = () => {
      const W = containerRef.current?.clientWidth || 500
      // ... D3 drawing using W and currentStep
    }
    const ro = new ResizeObserver(draw)
    if (containerRef.current) ro.observe(containerRef.current)
    draw()
    return () => ro.disconnect()
  }, [currentStep /*, other deps */])

  return (
    <div ref={containerRef}>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
```

### Step 3 — Dark mode

**All D3 visualizations must support dark mode.** Check the current theme at the start of your `draw()` function and use a color token object:

```javascript
const draw = () => {
  const isDark = document.documentElement.classList.contains('dark')
  const C = {
    bg:     isDark ? '#0f172a' : '#f8fafc',
    text:   isDark ? '#e2e8f0' : '#1e293b',
    axis:   isDark ? '#334155' : '#cbd5e1',
    // ... add tokens for every color you use
  }
  // use C.bg, C.text etc. — never hardcode color strings
}
```

Pure React visualizations should use Tailwind's `dark:` variants (`dark:bg-slate-900`, `dark:text-slate-200`, etc.).

### Step 4 — Register it

Add a lazy import to the `VIZ_REGISTRY` object in `src/components/viz/VizFrame.jsx`:

```javascript
const VIZ_REGISTRY = {
  // ... existing entries
  MyViz: lazy(() => import('./d3/MyViz.jsx')),
}
```

The key is the string ID you will use in content files.

---

## 3. Managing Video Content

The Tutorial Hub uses a two-tier registry system to keep content decoupled from the player logic.

### Tier 1 — Video Database (`src/content/videos/videoDatabase.js`)
This is the master list of every video in the application. Entries are identified by a unique key (usually `youtube-ID`).

```javascript
export const VIDEO_DATABASE = {
  'dQw4w9WgXcQ': {
    title: 'The Secret of Limits',
    source: 'YouTube',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  // ...
}
```

### Tier 2 — Video Placement (`src/content/videos/videoPlacementMap.js`)
This maps the database IDs to specific lessons and categorizes them by their pedagogical intent.

```javascript
export const VIDEO_PLACEMENT_MAP = {
  'ch2-001': { // The Lesson ID
    hook: ['dQw4w9WgXcQ'],      // Intro/Motivating videos
    intuition: [],             // Visual/Geometric concepts
    math: [],                  // Formal proofs
    rigor: [],                 // Deep technical dives
    examples: {                // Tied to specific worked examples
      'ch2-001-ex1': ['another-id']
    }
  }
}
```

### Adding a custom video
Users can add their own "Custom Tutorials" directly in the app. These are saved to `localStorage` and appear in a special "Your Videos" section within the playlist for that lesson.

---

## 4. Common pitfalls

These mistakes are silent — they produce no error but the lesson looks wrong or broken.

### Duplicate keys in a JS object
JavaScript silently overwrites earlier values when an object has two keys with the same name. This is the most common cause of broken proof play buttons.

```javascript
// BUG — second visualizationId silently overwrites the first
rigor: {
  visualizationId: 'ProofViz',    // this gets overwritten and ignored
  proofSteps: [...],
  visualizationId: 'OtherViz',   // this is the one that runs — but ignores currentStep
}

// FIX — use the visualizations array for the second viz
rigor: {
  visualizationId: 'ProofViz',   // syncs with proofSteps
  proofSteps: [...],
  visualizations: [{ id: 'OtherViz', title: '...' }],  // shown below the proof
}
```

### KaTeX — `\left` and `\right` must be in the same expression
KaTeX requires `\left[` and its matching `\right]` to appear in a single `expression` string. Splitting them across two separate `<KatexInline>` calls will fail silently.

```javascript
// BUG — \left[ and \right] in different KatexInline calls
<KatexInline expr="\left[" />
<KatexInline expr="..." />
<KatexInline expr="\right]" />

// FIX — use \bigl[ and \bigr] which are self-contained (no pairing required)
<KatexInline expr="\bigl[ ... \bigr]" />
// OR put the whole expression in one call
<KatexInline expr="\left[ ... \right]" />
```

### Missing visualization ID in VizFrame
If you reference a visualization ID in a content file but forget to register it in `VizFrame.jsx`, the component renders nothing with no error message. Always add both.

### Hardcoded colors in D3
If you draw with `stroke="#ccc"` or `fill="white"`, those colors will be invisible or wrong in the opposite theme. Always use the color token pattern described above.

### ResizeObserver missing
Without `ResizeObserver`, a D3 visualization freezes at its initial size and breaks when the panel is resized or the screen rotates. Use the pattern shown in Step 2 above.

---

## 4. UI components reference

| Component | Location | Key props |
|---|---|---|
| `ExampleBlock` | `lesson/ExampleBlock.jsx` | `example` object, `number` |
| `DynamicProof` | `lesson/DynamicProof.jsx` | `steps`, `visualizationId`, `title` |
| `ChallengeBlock` | `lesson/ChallengeBlock.jsx` | `challenge` object |
| `KatexBlock` | `math/KatexBlock.jsx` | `expr` — centered block LaTeX |
| `KatexInline` | `math/KatexInline.jsx` | `expr` — inline LaTeX |
| `VizFrame` | `viz/VizFrame.jsx` | `id`, `initialProps`, `title` |

---

## 5. Pull request checklist

- [ ] `npm run build` completes without errors
- [ ] Every new `visualizationId` / `visualizations[].id` exists in `VizFrame.jsx`
- [ ] Every new `examples` entry has a unique `id` field
- [ ] Lesson has a `quiz` array with at least 5 questions (see Section 1c)
- [ ] Quiz `input` answers are valid mathjs expressions; `choice` answers verbatim-match an option
- [ ] D3 visualizations handle dark mode via color tokens, not hardcoded colors
- [ ] D3 visualizations use `ResizeObserver`
- [ ] No duplicate keys in any JS content object
- [ ] LaTeX `\left`/`\right` pairs are in the same expression string
- [ ] New cross-references point to real lesson slugs
- [ ] Written math is accurate and notation matches neighboring lessons

---

## Code style

- Follow the existing file organization and naming conventions.
- Avoid unrelated refactors in feature PRs — one concern per PR.
- Keep changes focused and reviewable.

---

## 1d. Supporting Sections Standard

Every lesson also includes four supporting sections that appear after `crossRefs` and before `checkpoints`. These are not optional — they serve specific pedagogical roles and are used by the app.

### `semantics` — Symbols & Meaning

Maps the key symbols and notation in the lesson to plain-English meanings, plus a short list of rules of thumb for applying the lesson's techniques.

```javascript
// ─── Semantic Layer ───────────────────────────────────────────────────────
semantics: {
  core: [
    {
      symbol: 'f(g(x))',
      meaning: 'a composition — g is the inner function, f is the outer function',
    },
    // one entry per key symbol or term in the lesson
  ],
  rulesOfThumb: [
    'Identify the outermost operation first before choosing a rule.',
    'Never forget to multiply by the inner derivative.',
    // 3-5 short, actionable rules — these become the student\'s mental checklist
  ],
},
```

### `spiral` — Recovery Points & Future Links

Two-directional navigation: where to go if the student is lost, and where this lesson leads.

```javascript
// ─── Spiral Learning ─────────────────────────────────────────────────────
spiral: {
  recoveryPoints: [
    {
      lessonId: 'ch0-composition',
      label: 'Composition of functions (Chapter 0)',
      note: 'Explain exactly why this prerequisite matters for THIS lesson — be specific.',
    },
  ],
  futureLinks: [
    {
      lessonId: 'ch4-u-substitution',
      label: 'Ch. 4: U-Substitution',
      note: 'Explain exactly how this lesson becomes prerequisite for the future lesson — be specific.',
    },
  ],
},
```

`recoveryPoints` — 1-3 earlier lessons the student should review if stuck. The `note` must explain the specific connection, not just name the topic.

`futureLinks` — 1-3 future lessons that depend on this one. The `note` should make the dependency explicit so students understand why they are learning this now.

### `assessment` — Quick-Fire Self-Check

3 short questions for rapid self-assessment, distinct from the full `quiz`. These are simpler than quiz questions — recall and direct application only.

```javascript
// ─── Assessment ──────────────────────────────────────────────────────────
assessment: {
  questions: [
    {
      id: 'slug-assess-1',
      type: 'input',        // or 'choice'
      text: 'Short direct question.',
      answer: 'answer',
      hint: 'One-sentence hint showing the key step.',
    },
  ],
},
```

### `mentalModel` — Compression

3-5 ultra-compressed phrases that capture the entire lesson. These become the student's mental shorthand when they need to recall the lesson under exam pressure.

```javascript
// ─── Mental Model Compression ────────────────────────────────────────────
mentalModel: [
  'Chain Rule = outer\'(inner) × inner\'',
  'Leibniz: dy/dx = (dy/du)(du/dx)',
  'Peel layers outside→in, multiply a derivative at each layer',
  'Forgetting the inner derivative is the #1 chain rule error',
],
```

Rules:

- Maximum 10 words per entry.
- Write as the student would say it to themselves, not as a formal definition.
- The last entry should name the most common mistake if there is a clear one.

---

## 6. Manual Build Playbook (End-to-End)

This section is a practical, copyable checklist for contributors who want to manually build lessons and visualizations from scratch.

Use this when you need to:

- add a new lesson
- add a new visualization
- register a visualization
- attach visualizations to lesson sections
- enable tooltips in lesson prose
- connect proof steps to a step-aware visualization
- validate everything before opening a PR

### Phase A — Before writing code

1. Decide whether this is a content-only change, a visualization-only change, or both.
2. Find the target lesson file and neighboring lessons to match tone and notation.
3. Choose your visualization ID up front (example: `InductionStairCase`).
4. Confirm the visualization does not already exist in `src/components/viz/VizFrame.jsx`.
5. Decide where the visualization should appear:
  - `hook.previewVisualizationId` (chapter card preview)
  - `intuition.visualizations` (concept-first)
  - `math.visualizations` (formalized intuition)
  - `rigor.visualizationId` (proof-synced)
  - `rigor.visualizations` (extra non-synced cards)

### Phase B — Add a new lesson (or update one)

1. Create or open a lesson file under the appropriate content folder.
  - Discrete math lessons live in `src/content/discrete-math/`
  - Calculus and other tracks use their own content folders
2. Fill or update these major blocks in order:
  - `id`, `slug`, `chapter`, `order`, `title`, `subtitle`
  - `hook`
  - `intuition`
  - `math`
  - `rigor`
  - `examples`
  - `challenges`
  - `quiz` (required — see Section 1c)
3. Keep additions additive unless replacement is explicitly requested.
4. Keep IDs unique across examples/challenges.

### Phase C — Add a new visualization component

1. Choose a location by tech:
  - React: `src/components/viz/react/`
  - D3: `src/components/viz/d3/`
  - Three.js: `src/components/viz/three/`
2. Create the component file with a default export.
3. Accept `params = {}` so content can pass props.
4. For proof-aware visuals, read `params.currentStep` to sync with `DynamicProof`.
5. If D3-based, include responsive redraw logic and dark-mode-aware color tokens.

### Phase D — Register visualization in the registry

1. Open `src/components/viz/VizFrame.jsx`.
2. Add a lazy registry entry in `VIZ_REGISTRY`:

```javascript
MyVizId: lazy(() => import("./react/MyVizId.jsx")),
```

3. Ensure the key string exactly matches the content-side visualization ID.

### Phase E — Attach visualization to lesson content

1. For a normal card in a section, add inside `visualizations`:

```javascript
{
  id: 'MyVizId',
  title: 'Card Title',
  caption: 'Short caption',
  mathBridge: 'Optional bridge text',
  props: { guided: true }
}
```

2. For proof-synced visuals, use in `rigor`:

```javascript
visualizationId: 'MyVizId',
visualizationProps: {},
proofSteps: [ ... ]
```

3. If you need extra visuals below the proof, keep them in `rigor.visualizations`.

### Phase F — Add tooltips in lesson prose

Use this exact HTML pattern inside prose strings:

```javascript
'A <span class="tooltip" data-tooltip="Definition text">term</span> is ...'
```

Important:

1. Keep double quotes exactly as shown for parser compatibility.
2. Tooltip rendering depends on both parser + CSS:
  - Parser: `src/components/math/parseProse.jsx`
  - Styles: `src/styles/index.css`
3. Current fallback behavior also sets `title` and keyboard focus support.

### Phase G — Add examples and challenges correctly

1. Every example must have a unique `id`.
2. Use `steps` with `expression` and `annotation`.
3. Every challenge should include:
  - `id`, `difficulty`, `problem`, `hint`, `walkthrough`, `answer`
4. Keep challenge answer format consistent with nearby lessons.

### Phase H — Build and verify

Run:

```bash
npm run build
```

A successful build validates:

1. lesson content is parseable
2. search index generation succeeded
3. visualization imports resolve
4. no compile-time JSX/content errors

Then verify in app:

1. lesson appears in chapter flow
2. visualization cards render in intended sections
3. proof controls update proof-synced visualization
4. tooltip text appears on hover/focus
5. no duplicate visualization cards unless intentional

### Phase I — Troubleshooting map

If a visualization does not appear:

1. ID mismatch between content and `VIZ_REGISTRY`
2. component file path mismatch
3. section not rendered due to wrong structure (`blocks` vs prose/callouts/visualizations)

If tooltips do not appear:

1. prose uses wrong span pattern (quote style/order mismatch)
2. parser is missing tooltip branch in `parseProse`
3. CSS `.tooltip` rules missing or overridden

If proof visualization appears twice:

1. same ID is in `rigor.visualizationId` and also duplicated in `rigor.visualizations` with same props

If build fails after content edits:

1. malformed object boundaries in lesson arrays
2. unescaped backslashes in LaTeX strings
3. duplicate keys in object literals

### Phase J — Minimal add-only workflow (fast path)

When asked to add without replacing, use this sequence:

1. Add new visualization file
2. Register in `VizFrame.jsx`
3. Append one new item to target lesson `visualizations` array
4. Add optional bridge prose/callout lines only (do not delete existing prose)
5. Build and verify

### Phase K — Handoff notes for manual contributors

Before handing off your changes, include:

1. files touched
2. visualization IDs added
3. lesson sections modified
4. whether content was additive vs replacement
5. build status and any remaining non-blocking warnings

This keeps future contributors from redoing integration work or accidentally replacing existing lesson content.

### Phase L — Make This Visible on GitHub

If you want this guide to be easy for contributors to find on GitHub, do all three:

1. Keep this file named exactly `CONTRIBUTING.md` at repo root.
2. Keep a clear link in `README.md` to this guide.
3. In pull requests, reference `CONTRIBUTING.md` when review comments involve lesson or visualization workflow.

---

## 7. ScienceNotebook Lesson Format

Some courses (Chemistry, Digital Fundamentals) use a different lesson content format instead of the standard `hook / intuition / math / rigor / quiz` structure. These lessons render through the `ScienceNotebook` component — a no-code, sequential cell viewer.

### When to use ScienceNotebook

Use this format when:
- The lesson is primarily visual and interactive (canvas demos, toggles, sliders)
- There is no prerequisite symbolic math — the course is concept-first
- The lesson has challenge questions answered by selecting options, not typing math

Use the standard lesson format for all calculus, precalc, linear algebra, discrete math, and physics content.

### Cell format

A ScienceNotebook lesson is a plain JS object with a `cells` array:

```javascript
export const LESSON_XY_1_0 = {
  title: 'Lesson Title',
  subtitle: 'One-sentence teaser.',
  sequential: true,   // each cell unlocks after the previous one is interacted with

  cells: [
    // ── Markdown cell — prose only ──────────────────────────────────────
    {
      type: 'markdown',
      instruction: `Prose text here. Supports **bold**, _italic_, and \`code\`.`,
    },

    // ── Visual cell — canvas/HTML demo, auto-runs on mount ──────────────
    {
      type: 'js',
      instruction: `Prose shown above the demo.`,
      html: `<div id="app">...</div>`,
      css:  `body { margin: 0; }`,
      startCode: `// vanilla JS that runs inside a sandboxed iframe`,
      outputHeight: 320,   // iframe height in px, default 320
    },

    // ── Challenge cell — multiple choice ────────────────────────────────
    {
      type: 'challenge',
      instruction: `The question text.`,
      options: [
        { label: 'A', text: 'First choice' },
        { label: 'B', text: 'Second choice' },
        { label: 'C', text: 'Third choice' },
      ],
      check: (label) => label === 'B',   // return true for the correct label
      successMessage: 'Correct! Because...',
      failMessage: 'Not quite. Think about...',
    },
  ],
}
```

### File exports

Every ScienceNotebook lesson file needs **two exports**:

```javascript
// Named export — used by the wrapper viz component
export const LESSON_XY_1_0 = { ... }

// Default export — used by the chapter index and course registration
export default {
  id: 'xy-1-0-lesson-title',
  slug: 'lesson-title',
  chapter: 'xy.1',           // string, not a number
  order: 0,
  title: 'Lesson Title',
  subtitle: 'One-sentence teaser.',
  previewVisualizationId: 'MyWrapperViz',
  intuition: {
    visualizations: [{ id: 'MyWrapperViz', title: 'Lesson Title' }],
  },
}
```

### Wrapper viz component

Because `VizFrame` renders a component by ID and passes `params` — not a `lesson` object — each ScienceNotebook lesson needs a thin wrapper component that self-imports its own data:

```javascript
// src/components/viz/react/MyWrapperViz.jsx
import ScienceNotebook from './ScienceNotebook.jsx'
import { LESSON_XY_1_0 } from '../../../content/my-course/lesson1-0.js'

export default function MyWrapperViz({ params }) {
  return <ScienceNotebook lesson={LESSON_XY_1_0} params={params} />
}
```

Register it in `VizFrame.jsx`:
```javascript
MyWrapperViz: lazy(() => import("./react/MyWrapperViz.jsx")),
```

**Do not** point multiple lessons at the same wrapper ID. Each lesson needs its own wrapper file so they render independently.

---

## 8. Page Types — Tools Pages vs Lesson Pages

### ⚠ Critical distinction — do not confuse these

The app has two fundamentally different types of pages. **Never add lesson content to a tools page.**

#### Lesson pages — `LessonPage.jsx`
Route: `#/chapter/:chapterId/:lessonSlug`

Every lesson in every course — calculus, chemistry, digital fundamentals, discrete math, physics — is accessed through this single route. `LessonPage` reads from `LESSON_MAP` (built from `src/content/index.js`) and renders the lesson via `MicroCycleLesson`. ScienceNotebook lessons appear in the intuition tab as a viz registered in `VizFrame`.

**Do not build custom per-course lesson pages.**

#### Tools pages — standalone pages for interactive tools
These pages exist for tools that are not lessons. They have their own routes registered in `App.jsx`.

| Page | Route | What it contains |
|---|---|---|
| `ChemistryPage.jsx` | `#/chemistry` | Periodic Table, Molecule Builder |
| `LogicSimPage.jsx` | `#/logic-sim` | Digital logic circuit simulator |
| `UniversalCalcPage.jsx` | `#/universal-calc` | Calculator tools |
| `ReferencePage.jsx` | `#/reference` | Math reference cards |

**`ChemistryPage` is a tools page.** It contains the Periodic Table (`PeriodicTable.jsx`) and Molecule Builder (`MoleculeBuilder.jsx`). It does not render chemistry lessons. Chemistry lessons live in `src/content/chemistry-1/` and are accessed via `#/chapter/chem.1/:lessonSlug` like every other course.

If a future course needs a dedicated tools page (e.g. a circuit board for electronics), create a new page file and route. Never add lesson rendering to an existing tools page.

---

## 9. Adding a New Course

To add a course that goes through the standard lesson route:

### Step 1 — Register the course key
Add an entry to `src/content/courses.js`:
```javascript
{ key: 'my-course', label: 'My Course', path: '/course/my-course', desc: 'Short description', color: 'sky' }
```
`color` must be a Tailwind color name (`sky`, `lime`, `violet`, `amber`, etc.).

### Step 2 — Create lesson files
Create `src/content/my-course/lesson1-0.js` etc. following Section 1 (standard format) or Section 7 (ScienceNotebook format).

### Step 3 — Create a chapter index
Create `src/content/my-course/index.js`:
```javascript
import lesson1_0 from './lesson1-0.js'
import lesson1_1 from './lesson1-1.js'

const MY_CH1 = {
  title: 'Chapter Title',
  number: 'my.1',          // string key — must be unique across all courses
  slug: 'my-chapter-slug',
  course: 'my-course',
  lessons: [lesson1_0, lesson1_1],
}

export default [MY_CH1]
```

Chapter `number` convention:
- Calculus: integers `0`–`6`
- All other courses: `'coursekey.N'` strings, e.g. `'chem.1'`, `'df.1'`, `'geo.1'`

### Step 4 — Register in content/index.js
In `src/content/index.js`:
```javascript
import myCourse from './my-course/index.js'

const MY_COURSE_CURRICULUM = myCourse.map(ch => ({ ...ch, course: 'my-course' }))

export const CURRICULUM = [
  ...CALC_CURRICULUM,
  // ... other courses
  ...MY_COURSE_CURRICULUM,
]
```

### Step 5 — Build and verify
```bash
npm run build
```
The course will appear in `CoursePage` automatically once registered. Lessons are accessible at `#/chapter/my.1/:lessonSlug`.

How GitHub surfaces this file:

1. GitHub automatically recognizes root `CONTRIBUTING.md` as contribution instructions.
2. Many GitHub views show a "Contributing" hint/link that points here.
3. Contributors still discover it fastest when README also links directly.

### Phase M — How to Modify This Guide Safely

When updating this guide itself:

1. Additive edits are preferred; avoid removing existing instructions unless they are wrong.
2. Keep section headings stable (`Phase A`, `Phase B`, etc.) so external references do not break.
3. Include concrete file paths and minimal copy-paste snippets.
4. After doc edits, run `npm run build` to confirm no accidental code/content breakage happened in the same branch.
5. In PR description, summarize doc deltas as:
  - Added
  - Clarified
  - Deprecated

### Phase N — LaTeX, Tooltip, and Content Edge Cases

Use this checklist before merging content-heavy lessons.

#### LaTeX in JS strings

1. Escape backslashes in JS strings: `\\frac`, `\\sum`, `\\forall`.
2. Keep `\left` and `\right` paired in the same expression string.
3. Prefer plain ASCII in prose around LaTeX when possible to reduce parser surprises.
4. If using apostrophes inside single-quoted JS strings, escape as `\'` or switch quoting strategy.

#### parseProse behavior constraints

1. Inline math: `$...$`
2. Block math: `\\[ ... \\]`
3. Tooltip span pattern must be exact:

```html
<span class="tooltip" data-tooltip="Definition">term</span>
```

4. Do not reorder attributes in tooltip spans unless parser is updated too.
5. Tooltip fallback currently uses `title` and keyboard focus in addition to CSS hover.

#### Unicode and typography

1. Unicode math symbols (`∀`, `∈`, `⇒`, `≤`) are allowed in content strings.
2. If a symbol causes rendering issues, switch to LaTeX equivalent inside math expressions.
3. Keep wording consistent between prose and formula symbols.

#### Proof sync gotchas

1. `rigor.visualizationId` is the proof-synced visualization.
2. Extra visuals should go in `rigor.visualizations`, not as duplicate `visualizationId` keys.
3. If a proof-synced visualization appears twice, remove duplicate ID+props pair from extras.

#### Content indexing gotchas

1. Missing commas or object boundaries can break search-index generation with opaque parse errors.
2. Keep `id` fields unique across lessons/examples/challenges.
3. Prefer small, validated edits for long content arrays.

### Phase P — Adding Videos to the Tutorial Hub

The Tutorial Hub uses a two-tier registry to decouple video metadata from lesson content.

1. **Register the video:** Add the video metadata to `src/content/videos/videoDatabase.js`.
   > [!IMPORTANT]
   > Use a descriptive prefix to ensure ID uniqueness and distinguish between different content providers. This prevents namespace collisions as the database grows.
   
   **Standard Prefixes:**
   - `ka-` : Khan Academy (e.g., `ka-EKvHQc3QEow`)
   - `vb-` : Michel van Biezen Physics (e.g., `vb-vectors-1`)
   - `3b1b-` : 3Blue1Brown Essence of Calculus
   - `prof-leonard-` : Professor Leonard
   - `oct-` : The Organic Chemistry Tutor

   ```javascript
   'ka-EKvHQc3QEow': { 
     title: 'Newton, Leibniz, and Usain Bolt', 
     url: 'https://www.youtube.com/embed/EKvHQc3QEow', 
     source: 'Khan Academy' 
   },
   ```
2. **Map to a lesson:** Link the video ID to a lesson ID in `src/content/videos/videoPlacementMap.js`. Ensure you are using the correct lesson ID prefix (`p1-` for Physics).
   ```javascript
   'ch1-001': { 
     intuition: ['my-video-id'],
     examples: {
       'ch1-001-ex1': ['another-video-id']
     }
   },
   ```
3. **Verify:** Open the Tutorial Hub in the app and navigate to the lesson. The video should appear in the "intuition" or "examples" section of the playlist.

### Phase Q — GitHub Pages and Docs Surface (Project-Level)

For repository maintainers:

1. Keep GitHub Pages source as **GitHub Actions**.
2. Ensure `README.md` includes links to:
  - `CONTRIBUTING.md`
  - any contributor playbook section anchors
3. If creating additional docs (for example under `docs/`), keep `CONTRIBUTING.md` as canonical and link outward, not vice versa.

This avoids split-brain documentation where instructions drift between multiple files.

## 10. Algebra Registry — Inline Popover Tooltips

### What it is

`src/content/algebraRegistry.js` is a flat dictionary of algebra prerequisite topics. Each entry is a short reference card (name, formula, example, description) that pops up inline inside lesson prose when a student clicks a linked term. This lets lessons reference algebra techniques without repeating explanations or sending the student away.

### How it renders

In lesson prose strings, use the `{{algebra:topicId|link text}}` pattern:

```js
"Factor the numerator using {{algebra:difference-of-squares|difference of squares}}."
```

`parseProse.jsx` detects this pattern and renders it as an `<AlgebraMicroLesson>` component. The `link text` portion is rendered as a KaTeX inline expression (so it can contain math). On click, a popover appears showing the formula, example, and description from the registry.

### Registry entry shape

```js
'topic-id': {
  name: 'Human-Readable Name',         // popover header
  formula: 'a^2 - b^2 = (a-b)(a+b)',  // KaTeX block (escape backslashes in JS: \\frac)
  example: 'x^2 - 9 = (x-3)(x+3)',    // KaTeX block
  description: 'Plain English explanation.',
  chapterZeroSlug: 'algebraic-techniques', // slug of the Ch0 lesson to deep-link to
}
```

### Adding a new entry

1. Open `src/content/algebraRegistry.js`.
2. Add a new key–object pair before the closing `};`.
3. Use kebab-case for the key (e.g. `'sum-of-cubes'`).
4. Set `chapterZeroSlug` to the Chapter 0 lesson slug that covers this technique — used for the "review it" deep-link at the bottom of the popover.
5. Use the entry in prose with `{{algebra:your-new-key|display text}}`.

### Current entries

| ID | Name |
|---|---|
| `difference-of-squares` | Difference of Squares |
| `difference-of-cubes` | Difference of Cubes |
| `exponent-rules-multiply` | Multiplying Exponents |
| `exponent-rules-power` | Power of a Power |
| `log-power-rule` | Log Power Rule |
| `triangle-inequality` | Triangle Inequality |
| `conjugate-multiplication` | Multiplying by the Conjugate |
| `fraction-split` | Splitting the Numerator |
| `factoring-fractional-powers` | Factoring Fractional Powers |
| `solve-simple-quadratic` | Solving Simple Quadratics |

### Rules

1. Registry entries are shared across all lessons — edits affect every lesson that uses that ID.
2. The `formula` and `example` fields go through KatexBlock — escape all backslashes in JS strings (`\\frac`, `\\sqrt`).
3. If a `topicId` is not found in the registry, `AlgebraMicroLesson` renders the link text as a plain underlined span (graceful fallback — no crash).
4. Do not use `{{algebra:...}}` syntax inside KaTeX expressions — only in plain prose strings processed by `parseProse`.
