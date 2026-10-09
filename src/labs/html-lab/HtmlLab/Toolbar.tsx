import styles from "./HtmlLab.module.css";
import PageSettingsControl from "./PageSettingsControl";

interface Props {
  showOverlay: boolean;
  showLabels: boolean;
  previewMode: boolean;
  multiPageMode: boolean;
  pageTitle: string;
  faviconUrl: string;
  onChangePageMeta: (next: { pageTitle?: string; faviconUrl?: string }) => void;
  onToggleOverlay: () => void;
  onToggleLabels: () => void;
  onTogglePreview: () => void;
  onToggleMultiPage: () => void;
  onImport: () => void;
  onNew: () => void;
  onUndo: () => void;
  onClear: () => void;
  onExport: () => void;
  onExportSplit: () => void;
  canUndo: boolean;
  onBack?: () => void;
  onLoadExample: () => void;
  onLoadStarter: () => void;
}

export default function Toolbar({
  showOverlay,
  showLabels,
  previewMode,
  multiPageMode,
  pageTitle,
  faviconUrl,
  onChangePageMeta,
  onToggleOverlay,
  onToggleLabels,
  onTogglePreview,
  onToggleMultiPage,
  onImport,
  onNew,
  onUndo,
  onClear,
  onExport,
  onExportSplit,
  canUndo,
  onBack,
  onLoadExample,
  onLoadStarter,
}: Props) {
  return (
    <div className={styles.toolbar}>
      {onBack && (
        <button className={styles.backBtn} onClick={onBack} title="Back to Labs">
          ✕ Close
        </button>
      )}
      <span className={styles.toolbarLogo}>HTML Lab</span>
      <div className={styles.toolbarSep} />

      <button
        className={`${styles.tbBtn} ${previewMode ? styles.tbBtnGoEdit : styles.tbBtnGoPreview}`}
        onClick={onTogglePreview}
        title={previewMode ? "Inspect elements (Esc)" : "Interact with the live page"}
      >
        {previewMode ? "✎ Inspect" : "▶ Interact"}
      </button>

      <button
        className={`${styles.tbBtn} ${multiPageMode ? styles.tbBtnActive : ""}`}
        onClick={onToggleMultiPage}
        title={multiPageMode ? "Join all pages into one" : "Split into multiple pages"}
      >
        {multiPageMode ? "⊟ Single page" : "⊞ Multi-page"}
      </button>

      <div className={styles.toolbarSep} />

      <button
        className={styles.tbBtn}
        onClick={onImport}
        title="Import HTML, CSS, or JS files (select multiple to batch-import)"
      >
        ↑ Import
      </button>

      <button
        className={styles.tbBtn}
        onClick={onExport}
        title={multiPageMode ? "Download all pages as separate self-contained HTML files" : "Download as single self-contained index.html"}
      >
        {multiPageMode ? "↓ Export All" : "↓ Export"}
      </button>
      {!multiPageMode && (
        <button
          className={styles.tbBtn}
          onClick={onExportSplit}
          title="Download as 3 separate files: index.html + styles.css + script.js"
        >
          ↓ Split files
        </button>
      )}

      <div className={styles.toolbarSep} />

      <button
        className={`${styles.tbBtn} ${showLabels ? styles.tbBtnActive : ""}`}
        onClick={onToggleLabels}
        title="Show/hide element tag labels"
      >
        &lt;/&gt; Labels
      </button>

      <button
        className={`${styles.tbBtn} ${showOverlay ? styles.tbBtnActive : ""}`}
        onClick={onToggleOverlay}
        title="Toggle box model overlay on selected element"
      >
        ⬜ Box model
      </button>

      <button
        className={styles.tbBtn}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo last action"
      >
        ↩ Undo
      </button>

      <div className={styles.toolbarSep} />

      <PageSettingsControl pageTitle={pageTitle} faviconUrl={faviconUrl} onChange={onChangePageMeta} />

      <div className={styles.toolbarSep} />

      <button
        className={`${styles.tbBtn} ${styles.tbBtnNew}`}
        onClick={onNew}
        title="Start a new blank project"
      >
        <span className={styles.newIcon}>+</span> New
      </button>

      <button
        className={`${styles.tbBtn} ${styles.tbBtnDanger}`}
        onClick={onClear}
        title="Clear canvas"
      >
        ✕ Clear
      </button>

      <div className={styles.toolbarSep} />

      <button
        className={`${styles.tbBtn} ${styles.tbBtnStarter}`}
        onClick={onLoadStarter}
        title="Load a bare-bones starter file for one tool or technique"
      >
        🧩 Starter Files
      </button>

      <button
        className={`${styles.tbBtn} ${styles.tbBtnExample}`}
        onClick={onLoadExample}
        title="Load a full example project"
      >
        🌟 Load Example
      </button>
    </div>
  );
}
