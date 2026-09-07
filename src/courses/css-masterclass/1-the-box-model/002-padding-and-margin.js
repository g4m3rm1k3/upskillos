// css-masterclass — The Box Model — Lesson 2: Padding and Margin
// Auto-converted from src/docs/tutorials/css-masterclass/01-the-box-model/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-002-padding-and-margin',
  slug: 'padding-and-margin',
  chapter: 1,
  order: 2,
  title: 'Padding and Margin',
  subtitle: 'The Box Model',
  tags: ['padding-and-margin', 'padding', 'margin'],

  hook: {
    question: 'What is "Padding and Margin", and why does it matter?',
    realWorldContext: 'Every box on the web has internal space and external space. **The Problem:** Without space, text presses uncomfortably against the edge of a box (like reading a book with no margins), and multiple boxes smash directly into each other. **The Solution:** - `padding`: Pushes the content *inward*, creating internal breathing room. - `margin`: Pushes other elements *outward*, creating external distance.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Every box on the web has internal space and external space. **The Problem:** Without space, text presses uncomfortably against the edge of a box (like reading a book with no margins), and multiple boxes smash directly into each other. **The Solution:** - `padding`: Pushes the content *inward*, creating internal breathing room. - `margin`: Pushes other elements *outward*, creating external distance.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `padding`\n- **Formal syntax:** `padding: <length> | <percentage>`\n- **Accepted value types:** pixels (`px`), rems (`rem`), percentages (`%`).\n- **Initial value:** `0`.\n- **Inherited:** **No.** If padding inherited, a padded box inside a padded box inside a padded box would shrink exponentially.\n- **Animatable:** Yes (Triggers Layout).\n- **Percentages allowed?:** Yes. *(Crucial Note: Percentage padding is calculated relative to the width of the parent, NOT the height, even for `padding-top`!)*\n- **Computed value:** Absolute pixels.\n- **Applies to:** All elements except table-row-groups and table-rows.\n### `margin`\n- **Formal syntax:** `margin: <length> | <percentage> | auto`\n- **Accepted value types:** lengths, percentages, `auto`.\n- **Initial value:** `0`.\n- **Inherited:** **No.**\n- **Animatable:** Yes (Triggers Layout).\n- **Percentages allowed?:** Yes (Relative to parent width).\n- **Computed value:** Absolute pixels.\n- **Applies to:** All elements except elements with table display types other than `table-caption`, `table`, and `inline-table`.\n### Shorthand Syntax\nBoth properties follow the clock face (Top, Right, Bottom, Left).\n\n```css\npadding: 10px; /* All 4 sides */\npadding: 10px 20px; /* Top/Bottom 10px, Left/Right 20px */\npadding: 10px 20px 30px; /* Top 10px, Left/Right 20px, Bottom 30px */\npadding: 10px 20px 30px 40px; /* Top 10, Right 20, Bottom 30, Left 40 */\n```',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  padding: -20px; /* Invalid! */\n  margin: -20px;  /* Valid! */\n}\n```\n\n**Error Recovery:**\n- `padding: -20px;` is dropped. Padding **cannot** be negative. You cannot have "negative internal space".\n- `margin: -20px;` is **valid**. A negative margin pulls surrounding elements *closer*, overlapping them. This is a common technique for creating overlapping grid layouts.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: 'Touch targets on mobile devices must be large enough to tap easily (Apple recommends 44x44 points). Using `padding` is the primary way to increase the clickable area of a button or link without making the text itself massive. Do not use `margin` to make a button bigger, as `margin` is outside the clickable area!',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** your card.\n2. Look at the **Computed** tab. You will see a visual representation of the Box Model diagram.\n3. Hover your mouse over the `padding` ring in DevTools. The browser will highlight the physical padding space on the screen in **green**.\n4. Hover over the `margin` ring. The browser will highlight the margin space in **orange**.\n*(This green/orange color coding is universal across Chrome, Firefox, and Safari).*\n**Performance impact:** Animating margin or padding triggers **Layout**, which forces the browser to recalculate the positions of every other element on the page that is being pushed. This is extremely expensive and causes lag.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `padding` vs `margin`\n- **`padding`:** Inside the box. Inherits the `background-color`. Increases the clickable area. Cannot be negative.\n- **`margin`:** Outside the box. Is always transparent. Does not increase clickable area. Can be negative.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want text to stop touching the border** -&gt; `padding`\n- **I want to center a block on the screen** -&gt; `margin: 0 auto;` (Requires a width!)\n- **I want two blocks to overlap** -&gt; `margin: -50px;`\n- **I want to make a button easier to tap on mobile** -&gt; `padding`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Padding and Margin',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Padding and Margin',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: Margin Collapse**\n\n**Question:** How much total vertical space exists between the red box and the blue box? (30 + 20 = 50?)\n*...predict your answer before reading below...*\n**Explanation:** The space is **30px**. This is called **Margin Collapse**. When two vertical margins touch, they do not add together. The browser looks at them and takes the larger of the two (30px), collapsing the smaller one into it. This *only* happens vertically on block elements, never horizontally.',
                html: '<div class="box-1"></div>\n<div class="box-2"></div>',
                css: '  .box-1 { margin-bottom: 30px; background: red; height: 50px;}\n  .box-2 { margin-top: 20px; background: blue; height: 50px;}',
                outputHeight: 180,
              },
              {
                id: 2,
                type: 'js',
                instruction: '**Checkpoint 2: The Magic of Auto**\n\n**Question:** Where does the card sit horizontally on the screen?\n*...predict your answer before reading below...*\n**Explanation:** The card is **perfectly centered**. `auto` tells the browser: "Calculate the total remaining space left on the screen, and give it all to this margin." By putting `auto` on *both* left and right, they split the remaining space equally, centering the box.',
                html: '<div class="card">card</div>',
                css: '.card {\n  width: 400px;\n  margin-left: auto;\n  margin-right: auto;\n}',
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
      'Modern CSS has introduced **Logical Properties** to handle internationalization (like Arabic, which reads right-to-left). Instead of `padding-left`, modern usage often prefers `padding-inline-start`. If the site is translated to Arabic, the "start" automatically flips to the right side of the screen without writing new CSS.'
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
      'Next lesson: Borders and Outlines.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why padding can be clicked but margin cannot.',
    'I understand that vertical margins collapse into each other.',
    'I can use `margin: auto` to center an element.',
    'I know that padding cannot be negative, but margin can.',
    'I can open DevTools and identify the green (padding) and orange (margin) zones.',
    'I have applied the spacing to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
