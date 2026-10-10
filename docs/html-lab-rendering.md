# HTML Lab rendering repairs

The main HTML Lab and guided lesson workspace now share a live iframe renderer. Inspect selects source elements without inserting wrapper elements into the learner's layout. Interact uses the same iframe and runs the page's buttons and forms. Selection controls provide an in-page × to delete and a ↕ drag handle to reorder or nest elements. The drop indicator names the destination; Escape cancels. Delete/Backspace also removes the selection while the preview is focused. Undo restores these changes. Tree remains available for structural editing.

CSS and property edits patch the running page. They preserve JavaScript state, input values and runtime-created DOM. HTML changes restart the page because safely applying arbitrary structural changes to a running application requires a separate reconciliation design. JavaScript changes wait for Run / Restart unless Auto-run JS is enabled. Syntax errors leave the previous page in place. The preview console receives startup/runtime errors, promise rejections and console output.

## Source and block fixes

- Parsed HTML preserves text between inline children, whitespace and escaped text rather than dropping trailing words. Unchanged editor-tab switches no longer rewrite the document.
- Imported class/ID/tag rules stay CSS, including conditional rules and source order. Properties edits remain explicit element overrides. Conditional `:root` declarations are not hoisted out of media queries.
- Generated responsive rules are read back into their existing properties rather than copied repeatedly into custom CSS.
- Visual JS imports and file switches never write back automatically. Explicitly deleting the last block clears its source file.
- Structured JavaScript imports are used only when the regenerated syntax tree matches. Other source, including scoped closures and comments, remains in an editable code block.
- Visual JS puts page actions first, with a responsive palette, larger controls, a file indicator and a generated-source disclosure. Imported text, numbers, booleans, variables, comparisons and common DOM/math calls get recognized pattern fields. Editing their code refreshes the pattern controls. Preserved statements use a multiline JavaScript editor. Property fields have accessible names.

## Verification

Run `npx vitest run src/labs/html-lab src/labs/visual-code` for source, reducer, lesson and Visual JS regressions. Browser regression: start `npx vite --host 127.0.0.1 --port 5188`, run `node src/labs/html-lab/e2e/live-preview.mjs`, then stop the server. The browser script uses the real app, imports a fixture and edits through the app's bundled Monaco API. It checks running state, responsive rendering, source errors, the console Visual JS text editing, selection deletion/Undo, and page/Tree drag cancellation. Development websocket reloads are disabled in that browser so unrelated workspace edits cannot reset the session.

## Remaining work

- The existing element model is still not a lossless representation of an arbitrary HTML document. Comments, head resources and mixed root-level text need fuller source preservation.
- JavaScript files still share a concatenated script scope. General ES-module resolution and per-file runtime source mapping need separate implementation.
- The inspector edits authored elements. Runtime-created elements must be changed through their generating JavaScript.
- Arbitrary HTML edits restart the application; CSS-only edits do not.
- Source-error recovery and layout checks do not establish educational quality; the lesson explanations and exercises still need learner feedback.
