// css-masterclass — The Box Model — Lesson 1: Dimensions
// Auto-converted from src/docs/tutorials/css-masterclass/01-the-box-model/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-001-dimensions',
  slug: 'dimensions',
  chapter: 1,
  order: 1,
  title: 'Dimensions',
  subtitle: 'The Box Model',
  tags: ['dimensions', 'width', 'min-width', 'max-width'],

  hook: {
    question: 'What is "Dimensions", and why does it matter?',
    realWorldContext: 'Every element on a web page is a rectangular box. By default, a box (like a `<div>`) takes up 100% of the horizontal space available to it and only enough vertical space to wrap its contents. **The Problem:** Unconstrained boxes are terrible for user interfaces. A box that stretches across an entire widescreen monitor makes text unreadable (the lines are too long). A box that shrinks tightly to one word looks broken. **The Solution:** The dimension properties (`width`, `height`, `min-width`, `max-width`, etc.) allow us to command the browser engine to constrain these mathematical boxes to specific boundaries.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Every element on a web page is a rectangular box. By default, a box (like a `<div>`) takes up 100% of the horizontal space available to it and only enough vertical space to wrap its contents. **The Problem:** Unconstrained boxes are terrible for user interfaces. A box that stretches across an entire widescreen monitor makes text unreadable (the lines are too long). A box that shrinks tightly to one word looks broken. **The Solution:** The dimension properties (`width`, `height`, `min-width`, `max-width`, etc.) allow us to command the browser engine to constrain these mathematical boxes to specific boundaries.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `width` / `height`\n- **Formal syntax:** `width: <length> | <percentage> | auto`\n- **Accepted value types:** pixels (`px`), rems (`rem`), percentages (`%`), viewport units (`vw`, `vh`), `auto`, `fit-content`, `min-content`, `max-content`.\n- **Initial value:** `auto` (Width expands to fill parent; Height collapses to wrap children).\n- **Inherited:** **No.** If width inherited, every child would explicitly lock itself to the parent\'s width, breaking horizontal padding.\n- **Animatable:** Yes (but extremely expensive).\n- **Percentages allowed?:** Yes (Resolves relative to the parent\'s content box).\n- **Computed value:** Absolute pixels (e.g., `400px`).\n- **Applies to:** All elements except non-replaced inline elements (like `<span>`).\n### `min-width` / `min-height`\n- **Initial value:** `auto` (for flex/grid items) or `0` (for block boxes).\n- **Inherited:** No.\n- **Animatable:** Yes.\n- **Applies to:** All elements except non-replaced inline elements.\n### `max-width` / `max-height`\n- **Initial value:** `none` (no limit).\n- **Inherited:** No.\n- **Animatable:** Yes.\n- **Applies to:** All elements except non-replaced inline elements.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  width: 400;       /* Invalid! */\n  height: -50px;    /* Invalid! */\n  max-width: auto;  /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `width: 400;` is dropped entirely. You **must** include a unit (`px`, `rem`, etc.) for non-zero values. The parser marks this line as invalid and ignores it.\n- `height: -50px;` is dropped. Dimensions cannot be negative.\n- `max-width: auto;` is dropped. The initial value is `none`, not `auto`.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: 'Fixed heights are a massive accessibility hazard. If a visually impaired user zooms their browser to 200%, the text size doubles. If the text is trapped in a box with `height: 200px;`, the text will spill out of the box and overlap with other elements, rendering the site unusable. **Rule:** Use `min-height` instead of `height` to allow boxes to grow dynamically with zoomed text.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open your HTML project.\n2. Right-click the element and select **Inspect**.\n3. In the **Styles** tab, change the `width` of an element.\n4. Open the **Performance** tab and run a profile while animating width.\n5. **Performance impact:** Animating `width` or `height` is one of the most expensive things you can do in CSS. It triggers **Layout** (calculating the geometry of the box), which triggers **Paint** (drawing the pixels), which triggers **Composite**. Animating dimensions causes "Layout Thrashing" and will drop your framerate below 60fps on slow devices. Avoid animating dimensions whenever possible (animate `transform: scale()` instead).',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `height` vs `min-height`\n- `height: 200px;`: The box is strictly 200px tall. If you put 300px of text inside it, the text spills out the bottom.\n- `min-height: 200px;`: The box is *at least* 200px tall. If you put 300px of text inside it, the box automatically stretches to 300px to contain it safely.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a box to stretch fluidly but never get too wide** -&gt; `width: 100%; max-width: 400px;`\n- **I want a box to have a specific size, but grow if text wraps** -&gt; `min-height: 250px;`\n- **I want to animate a box growing larger** -&gt; *Don\'t animate width/height. Use `transform: scale()` (Covered later).*',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Dimensions',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Dimensions',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Clash of Constraints**\n\n**Question:** The developer asked for a 500px width, but also a 300px max-width. How wide is the box?\n*...predict your answer before reading below...*\n**Explanation:** The box is **300px**. CSS constraint resolution rules dictate that `max-width` overrides `width`.',
                html: '<div class="box">Content</div>',
                css: '  .box {\n    width: 500px;\n    max-width: 300px;\n  }',
                outputHeight: 180,
              },
              {
                id: 2,
                type: 'js',
                instruction: '**Checkpoint 2: The Ultimate Clash**\n\n**Question:** Which property wins when `min-width` and `max-width` contradict each other?\n*...predict your answer before reading below...*\n**Explanation:** The box is **300px**. CSS dictates that `min-width` is the absolute king. It overrides `max-width`, which overrides `width`. The hierarchy is `min > max > preferred`.',
                html: '<div class="box">box</div>',
                css: '  .box {\n    width: 200px;\n    max-width: 100px;\n    min-width: 300px;\n  }',
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
      'In the early days of CSS, developers used rigid `width: 800px;` to build fixed-width layouts (often designed for 1024x768 monitors).\nWith the advent of smartphones, this broke completely. Modern CSS heavily favors **intrinsic sizing** (letting the content dictate the size) and **fluid constraints** (`max-width: 400px; width: 100%;`) rather than rigid absolutes. We almost never declare a fixed `height` in modern CSS, because if text translates to a language with longer words (like German), a fixed height will cause the text to overflow and break the UI.'
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
      'Next lesson: Padding and Margin.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain the hierarchy between `width`, `max-width`, and `min-width`.',
    'I know why we use `min-height` instead of `height` for accessibility.',
    'I can explain why animating `width` is a terrible idea for performance.',
    'I understand that missing a unit (like `width: 400;`) causes the CSS parser to drop the rule entirely.',
    'I have applied the dimension constraints to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
