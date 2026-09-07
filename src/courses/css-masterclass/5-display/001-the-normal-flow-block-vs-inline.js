// css-masterclass — Display — Lesson 1: The Normal Flow (Block vs Inline)
// Auto-converted from src/docs/tutorials/css-masterclass/05-display/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-001-the-normal-flow-block-vs-inline',
  slug: 'the-normal-flow-block-vs-inline',
  chapter: 5,
  order: 1,
  title: 'The Normal Flow (Block vs Inline)',
  subtitle: 'Display',
  tags: ['the-normal-flow-block-vs-inline', 'display'],

  hook: {
    question: '**The Problem:** If you place a `<p>` tag and an `<a>` tag in your HTML, how does the browser decide where they sit?',
    realWorldContext: 'Every HTML element is placed onto the screen according to a set of rules called the **Normal Document Flow**. **The Problem:** If you place a `<p>` tag and an `<a>` tag in your HTML, how does the browser decide where they sit? Does the link go below the paragraph? Next to it? What happens if they bump into each other? **The Solution:** The `display` property dictates an element\'s fundamental geometric behavior. By default, the browser assigns every element one of two primary behaviors: - **Block-level elements:** Stack vertically like bricks. They demand 100% of the available width and push everything else down. (e.g., `<div>`, `<p>`, `<h1>`). - **Inline-level elements:** Flow horizontally like words in a sentence. They only take up as much width as their text, and wrap to the next line when they hit the edge. (e.g., `<span>`, `<a>`, `<strong>`).',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Every HTML element is placed onto the screen according to a set of rules called the **Normal Document Flow**. **The Problem:** If you place a `<p>` tag and an `<a>` tag in your HTML, how does the browser decide where they sit? Does the link go below the paragraph? Next to it? What happens if they bump into each other? **The Solution:** The `display` property dictates an element\'s fundamental geometric behavior. By default, the browser assigns every element one of two primary behaviors: - **Block-level elements:** Stack vertically like bricks. They demand 100% of the available width and push everything else down. (e.g., `<div>`, `<p>`, `<h1>`). - **Inline-level elements:** Flow horizontally like words in a sentence. They only take up as much width as their text, and wrap to the next line when they hit the edge. (e.g., `<span>`, `<a>`, `<strong>`).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `display` (The Outer Value)\n- **Formal syntax:** `display: [ <display-outside> || <display-inside> ] | <display-internal> | <display-box> | <display-legacy>`\n- **Accepted value types:** `block`, `inline`, `inline-block`, `flex`, `grid`, `none`, `contents`, etc.\n- **Initial value:** `inline` (Though the browser\'s default stylesheet aggressively overrides this for tags like `<div>` to make them `block`).\n- **Inherited:** **No.**\n- **Animatable:** No (in CSS3, though Level 4 allows discrete animation for entry/exit effects).\n- **Percentages allowed?:** N/A.\n- **Computed value:** The specified keyword.\n- **Applies to:** All elements.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\nspan {\n  width: 500px;         /* Ignored by the browser engine! */\n  height: 500px;        /* Ignored! */\n  margin-top: 50px;     /* Ignored! */\n  padding-top: 50px;    /* Works, but overlaps other text! */\n}\n```\n\n**Behavioral Quirks of `inline`:** This isn\'t a parser error; this is a rendering engine rule. **Pure `inline` elements completely ignore width, height, and vertical margins.** Why? Because they are meant to flow smoothly within a paragraph of text. If a `<span>` in the middle of a sentence suddenly became 500px tall, it would violently break the paragraph apart.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**Don\'t change semantic layout just for visuals.** If you have a list of links, they should be wrapped in a `<ul>` and `<li>` structure because that tells a screen reader "This is a list of 5 navigation items". By default, `<li>` elements are `display: list-item` (which acts like a block). If you want them to sit side-by-side horizontally, you should change their CSS to `display: inline-block` or `display: flex`. Do *not* delete the `<ul>` and `<li>` tags and replace them with `<span>` tags just to make them horizontal. CSS handles the visual layout; HTML handles the semantic meaning.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** a standard `<p>` tag and an `<a>` tag.\n2. In the Styles tab, locate the "Computed" box model diagram for the `<a>` (a pure inline element).\n3. Try to add `width: 500px` to the `<a>`. Notice how the box model diagram refuses to change its width.\n4. Now, change the display property of the `<a>` to `display: inline-block`.\n5. Notice how the width instantly takes effect!\n6. **Explanation:** `inline-block` is the magic hybrid. Externally, it flows like text so it can sit next to other words. Internally, it acts like a block, allowing you to set explicit widths, heights, and vertical margins.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `block` vs `inline` vs `inline-block`\n- **`block`:** Starts a new line. Respects width/height/margins.\n- **`inline`:** Flows with text. Ignores width/height/vertical margins.\n- **`inline-block`:** Flows with text (like inline), but respects width/height/margins (like block). Perfect for buttons!',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want this element to start on a new line and push everything down** -&gt; `display: block;`\n- **I want to bold one word in the middle of a sentence** -&gt; `display: inline;` (The default for `<span>` or `<strong>`).\n- **I am building a Button. I want it to sit next to other buttons horizontally, but I need to give it a specific height and vertical margin** -&gt; `display: inline-block;`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: The Normal Flow (Block vs Inline)',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'The Normal Flow (Block vs Inline)',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Stack**\n\n**Question:** Since both boxes are tiny (50px), is there enough room for Box B to sit to the right of Box A on the same line? Will it?\n*...predict your answer before reading below...*\n**Explanation:** There is enough room, but **No, it will not.** Box B will render below Box A. A `block` element aggressively demands its own horizontal line. Even if it is only 50px wide, it projects an invisible forcefield to the right edge of the screen, forcing the next element to drop down.',
                html: '<div class="box-1">A</div>\n<div class="box-2">B</div>',
                css: '  .box-1 { display: block; width: 50px; }\n  .box-2 { display: block; width: 50px; }',
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
      '**The Two-Value Syntax** Historically, we wrote `display: block;` or `display: flex;`. In modern CSS (Level 3/4), the `display` property actually accepts *two* values simultaneously to describe how the box behaves externally (among its peers) and internally (for its children).\n- `display: block flex;` means "Externally, I am a block that stacks vertically. Internally, my children use flexbox."\n- `display: inline flex;` (which we used to write as `inline-flex`) means "Externally, I flow like text. Internally, my children use flexbox."\nFor backward compatibility, writing a single value like `display: flex` automatically computes to `block flex`.'
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
      'Next lesson: Hiding Elements.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why `width: 500px` fails on a pure `inline` element.',
    'I know why a `block` element drops to a new line even if it has a small width.',
    'I understand how `inline-block` combines the best of both worlds.',
    'I can use DevTools to prove that an inline element ignores vertical margins.',
    'I have applied the `inline-block` button styling to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
