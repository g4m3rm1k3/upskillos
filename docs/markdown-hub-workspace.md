# Markdown Hub workspace

The tutorial side pane in `#/studio` now defaults to a real project environment when the desktop project bridge is available. The browser retains the existing scratchpad; desktop users can switch back to it to recover or export existing scratchpad work.

Desktop projects use the existing Project Studio bridge under the separate `markdown-hub` scope. Open a folder, create or select files in the explorer, edit with Monaco, and use Save all or Ctrl/Cmd+S. Tabs preserve editor models and undo history while mounted. Wrap and the collapsible explorer leave more room for code.

Terminal / output saves pending edits and opens Project Studio's native, tabbed terminal in a modal. Run normal shell commands there using installed tools. Closing the modal keeps the shell and its scrollback alive; closing the code pane or leaving the workspace tears down the terminal. The browser Run button likewise opens output in a modal, with terminal and preview tabs.

Drafts are backed up locally per project root. Saving checks the disk content against the version opened by the learner; changed, missing, and unreadable files are not silently replaced. Reload file explicitly discards the draft after confirmation. This is a read-before-write check, not an atomic filesystem transaction. File selection rereads unchanged buffers. Refresh files updates the explorer after terminal operations.

Tutorial snippets require an explicit Append to file action in desktop mode. They are never automatically written to disk or executed. Project Studio's native folder restrictions remain in effect, including its restriction on reusing another unrelated track's folder.

## Verification

Focused tests cover save success/failure, external edits/deletion/read failures, recovered drafts, explicit snippet insertion, output modal lifecycle, desktop selection, and scratchpad recovery after reopening the pane. The shared filesystem, explorer and terminal component tests are also run for this change.

- `npx vitest run src/components/docs src/labs/project-studio/useProjectFs.test.jsx src/labs/project-studio/FileTree.test.jsx src/labs/project-studio/TerminalPanel.test.jsx`: 6 files passed, 19 tests passed. Vite printed esbuild/oxc deprecation warnings and a stale Browserslist data warning. The initial sandboxed test run failed to rename temporary transform-cache files; the retry outside the sandbox passed.
- `npm run typecheck`: exited 0 without diagnostics.
- `npm run docs:check`: “Contributor docs checked: 10 file(s), links, paths and commands all exist.”
- `git -c core.fsmonitor=false diff --check`: no whitespace errors (Git printed a line-ending normalization warning).

Visual and actual Electron process acceptance remain pending: the browser connection to the local Vite preview timed out. A mocked desktop bridge test does not establish that a packaged Electron build can launch its shell. No language server or automatic desktop Run task is introduced; installed toolchains are accessed through the real terminal.
