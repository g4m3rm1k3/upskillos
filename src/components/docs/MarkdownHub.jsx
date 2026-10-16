import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
  memo,
} from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import katex from "katex";
import "katex/dist/katex.min.css";
import Editor from "@monaco-editor/react";
import Prism from "../../utils/prism.js";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import { setupOpenCalcMonaco } from "../../utils/monacoThemes.js";
import MarkdownToolbar from "../markdown-toolbar/MarkdownToolbar.jsx";
import { LANG_LABEL } from "../markdown/codeDisplay.jsx";
import {
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  File,
  Folder,
  FilePenLine,
  FilePlus,
  Download,
  Edit2,
  Eye,
  Upload,
  RefreshCcw,
  RotateCcw,
  Code2,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Pause,
  Play,
  Volume2,
  Type,
  Settings,
  Check,
} from "lucide-react";
import { buildOptionalBackendUrl } from "../../utils/optionalBackend.js";
import { useSpeech, cleanForSpeech } from "../../utils/useSpeech.js";
import {
  RUNNABLE_LANGS,
  runJSInline,
  runTSInline,
  runPythonInline,
  runOpenMATInline,
  runShellInline,
  runSQLInline,
  runJSONInline,
  runLuaInline,
  runRubyInline,
  runCInline,
  runBrainfuckInline,
  runSchemeInline,
} from "../../utils/inlineRunner.js";
import { getThemeStyles, STUDIO_THEMES } from "../../utils/studioThemes.js";
import { useGlobalTheme, FONT_OPTIONS } from "../../context/ThemeContext.jsx";
import { useConceptWindow, useConceptNav } from "../desktop/ConceptWindowProvider.jsx";
import CodeSettingsModal, {
  getCodeFontFamily,
  getCodeFontSize,
} from "../ui/CodeSettingsModal.jsx";
import DocsCodeWorkspace from "./DocsCodeWorkspace.jsx";
import AdaPanel from "./AdaPanel.jsx";

// Exported for ConceptWindowProvider.jsx, which needs to resolve and render
// the same concept .md files this file's own inline embeds do — see the
// comment on findConceptDocPath below for why lookup is filename-based.
export const DOCS_MODULES = import.meta.glob("/src/docs/**/*.md", {
  query: "?raw",
  import: "default",
});

const PREFIX = "/src/docs/";
const LS_KEY = "markdownhub_personal";
const NOTES_LS_KEY = "mdhub_notes";

const LANG_EXT = {
  javascript: "js",
  js: "js",
  python: "py",
  py: "py",
  typescript: "ts",
  ts: "ts",
  css: "css",
  html: "html",
  markup: "html",
  bash: "sh",
  shell: "sh",
  sh: "sh",
  zsh: "sh",
  json: "json",
  text: "txt",
  sql: "sql",
  sqlite: "sql",
  lua: "lua",
  ruby: "rb",
  rb: "rb",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  brainfuck: "bf",
  bf: "bf",
};
const MONACO_LANG = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  sh: "shell",
  zsh: "shell",
  xml: "html",
  markup: "html",
  bash: "shell",
  rb: "ruby",
  sqlite: "sql",
  "c++": "cpp",
  bf: "brainfuck",
  brainfuck: "brainfuck",
  jsx: "javascript",
  tsx: "typescript",
  "c#": "csharp",
  ps1: "powershell",
  m: "matlab",
};
const WORKSPACE_LANG = {
  // ── Runnable in the workspace terminal ────────────────────────────────────
  python: "python",       py: "python",
  javascript: "javascript", js: "javascript",
  typescript: "typescript", ts: "typescript",
  html: "html",
  shell: "shell",         bash: "shell",      sh: "shell",    zsh: "shell",
  sql: "sql",             sqlite: "sql",
  json: "json",
  lua: "lua",
  ruby: "ruby",           rb: "ruby",
  c: "c",
  cpp: "cpp",             "c++": "cpp",
  brainfuck: "brainfuck", bf: "brainfuck",
  scheme: "scheme",       scm: "scheme",
  matlab: "openmat",      openmat: "openmat",
  // ── View/edit only (no browser runtime) ───────────────────────────────────
  css: "css",
  java: "java",
  kotlin: "kotlin",
  rust: "rust",           rs: "rust",
  go: "go",
  swift: "swift",
  csharp: "csharp",       "c#": "csharp",
  php: "php",
  r: "r",
  markdown: "markdown",   md: "markdown",
  yaml: "yaml",           yml: "yaml",
  xml: "xml",
  plaintext: "plaintext",
};

const TERM_REFS = {
  // Python dunder methods
  __init__: {
    desc: "Constructor — runs automatically when an instance is created.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__init__",
    src: "py",
  },
  __str__: {
    desc: "Returns the human-readable string representation of an object.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__str__",
    src: "py",
  },
  __repr__: {
    desc: "Returns the developer-facing unambiguous string representation.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__repr__",
    src: "py",
  },
  __len__: {
    desc: "Called by len() — return the length of the container.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__len__",
    src: "py",
  },
  __eq__: {
    desc: "Defines == comparison between two objects.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__eq__",
    src: "py",
  },
  __call__: {
    desc: "Makes an instance callable like a function: obj(args).",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__call__",
    src: "py",
  },
  __enter__: {
    desc: "Called on entering a with block — returns the context resource.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__enter__",
    src: "py",
  },
  __exit__: {
    desc: "Called on leaving a with block — handles cleanup and exceptions.",
    url: "https://docs.python.org/3/reference/datamodel.html#object.__exit__",
    src: "py",
  },
  __slots__: {
    desc: "Restricts instance attributes to a fixed set, reducing memory.",
    url: "https://docs.python.org/3/reference/datamodel.html#slots",
    src: "py",
  },
  // Python decorators / builtins
  "@property": {
    desc: "Turns a method into a read-only attribute with optional setter.",
    url: "https://docs.python.org/3/library/functions.html#property",
    src: "py",
  },
  "@classmethod": {
    desc: "Method bound to the class, not the instance — receives cls as first arg.",
    url: "https://docs.python.org/3/library/functions.html#classmethod",
    src: "py",
  },
  "@staticmethod": {
    desc: "Method with no implicit first argument — a plain function in a class.",
    url: "https://docs.python.org/3/library/functions.html#staticmethod",
    src: "py",
  },
  "@abstractmethod": {
    desc: "Marks a method as abstract — subclasses must implement it or cannot be instantiated.",
    url: "https://docs.python.org/3/library/abc.html#abc.abstractmethod",
    src: "py",
  },
  "@dataclass": {
    desc: "Auto-generates __init__, __repr__, __eq__ and more from field annotations.",
    url: "https://docs.python.org/3/library/dataclasses.html",
    src: "py",
  },
  "super()": {
    desc: "Returns a proxy to call methods from a parent class in the MRO chain.",
    url: "https://docs.python.org/3/library/functions.html#super",
    src: "py",
  },
  "isinstance()": {
    desc: "Returns True if the object is an instance of the class or tuple of classes.",
    url: "https://docs.python.org/3/library/functions.html#isinstance",
    src: "py",
  },
  "issubclass()": {
    desc: "Returns True if a class is a subclass of another.",
    url: "https://docs.python.org/3/library/functions.html#issubclass",
    src: "py",
  },
  ABC: {
    desc: "Abstract Base Class helper — inherit from this to create abstract classes.",
    url: "https://docs.python.org/3/library/abc.html#abc.ABC",
    src: "py",
  },
  // JS / Web MDN
  addEventListener: {
    desc: "Registers an event handler on an EventTarget (element, document, window).",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener",
    src: "mdn",
  },
  removeEventListener: {
    desc: "Removes a previously registered event listener from an EventTarget.",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener",
    src: "mdn",
  },
  querySelector: {
    desc: "Returns the first element in the document matching a CSS selector.",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector",
    src: "mdn",
  },
  querySelectorAll: {
    desc: "Returns a NodeList of all elements matching a CSS selector.",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll",
    src: "mdn",
  },
  fetch: {
    desc: "Makes a network request and returns a Promise resolving to a Response.",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/fetch",
    src: "mdn",
  },
  Promise: {
    desc: "Represents the eventual completion or failure of an async operation.",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
    src: "mdn",
  },
  localStorage: {
    desc: "Persists key-value data in the browser with no expiry.",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage",
    src: "mdn",
  },
  "Object.keys": {
    desc: "Returns an array of an object's own enumerable property names.",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys",
    src: "mdn",
  },
  "Object.values": {
    desc: "Returns an array of an object's own enumerable property values.",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values",
    src: "mdn",
  },
  "Object.entries": {
    desc: "Returns an array of [key, value] pairs for an object's own properties.",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries",
    src: "mdn",
  },
  "JSON.parse": {
    desc: "Parses a JSON string and constructs the JavaScript value it describes.",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse",
    src: "mdn",
  },
  "JSON.stringify": {
    desc: "Converts a JavaScript value to a JSON string.",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify",
    src: "mdn",
  },
};

function sortTree(nodes) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
  nodes.forEach((node) => {
    if (node.type === "dir") sortTree(node.children);
  });
  return nodes;
}

function buildTree(modulePaths) {
  const root = [];
  [...modulePaths].sort().forEach((modulePath) => {
    const rel = modulePath.slice(PREFIX.length);
    const parts = rel.split("/");
    let nodes = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      if (isFile) {
        nodes.push({ type: "file", name: part, path: modulePath });
      } else {
        let dir = nodes.find(
          (node) => node.type === "dir" && node.name === part,
        );
        if (!dir) {
          dir = { type: "dir", name: part, children: [], open: false };
          nodes.push(dir);
        }
        nodes = dir.children;
      }
    });
  });
  // Folders first, then files, alphanumeric within each group — matching how a
  // normal file explorer (and the real src/docs directory listing) would sort.
  return sortTree(root);
}

function displayName(value) {
  return String(value)
    .replace(/\.md$/i, "")
    .replace(/^\d+-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Finds the ordered list of file siblings (already numeric-sorted by
// sortTree) in whichever folder contains targetPath — used to find "the next
// lesson" for series like "Lesson 1", "Lesson 2a", "Lesson 2b", "Lesson 3".
function findSiblingFiles(nodes, targetPath) {
  const files = nodes.filter((node) => node.type === "file");
  if (files.some((file) => file.path === targetPath)) return files;
  for (const node of nodes) {
    if (node.type === "dir") {
      const found = findSiblingFiles(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function loadPersonal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePersonal(files) {
  localStorage.setItem(LS_KEY, JSON.stringify(files));
}

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(NOTES_LS_KEY, JSON.stringify(notes));
}

// Notes group by the doc's immediate parent folder ("series") so a lesson
// dropped anywhere under src/docs/ files itself sensibly without asking the
// user to categorize it by hand.
function seriesFromPath(path) {
  if (!path) return "General";
  const rel = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const parts = rel.split("/");
  parts.pop(); // filename
  return parts.length ? displayName(parts[parts.length - 1]) : "General";
}

function getMdCss(md, basicWebpage = false) {
  if (basicWebpage) {
    return `
.md-body { line-height: 1.75; font-size: 15px; color: ${md.text}; }
.md-body h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; border-bottom: 1px solid ${md.hr}; padding-bottom: 0.3em; }
.md-body h2 { font-size: 1.5em; font-weight: 700; margin: 1em 0 0.5em; border-bottom: 1px solid ${md.hr}; padding-bottom: 0.2em; }
.md-body h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.4em; }
.md-body h4 { font-size: 1em; font-weight: 600; margin: 1em 0 0.3em; }
.md-body h5 { font-size: 0.875em; font-weight: 600; margin: 1em 0 0.3em; }
.md-body h6 { font-size: 0.85em; font-weight: 600; margin: 1em 0 0.3em; color: ${md.quoteText}; }
.md-body p { margin: 0 0 1em; }
.md-body strong, .md-body b { font-weight: 700; }
.md-body em, .md-body i { font-style: italic; }
.md-body a { color: ${md.a}; text-decoration: underline; }
.md-body a:hover { text-decoration: none; }
.md-body code { background: ${md.codeBg}; border-radius: 3px; padding: 2px 5px; font-size: 0.875em; font-family: 'Consolas', 'Courier New', monospace; }
.md-body pre { background: ${md.preBg}; border: 1px solid ${md.preBorder}; border-radius: 4px; padding: 14px 18px; overflow-x: auto; margin: 0 0 1.2em; }
.md-body pre code { background: none; border: none; padding: 0; font-size: 0.875em; font-family: 'Consolas', 'Courier New', monospace; }
.md-body blockquote { border-left: 4px solid ${md.quoteBorder}; margin: 0 0 1em 0; padding: 6px 16px; color: ${md.quoteText}; }
.md-body ul { margin: 0 0 1em 1.5em; list-style: disc; }
.md-body ol { margin: 0 0 1em 1.5em; list-style: decimal; }
.md-body li { margin-bottom: 0.25em; }
.md-body ul ul { list-style: circle; margin-bottom: 0; }
.md-body ul ul ul { list-style: square; }
.md-body table { border-collapse: collapse; width: 100%; margin: 0 0 1.2em; font-size: 0.9em; }
.md-body th { background: ${md.thBg}; border: 1px solid ${md.tdBorder}; padding: 8px 12px; text-align: left; font-weight: 600; }
.md-body td { border: 1px solid ${md.tdBorder}; padding: 7px 12px; }
.md-body tr:nth-child(even) td { background: ${md.trEven}; }
.md-body hr { border: none; border-top: 1px solid ${md.hr}; margin: 1.5em 0; }
.md-body img { max-width: 100%; }
.md-code-monaco { overflow: hidden; }
`;
  }
  return `
.md-body { line-height: 1.75; font-size: 15px; color: ${md.text}; --card-glow: 0 4px 20px -5px color-mix(in srgb, ${md.strong} 30%, transparent), inset 0 0 0 1px color-mix(in srgb, ${md.strong} 15%, transparent); }
.md-body h1 { font-size: 2em; font-weight: 700; margin: 0 0 0.5em; color: ${md.h1}; border-bottom: 1px solid ${md.hr}; padding-bottom: 0.3em; }
.md-body h2 { font-size: 1.4em; font-weight: 700; margin: 1.8em 0 0.5em; color: ${md.h2}; border-bottom: 1px solid ${md.hr}; padding-bottom: 0.2em; }
.md-body h3 { font-size: 1.15em; font-weight: 600; margin: 1.4em 0 0.4em; color: ${md.h3}; }
.md-body h4 { font-size: 1em; font-weight: 600; margin: 1.2em 0 0.3em; color: ${md.h4}; }
.md-body p, .md-body .md-p-block { margin: 0 0 1em; }
.md-body strong, .md-body b { color: ${md.strong}; font-weight: 700; }
.md-body em, .md-body i { color: ${md.em}; }
.md-body li::marker { color: ${md.listMarker}; font-weight: 700; }
.md-body a { color: ${md.a}; text-decoration: underline; }
.md-body mark { background: color-mix(in srgb, ${md.strong} 45%, transparent); color: inherit; border-radius: 3px; padding: 0 2px; }
.md-body code { background: ${md.codeBg}; border: 1px solid ${md.tdBorder}; border-radius: 4px; padding: 2px 6px; font-size: 0.85em; font-family: 'JetBrains Mono', monospace; color: ${md.codeText}; }
.md-body pre { background: ${md.preBg}; border: 1px solid ${md.preBorder}; border-radius: 8px; padding: 16px 20px; overflow-x: auto; margin: 0 0 1.2em; }
.md-body pre code { background: none; border: none; padding: 0; color: ${md.text}; }
.md-body blockquote { border-left: 3px solid ${md.quoteBorder}; margin: 0 0 1em; padding: 8px 16px; background: ${md.quoteBg}; border-radius: 0 4px 4px 0; color: ${md.quoteText}; }
.md-body ul, .md-body ol { margin: 0 0 1em 1.4em; list-style-type: disc; }
.md-body li { margin-bottom: 0.3em; }
.md-body ul:has(> li > strong + br) { margin-left: 0; }
.md-body li:has(> strong + br) { list-style: none; border: 1px solid ${md.tdBorder}; border-radius: 10px; padding: 14px 18px; margin: 0 0 1em; box-shadow: var(--card-glow); }
.md-body li > strong:has(+ br) { display: inline-block; font-size: 1.08em; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, ${md.strong} 16%, transparent); border: 1px solid color-mix(in srgb, ${md.strong} 35%, transparent); margin-bottom: 4px; }
.md-body p:has(> strong:only-child):has(> strong code):has(+ ul) { border: 1px solid ${md.tdBorder}; border-bottom: none; border-radius: 10px 10px 0 0; background: color-mix(in srgb, ${md.strong} 8%, ${md.codeBg}); padding: 10px 16px; margin: 1.6em 0 0; box-shadow: var(--card-glow); }
.md-body p:has(> strong:only-child):has(> strong code):has(+ ul) > strong > code { font-size: 1.05em; background: none; border: none; padding: 0; color: ${md.strong}; }
.md-body p:has(> strong:only-child):has(> strong code) + ul { border: 1px solid ${md.tdBorder}; border-top: none; border-radius: 0 0 10px 10px; margin: 0 0 1.4em; padding: 10px 18px 12px 36px; box-shadow: var(--card-glow); }
/* Same "object/method used" convention, written as one bullet with its
   What-it-is/Implementation/Its-use breakdown nested inside it instead of
   as a sibling list after a standalone paragraph — actually the more
   common of the two shapes across the corpus (1.2k+ vs ~200), so it gets
   the same card, just built from one <li> instead of a p+ul pair. */
.md-body ul:has(> li > strong code):has(> li > ul > li > em:first-child) { margin-left: 0; }
.md-body li:has(> strong code):has(> ul > li > em:first-child) { list-style: none; border: 1px solid ${md.tdBorder}; border-radius: 10px; padding: 14px 18px; margin: 0 0 1em; box-shadow: var(--card-glow); }
.md-body li:has(> strong code):has(> ul > li > em:first-child) > strong > code { font-size: 1.05em; background: none; border: none; padding: 0; color: ${md.strong}; }
.md-body li:has(> strong code):has(> ul > li > em:first-child) > ul { margin: 10px 0 0 1.2em; }
.md-body table { border-collapse: collapse; width: 100%; margin: 0 0 1.2em; font-size: 0.9em; }
.md-body th { background: ${md.thBg}; border: 1px solid ${md.tdBorder}; padding: 8px 12px; text-align: left; color: ${md.quoteText}; font-weight: 600; }
.md-body td { border: 1px solid ${md.tdBorder}; padding: 7px 12px; }
.md-body tr:nth-child(even) td { background: ${md.trEven}; }
.md-body hr { border: none; border-top: 1px solid ${md.hr}; margin: 1.5em 0; }
.md-body img { max-width: 100%; border-radius: 8px; border: 1px solid ${md.imgBorder}; }
.md-body .katex-display { overflow-x: auto; overflow-y: hidden; }
.md-body .katex-display pre { display: inline-block; text-align: left; background: none; border: none; margin: 0; padding: 0; font-size: 0.9em; color: ${md.text}; }
.md-code-block { margin: 0 0 1.2em; border-radius: 8px; border: 1px solid ${md.codeHeaderBorder}; box-shadow: 0 4px 20px -5px rgba(99,102,241,0.3), inset 0 0 0 1px rgba(99,102,241,0.15); transition: all 0.3s ease; }
.md-code-block:hover { box-shadow: 0 8px 30px -5px rgba(99,102,241,0.4), inset 0 0 0 1px rgba(99,102,241,0.25), 0 0 15px rgba(99,102,241,0.2); }
.md-code-header { border-top-left-radius: 8px; border-top-right-radius: 8px; background: linear-gradient(135deg, ${md.codeHeaderBg} 0%, rgba(99,102,241,0.15) 50%, rgba(14,165,233,0.1) 100%); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(99,102,241,0.3); border-top: 1px solid rgba(99,102,241,0.4); position: relative; }
.md-code-lang { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; background: linear-gradient(to right, #818cf8, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'JetBrains Mono', monospace; text-shadow: 0 0 10px rgba(129,140,248,0.2); }
.md-code-actions { display: flex; gap: 8px; align-items: center; }
.md-code-btn { font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 6px; border: 1px solid ${md.codeBtnBorder}; background: ${md.codeBtnBg}; color: ${md.codeBtnText}; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; gap: 6px; font-family: system-ui; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.md-code-btn:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); color: #818cf8; box-shadow: 0 2px 10px rgba(99,102,241,0.2); transform: translateY(-1px); }
.md-code-btn:active { transform: translateY(0); }
.md-code-btn.run { background: linear-gradient(135deg, #6366f1, #0ea5e9); color: white; border: none; box-shadow: 0 2px 10px rgba(99,102,241,0.4); }
.md-code-btn.run:hover { opacity: 0.9; box-shadow: 0 4px 15px rgba(99,102,241,0.6); color: white; }
.md-code-monaco { overflow: hidden; }
.md-code-monaco .monaco-editor .overflow-guard { border-radius: 0; }
.md-resize-handle { height: 6px; cursor: row-resize; background: ${md.resizeHandleBg}; display: flex; align-items: center; justify-content: center; transition: background 0.15s; border-radius: 0 0 8px 8px; }
.md-resize-handle:hover, .md-resize-handle.dragging { background: ${md.resizeHandleHover}; }
.md-resize-handle::after { content: ''; width: 28px; height: 2px; border-radius: 2px; background: ${md.quoteText}; }
.md-cell-output { border-top: 1px solid ${md.preBorder}; background: ${md.preBg}; border-radius: 0 0 8px 8px; }
.md-cell-output-header { display: flex; align-items: center; justify-content: space-between; padding: 3px 14px; }
.md-cell-output-header span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${md.quoteText}; }
.md-cell-output-clear { background: none; border: none; cursor: pointer; font-size: 10px; color: ${md.quoteText}; padding: 0 2px; line-height: 1; }
.md-cell-output-clear:hover { color: #ef4444; }
.md-cell-output-pre { margin: 0; padding: 6px 14px 10px; font-size: 12px; font-family: 'JetBrains Mono', Consolas, monospace; white-space: pre-wrap; word-break: break-word; }
.md-cell-line { line-height: 1.55; }
.md-cell-line--output { color: ${md.text}; }
.md-cell-line--error { color: #dc2626; }
.md-cell-line--dim { color: ${md.quoteText}; font-style: italic; }
.md-cell-plot { display: block; max-width: 100%; height: auto; border-radius: 4px; margin: 6px 0; background: #fff; }
.md-splitter { width: 5px; cursor: col-resize; flex-shrink: 0; background: transparent; transition: background 0.15s; position: relative; z-index: 10; }
.md-splitter:hover, .md-splitter.dragging { background: ${md.resizeHandleHover}; }
.md-ref-badge { font-size: 8px; font-weight: 700; vertical-align: super; margin-left: 2px; padding: 1px 4px; border-radius: 3px; text-decoration: none; line-height: 1; white-space: nowrap; }
.md-ref-badge.mdn { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
.md-ref-badge.py { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.md-ref-badge:hover { opacity: 0.75; }
`;
}

function useIsDark() {
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const DocsCtx = createContext({
  isDark: false,
  onRun: null,
  codeAlongOpen: false,
  activeFile: null,
  onDocLink: null,
  onNavigate: null,
  scrollToHeading: null,
});

// SectionedMarkdown splits one document into many independent <ReactMarkdown>
// calls (one per page title, one per prose/code chunk within a page), each
// parsing a standalone slice of the original text — so each call's own
// node.position.start.line always starts back at 1 for THAT slice, not the
// real line in the source document. This context carries "what line of the
// full document does this slice's line 1 correspond to" so headingId (below)
// can recover a true, globally-unique line number. A plain number set once
// per render (never mutated), so — unlike the counter this replaced — it's
// unaffected by React StrictMode's double-invoke. Defaults to 0 (i.e. "this
// slice already starts at the real line 1") for every other call site in
// this file that renders a whole, unsliced document directly.
const ChunkLineOffsetCtx = createContext(0);

// ── "Open With" helpers ───────────────────────────────────────────────────────

function openInOpenMat(code, fileName) {
  try {
    const docs = (() => {
      try {
        return JSON.parse(localStorage.getItem("openmat-documents") || "[]");
      } catch {
        return [];
      }
    })();
    const id = `doc-studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const name = fileName || "studio-import.m";
    const updated = Array.isArray(docs)
      ? [...docs, { id, name, code }]
      : [{ id, name, code }];
    localStorage.setItem("openmat-documents", JSON.stringify(updated));
    localStorage.setItem("openmat-active-document-id", JSON.stringify(id));
    window.location.href = "/#/openmat";
  } catch (e) {
    console.error("Failed to hand off to OpenMAT:", e);
  }
}

const CODELENS_LANG_MAP = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  python: "py",
  py: "py",
  go: "go",
};

function openInCodeLens(code, language, navigateFn) {
  try {
    const clLang = CODELENS_LANG_MAP[language] ?? "js";
    const payload = { code, lang: clLang, ts: Date.now() };
    localStorage.setItem("codelens-handoff", JSON.stringify(payload));
    navigateFn("/codelens");
  } catch (e) {
    console.error("Failed to hand off to CodeLens:", e);
  }
}

function MdCodeBlock({ language, code }) {
  const { isDarkGlobal, themeStyles, codeTypography } = useGlobalTheme();
  const isDark = isDarkGlobal;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const { monacoTheme, onRun, codeAlongOpen, onNavigate } = useContext(DocsCtx);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editorHeight, setEditorHeight] = useState(() =>
    Math.min(Math.max(code.split("\n").length * 19 + 24, 72), 540),
  );
  const [output, setOutput] = useState(null); // null = never run
  const [running, setRunning] = useState(false);
  const editorRef = useRef(null); // holds live Monaco instance so we run edited code
  const outputRef = useRef(null); // scroll target when output appears
  const didScrollRef = useRef(false); // only scroll once per output session

  // Scroll into view once when output first appears; reset when output is cleared
  useEffect(() => {
    if (output !== null && !didScrollRef.current) {
      didScrollRef.current = true;
      outputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
    if (output === null) didScrollRef.current = false;
  }, [output !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const monacoLang = MONACO_LANG[language] || language;
  const displayLang = LANG_LABEL[language] || monacoLang;
  const runnable = RUNNABLE_LANGS.has(language);

  const onResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = editorHeight;
      setDragging(true);
      const onMove = (ev) =>
        setEditorHeight(Math.max(80, startH + ev.clientY - startY));
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [editorHeight],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(editorRef.current?.getValue() ?? code)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const ext = LANG_EXT[language] || "txt";
    const blob = new Blob([editorRef.current?.getValue() ?? code], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, language]);

  const handleRunInline = useCallback(async () => {
    const src = editorRef.current?.getValue() ?? code;
    setRunning(true);
    setOutput(null);
    try {
      const lang = language;

      const streamLines = [];
      const onLine = (item) => {
        streamLines.push(item);
        setOutput([...streamLines]);
      };

      if (lang === "python" || lang === "py") {
        const { error } = await runPythonInline(src, onLine);
        if (error) streamLines.push({ text: error, type: "error" });
        setOutput(
          streamLines.length
            ? [...streamLines]
            : [{ text: "(no output)", type: "dim" }],
        );
      } else if (lang === "typescript" || lang === "ts") {
        const { output: out, error } = await runTSInline(src);
        setOutput(
          error
            ? [{ text: error, type: "error" }]
            : [{ text: out, type: "output" }],
        );
      } else if (lang === "matlab" || lang === "openmat") {
        const { output: out, error } = runOpenMATInline(src);
        setOutput(
          error
            ? [{ text: error, type: "error" }]
            : [{ text: out, type: "output" }],
        );
      } else if (
        lang === "shell" ||
        lang === "bash" ||
        lang === "sh" ||
        lang === "zsh"
      ) {
        const { output: out, error } = runShellInline(src);
        setOutput(
          error
            ? [
                { text: out || "", type: "output" },
                { text: error, type: "error" },
              ].filter((l) => l.text)
            : [{ text: out, type: "output" }],
        );
      } else if (lang === "json") {
        const { output: out, error } = runJSONInline(src);
        setOutput(
          error
            ? [{ text: error, type: "error" }]
            : [{ text: out, type: "output" }],
        );
      } else if (lang === "sql" || lang === "sqlite") {
        await runSQLInline(src, onLine);
        if (!streamLines.some((l) => l.type !== "dim"))
          streamLines.push({ text: "(no output)", type: "dim" });
        setOutput([...streamLines]);
      } else if (lang === "lua") {
        await runLuaInline(src, onLine);
        if (!streamLines.some((l) => l.type === "output"))
          streamLines.push({ text: "(no output)", type: "dim" });
        setOutput([...streamLines]);
      } else if (lang === "ruby" || lang === "rb") {
        await runRubyInline(src, onLine);
        setOutput([...streamLines]);
      } else if (lang === "c" || lang === "cpp" || lang === "c++") {
        await runCInline(src, onLine);
        setOutput([...streamLines]);
      } else if (lang === "brainfuck" || lang === "bf") {
        const { output: out, error } = runBrainfuckInline(src);
        setOutput(
          error
            ? [{ text: error, type: "error" }]
            : [{ text: out, type: "output" }],
        );
      } else if (lang === "scheme" || lang === "scm") {
        runSchemeInline(src, onLine);
        setOutput(
          streamLines.length
            ? [...streamLines]
            : [{ text: "(no output)", type: "dim" }],
        );
      } else {
        // javascript / js (fallback)
        const { output: out, error } = await runJSInline(src);
        setOutput(
          error
            ? [
                { text: out || "", type: "output" },
                { text: error, type: "error" },
              ].filter((l) => l.text)
            : [{ text: out, type: "output" }],
        );
      }
    } catch (e) {
      setOutput([{ text: e.message, type: "error" }]);
    } finally {
      setRunning(false);
    }
  }, [code, language]);

  const handleSendToWorkspace = useCallback(() => {
    if (onRun) onRun(editorRef.current?.getValue() ?? code, monacoLang);
  }, [code, monacoLang, onRun]);

  const isOpenMat = language === "matlab" || language === "openmat";
  const isCodeLens = CODELENS_LANG_MAP[language] != null && !isOpenMat;

  const handleOpenInOpenMat = useCallback(() => {
    openInOpenMat(editorRef.current?.getValue() ?? code, `snippet.m`);
  }, [code]);

  const handleOpenInCodeLens = useCallback(() => {
    if (!onNavigate) return;
    openInCodeLens(editorRef.current?.getValue() ?? code, language, onNavigate);
  }, [code, language, onNavigate]);

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{displayLang}</span>
        <div className="md-code-actions">
          {runnable && (
            <button
              onClick={handleRunInline}
              disabled={running}
              className="md-code-btn run"
              title="Run this code here"
            >
              {running ? "⏳" : "▶"} Run
            </button>
          )}
          {isOpenMat && (
            <button
              onClick={handleOpenInOpenMat}
              className="md-code-btn"
              title="Open in OpenMAT Studio"
              style={{
                color: "#c2410c",
                borderColor: "#fed7aa",
                background: "#fff7ed",
              }}
            >
              ↗ OpenMAT
            </button>
          )}
          {isCodeLens && onNavigate && (
            <button
              onClick={handleOpenInCodeLens}
              className="md-code-btn"
              title="Open in CodeLens visualizer"
              style={{
                color: "#4338ca",
                borderColor: "#c7d2fe",
                background: "#eef2ff",
              }}
            >
              ↗ CodeLens
            </button>
          )}
          {onRun && (
            <button
              onClick={handleSendToWorkspace}
              className="md-code-btn"
              title="Send to Code Along workspace"
            >
              {codeAlongOpen ? "→ Workspace" : "Code Along →"}
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="md-code-btn"
              title="Code Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <CodeSettingsModal
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
            />
          </div>
          <button
            onClick={handleDownload}
            className="md-code-btn"
            title="Download snippet"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className={`md-code-btn${copied ? " copied" : ""}`}
            title="Copy to clipboard"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="md-code-monaco">
        <Editor
          height={editorHeight}
          language={monacoLang}
          defaultValue={code}
          theme={monacoTheme || (isDark ? "open-calc-dark" : "open-calc-light")}
          beforeMount={setupOpenCalcMonaco}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            readOnly: !runnable,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            lineDecorationsWidth: 4,
            lineNumbersMinChars: 3,
            folding: false,
            wordWrap: "off",
            fontSize: parseInt(getCodeFontSize(codeTypography.fontSize)),
            fontFamily: getCodeFontFamily(codeTypography.font),
            fontLigatures: codeTypography.ligatures,
            renderLineHighlight: runnable ? "line" : "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              alwaysConsumeMouseWheel: false,
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            padding: { top: 10, bottom: 10 },
            contextmenu: false,
            automaticLayout: true,
            glyphMargin: false,
          }}
        />
      </div>
      <div
        className={`md-resize-handle${dragging ? " dragging" : ""}`}
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />
      {output !== null && (
        <div className="md-cell-output" ref={outputRef}>
          <div className="md-cell-output-header">
            <span>Output</span>
            <button
              onClick={() => setOutput(null)}
              className="md-cell-output-clear"
              title="Clear output"
            >
              ✕
            </button>
          </div>
          <pre className="md-cell-output-pre">
            {output.map((item, i) =>
              item.type === "image" ? (
                <img
                  key={i}
                  className="md-cell-plot"
                  src={`data:image/png;base64,${item.src}`}
                  alt="plot"
                />
              ) : (
                <div
                  key={i}
                  className={`md-cell-line md-cell-line--${item.type}`}
                >
                  {item.text}
                </div>
              ),
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// Simple read-only syntax-highlighted code block for Basic Webpage mode.
// Uses Monaco in read-only mode with no header, resize handle, or run buttons.
function BasicMdCodeBlock({ language, code }) {
  const { isDarkGlobal, themeStyles, codeTypography } = useGlobalTheme();
  const isDark = isDarkGlobal;
  const { monacoTheme } = useContext(DocsCtx);
  const [copied, setCopied] = useState(false);

  const monacoLang = MONACO_LANG[language] || language;
  const displayLang = LANG_LABEL[language] || monacoLang;
  const lineCount = code.split('\n').length;
  const editorHeight = Math.min(Math.max(lineCount * 19 + 24, 48), 600);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className={`rounded-lg overflow-hidden border mb-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      {/* minimal header: language label + copy */}
      <div className={`flex items-center justify-between px-3 py-1.5 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
        <span className="font-mono font-semibold uppercase tracking-wide text-[11px]">{displayLang || 'code'}</span>
        <button
          onClick={handleCopy}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${copied ? 'text-green-600' : isDark ? 'hover:text-slate-200' : 'hover:text-slate-800'}`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="md-code-monaco">
        <Editor
          height={editorHeight}
          language={monacoLang}
          defaultValue={code}
          theme={monacoTheme || (isDark ? 'open-calc-dark' : 'open-calc-light')}
          beforeMount={setupOpenCalcMonaco}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            lineDecorationsWidth: 4,
            lineNumbersMinChars: 3,
            folding: false,
            wordWrap: 'off',
            fontSize: parseInt(getCodeFontSize(codeTypography.fontSize)),
            fontFamily: getCodeFontFamily(codeTypography.font),
            fontLigatures: codeTypography.ligatures,
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'auto',
              alwaysConsumeMouseWheel: false,
              horizontalScrollbarSize: 4,
            },
            padding: { top: 8, bottom: 8 },
            contextmenu: false,
            automaticLayout: true,
            glyphMargin: false,
            cursorStyle: 'line',
            domReadOnly: true,
          }}
        />
      </div>
    </div>
  );
}

// Inline concept-embed panels (a `concepts/x.md` reference rendered as an
// expandable panel instead of a plain link/code span) are addressed by
// filename, not by a correctly-relative path. Concept catalogs are meant to
// be portable/shared across projects (see concepts/README.md), so lesson
// authors' `../concepts/x.md` references routinely have the wrong `../`
// depth — there's no single "correct" relative path to a shared catalog.
// Resolve by filename alone: search DOCS_MODULES for any file living in
// *some* `concepts/` folder with a matching basename. A brand-new top-level
// folder picks this up for free the moment its concepts/ catalog (its own,
// or a shared one elsewhere) contains the file — no code change here.
export function findConceptDocPath(filename) {
  if (!filename) return null;
  const suffix = `/concepts/${filename}`;
  return Object.keys(DOCS_MODULES).find((p) => p.endsWith(suffix)) || null;
}

function MdInlineCode({ children }) {
  const text = String(children);

  if (text.endsWith(".md")) {
    const filename = text.split("/").pop();
    const docPath = findConceptDocPath(filename);
    if (docPath) {
      const title = filename.replace(".md", "").replace(/[-_]/g, " ");
      return <ConceptEmbedTrigger docPath={docPath} title={title} />;
    }
  }

  const ref = TERM_REFS[text];
  return (
    <>
      <code>{text}</code>
      {ref && (
        <span
          className={`md-ref-badge ${ref.src}`}
          title={ref.desc}
          role="link"
          tabIndex={0}
          style={{ cursor: "pointer" }}
          onClick={() => window.open(ref.url, "_blank", "noopener,noreferrer")}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            window.open(ref.url, "_blank", "noopener,noreferrer")
          }
        >
          {ref.src}↗
        </span>
      )}
    </>
  );
}

function headingId(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Pulls a Header field's own body out as a standalone markdown fragment —
// e.g. everything under a lesson's Terms or Objects-and-methods label — so
// it can be rendered a second time in the Reference side panel, styled
// identically to its inline copy since it's re-parsed through the same
// MD_COMPONENTS/getMdCss pipeline. LESSON SCHEMA.md's own wording for these
// two fields has drifted across the life of this corpus, so a single fixed
// pattern misses most existing lessons; four label shapes are recognized
// (checked against the real corpus, 2026-08-19 — a plain regex census
// found only 37 files matching the current bulleted-list shape alone, vs.
// ~1,385 once all four were recognized):
//   "list"    — "- **Terms used in this lesson**" (current schema; body is
//               a nested list, indented 2sp under the bullet by CommonMark's
//               own list-continuation rule)
//   "flat"    — "**Terms introduced in this lesson:**" as its own bold
//               paragraph (colon inside or outside the closing **), body is
//               an ordinary top-level list right below it
//   "heading" — "## Terms used in this lesson" as a real heading
//   "plain"   — "Terms used in this lesson" with no markup at all
// Each style's body ends at a different boundary (see STYLE below), so the
// matched style — not just whether a label matched — has to drive where
// extraction stops. A style that produced no body (e.g. "**Terms
// introduced in this lesson:** none new — ...", content inline on the
// label's own line rather than a body underneath) returns null, same as
// finding no label at all — nothing to show is the honest result, not a
// guess at what "none new" might have meant structurally.
const TERMS_LABEL_PATTERNS = [
  { style: "list", re: /^- \*\*Terms (?:used|introduced) in this lesson\*\*\s*$/ },
  { style: "flat", re: /^\*\*Terms (?:used|introduced) in this lesson:?\*\*:?\s*$/ },
  { style: "heading", re: /^#{1,6}\s+Terms (?:used|introduced) in this lesson\s*$/ },
  { style: "plain", re: /^Terms (?:used|introduced) in this lesson:?\s*$/ },
];
const OBJECTS_LABEL_PATTERNS = [
  { style: "list", re: /^- \*\*Objects and methods used\*\*\s*$/ },
  { style: "flat", re: /^\*\*Objects and methods used:?\*\*:?\s*$/ },
  { style: "heading", re: /^#{1,6}\s+Objects and methods used\s*$/ },
  { style: "plain", re: /^Objects and methods used:?\s*$/ },
];
const ALL_HEADER_LABEL_PATTERNS = [...TERMS_LABEL_PATTERNS, ...OBJECTS_LABEL_PATTERNS];
function isHeaderLabelLine(line) {
  return ALL_HEADER_LABEL_PATTERNS.some((p) => p.re.test(line));
}

function extractHeaderListSection(content, patterns) {
  if (!content) return null;
  const lines = content.split("\n");
  let startIdx = -1;
  let style = null;
  for (let i = 0; i < lines.length; i++) {
    const hit = patterns.find((p) => p.re.test(lines[i]));
    if (hit) {
      startIdx = i;
      style = hit.style;
      break;
    }
  }
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    // "list" content is always indented under its bullet, so any column-0
    // line — the next Header field, a heading, or the closing "---" — ends
    // it. The other three styles sit at column 0 themselves, so their own
    // boundary is only a real heading, an "---" rule, or the next known
    // Header label (an object's own bare-bold name paragraph, e.g.
    // "**`SQLiteOpenHelper`**", looks identical in shape but isn't one of
    // the four known labels, so it's correctly kept as section content).
    const structuralBoundary =
      /^#{1,6}\s/.test(line) || /^-{3,}\s*$/.test(line) || isHeaderLabelLine(line);
    const listBoundary = style === "list" && /^\S/.test(line);
    if (structuralBoundary || listBoundary) {
      endIdx = i;
      break;
    }
  }
  let body = lines.slice(startIdx + 1, endIdx);
  if (style === "list") {
    body = body.map((line) => (line.startsWith("  ") ? line.slice(2) : line));
  }
  const text = body.join("\n").trim();
  return text || null;
}

// Splits an extracted Terms/Objects section back into its individual
// entries — one per top-level (column-0) block — so the Reference panel's
// search can filter down to just the entries that actually match, rather
// than scrolling to one hit and leaving everything else in the way. Same
// "next column-0 line starts a new block" rule as extractHeaderListSection
// itself, applied one level down: after that function's own dedent, every
// entry (a term bullet, an object's name-plus-shape bullet, the trailing
// "Everything else..." label) starts flush left again.
//
// Each block keeps its own ORIGINAL trailing blank line(s) (if any) rather
// than being trimmed, and the caller rejoins surviving blocks with "" —
// not a fixed separator. This one broke the panel's styling once already:
// joining with a fixed "\n\n" inserted a blank line between every sibling
// term/object that previously had none, and in CommonMark a blank line
// between list items makes the whole list "loose" — which wraps every
// item's content in a <p>, breaking the exact `<strong>`-then-`<br>` (and
// `<strong><code>` / nested `<ul>`) shape the term-bullet and object-card
// CSS `:has()` selectors depend on. Preserving each block's real original
// gap (one "\n" for an originally-tight pair, "\n\n" for an
// originally-loose one, nothing if the block was last) keeps every
// surviving subset byte-identical to how that stretch of the real
// document was already formatted — including the unfiltered case, which
// must reproduce the source exactly.
function splitTopLevelBlocks(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (/^\S/.test(line) && current.length) {
      blocks.push(current.join("\n") + "\n");
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks.filter((b) => b.trim());
}

// Wraps every match of `query` in <mark> so rehypeRaw renders it as a real
// highlighted span, matching against the term/object's full text — name
// AND definition — not just its bolded name. Skips backtick code spans:
// text inside `` `...` `` isn't reparsed as markdown OR raw HTML, so a
// <mark> tag landing inside one would show up as literal, unrendered text
// instead of a highlight.
function highlightMatches(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  return text
    .split(/(`[^`]*`)/g)
    .map((segment) =>
      segment.startsWith("`") ? segment : segment.replace(re, (m) => `<mark>${m}</mark>`),
    )
    .join("");
}

// Persisted "where was I" state, so a Vite full reload (or a manual browser
// refresh) restores the same tab, the same doc, and the same scroll/cursor
// position instead of always snapping back to a blank Editor tab.
const SCROLL_LS_KEY = "mdhub_tutorial_scroll";
const EDITOR_VIEWSTATE_PREFIX = "mdhub_editor_viewstate_";

function readScrollMap() {
  try {
    return JSON.parse(localStorage.getItem(SCROLL_LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveScrollPosition(path, headingIdValue) {
  if (!path || !headingIdValue) return;
  try {
    const map = readScrollMap();
    map[path] = headingIdValue;
    localStorage.setItem(SCROLL_LS_KEY, JSON.stringify(map));
  } catch {}
}

function saveEditorViewState(docKey, viewState) {
  if (!docKey || !viewState) return;
  try {
    localStorage.setItem(EDITOR_VIEWSTATE_PREFIX + docKey, JSON.stringify(viewState));
  } catch {}
}

function loadEditorViewState(docKey) {
  if (!docKey) return null;
  try {
    const raw = localStorage.getItem(EDITOR_VIEWSTATE_PREFIX + docKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function extractText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node?.props?.children !== undefined)
    return extractText(node.props.children);
  return "";
}

// Resolve a relative .md href against the current file path.
// Returns the canonical DOCS_MODULES key if it exists, otherwise null.
function resolveDocPath(currentFilePath, href) {
  if (!currentFilePath || !href) return null;
  const hrefBase = href.split("#")[0];
  if (!hrefBase.endsWith(".md")) return null;
  const dir = currentFilePath.split("/").slice(0, -1).join("/");
  const parts = (dir + "/" + hrefBase).split("/");
  const resolved = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== "." && part !== "") resolved.push(part);
  }
  const resolvedPath = "/" + resolved.join("/");
  return resolvedPath in DOCS_MODULES ? resolvedPath : null;
}

// Whether this paragraph node contains an inline trigger that
// MdInlineCode/MdLink will turn into a <ConceptEmbedTrigger>. Historically
// this trigger expanded inline into a full markdown document — real
// block-level elements (h1, p, ul, ...) landing inside what's structurally
// a <p>, invalid per the HTML content model, which React's DOM renderer
// does not auto-correct: it built the broken tree exactly as instructed,
// and browsers laid it out unpredictably. That's fixed now for a more
// direct reason — the trigger no longer renders block content inline at
// all, it opens ConceptWindowProvider's own window instead (see
// ConceptEmbedTrigger, below) — but this check is left in place as a
// harmless no-op safeguard rather than removed, since a <button> trigger
// is valid inside a <p> either way.
function paragraphContainsConceptEmbed(node) {
  if (!node) return false;

  function walk(n) {
    if (!n) return false;
    if (n.type === "element" && n.tagName === "code") {
      const text = (n.children || [])
        .filter((c) => c.type === "text")
        .map((c) => c.value)
        .join("");
      if (text.endsWith(".md")) {
        const filename = text.split("/").pop();
        if (findConceptDocPath(filename)) return true;
      }
    }
    if (n.type === "element" && n.tagName === "a") {
      const href = n.properties?.href || "";
      const hrefBase = href.split("#")[0];
      if (hrefBase.endsWith(".md") && hrefBase.includes("/concepts/")) {
        const filename = hrefBase.split("/").pop();
        if (findConceptDocPath(filename)) return true;
      }
    }
    return (n.children || []).some(walk);
  }

  return (node.children || []).some(walk);
}

// Filenames in this docs tree are kebab/snake-case with no separate
// "pretty title" stored anywhere for arbitrary files — the sidebar tree
// gets its labels from a build-time script, not something callable here.
// Same derivation already used for a concept's own title, reused for the
// lesson (origin) title so both ends of the breadcrumb read consistently.
function titleFromPath(path) {
  if (!path) return "This lesson";
  const filename = path.split("/").pop() || path;
  return filename.replace(/\.md$/, "").replace(/[-_]/g, " ");
}

// Concept references used to expand inline into an accordion that recursed
// into another copy of itself for a concept-in-a-concept reference — each
// level added its own border+padding, so nesting a few deep visibly shrank
// and indented every level in (measured: 885px -> 835px -> ... one real
// case, Lesson 05 giving-the-machine-a-memory's fold-vs-scan ->
// fold-reduce-pattern). Now it's just a trigger: first click opens the
// shared ConceptWindowProvider window; a concept reference found *inside*
// that window's own content (see useConceptNav, checked below) pushes onto
// that same window's breadcrumb instead of opening/nesting a second one.
function ConceptEmbedTrigger({ docPath, title }) {
  const conceptWindow = useConceptWindow();
  const nav = useConceptNav();
  const { activeFile } = useContext(DocsCtx);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (nav) {
          nav.push(docPath, title);
        } else {
          conceptWindow.openFromLesson(docPath, title, titleFromPath(activeFile));
        }
      }}
      className="inline-flex items-center gap-1.5 my-1 px-3 py-1.5 rounded-full font-bold text-sm transition-all duration-200 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400 shadow-[0_2px_10px_-2px] shadow-brand-500/40 hover:shadow-[0_4px_18px_-2px] hover:shadow-brand-500/60 hover:-translate-y-0.5 hover:border-brand-400 dark:hover:border-brand-400"
    >
      <span className="text-[12px]">📚</span> Concept: {title}
    </button>
  );
}

function MdLink({ href, children }) {
  const { activeFile, onDocLink, scrollToHeading } = useContext(DocsCtx);

  // Same-page anchor — scroll the content container instead of the window
  if (href?.startsWith("#")) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          scrollToHeading?.(href.slice(1));
        }}
      >
        {children}
      </a>
    );
  }

  // Relative .md link — always load in Studio, never navigate away
  const hrefBase = href?.split("#")[0] ?? "";
  const isRelativeMd =
    hrefBase.endsWith(".md") &&
    !href.startsWith("http") &&
    !href.startsWith("//");
  if (isRelativeMd) {
    const docPath = resolveDocPath(activeFile, href);

    // Concept references are addressed by filename, not by a correctly-
    // relative path (see findConceptDocPath) — a link is treated as a
    // concept reference if it's structurally pointing into *some*
    // `concepts/` folder, regardless of whether the written `../` depth
    // actually resolves against this doc's own location.
    if (hrefBase.includes("/concepts/")) {
      const conceptDocPath = findConceptDocPath(hrefBase.split("/").pop());
      if (conceptDocPath) {
        return (
          <ConceptEmbedTrigger docPath={conceptDocPath} title={extractText(children)} />
        );
      }
    }

    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (docPath) onDocLink?.(docPath);
        }}
        style={{
          opacity: docPath ? 1 : 0.5,
          cursor: docPath ? "pointer" : "default",
        }}
        title={docPath ? undefined : "Linked document not found in this Studio"}
      >
        {children}
      </a>
    );
  }

  const isExternal =
    href &&
    (href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//"));
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

// Fenced ```latex / ```math blocks are meant as display equations, not code
// — render them through KaTeX directly so they get the same .katex-display
// "math well" box as inline $$...$$, instead of showing as a code editor.
const MATH_FENCE_LANGS = new Set(["latex", "math", "tex"]);

// Unlanguaged fences are mostly plain-text/ASCII diagrams, equation systems,
// and terminal output (confirmed: 250+ existing docs rely on bare ``` for
// exactly that) — not real code, and not necessarily valid LaTeX either,
// so running them through KaTeX risks mangling them (e.g. unicode
// subscripts/arrows in an ASCII equation system get parsed as math symbols
// and garbled). Instead, give every bare fence the same boxed "math well"
// visual treatment as a display equation, but render it verbatim as plain
// text — no formatter touches the content, so it can't be misinterpreted.
function MdPlainWell({ code }) {
  return (
    <div className="katex-display">
      <pre>{code}</pre>
    </div>
  );
}

function MdMathBlock({ code }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(code, {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      return `<span class="katex-error">${e.message}</span>`;
    }
  }, [code]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function MdImage({ src, alt, title }) {
  return (
    <img
      src={src}
      alt={alt || ""}
      title={title || undefined}
      loading="lazy"
      className="md-img"
      onError={(e) => {
        e.currentTarget.style.opacity = "0.3";
      }}
    />
  );
}

// A lesson repeats the same heading text constantly ("### The Problem",
// "### CS Lens" ...) across many Concept Units, so the visible text alone
// isn't a unique id. This used to be disambiguated with a shared counter
// that incremented on every h1-h4 render — but that counter mutated during
// render, inside components react-markdown mounts, which React 18
// StrictMode double-invokes in dev to catch exactly this kind of impurity:
// the counter advanced twice per heading, corrupting every id (even
// unique ones) and permanently desyncing it from the ToC's own single-pass
// computation (headings, below), so "On This Page" clicks silently found no
// matching element. A heading's source line number is unique with no
// counting at all — pure, StrictMode-proof, and computable identically by
// both this render-time id and the ToC's own text scan, PROVIDED it's
// translated back to a real document line via ChunkLineOffsetCtx (a document
// rendered as one single <ReactMarkdown> call needs no translation, hence
// the context's default of 0).
function useHeadingId(node, children) {
  const offset = useContext(ChunkLineOffsetCtx);
  const base = headingId(extractText(children));
  const line = node?.position?.start?.line;
  return line != null ? `${base}-${offset + line - 1}` : base;
}

const MD_COMPONENTS = {
  h1: ({ node, children }) => <h1 id={useHeadingId(node, children)}>{children}</h1>,
  h2: ({ node, children }) => <h2 id={useHeadingId(node, children)}>{children}</h2>,
  h3: ({ node, children }) => <h3 id={useHeadingId(node, children)}>{children}</h3>,
  h4: ({ node, children }) => <h4 id={useHeadingId(node, children)}>{children}</h4>,
  p({ node, children }) {
    if (paragraphContainsConceptEmbed(node)) {
      // See paragraphContainsConceptEmbed's own comment: this paragraph
      // will render a ConceptEmbed whose expanded content can include
      // real block-level elements, invalid inside a real <p>. A <div>
      // carries the identical `.md-body` paragraph margin (the
      // `.md-p-block` selector alongside `p` in getMdCss, below) without
      // that restriction.
      return <div className="md-p-block">{children}</div>;
    }
    return <p>{children}</p>;
  },
  pre({ node }) {
    // react-markdown re-renders `pre` in place at the same tree position when
    // the surrounding doc changes — with no key, React treats it as an update
    // to the SAME component instance rather than a new one. That's harmless
    // for plain elements, but MdCodeBlock's Monaco editor uses an uncontrolled
    // `defaultValue`, which @monaco-editor/react only applies on first mount;
    // reusing the instance across a file change left it showing the
    // previous file's code. Keying by (activeFile + this block's own
    // position) forces a real remount whenever the doc changes, so
    // `defaultValue` gets picked up fresh — the position half keeps the key
    // unique across sibling blocks within the SAME file, so two adjacent
    // code fences don't collide onto a single shared key.
    const { activeFile } = useContext(DocsCtx);
    const blockKey = `${activeFile ?? ""}::${node?.position?.start?.offset ?? node?.position?.start?.line ?? ""}`;

    // Read directly from the hast node to avoid losing className through custom `code` processing
    const codeNode = node?.children?.[0];
    const classNames = codeNode?.properties?.className ?? [];
    const langClass = (
      Array.isArray(classNames) ? classNames : [String(classNames)]
    ).find((c) => /^language-/.test(String(c)));
    const match = /language-(\w+)/.exec(langClass || "");
    const rawCode = (codeNode?.children ?? [])
      .filter((n) => n.type === "text")
      .map((n) => n.value)
      .join("");
    const code = rawCode.replace(/\n$/, "");
    if (match) {
      const lang = match[1];
      if (MATH_FENCE_LANGS.has(lang))
        return <MdMathBlock key={blockKey} code={code} />;
      return <MdCodeBlock key={blockKey} language={lang} code={code} />;
    }
    // Unlanguaged fenced block — boxed plain text, see MdPlainWell above.
    return <MdPlainWell key={blockKey} code={code} />;
  },
  code({ children }) {
    // Only inline code reaches here; block code is handled entirely by `pre` via node prop
    return <MdInlineCode>{children}</MdInlineCode>;
  },
  li({ node, children }) {
    // Glossary-style bullets ("- **Term** — definition...") are one of this
    // corpus's most common list shapes (11k+ occurrences across every
    // curriculum), but list items with a leading bold run are NOT all
    // glossary terms — "- **Files affected:** ..." and plain mid-sentence
    // emphasis also start with `<strong>`. Matching on the hast node's
    // exact shape (strong, then a text node starting with " — ") targets
    // only the glossary convention itself, so every other list — in every
    // lesson, with no markdown edits — is untouched.
    //
    // A term that's *reappearing* from an earlier lesson carries a short
    // parenthetical first — "**static** (reappearing, Lesson 0) — a
    // member...", 309 of these across the corpus — which pushes the real
    // em dash a few children later instead of starting kids[1] directly,
    // and past instances have shown the annotation itself can contain
    // inline code ("(`{...}` syntax) — ..."). Gating the broadened scan on
    // kids[1] starting with "(" keeps this from also matching an unrelated
    // "**Label:** value — aside" bullet, since those start with a space or
    // inline code, never an opening paren, right after the bold run.
    const kids = node?.children ?? [];
    const isBoldLed =
      kids[0]?.type === "element" && kids[0].tagName === "strong";
    const second = kids[1];
    const simpleDash =
      isBoldLed && second?.type === "text" && /^\s*—\s+/.test(second.value ?? "");
    const hasAnnotation =
      isBoldLed && second?.type === "text" && /^\s*\(/.test(second.value ?? "");

    if (simpleDash || hasAnnotation) {
      let dashKidIdx = -1;
      let dashCharIdx = -1;
      for (let i = 1; i < kids.length; i++) {
        const k = kids[i];
        if (k.type === "text" && k.value.includes("—")) {
          dashKidIdx = i;
          dashCharIdx = k.value.indexOf("—");
          break;
        }
      }
      if (dashKidIdx !== -1) {
        const term = children[0];
        const annotation = children.slice(1, dashKidIdx);
        const dashText = children[dashKidIdx];
        const beforeDash = dashText.slice(0, dashCharIdx).replace(/\s+$/, "");
        const afterDash = dashText.slice(dashCharIdx + 1).replace(/^\s+/, "");
        const rest = children.slice(dashKidIdx + 1);
        return (
          <li>
            <strong>
              {term.props.children}
              {annotation}
              {beforeDash}
            </strong>
            <br />
            {afterDash}
            {rest}
          </li>
        );
      }
    }
    return <li>{children}</li>;
  },
  a({ href, children }) {
    return <MdLink href={href}>{children}</MdLink>;
  },
  img({ src, alt, title }) {
    return <MdImage src={src} alt={alt} title={title} />;
  },
};

// A tiny map from common aliases to Prism's grammar names
const PRISM_LANG_ALIAS = {
  js: 'javascript', ts: 'typescript', py: 'python',
  sh: 'bash', zsh: 'bash', shell: 'bash',
  cs: 'csharp', 'c++': 'cpp', htm: 'markup', html: 'markup', xml: 'markup',
  rb: 'ruby', lua: 'lua', go: 'go', rs: 'rust',
};

function PrismCodeBlock({ lang, code }) {
  const isDark = useIsDark();
  const grammar = Prism.languages[PRISM_LANG_ALIAS[lang] || lang];
  const highlighted = grammar
    ? Prism.highlight(code, grammar, PRISM_LANG_ALIAS[lang] || lang)
    : null;

  return (
    <>
      {/* Inject the appropriate Prism theme — light or dark */}
      <style>{isDark
        ? `/* prism-okaidia */
.token.comment,.token.prolog,.token.doctype,.token.cdata{color:#8b949e}
.token.punctuation{color:#c9d1d9}
.token.namespace{opacity:.7}
.token.property,.token.tag,.token.constant,.token.symbol,.token.deleted{color:#f97583}
.token.boolean,.token.number{color:#79b8ff}
.token.selector,.token.attr-name,.token.string,.token.char,.token.builtin,.token.inserted{color:#9ecbff}
.token.operator,.token.entity,.token.url,.language-css .token.string,.style .token.string{color:#79b8ff}
.token.atrule,.token.attr-value,.token.keyword{color:#b392f0}
.token.function,.token.class-name{color:#b392f0}
.token.regex,.token.important,.token.variable{color:#ffab70}
.token.important,.token.bold{font-weight:700}
.token.italic{font-style:italic}
pre[class*="language-"]{background:#161b22;color:#c9d1d9;border:1px solid #30363d}`
        : `/* prism-default (github-like) */
.token.comment,.token.prolog,.token.doctype,.token.cdata{color:#6a737d}
.token.punctuation{color:#24292e}
.token.namespace{opacity:.7}
.token.property,.token.tag,.token.constant,.token.symbol,.token.deleted{color:#d73a49}
.token.boolean,.token.number{color:#005cc5}
.token.selector,.token.attr-name,.token.string,.token.char,.token.builtin,.token.inserted{color:#032f62}
.token.operator,.token.entity,.token.url,.language-css .token.string,.style .token.string{color:#005cc5}
.token.atrule,.token.attr-value,.token.keyword{color:#d73a49}
.token.function,.token.class-name{color:#6f42c1}
.token.regex,.token.important,.token.variable{color:#e36209}
.token.important,.token.bold{font-weight:700}
.token.italic{font-style:italic}
pre[class*="language-"]{background:#f6f8fa;color:#24292e;border:1px solid #e1e4e8}`
      }</style>
      {highlighted ? (
        <pre className={lang ? `language-${lang}` : undefined}>
          <code
            className={lang ? `language-${lang}` : undefined}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </>
  );
}

const BASIC_MD_COMPONENTS = {
  h1: ({ node, children }) => <h1 id={useHeadingId(node, children)}>{children}</h1>,
  h2: ({ node, children }) => <h2 id={useHeadingId(node, children)}>{children}</h2>,
  h3: ({ node, children }) => <h3 id={useHeadingId(node, children)}>{children}</h3>,
  h4: ({ node, children }) => <h4 id={useHeadingId(node, children)}>{children}</h4>,
  pre({ node }) {
    const codeNode = node?.children?.[0];
    const className = codeNode?.properties?.className?.[0] || '';
    const lang = className.replace('language-', '') || '';
    const code = codeNode?.children?.[0]?.value ?? '';
    return <PrismCodeBlock lang={lang} code={code.replace(/\n$/, '')} />;
  },
};

function nodeContainsFile(node, filePath) {
  if (!filePath) return false;
  if (node.type === "file") return node.path === filePath;
  return (node.children ?? []).some((child) =>
    nodeContainsFile(child, filePath),
  );
}

function TreeNode({
  node,
  activeFile,
  onSelect,
  depth = 0,
  overriddenPaths = new Set(),
  accentColor = "#0ea5e9",
  ui = {},
  docProgress = {},
}) {
  const [open, setOpen] = useState(
    () => node.open !== false || nodeContainsFile(node, activeFile),
  );
  const indent = depth * 14;

  useEffect(() => {
    if (nodeContainsFile(node, activeFile)) setOpen(true);
  }, [activeFile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (node.type === "dir") {
    // FOLDER UI
    return (
      <div 
        className={`mb-2 relative transition-all duration-500 rounded-xl ${open ? 'py-1' : ''}`}
        style={open ? { backgroundColor: `${accentColor}0A` } : {}}
      >
        {/* Vertical tree line connecting folder to its children */}
        {open && node.children.length > 0 && (
          <div 
            className="absolute top-10 bottom-2 border-l border-black/5 dark:border-white/5"
            style={{ left: 18 + indent }}
          />
        )}
        <div
          onClick={() => setOpen((value) => !value)}
          className={`relative flex items-center gap-2 px-3 py-2 mx-2 mb-1 cursor-pointer transition-all duration-300 select-none group border rounded-lg ${ui.txt1} ${
            open 
              ? 'z-10' 
              : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 shadow-sm hover:-translate-y-0.5'
          }`}
          style={{ 
            marginLeft: 8 + indent,
            ...(open ? {
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}80`,
              boxShadow: `3px 3px 0px ${accentColor}60, 0 0 15px ${accentColor}25`,
              transform: `translateY(-2px)`
            } : {})
          }}
        >
          {open ? (
            <ChevronDown className="w-4 h-4 opacity-70 transition-transform shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 opacity-70 group-hover:scale-110 transition-transform shrink-0" />
          )}
          <Folder 
            className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" 
            style={{ color: accentColor, fill: `${accentColor}40` }} 
          />
          <span
            className="text-[12px] font-bold tracking-wide truncate min-w-0 flex-1 drop-shadow-sm"
            style={{ color: accentColor }}
          >
            {displayName(node.name)}
          </span>
        </div>
        {open &&
          node.children.map((child, index) => (
            <TreeNode
              key={`${child.name}-${index}`}
              node={child}
              activeFile={activeFile}
              onSelect={onSelect}
              depth={depth + 1}
              overriddenPaths={overriddenPaths}
              accentColor={accentColor}
              ui={ui}
              docProgress={docProgress}
            />
          ))}
      </div>
    );
  }

  // FILE UI
  const isActive = activeFile === node.path;
  const isOverridden = overriddenPaths.has(node.path);
  const progress = docProgress[node.path] || 0;
  const isDone = progress === 100;
  
  return (
    <div
      onClick={() => onSelect(node.path)}
      className={`relative overflow-hidden flex items-center gap-2 px-3 py-2 mb-1 mx-2 cursor-pointer text-xs transition-all duration-300 rounded-md border ${
        isActive
          ? `${ui.txt1} font-medium z-10`
          : `${ui.txt2} border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] hover:border-black/10 dark:hover:border-white/10 hover:-translate-y-0.5`
      }`}
      style={{
        marginLeft: 28 + indent,
        ...(isActive
          ? {
              borderColor: `${accentColor}80`,
              backgroundColor: `${accentColor}1A`,
              color: accentColor,
              boxShadow: `3px 3px 0px ${accentColor}60, 0 0 10px ${accentColor}15`,
              transform: `translateY(-2px)`
            }
          : {
              boxShadow: `0 1px 2px rgba(0,0,0,0.05)`
            }),
      }}
    >
      {/* Progress background fill */}
      <div 
        id={`progress-${node.path.replace(/[^a-zA-Z0-9-]/g, '-')}`}
        className="absolute top-0 left-0 h-full transition-all duration-300 pointer-events-none" 
        style={{ 
          width: `${progress}%`,
          backgroundColor: isDone ? `${accentColor}25` : `${accentColor}10`,
          ...(isDone ? { backgroundImage: `linear-gradient(90deg, ${accentColor}10, ${accentColor}30)` } : {})
        }} 
      />
      
      <File
        className={`w-3.5 h-3.5 shrink-0 relative z-10 transition-transform ${isActive ? "opacity-100 scale-110" : "opacity-70 group-hover:opacity-100"}`}
        style={isActive ? { color: accentColor } : {}}
      />
      <span className="truncate min-w-0 flex-1 relative z-10">{displayName(node.name)}</span>
      
      {isDone && (
        <Check 
          className="w-3.5 h-3.5 shrink-0 relative z-10 opacity-75" 
          style={{ color: accentColor }} 
        />
      )}
      
      {isOverridden && (
        <span className="ml-auto text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 relative z-10 shrink-0">
          Override
        </span>
      )}
    </div>
  );
}

function DocListItem({
  itemId,
  label,
  subtitle,
  isActive,
  onSelect,
  onDelete,
  kind,
  accentColor = "#0ea5e9",
  ui = {},
  progress = 0,
}) {
  const isDone = progress === 100;
  
  return (
    <div className="flex items-center group mb-1 mx-2">
      <div
        onClick={onSelect}
        className={`relative overflow-hidden flex-1 flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-all rounded-md border shadow-sm ${
          isActive
            ? `${ui.txt1} font-medium border-transparent ring-1`
            : `${ui.txt2} border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] hover:border-black/10 dark:hover:border-white/10 hover:shadow-md`
        }`}
        style={
          isActive
            ? {
                borderColor: accentColor,
                backgroundColor: `${accentColor}1A`,
                color: accentColor,
                boxShadow: `0 0 10px ${accentColor}15`,
                ringColor: `${accentColor}50`
              }
            : undefined
        }
      >
        {/* Progress background fill */}
        <div 
          id={itemId ? `progress-${itemId.replace(/[^a-zA-Z0-9-]/g, '-')}` : undefined}
          className="absolute top-0 left-0 h-full transition-all duration-300 pointer-events-none" 
          style={{ 
            width: `${progress}%`,
            backgroundColor: isDone ? `${accentColor}25` : `${accentColor}10`,
            ...(isDone ? { backgroundImage: `linear-gradient(90deg, ${accentColor}10, ${accentColor}30)` } : {})
          }} 
        />
      
        <FilePenLine
          className={`w-4 h-4 shrink-0 relative z-10 transition-transform ${isActive ? "opacity-100 scale-110" : "opacity-70 group-hover:opacity-100"}`}
        />
        <div className="truncate min-w-0 flex-1 relative z-10">
          <div className="truncate drop-shadow-sm">{label || "Untitled"}</div>
          {subtitle && (
            <div className={`truncate text-[10px] ${ui.txt3}`}>{subtitle}</div>
          )}
        </div>
        
        {isDone && (
          <Check 
            className="w-3.5 h-3.5 shrink-0 relative z-10 opacity-75" 
            style={{ color: accentColor }} 
          />
        )}
        
        <span
          className={`text-[9px] uppercase tracking-widest relative z-10 shrink-0 px-1.5 py-0.5 rounded-full ${kind === "override" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-300"}`}
        >
          {kind}
        </span>
      </div>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className={`p-1.5 shrink-0 ${ui.txt3} opacity-0 group-hover:opacity-100 transition-opacity ml-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500`}
        title={kind === "override" ? "Restore built-in doc" : "Delete document"}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function NoteEditorItem({
  note,
  isActive,
  onOpen,
  onUpdate,
  onDelete,
  onOpenSource,
  accentColor = "#0ea5e9",
  ui = {},
}) {
  return (
    <div 
      className={`mx-2 mb-2 rounded-lg border transition-all duration-300 overflow-hidden ${
        isActive 
          ? `shadow-sm ring-1 bg-white dark:bg-[#0c1520]` 
          : `border-transparent bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06]`
      }`}
      style={isActive ? { borderColor: accentColor, boxShadow: `0 4px 20px ${accentColor}15`, ringColor: `${accentColor}30` } : {}}
    >
      <div
        onClick={onOpen}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors group ${isActive ? "bg-white/40 dark:bg-black/40" : `${ui.txt2} ${ui.hoverBg}`}`}
      >
        {isActive ? (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 opacity-70 group-hover:scale-110 transition-transform" />
        )}
        <div className="truncate flex-1">
          <div className={`truncate font-medium transition-colors ${isActive ? "" : ui.txt1}`} style={isActive ? { color: accentColor } : {}}>
            {note.title || "Untitled note"}
          </div>
          {!isActive && note.body && (
            <div className={`truncate text-[10px] mt-0.5 ${ui.txt2}`}>
              {note.body.replace(/\s+/g, " ").trim()}
            </div>
          )}
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className={`p-1.5 ${ui.txt2} opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500`}
          title="Delete note"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {isActive && (
        <div className={`px-3 pb-3 pt-2 border-t border-black/5 dark:border-white/5`}>
          <style>{`
            .note-field-${note.id}:focus {
              box-shadow: 0 0 0 1px ${accentColor} !important;
              border-color: ${accentColor} !important;
            }
          `}</style>
          <input
            type="text"
            value={note.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Note title"
            className={`note-field-${note.id} w-full mb-2 px-2.5 py-1.5 rounded-md border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus:bg-transparent text-[12px] font-medium outline-none focus:outline-none transition-all`}
          />
          {note.docPath && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenSource(note.docPath);
              }}
              title="Open the lesson this note came from"
              className={`note-field-${note.id} w-full mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[11px] font-medium transition-all truncate outline-none focus:outline-none`}
              style={{ color: accentColor }}
            >
              <File className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{note.docTitle || "Open source lesson"}</span>
            </button>
          )}
          <label className={`block mb-1 text-[9px] font-bold uppercase tracking-widest ${ui.txt2}`}>
            Series
          </label>
          <input
            type="text"
            value={note.series}
            onChange={(e) => onUpdate({ series: e.target.value })}
            placeholder="Series"
            className={`note-field-${note.id} w-full mb-2 px-2.5 py-1.5 rounded-md border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus:bg-transparent text-[11px] outline-none focus:outline-none transition-all ${ui.txt2}`}
          />
          <textarea
            value={note.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="Paste or type your note here…"
            rows={6}
            className={`note-field-${note.id} w-full px-2.5 py-2 rounded-md border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus:bg-transparent text-[12px] leading-relaxed outline-none focus:outline-none resize-y transition-all ${ui.txt1}`}
          />
        </div>
      )}
    </div>
  );
}

function NotesSeriesGroup({
  seriesName,
  notes,
  activeNoteId,
  onOpen,
  onUpdate,
  onDelete,
  onOpenSource,
  accentColor = "#0ea5e9",
  ui = {},
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <div
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 mb-1 mx-1 rounded-lg cursor-pointer select-none transition-colors hover:bg-black/5 dark:hover:bg-white/5 border border-transparent`}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 opacity-70 transition-transform" />
        ) : (
          <ChevronRight className="w-4 h-4 opacity-70 transition-transform group-hover:scale-110" />
        )}
        <span
          className="text-[12px] font-bold tracking-wide drop-shadow-sm flex-1 truncate"
          style={{ color: accentColor }}
        >
          {seriesName}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ui.bg2} ${ui.txt2}`}>
          {notes.length}
        </span>
      </div>
      {open &&
        notes.map((note) => (
          <NoteEditorItem
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onOpen={() => onOpen(note.id)}
            onUpdate={(patch) => onUpdate(note.id, patch)}
            onDelete={() => onDelete(note.id)}
            onOpenSource={onOpenSource}
            accentColor={accentColor}
            ui={ui}
          />
        ))}
    </div>
  );
}

function createLocalDoc() {
  const id = Date.now().toString();
  return {
    id,
    name: "Untitled",
    content: "# New Document\n\nStart writing here...",
    source: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── TTS reader helpers ────────────────────────────────────────────────────────

// remark-math only recognizes $...$ / $$...$$. Content pasted from AI tools
// (ChatGPT, Claude, etc.) commonly uses \( ... \) / \[ ... \] instead — and
// worse, plain Markdown's backslash-escape rule silently drops the lone
// backslash before remark-math ever sees it, leaving bare brackets. Rewrite
// those delimiters to dollar form first, skipping inline code spans so code
// samples containing literal brackets aren't touched.
function convertTexDelimiters(text) {
  return text
    .split(/(`[^`\n]+`)/g)
    .map((part) =>
      part.startsWith("`")
        ? part
        : part
            .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`)
            .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`),
    )
    .join("");
}

// remark-math only treats $$...$$ as block/display math (the boxed "math
// well" styling) when the delimiters sit alone on their own line. A whole
// line that's just "$$<equation>$$" — common when content gets pasted or
// authored compactly — parses as inline math instead and silently loses the
// box. Promote any such line to a proper three-line block.
function normalizeDisplayMath(text) {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\s*)\$\$(.+)\$\$(\s*)$/);
      return m && m[2].trim() ? `${m[1]}$$\n${m[2].trim()}\n$$${m[3]}` : line;
    })
    .join("\n");
}

// Each returned page also carries startLine (1-indexed, in the ORIGINAL
// document) — SectionedMarkdown renders each page's title and body through
// their own separate <ReactMarkdown> calls, so headingId's line-based ids
// (see useHeadingId, above) need this to translate a slice-relative line
// back to a real document line.
function splitIntoPages(markdown) {
  const lines = markdown.split("\n");
  const pages = [];
  let currentPage = [];
  let currentStartLine = 1;
  let inCodeBlock = false;

  lines.forEach((line, idx) => {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    }

    if (line.startsWith("## ") && !inCodeBlock) {
      if (currentPage.length > 0) {
        pages.push({ content: currentPage.join("\n"), startLine: currentStartLine });
      }
      currentPage = [line];
      currentStartLine = idx + 1;
    } else {
      currentPage.push(line);
    }
  });
  if (currentPage.length > 0) {
    pages.push({ content: currentPage.join("\n"), startLine: currentStartLine });
  }

  return pages;
}

// startLine is this markdown slice's own 1-indexed line number in the
// original document (see splitIntoPages above for why) — each returned
// section carries its own startLine, computed by counting newlines up to
// that point, so a heading buried in, say, the 4th prose chunk of a page
// still resolves to its true document line rather than restarting at 1.
function splitMarkdownSections(markdown, startLine = 1) {
  const sections = [];
  const fenceRe = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm;
  const lineAt = (charIdx) =>
    startLine + (markdown.slice(0, charIdx).match(/\n/g) || []).length;
  let lastIdx = 0;
  let match;
  while ((match = fenceRe.exec(markdown)) !== null) {
    const before = markdown.slice(lastIdx, match.index);
    if (before.trim())
      sections.push({ type: "prose", content: before, startLine: lineAt(lastIdx) });
    sections.push({ type: "code", content: match[0], startLine: lineAt(match.index) });
    lastIdx = match.index + match[0].length;
  }
  const after = markdown.slice(lastIdx);
  if (after.trim())
    sections.push({ type: "prose", content: after, startLine: lineAt(lastIdx) });
  return sections;
}

function highlightSpokenWord(root, spokenText, charIndex, searchState, id) {
  if (!root || !window.CSS?.highlights) return
  const word = spokenText.slice(charIndex).match(/[\p{L}\p{N}_'-]+/u)?.[0]
  if (!word) return
  const plain = root.textContent ?? ''
  const lower = plain.toLocaleLowerCase()
  const needle = word.toLocaleLowerCase()
  const from = searchState.current[id] ?? 0
  let offset = lower.indexOf(needle, from)
  if (offset === -1) offset = lower.indexOf(needle)
  if (offset === -1) return
  searchState.current[id] = offset + needle.length

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let cursor = 0
  let startNode = null, endNode = null, startOffset = 0, endOffset = 0
  while (walker.nextNode()) {
    const node = walker.currentNode
    const next = cursor + node.textContent.length
    if (!startNode && offset >= cursor && offset < next) {
      startNode = node
      startOffset = offset - cursor
    }
    const end = offset + needle.length
    if (startNode && end <= next) {
      endNode = node
      endOffset = end - cursor
      break
    }
    cursor = next
  }
  if (!startNode || !endNode) return
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  CSS.highlights.set('markdown-reader-word', new Highlight(range))
}

// Memoized so that a parent re-render triggered by something this component
// doesn't care about (MarkdownHub's scroll-driven `activeHeadingId`, ticking
// on nearly every scroll frame while reading) doesn't force this whole tree
// — several unmemoized <ReactMarkdown> blocks running remark-gfm/remark-math/
// rehype-raw/rehype-katex from scratch — to re-parse on every scroll tick.
// All props below are either primitives or already-memoized objects
// (`ui`/`accentColor` come from ThemeContext's useMemo'd `themeStyles`), so
// this memo boundary actually holds instead of being defeated by fresh
// object identities every render.
export const SectionedMarkdown = memo(function SectionedMarkdown({
  content,
  ui,
  accentColor,
  isDark,
  font,
  width,
  lineHeight,
  fontSize,
  textAlign,
  basicWebpage = false,
  // True when this render is nested inside another chrome-providing box
  // (currently: ConceptEmbed's own bordered/padded card). The card already
  // supplies border/shadow/background/padding, so re-adding this component's
  // own "page" box on top of it just compounds padding on every level of
  // nesting (a concept embedding another concept stacks both boxes' padding
  // each time). When embedded, skip the page chrome entirely and let the
  // parent's box be the only chrome — only typography (font/size/line-height/
  // alignment) still applies, so embedded content still matches the reader's
  // chosen settings.
  embedded = false,
}) {
  const { speak, stop, pause, resume, isPaused } = useSpeech();
  const [playingIdx, setPlayingIdx] = useState(null);
  const playingIdxRef = useRef(null);
  const sectionRefs = useRef(new Map());
  const readerSearchRef = useRef({});

  const [collapsedPages, setCollapsedPages] = useState({});

  const togglePage = useCallback((idx) => {
    setCollapsedPages((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const pages = useMemo(() => {
    if (basicWebpage) {
      return [{
        title: "",
        titleLine: 1,
        sections: splitMarkdownSections(content, 1),
      }];
    }
    return splitIntoPages(content).map(({ content: pageContent, startLine }) => {
      let title = "";
      let body = pageContent;
      let bodyStartLine = startLine;
      if (pageContent.startsWith("## ")) {
        const newlineIdx = pageContent.indexOf("\n");
        if (newlineIdx !== -1) {
          title = pageContent.slice(0, newlineIdx).trim();
          body = pageContent.slice(newlineIdx + 1);
        } else {
          title = pageContent.trim();
          body = "";
        }
        bodyStartLine = startLine + 1;
      }
      return {
        title,
        titleLine: startLine,
        sections: splitMarkdownSections(body, bodyStartLine),
      };
    });
  }, [content, basicWebpage]);

  useEffect(
    () => () => {
      stop();
      window.CSS?.highlights?.delete('markdown-reader-word');
    },
    [content, stop],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = useCallback(
    async (idx, text) => {
      if (playingIdxRef.current === idx) {
        if (isPaused) resume();
        else pause();
        return;
      }
      stop();
      playingIdxRef.current = idx;
      readerSearchRef.current[idx] = 0;
      setPlayingIdx(idx);
      const spokenText = cleanForSpeech(text);
      await speak(spokenText, {
        onBoundary: (event) => highlightSpokenWord(sectionRefs.current.get(idx), spokenText, event.charIndex, readerSearchRef, idx),
      });
      if (playingIdxRef.current === idx) {
        playingIdxRef.current = null;
        setPlayingIdx(null);
        window.CSS?.highlights?.delete('markdown-reader-word');
      }
    },
    [speak, stop, pause, resume, isPaused],
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-24">
      {/* Dynamic style for the H1 in the intro page so we can use the accentColor */}
      <style>{`
        ::highlight(markdown-reader-word) {
          background: rgba(34, 211, 238, .38);
          color: inherit;
          border-radius: 3px;
        }
        ${!basicWebpage ? `
        .curled-shadow-wrapper {
          position: relative;
          z-index: 1;
        }
        .curled-shadow-wrapper::before, .curled-shadow-wrapper::after {
          content: "";
          position: absolute;
          z-index: -1;
          bottom: 15px;
          left: 10px;
          width: 50%;
          height: 20%;
          max-width: 300px;
          box-shadow: 0 15px 15px rgba(0,0,0,0.12);
          transform: rotate(-3deg);
          background: transparent;
        }
        .curled-shadow-wrapper::after {
          right: 10px;
          left: auto;
          transform: rotate(3deg);
        }
        .dark .curled-shadow-wrapper::before, .dark .curled-shadow-wrapper::after {
          box-shadow: 0 15px 15px rgba(0,0,0,0.4);
        }
        .md-body h1 {
          position: relative;
          z-index: 1;
          font-weight: 900;
          background: linear-gradient(90deg, ${accentColor}, ${accentColor}aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 2.25rem;
          margin-top: -1rem;
          margin-bottom: 1.5rem;
          margin-left: -1rem;
          margin-right: -1rem;
          padding: 1.5rem 1rem;
        }
        @media (min-width: 640px) {
          .md-body h1 {
            font-size: 2.75rem;
            margin-top: -1.5rem;
            margin-left: -1.5rem;
            margin-right: -1.5rem;
            padding: 2rem 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .md-body h1 {
            font-size: 3rem;
            margin-top: -2.5rem;
            margin-left: -2.5rem;
            margin-right: -2.5rem;
            padding: 2.5rem 2.5rem;
          }
        }
        .md-body h1::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(90deg, ${accentColor}1A 0%, ${accentColor}05 60%, transparent 100%);
          border: none;
          box-shadow: 0 10px 40px -10px ${accentColor}60;
          border-radius: 8px 8px 0 0;
        }
        @media (min-width: 640px) {
          .md-body h1::before {
            border-radius: 12px 12px 0 0;
          }
        }

        .md-body h2, .md-body h3, .md-body h4 {
          position: relative;
          padding: 0.6rem 1rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 800;
          background: linear-gradient(90deg, ${accentColor}, ${accentColor}aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          z-index: 1;
        }
        .md-body h2::before, .md-body h3::before, .md-body h4::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(90deg, ${accentColor}15 0%, transparent 80%);
          border: 1px solid ${accentColor}33;
          border-left: 4px solid ${accentColor};
          box-shadow: 0 4px 15px -3px ${accentColor}30;
          border-radius: 6px;
        }
        .md-body h1 code, .md-body h2 code, .md-body h3 code, .md-body h4 code {
          -webkit-text-fill-color: initial;
        }
        ` : ''}
        
        .intro-page-content h1 {
          font-size: 2.5rem;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.025em;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 640px) {
          .intro-page-content h1 {
            font-size: 3.5rem;
          }
        }
        @media (min-width: 1024px) {
          .intro-page-content h1 {
            font-size: 4rem;
          }
        }
      `}</style>

      {pages.map(({ title, titleLine, sections }, pageIdx) => {
        const isIntro = pageIdx === 0;
        const isCollapsed = collapsedPages[pageIdx];
        // Embedded content keeps no width constraint of its own — it already
        // lives inside the parent card's content area, and re-centering it
        // to a narrower max-width here would shrink it again inside that
        // already-narrower box.
        const widthClass = embedded
          ? "w-full"
          : width === "narrow"
            ? "max-w-3xl mx-auto"
            : width === "normal"
              ? "max-w-5xl mx-auto"
              : "max-w-[1400px] mx-auto";
        // Embedded content skips the page card's own border/shadow/background/
        // padding entirely — the parent box (ConceptEmbed's card) already
        // provides all of that, so this is bare content, not a second card.
        const wrapperClasses = embedded
          ? "w-full"
          : basicWebpage
            ? `w-full ${widthClass} mt-6`
            : `relative w-full ${widthClass} curled-shadow-wrapper mt-4`;

        const pageClasses = embedded || basicWebpage
          ? "w-full"
          : `relative bg-white dark:bg-[#0c1520] rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-10 border ${ui?.border || "border-slate-200 dark:border-slate-800"} w-full h-full`;

        // We use a pseudo-random fold size and corner based on pageIdx
        const hasFold = !embedded && !basicWebpage && (pageIdx * 17) % 5 === 0; // ~20% chance
        const foldSize = hasFold ? 30 + ((pageIdx * 7) % 3) * 10 : 0; // 30, 40, or 50
        const isFoldRight = pageIdx % 2 === 0;
        
        const clipPathStyle = embedded || !hasFold ? {} : {
           clipPath: isFoldRight 
             ? `polygon(0 0, calc(100% - ${foldSize}px) 0, 100% ${foldSize}px, 100% 100%, 0 100%)`
             : `polygon(${foldSize}px 0, 100% 0, 100% 100%, 0 100%, 0 ${foldSize}px)`
        };

        const getFontFamily = (f) => {
          switch (f) {
            case "sans":
              return "system-ui, sans-serif";
            case "serif":
              return "ui-serif, Georgia, serif";
            case "mono":
              return "ui-monospace, monospace";
            case "arial":
              return "Arial, sans-serif";
            case "helvetica":
              return "Helvetica, Arial, sans-serif";
            case "georgia":
              return "Georgia, serif";
            case "times":
              return '"Times New Roman", Times, serif';
            case "verdana":
              return "Verdana, Geneva, sans-serif";
            case "trebuchet":
              return '"Trebuchet MS", sans-serif';
            case "courier":
              return '"Courier New", Courier, monospace';
            case "consolas":
              return 'Consolas, "JetBrains Mono", "Cascadia Code", monospace';
            default:
              return "system-ui, sans-serif";
          }
        };

        const getFontSize = (fs) => {
          switch (fs) {
            case "sm":
              return "0.875rem";
            case "base":
              return "1rem";
            case "lg":
              return "1.125rem";
            case "xl":
              return "1.25rem";
            default:
              return "1rem";
          }
        };

        return (
          <div key={pageIdx} className={wrapperClasses}>
            {!embedded && hasFold && (
              <div 
                className={`absolute top-0 pointer-events-none z-10 filter ${isFoldRight ? 'drop-shadow-[-2px_2px_3px_rgba(0,0,0,0.15)] dark:drop-shadow-[-2px_2px_3px_rgba(0,0,0,0.4)]' : 'drop-shadow-[2px_2px_3px_rgba(0,0,0,0.15)] dark:drop-shadow-[2px_2px_3px_rgba(0,0,0,0.4)]'}`}
                style={isFoldRight ? { right: 0 } : { left: 0 }}
              >
                <div 
                  className="bg-slate-100 dark:bg-slate-800"
                  style={{
                     width: foldSize,
                     height: foldSize,
                     clipPath: isFoldRight ? 'polygon(0 0, 0 100%, 100% 100%)' : 'polygon(100% 0, 0 100%, 100% 100%)',
                     borderBottomLeftRadius: isFoldRight ? '6px' : '0',
                     borderBottomRightRadius: !isFoldRight ? '6px' : '0'
                  }}
                />
              </div>
            )}
            <div className={pageClasses} style={clipPathStyle}>
              {title && (
                <div 
                  className="group flex items-center justify-between cursor-pointer"
                  onClick={() => togglePage(pageIdx)}
                >
                  <div className="md-body flex-1">
                    <ChunkLineOffsetCtx.Provider value={titleLine}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={basicWebpage ? BASIC_MD_COMPONENTS : MD_COMPONENTS}
                      >
                        {title}
                      </ReactMarkdown>
                    </ChunkLineOffsetCtx.Provider>
                  </div>
                  <button className="ml-4 flex-shrink-0 p-2 rounded-md text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-all">
                    {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </button>
                </div>
              )}
              {!isCollapsed && (
              <div
                className={`md-body ${isIntro ? "intro-page-content" : ""}`}
              style={{
                fontFamily: getFontFamily(font),
                lineHeight:
                  lineHeight === "compact"
                    ? "1.4"
                    : lineHeight === "relaxed"
                      ? "1.8"
                      : "1.6",
                fontSize: getFontSize(fontSize),
                textAlign: textAlign === "justify" ? "justify" : "left",
              }}
            >
              {sections.map((section, secIdx) => {
                const globalIdx = `${pageIdx}-${secIdx}`;
                if (section.type === "code") {
                  return (
                    <ReactMarkdown
                      key={globalIdx}
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                      components={basicWebpage ? BASIC_MD_COMPONENTS : MD_COMPONENTS}
                    >
                      {section.content}
                    </ReactMarkdown>
                  );
                }
                const isPlaying = playingIdx === globalIdx;
                return (
                  <div ref={node => { if (node) sectionRefs.current.set(globalIdx, node); else sectionRefs.current.delete(globalIdx); }} key={globalIdx} className={`relative group ${secIdx === 0 ? "" : "mt-4"}`}>
                    {!basicWebpage && (
                      <button
                        onClick={() => handlePlay(globalIdx, section.content)}
                        title={isPlaying ? (isPaused ? "Resume reading" : "Pause reading") : "Read aloud"}
                        className={`absolute -top-3 -right-3 z-10 flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-all shadow-sm ${
                          isPlaying
                            ? "opacity-100 text-cyan-600 border-cyan-300 bg-cyan-50 dark:text-cyan-300 dark:border-cyan-700/60 dark:bg-cyan-900/20"
                            : `opacity-0 group-hover:opacity-100 text-slate-500 bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700`
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                            &nbsp;{isPaused ? "Resume" : "Pause"}
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-2.5 h-2.5" />
                            &nbsp;Read
                          </>
                        )}
                      </button>
                    )}
                    <ChunkLineOffsetCtx.Provider value={section.startLine}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={basicWebpage ? BASIC_MD_COMPONENTS : MD_COMPONENTS}
                      >
                        {normalizeDisplayMath(
                          convertTexDelimiters(section.content),
                        )}
                      </ReactMarkdown>
                    </ChunkLineOffsetCtx.Provider>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
});

export default function MarkdownHub() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const tree = useMemo(() => buildTree(Object.keys(DOCS_MODULES)), []);
  // When the concept window is docked to an edge, shrink this whole page to
  // the other half instead of letting the (opaque, fixed-position) window
  // merely sit on top of content that's still full width underneath it.
  const { dockedEdge } = useConceptWindow();

  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("mdhub_active_tab") || "tutorials";
    } catch {
      return "tutorials";
    }
  });
  const [activeFile, setActiveFile] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [backendLoading, setBackendLoading] = useState(true);
  const [userDocs, setUserDocs] = useState(loadPersonal);
  const [overrideDocs, setOverrideDocs] = useState([]);
  const [activeDocType, setActiveDocType] = useState(null);
  const [activeUserId, setActiveUserId] = useState(null);
  const [activeOverridePath, setActiveOverridePath] = useState(null);
  const [editorName, setEditorName] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const editorInstanceRef = useRef(null);

  const [typographyOpen, setTypographyOpen] = useState(false);

  // Toolbar insert for the Monaco-backed editor below — real snippet/tabstop
  // support, same mechanism as the Lesson Builder's MarkdownCellEditor.
  const insertIntoEditor = useCallback((btn) => {
    const ed = editorInstanceRef.current;
    if (!ed) return;
    if (btn.plain != null) {
      ed.trigger("keyboard", "type", { text: btn.plain });
    } else if (btn.snippet) {
      ed.trigger("keyboard", "editor.action.insertSnippet", {
        snippet: btn.snippet,
      });
    }
    ed.focus();
  }, []);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tutorialOverrideActive, setTutorialOverrideActive] = useState(false);
  const [codeAlongOpen, setCodeAlongOpen] = useState(false);
  const [docsNavOpen, setDocsNavOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 640,
  );
  // Tracks the Studio panel's own rendered width, not the viewport's — when
  // code-along is docked, the panel is squeezed to 50vw of the window while
  // window.innerWidth stays desktop-sized, so a `sm:` media query alone
  // can't tell the sidebar to stop shoving that already-narrow content over.
  const panelRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 1024),
  );
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setPanelWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [pendingRun, setPendingRun] = useState(null);
  const [codeAlongPx, setCodeAlongPx] = useState(560);
  const [splitterDragging, setSplitterDragging] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("mdhub_explorer_width")) || 300;
    } catch {
      return 300;
    }
  });
  // "Narrow" means there isn't room for the sidebar's current width plus a
  // reasonably readable content column beside it — true on phones, and also
  // on a desktop once this panel itself gets docked/squeezed down (e.g.
  // sharing the screen with a code-along window), even though the browser
  // window itself is nowhere near mobile-sized.
  const effectiveSidebarWidth = codeAlongOpen
    ? Math.min(explorerWidth, 240)
    : explorerWidth;
  const isNarrowPanel = panelWidth < effectiveSidebarWidth + 480;
  const [explorerSplitterDragging, setExplorerSplitterDragging] = useState(false);
  const [adaOpen, setAdaOpen] = useState(false);
  const [workspaceSnap, setWorkspaceSnap] = useState({
    code: "",
    language: "",
    filename: "",
    fileList: [],
    getTerminalOutput: () => "",
  });
  const isDark = useIsDark();
  const [sidebarTab, setSidebarTab] = useState("docs"); // 'docs' | 'toc' | 'notes'
  const [docSearch, setDocSearch] = useState("");
  const [notes, setNotes] = useState(loadNotes);
  const [noteSearch, setNoteSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState(null);

  const [docProgress, setDocProgress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mdhub_doc_progress") || "{}");
    } catch {
      return {};
    }
  });
  const scrollPercentageRef = useRef(0);
  const prevActiveFileRef = useRef(activeFile);
  const [hideTopBar, setHideTopBar] = useState(false);
  const lastScrollTopRef = useRef(0);
  const hideTopBarRef = useRef(false);

  useEffect(() => {
    if (prevActiveFileRef.current && prevActiveFileRef.current !== activeFile) {
      const prevPath = prevActiveFileRef.current;
      const percentage = scrollPercentageRef.current;
      setDocProgress((prev) => {
        const next = { ...prev, [prevPath]: percentage };
        try {
          localStorage.setItem("mdhub_doc_progress", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    prevActiveFileRef.current = activeFile;
    scrollPercentageRef.current = 0;
  }, [activeFile]);

  const handleContentScroll = useCallback(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const scrollTop = el.scrollTop;
    
    let percentage = 0;
    if (scrollHeight <= clientHeight) {
      percentage = 100;
    } else {
      percentage = Math.max(0, Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100));
    }
    scrollPercentageRef.current = percentage;

    // Auto-hide the top bar on scroll-down, bring it back on scroll-up, so
    // the sticky lesson heading takes over that space while reading — only
    // once past a small threshold so the bar doesn't flicker right at the top.
    const delta = scrollTop - lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;
    if (scrollTop < 40) {
      if (hideTopBarRef.current) {
        hideTopBarRef.current = false;
        setHideTopBar(false);
      }
    } else if (delta > 4 && !hideTopBarRef.current) {
      hideTopBarRef.current = true;
      setHideTopBar(true);
    } else if (delta < -4 && hideTopBarRef.current) {
      hideTopBarRef.current = false;
      setHideTopBar(false);
    }

    // Direct DOM manipulation for real-time 60fps progress bar updates
    if (prevActiveFileRef.current) {
      const safeId = prevActiveFileRef.current.replace(/[^a-zA-Z0-9-]/g, '-');
      const progressEl = document.getElementById(`progress-${safeId}`);
      if (progressEl) {
        progressEl.style.width = `${percentage}%`;
        // Optionally update color if reaching 100% (done via state on tab switch, but we can fake it here)
        // Usually, users don't mind the color snapping when they leave, but the width update is crucial.
      }
    }
  }, []);


  const createNote = useCallback(() => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newNote = {
      id,
      title: "Untitled note",
      series: seriesFromPath(activeFile),
      docPath: activeFile,
      docTitle: activeFile ? displayName(activeFile.split("/").pop()) : "",
      body: "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => {
      const updated = [newNote, ...prev];
      saveNotes(updated);
      return updated;
    });
    setActiveNoteId(id);
    setSidebarTab("notes");
  }, [activeFile]);

  const updateNote = useCallback((id, patch) => {
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
      );
      saveNotes(updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotes(updated);
      return updated;
    });
    setActiveNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const filteredNotesBySeries = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    const matches = q
      ? notes.filter((n) =>
          [n.title, n.series, n.body]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : notes;
    const groups = new Map();
    for (const note of matches) {
      const key = note.series || "General";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(note);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [notes, noteSearch]);

  // Flat list of all doc paths for search — derived once from the glob keys
  const allDocPaths = useMemo(() => Object.keys(DOCS_MODULES), []);

  const searchResults = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return allDocPaths
      .filter((p) => {
        const rel = p.slice(PREFIX.length).toLowerCase();
        return q.split(/\s+/).every((word) => rel.includes(word));
      })
      .slice(0, 40)
      .map((p) => {
        const rel = p.slice(PREFIX.length);
        const parts = rel.split("/");
        const fileName = parts[parts.length - 1];
        const folder = parts.slice(0, -1).join(" / ");
        return {
          path: p,
          fileName: displayName(fileName),
          folder: displayName(folder),
        };
      });
  }, [docSearch, allDocPaths]);
  const contentScrollRef = useRef(null);
  const headings = useMemo(() => {
    if (!content) return [];
    // Id scheme matches headingIdFromNode's, above: text slug + 1-indexed
    // source line number, since a line number is unique with no counting
    // needed. Fenced code blocks are the catch for the scan itself: a
    // shell/Python sample's `# comment` line matches the bare heading regex
    // but is never rendered as a real <h1-4>, so a naive per-line scan
    // invents phantom ToC entries with no matching DOM id (click does
    // nothing) — skip anything between fence markers.
    const result = [];
    let inFence = false;
    let fenceMarker = null;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0].repeat(3);
        if (!inFence) {
          inFence = true;
          fenceMarker = marker;
        } else if (line.trim().startsWith(fenceMarker)) {
          inFence = false;
        }
        continue;
      }
      if (inFence) continue;
      const m = line.match(/^(#{1,4}) (.+)/);
      if (!m) continue;
      const text = m[2]
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();
      result.push({ level: m[1].length, text, id: `${headingId(text)}-${i + 1}` });
    }
    return result;
  }, [content]);
  const visibleHeadings = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (sidebarTab !== "toc" || !q) return headings;
    return headings.filter((h) => h.text.toLowerCase().includes(q));
  }, [headings, docSearch, sidebarTab]);
  // Duplicated into the Reference tab so a reader mid-way through a
  // lesson's code can look a term or an object/method (What it is /
  // Implementation / Its use / CRC breakdown) back up without scrolling to
  // the Header — see extractHeaderListSection's own comment for the exact
  // format this matches.
  const termsSection = useMemo(
    () => extractHeaderListSection(content, TERMS_LABEL_PATTERNS),
    [content],
  );
  const objectsSection = useMemo(
    () => extractHeaderListSection(content, OBJECTS_LABEL_PATTERNS),
    [content],
  );
  // The shared doc-search box doubles as the Reference tab's own filter —
  // typing there narrows Terms/Objects down to entries that actually
  // match (name or definition, either one) instead of leaving every
  // non-matching card in the way, with the surviving matches highlighted
  // in place. Scoped to only fire while Reference is the active tab so
  // leftover text from a Documents/On-This-Page search doesn't silently
  // filter this list before it's even been looked at.
  const referenceQuery =
    sidebarTab === "reference" ? docSearch.trim().toLowerCase() : "";
  const filteredTermsMd = useMemo(() => {
    const blocks = splitTopLevelBlocks(termsSection);
    const kept = referenceQuery
      ? blocks.filter((b) => b.toLowerCase().includes(referenceQuery))
      : blocks;
    return highlightMatches(kept.join(""), referenceQuery);
  }, [termsSection, referenceQuery]);
  const filteredObjectsMd = useMemo(() => {
    const blocks = splitTopLevelBlocks(objectsSection);
    const kept = referenceQuery
      ? blocks.filter((b) => b.toLowerCase().includes(referenceQuery))
      : blocks;
    return highlightMatches(kept.join(""), referenceQuery);
  }, [objectsSection, referenceQuery]);
  const scrollToHeading = useCallback((id) => {
    const el = contentScrollRef.current?.querySelector(
      `[id="${CSS.escape(id)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  // Heading id (or the '__TOP__' sentinel) to jump to, instantly, once the
  // doc we're about to load finishes rendering — set by selectTutorial,
  // consumed below.
  const scrollRestoreRef = useRef(null);
  const scrollSaveTimerRef = useRef(null);
  // The heading currently crossing the vertical middle of the reading pane —
  // drives both the ToC's "you are here" highlight and its "already read"
  // progress marks, further down.
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  // Jump to the saved reading position (or the top, for "Next Lesson") right
  // after a tutorial finishes loading.
  useEffect(() => {
    if (tab !== "tutorials" || loading || !content) return;
    const target = scrollRestoreRef.current;
    if (!target) return;
    const raf = requestAnimationFrame(() => {
      if (target === "__TOP__") {
        if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
        setActiveHeadingId(null);
      } else {
        const el = contentScrollRef.current?.querySelector(
          `[id="${CSS.escape(target)}"]`,
        );
        el?.scrollIntoView({ behavior: "auto", block: "start" });
      }
    });
    scrollRestoreRef.current = null;
    return () => cancelAnimationFrame(raf);
  }, [tab, loading, content]);

  // Track whichever heading is crossing the vertical middle of the reading
  // pane and remember it per-doc, so a reload can restore "where I was" —
  // not just "which lesson I was on." Also drives the live ToC highlight.
  useEffect(() => {
    if (tab !== "tutorials" || loading || !content) return;
    const container = contentScrollRef.current;
    if (!container) return;
    const headingEls = container.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
    if (!headingEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        setActiveHeadingId(visible.target.id);
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = setTimeout(() => {
          saveScrollPosition(activeFile, visible.target.id);
        }, 300);
      },
      { root: container, rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    headingEls.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      clearTimeout(scrollSaveTimerRef.current);
    };
  }, [tab, loading, content, activeFile]);
  const {
    studioTheme,
    setStudioTheme,
    themeStyles,
    typography,
    setTypography,
  } = useGlobalTheme();
  const ui = themeStyles.ui;
  const accentColor = STUDIO_THEMES[studioTheme]?.accentHex ?? "#0ea5e9";

  const handleCodeChange = useCallback((snap) => {
    setWorkspaceSnap(snap);
  }, []);

  const handleSplitterDrag = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = codeAlongPx;
      setSplitterDragging(true);
      const onMove = (ev) => {
        const delta = startX - ev.clientX;
        setCodeAlongPx(
          Math.max(300, Math.min(startW + delta, window.innerWidth - 350)),
        );
      };
      const onUp = () => {
        setSplitterDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [codeAlongPx],
  );

  const handleExplorerSplitterDrag = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = explorerWidth;
      setExplorerSplitterDragging(true);
      const onMove = (ev) => {
        const delta = ev.clientX - startX;
        setExplorerWidth(
          Math.max(200, Math.min(startW + delta, window.innerWidth - 400)),
        );
      };
      const onUp = () => {
        setExplorerSplitterDragging(false);
        setExplorerWidth((width) => {
          try {
            localStorage.setItem("mdhub_explorer_width", String(width));
          } catch {}
          return width;
        });
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [explorerWidth],
  );

  const handleRunInCodeAlong = useCallback((code, monacoLang) => {
    const wsLang = WORKSPACE_LANG[monacoLang] || "javascript";
    setCodeAlongOpen(true);
    setPendingRun({ code, language: wsLang, key: Date.now() });
  }, []);

  const overriddenPaths = useMemo(
    () => new Set(overrideDocs.map((doc) => doc.path)),
    [overrideDocs],
  );
  const activeUserDoc = userDocs.find((doc) => doc.id === activeUserId) || null;
  const activeOverrideDoc =
    overrideDocs.find((doc) => doc.path === activeOverridePath) || null;
  const editorDocKey =
    activeDocType === "user"
      ? `user:${activeUserId}`
      : `override:${activeOverridePath}`;

  // The next file in numeric/alphabetic order within the current lesson's
  // own folder (e.g. "Lesson 6b..." → "Lesson 6c..."), if one exists.
  const nextTutorial = useMemo(() => {
    if (!activeFile) return null;
    const siblings = findSiblingFiles(tree, activeFile);
    if (!siblings) return null;
    const idx = siblings.findIndex((file) => file.path === activeFile);
    if (idx === -1 || idx === siblings.length - 1) return null;
    return siblings[idx + 1];
  }, [tree, activeFile]);

  const refreshDocsIndex = useCallback(async () => {
    setBackendLoading(true);
    try {
      const response = await fetch(buildOptionalBackendUrl("/api/docs"));
      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }
      const payload = await response.json();
      setBackendReady(true);
      setUserDocs(payload.userDocs || []);
      setOverrideDocs(payload.overrideDocs || []);
    } catch {
      setBackendReady(false);
      setOverrideDocs([]);
      const localDocs = loadPersonal();
      setUserDocs(localDocs);
    } finally {
      setBackendLoading(false);
    }
  }, []);

  const selectTutorial = useCallback(
    async (modulePath, { resetScroll = false } = {}) => {
      // On a narrow panel the sidebar is a full-width overlay covering the
      // reading pane — picking a doc should dismiss it like a mobile drawer,
      // same as tapping a link in any off-canvas nav. Desktop's inline
      // sidebar stays open, unaffected.
      if (isNarrowPanel) setDocsNavOpen(false);
      setActiveFile(modulePath);
      setLoading(true);
      setTutorialOverrideActive(false);
      // Both of these used to leak across doc switches: activeHeadingId is a
      // text-derived id, and lessons reuse the same heading names ("The
      // Problem", "CS Lens"...) constantly — without this reset, whichever
      // heading was centered in the PREVIOUS doc could coincidentally match
      // an id in the new one and show as "already read" before you'd
      // scrolled a single pixel into it. Same idea for scrollTop: the
      // scroll container is reused across docs, so it stays wherever the
      // old doc left it until the restore effect below corrects it one
      // frame later — resetting to 0 now avoids a flash of the new doc's
      // content shown at the old doc's scroll position.
      setActiveHeadingId(null);
      if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
      // Following "Next Lesson" should land at the top, like opening a new
      // chapter — not wherever that lesson happened to be left off before.
      scrollRestoreRef.current = resetScroll
        ? "__TOP__"
        : readScrollMap()[modulePath] || null;
      try {
        localStorage.setItem("mdhub_last_tutorial", modulePath);
      } catch {}
      try {
        const bundled = await DOCS_MODULES[modulePath]();
        let resolvedContent = bundled;
        if (backendReady) {
          const response = await fetch(
            buildOptionalBackendUrl("/api/docs/override", { path: modulePath }),
          );
          if (response.ok) {
            const payload = await response.json();
            if (payload.doc?.content) {
              resolvedContent = payload.doc.content;
              setTutorialOverrideActive(true);
            }
          }
        }
        setContent(resolvedContent);
      } catch {
        setContent(`*Could not load file: ${modulePath}*`);
      } finally {
        setLoading(false);
      }
    },
    [backendReady],
  );

  const openNoteSource = useCallback(
    (docPath) => {
      if (!docPath) return;
      selectTutorial(docPath);
      setSidebarTab("docs");
    },
    [selectTutorial],
  );

  const docsCtxValue = useMemo(
    () => ({
      isDark: themeStyles.isDark,
      monacoTheme: themeStyles.monaco,
      onRun: handleRunInCodeAlong,
      codeAlongOpen,
      // In the Editor tab, an override doc's *non-concept* relative links
      // (concept links resolve by filename alone, see findConceptDocPath)
      // are still relative to the tutorial path it overrides
      // (`activeOverridePath`), so those keep resolving in that live
      // preview too. Freeform user docs have no such path, so this is null
      // for those.
      activeFile: tab === "tutorials" ? activeFile : activeOverridePath,
      onDocLink: selectTutorial,
      onNavigate: navigate,
      scrollToHeading,
    }),
    [
      themeStyles,
      handleRunInCodeAlong,
      codeAlongOpen,
      activeFile,
      activeOverridePath,
      selectTutorial,
      tab,
      navigate,
      scrollToHeading,
    ],
  );

  useEffect(() => {
    refreshDocsIndex();
  }, [refreshDocsIndex]);

  // Remember which tab (Tutorials vs Editor) was actually on screen, so a
  // reload can put it back — separately from *which doc* was open in each.
  useEffect(() => {
    try {
      localStorage.setItem("mdhub_active_tab", tab);
    } catch {}
  }, [tab]);

  // Restore the last-viewed user doc's content in the background regardless
  // of which tab is currently active — it needs to be ready the instant the
  // user switches to Editor, but it must NOT force-switch the tab itself
  // (that used to be the bug: reopening while reading a lesson would always
  // jump to Editor, because this ran unconditionally). Passing `false` loads
  // the doc without calling setTab — the tab's own initial state above
  // already read the correct one from localStorage.
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("mdhub_last_doc") || "null",
      );
      if (!saved) return;
      if (saved.type === "user") {
        const docs = loadPersonal();
        const doc = docs.find((d) => d.id === saved.id);
        if (doc) selectUserDoc(doc, false);
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const lastTutorial = (() => {
      try {
        return localStorage.getItem("mdhub_last_tutorial");
      } catch {
        return null;
      }
    })();
    if (lastTutorial && DOCS_MODULES[lastTutorial]) {
      selectTutorial(lastTutorial);
      return;
    }
    const readme = Object.keys(DOCS_MODULES).find((modulePath) =>
      modulePath.endsWith("README.md"),
    );
    if (readme) selectTutorial(readme);
  }, [selectTutorial]);

  // When code-along opens, Monaco measures its container before the flex layout
  // settles (especially with a minimal sidebar). A resize event forces all
  // ResizeObservers (including Monaco's automaticLayout) to re-measure.
  useEffect(() => {
    if (!codeAlongOpen) return;
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    return () => clearTimeout(t);
  }, [codeAlongOpen]);

  const selectUserDoc = useCallback((doc, switchTab = true) => {
    setActiveDocType("user");
    setActiveUserId(doc.id);
    setActiveOverridePath(null);
    setEditorName(doc.name || "Untitled");
    setEditorContent(doc.content || "");
    if (switchTab) setTab("editor");
    setPreviewMode(true); // always render, not raw textarea — user can click Edit mode if needed
    try {
      localStorage.setItem(
        "mdhub_last_doc",
        JSON.stringify({ type: "user", id: doc.id }),
      );
    } catch {}
  }, []);

  const selectOverrideDoc = useCallback((doc, switchTab = true) => {
    setActiveDocType("override");
    setActiveOverridePath(doc.path);
    setActiveUserId(null);
    setEditorName(doc.name || displayName(doc.path.split("/").pop()));
    setEditorContent(doc.content || "");
    if (switchTab) setTab("editor");
  }, []);

  const createUserDoc = useCallback(async () => {
    if (backendReady) {
      const response = await fetch(buildOptionalBackendUrl("/api/docs/user"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled",
          content: "# New Document\n\nStart writing here...",
        }),
      });
      const payload = await response.json();
      if (response.ok && payload.doc) {
        await refreshDocsIndex();
        selectUserDoc(payload.doc);
      }
      return;
    }

    const file = createLocalDoc();
    const updated = [...userDocs, file];
    setUserDocs(updated);
    savePersonal(updated);
    selectUserDoc(file);
  }, [backendReady, refreshDocsIndex, selectUserDoc, userDocs]);

  const openTutorialOverrideEditor = useCallback(async () => {
    if (!activeFile) return;

    let name = displayName(activeFile.split("/").pop());
    let docContent = content;

    if (backendReady) {
      const response = await fetch(
        buildOptionalBackendUrl("/api/docs/override", { path: activeFile }),
      );
      if (response.ok) {
        const payload = await response.json();
        if (payload.doc) {
          name = payload.doc.name || name;
          docContent = payload.doc.content || docContent;
        }
      }
    }

    setActiveDocType("override");
    setActiveOverridePath(activeFile);
    setActiveUserId(null);
    setEditorName(name);
    setEditorContent(docContent);
    setTab("editor");
    setPreviewMode(false);
  }, [activeFile, backendReady, content]);

  const saveEditorDocument = useCallback(async () => {
    if (!activeDocType) return;
    setIsSaving(true);
    try {
      if (activeDocType === "user") {
        if (backendReady && activeUserId) {
          await fetch(
            buildOptionalBackendUrl("/api/docs/user", { id: activeUserId }),
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: editorName,
                content: editorContent,
              }),
            },
          );
          await refreshDocsIndex();
          return;
        }

        if (activeUserId) {
          const updated = userDocs.map((doc) =>
            doc.id === activeUserId
              ? {
                  ...doc,
                  name: editorName,
                  content: editorContent,
                  updatedAt: new Date().toISOString(),
                }
              : doc,
          );
          setUserDocs(updated);
          savePersonal(updated);
        }
        return;
      }

      if (activeDocType === "override" && activeOverridePath && backendReady) {
        await fetch(
          buildOptionalBackendUrl("/api/docs/override", {
            path: activeOverridePath,
          }),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editorName, content: editorContent }),
          },
        );
        await refreshDocsIndex();
        if (activeFile === activeOverridePath) {
          setContent(editorContent);
          setTutorialOverrideActive(true);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    activeDocType,
    activeFile,
    activeOverridePath,
    activeUserId,
    backendReady,
    editorContent,
    editorName,
    refreshDocsIndex,
    userDocs,
  ]);

  useEffect(() => {
    if (!activeDocType) return;
    const timeout = setTimeout(() => {
      saveEditorDocument();
    }, 700);
    return () => clearTimeout(timeout);
  }, [
    activeDocType,
    activeUserId,
    activeOverridePath,
    editorName,
    editorContent,
    saveEditorDocument,
  ]);

  const deleteUserDoc = useCallback(
    async (id) => {
      if (backendReady) {
        await fetch(buildOptionalBackendUrl("/api/docs/user", { id }), {
          method: "DELETE",
        });
        await refreshDocsIndex();
      } else {
        const updated = userDocs.filter((doc) => doc.id !== id);
        setUserDocs(updated);
        savePersonal(updated);
      }

      if (activeUserId === id) {
        setActiveUserId(null);
        setActiveDocType(null);
        setEditorName("");
        setEditorContent("");
      }
    },
    [activeUserId, backendReady, refreshDocsIndex, userDocs],
  );

  const deleteOverrideDoc = useCallback(
    async (docPath) => {
      if (!backendReady) return;
      await fetch(
        buildOptionalBackendUrl("/api/docs/override", { path: docPath }),
        { method: "DELETE" },
      );
      await refreshDocsIndex();

      if (activeOverridePath === docPath) {
        setActiveOverridePath(null);
        setActiveDocType(null);
        setEditorName("");
        setEditorContent("");
      }

      if (activeFile === docPath) {
        setTutorialOverrideActive(false);
        const bundled = await DOCS_MODULES[docPath]();
        setContent(bundled);
      }
    },
    [activeFile, activeOverridePath, backendReady, refreshDocsIndex],
  );

  const downloadTextFile = useCallback((filename, text) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  const downloadCurrentMarkdown = useCallback(() => {
    if (tab === "tutorials" && activeFile) {
      downloadTextFile(activeFile.split("/").pop(), content);
      return;
    }

    if (tab === "editor" && activeDocType) {
      const name =
        (editorName || "document").replace(/[^a-z0-9-_ ]/gi, "") || "document";
      downloadTextFile(`${name}.md`, editorContent);
    }
  }, [
    activeDocType,
    activeFile,
    content,
    downloadTextFile,
    editorContent,
    editorName,
    tab,
  ]);

  const exportSharePack = useCallback(async () => {
    if (!activeDocType) return;

    if (backendReady) {
      const query =
        activeDocType === "user"
          ? { type: "user", id: activeUserId }
          : { type: "override", path: activeOverridePath };
      const response = await fetch(
        buildOptionalBackendUrl("/api/docs/share/export", query),
      );
      if (response.ok) {
        const payload = await response.json();
        const name =
          (editorName || "document").replace(/[^a-z0-9-_ ]/gi, "") ||
          "document";
        downloadTextFile(
          `${name}.open-calc-doc.json`,
          JSON.stringify(payload, null, 2),
        );
      }
      return;
    }

    if (activeDocType === "user" && activeUserDoc) {
      const pack = {
        kind: "open-calc-doc-share",
        version: 1,
        docType: "user",
        exportedAt: new Date().toISOString(),
        doc: activeUserDoc,
      };
      const name =
        (editorName || "document").replace(/[^a-z0-9-_ ]/gi, "") || "document";
      downloadTextFile(
        `${name}.open-calc-doc.json`,
        JSON.stringify(pack, null, 2),
      );
    }
  }, [
    activeDocType,
    activeOverridePath,
    activeUserDoc,
    activeUserId,
    backendReady,
    downloadTextFile,
    editorName,
  ]);

  const onImportFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const raw = await file.text();
      event.target.value = "";

      // .md file → create a new user doc directly
      if (file.name.toLowerCase().endsWith(".md")) {
        const name =
          file.name.replace(/\.md$/i, "").replace(/[-_]/g, " ") ||
          "Imported Doc";
        const fileDoc = { ...createLocalDoc(), name, content: raw };
        if (backendReady) {
          await fetch(buildOptionalBackendUrl("/api/docs/user"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, content: raw }),
          });
          await refreshDocsIndex();
        } else {
          const updated = [...userDocs, fileDoc];
          setUserDocs(updated);
          savePersonal(updated);
        }
        selectUserDoc(fileDoc);
        setPreviewMode(true);
        return;
      }

      // .json share pack
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      if (backendReady) {
        await fetch(buildOptionalBackendUrl("/api/docs/share/import"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        await refreshDocsIndex();
      } else if (parsed.docType === "user" && parsed.doc) {
        const fileDoc = {
          ...createLocalDoc(),
          name: parsed.doc.name || "Imported Document",
          content: parsed.doc.content || "",
        };
        const updated = [...userDocs, fileDoc];
        setUserDocs(updated);
        savePersonal(updated);
        selectUserDoc(fileDoc);
      }
    },
    [backendReady, refreshDocsIndex, selectUserDoc, userDocs],
  );

  const activeTitle =
    tab === "tutorials"
      ? activeFile?.replace("/src/docs/", "") || "Bundled docs"
      : editorName || "Markdown document";

  return (
    <>
      <style>{getMdCss(themeStyles.md, typography.basicWebpage)}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.json,.open-calc-doc.json"
        className="hidden"
        onChange={onImportFile}
      />

      <div
        ref={panelRef}
        className={`flex flex-col h-[100vh] top-0 bottom-0 ${ui.bg0} ${ui.txt1} font-sans overflow-hidden fixed z-[1650] transition-[left,right,width] duration-200`}
        style={
          dockedEdge === "right"
            ? { left: 0, right: "50vw", width: "50vw" }
            : dockedEdge === "left"
              ? { left: "50vw", right: 0, width: "50vw" }
              : { left: 0, right: 0, width: "100%" }
        }
      >
        <div
          className={`${ui.bg1} bg-opacity-80 backdrop-blur-xl border-b ${ui.border} flex items-center justify-between px-3 sm:px-6 shrink-0 z-50 w-full gap-4 transition-all duration-300`}
          style={{
            height: hideTopBar ? 0 : "4rem",
            borderBottomWidth: hideTopBar ? 0 : undefined,
            overflow: hideTopBar ? "hidden" : "visible",
          }}
        >
          {/* ── LEFT SECTION: Navigation & Context ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Exit Button */}
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${ui.border} ${ui.bg0} ${ui.hoverBg} ${ui.hoverTx} transition-all duration-300 shadow-sm hover:shadow-md font-semibold text-xs group`}
              title="Exit Studio"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Exit</span>
            </button>

            <div
              className={`w-px h-6 ${ui.border} mx-1 hidden sm:block border-l opacity-50`}
            ></div>

            {/* Nav Toggle */}
            <button
              onClick={() => setDocsNavOpen((v) => !v)}
              className={`p-2 rounded-full border border-transparent ${ui.txt2} ${ui.hoverBg} ${ui.hoverTx} transition-all duration-300 hover:scale-105`}
              title={docsNavOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Title */}
            <span
              className={`text-sm font-extrabold ${ui.txt1} tracking-tight ml-1 mr-3 hidden md:inline-block bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-300`}
            >
              Studio
            </span>

            {/* Tab switcher */}
            <div
              className={`flex ${ui.bg2} p-1 rounded-full gap-1 shadow-inner relative`}
            >
              {["tutorials", "editor"].map((nextTab) => (
                <button
                  key={nextTab}
                  onClick={() => setTab(nextTab)}
                  className={`relative px-4 py-1.5 text-xs font-bold capitalize rounded-full transition-all duration-300 ease-out z-10 ${
                    tab === nextTab
                      ? `${ui.txt1} drop-shadow-sm`
                      : `${ui.txt2} hover:opacity-80`
                  }`}
                >
                  {tab === nextTab && (
                    <span
                      className={`absolute inset-0 ${ui.bg0} rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] -z-10`}
                    />
                  )}
                  {nextTab === "tutorials" ? "📖 Tutorials" : "✏️ Editor"}
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT SECTION: Actions & Tools ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme picker */}
            <div className="relative hidden sm:block group">
              <select
                value={studioTheme}
                onChange={(e) => {
                  setStudioTheme(e.target.value);
                  localStorage.setItem("studio_theme", e.target.value);
                }}
                className={`appearance-none text-xs font-semibold rounded-full pl-3 pr-8 py-1.5 border ${ui.border} ${ui.bg0} ${ui.txt1} cursor-pointer focus:outline-none shadow-sm hover:shadow transition-shadow`}
                title="Studio theme"
              >
                {Object.entries(STUDIO_THEMES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-3.5 h-3.5 absolute right-2.5 top-2 pointer-events-none ${ui.txt2} group-hover:${ui.txt1} transition-colors`}
              />
            </div>

            <div
              className={`w-px h-6 ${ui.border} mx-1 hidden sm:block border-l opacity-50`}
            ></div>

            {/* Typography picker */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setTypographyOpen(!typographyOpen)}
                className={`p-1.5 rounded-full border border-transparent ${ui.txt2} ${ui.hoverBg} ${ui.hoverTx} transition-all duration-300 hover:scale-105 ${typographyOpen ? ui.bg0 : ""}`}
                title="Typography settings"
              >
                <Type className="w-4 h-4" />
              </button>

              {typographyOpen && (
                <div
                  className={`absolute top-full right-0 mt-3 w-72 p-4 rounded-xl shadow-xl border ${ui.border} ${ui.bg0} z-50`}
                >
                  <div className="space-y-4">
                    <div>
                      <label
                        className={`block text-[10px] uppercase font-bold tracking-widest ${ui.txt2} mb-2`}
                      >
                        Font Family
                      </label>
                      <div className="relative group">
                        <select
                          value={typography.font}
                          onChange={(e) =>
                            setTypography({ font: e.target.value })
                          }
                          className={`appearance-none w-full text-xs font-semibold rounded-lg pl-3 pr-8 py-2 border border-transparent bg-slate-100 dark:bg-slate-800 ${ui.txt1} cursor-pointer focus:outline-none hover:opacity-90`}
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className={`w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none ${ui.txt2} group-hover:${ui.txt1} transition-colors`}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-[10px] uppercase font-bold tracking-widest ${ui.txt2} mb-2`}
                      >
                        Font Size
                      </label>
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {["sm", "base", "lg", "xl"].map((fs) => (
                          <button
                            key={fs}
                            onClick={() => setTypography({ fontSize: fs })}
                            className={`flex-1 uppercase text-[10px] py-1.5 rounded-md transition-colors ${typography.fontSize === fs ? "bg-white dark:bg-slate-700 shadow-sm font-bold " + ui.txt1 : ui.txt2 + " hover:opacity-80"}`}
                          >
                            {fs}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-[10px] uppercase font-bold tracking-widest ${ui.txt2} mb-2`}
                      >
                        Text Align
                      </label>
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {["left", "justify"].map((ta) => (
                          <button
                            key={ta}
                            onClick={() => setTypography({ textAlign: ta })}
                            className={`flex-1 capitalize text-xs py-1.5 rounded-md transition-colors ${typography.textAlign === ta ? "bg-white dark:bg-slate-700 shadow-sm font-bold " + ui.txt1 : ui.txt2 + " hover:opacity-80"}`}
                          >
                            {ta}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-[10px] uppercase font-bold tracking-widest ${ui.txt2} mb-2`}
                      >
                        Reading Width
                      </label>
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {["narrow", "normal", "wide"].map((w) => (
                          <button
                            key={w}
                            onClick={() => setTypography({ width: w })}
                            className={`flex-1 capitalize text-xs py-1.5 rounded-md transition-colors ${typography.width === w ? "bg-white dark:bg-slate-700 shadow-sm font-bold " + ui.txt1 : ui.txt2 + " hover:opacity-80"}`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-[10px] uppercase font-bold tracking-widest ${ui.txt2} mb-2`}
                      >
                        Line Height
                      </label>
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {["compact", "standard", "relaxed"].map((lh) => (
                          <button
                            key={lh}
                            onClick={() => setTypography({ lineHeight: lh })}
                            className={`flex-1 capitalize text-xs py-1.5 rounded-md transition-colors ${typography.lineHeight === lh ? "bg-white dark:bg-slate-700 shadow-sm font-bold " + ui.txt1 : ui.txt2 + " hover:opacity-80"}`}
                          >
                            {lh}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-[10px] uppercase font-bold tracking-widest ${ui.txt2} mb-2 mt-4`}
                      >
                        Look & Feel
                      </label>
                      <button
                        onClick={() => setTypography({ basicWebpage: !typography.basicWebpage })}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                          typography.basicWebpage
                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            : `bg-slate-100 dark:bg-slate-800 ${ui.txt1} hover:opacity-80`
                        }`}
                      >
                        <span>Basic Webpage Style</span>
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${typography.basicWebpage ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-600'}`}>
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${typography.basicWebpage ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`w-px h-6 ${ui.border} mx-1 hidden sm:block border-l opacity-50`}
            ></div>

            {/* AI / Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCodeAlongOpen((v) => !v)}
                className={`relative group overflow-hidden rounded-full p-[1px] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${codeAlongOpen ? "ring-2 ring-cyan-400/50 ring-offset-1 ring-offset-transparent" : ""}`}
                title="Code-along workspace"
              >
                <span
                  className={`absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity ${codeAlongOpen ? "opacity-100" : ""}`}
                />
                <div
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${ui.bg0} rounded-full ${ui.txt1}`}
                >
                  <Code2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="hidden xl:inline">Code Along</span>
                </div>
              </button>

              <button
                onClick={() => setAdaOpen((v) => !v)}
                className={`relative group overflow-hidden rounded-full p-[1px] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${adaOpen ? "ring-2 ring-violet-400/50 ring-offset-1 ring-offset-transparent" : ""}`}
                title="Ask Ada — AI code tutor"
              >
                <span
                  className={`absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity ${adaOpen ? "opacity-100" : ""}`}
                />
                <div
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${ui.bg0} rounded-full ${ui.txt1}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span className="hidden xl:inline">Ask Ada</span>
                </div>
              </button>
            </div>

            <div
              className={`w-px h-6 ${ui.border} mx-1 border-l opacity-50`}
            ></div>

            {/* Document Actions */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 p-1 rounded-full ${ui.bg2} border ${ui.border} shadow-inner`}
              >
                <button
                  onClick={refreshDocsIndex}
                  className={`p-1.5 rounded-full ${ui.txt2} hover:bg-white dark:hover:bg-slate-700 ${ui.hoverTx} transition-all hover:shadow-sm`}
                  title="Refresh docs index"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-1.5 rounded-full ${ui.txt2} hover:bg-white dark:hover:bg-slate-700 ${ui.hoverTx} transition-all hover:shadow-sm`}
                  title="Import document"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                {((tab === "tutorials" && activeFile) ||
                  (tab === "editor" && activeDocType)) && (
                  <button
                    onClick={downloadCurrentMarkdown}
                    className={`p-1.5 rounded-full ${ui.txt2} hover:bg-white dark:hover:bg-slate-700 ${ui.hoverTx} transition-all hover:shadow-sm`}
                    title="Download markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Conditional Editors */}
              {tab === "tutorials" && activeFile && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    onClick={openTutorialOverrideEditor}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-300/50 dark:border-emerald-800/50 rounded-full hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 transition-all shadow-sm hover:shadow"
                    title={
                      tutorialOverrideActive
                        ? "Edit override"
                        : "Edit local version"
                    }
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {tutorialOverrideActive ? "Edit override" : "Edit local"}
                    </span>
                  </button>
                  {tutorialOverrideActive && backendReady && (
                    <button
                      onClick={() => deleteOverrideDoc(activeFile)}
                      className="p-1.5 rounded-full border border-amber-300/50 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-all shadow-sm hover:shadow"
                      title="Restore built-in doc"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {tab === "editor" && activeDocType && (
                <div className="flex items-center gap-1.5 ml-1">
                  {previewMode ? (
                    <button
                      onClick={() => setPreviewMode(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/30 border border-indigo-300/50 dark:border-indigo-800/50 rounded-full hover:bg-indigo-200/50 transition-all shadow-sm hover:shadow"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setPreviewMode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-300/50 dark:border-emerald-800/50 rounded-full hover:bg-emerald-200/50 transition-all shadow-sm hover:shadow"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                  )}
                  <button
                    onClick={exportSharePack}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/50 dark:bg-sky-900/30 border border-sky-300/50 dark:border-sky-800/50 rounded-full hover:bg-sky-200/50 transition-all shadow-sm hover:shadow hidden sm:flex"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DocsCtx.Provider value={docsCtxValue}>
          <div
            className={`flex flex-1 min-h-0 overflow-hidden w-full relative ${codeAlongOpen ? "min-w-0" : ""}`}
          >
            <div
              className={`${
                !docsNavOpen
                  ? "hidden"
                  : isNarrowPanel
                    ? "flex absolute inset-y-0 left-0 z-30 shadow-2xl"
                    : "flex"
              } ${ui.bg1} border-r ${ui.border} flex-col shrink-0 overflow-hidden h-full`}
              style={{ width: isNarrowPanel ? "100%" : effectiveSidebarWidth }}
            >
              {/* ── Search bar ── */}
              {tab === "tutorials" && (
                <div className={`shrink-0 px-2 py-2 border-b ${ui.border}`}>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${ui.border} ${ui.bg1} transition-colors focus-within:ring-1`}
                    style={{ "--tw-ring-color": accentColor }}
                  >
                    <svg
                      className="w-3 h-3 shrink-0 opacity-40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={sidebarTab === "notes" ? noteSearch : docSearch}
                      onChange={(e) => sidebarTab === "notes" ? setNoteSearch(e.target.value) : setDocSearch(e.target.value)}
                      placeholder={sidebarTab === "notes" ? "Search notes…" : sidebarTab === "toc" ? "Filter this page…" : sidebarTab === "reference" ? "Filter terms & objects…" : "Search docs…"}
                      className={`flex-1 bg-transparent text-[12px] outline-none placeholder-slate-400 dark:placeholder-slate-600 ${ui.txt1}`}
                    />
                    {(sidebarTab === "notes" ? noteSearch : docSearch) && (
                      <button
                        onClick={() => sidebarTab === "notes" ? setNoteSearch("") : setDocSearch("")}
                        className="opacity-40 hover:opacity-70 transition-opacity"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sidebar tab switcher — stays visible while searching too, so a
                  query in one tab (e.g. "On This Page") doesn't hide the way
                  back to another. "On This Page" only shows once the active
                  doc has headings; Notes is always reachable. */}
              {tab === "tutorials" && (
                <div className={`flex shrink-0 p-2 gap-1 border-b ${ui.border} sticky top-0 z-20 ${ui.bg0}`}>
                  <button
                    onClick={() => setSidebarTab("docs")}
                    className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all duration-300 ${sidebarTab === "docs" ? "shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"}`}
                    style={
                      sidebarTab === "docs"
                        ? { backgroundColor: `${accentColor}1A`, color: accentColor, boxShadow: `0 0 10px ${accentColor}15` }
                        : {}
                    }
                  >
                    Documents
                  </button>
                  {(termsSection || objectsSection) && (
                    <button
                      onClick={() => setSidebarTab("reference")}
                      className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all duration-300 ${sidebarTab === "reference" ? "shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"}`}
                      style={
                        sidebarTab === "reference"
                          ? { backgroundColor: `${accentColor}1A`, color: accentColor, boxShadow: `0 0 10px ${accentColor}15` }
                          : {}
                      }
                    >
                      Reference
                    </button>
                  )}
                  {headings.length > 0 && (
                    <button
                      onClick={() => setSidebarTab("toc")}
                      className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all duration-300 ${sidebarTab === "toc" ? "shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"}`}
                      style={
                        sidebarTab === "toc"
                          ? { backgroundColor: `${accentColor}1A`, color: accentColor, boxShadow: `0 0 10px ${accentColor}15` }
                          : {}
                      }
                    >
                      On This Page
                    </button>
                  )}
                  <button
                    onClick={() => setSidebarTab("notes")}
                    className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all duration-300 ${sidebarTab === "notes" ? "shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"}`}
                    style={
                      sidebarTab === "notes"
                        ? { backgroundColor: `${accentColor}1A`, color: accentColor, boxShadow: `0 0 10px ${accentColor}15` }
                        : {}
                    }
                  >
                    Notes
                  </button>
                </div>
              )}

              {/* ── Search results (Documents tab only — "On This Page" gets
                  its own filtered list below instead of these doc-path
                  results) ── */}
              {tab === "tutorials" && sidebarTab === "docs" && docSearch.trim().length >= 2 && (
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                  {searchResults.length === 0 ? (
                    <p
                      className={`px-3 py-4 text-[11px] text-center ${ui.txt2}`}
                    >
                      No results for "{docSearch.trim()}"
                    </p>
                  ) : (
                    <>
                      <p
                        className={`px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest ${ui.txt2}`}
                      >
                        {searchResults.length} result
                        {searchResults.length !== 1 ? "s" : ""}
                      </p>
                      {searchResults.map((r) => (
                        <div
                          key={r.path}
                          onClick={() => {
                            selectTutorial(r.path);
                            setDocSearch("");
                          }}
                          className={`flex flex-col gap-1 px-3 py-2 mx-2 mb-1 rounded-md cursor-pointer transition-colors border ${
                            activeFile === r.path
                              ? `${ui.txt1} font-medium border-transparent shadow-sm`
                              : `${ui.txt2} border-transparent ${ui.hoverBg}`
                          }`}
                          style={
                            activeFile === r.path
                              ? { backgroundColor: `${accentColor}1A`, borderColor: accentColor, color: accentColor }
                              : {}
                          }
                        >
                          <div className="flex items-center gap-2">
                            <File className={`w-3.5 h-3.5 shrink-0 ${activeFile === r.path ? "opacity-100" : "opacity-70"}`} />
                            <span
                              className="text-[12px] font-medium truncate flex-1"
                              style={
                                activeFile === r.path
                                  ? { color: accentColor }
                                  : {}
                              }
                            >
                              {r.fileName}
                            </span>
                          </div>
                          {r.folder && (
                            <span className={`text-[10px] truncate ml-[22px] ${ui.txt3}`}>
                              {r.folder}
                            </span>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {/* ── Normal tree (hidden only while showing Documents search results) ── */}
              {!(tab === "tutorials" && sidebarTab === "docs" && docSearch.trim().length >= 2) && (
                <div className="flex-1 overflow-y-auto overflow-x-auto py-3 custom-scrollbar min-h-0">
                  {tab === "tutorials" &&
                    (sidebarTab === "docs" ||
                      (sidebarTab === "toc" && !headings.length)) &&
                    (tree.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        No docs found.
                        <br />
                        Add `.md` files to{" "}
                        <code className="text-slate-700 dark:text-slate-300">
                          src/docs/
                        </code>
                      </div>
                    ) : (
                      tree.map((node, index) => (
                        <TreeNode
                          key={`${node.name}-${index}`}
                          node={node}
                          activeFile={activeFile}
                          onSelect={selectTutorial}
                          overriddenPaths={overriddenPaths}
                          accentColor={accentColor}
                          ui={ui}
                          docProgress={docProgress}
                        />
                      ))
                    ))}

                  {tab === "tutorials" &&
                    sidebarTab === "toc" &&
                    headings.length > 0 &&
                    (visibleHeadings.length === 0 ? (
                      <p className={`px-3 py-4 text-[11px] text-center ${ui.txt2}`}>
                        No headings match "{docSearch.trim()}"
                      </p>
                    ) : (() => {
                      const activeIdx = visibleHeadings.findIndex(
                        (h) => h.id === activeHeadingId,
                      );
                      return (
                        <div className="py-1">
                          {visibleHeadings.map((h, i) => {
                            const isActive = i === activeIdx;
                            const isPassed = activeIdx !== -1 && i < activeIdx;
                            return (
                              <div key={i} className="relative group mx-2">
                                {/* Vertical Indentation Guide */}
                                {h.level > 1 && (
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 border-l border-black/5 dark:border-white/5 group-hover:border-black/20 dark:group-hover:border-white/20 transition-colors"
                                    style={{ left: (h.level - 1) * 12 + 4 }}
                                  />
                                )}
                                <button
                                  // Stay on "On This Page" after jumping — this
                                  // is a reading-progress view, not a one-shot
                                  // navigation menu, so it shouldn't bounce
                                  // back to Documents.
                                  onClick={() => scrollToHeading(h.id)}
                                  className={`relative w-full flex items-center gap-2 text-left py-1.5 my-0.5 rounded-md text-[12px] transition-all truncate border border-transparent ${
                                    isActive
                                      ? "font-semibold shadow-sm"
                                      : `${ui.txt2} hover:bg-black/5 dark:hover:bg-white/5`
                                  }`}
                                  style={{
                                    paddingLeft: 10 + (h.level - 1) * 12,
                                    paddingRight: 8,
                                    ...(isActive ? {
                                      color: accentColor,
                                      backgroundColor: `${accentColor}10`,
                                      boxShadow: `0 0 12px ${accentColor}15`
                                    } : {})
                                  }}
                                  title={h.text}
                                >
                                  <span className="shrink-0 w-4 h-4 flex items-center justify-center relative z-10">
                                    {isPassed ? (
                                      <Check
                                        className="w-3.5 h-3.5 opacity-60"
                                        style={{ color: accentColor }}
                                      />
                                    ) : (
                                      <span
                                        className={`block rounded-full transition-all ${isActive ? "w-2 h-2 ring-2 ring-white dark:ring-black" : "w-1 h-1 opacity-30 bg-current"}`}
                                        style={isActive ? { background: accentColor, boxShadow: `0 0 8px ${accentColor}80` } : {}}
                                      />
                                    )}
                                  </span>
                                  <span className={`truncate ${isPassed ? "opacity-60" : ""} ${isActive ? "drop-shadow-sm" : ""}`}>
                                    {h.text}
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })())}

                  {tab === "tutorials" && sidebarTab === "notes" && (
                    <div>
                      <div className="px-3 pb-2">
                        <button
                          onClick={createNote}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                          style={{ background: accentColor }}
                        >
                          <FilePlus className="w-3.5 h-3.5" /> New Note
                        </button>
                      </div>
                      {notes.length === 0 ? (
                        <div className={`px-4 py-4 text-xs ${ui.txt2}`}>
                          No notes yet. Select text in a doc, copy it, then
                          create a note and paste it in.
                        </div>
                      ) : filteredNotesBySeries.length === 0 ? (
                        <p
                          className={`px-3 py-4 text-[11px] text-center ${ui.txt2}`}
                        >
                          No notes match "{noteSearch.trim()}"
                        </p>
                      ) : (
                        filteredNotesBySeries.map(([seriesName, seriesNotes]) => (
                          <NotesSeriesGroup
                            key={seriesName}
                            seriesName={seriesName}
                            notes={seriesNotes}
                            activeNoteId={activeNoteId}
                            onOpen={(id) =>
                              setActiveNoteId((prev) => (prev === id ? null : id))
                            }
                            onUpdate={updateNote}
                            onDelete={deleteNote}
                            onOpenSource={openNoteSource}
                            accentColor={accentColor}
                            ui={ui}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {tab === "tutorials" && sidebarTab === "reference" && (
                    <div className="px-3 py-2 space-y-5">
                      {!termsSection && !objectsSection ? (
                        <p className={`px-1 py-4 text-[11px] text-center ${ui.txt2}`}>
                          No Terms or Objects section found for this lesson.
                        </p>
                      ) : (
                        <>
                          {termsSection && (
                            <div>
                              <p className={`px-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest ${ui.txt2}`}>
                                Terms
                              </p>
                              {filteredTermsMd ? (
                                <div className="md-body">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                                    components={typography.basicWebpage ? BASIC_MD_COMPONENTS : MD_COMPONENTS}
                                  >
                                    {filteredTermsMd}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className={`px-1 py-2 text-[11px] ${ui.txt2}`}>
                                  No terms match "{docSearch.trim()}"
                                </p>
                              )}
                            </div>
                          )}
                          {objectsSection && (
                            <div>
                              <p className={`px-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest ${ui.txt2}`}>
                                Objects &amp; Methods
                              </p>
                              {filteredObjectsMd ? (
                                <div className="md-body">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                                    components={typography.basicWebpage ? BASIC_MD_COMPONENTS : MD_COMPONENTS}
                                  >
                                    {filteredObjectsMd}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className={`px-1 py-2 text-[11px] ${ui.txt2}`}>
                                  No objects match "{docSearch.trim()}"
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {tab === "editor" && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
                        My Documents
                      </div>
                      {userDocs.map((doc) => (
                        <DocListItem
                          key={doc.id}
                          itemId={doc.id}
                          label={doc.name}
                          subtitle={
                            backendReady
                              ? new Date(doc.updatedAt).toLocaleString()
                              : "Local browser storage"
                          }
                          kind="user"
                          isActive={
                            activeDocType === "user" && activeUserId === doc.id
                          }
                          onSelect={() => selectUserDoc(doc)}
                          onDelete={() => deleteUserDoc(doc.id)}
                          accentColor={accentColor}
                          ui={ui}
                          progress={docProgress[doc.id] || 0}
                        />
                      ))}
                      {userDocs.length === 0 && (
                        <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                          No user docs yet.
                        </div>
                      )}

                      <div className="px-4 py-3 text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1 mt-3">
                        Bundled Doc Overrides
                      </div>
                      {overrideDocs.map((doc) => (
                        <DocListItem
                          key={doc.path}
                          itemId={doc.path}
                          label={doc.name}
                          subtitle={doc.path.replace("/src/docs/", "")}
                          kind="override"
                          isActive={
                            activeDocType === "override" &&
                            activeOverridePath === doc.path
                          }
                          onSelect={() => selectOverrideDoc(doc)}
                          onDelete={() => deleteOverrideDoc(doc.path)}
                          accentColor={accentColor}
                          ui={ui}
                          progress={docProgress[doc.path] || 0}
                        />
                      ))}
                      {overrideDocs.length === 0 && (
                        <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                          No doc overrides yet. Open a tutorial and choose `Edit
                          local version`.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === "editor" && (
                <div className={`shrink-0 p-3 border-t ${ui.border} ${ui.bg1}`}>
                  <button
                    onClick={createUserDoc}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm"
                  >
                    <FilePlus className="w-4 h-4" /> New Document
                  </button>
                </div>
              )}
            </div>

            {docsNavOpen && !isNarrowPanel && (
              <div
                className={`md-splitter${explorerSplitterDragging ? " dragging" : ""}`}
                onMouseDown={handleExplorerSplitterDrag}
                title="Drag to resize"
              />
            )}

            <div
              className={`flex-1 min-w-0 flex flex-col overflow-hidden ${ui.bg0} relative`}
            >
              {/* Subtle ambient theme gradient in the corners */}
              <div 
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  background: `radial-gradient(circle at 100% 0%, ${accentColor}1A 0%, transparent 40%), radial-gradient(circle at 0% 100%, ${accentColor}1A 0%, transparent 40%)`
                }}
              />
              {tab === "tutorials" && (
                <div
                  ref={contentScrollRef}
                  onScroll={handleContentScroll}
                  className={`flex-1 overflow-y-auto py-8 custom-scrollbar relative z-10 ${
                    typography.width === "wide" ? "px-2 sm:px-3" : "px-6 sm:px-10 lg:px-16"
                  }`}
                >
                  {loading ? (
                    <div className="text-slate-500 text-sm animate-pulse">
                      Loading document...
                    </div>
                  ) : (
                    <div className="w-full">
                      {activeFile && (
                        <div className="mb-6 flex items-center gap-2 flex-wrap px-4">
                          <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {activeFile.replace("/src/docs/", "")}
                          </span>
                          {tutorialOverrideActive && (
                            <span className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded">
                              Local override active
                            </span>
                          )}
                        </div>
                      )}
                      <SectionedMarkdown
                        content={content}
                        ui={themeStyles.ui}
                        accentColor={accentColor}
                        isDark={themeStyles.isDark}
                        font={typography.font}
                        width={typography.width}
                        lineHeight={typography.lineHeight}
                        fontSize={typography.fontSize}
                        textAlign={typography.textAlign}
                        basicWebpage={typography.basicWebpage}
                      />
                      {nextTutorial && (
                        <div className="mt-10 px-4 flex justify-end">
                          <button
                            onClick={() =>
                              selectTutorial(nextTutorial.path, { resetScroll: true })
                            }
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow transition-all hover:brightness-110"
                            style={{ background: accentColor }}
                          >
                            <span className="opacity-80 font-normal">Next:</span>
                            {displayName(nextTutorial.name)}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === "editor" && !activeDocType && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-slate-500 relative z-10">
                  <FilePenLine className="w-16 h-16 opacity-30" />
                  <p className="text-sm">
                    Select a document, create one, or open a tutorial to
                    override it.
                  </p>
                  <button
                    onClick={createUserDoc}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-indigo-500/20"
                  >
                    <FilePlus className="w-4 h-4" /> Create New Document
                  </button>
                </div>
              )}

              {tab === "editor" && activeDocType && previewMode && (
                <div
                  className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 py-8 custom-scrollbar relative z-10"
                  style={{
                    background: isDark
                      ? themeStyles.md.preBg + "80"
                      : "rgba(248,250,252,0.5)",
                  }}
                >
                  <SectionedMarkdown
                    content={editorContent}
                    ui={themeStyles.ui}
                    accentColor={accentColor}
                    isDark={themeStyles.isDark}
                    font={typography.font}
                    width={typography.width}
                    lineHeight={typography.lineHeight}
                    fontSize={typography.fontSize}
                    textAlign={typography.textAlign}
                    basicWebpage={typography.basicWebpage}
                  />
                </div>
              )}

              {tab === "editor" && activeDocType && !previewMode && (
                <div
                  className={`flex-1 flex flex-col overflow-hidden ${ui.bg0} relative z-10`}
                >
                  <div
                    className={`flex items-center gap-3 px-6 py-2 border-b ${ui.border}`}
                    style={{ background: themeStyles.md.codeHeaderBg }}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-widest ${ui.txt2} uppercase`}
                    >
                      {activeDocType === "override" ? "Override" : "Document"}
                    </span>
                    <input
                      value={editorName}
                      onChange={(event) => setEditorName(event.target.value)}
                      placeholder="Document name..."
                      className={`flex-1 bg-transparent border-none text-sm font-semibold ${ui.txt1} outline-none focus:ring-0`}
                      style={{ color: themeStyles.md.h1 }}
                    />
                    <span
                      className={`text-[10px] ${ui.txt2} px-2 py-0.5 rounded flex items-center gap-1.5`}
                      style={{ background: themeStyles.md.thBg }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isSaving ? "bg-amber-500" : "bg-emerald-500"}`}
                      ></span>
                      {isSaving ? "Saving" : "Saved"}
                    </span>
                  </div>
                  <MarkdownToolbar onInsert={insertIntoEditor} />
                  <div className="flex-1 min-h-0">
                    <Editor
                      key={editorDocKey}
                      defaultValue={editorContent}
                      language="markdown"
                      theme={
                        themeStyles.monaco ||
                        (themeStyles.isDark
                          ? "open-calc-dark"
                          : "open-calc-light")
                      }
                      beforeMount={setupOpenCalcMonaco}
                      onChange={(value) => setEditorContent(value ?? "")}
                      onMount={(editor) => {
                        editorInstanceRef.current = editor;
                        // Restore cursor + scroll position from before the
                        // last reload, if we have one saved for this doc.
                        const savedViewState = loadEditorViewState(editorDocKey);
                        if (savedViewState) editor.restoreViewState(savedViewState);

                        let saveTimer = null;
                        const persistViewState = () => {
                          clearTimeout(saveTimer);
                          saveTimer = setTimeout(() => {
                            saveEditorViewState(editorDocKey, editor.saveViewState());
                          }, 400);
                        };
                        // Cursor moves and pure scrolling (no edits) both
                        // need their own listeners — onChange only fires on
                        // edits.
                        editor.onDidChangeCursorPosition(persistViewState);
                        editor.onDidScrollChange(persistViewState);
                      }}
                      options={{
                        fontSize: 13,
                        fontFamily:
                          "'JetBrains Mono', Consolas, 'Courier New', monospace",
                        lineHeight: 22,
                        minimap: { enabled: false },
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 20, bottom: 20 },
                        lineNumbers: "on",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {codeAlongOpen && (
              <>
                <div
                  className={`md-splitter hidden md:block${splitterDragging ? " dragging" : ""}`}
                  onMouseDown={handleSplitterDrag}
                  role="separator"
                  aria-label="Resize tutorial and code workspace"
                  aria-orientation="vertical"
                  aria-valuemin={300}
                  aria-valuemax={Math.max(300, window.innerWidth - 350)}
                  aria-valuenow={codeAlongPx}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                    event.preventDefault();
                    setCodeAlongPx(width => Math.max(300, Math.min(width + (event.key === "ArrowLeft" ? 40 : -40), window.innerWidth - 350)));
                  }}
                  title="Drag or use arrow keys to resize"
                />
                <div
                  className="hidden md:flex flex-col shrink-0 overflow-hidden"
                  style={{ width: codeAlongPx }}
                >
                  <DocsCodeWorkspace
                    activeTitle={activeTitle}
                    pendingRun={pendingRun}
                    onCodeChange={handleCodeChange}
                    accentColor={accentColor}
                    monacoTheme={themeStyles.monaco}
                    themeUi={themeStyles.ui}
                  />
                </div>
              </>
            )}
          </div>
        </DocsCtx.Provider>
      </div>

      {/* ── Ada floating panel ── */}
      {adaOpen && (
        <AdaPanel
          code={workspaceSnap.code}
          language={workspaceSnap.language}
          filename={workspaceSnap.filename}
          terminalOutput={workspaceSnap.getTerminalOutput()}
          tutorialContent={content}
          fileList={workspaceSnap.fileList}
          isDark={isDark}
          ui={ui}
          accentColor={accentColor}
        />
      )}
    </>
  );
}
