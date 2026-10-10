import { useRef, useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import styles from "./HtmlLab.module.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS context files, no type declarations
import { useGlobalTheme } from "../../../context/ThemeContext.jsx";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS hooks file, no type declarations
import { useThemeColors } from "../../../hooks/useThemeColors.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS utils file, no type declarations
import { setupOpenCalcMonaco } from "../../../utils/monacoThemes.js";
import { COMPONENTS } from "./componentLibrary";
import { JS_PRESETS } from "./jsPresets";
import { CDN_LIBRARIES } from "./cdnLibraries";
import { CONTAINER_TAGS } from "./labReducer";
import type { LabElement, ComponentTheme, JsFile } from "./types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JSX panel, no type declarations
import LessonsPanel from "./LessonsPanel.jsx";
import VisualJsPanel from "./VisualJsPanel";

type MonacoEditor = Parameters<OnMount>[0];
type MonacoApi    = Parameters<OnMount>[1];

const TABS = [
  { key: "html",       label: "HTML",       language: "html" },
  { key: "css",        label: "CSS",        language: "css" },
  { key: "javascript", label: "JavaScript", language: "javascript" },
  { key: "tree",       label: "Tree",       language: null },
  { key: "toolbox",    label: "Toolbox",    language: null },
  { key: "lessons",    label: "Lessons",    language: null },
  { key: "visual",     label: "Visual JS",  language: null },
] as const;

type TabKey = typeof TABS[number]["key"];

// Tabs that don't hold Monaco source code — the editor stays unmounted for these.
const NON_EDITOR_TABS = new Set<TabKey>(["tree", "toolbox", "lessons", "visual"]);

// The JavaScript tab holds several files that can each be a different real
// language (.js, .jsx, .ts, .tsx) — Monaco's syntax highlighting/IntelliSense
// should reflect the *active file's* actual extension, not a single language
// hardcoded for the whole tab.
function languageForJsFile(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  return "javascript";
}

// ── Elements (raw tags, one-click add — grouped by category) ───────────────────

interface ElementDef { tag: string; label: string; title: string; category: string; }

const ELEMENTS: ElementDef[] = [
  { tag: "div",     label: "div",     title: "Generic container",         category: "Layout" },
  { tag: "section", label: "section", title: "Section container",         category: "Layout" },
  { tag: "article", label: "article", title: "Article container",        category: "Layout" },
  { tag: "header",  label: "header",  title: "Header container",         category: "Layout" },
  { tag: "footer",  label: "footer",  title: "Footer container",         category: "Layout" },
  { tag: "nav",     label: "nav",     title: "Navigation container",     category: "Layout" },
  { tag: "ul",      label: "ul",      title: "Unordered list",           category: "Lists" },
  { tag: "ol",      label: "ol",      title: "Ordered list",             category: "Lists" },
  { tag: "li",      label: "li",      title: "List item",                category: "Lists" },
  { tag: "p",       label: "p",       title: "Paragraph",                category: "Text" },
  { tag: "h1",      label: "H1",      title: "Heading 1",                category: "Text" },
  { tag: "h2",      label: "H2",      title: "Heading 2",                category: "Text" },
  { tag: "h3",      label: "H3",      title: "Heading 3",                category: "Text" },
  { tag: "h4",      label: "H4",      title: "Heading 4",                category: "Text" },
  { tag: "h5",      label: "H5",      title: "Heading 5",                category: "Text" },
  { tag: "h6",      label: "H6",      title: "Heading 6",                category: "Text" },
  { tag: "span",    label: "span",    title: "Inline container",         category: "Text" },
  { tag: "blockquote", label: "quote", title: "Blockquote",              category: "Text" },
  { tag: "pre",     label: "pre",     title: "Preformatted code block",  category: "Text" },
  { tag: "code",    label: "code",    title: "Inline code",              category: "Text" },
  { tag: "address", label: "address", title: "Contact/address block",    category: "Text" },
  { tag: "br",      label: "br",      title: "Line break",               category: "Text" },
  { tag: "strong",  label: "strong",  title: "Bold / strong importance", category: "Inline text" },
  { tag: "em",      label: "em",      title: "Italic / emphasis",        category: "Inline text" },
  { tag: "b",       label: "b",       title: "Bold (no semantic weight)", category: "Inline text" },
  { tag: "i",       label: "i",       title: "Italic (no semantic weight)", category: "Inline text" },
  { tag: "u",       label: "u",       title: "Underline",                category: "Inline text" },
  { tag: "s",       label: "s",       title: "Strikethrough",            category: "Inline text" },
  { tag: "small",   label: "small",   title: "Small print",              category: "Inline text" },
  { tag: "mark",    label: "mark",    title: "Highlighted text",         category: "Inline text" },
  { tag: "sub",     label: "sub",     title: "Subscript",                category: "Inline text" },
  { tag: "sup",     label: "sup",     title: "Superscript",              category: "Inline text" },
  { tag: "kbd",     label: "kbd",     title: "Keyboard input",           category: "Inline text" },
  { tag: "time",    label: "time",    title: "Date / time",              category: "Inline text" },
  { tag: "label",   label: "label",   title: "Form label",               category: "Forms" },
  { tag: "input",   label: "input",   title: "Text input field",         category: "Forms" },
  { tag: "textarea", label: "textarea", title: "Multi-line text field",  category: "Forms" },
  { tag: "button",  label: "button",  title: "Button",                   category: "Interactive" },
  { tag: "a",       label: "a",       title: "Anchor / link",            category: "Interactive" },
  { tag: "img",     label: "img",     title: "Image placeholder",        category: "Media" },
  { tag: "hr",      label: "hr",      title: "Horizontal rule",          category: "Media" },
  { tag: "video",   label: "video",   title: "Video player",             category: "Media" },
  { tag: "audio",   label: "audio",   title: "Audio player",             category: "Media" },
  { tag: "iframe",  label: "iframe",  title: "Embedded frame",           category: "Media" },
  { tag: "canvas",  label: "canvas",  title: "Canvas (JS drawing surface)", category: "Media" },
];

function groupByCategory<T extends { category: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push(item);
  }
  return Array.from(map.entries());
}

// ── Collapsible section (VS Toolbox-style — nests: Toolbox tab > type region > category) ──

interface CollapsibleSectionProps {
  title: string;
  count: number;
  nested?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, count, nested, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`${styles.collapseSection} ${nested ? styles.collapseSectionNested : ""}`}>
      <button className={styles.collapseHeader} onClick={() => setOpen((o) => !o)} type="button">
        <span>{open ? "▼" : "▶"} {title}</span>
        <span className={styles.collapseCount}>{count}</span>
      </button>
      {open && <div className={styles.collapseBody}>{children}</div>}
    </div>
  );
}

// ── Elements region ────────────────────────────────────────────────────────────

interface ElementsSectionProps {
  onAddElement: (tag: string) => void;
  onHover: (desc: string | null) => void;
}

function ElementsSection({ onAddElement, onHover }: ElementsSectionProps) {
  return (
    <CollapsibleSection title="Elements" count={ELEMENTS.length}>
      {groupByCategory(ELEMENTS).map(([category, items]) => (
        <CollapsibleSection key={category} title={category} count={items.length} nested>
          <div className={styles.pickerGrid}>
            {items.map((item) => (
              <button
                key={item.tag}
                className={styles.compCard}
                onClick={() => onAddElement(item.tag)}
                onMouseEnter={() => onHover(item.title)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(item.title)}
                onBlur={() => onHover(null)}
                type="button"
              >
                <span className={styles.compName}>{item.label}</span>
              </button>
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </CollapsibleSection>
  );
}

// ── Components region ────────────────────────────────────────────────────────────

interface ComponentsSectionProps {
  bodyIsDark: boolean;
  onInsertTemplate: (template: LabElement[], autoTheme: ComponentTheme | null) => void;
  onInsertJsPreset: (template: LabElement[], code: string) => void;
  onOpenTableBuilder: () => void;
  onHover: (desc: string | null) => void;
}

function ComponentsSection({ bodyIsDark, onInsertTemplate, onInsertJsPreset, onOpenTableBuilder, onHover }: ComponentsSectionProps) {
  const jsPresets = JS_PRESETS.filter((p) => p.template);
  const totalCount = COMPONENTS.length + jsPresets.length;

  return (
    <CollapsibleSection title="Components" count={totalCount}>
      {groupByCategory(COMPONENTS).map(([category, items]) => (
        <CollapsibleSection key={category} title={category} count={items.length} nested>
          <div className={styles.pickerGrid}>
            {items.map((comp) => (
              <button
                key={comp.id}
                className={styles.compCard}
                onClick={() => {
                  // A table can't usefully start as one fixed scaffold — the modal
                  // lets the user pick rows/columns/spans/header before insertion.
                  if (comp.id === "table-structure") { onOpenTableBuilder(); return; }
                  const autoTheme = bodyIsDark
                    ? comp.themeGroups.flatMap((g) => g.themes).find((t) =>
                        t.name.toLowerCase() === "dark" || t.id.endsWith("-dark")
                      ) ?? null
                    : null;
                  onInsertTemplate(comp.template, autoTheme);
                }}
                onMouseEnter={() => onHover(comp.description)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(comp.description)}
                onBlur={() => onHover(null)}
                type="button"
              >
                <span className={styles.compIcon}>{comp.icon}</span>
                <span className={styles.compName}>{comp.name}</span>
              </button>
            ))}
          </div>
        </CollapsibleSection>
      ))}
      <CollapsibleSection title="⚡ Interactive (JS)" count={jsPresets.length} nested>
        <div className={styles.pickerGrid}>
          {jsPresets.map((preset) => (
            <button
              key={preset.id}
              className={styles.compCard}
              onClick={() => onInsertJsPreset(preset.template, preset.code)}
              onMouseEnter={() => onHover(preset.description)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(preset.description)}
              onBlur={() => onHover(null)}
              type="button"
            >
              <span className={styles.compIcon}>{preset.icon}</span>
              <span className={styles.compName}>{preset.label}</span>
            </button>
          ))}
        </div>
      </CollapsibleSection>
    </CollapsibleSection>
  );
}

// ── Libraries region ─────────────────────────────────────────────────────────────

interface LibrariesSectionProps {
  cdnLinks: string[];
  onToggleCdn: (id: string) => void;
}

function LibrariesSection({ cdnLinks, onToggleCdn }: LibrariesSectionProps) {
  return (
    <CollapsibleSection title="Libraries" count={CDN_LIBRARIES.length}>
      <div className={styles.pickerGrid}>
        {CDN_LIBRARIES.map((lib) => {
          const active = cdnLinks.includes(lib.id);
          return (
            <button
              key={lib.id}
              className={`${styles.libCard} ${active ? styles.libCardActive : ""}`}
              onClick={() => onToggleCdn(lib.id)}
              title={lib.url}
              type="button"
            >
              <span className={styles.libIcon}>{lib.icon}</span>
              <span className={styles.libName}>{lib.label}</span>
              <span className={styles.libCat}>{lib.category}</span>
              <span className={styles.libDesc}>{lib.description}</span>
              <span className={`${styles.libBadge} ${active ? styles.libBadgeOn : ""}`}>
                {active ? "ON" : "OFF"}
              </span>
            </button>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

// ── Toolbox tab — one panel, collapsible regions per type (like the VS XAML Toolbox) ──

interface ToolboxPickerProps {
  onAddElement: (tag: string) => void;
  bodyIsDark: boolean;
  onInsertTemplate: (template: LabElement[], autoTheme: ComponentTheme | null) => void;
  onInsertJsPreset: (template: LabElement[], code: string) => void;
  onOpenTableBuilder: () => void;
  cdnLinks: string[];
  onToggleCdn: (id: string) => void;
}

function ToolboxPicker({ onAddElement, bodyIsDark, onInsertTemplate, onInsertJsPreset, onOpenTableBuilder, cdnLinks, onToggleCdn }: ToolboxPickerProps) {
  const [hoverDesc, setHoverDesc] = useState<string | null>(null);
  return (
    <div className={styles.pickerPanel}>
      <div className={styles.pickerScroll}>
        <ElementsSection onAddElement={onAddElement} onHover={setHoverDesc} />
        <ComponentsSection
          bodyIsDark={bodyIsDark}
          onInsertTemplate={onInsertTemplate}
          onInsertJsPreset={onInsertJsPreset}
          onOpenTableBuilder={onOpenTableBuilder}
          onHover={setHoverDesc}
        />
        <LibrariesSection cdnLinks={cdnLinks} onToggleCdn={onToggleCdn} />
      </div>
      <div className={styles.descStrip}>{hoverDesc || "Hover an item to see what it does."}</div>
    </div>
  );
}

let glowStyleInjected = false;
function injectGlowStyle(): void {
  if (glowStyleInjected) return;
  glowStyleInjected = true;
  const el = document.createElement("style");
  el.textContent = `
    .htmllab-highlight-line {
      background: rgba(86, 156, 214, 0.13) !important;
      border-left: 3px solid #569cd6 !important;
    }
    .htmllab-highlight-gutter {
      background: #569cd6 !important;
      width: 3px !important;
      left: 0 !important;
    }
  `;
  document.head.appendChild(el);
}

// ── Element Tree ──────────────────────────────────────────────────────────────
// Drag-and-drop here mirrors CanvasPanel's exactly (same drop-zone-between-
// siblings + drop-on-container-to-nest pattern, same onReorder/onNest/
// onMoveToRoot actions) so a subtree drags as a unit for the same reason it
// does on the canvas: NEST_ELEMENT/REORDER_ELEMENT/MOVE_TO_ROOT only ever
// reassign the dragged element's own parentId/order — descendants keep
// pointing at it by id, so they come along for free.

interface TreeProps {
  elements: LabElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  multiSelectedIds: string[];
  onToggleMultiSelect: (id: string) => void;
}

interface ElementTreeProps extends TreeProps {
  onSelectRange: (ids: string[]) => void;
  onReorder: (id: string, parentId: string | null, order: number) => void;
  onNest: (childId: string, parentId: string, order: number) => void;
  onMoveToRoot: (id: string, order: number) => void;
  onDuplicate: (id: string, parentId: string | null, order: number) => void;
}

interface DropTargetInfo { parentId: string | null; order: number; inside?: boolean; }

// Depth-first pre-order walk matching exactly how TreeBranch renders rows top
// to bottom (each element immediately followed by its own children before
// the next sibling) — this is the order shift-click range selection needs to
// walk to know what's "between" the anchor and the clicked row.
function flattenTreeOrder(elements: LabElement[]): string[] {
  const childrenByParent = new Map<string | null, LabElement[]>();
  for (const el of elements) {
    const key = el.parentId ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(el);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const order: string[] = [];
  function walk(parentId: string | null): void {
    for (const el of childrenByParent.get(parentId) ?? []) {
      order.push(el.id);
      walk(el.id);
    }
  }
  walk(null);
  return order;
}

function ElementTree({ elements, selectedId, onSelect, onDelete, multiSelectedIds, onToggleMultiSelect, onSelectRange, onReorder, onNest, onMoveToRoot, onDuplicate }: ElementTreeProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetInfo | null>(null);
  // Drops outside the tree (including onto the preview iframe), cancellation,
  // and source-row removal must all release the tree's drag state.
  useEffect(() => {
    const clear = () => { setDraggingId(null); setDropTarget(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') clear(); };
    window.addEventListener('dragend', clear, true);
    window.addEventListener('drop', clear, true);
    window.addEventListener('blur', clear);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('dragend', clear, true);
      window.removeEventListener('drop', clear, true);
      window.removeEventListener('blur', clear);
      window.removeEventListener('keydown', key);
    };
  }, []);

  // Purely a view concern — not part of undo history or export, so plain
  // local state is enough. Keyed by element id, not depth, so collapsing one
  // branch doesn't affect siblings at the same level.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const byId: Record<string, LabElement> = {};
  for (const e of elements) byId[e.id] = e;
  const flatOrder = flattenTreeOrder(elements);
  const parentIdsWithChildren = new Set(elements.filter((e) => e.parentId).map((e) => e.parentId!));

  const toggleCollapse = (id: string): void => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const collapseAll = (): void => setCollapsedIds(new Set(parentIdsWithChildren));
  const expandAll = (): void => setCollapsedIds(new Set());

  const handleDragStartItem = (e: React.DragEvent, id: string): void => {
    e.stopPropagation();
    // Must allow both operations up front — declaring only "move" here means
    // the browser can refuse to complete the drop at all once the user holds
    // Ctrl (requesting "copy", which isn't in the allowed set), rather than
    // just showing the wrong cursor. That's almost certainly why Ctrl+drag
    // looked like it "did nothing": the drop event never fired.
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };
  const handleDragEndItem = (): void => {
    setDraggingId(null);
    setDropTarget(null);
  };
  // Ctrl/Alt held while dropping = duplicate instead of move — same
  // convention as Explorer/Finder/Figma drag-and-drop. dropEffect gives the
  // OS-native copy cursor (a "+" badge) as feedback while dragging.
  const isCopyModifier = (e: React.DragEvent): boolean => e.ctrlKey || e.altKey;
  const handleZoneEnter = (e: React.DragEvent, parentId: string | null, order: number): void => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = isCopyModifier(e) ? "copy" : "move";
    setDropTarget({ parentId, order });
  };
  const handleInsideEnter = (e: React.DragEvent, parentId: string, order: number): void => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = isCopyModifier(e) ? "copy" : "move";
    setDropTarget({ parentId, order, inside: true });
  };
  const handleDropItem = (e: React.DragEvent, parentId: string | null, order: number): void => {
    e.preventDefault();
    e.stopPropagation();
    const childId = e.dataTransfer.getData("text/plain");
    const child = childId ? byId[childId] : undefined;
    if (child) {
      if (isCopyModifier(e)) {
        onDuplicate(childId, parentId, order);
      } else if (parentId === null) {
        if (child.parentId === null) onReorder(childId, null, order);
        else onMoveToRoot(childId, order);
      } else {
        if (child.parentId === parentId) onReorder(childId, parentId, order);
        else onNest(childId, parentId, order);
      }
    }
    setDropTarget(null);
    setDraggingId(null);
  };

  const rootCount = elements.filter((e) => !e.parentId).length;
  const bodyIsDropInside = !!dropTarget?.inside && dropTarget.parentId === null;
  const handleBodyDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = isCopyModifier(e) ? "copy" : "move";
    setDropTarget({ parentId: null, order: rootCount, inside: true });
  };

  // Shift-click range select — the anchor is the current single selection
  // (selectedId), same as a file explorer: shift-click extends/shrinks the
  // range from that fixed point without moving it, so repeated shift-clicks
  // adjust one contiguous range instead of compounding.
  const handleSelectRange = (targetId: string): void => {
    const anchor = selectedId ?? targetId;
    const anchorIdx = flatOrder.indexOf(anchor);
    const targetIdx = flatOrder.indexOf(targetId);
    if (anchorIdx === -1 || targetIdx === -1) { onSelect(targetId); return; }
    const [start, end] = anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
    onSelectRange(flatOrder.slice(start, end + 1));
  };

  return (
    <div className={styles.codeTreePanel}>
      <div className={styles.treeToolbar}>
        <button className={styles.treeToolbarBtn} onClick={collapseAll} title="Collapse all elements with children">
          Collapse All
        </button>
        <button className={styles.treeToolbarBtn} onClick={expandAll} title="Expand every collapsed element">
          Expand All
        </button>
      </div>
      <button
        className={`${styles.treeItem} ${!selectedId ? styles.treeItemSelected : ""} ${bodyIsDropInside ? styles.treeItemDropInside : ""}`}
        onClick={() => onSelect(null)}
        title="<body> — page root — drop an element here to move it to the top level"
        onDragOver={handleBodyDragOver}
        onDragEnter={handleBodyDragOver}
        onDrop={(e) => handleDropItem(e, null, rootCount)}
      >
        <span className={styles.treeTagBody}>&lt;body&gt;</span>
        <span className={styles.treeItemLabel}>page root</span>
      </button>
      <TreeBranch
        elements={elements}
        selectedId={selectedId}
        onSelect={onSelect}
        onDelete={onDelete}
        parentId={null}
        depth={1}
        multiSelectedIds={multiSelectedIds}
        onToggleMultiSelect={onToggleMultiSelect}
        onSelectRange={handleSelectRange}
        onDuplicate={onDuplicate}
        collapsedIds={collapsedIds}
        onToggleCollapse={toggleCollapse}
        draggingId={draggingId}
        dropTarget={dropTarget}
        onDragStartItem={handleDragStartItem}
        onDragEndItem={handleDragEndItem}
        onZoneEnter={handleZoneEnter}
        onInsideEnter={handleInsideEnter}
        onDropItem={handleDropItem}
      />
    </div>
  );
}

interface BranchProps extends TreeProps {
  parentId: string | null;
  depth: number;
  draggingId: string | null;
  dropTarget: DropTargetInfo | null;
  // Reports "this row was shift-clicked" up to ElementTree, which owns the
  // flattened tree order and the anchor (selectedId) needed to resolve that
  // into an actual range — TreeBranch itself has neither.
  onSelectRange: (targetId: string) => void;
  onDuplicate: (id: string, parentId: string | null, order: number) => void;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onDragStartItem: (e: React.DragEvent, id: string) => void;
  onDragEndItem: () => void;
  onZoneEnter: (e: React.DragEvent, parentId: string | null, order: number) => void;
  onInsideEnter: (e: React.DragEvent, parentId: string, order: number) => void;
  onDropItem: (e: React.DragEvent, parentId: string | null, order: number) => void;
}

function TreeBranch({
  elements, selectedId, onSelect, onDelete, parentId, depth, multiSelectedIds, onToggleMultiSelect, onSelectRange, onDuplicate,
  collapsedIds, onToggleCollapse,
  draggingId, dropTarget, onDragStartItem, onDragEndItem, onZoneEnter, onInsideEnter, onDropItem,
}: BranchProps) {
  const children = (elements || [])
    .filter(e => (e.parentId ?? null) === (parentId ?? null))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const dropZone = (order: number, key: string): React.ReactNode => {
    const isActive = !!draggingId && !!dropTarget && !dropTarget.inside &&
      (dropTarget.parentId ?? null) === (parentId ?? null) && dropTarget.order === order;
    return (
      <div
        key={key}
        className={`${styles.dropZone} ${isActive ? styles.dropZoneActive : ""}`}
        style={{ marginLeft: `${depth * 14 + 8}px` }}
        onDragOver={(e) => onZoneEnter(e, parentId, order)}
        onDragEnter={(e) => onZoneEnter(e, parentId, order)}
        onDrop={(e) => onDropItem(e, parentId, order)}
      />
    );
  };

  return (
    <>
      {children.length > 0 && dropZone(0, `${parentId ?? "root"}-dz-0`)}
      {children.map((el, i) => {
        const isSelected = el.id === selectedId;
        const isMulti = multiSelectedIds?.includes(el.id);
        const isDragging = el.id === draggingId;
        const isContainer = CONTAINER_TAGS.has(el.tag);
        const isDropInside = isContainer && !!dropTarget?.inside && dropTarget.parentId === el.id;
        const ownChildCount = elements.filter((c) => c.parentId === el.id).length;
        const hasChildren = ownChildCount > 0;
        const isCollapsed = collapsedIds.has(el.id);
        // Depth cycles through a small palette so nested regions read as
        // distinct bands at a glance — the same idea as bracket-pair
        // colorization in a code editor, applied to tree indentation instead.
        const depthClass = styles[`treeDepth${((depth - 1) % 5) + 1}`];

        return (
          <div key={el.id}>
            <button
              className={[
                styles.treeItem,
                depthClass,
                isSelected ? styles.treeItemSelected : "",
                isMulti ? styles.treeItemMulti : "",
                isDragging ? styles.treeItemDragging : "",
                isDropInside ? styles.treeItemDropInside : "",
              ].join(" ")}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              title={`<${el.tag}>${el.content ? ` "${el.content.slice(0, 30)}"` : ""} — Ctrl+click to multi-select, Shift+click to select a range, drag to move (hold Ctrl/Alt while dragging to duplicate)`}
              draggable
              onDragStart={(e) => onDragStartItem(e, el.id)}
              onDragEnd={onDragEndItem}
              onDragOver={(e) => { if (isContainer) onInsideEnter(e, el.id, ownChildCount); }}
              onDragEnter={(e) => { if (isContainer) onInsideEnter(e, el.id, ownChildCount); }}
              onDrop={(e) => { if (isContainer) onDropItem(e, el.id, ownChildCount); }}
              onClick={(e) => {
                if (e.shiftKey && onSelectRange) {
                  e.preventDefault();
                  onSelectRange(el.id);
                } else if ((e.ctrlKey || e.metaKey) && onToggleMultiSelect) {
                  e.preventDefault();
                  onToggleMultiSelect(el.id);
                } else {
                  onSelect(el.id);
                }
              }}
            >
              {hasChildren ? (
                <span
                  className={styles.treeCollapseToggle}
                  onClick={(e) => { e.stopPropagation(); onToggleCollapse(el.id); }}
                  title={isCollapsed ? "Expand" : "Collapse"}
                >{isCollapsed ? "▸" : "▾"}</span>
              ) : (
                <span className={styles.treeCollapseSpacer} />
              )}
              <span className={styles.treeTag}>&lt;{el.tag}&gt;</span>
              {el.content && (
                <span className={styles.treeItemLabel}>{el.content.slice(0, 24)}</span>
              )}
              {hasChildren && isCollapsed && (
                <span className={styles.treeChildCount}>{ownChildCount}</span>
              )}
              {isMulti && <span className={styles.treeMultiBadge}>✓</span>}
              <button
                className={styles.treeDuplicateBtn}
                onClick={(e) => { e.stopPropagation(); onDuplicate(el.id, el.parentId, (el.order ?? 0) + 1); }}
                title="Duplicate — inserts a copy right after this element"
              >⧉</button>
              <button
                className={styles.treeDeleteBtn}
                onClick={(e) => { e.stopPropagation(); onDelete(el.id); }}
                title="Delete"
              >×</button>
            </button>
            {!isCollapsed && (
              <TreeBranch
                elements={elements}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                parentId={el.id}
                depth={depth + 1}
                multiSelectedIds={multiSelectedIds}
                onToggleMultiSelect={onToggleMultiSelect}
                onSelectRange={onSelectRange}
                onDuplicate={onDuplicate}
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                draggingId={draggingId}
                dropTarget={dropTarget}
                onDragStartItem={onDragStartItem}
                onDragEndItem={onDragEndItem}
                onZoneEnter={onZoneEnter}
                onInsideEnter={onInsideEnter}
                onDropItem={onDropItem}
              />
            )}
            {isContainer && !isCollapsed && (
              // A real closing-tag row — the same bracket-pair idea VS Code
              // uses for matching braces, applied to nesting depth (same
              // depthClass as the opening row above), and a big, obvious drop
              // target for "append as the last child here" instead of only
              // the thin dropzone bar or having to drop back on the opening
              // row itself.
              <div
                className={[styles.treeItem, styles.treeClosingTag, depthClass, isDropInside ? styles.treeItemDropInside : ""].join(" ")}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                title={`</${el.tag}> — drop here to add as the last child`}
                onClick={() => onSelect(el.id)}
                onDragOver={(e) => onInsideEnter(e, el.id, ownChildCount)}
                onDragEnter={(e) => onInsideEnter(e, el.id, ownChildCount)}
                onDrop={(e) => onDropItem(e, el.id, ownChildCount)}
              >
                <span className={styles.treeCollapseSpacer} />
                <span className={styles.treeTag}>&lt;/{el.tag}&gt;</span>
              </div>
            )}
            {dropZone(i + 1, `${parentId ?? "root"}-dz-${i + 1}`)}
          </div>
        );
      })}
    </>
  );
}

// ── Range finders ─────────────────────────────────────────────────────────────

interface LineRange { start: number; end: number; }

function findHtmlRanges(text: string, selectedId: string): LineRange[] {
  const lines = text.split("\n");
  const marker = `data-lab-id="${selectedId}"`;

  let openLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) { openLine = i; break; }
  }
  if (openLine === -1) return [];

  if (lines[openLine].trimEnd().endsWith("/>")) {
    return [{ start: openLine + 1, end: openLine + 1 }];
  }

  const tagMatch = lines[openLine].match(/<(\w[\w-]*)/);
  if (!tagMatch) return [{ start: openLine + 1, end: openLine + 1 }];
  const tagName = tagMatch[1];

  const openRe  = new RegExp(`<${tagName}[\\s>/]`);
  const closeRe = new RegExp(`</${tagName}>`);

  let depth     = 0;
  let closeLine = openLine;

  for (let i = openLine; i < lines.length; i++) {
    const line  = lines[i];
    const opens  = (line.match(openRe)  || []).length;
    const closes = (line.match(closeRe) || []).length;
    depth += opens - closes;
    if (depth <= 0 && i >= openLine) { closeLine = i; break; }
  }

  return [{ start: openLine + 1, end: closeLine + 1 }];
}

function findCssRanges(text: string, selectedId: string): LineRange[] {
  const lines  = text.split("\n");
  const marker = `[data-lab-id="${selectedId}"]`;

  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) { startLine = i; break; }
  }
  if (startLine === -1) return [];

  let endLine = startLine;
  let depth   = 0;
  for (let i = startLine; i < lines.length; i++) {
    const opens  = (lines[i].match(/\{/g) || []).length;
    const closes = (lines[i].match(/\}/g) || []).length;
    depth += opens - closes;
    if (i > startLine && depth <= 0) { endLine = i; break; }
    if (i === startLine && opens > 0 && depth <= 0) { endLine = i; break; }
  }

  return [{ start: startLine + 1, end: endLine + 1 }];
}

function findJsRanges(text: string, selectedId: string): LineRange[] {
  const lines = text.split("\n");
  return lines.reduce<LineRange[]>((acc, line, i) => {
    if (line.includes(selectedId)) acc.push({ start: i + 1, end: i + 1 });
    return acc;
  }, []);
}

function findRanges(text: string, selectedId: string, tab: string): LineRange[] {
  if (!text || !selectedId) return [];
  if (tab === "html")       return findHtmlRanges(text, selectedId);
  if (tab === "css")        return findCssRanges(text, selectedId);
  if (tab === "javascript") return findJsRanges(text, selectedId);
  return [];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CodePanelProps {
  html: string;
  css: string;
  jsFiles: JsFile[];
  activeJsFileId: string;
  width: string | number;
  selectedId: string | null;
  elements: LabElement[];
  multiSelectedIds: string[];
  /** Lesson playback: switches to this tab while a step's build is revealing
   *  content there (e.g. jump to "JavaScript" while a script types itself in). */
  focusTab?: "html" | "css" | "javascript";
  /** Properties Panel: bump this (any new number) whenever a snippet/event
   *  handler is inserted into the JS, so the student actually sees the code
   *  that just got generated instead of it silently landing off-screen on
   *  the JavaScript tab. Deliberately a separate signal from `focusTab` —
   *  that one carries a specific tab value lesson playback jumps *between*;
   *  this one only ever means "javascript, right now," and needs to fire
   *  even if the target tab hasn't changed since the last time (an object
   *  or plain value that happened to repeat wouldn't re-trigger the
   *  effect — a counter always does, by construction). */
  jsJumpToken?: number;
  /** Lesson playback: forces Monaco's displayed text to match `html`/`css`/
   *  the active JS file even if the editor still thinks it's focused — playback
   *  never involves real typing, so there's no live edit to protect, and
   *  without this an editor that's picked up focus for any reason would
   *  silently keep showing a stale frame while state moves on underneath it. */
  forceSync?: boolean;
  onHtmlChange: (val: string) => void;
  onCssChange: (val: string) => void;
  onSetActiveJsFile: (id: string) => void;
  onJsFileCodeChange: (id: string, code: string) => void;
  onAddJsFile: (file: JsFile) => void;
  onRenameJsFile: (id: string, name: string) => void;
  onDeleteJsFile: (id: string) => void;
  onSelectElement: (id: string | null) => void;
  onToggleMultiSelect: (id: string) => void;
  onSelectRange: (ids: string[]) => void;
  onDeleteElement: (id: string) => void;
  onAddElement: (tag: string) => void;
  bodyIsDark: boolean;
  onInsertTemplate: (template: LabElement[], autoTheme: ComponentTheme | null) => void;
  onInsertJsPreset: (template: LabElement[], code: string) => void;
  onOpenTableBuilder: () => void;
  cdnLinks: string[];
  onToggleCdn: (id: string) => void;
  onReorderElement: (id: string, parentId: string | null, order: number) => void;
  onNestElement: (childId: string, parentId: string, order: number) => void;
  onMoveElementToRoot: (id: string, order: number) => void;
  onDuplicateElement: (id: string, parentId: string | null, order: number) => void;
}

export default function CodePanel({
  html,
  css,
  jsFiles,
  activeJsFileId,
  width,
  selectedId,
  elements,
  multiSelectedIds,
  focusTab,
  jsJumpToken,
  forceSync,
  onHtmlChange,
  onCssChange,
  onSetActiveJsFile,
  onJsFileCodeChange,
  onAddJsFile,
  onRenameJsFile,
  onDeleteJsFile,
  onSelectElement,
  onToggleMultiSelect,
  onSelectRange,
  onDeleteElement,
  onAddElement,
  bodyIsDark,
  onInsertTemplate,
  onInsertJsPreset,
  onOpenTableBuilder,
  cdnLinks,
  onToggleCdn,
  onReorderElement,
  onNestElement,
  onMoveElementToRoot,
  onDuplicateElement,
}: CodePanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = useThemeColors();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { themeStyles }: any = useGlobalTheme();
  const monacoTheme: string = themeStyles?.monaco || (C.isDark ? "openmat-dark" : "openmat-light");

  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef      = useRef<MonacoEditor | null>(null);
  const monacoRef      = useRef<MonacoApi | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isFocused      = useRef(false);
  const extraLibsRef   = useRef<Map<string, { dispose: () => void }>>(new Map());
  const jsModelKeysRef = useRef<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>("html");
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // Mount Visual JS panel on first visit, keep mounted after (preserves block state)
  const [visualMounted, setVisualMounted] = useState(false);
  // Increments every time the user switches to the Visual JS tab — VisualJsPanel
  // watches this to know when to auto-import the active JS file.
  const [visualTabCount, setVisualTabCount] = useState(0);
  // Ref-based stable callback — identity never changes so VCS's onCodeChange
  // effect won't loop when HtmlLab re-renders after syncing generated code.
  // Takes the fileId directly from VisualJsPanel now (it tracks blocks per
  // file), instead of guessing "whichever file is active" — the two can
  // briefly disagree during a file switch, and writing to the wrong file's
  // code would silently corrupt it.
  const visualCodeSyncRef = useRef<{ onJsFileCodeChange: typeof onJsFileCodeChange } | null>(null);
  useEffect(() => { visualCodeSyncRef.current = { onJsFileCodeChange }; });
  const handleVisualCodeChange = useCallback((fileId: string, code: string) => {
    visualCodeSyncRef.current?.onJsFileCodeChange(fileId, code);
  }, []);

  const activeJsFile = jsFiles.find((f) => f.id === activeJsFileId) ?? jsFiles[0];
  const javascript = activeJsFile?.code ?? "";

  const sources: Record<string, string>                     = { html, css, javascript };
  const handlers: Record<string, (val: string) => void>    = {
    html: onHtmlChange,
    css: onCssChange,
    javascript: (val) => { if (activeJsFile) onJsFileCodeChange(activeJsFile.id, val); },
  };
  const activeSource   = sources[activeTab]   ?? "";
  const activeLanguage = activeTab === "javascript"
    ? languageForJsFile(activeJsFile?.name ?? "script.js")
    : TABS.find((t) => t.key === activeTab)?.language || "html";

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (isFocused.current && !forceSync) return;
    if (editor.getValue() !== activeSource) editor.setValue(activeSource);
  }, [activeSource, forceSync]);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  useEffect(() => {
    applyDecorations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, activeTab]);

  // Monaco unmounts entirely on tabs that don't hold source code (tree,
  // toolbox, lessons, visual — see NON_EDITOR_TABS), but nothing ever
  // cleared editorRef.current when that happened. Every "if (editor)" guard
  // elsewhere in this file then saw a stale, disposed editor instance and
  // trusted its (frozen, outdated) getValue() — confirmed real bug:
  // switching JS files while on the Visual JS tab flushed the last thing
  // Monaco displayed before it unmounted into whichever file was actually
  // active, silently clobbering that file's real code.
  useEffect(() => {
    if (NON_EDITOR_TABS.has(activeTab)) editorRef.current = null;
  }, [activeTab]);

  useEffect(() => {
    if (focusTab) setActiveTab(focusTab);
  }, [focusTab]);

  useEffect(() => {
    if (jsJumpToken !== undefined) setActiveTab("javascript");
    // Only ever reacts to jsJumpToken changing, deliberately excluding
    // anything else from the dependency array — this must fire once per
    // insertion, not once per render for any other reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsJumpToken]);

  // A real, unique Monaco model path per JS/TS file — keyed by id (stable
  // across a rename) *and* name (so a rename, which changes the file's
  // extension, gets a genuinely different path and is re-classified by
  // Monaco instead of keeping its old language). Without a real path here,
  // the actively-edited file is an anonymous model with no extension at
  // all, which — verified live — makes cross-file type lookups (below)
  // corrupt that file's own JSX parsing. HTML and CSS stay on the old
  // anonymous single-model behavior; they're single-file already.
  function jsFilePath(file: JsFile): string {
    return `file:///js/${file.id}/${file.name}`;
  }

  // HTML Lab's JS/TS files have no real import/export — every file
  // concatenates into one shared runtime scope (see buildJsBundle). Monaco
  // doesn't know that: each file is checked as an isolated model, so a
  // component defined in Display.tsx and used from Calculator.tsx is
  // flagged "Cannot find name 'Display'" even though the code is correct
  // and runs fine. addExtraLib feeds every *other* file's source to the
  // TypeScript language service as an ambient script (no import/export
  // means TS treats it as contributing to the global scope, matching the
  // real concatenated bundle) so cross-file references resolve for both
  // diagnostics and autocomplete. typescriptDefaults only — also
  // registering to javascriptDefaults (verified live) corrupts the active
  // file's own JSX parsing.
  function syncCrossFileLibs(monaco: MonacoApi): void {
    const otherFileIds = new Set(jsFiles.filter((f) => f.id !== activeJsFile?.id).map((f) => f.id));
    for (const [id, disposable] of extraLibsRef.current) {
      if (!otherFileIds.has(id)) {
        disposable.dispose();
        extraLibsRef.current.delete(id);
      }
    }
    for (const file of jsFiles) {
      if (file.id === activeJsFile?.id) continue;
      // Re-registering the same uri updates it in place; disposing the
      // previous disposable first (verified live) leaves the TypeScript
      // worker's extra-lib versioning inconsistent and corrupts parsing.
      extraLibsRef.current.set(file.id, monaco.languages.typescript.typescriptDefaults.addExtraLib(file.code, jsFilePath(file)));
    }
  }

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    syncCrossFileLibs(monaco);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsFiles, activeJsFileId]);

  // Dispose the real Monaco model behind a file once that exact id+name
  // combination is gone — covers delete (the id disappears), rename (the
  // old id+name pair disappears, replaced by a new one — see jsFilePath),
  // and a fresh "+ New" project replacing jsFiles wholesale. Without this,
  // renamed/deleted files' models pile up in Monaco's global registry for
  // the rest of the session.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    const currentKeys = new Set(jsFiles.map((f) => jsFilePath(f)));
    for (const oldKey of jsModelKeysRef.current) {
      if (!currentKeys.has(oldKey)) {
        monaco.editor.getModel(monaco.Uri.parse(oldKey))?.dispose();
      }
    }
    jsModelKeysRef.current = currentKeys;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsFiles]);

  function applyDecorations(): void {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    if (!selectedId) return;

    const text   = editor.getValue();
    const ranges = findRanges(text, selectedId, activeTab);
    if (ranges.length === 0) return;

    const newDecorations = ranges.map(({ start, end }) => ({
      range: new monaco.Range(start, 1, end, 1),
      options: {
        isWholeLine: true,
        className: "htmllab-highlight-line",
        linesDecorationsClassName: "htmllab-highlight-gutter",
        overviewRuler: {
          color: "#569cd6",
          position: monaco.editor.OverviewRulerLane.Right,
        },
      },
    }));

    decorationsRef.current = editor.deltaDecorations([], newDecorations);
    editor.revealLineInCenter(ranges[0].start, monaco.editor.ScrollType.Smooth);
  }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;
    injectGlowStyle();

    editor.setValue(activeSource);
    editor.onDidFocusEditorText(() => { isFocused.current = true;  });
    editor.onDidBlurEditorText(()  => { isFocused.current = false; });

    syncCrossFileLibs(monaco);
    setTimeout(applyDecorations, 0);
  };

  const switchTab = (tab: TabKey): void => {
    if (tab === activeTab) return;
    if (tab === "visual" && !visualMounted) setVisualMounted(true);
    if (tab === "visual") setVisualTabCount(c => c + 1);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    if (!NON_EDITOR_TABS.has(activeTab)) {
      const editor = editorRef.current;
      if (editor && editor.getValue() !== sources[activeTab]) handlers[activeTab]?.(editor.getValue());
    }
    isFocused.current = false;
    setActiveTab(tab);
    if (!NON_EDITOR_TABS.has(tab)) {
      requestAnimationFrame(() => {
        const nextEditor = editorRef.current;
        if (nextEditor) nextEditor.setValue(sources[tab] ?? "");
      });
    }
  };

  // Same flush-then-swap discipline as switchTab, one level down — for
  // switching which JS file is open without leaving the "javascript" tab.
  const switchJsFile = (id: string): void => {
    if (id === activeJsFileId) return;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    const editor = editorRef.current;
    if (editor && activeJsFile) onJsFileCodeChange(activeJsFile.id, editor.getValue());
    isFocused.current = false;
    onSetActiveJsFile(id);
    const nextFile = jsFiles.find((f) => f.id === id);
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.setValue(nextFile?.code ?? "");
    });
  };

  const handleChange = (val: string | undefined): void => {
    if ((val ?? "") === activeSource) return;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    const tab = activeTab;
    debounceRef.current = setTimeout(() => {
      handlers[tab]?.(val ?? "");
    }, 750);
  };

  return (
    <div className={styles.codePanel} style={{ width }}>
      <div className={styles.panelHeader}>
        <div className={styles.codeTabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.codeTab} ${activeTab === tab.key ? styles.codeTabActive : ""}`}
              onClick={() => switchTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {(activeTab === "javascript" || activeTab === "visual") && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", padding: "4px 6px", borderBottom: "1px solid var(--hl-border)" }}>
          {jsFiles.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center" }}>
              {renamingFileId === f.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => { onRenameJsFile(f.id, renameDraft.trim() || f.name); setRenamingFileId(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenamingFileId(null);
                  }}
                  style={{ fontSize: 11, width: 90, padding: "2px 4px" }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => switchJsFile(f.id)}
                  onDoubleClick={() => { setRenamingFileId(f.id); setRenameDraft(f.name); }}
                  title="Click to select, double-click to rename"
                  className={styles.codeTab}
                  style={f.id === activeJsFileId ? undefined : { opacity: 0.65 }}
                >
                  {f.name}
                </button>
              )}
              {jsFiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteJsFile(f.id)}
                  title={`Delete ${f.name}`}
                  style={{ fontSize: 11, padding: "0 4px", opacity: 0.6, cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              if (debounceRef.current !== null) clearTimeout(debounceRef.current);
              const editor = editorRef.current;
              if (editor && activeJsFile) onJsFileCodeChange(activeJsFile.id, editor.getValue());
              isFocused.current = false;
              const n = jsFiles.length + 1;
              const file: JsFile = { id: "js" + Date.now().toString(36), name: `file${n}.js`, code: "" };
              onAddJsFile(file);
              setRenamingFileId(file.id);
              setRenameDraft(file.name);
              requestAnimationFrame(() => {
                if (editorRef.current) editorRef.current.setValue("");
              });
            }}
            title="Add a new .js or .jsx file — double-click any file's name to rename it"
            style={{ fontSize: 12, padding: "2px 8px", cursor: "pointer" }}
          >
            + File
          </button>
        </div>
      )}
      <div className={styles.monacoWrap}>
        {activeTab === "tree" ? (
          <ElementTree
            elements={elements}
            selectedId={selectedId}
            onSelect={onSelectElement}
            onDelete={onDeleteElement}
            multiSelectedIds={multiSelectedIds}
            onToggleMultiSelect={onToggleMultiSelect}
            onSelectRange={onSelectRange}
            onReorder={onReorderElement}
            onNest={onNestElement}
            onMoveToRoot={onMoveElementToRoot}
            onDuplicate={onDuplicateElement}
          />
        ) : activeTab === "toolbox" ? (
          <ToolboxPicker
            onAddElement={onAddElement}
            bodyIsDark={bodyIsDark}
            onInsertTemplate={onInsertTemplate}
            onInsertJsPreset={onInsertJsPreset}
            onOpenTableBuilder={onOpenTableBuilder}
            cdnLinks={cdnLinks}
            onToggleCdn={onToggleCdn}
          />
        ) : activeTab === "lessons" || activeTab === "visual" ? null : (
          <Editor
            // Remount whenever the JavaScript tab's *effective language*
            // changes (switching from a .js file to a .ts one, say) — Monaco's
            // `defaultLanguage` is only applied once, at mount, so a language
            // change needs a fresh instance to actually take effect.
            key={activeTab === "javascript" ? `javascript-${activeLanguage}` : activeTab}
            // A real path, javascript-tab only, so each file gets its own
            // genuinely-identified Monaco model (see jsFilePath above) —
            // required for correct cross-file TypeScript/JSX behavior.
            // HTML/CSS stay on the old anonymous single-model path; they
            // aren't part of this problem and there's no reason to risk
            // changing them.
            path={activeTab === "javascript" && activeJsFile ? jsFilePath(activeJsFile) : undefined}
            defaultLanguage={activeLanguage ?? "html"}
            theme={monacoTheme}
            options={{
              fontSize: 12,
              lineHeight: 19,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
              fontLigatures: true,
              renderLineHighlight: "line",
              padding: { top: 10, bottom: 10 },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              readOnly: forceSync,
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
            beforeMount={setupOpenCalcMonaco}
            onMount={handleMount}
            // Disabled entirely during lesson playback (forceSync), not just
            // debounced — Monaco's onChange fires for a programmatic
            // setValue() exactly like a real keystroke, so leaving this wired
            // up would round-trip every revealed frame straight back through
            // the HTML/CSS parser and write it back into state as if the
            // student had typed it, purely as a side effect of playback
            // advancing the editor's displayed text.
            onChange={forceSync ? undefined : handleChange}
          />
        )}
        {/* Always mounted once visited — same pattern as LessonsPanel so block
            state survives tab switches. Not rendered at all until first visit
            so the heavy VCS bundle is never loaded for users who skip this tab. */}
        {visualMounted && (
          <div style={{ display: activeTab === "visual" ? "flex" : "none", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <VisualJsPanel
              elements={elements}
              html={html}
              css={css}
              jsFiles={jsFiles}
              activeJsFileId={activeJsFileId}
              tabVisitCount={visualTabCount}
              onCodeChange={handleVisualCodeChange}
            />
          </div>
        )}
        {/* Always mounted, just hidden — switching tabs away and back must not
            reset which lesson the student was reading. Conditionally
            rendering this like the other tabs would unmount it on every
            switch and lose that position. */}
        <div style={{ display: activeTab === "lessons" ? "block" : "none", height: "100%" }}>
          <LessonsPanel />
        </div>
      </div>
    </div>
  );
}
