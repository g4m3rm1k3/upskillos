// ─── Core element types ───────────────────────────────────────────────────────

export interface MediaQuery {
  breakpoint: string;
  prop: string;
  value: string;
}

export type BodyStyles = Record<string, string>;

// The three independent global-style axes — see labReducer.ts's computeBodyStyles.
// Composed together (never merged from a flat preset list), so toggling one
// never clobbers the other two.
export interface BodyThemeState {
  colorMode: "light" | "dark";
  glass: boolean;
  centered: boolean;
}

export interface LabElement {
  id: string;
  tag: string;
  parentId: string | null;
  order?: number;
  styles: Record<string, string>;
  attrs: Record<string, string>;
  content: string;
  /** Parsed text stays literal and keeps whitespace around inline children. */
  preserveText?: boolean;
  trailingText?: string;
  mediaQueries: MediaQuery[];
}

// A single JS/JSX source file in the JavaScript tab. Kind (`js` vs `jsx`) is
// derived from `name`'s extension rather than stored separately — one less
// thing that could disagree with the filename. Files concatenate in array
// order into one shared-scope script (see labReducer's `mainJsCode`/
// `buildJsBundle`) — there's no real ES module resolution, so a component
// defined in an earlier file is just available by name to a later one.
export interface JsFile {
  id: string;
  name: string;
  code: string;
}

export interface LabPage {
  id: string;
  name: string;
  elements: LabElement[];
  bodyStyles: BodyStyles;
  jsFiles: JsFile[];
  customCss: string;
  /** Empty string means "use the exporter's hardcoded default" (`<title>My Page</title>`,
   *  no favicon link) — every page created before these fields existed behaves identically. */
  pageTitle?: string;
  faviconUrl?: string;
}

export interface LabState {
  elements: LabElement[];
  selectedId: string | null;
  showOverlay: boolean;
  showLabels: boolean;
  customCss: string;
  jsFiles: JsFile[];
  activeJsFileId: string;
  history: LabElement[][];
  bodyStyles: BodyStyles;
  bodyTheme: BodyThemeState;
  mode: "single" | "multi";
  pages: LabPage[];
  activePageId: string | null;
  cdnLinks: string[];
  /** See `LabPage.pageTitle`/`faviconUrl` — same "empty means default" convention. */
  pageTitle: string;
  faviconUrl: string;
}

// ─── Style update helper ──────────────────────────────────────────────────────

export interface StyleUpdate {
  id: string;
  styles: Record<string, string>;
}

// ─── Component / theme types (used by componentLibrary and PropertiesPanel) ───

export interface ComponentTheme {
  id: string;
  name: string;
  description?: string;
  parentStyles?: Record<string, string>;
  childStylesByTag?: Record<string, Record<string, string>>;
  childStylesByIndex?: Record<number, Record<string, string>>;
}

export interface ThemeGroup {
  label: string;
  themes: ComponentTheme[];
}

export interface Component {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  matches: (children: LabElement[], parentTag: string | null) => boolean;
  themeGroups: ThemeGroup[];
  template: LabElement[];
}


// ─── Example gallery types ────────────────────────────────────────────────────

export interface SinglePageData {
  elements: LabElement[];
  bodyStyles: BodyStyles;
  /** Legacy single-string form — normalized into a one-entry `jsFiles` on load. Prefer `jsFiles` for new examples. */
  javascript?: string;
  jsFiles?: JsFile[];
  customCss?: string;
  cdnLinks?: string[];
  pageTitle?: string;
  faviconUrl?: string;
}

export interface MultiPageData {
  pages: LabPage[];
  cdnLinks?: string[];
}

export type ExampleData = SinglePageData | MultiPageData;

export interface Example {
  id: string;
  name: string;
  description: string;
  icon: string;
  generate: () => ExampleData;
  badge?: string;
  requiresCdn?: string[];
}

// ─── Reducer action union ─────────────────────────────────────────────────────

export type Action =
  | { type: "LOAD_EXAMPLE"; payload: ExampleData }
  | { type: "TOGGLE_CDN"; payload: string }
  | { type: "SET_PAGE_META"; payload: { pageTitle?: string; faviconUrl?: string } }
  | { type: "APPLY_GLOBAL_THEME"; payload: { updates: StyleUpdate[]; bodyStyles?: Record<string, string> } }
  | { type: "ADD_ELEMENT"; payload: string }
  | { type: "DELETE_ELEMENT"; payload: string }
  | { type: "SELECT"; payload: string | null }
  | { type: "PUSH_HISTORY" }
  | { type: "NEST_ELEMENT"; payload: { childId: string; parentId: string; order?: number } }
  | { type: "MOVE_TO_ROOT"; payload: { id: string; order: number } }
  | { type: "REORDER_ELEMENT"; payload: { id: string; parentId: string | null; order: number } }
  | { type: "DUPLICATE_ELEMENT"; payload: { id: string; parentId: string | null; order: number } }
  | { type: "RESIZE_ELEMENT"; payload: { id: string; w: number; h: number } }
  | { type: "UPDATE_STYLE"; payload: { prop: string; value: string } }
  | { type: "UPDATE_MULTI_STYLE"; payload: { ids: string[]; prop: string; value: string } }
  | { type: "APPLY_PRESET"; payload: Record<string, string> }
  | { type: "ADD_MEDIA_QUERY"; payload: MediaQuery }
  | { type: "REMOVE_MEDIA_QUERY"; payload: number }
  | { type: "UPDATE_CONTENT"; payload: string }
  | { type: "UPDATE_TAG"; payload: string }
  | { type: "UPDATE_ATTR"; payload: { prop: string; value: string } }
  | { type: "SET_FROM_CODE"; payload: LabElement[] }
  | { type: "UPDATE_BODY_STYLE"; payload: { prop: string; value: string } }
  | { type: "SET_FROM_CSS"; payload: { elements: LabElement[]; customCss: string; bodyStyles?: BodyStyles } }
  | { type: "SET_ACTIVE_JS_FILE"; payload: string }
  | { type: "UPDATE_JS_FILE_CODE"; payload: { id: string; code: string } }
  | { type: "ADD_JS_FILES"; payload: JsFile[] }
  | { type: "RENAME_JS_FILE"; payload: { id: string; name: string } }
  | { type: "DELETE_JS_FILE"; payload: string }
  /** Appends to the main (first) JS file, creating it if none exists yet — for
   *  toolbox actions (inserting a JS preset/snippet) that don't care which
   *  file the code lands in, unlike direct editing of a specific open file. */
  | { type: "APPEND_MAIN_JS"; payload: string }
  | { type: "SET_CUSTOM_CSS"; payload: string }
  | { type: "TOGGLE_OVERLAY" }
  | { type: "TOGGLE_LABELS" }
  | { type: "INSERT_TEMPLATE"; payload: LabElement[] | { template: LabElement[]; autoTheme?: ComponentTheme | null } }
  | { type: "APPLY_COMPONENT_THEME"; payload: { updates: StyleUpdate[] } }
  | { type: "SET_COLOR_MODE"; payload: "light" | "dark" }
  | { type: "TOGGLE_GLASS" }
  | { type: "TOGGLE_CENTERED" }
  | { type: "RESET_BODY_THEME" }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "TOGGLE_MULTIPAGE" }
  | { type: "SWITCH_PAGE"; payload: string }
  | { type: "ADD_PAGE"; payload?: string }
  | { type: "DELETE_PAGE"; payload: string }
  | { type: "RENAME_PAGE"; payload: { id: string; name: string } };
