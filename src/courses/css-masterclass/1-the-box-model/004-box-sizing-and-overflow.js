// css-masterclass — The Box Model — Lesson 4: Box Sizing and Overflow
// Auto-converted from src/docs/tutorials/css-masterclass/01-the-box-model/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-004-box-sizing-and-overflow',
  slug: 'box-sizing-and-overflow',
  chapter: 1,
  order: 4,
  title: 'Box Sizing and Overflow',
  subtitle: 'The Box Model',
  tags: ['box-sizing-and-overflow', 'box-sizing', 'overflow'],

  hook: {
    question: 'What is "Box Sizing and Overflow", and why does it matter?',
    realWorldContext: 'By default, CSS adds padding and borders *on top* of the declared width. **The Problem:** If you set a box to `width: 400px`, and then add `padding: 24px` and a `border: 1px`, the physical width on the screen becomes 400 + 24 + 24 + 1 + 1 = **450px**. The padding pushes the box outward. This makes building precise layouts a mathematical nightmare because changing the padding breaks the width. Furthermore, if you constrain a box\'s geometry, its internal text might be too big to fit inside the box, causing it to spill out onto the page. **The Solution:** - `box-sizing`: Instructs the browser engine how to calculate the total dimensions (pushing padding inward instead of outward). - `overflow`: Instructs the browser engine what to do when content exceeds those dimensions.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'By default, CSS adds padding and borders *on top* of the declared width. **The Problem:** If you set a box to `width: 400px`, and then add `padding: 24px` and a `border: 1px`, the physical width on the screen becomes 400 + 24 + 24 + 1 + 1 = **450px**. The padding pushes the box outward. This makes building precise layouts a mathematical nightmare because changing the padding breaks the width. Furthermore, if you constrain a box\'s geometry, its internal text might be too big to fit inside the box, causing it to spill out onto the page. **The Solution:** - `box-sizing`: Instructs the browser engine how to calculate the total dimensions (pushing padding inward instead of outward). - `overflow`: Instructs the browser engine what to do when content exceeds those dimensions.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `box-sizing`\n- **Formal syntax:** `box-sizing: content-box | border-box`\n- **Initial value:** `content-box`.\n- **Inherited:** **No.** (Though it is common practice to forcefully inherit it globally using a `*` reset).\n- **Animatable:** No.\n- **Percentages allowed?:** N/A.\n- **Computed value:** As specified.\n- **Applies to:** All elements that accept width or height.\n### `overflow`\n- **Formal syntax:** `overflow: visible | hidden | clip | scroll | auto`\n- **Initial value:** `visible`.\n- **Inherited:** No.\n- **Animatable:** No.\n- **Percentages allowed?:** N/A.\n- **Computed value:** As specified.\n- **Applies to:** Block containers, flex containers, grid containers.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  box-sizing: padding-box; /* Invalid! */\n  overflow: none;          /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `box-sizing: padding-box;` was an experimental value supported in old versions of Firefox, but was removed from the CSS specification. Modern browsers will drop it.\n- `overflow: none;` is dropped. The correct keyword to hide overflow is `hidden` or `clip`, not `none`.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**Crucial A11y Rule:** Avoid using `overflow: hidden` on text containers with a fixed height. If a visually impaired user increases their browser font size to 200%, the text will grow, hit the hidden boundary, and be silently chopped off, making the rest of the paragraph completely unreadable and inaccessible. Always prefer `overflow: auto` (which adds a scrollbar) or simply remove fixed heights to let the box grow with the text.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** your card.\n2. In the Styles tab, toggle `box-sizing: border-box` off and on.\n3. Watch the physical size of the card on the screen. When it is off, the card visibly jumps outward by 48 pixels (24px padding * 2 sides). When it is on, the outer boundary remains rigid, and the inner content area squeezes inward to make room for the padding.\n4. **Performance impact:** `overflow: hidden` forces the browser to create a clipping mask, which can have minor implications on mobile GPU render layers, but is generally very performant. `overflow: scroll` creates a new scrolling context, which modern browsers hardware-accelerate effortlessly.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `overflow: hidden` vs `overflow: clip`\n- **`overflow: hidden`:** Hides overflowing content, but still allows the element to be scrolled programmatically via JavaScript (e.g., `element.scrollTop`).\n- **`overflow: clip`:** A modern addition to CSS. It completely forbids all scrolling, including programmatic JavaScript scrolling. It is slightly more performant than `hidden` because the browser doesn\'t have to build a scroll container in memory.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want my 50% width columns to actually fit side-by-side without borders breaking them** -&gt; `box-sizing: border-box;`\n- **I have a rounded image, but the square corners of the photo stick out of the rounded border** -&gt; `overflow: hidden;`\n- **I have a long list of items in a fixed-height sidebar** -&gt; `overflow: auto;` (Only adds a scrollbar if needed).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Box Sizing and Overflow',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Box Sizing and Overflow',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Math**\n\n**Question:** How many pixels wide is the inner content area where the text sits? (200? 100?)\n*...predict your answer before reading below...*\n**Explanation:** The content area is **90px** wide. Total Width (200) - Left Padding (50) - Right Padding (50) - Left Border (5) - Right Border (5) = 90. The browser mathematically crushed the content area to guarantee the outer boundary stayed exactly at 200px.',
                html: '<div class="box">box</div>',
                css: '  .box {\n    box-sizing: border-box;\n    width: 200px;\n    padding: 50px;\n    border: 5px solid black;\n  }',
                outputHeight: 180,
              },
              {
                id: 2,
                type: 'js',
                instruction: '**Checkpoint 2: The Spillage**\n\n**Question:** The text is larger than the 50x50 circle. What happens to the text? Does it stay inside the blue circle?\n*...predict your answer before reading below...*\n**Explanation:** The text **spills completely out of the circle** and renders over the white page background. The initial value of `overflow` is `visible`. The browser refuses to hide data by default. To make the text respect the rounded corners of the circle, you must explicitly add `overflow: hidden`.',
                html: '<div class="tiny-box">I am way too much text to fit in a 50px circle.</div>',
                css: '  .tiny-box {\n    width: 50px;\n    height: 50px;\n    background: blue;\n    border-radius: 50%;\n  }',
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
      'The default `content-box` behavior is largely considered a historical mistake in CSS, dating back to when the web was just academic documents rather than UI applications.\nToday, almost every modern website and CSS framework (including Tailwind, Bootstrap, and material-ui) begins with a "CSS Reset" that globally overrides the browser default:\n\n```css\n*, *::before, *::after {\n  box-sizing: border-box;\n}\n```\n\nThis single rule fixes the math of CSS forever. With `border-box`, setting `width: 400px` guarantees the element will never exceed 400 pixels, regardless of how much padding or border you add. The browser subtracts the padding from the inner content area instead of adding it to the outer boundary.'
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
    'I can explain the mathematical difference between `content-box` and `border-box`.',
    'I know why `overflow: hidden` is dangerous for text accessibility.',
    'I can use DevTools to watch the content box squeeze when `border-box` is toggled.',
    'I can predict whether overflowing text will be visible or hidden by default.',
    'I have applied the math fixes to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
