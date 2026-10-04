// Loading the project's scripts as real ES modules, inside the game's iframe (ADR 4).
//
// Each script becomes a blob: URL. A script may import another project script
// ("./util.js" relative to itself, or "scripts/util.js" from the project root);
// those specifiers are rewritten to the other script's blob URL, so dependencies
// are made first. Nothing else can be imported. Lines are not moved, so an error's
// line and column in the blob are its line and column in the script, and
// `sourceName` turns a blob URL in a stack trace back into the script's path.

import { parse } from 'acorn';
import type { ScriptFile } from '../core/types';

const SPECIFIER = /(\bimport\s*(?:[\w*{}\s,$]+\s*from\s*)?|\bexport\s*(?:[\w*{}\s,$]+\s*from\s*)|\bimport\s*\(\s*)(['"])([^'"]+)\2/g;

/** The project path a specifier in `from` names, or an error message. */
export function resolveImport(from: string, spec: string): string | { error: string } {
  let parts: string[];
  if (spec.startsWith('./') || spec.startsWith('../')) {
    parts = from.split('/').slice(0, -1);
    for (const p of spec.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); }
  } else if (spec.startsWith('scripts/')) parts = spec.split('/');
  else return { error: `${from}: "${spec}" cannot be imported. Scripts can import other project scripts ("./util.js" or "scripts/util.js"), nothing else.` };
  const path = parts.join('/');
  return path.endsWith('.js') ? path : `${path}.js`;
}

/** The scripts in dependency order (each after the scripts it imports), or an error naming a cycle or a missing file. */
export function importOrder(scripts: ScriptFile[]): { order: string[]; imports: Map<string, Map<string, string>> } {
  const byPath = new Map(scripts.map((s) => [s.path, s]));
  const imports = new Map<string, Map<string, string>>();
  for (const s of scripts) {
    const m = new Map<string, string>();
    for (const match of s.source.matchAll(SPECIFIER)) {
      const r = resolveImport(s.path, match[3]);
      if (typeof r !== 'string') throw new Error(r.error);
      if (!byPath.has(r)) throw new Error(`${s.path}: imports "${match[3]}", but there is no ${r} in the project`);
      m.set(match[3], r);
    }
    imports.set(s.path, m);
  }
  const order: string[] = [], state = new Map<string, 'visiting' | 'done'>();
  const visit = (path: string, chain: string[]) => {
    if (state.get(path) === 'done') return;
    if (state.get(path) === 'visiting') throw new Error(`These scripts import each other in a circle: ${[...chain, path].join(' → ')}`);
    state.set(path, 'visiting');
    for (const dep of imports.get(path)!.values()) visit(dep, [...chain, path]);
    state.set(path, 'done');
    order.push(path);
  };
  for (const s of scripts) visit(s.path, []);
  return { order, imports };
}

/** The source with each import specifier replaced by the URL of the script it names. */
export function rewriteImports(source: string, urls: Map<string, string>): string {
  return source.replace(SPECIFIER, (all, head: string, q: string, spec: string) => (urls.has(spec) ? `${head}${q}${urls.get(spec)}${q}` : all));
}

export interface LoadedScripts {
  /** The default export of each script: the class to attach. */
  classes: Map<string, unknown>;
  /** A blob URL in a stack trace, back to the script's path. */
  sourceName: (url: string) => string | null;
}

export interface SyntaxProblem { file: string; line: number; column: number; message: string }

/**
 * Syntax errors in the scripts, with their line and column. A browser that fails to
 * load a module says only "Unexpected token", with no line, so scripts are parsed
 * first and a mistake is reported where it is.
 */
export function checkSyntax(scripts: ScriptFile[]): SyntaxProblem[] {
  const out: SyntaxProblem[] = [];
  for (const s of scripts) {
    try { parse(s.source, { ecmaVersion: 'latest', sourceType: 'module' }); }
    catch (e) {
      const err = e as Error & { loc?: { line: number; column: number } };
      out.push({ file: s.path, line: err.loc?.line ?? 1, column: (err.loc?.column ?? 0) + 1, message: err.message.replace(/\s*\(\d+:\d+\)$/, '') });
    }
  }
  return out;
}

/** Load every script (browser only). A script that fails to load throws, naming the file. */
export async function loadScripts(scripts: ScriptFile[]): Promise<LoadedScripts> {
  const bad = checkSyntax(scripts)[0];
  if (bad) throw Object.assign(new Error(bad.message), { file: bad.file, line: bad.line, column: bad.column });
  const { order, imports } = importOrder(scripts);
  const byPath = new Map(scripts.map((s) => [s.path, s]));
  const urlOf = new Map<string, string>(), pathOf = new Map<string, string>();
  for (const path of order) {
    const specs = new Map([...imports.get(path)!].map(([spec, dep]) => [spec, urlOf.get(dep)!]));
    const code = `${rewriteImports(byPath.get(path)!.source, specs)}\n//# sourceURL=${path}`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    urlOf.set(path, url); pathOf.set(url, path);
  }
  const classes = new Map<string, unknown>();
  for (const path of order) {
    try {
      const mod = await import(/* @vite-ignore */ urlOf.get(path)!);
      classes.set(path, mod.default);
      classes.set(`module:${path}`, mod);   // everything it exports, for a task's checks (tasks/checker.ts)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      (err as Error & { file?: string }).file = path;
      throw err;
    }
  }
  return { classes, sourceName: (url) => pathOf.get(url) ?? null };
}

/**
 * The first stack frame inside a project script, as file, line and column. Frames look
 * like "at update (blob:null/1234:12:9)" in Chromium and "update@blob:null/1234:12:9"
 * in Firefox and Safari.
 */
export function locate(stack: string, sourceName: (url: string) => string | null): { file: string; line: number; column: number } | null {
  for (const m of stack.matchAll(/(blob:[^\s)]+?|scripts\/[^\s):]+):(\d+):(\d+)/g)) {
    const file = m[1].startsWith('blob:') ? sourceName(m[1]) : m[1];
    if (file) return { file, line: Number(m[2]), column: Number(m[3]) };
  }
  return null;
}
