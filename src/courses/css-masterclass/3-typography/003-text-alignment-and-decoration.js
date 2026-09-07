// css-masterclass — Typography — Lesson 3: Text Alignment and Decoration
// Auto-converted from src/docs/tutorials/css-masterclass/03-typography/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-003-text-alignment-and-decoration',
  slug: 'text-alignment-and-decoration',
  chapter: 3,
  order: 3,
  title: 'Text Alignment and Decoration',
  subtitle: 'Typography',
  tags: ['text-alignment-and-decoration', 'text-align', 'text-decoration', 'text-transform'],

  hook: {
    question: 'What is "Text Alignment and Decoration", and why does it matter?',
    realWorldContext: 'Text defaults to sitting on a baseline, aligning to the left edge of its container, and rendering exactly as typed. **The Problem:** UI design requires hierarchy and emphasis. We need titles centered, links underlined, and buttons capitalized, without forcing the content author to physically type "BUTTON" in all-caps in the HTML database. **The Solution:** - `text-align`: Controls the horizontal justification of inline content within its block container. - `text-decoration`: Draws lines over, under, or through the text glyphs. - `text-transform`: Alters the capitalization of the text at the rendering layer, without changing the underlying HTML text data.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Text defaults to sitting on a baseline, aligning to the left edge of its container, and rendering exactly as typed. **The Problem:** UI design requires hierarchy and emphasis. We need titles centered, links underlined, and buttons capitalized, without forcing the content author to physically type "BUTTON" in all-caps in the HTML database. **The Solution:** - `text-align`: Controls the horizontal justification of inline content within its block container. - `text-decoration`: Draws lines over, under, or through the text glyphs. - `text-transform`: Alters the capitalization of the text at the rendering layer, without changing the underlying HTML text data.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `text-align`\n- **Formal syntax:** `text-align: start | end | left | right | center | justify`\n- **Initial value:** `start` (or `left` in LTR languages).\n- **Inherited:** **Yes.**\n- **Animatable:** No.\n- **Percentages allowed?:** N/A.\n- **Computed value:** The specified keyword.\n- **Applies to:** Block containers (It aligns the *inline* content inside the block, not the block itself!).\n### `text-decoration`\n- **Formal syntax:** `text-decoration: <line> || <style> || <color> || <thickness>`\n- **Accepted value types:** Lines (`underline`, `overline`, `line-through`, `none`), styles (`solid`, `wavy`, `dashed`), colors.\n- **Initial value:** `none`.\n- **Inherited:** **No.** (But it *looks* like it does because the line is drawn across all child text nodes).\n- **Animatable:** Yes (Thickness and color are animatable).\n- **Percentages allowed?:** No.\n- **Computed value:** The individual longhand properties.\n- **Applies to:** All elements.\n### `text-transform`\n- **Formal syntax:** `text-transform: none | capitalize | uppercase | lowercase`\n- **Initial value:** `none`.\n- **Inherited:** **Yes.**\n- **Animatable:** No.\n- **Percentages allowed?:** N/A.',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  text-align: middle; /* Invalid! */\n  text-transform: titlecase; /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `text-align: middle;` is dropped. The correct keyword is `center`. (`middle` is used for `vertical-align`, a totally different property).\n- `text-transform: titlecase;` is dropped. The correct keyword is `capitalize`.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**The `justify` Trap:** Never use `text-align: justify;` for body paragraphs on the web. While it looks neat in printed books, web browsers do not have the complex hyphenation engines of Adobe InDesign. Justifying text on the web creates "rivers of white space" (massive, uneven gaps between words) that make reading incredibly difficult for users with dyslexia.\n**The ALL CAPS Trap:** Screen readers (software used by blind users) often interpret ALL CAPS text as acronyms. If you type `<p>HELLO</p>` in HTML, the screen reader might read it aloud as "H. E. L. L. O." instead of the word "Hello". **Rule:** Always type the text normally in HTML (`<p>Hello</p>`), and use CSS `text-transform: uppercase;` to make it visually capitalized. The screen reader will read the normal HTML, but the sighted user will see the caps.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -> **Inspect** a link (`<a>`).\n2. Add `text-decoration: underline red wavy;`.\n3. Zoom in. Notice how the wavy line cuts directly through the bottom of letters like "y" and "j".\n4. Add `text-underline-offset: 4px;`. Watch the line snap downward, instantly improving readability.\n5. **Performance impact:** These properties are extremely cheap. They trigger Paint, but are heavily optimized by the browser\'s text rendering engine.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `text-transform: capitalize` vs `uppercase`\n- **`capitalize`:** Transforms only the *first letter* of every word to uppercase (e.g., "hello world" -> "Hello World").\n- **`uppercase`:** Transforms *every letter* to uppercase (e.g., "hello world" -> "HELLO WORLD").',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want to center a paragraph** -> `text-align: center;`\n- **I want my button text to look like yelling, but be accessible** -> `text-transform: uppercase;`\n- **I want to strike out an old price** -> `text-decoration: line-through;`\n- **I want beautiful links** -> `text-decoration: underline; text-underline-offset: 3px;`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Text Alignment and Decoration',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Text Alignment and Decoration',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: Aligning the Block vs Aligning the Text**\n\n**Question:** Is the blue box centered in the middle of the web page, or is the text "Hello" centered inside the blue box?\n*...predict your answer before reading below...*\n**Explanation:** The **text is centered inside the box**. `text-align` only affects the inline content *inside* the element. It does not move the element itself. (To center the box itself on the page, you would use `margin: 0 auto;`).',
                html: '<div class="box">Hello</div>',
                css: '  .box {\n    width: 200px;\n    background: blue;\n    text-align: center;\n  }',
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
      '**Logical Alignment** In the past, we wrote `text-align: left;` and `text-align: right;`. Modern CSS strongly encourages **logical properties**: `text-align: start;` and `text-align: end;`. If your website is translated into Arabic (a Right-To-Left language), `start` automatically becomes the right side of the screen, and `end` becomes the left side. If you hardcode `left`, your layout breaks in RTL languages.\n**Modern Underlines** Historically, `text-decoration: underline` drew a harsh, thick line directly through the descenders of letters like "p" and "g", making them hard to read. Modern CSS introduced `text-underline-offset` and `text-decoration-thickness` to push the line down and thin it out, creating beautiful, magazine-quality links.'
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
      'Next lesson: Whitespace and Lists.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I know why we use `text-align: start` instead of `left` (Internationalization).',
    'I understand why typing ALL CAPS in HTML ruins accessibility.',
    'I know why `text-align: justify` is terrible for dyslexia on the web.',
    'I can use `text-underline-offset` to make readable links.',
    'I understand that `text-align` centers the text, not the box.',
    'I have applied the alignment and decoration to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
