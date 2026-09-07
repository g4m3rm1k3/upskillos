// css-masterclass — Display — Lesson 2: Hiding Elements
// Auto-converted from src/docs/tutorials/css-masterclass/05-display/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {
  id: 'css-masterclass-002-hiding-elements',
  slug: 'hiding-elements',
  chapter: 5,
  order: 2,
  title: 'Hiding Elements',
  subtitle: 'Display',
  tags: ['hiding-elements', 'display-none', 'visibility-hidden', 'opacity-0'],

  hook: {
    question: 'What is "Hiding Elements", and why does it matter?',
    realWorldContext: 'Sometimes you need an element to exist in the HTML (like a dropdown menu, a modal, or a success message), but you don\'t want the user to see it until they click a button. **The Problem:** There are many ways to make something invisible in CSS, but they have radically different consequences for the rendering engine, the page layout, and the screen reader. **The Solution:** We must choose between `display: none`, `visibility: hidden`, or `opacity: 0` based on whether we want the element to physically occupy space, remain readable to blind users, or be smoothly animated.',
    previewVisualizationId: 'JSNotebook',
  },

  intuition: {
    prose: [
      'Sometimes you need an element to exist in the HTML (like a dropdown menu, a modal, or a success message), but you don\'t want the user to see it until they click a button. **The Problem:** There are many ways to make something invisible in CSS, but they have radically different consequences for the rendering engine, the page layout, and the screen reader. **The Solution:** We must choose between `display: none`, `visibility: hidden`, or `opacity: 0` based on whether we want the element to physically occupy space, remain readable to blind users, or be smoothly animated.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Complete Grammar',
        body: '### `display: none`\n- **Description:** Completely removes the element and all its children from the browser\'s rendering tree. It is as if the element was deleted from the HTML file.\n- **Inherited:** N/A (The element ceases to exist visually, so children disappear with it).\n- **Animatable:** No (Except via modern CSS Level 4 discrete entry/exit animations, which are complex).\n- **Computed value:** `none`.\n### `visibility: hidden`\n- **Formal syntax:** `visibility: visible | hidden | collapse`\n- **Description:** The element is invisible, but it **maintains its physical geometry**. It acts like an invisible ghost holding its space in the layout.\n- **Inherited:** **Yes.** (Crucially, if a parent is `hidden`, a child can declare `visibility: visible` and reappear while the parent remains invisible!)\n- **Animatable:** Yes (It acts as a boolean switch at the end of a transition).\n### `opacity: 0`\n- **Description:** The element is completely transparent. Like `visibility`, it still takes up physical space. Unlike `visibility`, it can still be clicked!\n- **Animatable:** Yes (Smoothly interpolates).',
      },
      {
        type: 'warning',
        title: 'CSS Parsing & Error Recovery',
        body: '```css\n.card {\n  display: hidden; /* Invalid! */\n  visibility: none; /* Invalid! */\n}\n```\n\n**Error Recovery:**\n- `display: hidden;` is dropped. A very common beginner mistake is mixing up the keywords. `display` uses `none`.\n- `visibility: none;` is dropped. `visibility` uses `hidden`.',
      },
      {
        type: 'real-world',
        title: 'Accessibility (A11y)',
        body: '| Technique | Visually Hidden? | Consumes Space? | Clickeable? | Read by Screen Reader? |\n| :--- | :--- | :--- | :--- | :--- |\n| `display: none` | Yes | No | No | **No** |\n| `visibility: hidden`| Yes | Yes | No | **No** |\n| `opacity: 0` | Yes | Yes | **Yes** | **Yes** |\n| `.sr-only` hack | Yes | No | No | **Yes** |\n**Crucial A11y Rule:** Never use `opacity: 0` to hide a button or link unless you also disable it. Even though it\'s transparent, it is still physically present and a sighted user might accidentally click the invisible empty space and trigger the action.',
      },
      {
        type: 'procedure',
        title: 'DevTools & Performance',
        body: '1. Open DevTools -&gt; **Inspect** a paragraph.\n2. In the Styles tab, add `visibility: hidden`. Notice how the text vanishes, but a massive blank hole remains in your layout where the paragraph used to be.\n3. Change it to `opacity: 0`. The visual result is identical.\n4. Change it to `display: none`. Notice how the elements below it violently slam upward to fill the void. The element was completely deleted from the layout math.\n5. **Performance impact:** Changing `display: none` to `display: block` triggers **Layout**, which is very expensive. Changing `opacity` from `0` to `1` triggers only **Composite**, which is practically free. This is why we fade menus in with `opacity`, rather than animating `display`.',
      },
      {
        type: 'strategy',
        title: 'Compare Similar Features',
        body: '### `display: none` vs `visibility: hidden`\n- **`display: none`:** Element is deleted from the layout. Other elements shift to fill the gap.\n- **`visibility: hidden`:** Element is rendered, takes up space, but the pixels are left empty. Other elements do not shift.',
      },
      {
        type: 'strategy',
        title: 'Decision Guide',
        body: '- **I want a dropdown menu to physically disappear and not take up space** -&gt; `display: none;`\n- **I want a loading spinner to fade out smoothly** -&gt; `opacity: 0;` (and `pointer-events: none;` so it can\'t be clicked).\n- **I am building a layout grid, and I want an empty cell to hold its shape** -&gt; `visibility: hidden;`\n- **I want to hide a label visually but keep it for screen readers** -&gt; Use the `.sr-only` clipping hack.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Hands-On: Hiding Elements',
        caption: 'Edit any tab and click Run to see it render live.',
        props: {
          lesson: {
            title: 'Hiding Elements',
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
              {
                id: 1,
                type: 'js',
                instruction: '**Checkpoint 1: The Ghost Child**\n\n**Question:** Will the user see "Parent Text"? Will they see "Child Text"?\n*...predict your answer before reading below...*\n**Explanation:** They will see **only "Child Text"**. Because `visibility` inherits, the child initially becomes hidden. But because we explicitly override the child to `visible`, it reappears. This creates a floating child element whose parent is completely invisible. (Note: You cannot do this with `display: none` or `opacity: 0`).',
                html: '<div class="parent">\n  Parent Text\n  <div class="child">Child Text</div>\n</div>',
                css: '  .parent { visibility: hidden; }\n  .child { visibility: visible; }',
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
      '**The Accessibility Hiding Hack (Screen Reader Only)** If you want to hide a label visually (because your UI design has a magnifying glass icon for the search bar instead of the word "Search"), you cannot use `display: none`. If you do, the screen reader will ignore it, and the blind user won\'t know what the input does. Historically, developers created the `.sr-only` class to hide things visually but keep them readable by screen readers:\n\n```css\n.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border-width: 0;\n}\n```\n\nThis physically shrinks the box to an invisible 1-pixel dot, keeping it in the HTML accessibility tree while removing it from the visual UI.'
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
    'I can accurately predict whether elements will shift when hidden.',
    'I know why `opacity: 0` is dangerous for hidden interactive elements.',
    'I can explain why `display: hidden` is invalid syntax.',
    'I know how to use the `.sr-only` hack for screen readers.',
    'I have applied the `.hidden` utility class to my project code.'
  ],

  checkpoints: ['read-intuition'],
}
