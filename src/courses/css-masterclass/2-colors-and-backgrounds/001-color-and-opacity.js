// css-masterclass — Colors And Backgrounds — Lesson 1: Color and Opacity
// Auto-converted from src/docs/tutorials/css-masterclass/02-colors-and-backgrounds/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-001-color-and-opacity',
  slug: 'color-and-opacity',
  chapter: 2,
  order: 1,
  title: 'Color and Opacity',
  subtitle: 'Colors And Backgrounds',
  tags: ['color-and-opacity', 'color', 'background-color', 'opacity'],

  hook: {
    question: 'What is "Color and Opacity", and why does it matter?',
    realWorldContext: 'Don\'t think of "color" as a single property. Every pixel the browser draws has a color, and CSS provides granular control over different spatial regions of an element\'s bounding box. When you apply a color in CSS, you are instructing the browser\'s paint engine to fill a specific mathematical region of the element: the text glyphs, the background canvas, the stroke around the edge, etc. In this lesson, we will focus exclusively on two properties: - `color`: Controls the color of the vector text glyphs (and text decorations like underlines). - `background-color`: Controls the physical surface behind the Content and the Padding layers. *(Note: We will cover borders and shadows in upcoming lessons once we understand how the box model interacts with them).*',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Don\'t think of "color" as a single property. Every pixel the browser draws has a color, and CSS provides granular control over different spatial regions of an element\'s bounding box. When you apply a color in CSS, you are instructing the browser\'s paint engine to fill a specific mathematical region of the element: the text glyphs, the background canvas, the stroke around the edge, etc. In this lesson, we will focus exclusively on two properties: - `color`: Controls the color of the vector text glyphs (and text decorations like underlines). - `background-color`: Controls the physical surface behind the Content and the Padding layers. *(Note: We will cover borders and shadows in upcoming lessons once we understand how the box model interacts with them).*',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `color`\n- **Formal syntax:** `color: <color>`\n- **Accepted value types:** Named colors, Hex, RGB, HSL, LCH, OKLCH, `currentcolor`, `transparent`.\n- **Initial value:** Browser dependent (usually black, or white in dark mode).\n- **Inherited:** **Yes.** Text elements inside a container naturally want to match the container\'s reading color.\n- **Animatable:** Yes (interpolates via RGB or specified color space).\n- **Percentages allowed?:** No.\n- **Computed value:** The absolute `rgba()` or `color()` value the browser resolves it to.\n- **Applies to:** All elements and text.\n### `background-color`\n- **Formal syntax:** `background-color: <color>`\n- **Accepted value types:** Same as `color`.\n- **Initial value:** `transparent`.\n- **Inherited:** **No.** If every child inherited its parent\'s background color, rendering engines would waste massive resources repainting the same opaque color over itself dozens of times.\n- **Animatable:** Yes.\n- **Percentages allowed?:** No.\n- **Computed value:** The absolute `rgba()` or `color()` value.\n- **Applies to:** All elements.\n### `opacity`\n- **Formal syntax:** `opacity: <alpha-value>`\n- **Accepted value types:** Number (0.0 to 1.0) or Percentage (0% to 100%).\n- **Initial value:** `1.0` (fully opaque).\n- **Inherited:** **No.** (But it applies to the *entire flattened element tree*, effectively acting like it does).\n- **Animatable:** Yes.\n- **Percentages allowed?:** Yes (100% = 1.0).\n- **Computed value:** The specified number clamped to the range [0.0, 1.0].\n- **Applies to:** All elements.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: 'What happens if you make a typo?\n\n```css\n.card {\n    color: red;\n    color: blu; /* Typo! */\n    background-color: rgb(500 0 0); /* Out of bounds! */\n}\n```\n\n**Error Recovery (The `blu` typo):** CSS does not crash like JavaScript. It uses a fault-tolerant parser. If it sees `color: blu;`, it marks the declaration as **invalid and drops it completely**. Because of the cascade, the previous valid rule (`color: red;`) survives. The text will be red.\n**Value Clamping (The `500` error):** If you provide a valid format but out-of-bounds numbers like `rgb(500 0 0)`, the browser doesn\'t drop it. It **clamps** it to the maximum allowable value (`255`). The computed value becomes `rgb(255, 0, 0)`.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: 'Color is dangerous in UI design.\n- **Contrast Ratios:** Text must have a WCAG contrast ratio of at least 4.5:1 against its background. Light gray text on a white background fails this test and makes your site unusable for visually impaired users.\n- **Alpha Transparency Danger:** Using `rgb(... / 50%)` for text colors is a massive accessibility risk. If the background changes beneath it, the text might become unreadable because the background color blends into the text glyphs. Always use solid colors for text where possible.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: 'Don\'t trust static diagrams. Prove it in the browser.\n1. Open your HTML project.\n2. Right-click the `.card` and select **Inspect**.\n3. In the right panel, find the **Computed** tab.\n4. Look for `background-color`. Even if you wrote `#fff`, the Computed tab will show you how the browser translated it (e.g., `rgb(255, 255, 255)`).\n**Performance (Paint vs Composite):**\n- Toggle the `color` checkbox off and on in the Styles tab. Changing `color` or `background-color` forces the browser to **Paint** (re-calculate the pixels on the screen). This is computationally expensive to animate.\n- Toggle `opacity`. `opacity` does not trigger Paint. It triggers **Composite**. The browser takes a cached "photo" of the element on the GPU and just fades the photo. It is vastly cheaper to animate.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: 'They both create transparency, but they solve fundamentally different problems.\n- **`opacity: 0.5`**: Makes the entire flattened element tree (background, text, children) 50% transparent. Used for fading entire components in/out.\n- **`background-color: rgb(255 0 0 / 50%)`**: Makes *only* the background red and 50% transparent. The text remains 100% solid. Used for glassmorphism and overlays.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want to color text** -&gt; `color`\n- **I want to color the box** -&gt; `background-color`\n- **I want to fade EVERYTHING (text and background)** -&gt; `opacity`\n- **I want to fade ONLY the background** -&gt; `background-color: rgb(... / 50%)`\n- **I want the border to match the text color dynamically** -&gt; `currentColor`\n- **I want the most vibrant green my modern monitor can output** -&gt; `oklch()`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Color and Opacity',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Color and Opacity',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: Inheritance**\n\n**Question:** What color is the text "Hello World", and what color is the background of the `.card`?\n*...predict your answer before reading below...*\n**Explanation:** The text is **red**. The `color` property inherits down to children. The background of the card is **transparent** (the Initial Value). Because it is transparent, you see the `body`\'s blue background shining through it. `background-color` does *not* inherit.',
                html: '  <div class="card">Hello World</div>',
                css: '  body {\n    color: red;\n    background-color: blue;\n  }\n  .card {\n    /* No CSS written for .card yet */\n  }',
                outputHeight: 180,
              },
              {
                id: 2,
                type: 'js',
                instruction: '**Checkpoint 2: Specified vs Computed**\n\n**Question:** What color will the text compute to?\n*...predict your answer before reading below...*\n**Explanation:** The text is **green** (`#00ff00`). The cascade applies rules top-to-bottom. It sets it to red, then overwrites it to green. The third line is an invalid function name (`rg` instead of `rgb`), so the CSS parser\'s error recovery completely drops it. The green survives.',
                html: '<div class="card">card</div>',
                css: '  .card {\n    color: red;\n    color: #00ff00;\n    color: rg(0, 0, 255);\n  }',
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
      'CSS colors have evolved massively over the last two decades. Understanding the history (CSS Color Modules) explains why you see different syntax online.\n### Level 3 (Legacy Standard)\nThe syntax you\'ll see in older tutorials uses comma separation and distinct `rgb()` vs `rgba()` functions.\n\n```css\ncolor: rgb(255, 0, 0);       /* Solid Red */\ncolor: rgba(255, 0, 0, 0.5); /* 50% transparent red */\n```\n\n### Level 4 (Modern Standard)\nModern CSS removes the commas, merges `rgba` into `rgb`, and uses a forward slash `/` for the alpha channel.\n\n```css\ncolor: rgb(255 0 0);       /* Solid Red */\ncolor: rgb(255 0 0 / 50%); /* 50% transparent red */\ncolor: hsl(0 100% 50% / 0.5); \n```\n\n### Level 5 (Wide Gamut & Perceptual Spaces)\nTraditional `rgb()` uses the **sRGB** color space. Modern monitors (like Apple\'s Retina displays) use **Display P3**, which can display vastly more vibrant colors. If you declare `rgb(0 255 0)`, a modern monitor actually clips it to a duller green because it\'s bound by the legacy sRGB limit.\nTo access the full vibrant range of modern monitors, CSS introduced `oklch()`:\n\n```css\n/* Lightness (0-1), Chroma (vibrancy), Hue (angle) */\ncolor: oklch(0.6 0.25 150); \n```\n\n### System Colors\nBrowsers expose semantic variables matching the user\'s OS theme (light/dark mode).\n\n```css\ncolor: CanvasText;         /* The default OS text color */\nbackground-color: Canvas;  /* The default OS background color */\n```'
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
      'Next lesson: Background Images.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why `color` affects text, and `background-color` affects the padding/content area.',
    'I can choose between hex, RGB, and OKLCH based on my specific problem.',
    'I know exactly when to use `opacity` versus an `rgb()` alpha color.',
    'I understand why text inherits color, but backgrounds rely on being transparent.',
    'I can explain how the CSS parser recovers from a typo.',
    'I can open DevTools and verify the Computed value of an element.',
    'I\'ve applied the changes to the ongoing project code (`styles.css`).'
  ],

  checkpoints: ['read-intuition'],
}
