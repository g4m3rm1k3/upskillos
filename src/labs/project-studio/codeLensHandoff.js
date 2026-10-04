// codeLensHandoff.js
// "Trace in CodeLens" for C++ and Python lessons: hands the learner's file to CodeLens. A C++ file is compiled
// with debug information and steps through it under GDB, showing every line's variables, the
// call stack and the heap. Uses the same localStorage handoff as the blog's code blocks
// (CodeLensPage.tsx reads it once on mount), plus a return path back to Project Studio.
//
// CodeLens compiles one file. A project's own headers (#include "x.h") are pasted in here,
// as the preprocessor would, so a program split into a .cpp and its headers still traces.
// Definitions that live in another .cpp file can't be traced this way.

export const TRACEABLE_FILE = /\.(cpp|cc|cxx)$/i;
// Python traces one .py file too (CodeLens runs it in its own environment, pygame-ce included),
// so a Python lesson can offer a small self-contained file to step through.
export const TRACEABLE_PYTHON = /\.py$/i;

export function canTrace(lesson, file) {
  if (!file) return false;
  if (lesson?.runtime === 'cpp') return TRACEABLE_FILE.test(file);
  if (lesson?.runtime === 'python') return TRACEABLE_PYTHON.test(file);
  return false;
}

// CodeLens's own name for the language of a traceable file.
export function traceLang(file) {
  return TRACEABLE_PYTHON.test(file ?? '') ? 'py' : 'cpp';
}

function dirOf(file) {
  const i = file.lastIndexOf('/');
  return i === -1 ? '' : file.slice(0, i + 1);
}

function joinPath(dir, rel) {
  const parts = [];
  for (const part of (dir + rel).split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}

// Replace each `#include "local.h"` that exists in the project with the header's text (once
// per header, like #pragma once). Angle-bracket includes and missing files are left alone.
export async function inlineLocalHeaders(code, file, readFile, seen = new Set()) {
  const lines = String(code).split('\n');
  const out = [];
  for (const line of lines) {
    const m = /^\s*#\s*include\s*"([^"]+)"/.exec(line);
    if (!m) { out.push(line); continue; }
    const target = joinPath(dirOf(file), m[1]);
    if (seen.has(target)) continue;
    const text = await readFile(target);
    if (text == null) { out.push(line); continue; }
    seen.add(target);
    const body = text.split('\n').filter((l) => !/^\s*#\s*pragma\s+once\b/.test(l)).join('\n');
    out.push(`// ---- ${target} (pasted in for CodeLens) ----`);
    out.push(await inlineLocalHeaders(body, target, readFile, seen));
    out.push(`// ---- end of ${target} ----`);
  }
  return out.join('\n');
}

export function handOffToCodeLens(code, { lang = 'cpp', storage = globalThis.localStorage, session = globalThis.sessionStorage } = {}) {
  storage.setItem('codelens-handoff', JSON.stringify({ code, lang, ts: Date.now() }));
  session.setItem('codelens_return_path', '#/lab/project-studio');
  session.setItem('codelens_return_label', 'Back to Project Studio');
}
