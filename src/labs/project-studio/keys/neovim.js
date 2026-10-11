// The Neovim keys and commands the Neovim series teaches, for key hints in its lessons
// (keyHints.jsx). A lesson writes {{key:<id>}}; up to and including the lesson in `taught`, the
// hint shows the keys in full, and after it only the name, with the keys on hover, focus or tap.
// Add each key here in the lesson that first teaches it.
const L1 = 'nvim-start/01-01-modes-insert-save-quit';
const L2 = 'nvim-start/01-02-open-move-new-lines';
const L3 = 'nvim-start/01-03-insert-variants-and-a-server';
const L4 = 'nvim-start/01-04-undo-fix-and-help';
const M1 = 'nvim-motions/02-01-words-w-b-e';
const M2 = 'nvim-motions/02-02-words-and-line-ends';
const M3 = 'nvim-motions/02-03-find-in-a-line';
const M4 = 'nvim-motions/02-04-jump-through-a-file';
const M5 = 'nvim-motions/02-05-scroll-and-the-screen';
const O1 = 'nvim-operators/03-01-delete-with-a-motion';
const O2 = 'nvim-operators/03-02-change-with-a-motion';
const O3 = 'nvim-operators/03-03-yank-and-put';
const O4 = 'nvim-operators/03-04-repeat-with-dot';
const O5 = 'nvim-operators/03-05-join-indent-and-case';

export const NEOVIM_KEYS = {
  i: { keys: 'i', name: 'insert before the cursor', taught: L1 },
  esc: { keys: 'Esc', name: 'back to Normal mode', taught: L1 },
  w: { keys: ':w', name: 'save', taught: L1 },
  q: { keys: ':q', name: 'quit', taught: L1 },
  wq: { keys: ':wq', name: 'save and quit', taught: L1 },
  'q!': { keys: ':q!', name: 'quit without saving', taught: L1 },
  ZZ: { keys: 'ZZ', name: 'save and quit', taught: L1 },
  e: { keys: ':e path', name: 'open a file', taught: L2 },
  h: { keys: 'h', name: 'left', taught: L2 },
  j: { keys: 'j', name: 'down', taught: L2 },
  k: { keys: 'k', name: 'up', taught: L2 },
  l: { keys: 'l', name: 'right', taught: L2 },
  x: { keys: 'x', name: 'delete the character under the cursor', taught: L2 },
  o: { keys: 'o', name: 'open a line below', taught: L2 },
  O: { keys: 'O', name: 'open a line above', taught: L2 },
  a: { keys: 'a', name: 'insert after the cursor', taught: L3 },
  I: { keys: 'I', name: 'insert at the start of the line', taught: L3 },
  A: { keys: 'A', name: 'insert at the end of the line', taught: L3 },
  u: { keys: 'u', name: 'undo', taught: L4 },
  'ctrl-r': { keys: 'Ctrl+R', name: 'redo', taught: L4 },
  r: { keys: 'r<char>', name: 'replace one character', taught: L4 },
  line: { keys: ':<number>', name: 'go to a line by number', taught: L4 },
  number: { keys: ':set number', name: 'show line numbers', taught: L4 },
  'e!': { keys: ':e!', name: 'discard unsaved changes', taught: L4 },
  help: { keys: ':help <topic>', name: "Neovim's manual", taught: L4 },
  // Chapter 2. Ids for motions whose key is already an id above (w, b, e) are spelled out, and
  // punctuation keys get word ids: a bare $ in lesson prose would start LaTeX in MarkdownProse.
  'motion-w': { keys: 'w', name: 'next word', taught: M1 },
  'motion-b': { keys: 'b', name: 'back a word', taught: M1 },
  'motion-e': { keys: 'e', name: 'end of the word', taught: M1 },
  ge: { keys: 'ge', name: 'end of the previous word', taught: M1 },
  'motion-W': { keys: 'W', name: 'next WORD', taught: M2 },
  'motion-B': { keys: 'B', name: 'back a WORD', taught: M2 },
  'motion-E': { keys: 'E', name: 'end of the WORD', taught: M2 },
  'line-start': { keys: '0', name: 'first column', taught: M2 },
  'first-char': { keys: '^', name: 'first non-blank character', taught: M2 },
  'line-end': { keys: '$', name: 'end of the line', taught: M2 },
  find: { keys: 'f<char>', name: 'find a character on the line', taught: M3 },
  till: { keys: 't<char>', name: 'move to just before a character', taught: M3 },
  'find-back': { keys: 'F<char>', name: 'find a character backwards', taught: M3 },
  'till-back': { keys: 'T<char>', name: 'move back to just after a character', taught: M3 },
  'repeat-find': { keys: ';', name: 'repeat the find', taught: M3 },
  'reverse-find': { keys: ',', name: 'repeat the find the other way', taught: M3 },
  gg: { keys: 'gg', name: 'first line', taught: M4 },
  G: { keys: 'G', name: 'last line (or line N with a count)', taught: M4 },
  count: { keys: '<number><motion>', name: 'repeat a motion', taught: M4 },
  'paragraph-down': { keys: '}', name: 'next blank line', taught: M4 },
  'paragraph-up': { keys: '{', name: 'previous blank line', taught: M4 },
  match: { keys: '%', name: 'matching bracket', taught: M4 },
  'ctrl-d': { keys: 'Ctrl+D', name: 'scroll down half a screen', taught: M5 },
  'ctrl-u': { keys: 'Ctrl+U', name: 'scroll up half a screen', taught: M5 },
  H: { keys: 'H', name: 'top of the screen', taught: M5 },
  M: { keys: 'M', name: 'middle of the screen', taught: M5 },
  L: { keys: 'L', name: 'bottom of the screen', taught: M5 },
  zz: { keys: 'zz', name: 'cursor line to the middle', taught: M5 },
  zt: { keys: 'zt', name: 'cursor line to the top', taught: M5 },
  zb: { keys: 'zb', name: 'cursor line to the bottom', taught: M5 },
  // Chapter 3. Operators get word ids (delete, change, yank) because their single letters would
  // read as the motion or command ids above.
  delete: { keys: 'd<motion>', name: 'delete over a motion', taught: O1 },
  dd: { keys: 'dd', name: 'delete the line', taught: O1 },
  D: { keys: 'D', name: 'delete to the end of the line', taught: O1 },
  change: { keys: 'c<motion>', name: 'change over a motion', taught: O2 },
  cc: { keys: 'cc', name: 'change the line', taught: O2 },
  C: { keys: 'C', name: 'change to the end of the line', taught: O2 },
  yank: { keys: 'y<motion>', name: 'copy (yank) over a motion', taught: O3 },
  yy: { keys: 'yy', name: 'copy the line', taught: O3 },
  Y: { keys: 'Y', name: 'copy to the end of the line', taught: O3 },
  put: { keys: 'p', name: 'put (paste) after the cursor', taught: O3 },
  'put-before': { keys: 'P', name: 'put (paste) before the cursor', taught: O3 },
  dot: { keys: '.', name: 'repeat the last change', taught: O4 },
  J: { keys: 'J', name: 'join the next line onto this one', taught: O5 },
  indent: { keys: '>>', name: 'indent the line', taught: O5 },
  outdent: { keys: '<<', name: 'outdent the line', taught: O5 },
  tilde: { keys: '~', name: 'switch the case of a character', taught: O5 },
  gu: { keys: 'gu<motion>', name: 'lowercase over a motion', taught: O5 },
  gU: { keys: 'gU<motion>', name: 'uppercase over a motion', taught: O5 },
};
