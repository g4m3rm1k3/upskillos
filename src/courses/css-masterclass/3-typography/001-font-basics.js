// css-masterclass — Typography — Lesson 1: Font Basics
// Auto-converted from src/docs/tutorials/css-masterclass/03-typography/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-001-font-basics',
  slug: 'font-basics',
  chapter: 3,
  order: 1,
  title: 'Font Basics',
  subtitle: 'Typography',
  tags: ['font-basics', 'font-family', 'font-size', 'font-weight', 'font-style'],

  hook: {
    question: 'What is "Font Basics", and why does it matter?',
    realWorldContext: 'Web browsers ship with a default set of system fonts (usually Times New Roman for serif, Arial for sans-serif). **The Problem:** Default browser fonts make websites look like 1990s academic papers. We need precise control over the typographic voice of our application—from the exact typeface used, to its size, and how thick the letterforms are drawn. **The Solution:** The CSS Font properties (`font-family`, `font-size`, `font-weight`, `font-style`) interface directly with the operating system\'s font rendering engine to select and scale typefaces.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Web browsers ship with a default set of system fonts (usually Times New Roman for serif, Arial for sans-serif). **The Problem:** Default browser fonts make websites look like 1990s academic papers. We need precise control over the typographic voice of our application—from the exact typeface used, to its size, and how thick the letterforms are drawn. **The Solution:** The CSS Font properties (`font-family`, `font-size`, `font-weight`, `font-style`) interface directly with the operating system\'s font rendering engine to select and scale typefaces.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `font-family`\n- **Formal syntax:** `font-family: [ <family-name> | <generic-family> ]#`\n- **Accepted value types:** Strings (e.g., `"Helvetica Neue"`), Keywords (`sans-serif`, `serif`, `monospace`, `system-ui`).\n- **Initial value:** Browser dependent (usually a serif font).\n- **Inherited:** **Yes.**\n- **Animatable:** No.\n- **Percentages allowed?:** No.\n- **Computed value:** As specified.\n- **Applies to:** All elements.\n### `font-size`\n- **Formal syntax:** `font-size: <absolute-size> | <relative-size> | <length-percentage>`\n- **Accepted value types:** Lengths (`px`, `rem`, `em`), percentages (`%`), keywords (`small`, `large`).\n- **Initial value:** `medium` (Which resolves to `16px` in all major browsers by default).\n- **Inherited:** **Yes.**\n- **Animatable:** Yes.\n- **Percentages allowed?:** Yes (Relative to parent element\'s font size).\n- **Computed value:** Absolute length (`px`).\n### `font-weight`\n- **Formal syntax:** `font-weight: <font-weight-absolute> | bolder | lighter`\n- **Accepted value types:** Numbers (`100` to `900`), keywords (`normal`=400, `bold`=700).\n- **Initial value:** `normal` (400).\n- **Inherited:** **Yes.**\n- **Animatable:** Yes (If using a Variable Font!).\n### `font-style`\n- **Formal syntax:** `font-style: normal | italic | oblique`\n- **Initial value:** `normal`.\n- **Inherited:** **Yes.**',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  font-family: Roboto Arial sans-serif; /* Invalid! */\n  font-size: 16;                        /* Invalid! */\n  font-weight: super-bold;              /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `font-family: Roboto Arial;` is dropped. You **must** separate font names with commas. If a font name has a space in it (like `"Times New Roman"`), you **must** wrap it in quotes.\n- `font-size: 16;` is dropped. You must provide a unit (e.g., `px` or `rem`).\n- `font-weight: super-bold;` is dropped. The parser only understands numeric weights or the explicit `normal`/`bold` keywords.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**Never use `px` for `font-size`.** If you hardcode `font-size: 16px`, you override the user\'s operating system preferences. Visually impaired users often set their OS default font size to 24px so they can read the internet. Your `16px` rule forces it back down, breaking accessibility. **Rule:** Always use `rem` (Root EM) for font sizes. `1rem` equals the user\'s preferred default size. If their default is 16px, `1rem` = 16px. If they are visually impaired and their default is 24px, `1rem` = 24px. It scales perfectly.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -> **Inspect** a paragraph of text.\n2. In the right panel, find the **Computed** tab.\n3. Scroll all the way to the bottom. You will see a special section called **Rendered Fonts**.\n4. This tells you *exactly* which font file the browser actually chose from your font stack, and whether it pulled it from the network or the Local OS. If a font looks wrong, check this tab to prove whether your custom font actually loaded.\n5. **Performance impact:** Web fonts are heavy. When a browser downloads a custom font, it often hides the text (Flash of Invisible Text, FOIT) until the font arrives. We\'ll learn how to fix this with `font-display: swap` in advanced modules.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `em` vs `rem`\n- **`rem` (Root EM):** Relative to the `<html>` root font size (the user\'s OS preference). If root is 16px, `2rem` is *always* 32px everywhere on the page. Use this for `font-size`.\n- **`em`:** Relative to the *parent* element\'s font size. If a parent is 20px, an `em` child is 20px. If an `em` is nested inside an `em` inside an `em`, the math compounds exponentially. Use this for padding/margins that need to scale relative to the text size, but avoid it for `font-size`.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a modern, native-feeling app** -> `font-family: system-ui, sans-serif;`\n- **I want accessible text sizing** -> `font-size: 1rem;` (Avoid `px`).\n- **I want slightly thicker text but not full bold** -> `font-weight: 500;` (Medium).\n- **I want to emphasize a quote** -> `font-style: italic;`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Font Basics',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Font Basics',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Inherited Cascade**\n\n**Question:** Is the `<h1>` text sans-serif or serif? Is it bold or normal weight?\n*...predict your answer before reading below...*\n**Explanation:** It is **serif** and **bold**. The `<h1>` inherits `sans-serif` from the body, but explicitly overrides it to `serif`. It inherits `font-weight: bold` from the `.wrapper`. Remember: almost all typography properties inherit down the tree.',
                html: '  <div class="wrapper">\n    <h1>Hello World</h1>\n  </div>',
                css: '  body { font-family: sans-serif; }\n  h1 { font-family: serif; }\n  .wrapper { font-weight: bold; }',
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
      '**The Font Stack (Fallbacks)** You can never guarantee a user has a specific font installed on their computer. Therefore, `font-family` accepts a comma-separated list called a "Font Stack". The browser checks the OS for the first font. If it\'s missing, it falls back to the second, and so on.\n\n```css\n/* Old approach: explicitly listing OS-specific fonts */\nfont-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n\n/* Modern approach: Let the browser pick the OS default automatically */\nfont-family: system-ui, sans-serif;\n```\n\n**Variable Fonts** Historically, if you wanted `normal` (400) and `bold` (700) and `black` (900) weights, the user had to download 3 separate font files. Modern CSS supports **Variable Fonts**, which bundle the entire weight spectrum (100 to 900) into a single file, allowing you to animate the font weight smoothly on hover.'
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
      'Next lesson: Text Spacing.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can write a fallback font stack with commas.',
    'I know why we use `rem` instead of `px` for font sizes (Accessibility).',
    'I know that numeric font weights map to concepts like normal (400) and bold (700).',
    'I can use the DevTools "Rendered Fonts" panel to prove which font actually loaded.',
    'I have applied the typography baseline to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
