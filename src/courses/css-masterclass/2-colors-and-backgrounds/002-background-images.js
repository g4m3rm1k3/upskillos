// css-masterclass — Colors And Backgrounds — Lesson 2: Background Images
// Auto-converted from src/docs/tutorials/css-masterclass/02-colors-and-backgrounds/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-002-background-images',
  slug: 'background-images',
  chapter: 2,
  order: 2,
  title: 'Background Images',
  subtitle: 'Colors And Backgrounds',
  tags: ['background-images', 'background-image', 'background-size', 'background-repeat', 'background-position'],

  hook: {
    question: 'What is "Background Images", and why does it matter?',
    realWorldContext: 'The `background-image` property doesn\'t just load pictures; it defines the visual texture of the element\'s background layer. **The Problem:** If you place an HTML `<img>` tag on a page, it takes up physical layout space and pushes text out of the way. If you try to put text *over* an `<img>` tag, you have to use complex absolute positioning. **The Solution:** `background-image` paints the graphic directly onto the background canvas of the box. The text naturally flows over it because the image isn\'t part of the document flow; it\'s just "wallpaper".',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'The `background-image` property doesn\'t just load pictures; it defines the visual texture of the element\'s background layer. **The Problem:** If you place an HTML `<img>` tag on a page, it takes up physical layout space and pushes text out of the way. If you try to put text *over* an `<img>` tag, you have to use complex absolute positioning. **The Solution:** `background-image` paints the graphic directly onto the background canvas of the box. The text naturally flows over it because the image isn\'t part of the document flow; it\'s just "wallpaper".',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `background-image`\n- **Formal syntax:** `background-image: <bg-image>#` (Can accept a comma-separated list of multiple images!)\n- **Accepted value types:** `url(...)`, `linear-gradient(...)`, `radial-gradient(...)`, `none`.\n- **Initial value:** `none`.\n- **Inherited:** **No.**\n- **Animatable:** Yes (But usually terrible for performance unless using cross-fades).\n- **Percentages allowed?:** N/A.\n- **Computed value:** Absolute URI or gradient function.\n- **Applies to:** All elements.\n### `background-size`\n- **Formal syntax:** `background-size: <bg-size>#`\n- **Accepted value types:** `cover`, `contain`, lengths (`px`), percentages (`%`).\n- **Initial value:** `auto` (The image\'s natural physical size).\n- **Inherited:** No.\n- **Animatable:** Yes.\n### `background-repeat`\n- **Initial value:** `repeat` (Tiles infinitely in both X and Y directions).\n### `background-position`\n- **Initial value:** `0% 0%` (Top Left corner).',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  background-image: url(\'missing-file.jpg\');\n  background-size: shrink; /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `url(\'missing-file.jpg\');` is **valid CSS**. The CSS parser has no idea the file is missing until the network request fails milliseconds later. The browser simply leaves the background transparent and moves on without crashing.\n- `background-size: shrink;` is dropped entirely. The valid keywords are `cover` or `contain`.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: 'Never use `background-image` for a graphic that contains vital information (like a chart with data, or a logo with text). Screen readers **cannot see background images** and will completely ignore them.\nIf the image is purely decorative (like a subtle texture or a stock photo of a landscape behind a title), use `background-image`. If the image is actual data the user needs to understand, use an HTML `<img>` tag with an `alt="Description"` attribute.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** an element with a background image.\n2. In the Styles tab, locate the `background-size: cover;` rule.\n3. Click the value `cover` and type `contain` instead. Watch how the image suddenly stops cropping itself and shrinks to fit entirely inside the box, leaving empty white space around it.\n4. Delete the `background-repeat: no-repeat;` line. If the image is smaller than the box, you will instantly see it tile infinitely like bathroom tiles.\n5. **Performance impact:** High-resolution background images take time to download. The browser will render the text immediately, but the background will remain blank until the image arrives. Always specify a fallback `background-color` so the text is still readable while the image is downloading.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `background-size: cover` vs `background-size: contain`\n- **`cover`:** Guarantees the entire box is filled. If the image and box have different aspect ratios, the image is zoomed in and the edges are cropped off. No empty space is ever allowed.\n- **`contain`:** Guarantees the entire image is visible. If the aspect ratios differ, the image shrinks until it fits, leaving empty "letterbox" space inside the box.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a hero image that fills the whole screen without stretching** -&gt; `background-size: cover; background-position: center;`\n- **I have a company logo that must not be cropped** -&gt; `background-size: contain; background-repeat: no-repeat;`\n- **I want a seamless repeating brick texture** -&gt; `background-repeat: repeat;`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Background Images',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Background Images',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: Multiple Backgrounds**\n\n**Question:** CSS allows a comma-separated list of images. Which image renders on top?\n*...predict your answer before reading below...*\n**Explanation:** The **first image (`top-layer.png`)** renders on top. CSS background layers stack like a deck of cards, with the first item in the list being the top card closest to the user.',
                html: '<div class="box">box</div>',
                css: '  .box {\n    background-image: url(\'top-layer.png\'), url(\'bottom-layer.jpg\');\n  }',
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
      'Background properties are so commonly used together that CSS provides a `background` shorthand property.\n\n```css\nbackground: url(\'img.jpg\') center / cover no-repeat;\n```\n\nHowever, using the shorthand can be dangerous because any property you *don\'t* specify is secretly reset to its initial value. If you write `background: url(\'a.jpg\');`, it implicitly sets `background-size: auto` and wipes out any previous `background-size: cover` you might have declared earlier. Therefore, it\'s often safer to write out the individual properties when maintaining large codebases.'
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
      'Next lesson: Gradients.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I know why we use `background-image` for decoration and `<img>` for semantic data.',
    'I can explain the visual difference between `cover` and `contain`.',
    'I know why the default `background-repeat` behavior causes tiling.',
    'I understand that CSS doesn\'t error if the image URL is broken.',
    'I can toggle `cover` to `contain` in DevTools to see the layout shift.',
    'I have applied the background image rules to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
