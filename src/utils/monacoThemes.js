const OPENMAT_KEYWORDS = [
  "if", "else", "elseif", "for", "while", "break", "continue", "return", "end",
  "function", "switch", "case", "otherwise", "try", "catch",
  "hold", "grid", "subplot", "plot", "stem", "area", "surf", "mesh",
  "title", "xlabel", "ylabel", "legend", "xlim", "ylim", "axis",
  "disp", "fprintf", "sprintf", "num2str", "who", "whos", "clear", "clc",
  "format", "slider", "animate",
];

const OPENMAT_BUILTINS = [
  "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
  "exp", "log", "log10", "sqrt", "abs", "real", "imag", "angle",
  "linspace", "logspace", "zeros", "ones", "eye", "rand", "randn",
  "sum", "prod", "mean", "median", "std", "var", "min", "max",
  "sort", "unique", "find", "diff", "gradient", "trapz", "roots",
  "polyfit", "polyval", "polyder", "det", "inv", "eig", "svd", "qr",
  "lu", "rank", "cond", "orth", "null", "dot", "cross", "meshgrid",
  "interp1", "fft", "fftshift", "conv", "filter", "findpeaks",
];

const OPENMAT_CONSTANTS = ["pi", "inf", "NaN", "true", "false", "i", "j"];

// Monaco's built-in Python mode indents after def/if/for/etc. but never
// dedents after return/break/continue/pass/raise — confirmed live: typing a
// fresh multi-line function from scratch (the notebook's `typeIt` cells)
// auto-indented a following top-level statement right back inside the
// function body after a blank line, silently turning it into unreachable
// code with no syntax error and no visible symptom besides "nothing ran."
// Real Python tooling (e.g. VS Code's Python extension) fixes this with
// exactly this outdent rule.
//
// Monaco's own built-in Python config is registered lazily, the first time
// a Python model is actually created (basic-languages' `onLanguageEncountered`
// hook, which dynamic-imports python.js and calls setLanguageConfiguration
// asynchronously) — and since languageConfigurationRegistry.js resolves ties
// by "last registered wins", calling this once — even from onMount, after the
// editor already exists — can still lose the race: the built-in config's
// dynamic import can resolve after onMount fires and silently replace our
// onEnterRules with its own (confirmed live: a single immediate call, from
// both beforeMount and onMount, was still overwritten). Real fix: apply
// immediately for the common case, then re-apply once more after a delay
// long enough that the built-in's dynamic import has certainly resolved by
// then (confirmed live: 300ms is comfortably past it; there's no reliable
// synchronous signal for "the built-in config finished loading" to hook
// instead). Only `onEnterRules` is set — every other field (brackets,
// comments, autoClosingPairs...) is left undefined, so the registry's
// per-field merge falls through to Monaco's built-in Python config
// unchanged for everything but this.
export function applyPythonIndentRules(monaco) {
  const register = () => {
    monaco.languages.setLanguageConfiguration("python", {
      onEnterRules: [
        {
          beforeText: /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async|match|case).*?:\s*$/,
          action: { indentAction: monaco.languages.IndentAction.Indent },
        },
        {
          beforeText: /^\s*(?:return|break|continue|pass|raise)\b.*$/,
          action: { indentAction: monaco.languages.IndentAction.Outdent },
        },
      ],
    });
  };
  register();
  setTimeout(register, 300);
}

export function setupOpenCalcMonaco(monaco) {
  if (!monaco || monaco.__openCalcConfigured) return;
  monaco.__openCalcConfigured = true;

  monaco.editor.defineTheme("open-calc-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e86a6" },
      { token: "keyword", foreground: "74c0fc", fontStyle: "bold" },
      { token: "string", foreground: "8ce99a" },
      { token: "number", foreground: "ffd166" },
      { token: "delimiter", foreground: "9fb5d1" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#b7d7ff",
      "editorLineNumber.foreground": "#4f6b91",
      "editorLineNumber.activeForeground": "#8dbdff",
      "editorCursor.foreground": "#7dd3fc",
      "editor.selectionBackground": "#173a63",
      "editor.inactiveSelectionBackground": "#112a48",
      "editor.lineHighlightBackground": "#0c1b30",
      "editorIndentGuide.background1": "#132946",
      "editorIndentGuide.activeBackground1": "#244a78",
      "editorWidget.background": "#0c1628",
      "editorWidget.border": "#29415f",
    },
  });

  monaco.editor.defineTheme("open-calc-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7086a0" },
      { token: "keyword", foreground: "1769d1", fontStyle: "bold" },
      { token: "string", foreground: "0f8d85" },
      { token: "number", foreground: "b36d05" },
      { token: "delimiter", foreground: "607188" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#16314f",
      "editorLineNumber.foreground": "#8aa0bc",
      "editorLineNumber.activeForeground": "#1769d1",
      "editorCursor.foreground": "#1769d1",
      "editor.selectionBackground": "#cfe5ff",
      "editor.inactiveSelectionBackground": "#e3f0ff",
      "editor.lineHighlightBackground": "#e9f4ff",
      "editorIndentGuide.background1": "#d8e7fa",
      "editorIndentGuide.activeBackground1": "#a8c7ef",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#c9d9ee",
    },
  });

  monaco.editor.defineTheme("github-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e7781", fontStyle: "italic" },
      { token: "keyword", foreground: "cf222e", fontStyle: "bold" },
      { token: "string", foreground: "0a3069" },
      { token: "number", foreground: "0550ae" },
      { token: "type", foreground: "953800" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#24292f",
      "editorLineNumber.foreground": "#8c959f",
      "editorLineNumber.activeForeground": "#24292f",
      "editorCursor.foreground": "#0969da",
      "editor.selectionBackground": "#0969da33",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#d0d7de",
    },
  });

  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72", fontStyle: "bold" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "type", foreground: "ffa657" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editorCursor.foreground": "#58a6ff",
      "editor.selectionBackground": "#388bfd33",
      "editor.lineHighlightBackground": "#161b22",
      "editorWidget.background": "#161b22",
      "editorWidget.border": "#30363d",
    },
  });

  monaco.editor.defineTheme("dracula", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6272a4", fontStyle: "italic" },
      { token: "keyword", foreground: "ff79c6", fontStyle: "bold" },
      { token: "string", foreground: "f1fa8c" },
      { token: "number", foreground: "bd93f9" },
      { token: "type", foreground: "8be9fd" },
      { token: "function", foreground: "50fa7b" },
      { token: "variable", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#6272a4",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorCursor.foreground": "#f8f8f2",
      "editor.selectionBackground": "#44475a",
      "editor.lineHighlightBackground": "#44475a66",
      "editorWidget.background": "#21222c",
      "editorWidget.border": "#6272a4",
    },
  });

  // Vue's own emerald palette — reuses the exact hex tones already defined
  // for its markdown theme (studioThemes.js's vue-dark/vue-light mdDark
  // blocks: preBg/preBorder/text/h1-h3), so the editor doesn't introduce a
  // fourth, uncoordinated shade of green. Previously vue/vue-dark/vue-light
  // all pointed at the generic open-calc-dark/light themes, which is why
  // the editor never visibly changed under the Vue theme unlike GitHub,
  // Dracula, or Monokai, each of which has always had its own definition.
  monaco.editor.defineTheme("open-calc-vue-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "4d7c66", fontStyle: "italic" },
      { token: "keyword", foreground: "34d399", fontStyle: "bold" },
      { token: "string", foreground: "fbbf24" },
      { token: "number", foreground: "6ee7b7" },
      { token: "delimiter", foreground: "6b9080" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#a7f3d0",
      "editorLineNumber.foreground": "#3f6852",
      "editorLineNumber.activeForeground": "#6ee7b7",
      "editorCursor.foreground": "#41b883",
      "editor.selectionBackground": "#134e2d",
      "editor.inactiveSelectionBackground": "#0c2317",
      "editor.lineHighlightBackground": "#0c231766",
      "editorIndentGuide.background1": "#134e2d",
      "editorIndentGuide.activeBackground1": "#1a6b3d",
      "editorWidget.background": "#0c1f17",
      "editorWidget.border": "#134e2d",
    },
  });

  monaco.editor.defineTheme("open-calc-vue-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b8f7c", fontStyle: "italic" },
      { token: "keyword", foreground: "047857", fontStyle: "bold" },
      { token: "string", foreground: "b45309" },
      { token: "number", foreground: "059669" },
      { token: "delimiter", foreground: "4b7a64" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#1e3a2f",
      "editorLineNumber.foreground": "#7ba690",
      "editorLineNumber.activeForeground": "#047857",
      "editorCursor.foreground": "#41b883",
      "editor.selectionBackground": "#bbf7d0",
      "editor.inactiveSelectionBackground": "#ecfdf5",
      "editor.lineHighlightBackground": "#ecfdf5",
      "editorIndentGuide.background1": "#d1fae5",
      "editorIndentGuide.activeBackground1": "#6ee7b7",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#bbf7d0",
    },
  });

  monaco.editor.defineTheme("nord-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "4c566a", fontStyle: "italic" },
      { token: "keyword", foreground: "81a1c1", fontStyle: "bold" },
      { token: "string", foreground: "a3be8c" },
      { token: "number", foreground: "b48ead" },
      { token: "type", foreground: "8fbcbb" },
      { token: "function", foreground: "88c0d0" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#d8dee9",
      "editorLineNumber.foreground": "#4c566a",
      "editorLineNumber.activeForeground": "#d8dee9",
      "editorCursor.foreground": "#88c0d0",
      "editor.selectionBackground": "#434c5e",
      "editor.lineHighlightBackground": "#3b4252",
      "editorWidget.background": "#3b4252",
      "editorWidget.border": "#434c5e",
    },
  });

  monaco.editor.defineTheme("monokai", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "keyword", foreground: "f92672", fontStyle: "bold" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "type", foreground: "66d9ef" },
      { token: "function", foreground: "a6e22e" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#75715e",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorCursor.foreground": "#f8f8f2",
      "editor.selectionBackground": "#49483e",
      "editor.lineHighlightBackground": "#3e3d32",
      "editorWidget.background": "#1e1f1c",
      "editorWidget.border": "#75715e",
    },
  });

  monaco.editor.defineTheme("tokyo-night", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "565f89", fontStyle: "italic" },
      { token: "keyword", foreground: "bb9af7", fontStyle: "bold" },
      { token: "string", foreground: "9ece6a" },
      { token: "number", foreground: "ff9e64" },
      { token: "type", foreground: "2ac3de" },
      { token: "function", foreground: "7aa2f7" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#a9b1d6",
      "editorLineNumber.foreground": "#3b4261",
      "editorLineNumber.activeForeground": "#737aa2",
      "editorCursor.foreground": "#c0caf5",
      "editor.selectionBackground": "#283457",
      "editor.lineHighlightBackground": "#1f2335",
      "editorWidget.background": "#1f2335",
      "editorWidget.border": "#3b4261",
    },
  });

  monaco.editor.defineTheme("one-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c6370", fontStyle: "italic" },
      { token: "keyword", foreground: "c678dd", fontStyle: "bold" },
      { token: "string", foreground: "98c379" },
      { token: "number", foreground: "d19a66" },
      { token: "type", foreground: "56b6c2" },
      { token: "function", foreground: "61afef" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#abb2bf",
      "editorLineNumber.foreground": "#4b5263",
      "editorLineNumber.activeForeground": "#abb2bf",
      "editorCursor.foreground": "#528bff",
      "editor.selectionBackground": "#3e4451",
      "editor.lineHighlightBackground": "#2c313a",
      "editorWidget.background": "#21252b",
      "editorWidget.border": "#181a1f",
    },
  });

  monaco.editor.defineTheme("solarized-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "586e75", fontStyle: "italic" },
      { token: "keyword", foreground: "859900", fontStyle: "bold" },
      { token: "string", foreground: "2aa198" },
      { token: "number", foreground: "d33682" },
      { token: "type", foreground: "268bd2" },
      { token: "function", foreground: "b58900" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#839496",
      "editorLineNumber.foreground": "#586e75",
      "editorLineNumber.activeForeground": "#839496",
      "editorCursor.foreground": "#839496",
      "editor.selectionBackground": "#073642",
      "editor.lineHighlightBackground": "#073642",
      "editorWidget.background": "#073642",
      "editorWidget.border": "#586e75",
    },
  });


  monaco.editor.defineTheme("catppuccin", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6c7086", fontStyle: "italic" },
      { token: "keyword", foreground: "cba6f7" },
      { token: "string", foreground: "a6e3a1" },
      { token: "number", foreground: "fab387" },
      { token: "delimiter", foreground: "89dceb" },
      { token: "variable", foreground: "cdd6f4" },
      { token: "function", foreground: "89b4fa" },
      { token: "type", foreground: "f9e2af" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#cdd6f4",
      "editorLineNumber.foreground": "#585b70",
      "editorLineNumber.activeForeground": "#cba6f7",
      "editorCursor.foreground": "#f5e0dc",
      "editor.selectionBackground": "#585b7040",
      "editor.inactiveSelectionBackground": "#31324440",
      "editor.lineHighlightBackground": "#313244",
      "editorIndentGuide.background1": "#313244",
      "editorIndentGuide.activeBackground1": "#585b70",
      "editorWidget.background": "#181825",
      "editorWidget.border": "#313244",
    },
  });

  monaco.editor.defineTheme("catppuccin-latte", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9ca0b0", fontStyle: "italic" },
      { token: "keyword", foreground: "8839ef" },
      { token: "string", foreground: "40a02b" },
      { token: "number", foreground: "fe640b" },
      { token: "delimiter", foreground: "04a5e5" },
      { token: "variable", foreground: "4c4f69" },
      { token: "function", foreground: "1e66f5" },
      { token: "type", foreground: "df8e1d" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#4c4f69",
      "editorLineNumber.foreground": "#acb0be",
      "editorLineNumber.activeForeground": "#8839ef",
      "editorCursor.foreground": "#ea76cb",
      "editor.selectionBackground": "#acb0be40",
      "editor.inactiveSelectionBackground": "#ccd0da40",
      "editor.lineHighlightBackground": "#ccd0da",
      "editorIndentGuide.background1": "#ccd0da",
      "editorIndentGuide.activeBackground1": "#acb0be",
      "editorWidget.background": "#e6e9ef",
      "editorWidget.border": "#ccd0da",
    },
  });

  monaco.editor.defineTheme("synthwave", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "848bbd", fontStyle: "italic" },
      { token: "keyword", foreground: "f92aad", fontStyle: "bold" },
      { token: "string", foreground: "ff8b39" },
      { token: "number", foreground: "fede5d" },
      { token: "delimiter", foreground: "36f9f6" },
      { token: "variable", foreground: "f8f8f2" },
      { token: "function", foreground: "36f9f6" },
      { token: "type", foreground: "fe4450" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#4e4b5d",
      "editorLineNumber.activeForeground": "#ff7edb",
      "editorCursor.foreground": "#f92aad",
      "editor.selectionBackground": "#ffffff20",
      "editor.inactiveSelectionBackground": "#ffffff10",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorIndentGuide.background1": "#3f3c4c",
      "editorIndentGuide.activeBackground1": "#ff7edb",
      "editorWidget.background": "#1e1c29",
      "editorWidget.border": "#3f3c4c",
    },
  });

  monaco.editor.defineTheme("openmat-dark", {

    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6582a8" },
      { token: "keyword", foreground: "7dc4ff", fontStyle: "bold" },
      { token: "type.identifier", foreground: "7dc4ff" },
      { token: "identifier", foreground: "d4ecff" },
      { token: "predefined", foreground: "4de0cf" },
      { token: "function.identifier", foreground: "9be7ff" },
      { token: "number", foreground: "ffcb6b" },
      { token: "string", foreground: "9df7c5" },
      { token: "operator", foreground: "8fb7e6" },
      { token: "delimiter", foreground: "8fb7e6" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#cfe7ff",
      "editorLineNumber.foreground": "#4f6b91",
      "editorLineNumber.activeForeground": "#8dbdff",
      "editor.selectionBackground": "#1a3d67",
      "editor.lineHighlightBackground": "#0c1c31",
      "editorCursor.foreground": "#8ed8ff",
      "editorIndentGuide.background1": "#132946",
      "editorIndentGuide.activeBackground1": "#244a78",
      "editorWidget.background": "#0c1628",
      "editorWidget.border": "#29415f",
    },
  });

  monaco.editor.defineTheme("openmat-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7d90a8" },
      { token: "keyword", foreground: "1769d1", fontStyle: "bold" },
      { token: "type.identifier", foreground: "1769d1" },
      { token: "identifier", foreground: "16314f" },
      { token: "predefined", foreground: "0f8d85" },
      { token: "function.identifier", foreground: "0f6fbc" },
      { token: "number", foreground: "b36d05" },
      { token: "string", foreground: "0f8d85" },
      { token: "operator", foreground: "607188" },
      { token: "delimiter", foreground: "607188" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#16314f",
      "editorLineNumber.foreground": "#8aa0bc",
      "editorLineNumber.activeForeground": "#1769d1",
      "editor.selectionBackground": "#cfe5ff",
      "editor.lineHighlightBackground": "#e6f2ff",
      "editorCursor.foreground": "#1769d1",
      "editorIndentGuide.background1": "#d8e7fa",
      "editorIndentGuide.activeBackground1": "#a8c7ef",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#c9d9ee",
    },
  });

  monaco.editor.defineTheme("paper-textbook", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7086a0" },
      { token: "keyword", foreground: "1769d1", fontStyle: "bold" },
      { token: "string", foreground: "0f8d85" },
      { token: "number", foreground: "b36d05" },
      { token: "delimiter", foreground: "607188" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#2b2b29",
      "editorLineNumber.foreground": "#8c959f",
      "editorLineNumber.activeForeground": "#2b2b29",
      "editorCursor.foreground": "#1769d1",
      "editor.selectionBackground": "#00000015",
      "editor.inactiveSelectionBackground": "#0000000a",
      "editor.lineHighlightBackground": "#00000008",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#d0d7de",
    },
  });

  monaco.editor.defineTheme("sepia-textbook", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e86a6" },
      { token: "keyword", foreground: "74c0fc", fontStyle: "bold" },
      { token: "string", foreground: "8ce99a" },
      { token: "number", foreground: "ffd166" },
      { token: "delimiter", foreground: "9fb5d1" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#e6e6df",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editorCursor.foreground": "#74c0fc",
      "editor.selectionBackground": "#ffffff20",
      "editor.inactiveSelectionBackground": "#ffffff10",
      "editor.lineHighlightBackground": "#ffffff0a",
      "editorWidget.background": "#161b22",
      "editorWidget.border": "#30363d",
    },
  });

  monaco.languages.register({ id: "openmat" });
  monaco.languages.setLanguageConfiguration("openmat", {
    comments: {
      lineComment: "%",
      blockComment: ["%{", "%}"],
    },
    brackets: [
      ["[", "]"],
      ["(", ")"],
      ["{", "}"],
    ],
    autoClosingPairs: [
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "{", close: "}" },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
    ],
  });

  monaco.languages.setMonarchTokensProvider("openmat", {
    keywords: OPENMAT_KEYWORDS,
    builtins: OPENMAT_BUILTINS,
    constants: OPENMAT_CONSTANTS,
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [/[a-zA-Z_][\w]*/, {
          cases: {
            "@keywords": "keyword",
            "@builtins": "predefined",
            "@constants": "type.identifier",
            "@default": "identifier",
          },
        }],
        [/@[a-zA-Z_]\w*/, "predefined"],
        [/\d*\.\d+([eE][\-+]?\d+)?/, "number"],
        [/\d+([eE][\-+]?\d+)?/, "number"],
        [/'([^'\\]|\\.)*'?/, "string"],
        [/[\[\]\(\)\{\};,]/, "delimiter"],
        [/[+\-*\/\\^=<>~:&|\.]+/, "operator"],
      ],
    },
  });

  // Attempt this early (see applyPythonIndentRules below for why it's also
  // re-applied from each editor's onMount).
  applyPythonIndentRules(monaco);

  // Monaco's own TypeScript defaults never set `jsx` at all (confirmed
  // live: getCompilerOptions() returns only { allowNonTsExtensions, target }
  // before this runs). That was invisible as long as every JS/TS file in
  // HTML Lab was an anonymous, path-less Monaco model — but the moment a
  // file gets a real `.tsx` path (see CodePanel.tsx's per-file model fix),
  // TypeScript correctly starts enforcing the flag it was always missing:
  // "Cannot use JSX unless the '--jsx' flag is provided." `JsxEmit.React`
  // matches this project's actual Babel transform (jsxTranspile.ts uses
  // the React preset's classic runtime, not the newer automatic runtime).
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    jsx: monaco.languages.typescript.JsxEmit.React,
  });

  // HTML Lab loads React/ReactDOM as global UMD scripts (see
  // cdnLibraries.ts's reactCdnTags) — there's no `import React from 'react'`
  // anywhere for Monaco to resolve. The real @types/react package (already
  // a devDependency) is written for real `import` usage and pulls in a
  // ~22,000-line `csstype` dependency; loading all of that into the
  // in-browser TS worker is a real perf risk for a live-typing editor. This
  // is a small, hand-written stand-in instead: real generics for the hooks
  // this app's lessons actually use (confirmed live: a plain `React: any`
  // stub breaks `React.useState<T>(...)` — "Untyped function calls may not
  // accept type arguments" — since calling an `any`-typed function can't
  // take explicit generics), everything else left as loosely-typed `any`.
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    type SetStateAction<S> = S | ((prevState: S) => S);
    type Dispatch<A> = (value: A) => void;
    type EffectCallback = () => void | (() => void);
    type DependencyList = readonly unknown[];

    declare namespace React {
      function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
      function useEffect(effect: EffectCallback, deps?: DependencyList): void;
      function useMemo<T>(factory: () => T, deps: DependencyList): T;
      function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;
      function useRef<T>(initialValue: T): { current: T };
      function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, Dispatch<A>];
      interface Context<T> {
        Provider: (props: { value: T; children?: any }) => any;
        Consumer: (props: { children: (value: T) => any }) => any;
      }
      function createContext<T>(defaultValue: T): Context<T>;
      function useContext<T>(context: Context<T>): T;
      function memo<T>(component: T): T;
      function createElement(...args: any[]): any;
      const Fragment: any;
      class Component<P = {}, S = {}> {
        props: P;
        state: S;
        constructor(props: P);
        setState(state: Partial<S> | ((prevState: S, props: P) => Partial<S>)): void;
        render(): any;
      }
    }

    declare namespace ReactDOM {
      interface Root {
        render(children: any): void;
        unmount(): void;
      }
      function createRoot(container: Element | DocumentFragment, options?: any): Root;
    }

    // Real @types/react makes "key" (and "ref") valid on *any* JSX element
    // regardless of the component's own declared props, via this exact
    // global interface. Without it (confirmed live), passing a totally
    // idiomatic <Component key={...} /> fails: "Property 'key' does not
    // exist on type '...Props'." — a real, standard React pattern (lesson
    // 22 uses it to force a component to remount) flagged as an error.
    declare namespace JSX {
      interface IntrinsicAttributes {
        key?: string | number | null;
      }
      // Real @types/react uses this exact interface to tell TypeScript
      // that nested JSX content (<Foo>content</Foo>) should satisfy
      // whichever prop is named "children" — without it (confirmed live),
      // wrapping a component with a required "children" prop in JSX
      // (lesson 27's <CalculatorErrorBoundary>...</CalculatorErrorBoundary>)
      // fails: "Property 'children' is missing," because TypeScript has
      // no rule connecting nested JSX to any prop at all.
      interface ElementChildrenAttribute {
        children: {};
      }
    }
    `,
    "file:///react-globals.d.ts",
  );

  // Vue Studio: without these stubs, src/main.ts (loaded as 'typescript') shows
  // red squiggles on `import { createApp } from 'vue'` and `import App from './App.vue'`
  // because Monaco's TS worker can't resolve those modules in-browser.
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare module 'vue' {
      export interface Ref<T = any> { value: T }
      export interface ComputedRef<T = any> extends Ref<T> { readonly value: T }
      export function ref<T>(value: T): Ref<T>
      export function ref<T = any>(): Ref<T | undefined>
      export function reactive<T extends object>(target: T): T
      export function computed<T>(getter: () => T): ComputedRef<T>
      export function watch(source: any, cb: any, opts?: any): () => void
      export function watchEffect(effect: (onCleanup: (fn: () => void) => void) => void, opts?: any): () => void
      export function onMounted(fn: () => void): void
      export function onUnmounted(fn: () => void): void
      export function onUpdated(fn: () => void): void
      export function onBeforeMount(fn: () => void): void
      export function onBeforeUpdate(fn: () => void): void
      export function onBeforeUnmount(fn: () => void): void
      export function nextTick(fn?: () => void): Promise<void>
      export function defineProps<T extends Record<string, any>>(props?: any): T
      export function defineEmits<T extends Record<string, any[]>>(emits: (keyof T)[]): (event: keyof T, ...args: any[]) => void
      export function defineExpose(exposed: Record<string, any>): void
      export function withDefaults<T, D>(props: T, defaults: D): T & D
      export function provide(key: any, value: any): void
      export function inject<T>(key: any, defaultValue?: T): T | undefined
      export function toRef<T, K extends keyof T>(target: T, key: K): Ref<T[K]>
      export function toRefs<T extends object>(target: T): { [K in keyof T]: Ref<T[K]> }
      export function isRef(value: any): value is Ref
      export function unref<T>(value: T | Ref<T>): T
      export function shallowRef<T>(value: T): Ref<T>
      export function shallowReactive<T extends object>(target: T): T
      export function readonly<T>(target: T): Readonly<T>
      export function useSlots(): Record<string, any>
      export function useAttrs(): Record<string, any>
      export function createApp(component: any, props?: Record<string, any>): {
        mount(selector: string | Element): any
        unmount(): void
        use(plugin: any, ...opts: any[]): any
        component(name: string, comp?: any): any
        directive(name: string, dir?: any): any
        provide(key: any, value: any): any
      }
    }
    declare module '*.vue' {
      const component: any
      export default component
    }
    `,
    "file:///vue-globals.d.ts",
  );
}
