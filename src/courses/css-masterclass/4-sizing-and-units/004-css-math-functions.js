// css-masterclass — Sizing And Units — Lesson 4: CSS Math Functions
// Auto-converted from src/docs/tutorials/css-masterclass/04-sizing-and-units/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-004-css-math-functions',
  slug: 'css-math-functions',
  chapter: 4,
  order: 4,
  title: 'CSS Math Functions',
  subtitle: 'Sizing And Units',
  tags: ['css-math-functions', 'calc', 'min', 'clamp'],

  hook: {
    question: 'What is "CSS Math Functions", and why does it matter?',
    realWorldContext: 'CSS has a built-in mathematics engine. **The Problem:** Sometimes you need a dimension that relies on two fundamentally different units. For example, "I want this sidebar to be 300px wide, but on a tiny phone screen, I don\'t want it to overflow, so it should be 100% of the screen instead." Historically, this required writing complex Media Queries for every possible screen size. **The Solution:** CSS Math Functions (`calc()`, `clamp()`, `min()`, `max()`) allow the browser to dynamically calculate values at render-time, blending units together and enforcing bounds.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'CSS has a built-in mathematics engine. **The Problem:** Sometimes you need a dimension that relies on two fundamentally different units. For example, "I want this sidebar to be 300px wide, but on a tiny phone screen, I don\'t want it to overflow, so it should be 100% of the screen instead." Historically, this required writing complex Media Queries for every possible screen size. **The Solution:** CSS Math Functions (`calc()`, `clamp()`, `min()`, `max()`) allow the browser to dynamically calculate values at render-time, blending units together and enforcing bounds.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `calc()`\n- **Formal syntax:** `calc( <calc-sum> )`\n- **Accepted value types:** Basic arithmetic (`+`, `-`, `*`, `/`) mixing any compatible length, percentage, or number.\n- **Initial value / Inherited / Animatable:** N/A (It is a function used *within* property values).\n- **Applies to:** Any property that accepts length, percentage, angle, time, or numbers.\n### `min()` / `max()`\n- **Formal syntax:** `min( <calc-sum># )` / `max( <calc-sum># )`\n- **Description:** Takes a comma-separated list of values and returns the smallest (for `min`) or largest (for `max`).\n### `clamp()`\n- **Formal syntax:** `clamp( <minimum>, <preferred>, <maximum> )`\n- **Description:** Takes three values. It attempts to use the `<preferred>` value, but will never shrink below `<minimum>` and never grow above `<maximum>`.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  width: calc(100% - 50px); /* Valid */\n  width: calc(100%-50px);   /* Invalid! */\n  width: calc(100px + 50%); /* Valid */\n  width: calc(100px * 50px);/* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `calc(100%-50px);` is dropped. **CSS requires physical spaces around the `+` and `-` operators.** (Because otherwise, `-50px` looks like a negative number, not a subtraction).\n- `calc(100px * 50px);` is dropped. You cannot multiply two lengths together (that would result in "square pixels"). You can only multiply a length by a unitless number (e.g., `calc(50px * 2)`).',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**The `clamp()` Zoom Bug** If you use pure `vw` for the preferred value in `clamp()` (like `clamp(1rem, 5vw, 3rem)`), you break the browser\'s ability to zoom for visually impaired users. When they zoom in, `5vw` doesn\'t change, so the text stays locked. **Rule:** Always add a relative unit to the preferred value: `clamp(1rem, 5vw + 1rem, 3rem)`. This guarantees that if the user alters their root `1rem` size in the OS settings, the math equation responds to it.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** an element with `width: calc(100% - 20px)`.\n2. Go to the **Computed** tab.\n3. You will not see `calc(...)` here. The browser resolves the math instantly during Layout. If the parent is 400px, you will see `380px`.\n4. Grab the edge of the browser window and drag it. Watch the computed value update 60 times a second.\n5. **Performance impact:** `calc()` is executed on the CPU during the Layout phase. It is incredibly fast. However, nesting dozens of deep `calc()` functions inside each other across a massive DOM tree can occasionally cause minor Layout stuttering. Keep the math simple.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `calc()` vs Preprocessor Math (Sass/LESS)\n- **Sass Math:** `width: (100px - 20px);` computes to `80px` when the CSS is *compiled on the server*. It cannot mix `px` and `%` because the server doesn\'t know how big the user\'s screen is.\n- **`calc()`:** Computes *live in the browser*. It can mix `100% - 20px` because the browser actually knows the pixel value of `100%`.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want an element to be full width, minus a 20px margin on each side** -&gt; `width: calc(100% - 40px);`\n- **I want a font to scale fluidly between a min and max size** -&gt; `font-size: clamp(1rem, 3vw + 1rem, 3rem);`\n- **I want a box to be 50% wide, but never shrink smaller than 300px** -&gt; `width: max(50%, 300px);`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: CSS Math Functions',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'CSS Math Functions',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The `min()` Paradox**\n\n**Question:** If the user opens this on a massive 2000px wide monitor, what is the width of the box? (500px or 2000px?)\n*...predict your answer before reading below...*\n**Explanation:** The width is **500px**. It feels backwards! To make a box "max out" at 500px, you use the `min()` function. The browser asks: "Which is smaller right now, 500px or 100% (2000px)?" 500px is smaller, so it chooses 500. `min(500px, 100%)` is mathematically identical to writing `width: 100%; max-width: 500px;`.',
                html: '<div class="box">box</div>',
                css: '  .box {\n    width: min(500px, 100%);\n  }',
                outputHeight: 180,
              },
            ],
          },
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**Fluid Typography** Before `clamp()`, making a headline shrink on mobile phones and grow on desktops required massive blocks of Media Queries. Now, we use a single line of Fluid Typography:\n\n```css\nfont-size: clamp(1.5rem, 5vw, 4rem);\n```\n\n**Translation:** "Try to make the text exactly 5% of the screen width. But if 5% shrinks smaller than 1.5rem on a phone, stop shrinking and lock at 1.5rem. If 5% grows larger than 4rem on a massive TV monitor, stop growing and lock at 4rem."\n*(Crucial Note: Modern CSS actually prefers blending `vw` and `rem` in the preferred value for accessibility reasons, e.g., `clamp(1.5rem, 2vw + 1rem, 4rem)`, but we will keep it simple for this concept).*'
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If the live preview doesn\'t match what you expected, open the CSS tab and change one property at a time.',
      'Use your browser\'s own DevTools (right-click -> Inspect) on the rendered preview to see the real computed values.',
    ],
    futureLinks: [
      'This is the final lesson in this module — nice work.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can write a `clamp()` function with all three arguments.',
    'I know why `calc(100%-50px)` breaks the CSS parser (Missing spaces).',
    'I understand the paradox of using `min()` to create a maximum boundary.',
    'I know why pure `vw` inside `clamp()` ruins accessibility zooming.',
    'I have applied the fluid typography to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
