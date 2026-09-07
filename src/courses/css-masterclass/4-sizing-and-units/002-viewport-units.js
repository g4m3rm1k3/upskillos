// css-masterclass — Sizing And Units — Lesson 2: Viewport Units
// Auto-converted from src/docs/tutorials/css-masterclass/04-sizing-and-units/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-002-viewport-units',
  slug: 'viewport-units',
  chapter: 4,
  order: 2,
  title: 'Viewport Units',
  subtitle: 'Sizing And Units',
  tags: ['viewport-units'],

  hook: {
    question: 'Why?',
    realWorldContext: 'Percentages (`%`) are relative to the *parent* container. **The Problem:** If you want a `<div>` to fill exactly 100% of the browser window\'s height, writing `height: 100%;` usually fails. Why? Because it tries to be 100% of its parent (the `<body>`), which is 100% of its parent (the `<html>`), which might only be 50 pixels tall! You have to write an unbroken chain of `height: 100%` all the way up the DOM tree to make it work. **The Solution:** Viewport units (`vw`, `vh`) bypass the parent entirely. They are relative to the physical glass screen of the user\'s browser window (the "Viewport").',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Percentages (`%`) are relative to the *parent* container. **The Problem:** If you want a `<div>` to fill exactly 100% of the browser window\'s height, writing `height: 100%;` usually fails. Why? Because it tries to be 100% of its parent (the `<body>`), which is 100% of its parent (the `<html>`), which might only be 50 pixels tall! You have to write an unbroken chain of `height: 100%` all the way up the DOM tree to make it work. **The Solution:** Viewport units (`vw`, `vh`) bypass the parent entirely. They are relative to the physical glass screen of the user\'s browser window (the "Viewport").',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### Viewport Width & Height\n- **`vw` (Viewport Width):** 1vw is exactly 1% of the width of the browser window. (`100vw` = full width).\n- **`vh` (Viewport Height):** 1vh is exactly 1% of the height of the browser window. (`100vh` = full height).\n- **Initial value / Inherited / Animatable:** N/A (These are value types).\n- **Applies to:** Any property that accepts a length (`width`, `height`, `font-size`, `padding`, etc.).\n### Viewport Minimum & Maximum\n- **`vmin`:** 1% of whichever is *smaller*: the width or the height.\n- **`vmax`:** 1% of whichever is *larger*: the width or the height.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  height: 50 vh; /* Invalid! */\n  width: 100vw%; /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `height: 50 vh;` is dropped due to the space.\n- `width: 100vw%;` is dropped. You cannot combine two different units (viewport and percentage) into a single string. (You must use `calc()` to combine units, which we learn in Lesson 4).',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**The `vw` Font-Size Tragedy:** Developers often think it\'s clever to make text infinitely scalable by writing `font-size: 5vw;`. This means the text is always 5% of the screen width. This is an **accessibility disaster**.\n1. If the user opens the site on a massive 4K TV, the text becomes cartoonishly huge.\n2. If the user opens it on a tiny phone, the text shrinks to micro-pixels and becomes completely unreadable.\n3. If a visually impaired user uses their browser zoom feature, the font *ignores them* because the physical screen width hasn\'t changed!\n**Rule:** Never use pure `vw` for `font-size`.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** an element with `width: 50vw`.\n2. Grab the edge of your browser window with your mouse and slowly drag it to make the window smaller and larger.\n3. Watch the element resize in real-time. It is constantly recalculating its width to be exactly 50% of whatever the current window width is.\n4. **Performance impact:** Viewport units are extremely performant because the browser engine hooks them directly into the window resize event. However, the modern `dvh` unit forces the browser to recalculate layout every frame while the user is scrolling on a mobile device (as the URL bar moves). Use `dvh` only when necessary for full-screen containers.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `100%` vs `100vw`\n- **`width: 100%`:** Fills 100% of the *parent element*.\n- **`width: 100vw`:** Fills 100% of the *screen*. If the parent is a 400px column in the center of the page, `100vw` will aggressively break out of the column and smash into the left and right edges of the monitor.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a hero image to fill the exact height of the user\'s phone screen** -&gt; `height: 100dvh;`\n- **I want a box to always be a perfect square** -&gt; `width: 20vw; height: 20vw;`\n- **I want fluid text that scales with the screen** -&gt; *Wait for Lesson 4 where we learn `clamp()`! Never use pure `vw`.*',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Viewport Units',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Viewport Units',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: Perfect Squares**\n\n**Question:** If the user opens this on a tall, narrow mobile phone, what shape is the red box? (A tall rectangle, or a perfect square?)\n*...predict your answer before reading below...*\n**Explanation:** It is a **perfect square**. Even though `height` is usually vertical, we mapped it to `50vw` (Viewport Width). Because both the width and the height are pulling their math from the *exact same horizontal measurement*, they will always equal the exact same pixel value. This is a brilliant trick for building responsive squares.',
                html: '<div class="box">box</div>',
                css: '  .box {\n    width: 50vw;\n    height: 50vw;\n    background: red;\n  }',
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
      '**The Mobile Scrollbar Bug** In the early days of mobile web design, developers used `height: 100vh;` to make full-screen hero sections. But mobile browsers (like Safari on iOS) have a URL address bar that dynamically hides and shows as you scroll. When the URL bar is visible, `100vh` ignores it and draws the box *behind* the URL bar, cutting off the bottom of your content!\nModern CSS (Level 4) fixed this by introducing specific viewport units:\n- **`svh` (Small Viewport Height):** The safe height when the URL bar is fully expanded.\n- **`lvh` (Large Viewport Height):** The maximum height when the URL bar is fully hidden.\n- **`dvh` (Dynamic Viewport Height):** The height that dynamically calculates and shifts as the URL bar appears/disappears.\nAlways use `100dvh` instead of `100vh` for full-screen mobile layouts today.'
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
      'Next lesson: Advanced Units (ch, ex, cq).',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain the difference between `100%` and `100vw`.',
    'I know why we use `100dvh` instead of `100vh` on mobile (The URL bar).',
    'I know why using `5vw` for `font-size` breaks accessibility zooming.',
    'I can use `vw` on both width and height to create a responsive square.',
    'I have applied the `100dvh` wrapper to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
