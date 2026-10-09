import type { useThemeColors } from "../../hooks/useThemeColors";

// Fixed, curated semantic colors (green/amber/red for response status) —
// deliberately theme-invariant, per useThemeColors.js's own documented
// intent, not the studio-theme-reactive system.
export type StatusColors = ReturnType<typeof useThemeColors>;

// The REAL studio-theme-reactive palette (Vue/Dracula/GitHub/...), sourced
// from STUDIO_THEMES via useGlobalTheme()'s themeStyles.ui — plain Tailwind
// class-name strings, applied via className, not inline styles.
export interface UiTheme {
  bg0: string;
  bg1: string;
  bg2: string;
  border: string;
  txt1: string;
  txt2: string;
  hoverBg: string;
  hoverTx: string;
  btnBorder: string;
  primary: string;
  primaryBg: string;
}

export interface BackendFile {
  id: string;
  name: string;
  code: string;
}

export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

// What the student's handleRequest actually receives — path with the
// query string stripped off, plus query pre-parsed into a plain object.
// Splitting the raw path this way is host-side work (see runRequest.ts),
// the same way a real server's networking layer parses a raw URL before
// framework code ever sees it.
export interface ParsedHttpRequest extends HttpRequest {
  query: Record<string, string>;
  params?: Record<string, string>;
}

export interface HttpResponseResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface SavedRequest {
  id: string;
  name: string;
  request: HttpRequest;
  checks?: ResponseChecks;
}

export interface ResponseChecks {
  status: string;
  body: string;
}

export type PostmanTab = "response" | "logs" | "saved" | "sql" | "history" | "checks";
