// css-masterclass — Typography — Lesson 4: Whitespace and Lists
// Auto-converted from src/docs/tutorials/css-masterclass/03-typography/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-004-whitespace-and-lists',
  slug: 'whitespace-and-lists',
  chapter: 3,
  order: 4,
  title: 'Whitespace and Lists',
  subtitle: 'Typography',
  tags: ['whitespace-and-lists', 'white-space', 'text-overflow', 'list-style'],

  hook: {
    question: 'What is "Whitespace and Lists", and why does it matter?',
    realWorldContext: 'By default, the HTML parser is extremely aggressive about destroying whitespace. If you press the Spacebar 50 times in your HTML file, the browser deletes 49 of them and renders a single space. If you press Enter to create a new line in HTML, the browser deletes it and renders a single space. **The Problem:** Sometimes you *want* the browser to respect your exact spaces and line breaks (like displaying a poem, code snippet, or ASCII art). Additionally, you often want to control the visual structure of bulleted and numbered lists without fighting the browser\'s default indents. **The Solution:** - `white-space`: Commands the rendering engine how to handle spaces, tabs, and line breaks found in the HTML source code. - `list-style`: Controls the visual markers (bullets, numbers, images) of `<li>` elements.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'By default, the HTML parser is extremely aggressive about destroying whitespace. If you press the Spacebar 50 times in your HTML file, the browser deletes 49 of them and renders a single space. If you press Enter to create a new line in HTML, the browser deletes it and renders a single space. **The Problem:** Sometimes you *want* the browser to respect your exact spaces and line breaks (like displaying a poem, code snippet, or ASCII art). Additionally, you often want to control the visual structure of bulleted and numbered lists without fighting the browser\'s default indents. **The Solution:** - `white-space`: Commands the rendering engine how to handle spaces, tabs, and line breaks found in the HTML source code. - `list-style`: Controls the visual markers (bullets, numbers, images) of `<li>` elements.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `white-space`\n- **Formal syntax:** `white-space: normal | nowrap | pre | pre-wrap | pre-line | break-spaces`\n- **Initial value:** `normal`.\n- **Inherited:** **Yes.**\n- **Animatable:** No.\n- **Percentages allowed?:** N/A.\n- **Computed value:** The specified keyword.\n- **Applies to:** All elements.\n### `text-overflow`\n- **Formal syntax:** `text-overflow: clip | ellipsis | <string>`\n- **Initial value:** `clip`.\n- **Inherited:** No.\n- **Animatable:** No.\n- **Applies to:** Block containers. *(Crucial Note: `text-overflow` does absolutely nothing unless you also have `overflow: hidden` and `white-space: nowrap` applied).*\n### `list-style` (Shorthand for type, position, image)\n- **Formal syntax:** `list-style: <list-style-type> || <list-style-position> || <list-style-image>`\n- **Accepted value types:** `disc`, `circle`, `square`, `decimal`, `none`, `inside`, `outside`, `url(...)`.\n- **Initial value:** `disc outside none`.\n- **Inherited:** **Yes.**',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  white-space: no-wrap; /* Invalid! */\n  list-style: bullet;   /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `white-space: no-wrap;` is dropped. It is a very common typo. The correct keyword is `nowrap` (no hyphen).\n- `list-style: bullet;` is dropped. The correct keyword is `disc` for a solid circle, or `circle` for an empty one.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '**List Semantics:** If you set `list-style: none;` on a `<ul>`, some older screen readers (specifically VoiceOver on Safari) will completely remove the "List" semantics from the element. They will read it as a normal block of text, preventing blind users from knowing how many items are in the list. **Fix:** If you remove the bullets visually but still want it to be a list semantically, you often need to explicitly add `role="list"` to the HTML `<ul>` tag.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -> **Inspect** a paragraph containing multiple spaces in the HTML source.\n2. In the Styles tab, add `white-space: pre;`.\n3. Watch the text instantly expand, suddenly respecting all the spaces and line breaks you typed in the HTML.\n4. Now toggle it to `white-space: pre-wrap;`. Watch how it still respects your spaces, but *also* allows the text to wrap at the edge of the box so it doesn\'t cause a horizontal scrollbar.\n5. **Performance impact:** `white-space: nowrap` is extremely cheap and often *improves* layout performance because the browser doesn\'t have to calculate line-wrap breakpoints.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `white-space: pre` vs `white-space: pre-wrap`\n- **`pre`:** Preserves all spaces and line breaks exactly as typed in HTML. However, if a line is too long, it will blow right out of the box and cause a horizontal scrollbar. (Used for `<pre><code>` blocks).\n- **`pre-wrap`:** Preserves spaces and line breaks, but *also* safely wraps the text at the edge of the box to prevent horizontal scrolling.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want to prevent a button label from ever breaking onto two lines** -> `white-space: nowrap;`\n- **I want a long title to truncate with `...`** -> The 3-property ellipsis hack.\n- **I want to remove the default bullets from a nav menu** -> `list-style: none;` (And set `padding: 0;` because `<ul>` has default left padding!).\n- **I want the list bullets to sit *inside* the text block instead of hanging in the margin** -> `list-style-position: inside;`',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Whitespace and Lists',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Whitespace and Lists',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Invisible Ellipsis**\n\n**Question:** Will the text truncate with an ellipsis (`...`)?\n*...predict your answer before reading below...*\n**Explanation:** **No, it will not.** The text will wrap to a second line. `text-overflow: ellipsis` only works if the text is physically forced to overflow a hidden boundary. Without `white-space: nowrap` and `overflow: hidden`, the ellipsis property does absolutely nothing.',
                html: '<div class="title">This is a very long title</div>',
                css: '  .title {\n    width: 100px;\n    text-overflow: ellipsis;\n  }',
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
      '**The Ellipsis Hack** One of the most famous patterns in CSS is forcing a long line of text to truncate with three dots (`...`) instead of wrapping to a second line. This is universally used for usernames, email subjects, or card titles. It requires exactly three properties working in unison:\n\n```css\n.truncate {\n  white-space: nowrap;      /* 1. Prevent the text from wrapping to line 2 */\n  overflow: hidden;         /* 2. Chop off the text that spills out of the box */\n  text-overflow: ellipsis;  /* 3. Render the "..." at the chop point */\n}\n```'
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
    'I can write the 3-property ellipsis hack from memory.',
    'I know that `nowrap` does not have a hyphen.',
    'I understand how the HTML parser aggressively destroys whitespace by default.',
    'I know why removing list styles can hurt screen readers.',
    'I have applied the truncation and list reset to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
