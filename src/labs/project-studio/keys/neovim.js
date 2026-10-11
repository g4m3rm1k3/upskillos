// The Neovim keys and commands the Neovim series teaches, for key hints in its lessons
// (keyHints.jsx). A lesson writes {{key:<id>}}; up to and including the lesson in `taught`, the
// hint shows the keys in full, and after it only the name, with the keys on hover, focus or tap.
// Add each key here in the lesson that first teaches it.
const L1 = 'nvim-start/01-01-modes-insert-save-quit';
const L2 = 'nvim-start/01-02-open-move-new-lines';
const L3 = 'nvim-start/01-03-insert-variants-and-a-server';
const L4 = 'nvim-start/01-04-undo-fix-and-help';

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
};
