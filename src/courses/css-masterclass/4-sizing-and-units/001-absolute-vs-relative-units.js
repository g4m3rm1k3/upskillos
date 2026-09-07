// css-masterclass — Sizing And Units — Lesson 1: Absolute vs Relative Units
// Auto-converted from src/docs/tutorials/css-masterclass/04-sizing-and-units/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-001-absolute-vs-relative-units',
  slug: 'absolute-vs-relative-units',
  chapter: 4,
  order: 1,
  title: 'Absolute vs Relative Units',
  subtitle: 'Sizing And Units',
  tags: ['absolute-vs-relative-units'],

  hook: {
    question: 'What is "Absolute vs Relative Units", and why does it matter?',
    realWorldContext: 'CSS must measure things: how wide a box is, how big a font is, how thick a border is. **The Problem:** If you measure everything in physical units (like centimeters or fixed pixels), your design breaks when viewed on devices with radically different screen sizes (a 4-inch phone vs a 65-inch TV) or when a user zooms in to read. **The Solution:** CSS provides a dual system of measurement: - **Absolute units:** Hardcoded measurements that theoretically map to physical dimensions and do not change. - **Relative units:** Measurements that calculate their final size dynamically based on another value (like the parent\'s size or the user\'s OS settings).',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'CSS must measure things: how wide a box is, how big a font is, how thick a border is. **The Problem:** If you measure everything in physical units (like centimeters or fixed pixels), your design breaks when viewed on devices with radically different screen sizes (a 4-inch phone vs a 65-inch TV) or when a user zooms in to read. **The Solution:** CSS provides a dual system of measurement: - **Absolute units:** Hardcoded measurements that theoretically map to physical dimensions and do not change. - **Relative units:** Measurements that calculate their final size dynamically based on another value (like the parent\'s size or the user\'s OS settings).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### Absolute Units\n- **`px` (Pixels):** The workhorse of the web. Historically mapped to 1 physical screen pixel. Modern CSS defines it as an angular measurement (`1/96th` of an inch) so a 10px box looks physically the same size on a low-res monitor as it does on a high-res Retina screen.\n- **`cm`, `mm`, `in`, `pt`, `pc`:** Real-world physical units (Centimeters, inches, points).\n- *Initial/Inherited/Animatable:* N/A (These are value types, not properties).\n- *Applies to:* Only useful for print stylesheets (e.g., generating PDFs from CSS). Never use these for screen UI.\n### Relative Units\n- **`rem` (Root EM):** Relative to the `font-size` of the root `<html>` element. If the root is 16px, `1rem` = 16px. `2rem` = 32px.\n- **`em`:** Relative to the `font-size` of the *current element* (or the parent, if used on the `font-size` property itself).\n- **`%` (Percentage):** Relative to the corresponding dimension of the parent element (e.g., `width: 50%` means half the parent\'s width).',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  width: 50 px; /* Invalid! */\n  width: 50p;   /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `width: 50 px;` is dropped. You cannot have a space between the number and the unit.\n- `width: 50p;` is dropped. The parser does not guess typos. It only recognizes exact unit keywords.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**The `px` Font-Size Tragedy:** If a visually impaired user goes into their browser settings and changes their default font size from `Medium (16px)` to `Very Large (24px)`, the browser changes the root `<html>` font size to 24px. If your CSS says `font-size: 1rem;`, your text scales perfectly to 24px, and the user can read your site. If your CSS says `font-size: 16px;`, you violently overwrite the root setting, trapping the text at 16px. The user cannot read your site. **Never use `px` for font sizes.**',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** a paragraph with `font-size: 2rem`.\n2. Go to the **Computed** tab.\n3. Notice that `2rem` does not appear in the Computed tab. The browser has already done the math. If the root is 16px, the Computed tab shows `32px`.\n4. **Performance impact:** Relative units (`rem`, `%`) require the browser to perform algebra during the Layout phase (walking up the DOM tree to find the parent values). This math is incredibly fast and hardware-optimized. There is no measurable performance penalty for using relative units over absolute units.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `rem` vs `%`\n- **`rem`:** Looks up the DOM tree specifically for the `<html>` root\'s `font-size`.\n- **`%`:** Looks at the immediate parent box. `width: 50%` is half the parent\'s width. `font-size: 50%` is half the parent\'s font size.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I need a tiny, crisp border** -&gt; `border: 1px solid black;`\n- **I am setting font sizes** -&gt; `font-size: 1.25rem;`\n- **I am setting padding on a button, and I want the padding to grow if the font size grows** -&gt; `padding: 0.5em 1em;`\n- **I want a box to take up half the screen** -&gt; `width: 50%;`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Absolute vs Relative Units',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Absolute vs Relative Units',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The `em` Multiplier Trap**\n\n**Question:** In physical computed pixels, how big is the "Text" in the grandchild?\n*...predict your answer before reading below...*\n**Explanation:** It is **80px**. Because `em` is relative to the parent, it compounds exponentially.\n- Parent = 20px.\n- Child = 2 * 20 = 40px.\n- Grandchild = 2 * 40 = 80px.\nThis compounding math is exactly why we use `rem` (which always references the root) instead of `em` for font sizes.',
                html: '<div class="parent">\n  <div class="child">\n    <div class="grandchild">Text</div>\n  </div>\n</div>',
                css: '  .parent { font-size: 20px; }\n  .child { font-size: 2em; }\n  .grandchild { font-size: 2em; }',
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
      'In 2005, developers built websites with `width: 800px; font-size: 12px;`. In modern CSS, `px` is largely banished for typography and layout containers.\n- **Typography:** Always use `rem`.\n- **Layout Containers:** Use `%`, `vw`, or Flexbox/Grid fractions.\n- **When is `px` okay?:** Small, rigid details that should never scale, like a `1px` border, a `4px` box-shadow, or an `8px` border-radius.'
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
      'Next lesson: Viewport Units.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why `px` on fonts ruins accessibility.',
    'I understand the exponential danger of nesting `em` units.',
    'I know that `rem` stands for Root EM.',
    'I can explain why a space between a number and a unit breaks CSS.',
    'I can use DevTools to see the final computed `px` value of a `rem`.',
    'I have applied the relative units to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
