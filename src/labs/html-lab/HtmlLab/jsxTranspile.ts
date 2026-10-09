import { parse } from "acorn";
import * as Babel from "@babel/standalone";
import type { JsFile } from "./types";

export interface TranspileResult {
  code: string;
  error: string | null;
}

function hasExtension(jsFiles: JsFile[], ext: string): boolean {
  return jsFiles.some((f) => f.name.toLowerCase().endsWith(ext));
}

export function hasJsx(jsFiles: JsFile[]): boolean {
  return hasExtension(jsFiles, ".jsx") || hasExtension(jsFiles, ".tsx");
}

export function hasTypeScript(jsFiles: JsFile[]): boolean {
  return hasExtension(jsFiles, ".ts") || hasExtension(jsFiles, ".tsx");
}

function needsTranspile(jsFiles: JsFile[]): boolean {
  return hasJsx(jsFiles) || hasTypeScript(jsFiles);
}

// Runs the whole concatenated bundle through Babel's transform in the parent
// app — not inside the preview iframe — so the iframe only ever needs plain
// JS + whatever CDN scripts the project uses, and a transpile error surfaces
// in this app's own UI instead of failing silently inside the sandboxed
// iframe. Plain `.js`-only projects skip this entirely (no jsFiles need
// transpiling, no Babel cost paid).
export function transpileBundle(bundle: string, jsFiles: JsFile[]): TranspileResult {
  if (!bundle.trim()) return { code: bundle, error: null };
  if (!needsTranspile(jsFiles)) {
    try {
      parse(bundle, { ecmaVersion: 'latest', sourceType: 'script' });
      return { code: bundle, error: null };
    } catch (e) {
      return { code: bundle, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const includesJsx = hasJsx(jsFiles);
  const presets: Array<string | [string, Record<string, unknown>]> = [];

  if (hasTypeScript(jsFiles)) {
    // This preset decides whether to also parse JSX based on the `filename`
    // extension passed to `Babel.transform` below — "bundle.tsx" enables it,
    // "bundle.ts" does not. (Older Babel versions used explicit `isTSX`/
    // `allExtensions` options instead; this version of @babel/standalone
    // removed both in favour of filename-based detection.)
    presets.push("typescript");
  }
  if (includesJsx) {
    // `runtime: 'classic'` is required here — the default "automatic" JSX
    // runtime emits `import ... from "react/jsx-runtime"`, which needs a real
    // module bundler to resolve. React is loaded as a plain global via a UMD
    // <script> tag (see cdnLibraries.ts's reactCdnTags), so JSX must compile
    // to `React.createElement(...)` calls instead, which need no imports.
    presets.push(["react", { runtime: "classic" }]);
  }

  try {
    const result = Babel.transform(bundle, { presets, filename: includesJsx ? "bundle.tsx" : "bundle.ts" });
    return { code: result.code ?? "", error: null };
  } catch (e) {
    return { code: "", error: e instanceof Error ? e.message : String(e) };
  }
}
