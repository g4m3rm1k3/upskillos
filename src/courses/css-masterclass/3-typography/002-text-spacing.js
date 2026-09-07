// css-masterclass — Typography — Lesson 2: Text Spacing
// Auto-converted from src/docs/tutorials/css-masterclass/03-typography/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-002-text-spacing',
  slug: 'text-spacing',
  chapter: 3,
  order: 2,
  title: 'Text Spacing',
  subtitle: 'Typography',
  tags: ['text-spacing', 'line-height', 'letter-spacing', 'word-spacing'],

  hook: {
    question: 'What is "Text Spacing", and why does it matter?',
    realWorldContext: 'Reading text on a screen is inherently fatiguing for the human eye. **The Problem:** Default browser spacing mashes lines of text together vertically and clumps letters horizontally. If lines are too close, the eye loses its place when dropping to the next line. If they are too far apart, the lines feel disconnected. **The Solution:** We must sculpt the negative space *inside* and *around* the text using CSS text spacing properties (`line-height`, `letter-spacing`, `word-spacing`).',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Reading text on a screen is inherently fatiguing for the human eye. **The Problem:** Default browser spacing mashes lines of text together vertically and clumps letters horizontally. If lines are too close, the eye loses its place when dropping to the next line. If they are too far apart, the lines feel disconnected. **The Solution:** We must sculpt the negative space *inside* and *around* the text using CSS text spacing properties (`line-height`, `letter-spacing`, `word-spacing`).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `line-height`\n- **Formal syntax:** `line-height: normal | <number> | <length> | <percentage>`\n- **Accepted value types:** Unitless numbers (`1.5`), lengths (`px`, `rem`), percentages (`%`), keywords (`normal`).\n- **Initial value:** `normal` (Depends on the user agent, usually computes to ~1.2).\n- **Inherited:** **Yes.**\n- **Animatable:** Yes.\n- **Percentages allowed?:** Yes (Relative to the font size of the element itself).\n- **Computed value:** Absolute length (For percentages/lengths) or the number itself (For unitless numbers).\n- **Applies to:** All elements.\n### `letter-spacing` (Tracking)\n- **Formal syntax:** `letter-spacing: normal | <length>`\n- **Initial value:** `normal`.\n- **Inherited:** **Yes.**\n- **Animatable:** Yes.\n- **Percentages allowed?:** No.\n- **Computed value:** Absolute length.\n### `word-spacing`\n- **Formal syntax:** `word-spacing: normal | <length-percentage>`\n- **Initial value:** `normal`.\n- **Inherited:** **Yes.**',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\np {\n  line-height: -1.5; /* Invalid! */\n  letter-spacing: 2%; /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `line-height: -1.5;` is dropped. Line-height cannot be negative.\n- `letter-spacing: 2%;` is dropped. Letter spacing accepts lengths (`px`, `em`, `rem`) but *not* percentages in standard CSS.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**WCAG Spacing Requirements:** To ensure readability for users with cognitive disabilities (like dyslexia), the WCAG accessibility guidelines state:\n- Line spacing (line-height) must be at least **1.5** (150%) within paragraphs.\n- Letter spacing must be at least **0.12 times** the font size (e.g., `0.12em`).\n- Word spacing must be at least **0.16 times** the font size (e.g., `0.16em`).\nYou don\'t always have to go that far for general UI, but `line-height: 1.5` is the universal baseline for body paragraphs.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -> **Inspect** a `<p>` tag.\n2. Look at the box model diagram in the **Computed** tab.\n3. Notice that `line-height` actually increases the *content height* of the text node itself. It adds space evenly above and below the text glyph (called "leading" in traditional typography).\n4. **Performance impact:** Animating `line-height` or `letter-spacing` is brutally expensive. It changes the geometry of the text, causing the words to reflow and wrap differently, triggering **Layout** for the entire page. Never animate these properties on hover.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `line-height` vs `margin-bottom`\n- **`line-height`:** Adds space *between the lines of a single paragraph*.\n- **`margin-bottom`:** Adds space *between separate paragraphs*.\nDo not use `line-height: 3` to push two paragraphs apart; use `margin`.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I\'m styling a long paragraph of body text** -> `line-height: 1.5;`\n- **I\'m styling a massive, bold `<h1>` headline** -> `line-height: 1.1;` or `1.2` (Headlines need tighter spacing or they look disconnected).\n- **I\'m styling ALL CAPS SUBTITLES** -> `letter-spacing: 0.05em;` (All caps text is very hard to read without extra breathing room between the letters).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Text Spacing',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Text Spacing',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Magic of `em`**\n\n**Question:** In physical pixels, which element has more space between its letters?\n*...predict your answer before reading below...*\n**Explanation:** The **`<h1>`** has more space. The `em` unit is relative to the element\'s *current font size*. For the `h1`, `0.1 * 2rem = 0.2rem` of spacing. For the `p`, it\'s `0.1 * 1rem = 0.1rem`. Using `em` for letter-spacing is brilliant because the spacing scales dynamically if you change the font size!',
                html: '<div class="box">Box</div>',
                css: '  h1 {\n    font-size: 2rem;\n    letter-spacing: 0.1em;\n  }\n  p {\n    font-size: 1rem;\n    letter-spacing: 0.1em;\n  }',
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
      '**The Unitless `line-height` Rule** In older codebases, you might see `line-height: 24px` or `line-height: 150%`. Modern CSS best practices mandate using **unitless numbers** (e.g., `line-height: 1.5`). Why? Because of inheritance math. If a parent is `20px` with a `150%` line-height, it computes to `30px`. That `30px` absolute value is inherited by children. If a child has `10px` text, it will still have a massive `30px` line-height! If you use a unitless number (`1.5`), the *multiplier* is inherited, not the computed result. The child will correctly multiply its `10px` text by `1.5` to get `15px`.'
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
      'Next lesson: Text Alignment and Decoration.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I know why we use unitless numbers (`1.5`) for `line-height` instead of percentages or pixels.',
    'I can explain why `line-height` differs for headlines (`1.1`) vs paragraphs (`1.5`).',
    'I understand why `em` is the perfect unit for `letter-spacing`.',
    'I know not to animate text spacing because it triggers Layout.',
    'I have applied the spacing rules to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
