// css-masterclass — Sizing And Units — Lesson 3: Advanced Units (ch, ex, cq)
// Auto-converted from src/docs/tutorials/css-masterclass/04-sizing-and-units/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-003-advanced-units-ch-ex-cq',
  slug: 'advanced-units-ch-ex-cq',
  chapter: 4,
  order: 3,
  title: 'Advanced Units (ch, ex, cq)',
  subtitle: 'Sizing And Units',
  tags: ['advanced-units-ch-ex-cq'],

  hook: {
    question: 'What is "Advanced Units (ch, ex, cq)", and why does it matter?',
    realWorldContext: 'Sometimes, measuring elements based on the root font size (`rem`) or the glass of the screen (`vw`) isn\'t precise enough for advanced UI design. **The Problem:** - If you are building a text input, you often want it to be exactly "20 characters wide", but `rem` doesn\'t measure character width. - If you are building a component (like a Card) that gets placed in a tiny sidebar *and* a massive main grid, viewport units (`vw`) are useless because the component\'s design needs to react to its *local container*, not the whole screen. **The Solution:** - **Character Units (`ch`, `ex`):** Units derived from the physical dimensions of the specific font currently being rendered. - **Container Query Units (`cqw`, `cqh`):** Modern units derived from the specific parent container rather than the global viewport.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Sometimes, measuring elements based on the root font size (`rem`) or the glass of the screen (`vw`) isn\'t precise enough for advanced UI design. **The Problem:** - If you are building a text input, you often want it to be exactly "20 characters wide", but `rem` doesn\'t measure character width. - If you are building a component (like a Card) that gets placed in a tiny sidebar *and* a massive main grid, viewport units (`vw`) are useless because the component\'s design needs to react to its *local container*, not the whole screen. **The Solution:** - **Character Units (`ch`, `ex`):** Units derived from the physical dimensions of the specific font currently being rendered. - **Container Query Units (`cqw`, `cqh`):** Modern units derived from the specific parent container rather than the global viewport.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### Typographic Units\n- **`ch` (Character):** Represents the exact width of the number "0" (zero) in the element\'s current font and size.\n- **`ex` (x-height):** Represents the height of the lowercase letter "x" in the element\'s current font.\n- **Initial value / Inherited / Animatable:** N/A (These are value types).\n- **Applies to:** Any property that accepts a length.\n### Container Query Units (Level 5 Modern CSS)\n- **`cqw` (Container Query Width):** 1% of the width of the nearest *query container*.\n- **`cqh` (Container Query Height):** 1% of the height of the nearest *query container*.\n- **`cqi` (Inline) / `cqb` (Block):** Logical equivalents (usually width and height, respectively).\n*(Crucial Note: Container units ONLY work if you have explicitly defined a parent as a container using `container-type: inline-size;`).*',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  width: 50CH; /* Valid, but bad practice. */\n  width: 10 cqw; /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `width: 50CH;` is valid because CSS units are case-insensitive. However, convention mandates lowercase.\n- `width: 10 cqw;` is dropped due to the space.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: 'Using `ch` for `max-width` is highly accessible. Because `ch` is tied to the font size, if a visually impaired user increases their font size to 24px, the `65ch` max-width automatically expands physically on the screen to accommodate 65 of the new, massive characters. If you had used `max-width: 600px`, the 24px text would have wrapped aggressively after only 20 characters.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** an element with `width: 20ch;`.\n2. Go to the Styles tab and change the `font-family` from a standard font to `monospace` (like Courier New).\n3. Watch the physical width of the box jump!\n4. **Explanation:** Monospace fonts have very wide "0" characters compared to standard fonts. Because `ch` is literally measuring the "0" of the current font, changing the font physically changes the size of the box!\n5. **Performance impact:** Very fast, but changing a font file late in the loading process will trigger a massive Layout shift as all `ch` and `ex` values instantly recalculate.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `vw` vs `cqw`\n- **`vw`:** Measures the glass of the monitor. Useful for full-page hero sections.\n- **`cqw`:** Measures the parent container. Useful for reusable components that don\'t know where they will be placed on the screen.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a blog post to have perfect readable line lengths** -&gt; `max-width: 65ch;`\n- **I want an icon to perfectly match the height of the lowercase text next to it** -&gt; `height: 1ex;`\n- **I want a text input that fits a 5-digit zip code perfectly** -&gt; `width: 5ch;` (Assuming a monospace font).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Advanced Units (ch, ex, cq)',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Advanced Units (ch, ex, cq)',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Zero Measure**\n\n**Question:** The input is 10 `ch` wide, and the user typed 10 "W"s. Will the 10 "W"s fit perfectly inside the input box without scrolling?\n*...predict your answer before reading below...*\n**Explanation:** **No, they will overflow.** The `ch` unit measures the width of the "0" (zero) character. In non-monospace fonts (like Arial), a "W" is significantly wider than a "0". Therefore, 10 "W"s take up more space than 10 "0"s. The text will not fit. (If the font was monospace, they would fit perfectly).',
                html: '<input type="text" value="WWWWWWWWWW">',
                css: '  input {\n    font-family: Arial, sans-serif;\n    width: 10ch;\n  }',
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
      '**The Optimal Reading Width** Print designers have known for centuries that the optimal line length for human reading is between 45 and 75 characters. If a line is longer than 80 characters, the eye struggles to track back to the start of the next line. In modern CSS, we enforce this typographically using the `ch` unit:\n\n```css\n.article-body {\n  max-width: 65ch; /* Never let the text get wider than 65 characters! */\n}\n```\n\n**The Container Revolution** Historically, responsive design required Media Queries (`@media (max-width: 800px)`), which looked at the *screen size*. But a `.card` in a narrow sidebar looks identical to a `.card` on a narrow mobile phone. Container Queries allow the `.card` to size its internal fonts based on the width of the *sidebar*, not the screen.\n\n```css\n.card-title {\n  font-size: 5cqw; /* 5% of the card\'s width, not the screen\'s width */\n}\n```'
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
      'Next lesson: CSS Math Functions.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why `ch` physically changes size if I change the font.',
    'I know that `ch` measures the "0" character, not the average character.',
    'I understand why `65ch` is used for optimal reading lengths.',
    'I can explain the difference between a viewport unit (`vw`) and a container unit (`cqw`).',
    'I have applied the `ch` constraint to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
