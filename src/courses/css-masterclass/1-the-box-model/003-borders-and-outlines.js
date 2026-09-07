// css-masterclass — The Box Model — Lesson 3: Borders and Outlines
// Auto-converted from src/docs/tutorials/css-masterclass/01-the-box-model/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-003-borders-and-outlines',
  slug: 'borders-and-outlines',
  chapter: 1,
  order: 3,
  title: 'Borders and Outlines',
  subtitle: 'The Box Model',
  tags: ['borders-and-outlines', 'border', 'outline', 'border-radius'],

  hook: {
    question: 'What is "Borders and Outlines", and why does it matter?',
    realWorldContext: 'Once you have defined the dimensions, internal padding, and external margin of a box, the mathematical geometry exists, but it might be completely invisible on the screen. **The Problem:** We need a way to draw a physical line denoting the exact edge of an element, and we need to be able to soften the harsh 90-degree corners into curves. **The Solution:** - `border`: Draws a physical stroke exactly between the padding and the margin, consuming space. - `outline`: Draws a decorative stroke outside the border, *without* consuming space. - `border-radius`: Applies a clipping mask to round the corners of the background and the border.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Once you have defined the dimensions, internal padding, and external margin of a box, the mathematical geometry exists, but it might be completely invisible on the screen. **The Problem:** We need a way to draw a physical line denoting the exact edge of an element, and we need to be able to soften the harsh 90-degree corners into curves. **The Solution:** - `border`: Draws a physical stroke exactly between the padding and the margin, consuming space. - `outline`: Draws a decorative stroke outside the border, *without* consuming space. - `border-radius`: Applies a clipping mask to round the corners of the background and the border.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `border`\n- **Formal syntax:** `border: <line-width> || <line-style> || <color>`\n- **Accepted value types:** lengths (`px`, `rem`), keywords (`thin`, `medium`, `thick`), styles (`solid`, `dashed`, `dotted`, etc.), colors (`#hex`, `rgb`, etc.).\n- **Initial value:** `medium none currentcolor`\n- **Inherited:** No.\n- **Animatable:** Yes (Width/Color are animatable; Style is not).\n- **Percentages allowed?:** No.\n- **Computed value:** Absolute pixels for width, absolute color for color.\n- **Applies to:** All elements.\n### `outline`\n- **Formal syntax:** `outline: <outline-width> || <outline-style> || <outline-color>`\n- **Initial value:** `medium none invert` (or `currentcolor`).\n- **Inherited:** No.\n- **Animatable:** Yes.\n- **Percentages allowed?:** No.\n- **Applies to:** All elements.\n### `border-radius`\n- **Formal syntax:** `border-radius: <length-percentage>{1,4} [ / <length-percentage>{1,4} ]?`\n- **Initial value:** `0`.\n- **Inherited:** No.\n- **Animatable:** Yes.\n- **Percentages allowed?:** Yes (Resolves against the corresponding box dimension—width for horizontal radius, height for vertical).\n- **Applies to:** All elements.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  border: 1px red; /* Missing style! */\n  border: 1px solid blurp; /* Invalid color! */\n  border-radius: -10px; /* Invalid radius! */\n}\n```\n\n**Error Recovery:**\n- `border: 1px red;` is **valid but invisible**. The initial value for style is `none`. Because you omitted the style, the browser interprets it as `border: 1px none red;`. It draws a 1px invisible red line.\n- `border: 1px solid blurp;` is dropped entirely.\n- `border-radius: -10px;` is dropped. Radii cannot be negative.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**Crucial A11y Rule:** Never, ever write `outline: none;` without providing an alternative focus state! When a user navigates a website using the `Tab` key on a keyboard (because they cannot use a mouse), the browser draws an `outline` around the currently focused element. If you remove the outline because you think it\'s ugly, keyboard users will have no idea where they are on the page. Use `:focus-visible { outline: 2px solid blue; }` to style it beautifully instead of deleting it.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** your card.\n2. In the Styles tab, locate the `border: 1px solid #ccc;` rule.\n3. Click on the color square next to `#ccc` to open the color picker.\n4. Drag the opacity slider down. Notice how the border becomes transparent, but it *doesn\'t* reveal the card\'s background color beneath it. This proves that `border` lives strictly outside the padding layer, not on top of it.\n5. **Performance impact:** `border-radius` can be expensive to render on mobile devices because it requires the GPU to generate an anti-aliased clipping mask. Animating `border-radius` triggers Paint.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `border` vs `outline`\n- **`border`:** Consumes layout space. Respects `border-radius` (curves with the corners).\n- **`outline`:** Consumes 0 layout space (draws over other elements). Usually does *not* respect `border-radius` in older browsers, but modern browsers attempt to curve it. Best used for focus states.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a permanent visible edge around my box** -&gt; `border`\n- **I want to highlight an element when the user tabs to it** -&gt; `outline`\n- **I want to make a circle for a user avatar** -&gt; `border-radius: 50%;` (requires a square width/height)',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Borders and Outlines',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Borders and Outlines',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Circle**\n\n**Question:** What shape is drawn on the screen?\n*...predict your answer before reading below...*\n**Explanation:** A **perfect circle**. When `border-radius` uses percentages, 50% means the curve starts exactly halfway down the edge. On a perfect square, 50% creates a circle. (If it were a rectangle, 50% would create an oval).',
                html: '<div class="box">box</div>',
                css: '  .box {\n    width: 200px;\n    height: 200px;\n    background: blue;\n    border-radius: 50%;\n  }',
                outputHeight: 180,
              },
              {
                id: 2,
                type: 'js',
                instruction: '**Checkpoint 2: Outline vs Border Geometry**\n\n**Question:** Which box takes up more physical space on the webpage layout?\n*...predict your answer before reading below...*\n**Explanation:** **Box 1 (Red)** takes up more space. `border` physically pushes surrounding elements away to make room for its 50px thickness. `outline` takes up 0 pixels in the layout engine—it draws its 50px blue line directly on top of whatever is next to it, overlapping it completely.',
                html: '<div class="box-1">box-1</div>\n<div class="box-2">box-2</div>',
                css: '  .box-1 { border: 50px solid red; width: 100px; height: 100px; }\n  .box-2 { outline: 50px solid blue; width: 100px; height: 100px; }',
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
      'In older CSS, rounding corners required creating 4 separate images (one for each corner) in Photoshop and using absolute positioning to stick them to the corners of a `<div>`. `border-radius` eliminated millions of lines of hacky code across the internet.\n`outline` was historically used for accessibility (focus rings when tabbing through a page). Modern CSS introduced `outline-offset`, allowing the outline to float slightly away from the element, creating a beautiful halo effect.'
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
      'Next lesson: Box Sizing and Overflow.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why `outline: none` ruins accessibility.',
    'I know that `border` takes up physical space, but `outline` does not.',
    'I can use `border-radius: 50%` to turn a square into a circle.',
    'I understand that omitting the border `style` makes the border invisible.',
    'I have applied the border and radius to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
