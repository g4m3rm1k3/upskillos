import { useState, useReducer, useCallback, useRef, useMemo, useEffect } from "react";
import Toolbar from "./Toolbar";
import LivePreview from "./LivePreview";
import CodePanel from "./CodePanel";
import PropertiesPanel from "./PropertiesPanel";
import ConfirmDialog, { shouldSkip } from "./ConfirmDialog";
import ExamplePickerModal from "./ExamplePickerModal";
import TableBuilderModal from "./TableBuilderModal";
import { EXAMPLES } from "./exampleGallery";
import { STARTERS } from "./starterGallery";
import { labReducer, initialState, inferBodyTheme, jsFilesFromLegacy, mainJsCode, buildJsBundle, withMainJsCode, newJsFile } from "./labReducer";
import { hasJsx, transpileBundle } from "./jsxTranspile";
import { detectComponents, buildThemeUpdates } from "./componentLibrary";
import { resolveCdnTags, reactCdnTags } from "./cdnLibraries";
import {
  applyCssToElements,
  elementsToCss,
  elementsToHtml,
  htmlToElements,
  generateExportHtml,
  generateLinkedHtml,
  parseHtmlDocument,
} from "./htmlSync";
import styles from "./HtmlLab.module.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS hooks file, no type declarations
import { useThemeColors } from "../../../hooks/useThemeColors.js";
import type { LabElement, LabPage, JsFile } from "./types";

interface HtmlLabProps {
  onBack?: () => void;
}

interface ConfirmState {
  storageKey: string;
  message: string;
  resolve: (value: boolean) => void;
}

interface FileRead {
  name: string;
  content: string;
  ext: string;
}

export default function HtmlLab({ onBack }: HtmlLabProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = useThemeColors();
  const hlVars: Record<string, string> = {
    "--hl-bg":           C.bg,
    "--hl-surface":      C.surface,
    "--hl-surface2":     C.surface2,
    "--hl-border":       C.border,
    "--hl-text":         C.text,
    "--hl-muted":        C.muted,
    "--hl-hint":         C.hint,
    "--hl-accent":       C.blue,
    "--hl-accent-strong": C.blue,
    "--hl-accent-bg":    C.blueBg,
    "--hl-keyword":      C.teal,
    "--hl-keyword-bg":   C.tealBg,
    "--hl-string":       C.amber,
    "--hl-string-bg":    C.amberBg,
    "--hl-accent2":      C.purple,
    "--hl-accent2-bg":   C.purpleBg,
    "--hl-positive":     C.green,
    "--hl-positive-bg":  C.greenBg,
    "--hl-danger":       C.red,
    "--hl-danger-bg":    C.redBg,
    "--hl-canvas":       C.isDark ? C.canvasSurface : "#fafafa",
  };

  const [state, dispatch] = useReducer(labReducer, undefined, () => {
    const exData = (EXAMPLES.find(e => e.id === "showcase") ?? EXAMPLES[0]).generate();
    const ex = 'pages' in exData
      ? { elements: exData.pages[0]?.elements ?? [], bodyStyles: exData.pages[0]?.bodyStyles ?? {}, jsFiles: exData.pages[0]?.jsFiles ?? [] }
      : { elements: exData.elements, bodyStyles: exData.bodyStyles, jsFiles: jsFilesFromLegacy(exData.javascript, exData.jsFiles) };
    return {
      ...initialState,
      elements: ex.elements,
      bodyStyles: ex.bodyStyles,
      bodyTheme: inferBodyTheme(ex.bodyStyles),
      jsFiles: ex.jsFiles,
      activeJsFileId: ex.jsFiles[0]?.id ?? "",
    };
  });
  const [codePanelWidth, setCodePanelWidth]   = useState<number>(360);
  const [propsPanelWidth, setPropsPanelWidth] = useState<number>(280);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  // Stays undefined until the first real insert — CodePanel treats any
  // defined value as "jump to JavaScript now," so starting at a real number
  // like 0 would force that jump on the very first render too.
  const [jsJumpToken, setJsJumpToken] = useState<number | undefined>(undefined);
  const bumpJsJumpToken = (): void => setJsJumpToken((token) => (token ?? 0) + 1);
  const [previewMode, setPreviewMode]           = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog]       = useState<ConfirmState | null>(null);
  const [showExamplePicker, setShowExamplePicker] = useState<boolean>(false);
  const [showStarterPicker, setShowStarterPicker] = useState<boolean>(false);
  const [showTableBuilder, setShowTableBuilder] = useState<boolean>(false);

  const matchedComponents = useMemo(() => {
    if (!state.selectedId) return [];
    return detectComponents(state.selectedId, state.elements);
  }, [state.selectedId, state.elements]);

  // Transpiled once per jsFiles change (not per render) — Babel only runs
  // when any file is .jsx (see hasJsx inside transpileBundle), so plain-JS
  // projects pay nothing here.
  const transpiledJs = useMemo(
    () => transpileBundle(buildJsBundle(state.jsFiles), state.jsFiles),
    [state.jsFiles],
  );
  const previewCdnTags = useMemo(
    () => [...resolveCdnTags(state.cdnLinks), ...(hasJsx(state.jsFiles) ? reactCdnTags() : [])],
    [state.cdnLinks, state.jsFiles],
  );

  const bodyIsDark = useMemo(() => {
    const bg = state.bodyStyles.backgroundColor || "";
    if (bg.startsWith("#") && bg.length === 7) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35;
    }
    const gradient = state.bodyStyles.background || "";
    return gradient.includes("0f172a") || gradient.includes("1e293b");
  }, [state.bodyStyles]);

  const multiElement = useMemo((): LabElement | null => {
    if (multiSelectedIds.length < 2) return null;
    const els = multiSelectedIds
      .map(id => state.elements.find(e => e.id === id))
      .filter((e): e is LabElement => e !== undefined);
    const allProps = [...new Set(els.flatMap(e => Object.keys(e.styles || {})))];
    const sharedStyles: Record<string, string> = {};
    if (els.length > 0) {
      allProps.forEach(prop => {
        const vals = els.map(e => e.styles?.[prop]);
        if (vals.every(v => v === vals[0] && v !== undefined)) sharedStyles[prop] = vals[0]!;
      });
    }
    return { id: "__multi__", tag: "div", styles: sharedStyles, attrs: {}, content: "", parentId: null, mediaQueries: [] };
  }, [multiSelectedIds, state.elements]);

  const dividerDragging      = useRef<boolean>(false);
  const dividerStartX        = useRef<number>(0);
  const dividerStartW        = useRef<number>(0);
  const fileInputRef         = useRef<HTMLInputElement | null>(null);
  const propsDividerDragging = useRef<boolean>(false);
  const propsDividerStartX   = useRef<number>(0);
  const propsDividerStartW   = useRef<number>(0);

  const askConfirm = useCallback((storageKey: string, message: string): Promise<boolean> => {
    if (shouldSkip(storageKey)) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ storageKey, message, resolve });
    });
  }, []);

  const generatedCode = elementsToHtml(state.elements);
  const generatedCss  = elementsToCss(state.elements, state.customCss, state.bodyStyles);

  const selectedElement: LabElement = state.selectedId
    ? state.elements.find((e) => e.id === state.selectedId) ?? {
        id: "__body__", tag: "body", styles: state.bodyStyles, content: "",
        attrs: {}, mediaQueries: [], parentId: null,
      }
    : { id: "__body__", tag: "body", styles: state.bodyStyles, content: "",
        attrs: {}, mediaQueries: [], parentId: null };

  const handleCodeChange = useCallback(
    (newCode: string): void => {
      const parsed = htmlToElements(newCode, state.elements, mainJsCode(state.jsFiles));
      if (parsed) dispatch({ type: "SET_FROM_CODE", payload: parsed });
    },
    [state.elements, state.jsFiles],
  );

  const handleCssChange = useCallback(
    (newCss: string): void => {
      const parsed = applyCssToElements(newCss, state.elements, mainJsCode(state.jsFiles));
      dispatch({ type: "SET_FROM_CSS", payload: parsed });
    },
    [state.elements, state.jsFiles],
  );

  const handleDividerMouseDown = (e: React.MouseEvent): void => {
    dividerDragging.current = true;
    dividerStartX.current   = e.clientX;
    dividerStartW.current   = codePanelWidth;
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent): void => {
      if (!dividerDragging.current) return;
      const delta = ev.clientX - dividerStartX.current;
      setCodePanelWidth(Math.max(200, Math.min(640, dividerStartW.current + delta)));
    };
    const onUp = (): void => {
      dividerDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
  };

  const handlePropsDividerMouseDown = (e: React.MouseEvent): void => {
    propsDividerDragging.current = true;
    propsDividerStartX.current   = e.clientX;
    propsDividerStartW.current   = propsPanelWidth;
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent): void => {
      if (!propsDividerDragging.current) return;
      const delta = propsDividerStartX.current - ev.clientX;
      setPropsPanelWidth(Math.max(200, Math.min(560, propsDividerStartW.current + delta)));
    };
    const onUp = (): void => {
      propsDividerDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const extOrder: Record<string, number> = { html: 0, css: 1, js: 2, jsx: 2, ts: 2, tsx: 2 };
    files.sort((a, b) => {
      const ea = a.name.split(".").pop()?.toLowerCase() ?? "";
      const eb = b.name.split(".").pop()?.toLowerCase() ?? "";
      return (extOrder[ea] ?? 9) - (extOrder[eb] ?? 9);
    });

    const hasHtml = files.some(f => f.name.toLowerCase().endsWith(".html"));
    if (hasHtml) {
      const label = files.length > 1
        ? `${files.length} files (${files.map(f => f.name).join(", ")})`
        : `"${files[0].name}"`;
      const ok = await askConfirm("import_html", `Import ${label}? This replaces your current canvas.`);
      if (!ok) return;
    }

    const reads = await Promise.all(files.map(f => new Promise<FileRead>(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve({
        name: f.name,
        content: ev.target?.result as string,
        ext: f.name.split(".").pop()?.toLowerCase() ?? "",
      });
      reader.readAsText(f);
    })));

    let elements = state.elements;
    let bodyStyles = { ...initialState.bodyStyles, ...state.bodyStyles };
    let jsFiles = state.jsFiles;
    let customCss  = state.customCss ?? "";

    const htmlRead = reads.find(r => r.ext === "html");
    if (htmlRead) {
      const parsed = parseHtmlDocument(htmlRead.content);
      elements   = parsed.elements || [];
      bodyStyles = { ...initialState.bodyStyles, ...(parsed.bodyStyles || {}) };
      jsFiles    = jsFilesFromLegacy(parsed.javascript || "");
      customCss  = parsed.css || "";
    }

    const cssRead = reads.find(r => r.ext === "css");
    if (cssRead) {
      const applied = applyCssToElements(cssRead.content, elements, mainJsCode(jsFiles));
      elements = applied.elements ?? elements;
      if (applied.bodyStyles) bodyStyles = { ...bodyStyles, ...applied.bodyStyles };
      if (applied.customCss) customCss = applied.customCss;
    }

    // Every selected .js/.jsx/.ts/.tsx file becomes its own entry — previously
    // only the first of several selected JS files survived (`reads.find`),
    // the rest were silently dropped.
    const jsReads = reads.filter(r => r.ext === "js" || r.ext === "jsx" || r.ext === "ts" || r.ext === "tsx");
    const newJsFiles: JsFile[] = jsReads.map(r => ({
      id: "js" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: r.name,
      code: r.content,
    }));
    if (newJsFiles.length > 0) jsFiles = [...jsFiles, ...newJsFiles];

    if (htmlRead) {
      dispatch({ type: "LOAD_EXAMPLE", payload: { elements, bodyStyles, jsFiles, customCss } });
    } else {
      if (cssRead) dispatch({ type: "SET_FROM_CSS", payload: { elements, customCss, bodyStyles } });
      if (newJsFiles.length > 0 && !cssRead) dispatch({ type: "ADD_JS_FILES", payload: newJsFiles });
    }
  }, [askConfirm, state.elements, state.bodyStyles, state.jsFiles, state.customCss]);

  const exportPage = useCallback((page: LabPage): void => {
    const cdnTags = [...resolveCdnTags(state.cdnLinks), ...(hasJsx(page.jsFiles) ? reactCdnTags() : [])];
    const bundle = transpileBundle(buildJsBundle(page.jsFiles), page.jsFiles);
    if (bundle.error) { window.alert("Couldn't export — compile error:\n\n" + bundle.error); return; }
    const html = generateExportHtml(page.elements, page.bodyStyles, page.customCss || "", bundle.code, cdnTags, page.pageTitle || "My Page", page.faviconUrl || "");
    const slug = page.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "page";
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${slug}.html`; a.click();
    URL.revokeObjectURL(url);
  }, [state.cdnLinks]);

  const exportSplit = useCallback((): void => {
    const cdnTags = [...resolveCdnTags(state.cdnLinks), ...(hasJsx(state.jsFiles) ? reactCdnTags() : [])];
    const jsNames = state.jsFiles.length > 0 ? state.jsFiles.map(f => f.name) : ["script.js"];
    const html = generateLinkedHtml(state.elements, cdnTags, jsNames, state.pageTitle || "My Page", state.faviconUrl || "");
    const css  = elementsToCss(state.elements, state.customCss, state.bodyStyles);
    function dl(content: string, filename: string, mime: string): void {
      const blob = new Blob([content], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
    dl(html, "index.html", "text/html");
    setTimeout(() => dl(css, "styles.css", "text/css"), 150);
    // Each file downloads as its own real source — not transpiled or merged,
    // so a downloaded multi-file project stays editable exactly as authored.
    if (state.jsFiles.length > 0) {
      state.jsFiles.forEach((f, i) => setTimeout(() => dl(f.code, f.name, "text/javascript"), 300 + i * 150));
    } else {
      setTimeout(() => dl("// script.js", "script.js", "text/javascript"), 300);
    }
  }, [state.elements, state.bodyStyles, state.customCss, state.jsFiles, state.cdnLinks]);

  return (
    <div className={styles.app} style={hlVars as React.CSSProperties}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.css,.js,.jsx,.ts,.tsx"
        multiple
        style={{ display: "none" }}
        onChange={handleFileImport}
      />
      {confirmDialog && (
        <ConfirmDialog
          storageKey={confirmDialog.storageKey}
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}
          onCancel={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
        />
      )}
      {showExamplePicker && (
        <ExamplePickerModal
          items={EXAMPLES}
          title="Choose an Example Project"
          onSelect={async (ex) => {
            setShowExamplePicker(false);
            const ok = await askConfirm("load_example", `Load "${ex.name}"? This will replace your current canvas.`);
            if (ok) {
              const data = ex.generate();
              dispatch({ type: "LOAD_EXAMPLE", payload: data });
            }
          }}
          onClose={() => setShowExamplePicker(false)}
        />
      )}
      {showStarterPicker && (
        <ExamplePickerModal
          items={STARTERS}
          title="Choose a Starter File"
          onSelect={async (ex) => {
            setShowStarterPicker(false);
            const ok = await askConfirm("load_starter", `Load "${ex.name}" starter? This will replace your current canvas.`);
            if (ok) {
              const data = ex.generate();
              dispatch({ type: "LOAD_EXAMPLE", payload: data });
            }
          }}
          onClose={() => setShowStarterPicker(false)}
        />
      )}
      {showTableBuilder && (
        <TableBuilderModal
          onInsert={(template) => {
            dispatch({ type: "INSERT_TEMPLATE", payload: { template } });
            setShowTableBuilder(false);
          }}
          onClose={() => setShowTableBuilder(false)}
        />
      )}
      <Toolbar
        showOverlay={state.showOverlay}
        showLabels={state.showLabels}
        previewMode={previewMode}
        multiPageMode={state.mode === "multi"}
        pageTitle={state.pageTitle}
        faviconUrl={state.faviconUrl}
        onChangePageMeta={(next) => dispatch({ type: "SET_PAGE_META", payload: next })}
        onToggleOverlay={() => dispatch({ type: "TOGGLE_OVERLAY" })}
        onToggleLabels={() => dispatch({ type: "TOGGLE_LABELS" })}
        onTogglePreview={() => setPreviewMode(v => !v)}
        onToggleMultiPage={() => dispatch({ type: "TOGGLE_MULTIPAGE" })}
        onImport={() => fileInputRef.current?.click()}
        onNew={async () => {
          const ok = await askConfirm("new_project", "Start a new blank project? This will clear everything.");
          if (ok) {
            dispatch({ type: "LOAD_EXAMPLE", payload: { elements: [], bodyStyles: { ...initialState.bodyStyles }, jsFiles: [newJsFile()] } });
            setPreviewMode(false);
            setMultiSelectedIds([]);
          }
        }}
        onUndo={() => dispatch({ type: "UNDO" })}
        onClear={async () => {
          const ok = await askConfirm("clear_canvas", "Clear all elements from the canvas?");
          if (ok) dispatch({ type: "CLEAR" });
        }}
        onExport={() => {
          if (state.mode === "multi") {
            const pages = state.pages.map((p) =>
              p.id === state.activePageId
                ? { ...p, elements: state.elements, bodyStyles: state.bodyStyles, jsFiles: state.jsFiles, customCss: state.customCss, pageTitle: state.pageTitle, faviconUrl: state.faviconUrl }
                : p,
            );
            pages.forEach((page, i) => setTimeout(() => exportPage(page), i * 200));
          } else {
            exportPage({ id: "", name: "index", elements: state.elements, bodyStyles: state.bodyStyles, customCss: state.customCss, jsFiles: state.jsFiles, pageTitle: state.pageTitle, faviconUrl: state.faviconUrl });
          }
        }}
        onExportSplit={exportSplit}
        canUndo={state.history.length > 0}
        onBack={onBack}
        onLoadExample={() => setShowExamplePicker(true)}
        onLoadStarter={() => setShowStarterPicker(true)}
      />

      {state.mode === "multi" && (
        <PageTabStrip
          pages={state.pages}
          activePageId={state.activePageId ?? ""}
          onSwitch={(id) => dispatch({ type: "SWITCH_PAGE", payload: id })}
          onAdd={() => dispatch({ type: "ADD_PAGE" })}
          onDelete={(id) => dispatch({ type: "DELETE_PAGE", payload: id })}
          onRename={(id, name) => dispatch({ type: "RENAME_PAGE", payload: { id, name } })}
        />
      )}

      <div className={styles.main}>
        <CodePanel
          html={generatedCode}
          css={generatedCss}
          jsFiles={state.jsFiles}
          activeJsFileId={state.activeJsFileId}
          width={codePanelWidth}
          selectedId={state.selectedId}
          elements={state.elements}
          multiSelectedIds={multiSelectedIds}
          jsJumpToken={jsJumpToken}
          onHtmlChange={handleCodeChange}
          onCssChange={handleCssChange}
          onSetActiveJsFile={(id) => dispatch({ type: "SET_ACTIVE_JS_FILE", payload: id })}
          onJsFileCodeChange={(id, code) => dispatch({ type: "UPDATE_JS_FILE_CODE", payload: { id, code } })}
          onAddJsFile={(file) => dispatch({ type: "ADD_JS_FILES", payload: [file] })}
          onRenameJsFile={(id, name) => dispatch({ type: "RENAME_JS_FILE", payload: { id, name } })}
          onDeleteJsFile={(id) => dispatch({ type: "DELETE_JS_FILE", payload: id })}
          onSelectElement={(id) => {
            dispatch({ type: "SELECT", payload: id });
            setMultiSelectedIds([]);
          }}
          onToggleMultiSelect={(id) =>
            setMultiSelectedIds(prev => {
              const s = new Set(prev);
              if (s.has(id)) s.delete(id); else s.add(id);
              return [...s];
            })
          }
          onSelectRange={(ids) => setMultiSelectedIds(ids)}
          onDeleteElement={(id) => dispatch({ type: "DELETE_ELEMENT", payload: id })}
          onAddElement={(tag) => dispatch({ type: "ADD_ELEMENT", payload: tag })}
          bodyIsDark={bodyIsDark}
          onInsertTemplate={(template, autoTheme) =>
            dispatch({ type: "INSERT_TEMPLATE", payload: { template, autoTheme } })
          }
          onInsertJsPreset={(template, code) => {
            dispatch({ type: "INSERT_TEMPLATE", payload: { template } });
            dispatch({ type: "APPEND_MAIN_JS", payload: appendJavascriptSnippet(mainJsCode(state.jsFiles), code) });
          }}
          onOpenTableBuilder={() => setShowTableBuilder(true)}
          cdnLinks={state.cdnLinks}
          onToggleCdn={(id) => dispatch({ type: "TOGGLE_CDN", payload: id })}
          onReorderElement={(id, parentId, order) =>
            dispatch({ type: "REORDER_ELEMENT", payload: { id, parentId, order } })
          }
          onNestElement={(childId, parentId, order) =>
            dispatch({ type: "NEST_ELEMENT", payload: { childId, parentId, order } })
          }
          onMoveElementToRoot={(id, order) =>
            dispatch({ type: "MOVE_TO_ROOT", payload: { id, order } })
          }
          onDuplicateElement={(id, parentId, order) =>
            dispatch({ type: "DUPLICATE_ELEMENT", payload: { id, parentId, order } })
          }
        />

        <div className={styles.divider} onMouseDown={handleDividerMouseDown} />

        <LivePreview
          elements={state.elements} bodyStyles={state.bodyStyles} customCss={state.customCss}
          javascript={transpiledJs.code} error={transpiledJs.error} cdnTags={previewCdnTags}
          pageTitle={state.pageTitle} faviconUrl={state.faviconUrl}
          inspect={!previewMode} selectedId={state.selectedId}
          showLabels={state.showLabels} showOverlay={state.showOverlay}
          onSelect={(id) => { dispatch({ type: "SELECT", payload: id }); setMultiSelectedIds([]); }}
        />
        {!previewMode && (<>
            <div className={styles.propsDivider} onMouseDown={handlePropsDividerMouseDown} />
            <PropertiesPanel
              style={{ width: propsPanelWidth, flexShrink: 0 }}
              element={selectedElement}
              allElements={state.elements}
              multiSelectedIds={multiSelectedIds}
              multiElement={multiElement}
              matchedComponents={matchedComponents}
              bodyTheme={!state.selectedId ? state.bodyTheme : null}
              onDelete={(id) => dispatch({ type: "DELETE_ELEMENT", payload: id })}
              onApplyComponentTheme={(theme) => {
                const updates = buildThemeUpdates(state.selectedId ?? "", state.elements, theme);
                dispatch({ type: "APPLY_COMPONENT_THEME", payload: { updates } });
              }}
              onSetColorMode={(mode) => dispatch({ type: "SET_COLOR_MODE", payload: mode })}
              onToggleGlass={() => dispatch({ type: "TOGGLE_GLASS" })}
              onToggleCentered={() => dispatch({ type: "TOGGLE_CENTERED" })}
              onResetBodyTheme={() => dispatch({ type: "RESET_BODY_THEME" })}
              onChange={(prop, value) =>
                state.selectedId
                  ? dispatch({ type: "UPDATE_STYLE", payload: { prop, value } })
                  : dispatch({ type: "UPDATE_BODY_STYLE", payload: { prop, value } })
              }
              onMultiStyleChange={(prop, value) =>
                dispatch({ type: "UPDATE_MULTI_STYLE", payload: { ids: multiSelectedIds, prop, value } })
              }
              onContentChange={(value) => dispatch({ type: "UPDATE_CONTENT", payload: value })}
              onTagChange={(tag) => dispatch({ type: "UPDATE_TAG", payload: tag })}
              onAttrChange={(prop, value) =>
                dispatch({ type: "UPDATE_ATTR", payload: { prop, value } })
              }
              javascript={mainJsCode(state.jsFiles)}
              onInsertJavascript={(snippet) => {
                dispatch({ type: "APPEND_MAIN_JS", payload: appendJavascriptSnippet(mainJsCode(state.jsFiles), snippet) });
                bumpJsJumpToken();
              }}
              onInsertJsPreset={(template, code) => {
                dispatch({ type: "INSERT_TEMPLATE", payload: { template } });
                dispatch({ type: "APPEND_MAIN_JS", payload: appendJavascriptSnippet(mainJsCode(state.jsFiles), code) });
                bumpJsJumpToken();
              }}
              onApplyPreset={(presetStyles) =>
                dispatch({ type: "APPLY_PRESET", payload: presetStyles })
              }
              onAddMediaQuery={(mq) => dispatch({ type: "ADD_MEDIA_QUERY", payload: mq })}
              onRemoveMediaQuery={(index) => dispatch({ type: "REMOVE_MEDIA_QUERY", payload: index })}
            />
          </>
        )}
      </div>
    </div>
  );
}

function appendJavascriptSnippet(current: string, snippet: string): string {
  const trimmed = current.trimEnd();
  if (trimmed.includes(snippet.trim())) return current;
  return `${trimmed}${trimmed ? "\n\n" : ""}${snippet}`;
}

// ── Page Tab Strip ────────────────────────────────────────────────────────────

interface PageTabStripProps {
  pages: LabPage[];
  activePageId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function PageTabStrip({ pages, activePageId, onSwitch, onAdd, onDelete, onRename }: PageTabStripProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft]         = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.select();
  }, [editingId]);

  function startRename(page: LabPage, e: React.MouseEvent): void {
    e.stopPropagation();
    setEditingId(page.id);
    setDraft(page.name);
  }

  function commitRename(): void {
    if (editingId && draft.trim()) onRename(editingId, draft.trim());
    setEditingId(null);
  }

  return (
    <div className={styles.pageTabStrip}>
      {pages.map((page) => (
        <div
          key={page.id}
          className={`${styles.pageTab} ${page.id === activePageId ? styles.pageTabActive : ""}`}
          onClick={() => onSwitch(page.id)}
          onDoubleClick={(e) => startRename(page, e)}
          title="Double-click to rename"
        >
          {editingId === page.id ? (
            <input
              ref={inputRef}
              className={styles.pageTabInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingId(null);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={styles.pageTabName}>{page.name}</span>
          )}
          {pages.length > 1 && (
            <button
              className={styles.pageTabDel}
              onClick={(e) => { e.stopPropagation(); onDelete(page.id); }}
              title="Delete page"
            >✕</button>
          )}
        </div>
      ))}
      <button className={styles.pageTabAdd} onClick={onAdd} title="Add page">+ Page</button>
    </div>
  );
}
