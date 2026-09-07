// css-masterclass — Colors And Backgrounds — Lesson 3: Gradients
// Auto-converted from src/docs/tutorials/css-masterclass/02-colors-and-backgrounds/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-003-gradients',
  slug: 'gradients',
  chapter: 2,
  order: 3,
  title: 'Gradients',
  subtitle: 'Colors And Backgrounds',
  tags: ['gradients', 'linear-gradient', 'radial-gradient', 'conic-gradient'],

  hook: {
    question: 'What is "Gradients", and why does it matter?',
    realWorldContext: 'A gradient is a smooth transition from one color to another. **The Problem:** Historically, creating a gradient required exporting a huge PNG image from Photoshop. This wasted bandwidth, couldn\'t dynamically resize to fit different screen shapes, and couldn\'t be animated smoothly. **The Solution:** CSS Gradients are not colors. They are **mathematically generated images** rendered by the browser\'s graphics engine on the fly. Because they are images, they are applied to the `background-image` property, *not* the `background-color` property.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'A gradient is a smooth transition from one color to another. **The Problem:** Historically, creating a gradient required exporting a huge PNG image from Photoshop. This wasted bandwidth, couldn\'t dynamically resize to fit different screen shapes, and couldn\'t be animated smoothly. **The Solution:** CSS Gradients are not colors. They are **mathematically generated images** rendered by the browser\'s graphics engine on the fly. Because they are images, they are applied to the `background-image` property, *not* the `background-color` property.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `linear-gradient()`\n- **Formal syntax:** `linear-gradient([ <angle> | to <side-or-corner> ]? , <color-stop-list>)`\n- **Accepted value types:** Angles (`45deg`, `turn`), keywords (`to right`, `to bottom right`), and a list of colors (Hex, RGB, HSL, etc.) optionally followed by percentage/pixel stops.\n- **Initial value:** (Function must have at least two colors to be valid).\n- **Inherited:** No.\n- **Animatable:** No (in CSS3, though modern Houdini specs are changing this).\n- **Percentages allowed?:** Yes (Used to define where a color stop occurs).\n- **Computed value:** The generated image.\n- **Applies to:** `background-image` (or anywhere an image is accepted).\n### `radial-gradient()`\n- **Formal syntax:** `radial-gradient([ <ending-shape> || <size> ]? [ at <position> ]? , <color-stop-list>)`\n- **Accepted value types:** Shapes (`circle`, `ellipse`), positions (`at center`, `at top left`).\n- **Initial value:** `ellipse at center`.\n### `conic-gradient()`\n- **Formal syntax:** `conic-gradient([ from <angle> ]? [ at <position> ]?, <color-stop-list>)`\n- **Description:** Sweeps colors around a center point like a pie chart.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  background-color: linear-gradient(red, blue); /* Invalid placement! */\n  background-image: linear-gradient(red);       /* Invalid argument! */\n}\n```\n\n**Error Recovery:**\n- `background-color: linear-gradient(red, blue);` is dropped. A gradient is an *image*. You cannot assign an image to a property that expects a solid color value.\n- `background-image: linear-gradient(red);` is dropped. A gradient inherently requires a transition between *at least two* colors. Passing only one color makes the function invalid.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: 'Gradients behind text can be a massive accessibility trap. If you have a gradient that goes from very dark to very light, and you place white text over it, the text will have perfect contrast on the dark side but become completely invisible on the light side. **Rule:** Always calculate the WCAG contrast ratio against the *lightest* point of the gradient if using dark text, and the *darkest* point if using light text.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** an element with a gradient.\n2. In the Styles tab, locate the `linear-gradient` rule.\n3. Chrome DevTools has a specialized gradient editor! Click the tiny icon next to the gradient text. A graphical slider will appear, allowing you to drag color stops left and right, add new colors by clicking the bar, and rotate a dial to change the angle.\n4. **Performance impact:** Gradients are hardware-accelerated and mathematically perfect, making them vastly more performant and memory-efficient than loading a .jpg of a gradient. However, combining multiple complex overlapping gradients with `opacity` can cause GPU strain on low-end devices.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `linear-gradient()` vs `radial-gradient()`\n- **`linear-gradient`:** Transitions along a straight line (an axis/angle). Great for subtle background shifts or mimicking shadows.\n- **`radial-gradient`:** Transitions outward from a single point (like a stone dropped in a pond). Great for creating spotlight effects behind an object.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a smooth transition from left to right** -&gt; `linear-gradient(to right, ...)`\n- **I want a spotlight effect** -&gt; `radial-gradient(circle at center, ...)`\n- **I want to draw sharp, distinct stripes** -&gt; Place two color stops at the exact same percentage.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Gradients',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Gradients',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: Hard Stops**\n\n**Question:** Does the box have a smooth purple transition in the middle, or a harsh line?\n*...predict your answer before reading below...*\n**Explanation:** It has a **harsh, solid line**. By setting the red color to stop exactly at 50%, and the blue color to start exactly at 50%, you have eliminated the transition zone. The browser instantly switches from red to blue, creating a sharp stripe.',
                html: '<div class="box">box</div>',
                css: '  .box {\n    background-image: linear-gradient(to right, red 50%, blue 50%);\n  }',
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
      '**Color Interpolation Spaces** By default, CSS gradients transition colors using the sRGB color space. When transitioning from blue to yellow in sRGB, the math often passes through an ugly, muddy grey/brown "dead zone" in the middle.\nModern CSS (Level 4) allows you to specify the interpolation space to fix this:\n\n```css\n/* Legacy: Muddy middle */\nbackground-image: linear-gradient(to right, blue, yellow);\n\n/* Modern: Brilliant, vibrant middle using Oklab math */\nbackground-image: linear-gradient(in oklab to right, blue, yellow);\n```'
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
    'I understand that a gradient is an image, not a color.',
    'I can apply a gradient to `background-image`.',
    'I can explain how to create a sharp stripe by aligning color stop percentages.',
    'I know why putting text over a high-contrast gradient is a bad idea.',
    'I can use the DevTools GUI to visually edit a gradient\'s angle and stops.',
    'I have applied the premium gradient to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
