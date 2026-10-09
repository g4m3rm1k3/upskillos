import { useState, useRef, useEffect } from "react";
import styles from "./HtmlLab.module.css";
import {
  COMPONENT_PRESETS,
  PROP_PRESETS,
  BREAKPOINTS,
  CSS_PROPS_LIST,
} from "./styleLibrary";
import { JS_PRESETS } from "./jsPresets";
import type { LabElement, MediaQuery, Component, ComponentTheme, BodyThemeState } from "./types";

const TAGS = [
  "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "button", "span", "a", "img",
  "ul", "ol", "li", "section", "article", "header", "footer", "nav",
  "hr", "blockquote", "pre", "code", "label", "video", "audio",
  "strong", "em", "b", "i", "u", "s", "small", "mark", "sub", "sup", "kbd", "time",
  "address", "br", "textarea", "iframe", "canvas",
  "table", "thead", "tbody", "tr", "th", "td",
  "form", "input", "select", "option", "figure", "figcaption",
  "dl", "dt", "dd", "details", "summary",
];

interface SectionRow {
  label: string;
  prop: string;
  type: string;
  opts?: string[];
  placeholder?: string;
  attr?: string;
}

interface Section {
  key: string;
  title: string;
  rows: SectionRow[];
  special?: string;
}

const TAG_ATTR_ROWS: Record<string, SectionRow[]> = {
  a: [
    { label: "href",   prop: "_href",   attr: "href",   type: "attr", placeholder: "https://example.com" },
    { label: "target", prop: "_target", attr: "target", type: "attr", placeholder: "_blank" },
  ],
  img: [
    { label: "src", prop: "_src", attr: "src", type: "attr", placeholder: "https://..." },
    { label: "alt", prop: "_alt", attr: "alt", type: "attr", placeholder: "Image description" },
  ],
  button: [
    { label: "type", prop: "_type", attr: "type", type: "attr", placeholder: "button" },
  ],
  input: [
    { label: "type",        prop: "_inputType", attr: "type",        type: "attr", placeholder: "text" },
    { label: "name",        prop: "_name",      attr: "name",        type: "attr", placeholder: "field-name" },
    { label: "placeholder", prop: "_placeholder", attr: "placeholder", type: "attr", placeholder: "Enter value..." },
    { label: "value",       prop: "_value",     attr: "value",       type: "attr" },
  ],
  label: [
    { label: "for", prop: "_for", attr: "for", type: "attr", placeholder: "field-id" },
  ],
  form: [
    { label: "action", prop: "_action", attr: "action", type: "attr", placeholder: "#" },
    { label: "method", prop: "_method", attr: "method", type: "attr", placeholder: "post" },
  ],
  select: [
    { label: "name", prop: "_name", attr: "name", type: "attr", placeholder: "field-name" },
  ],
  option: [
    { label: "value", prop: "_value", attr: "value", type: "attr" },
  ],
  video: [
    { label: "src", prop: "_src", attr: "src", type: "attr", placeholder: "https://..." },
  ],
  audio: [
    { label: "src", prop: "_src", attr: "src", type: "attr", placeholder: "https://..." },
  ],
  details: [
    { label: "open", prop: "_open", attr: "open", type: "attr", placeholder: "true" },
  ],
  textarea: [
    { label: "name",        prop: "_name",        attr: "name",        type: "attr", placeholder: "field-name" },
    { label: "placeholder", prop: "_placeholder", attr: "placeholder", type: "attr", placeholder: "Enter value..." },
    { label: "rows",        prop: "_rows",        attr: "rows",        type: "attr", placeholder: "4" },
  ],
  iframe: [
    { label: "src", prop: "_src", attr: "src", type: "attr", placeholder: "https://..." },
  ],
  canvas: [
    { label: "width",  prop: "_canvasWidth",  attr: "width",  type: "attr", placeholder: "480" },
    { label: "height", prop: "_canvasHeight", attr: "height", type: "attr", placeholder: "240" },
  ],
  time: [
    { label: "datetime", prop: "_datetime", attr: "datetime", type: "attr", placeholder: "2025-01-01" },
  ],
};

const SECTIONS: Section[] = [
  { key: "styleLibrary",  title: "Style Library",   rows: [], special: "styleLibrary" },
  { key: "content", title: "Content", rows: [
    { label: "Text",  prop: "_content", type: "text" },
    { label: "Tag",   prop: "_tag",     type: "tag" },
    { label: "id",    prop: "_id",      type: "attr" },
    { label: "class", prop: "_class",   attr: "class", type: "attr", placeholder: "card primary" },
  ] },
  { key: "javascript",   title: "JavaScript",     rows: [], special: "javascript" },
  { key: "layout", title: "Layout", rows: [
    { label: "display",    prop: "display",        type: "select", opts: ["", "block", "inline-block", "flex", "grid", "inline", "none"] },
    { label: "flex-dir",   prop: "flexDirection",  type: "select", opts: ["", "row", "column", "row-reverse", "column-reverse"] },
    { label: "align",      prop: "alignItems",     type: "select", opts: ["", "flex-start", "center", "flex-end", "stretch", "baseline"] },
    { label: "justify",    prop: "justifyContent", type: "select", opts: ["", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"] },
    { label: "flex-wrap",  prop: "flexWrap",       type: "select", opts: ["", "nowrap", "wrap", "wrap-reverse"] },
    { label: "gap",        prop: "gap",            type: "text" },
  ] },
  { key: "size", title: "Size", rows: [
    { label: "width",    prop: "width",     type: "text" },
    { label: "height",   prop: "height",    type: "text" },
    { label: "min-w",    prop: "minWidth",  type: "text" },
    { label: "min-h",    prop: "minHeight", type: "text" },
    { label: "max-w",    prop: "maxWidth",  type: "text" },
    { label: "max-h",    prop: "maxHeight", type: "text" },
    { label: "overflow", prop: "overflow",  type: "select", opts: ["", "visible", "hidden", "scroll", "auto"] },
  ] },
  { key: "spacing", title: "Spacing", rows: [
    { label: "margin",     prop: "margin",        type: "text" },
    { label: "padding",    prop: "padding",       type: "text" },
    { label: "margin-t",   prop: "marginTop",     type: "text" },
    { label: "margin-r",   prop: "marginRight",   type: "text" },
    { label: "margin-b",   prop: "marginBottom",  type: "text" },
    { label: "margin-l",   prop: "marginLeft",    type: "text" },
    { label: "padding-t",  prop: "paddingTop",    type: "text" },
    { label: "padding-r",  prop: "paddingRight",  type: "text" },
    { label: "padding-b",  prop: "paddingBottom", type: "text" },
    { label: "padding-l",  prop: "paddingLeft",   type: "text" },
  ] },
  { key: "typography", title: "Typography", rows: [
    { label: "font-size",  prop: "fontSize",       type: "text" },
    { label: "color",      prop: "color",          type: "color" },
    { label: "font-weight",prop: "fontWeight",     type: "select", opts: ["", "300", "400", "500", "600", "700", "bold"] },
    { label: "text-align", prop: "textAlign",      type: "select", opts: ["", "left", "center", "right", "justify"] },
    { label: "line-height",prop: "lineHeight",     type: "text" },
    { label: "letter-sp",  prop: "letterSpacing",  type: "text" },
    { label: "decoration", prop: "textDecoration", type: "select", opts: ["", "none", "underline", "line-through", "overline"] },
    { label: "transform",  prop: "textTransform",  type: "select", opts: ["", "none", "uppercase", "lowercase", "capitalize"] },
  ] },
  { key: "background", title: "Background", rows: [
    { label: "bg-color",  prop: "backgroundColor",    type: "color" },
    { label: "bg-image",  prop: "backgroundImage",    type: "text", placeholder: "url(...)" },
    { label: "bg-size",   prop: "backgroundSize",     type: "select", opts: ["", "cover", "contain", "auto"] },
    { label: "bg-pos",    prop: "backgroundPosition", type: "text", placeholder: "center center" },
    { label: "bg-repeat", prop: "backgroundRepeat",   type: "select", opts: ["", "no-repeat", "repeat", "repeat-x", "repeat-y"] },
    { label: "tint",      prop: "_tint",              type: "tint" },
    { label: "opacity",   prop: "opacity",            type: "text" },
  ], special: "gradients" },
  { key: "border", title: "Border & shadow", rows: [
    { label: "border",     prop: "border",       type: "text" },
    { label: "radius",     prop: "borderRadius", type: "text" },
    { label: "outline",    prop: "outline",      type: "text" },
    { label: "box-shadow", prop: "boxShadow",    type: "text" },
  ] },
  { key: "boxmodel",     title: "Box model",     rows: [], special: "boxmodel" },
  { key: "mediaQueries", title: "Media Queries", rows: [], special: "mediaQueries" },
];

const MULTI_SECTIONS = ["layout", "size", "spacing", "typography", "background", "border"];

// ─── Multi-select panel ───────────────────────────────────────────────────────

interface MultiSelectPanelProps {
  count: number;
  element: LabElement;
  onChange: (prop: string, value: string) => void;
  style?: React.CSSProperties;
}

function MultiSelectPanel({ count, element, onChange, style }: MultiSelectPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  const sections = SECTIONS.filter(s => MULTI_SECTIONS.includes(s.key));

  return (
    <div className={styles.propsPanel} style={style}>
      <div className={styles.panelHeader}>
        <span className={styles.panelHeaderTag}>Multi-select · {count} elements</span>
      </div>
      <div className={styles.propsBody}>
        <div className={styles.multiSelectHint}>
          Changes apply to all selected elements. Shared values are shown; blank means values differ.
        </div>
        {sections.map((sec) => (
          <div key={sec.key} className={styles.propSection}>
            <button className={styles.propSectionTitle} onClick={() => toggle(sec.key)}>
              {sec.title}
              <span>{collapsed[sec.key] ? "▶" : "▼"}</span>
            </button>
            {!collapsed[sec.key] && (
              <div className={styles.propRows}>
                {sec.special === "gradients" ? (
                  <>
                    {sec.rows.map((row) => (
                      <PropRow key={row.prop} row={row} element={element} onChange={onChange} onContentChange={() => {}} onTagChange={() => {}} onAttrChange={() => {}} />
                    ))}
                    <GradientPresets onChange={onChange} />
                  </>
                ) : (
                  sec.rows.map((row) => (
                    <PropRow key={row.prop} row={row} element={element} onChange={onChange} onContentChange={() => {}} onTagChange={() => {}} onAttrChange={() => {}} />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PropsPanelProps {
  element: LabElement | null;
  /** Every element in the project, selected or not — lets the Event
   *  Handlers tool target an element other than the one currently selected
   *  (e.g. a button's click handler showing/hiding a totally different
   *  panel). Optional so call sites that never touch JavaScript tools don't
   *  need to thread it through; defaults to just the selected element. */
  allElements?: LabElement[];
  multiSelectedIds?: string[];
  multiElement?: LabElement | null;
  onMultiStyleChange?: (prop: string, value: string) => void;
  onChange: (prop: string, value: string) => void;
  onContentChange: (value: string) => void;
  onTagChange: (tag: string) => void;
  onAttrChange: (attr: string, value: string) => void;
  javascript?: string;
  onInsertJavascript: (code: string) => void;
  onInsertJsPreset?: (template: LabElement[], code: string) => void;
  onApplyPreset: (styles: Record<string, string>) => void;
  onAddMediaQuery: (mq: MediaQuery) => void;
  onRemoveMediaQuery: (index: number) => void;
  matchedComponents?: Component[];
  bodyTheme?: BodyThemeState | null;
  onApplyComponentTheme?: (theme: ComponentTheme) => void;
  onSetColorMode?: (mode: "light" | "dark") => void;
  onToggleGlass?: () => void;
  onToggleCentered?: () => void;
  onResetBodyTheme?: () => void;
  onDelete?: (id: string) => void;
  style?: React.CSSProperties;
}

export default function PropertiesPanel({
  element,
  allElements,
  multiSelectedIds,
  multiElement,
  onMultiStyleChange,
  onChange,
  onContentChange,
  onTagChange,
  onAttrChange,
  javascript = "",
  onInsertJavascript,
  onInsertJsPreset,
  onApplyPreset,
  onAddMediaQuery,
  onRemoveMediaQuery,
  matchedComponents = [],
  bodyTheme = null,
  onApplyComponentTheme,
  onSetColorMode,
  onToggleGlass,
  onToggleCentered,
  onResetBodyTheme,
  onDelete,
  style,
}: PropsPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ boxmodel: false });
  const [textEditorOpen, setTextEditorOpen] = useState(false);

  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  if ((multiSelectedIds?.length ?? 0) > 1 && multiElement && onMultiStyleChange) {
    return (
      <MultiSelectPanel
        count={multiSelectedIds!.length}
        element={multiElement}
        onChange={onMultiStyleChange}
        style={style}
      />
    );
  }

  if (!element) {
    return (
      <div className={styles.propsPanel} style={style}>
        <div className={styles.panelHeader}>Properties</div>
        <div className={styles.propsEmpty}>
          Select an element on the canvas to edit its styles.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.propsPanel} style={style}>
      {textEditorOpen && (
        <TextEditorModal
          value={element.content || ""}
          onChange={onContentChange}
          onClose={() => setTextEditorOpen(false)}
          tag={element.tag}
        />
      )}
      <div className={styles.panelHeader}>
        {element.tag === "body" ? (
          <span>&lt;body&gt; · page root</span>
        ) : (
          <>
            <span className={styles.panelHeaderTag}>&lt;{element.tag}&gt; · {element.id}</span>
            {element.parentId && <span className={styles.nestedBadge}>nested</span>}
            <button
              className={styles.propDeleteBtn}
              onClick={() => onDelete?.(element.id)}
              title="Delete element and its children"
            >✕</button>
          </>
        )}
      </div>
      <div className={styles.propsBody}>
        {bodyTheme && (
          <GlobalStyleControls
            bodyTheme={bodyTheme}
            onSetColorMode={(mode) => onSetColorMode?.(mode)}
            onToggleGlass={() => onToggleGlass?.()}
            onToggleCentered={() => onToggleCentered?.()}
            onReset={() => onResetBodyTheme?.()}
          />
        )}

        {matchedComponents.length > 0 && (
          <ThemeSection
            title="Component Themes"
            groups={matchedComponents.flatMap(comp =>
              (comp.themeGroups || [])
                .filter(g => g.themes && g.themes.length > 0)
                .map(group => ({
                  label: matchedComponents.length > 1
                    ? `${comp.name}${group.label ? ` · ${group.label}` : ''}`
                    : (group.label || comp.name),
                  themes: group.themes,
                }))
            )}
            onApply={(theme) => onApplyComponentTheme?.(theme as ComponentTheme)}
          />
        )}

        {(element.tag === "body"
          ? SECTIONS.filter((s) => !["content", "styleLibrary", "mediaQueries", "boxmodel"].includes(s.key))
          : SECTIONS
        ).map((sec) => (
          <div key={sec.key} className={styles.propSection}>
            <button
              className={styles.propSectionTitle}
              onClick={() => toggle(sec.key)}
            >
              {sec.title}
              <span>{collapsed[sec.key] ? "▶" : "▼"}</span>
            </button>

            {!collapsed[sec.key] && (
              <div className={styles.propRows}>
                {sec.special === "styleLibrary" ? (
                  <StyleLibrarySection onApplyPreset={onApplyPreset} />
                ) : sec.special === "boxmodel" ? (
                  <BoxModelVisual el={element} />
                ) : sec.special === "javascript" ? (
                  <JavascriptTools
                    element={element}
                    allElements={allElements && allElements.length > 0 ? allElements : [element]}
                    javascript={javascript}
                    onInsertJavascript={onInsertJavascript}
                    onInsertJsPreset={onInsertJsPreset}
                  />
                ) : sec.special === "mediaQueries" ? (
                  <MediaQueriesSection
                    element={element}
                    onAddMediaQuery={onAddMediaQuery}
                    onRemoveMediaQuery={onRemoveMediaQuery}
                  />
                ) : sec.special === "gradients" ? (
                  <>
                    {getRowsForSection(sec, element).map((row) => (
                      <PropRow
                        key={row.prop}
                        row={row}
                        element={element}
                        onChange={onChange}
                        onContentChange={onContentChange}
                        onTagChange={onTagChange}
                        onAttrChange={onAttrChange}
                        onExpandContent={() => setTextEditorOpen(true)}
                      />
                    ))}
                    <GradientPresets onChange={onChange} />
                  </>
                ) : (
                  getRowsForSection(sec, element).map((row) => (
                    <PropRow
                      key={row.prop}
                      row={row}
                      element={element}
                      onChange={onChange}
                      onContentChange={onContentChange}
                      onTagChange={onTagChange}
                      onAttrChange={onAttrChange}
                      onExpandContent={() => setTextEditorOpen(true)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Text editor modal ────────────────────────────────────────────────────────

interface TextEditorModalProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  tag: string;
}

function TextEditorModal({ value, onChange, onClose, tag }: TextEditorModalProps) {
  const [draft, setDraft] = useState(value);
  return (
    <div className={styles.textEditorOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.textEditorBox}>
        <div className={styles.textEditorHeader}>
          <span>Text content · &lt;{tag}&gt;</span>
          <button className={styles.textEditorClose} onClick={onClose}>✕</button>
        </div>
        <textarea
          className={styles.textEditorArea}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
          autoFocus
          placeholder="Type your content here…"
        />
        <div className={styles.textEditorFooter}>
          <span className={styles.textEditorHint}>Changes apply live</span>
          <button className={styles.textEditorDone} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Prop row ─────────────────────────────────────────────────────────────────

interface PropRowProps {
  row: SectionRow;
  element: LabElement;
  onChange: (prop: string, value: string) => void;
  onContentChange: (value: string) => void;
  onTagChange: (tag: string) => void;
  onAttrChange: (attr: string, value: string) => void;
  onExpandContent?: () => void;
}

function PropRow({ row, element, onChange, onContentChange, onTagChange, onAttrChange, onExpandContent }: PropRowProps) {
  const val = element.styles[row.prop] || "";
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [pickerOpen]);

  const presets = PROP_PRESETS[row.prop] || null;

  const pickerBtn = presets ? (
    <div className={styles.pickerWrap} ref={pickerRef}>
      <button type="button" className={styles.pickerBtn} title="Show presets" onClick={() => setPickerOpen((o) => !o)}>▾</button>
      {pickerOpen && (
        <div className={styles.pickerList}>
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.pickerItem} ${val === p ? styles.pickerItemActive : ""}`}
              onClick={() => { onChange(row.prop, p); setPickerOpen(false); }}
            >
              {(row.prop === "backgroundColor" || row.prop === "color" || row.prop === "border") ? (
                <span
                  className={styles.pickerSwatch}
                  style={{
                    background: p === "none" || p === "transparent" ? "transparent"
                      : row.prop === "border" ? p.split(" ").slice(-1)[0] : p,
                    border: "1px solid #555",
                  }}
                />
              ) : null}
              <span>{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (row.type === "tint") {
    const currentBg = element.styles.background || "";
    const tintMatch = currentBg.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
    const tintOpacity = tintMatch ? parseFloat(tintMatch[4]) : 0;
    const imageMatch = currentBg.match(/url\([^)]+\)/);
    const imageUrl = imageMatch ? imageMatch[0] : (element.styles.backgroundImage || "");
    return (
      <div className={styles.propRow}>
        <label className={styles.propLabel}>{row.label}</label>
        <input
          type="range" min="0" max="0.9" step="0.05"
          style={{ flex: 1, accentColor: "#569cd6" }}
          value={tintOpacity}
          title={`Tint opacity: ${Math.round(tintOpacity * 100)}%`}
          onChange={(e) => {
            const opacity = parseFloat(e.target.value);
            if (opacity === 0) {
              onChange("background", imageUrl || "");
            } else {
              const tint = `rgba(0,0,0,${opacity})`;
              onChange("background", imageUrl
                ? `linear-gradient(${tint}, ${tint}), ${imageUrl}`
                : `linear-gradient(${tint}, ${tint})`
              );
            }
          }}
        />
        <span style={{ fontSize: "10px", color: "#777", flexShrink: 0 }}>
          {Math.round(tintOpacity * 100)}%
        </span>
      </div>
    );
  }

  if (row.prop === "_content") {
    return (
      <div className={styles.propRowContent}>
        <div className={styles.propRowContentHeader}>
          <label className={styles.propLabel}>Text</label>
          <button className={styles.propExpandBtn} onClick={() => onExpandContent?.()} title="Open full text editor">⤢ expand</button>
        </div>
        <textarea
          className={styles.propTextarea}
          value={element.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          rows={3}
          placeholder="Element text content…"
        />
      </div>
    );
  }

  if (row.prop === "_tag") {
    return (
      <div className={styles.propRow}>
        <label className={styles.propLabel}>Tag</label>
        <select className={styles.propSelect} value={element.tag} onChange={(e) => onTagChange(e.target.value)}>
          {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    );
  }

  if (row.type === "attr") {
    const attrName = row.attr || row.prop.slice(1);
    return (
      <div className={styles.propRow}>
        <label className={styles.propLabel}>{row.label}</label>
        <input
          className={styles.propInput}
          aria-label={row.label}
          value={element.attrs?.[attrName] || ""}
          placeholder={row.placeholder || ""}
          onChange={(e) => onAttrChange(attrName, e.target.value)}
        />
      </div>
    );
  }

  if (row.type === "select") {
    return (
      <div className={styles.propRow}>
        <label className={styles.propLabel}>{row.label}</label>
        <select className={styles.propSelect} aria-label={row.label} value={val} onChange={(e) => onChange(row.prop, e.target.value)}>
          {(row.opts || []).map((o) => <option key={o} value={o}>{o || "—"}</option>)}
        </select>
      </div>
    );
  }

  if (row.type === "color") {
    return (
      <div className={styles.propRow}>
        <label className={styles.propLabel}>{row.label}</label>
        <input type="color" className={styles.propColor} aria-label={`${row.label} color picker`} value={toHex(val)} onChange={(e) => onChange(row.prop, e.target.value)} />
        <input className={styles.propInput} aria-label={row.label} value={val} placeholder="#000000" onChange={(e) => onChange(row.prop, e.target.value)} />
        {pickerBtn}
      </div>
    );
  }

  return (
    <div className={styles.propRow}>
      <label className={styles.propLabel}>{row.label}</label>
      <input
        className={styles.propInput}
        aria-label={row.label}
        value={val}
        placeholder={row.placeholder || "e.g. 8px"}
        onChange={(e) => onChange(row.prop, e.target.value)}
      />
      {pickerBtn}
    </div>
  );
}

// ─── Style Library Section ────────────────────────────────────────────────────

interface StyleLibrarySectionProps {
  onApplyPreset: (styles: Record<string, string>) => void;
}

function StyleLibrarySection({ onApplyPreset }: StyleLibrarySectionProps) {
  const [selected, setSelected] = useState("");
  const [applied, setApplied] = useState(false);

  const preset = COMPONENT_PRESETS.find((p) => p.key === selected);

  const handleApply = () => {
    if (!preset) return;
    onApplyPreset(preset.styles);
    setApplied(true);
    setTimeout(() => setApplied(false), 800);
  };

  const categories = [...new Set(COMPONENT_PRESETS.map((p) => p.category))];

  return (
    <div className={styles.slibSection}>
      <div className={styles.slibHint}>Pick a component style and apply it to the selected element.</div>
      <div className={styles.slibRow}>
        <select className={styles.propSelect} value={selected} onChange={(e) => { setSelected(e.target.value); setApplied(false); }}>
          <option value="">— choose preset —</option>
          {categories.map((cat) => (
            <optgroup key={cat} label={cat}>
              {COMPONENT_PRESETS.filter((p) => p.category === cat).map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {preset && (
        <div className={styles.slibPreview}>
          {Object.entries(preset.styles).map(([k, v]) => (
            <div key={k} className={styles.slibPreviewRow}>
              <span className={styles.slibPreviewProp}>{k.replace(/([A-Z])/g, "-$1").toLowerCase()}</span>
              <span className={styles.slibPreviewVal}>{v}</span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`${styles.slibApplyBtn} ${applied ? styles.slibApplyBtnDone : ""}`}
        disabled={!preset}
        onClick={handleApply}
      >
        {applied ? "✓ Applied" : "Apply Preset"}
      </button>
    </div>
  );
}

// ─── Media Queries Section ────────────────────────────────────────────────────

interface MediaQueriesSectionProps {
  element: LabElement;
  onAddMediaQuery: (mq: MediaQuery) => void;
  onRemoveMediaQuery: (index: number) => void;
}

function MediaQueriesSection({ element, onAddMediaQuery, onRemoveMediaQuery }: MediaQueriesSectionProps) {
  const [bp, setBp] = useState("768px");
  const [customBp, setCustomBp] = useState("");
  const [prop, setProp] = useState("");
  const [value, setValue] = useState("");

  const effectiveBp = bp === "" ? customBp.trim() : bp;
  const propPresets = prop && PROP_PRESETS[prop] ? PROP_PRESETS[prop] : null;
  const mqList = element.mediaQueries || [];

  const handleAdd = () => {
    if (!effectiveBp || !prop.trim() || !value.trim()) return;
    onAddMediaQuery({ breakpoint: effectiveBp, prop: prop.trim(), value: value.trim() });
    setProp("");
    setValue("");
  };

  return (
    <div className={styles.mqSection}>
      <div className={styles.mqBuilderLabel}>Breakpoint (min-width)</div>
      <div className={styles.mqRow}>
        <select className={styles.propSelect} value={bp} onChange={(e) => setBp(e.target.value)}>
          {BREAKPOINTS.map((b) => <option key={b.label} value={b.value}>{b.label}</option>)}
        </select>
        {bp === "" && (
          <input className={styles.propInput} value={customBp} placeholder="e.g. 900px" onChange={(e) => setCustomBp(e.target.value)} />
        )}
      </div>
      <div className={styles.mqBuilderLabel}>Property</div>
      <div className={styles.mqRow}>
        <input
          className={styles.propInput} list="mq-css-props" value={prop} placeholder="e.g. flexDirection"
          onChange={(e) => { setProp(e.target.value); setValue(""); }}
        />
        <datalist id="mq-css-props">
          {CSS_PROPS_LIST.map((p) => <option key={p} value={p} />)}
        </datalist>
      </div>
      <div className={styles.mqBuilderLabel}>Value</div>
      <div className={styles.mqRow}>
        {propPresets ? (
          <select className={styles.propSelect} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">— pick or type below —</option>
            {propPresets.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : null}
        <input className={styles.propInput} value={value} placeholder="e.g. column" onChange={(e) => setValue(e.target.value)} />
      </div>
      <button type="button" className={styles.mqAddBtn} disabled={!effectiveBp || !prop.trim() || !value.trim()} onClick={handleAdd}>
        + Add Rule
      </button>
      {mqList.length > 0 && (
        <div className={styles.mqRuleList}>
          {mqList.map((mq, i) => (
            <div key={i} className={styles.mqRule}>
              <div className={styles.mqRuleText}>
                <span className={styles.mqRuleBp}>@{mq.breakpoint}</span>
                <span className={styles.mqRuleProp}>{mq.prop.replace(/([A-Z])/g, "-$1").toLowerCase()}</span>
                <span className={styles.mqRuleVal}>{mq.value}</span>
              </div>
              <button type="button" className={styles.mqRuleDel} onClick={() => onRemoveMediaQuery(i)} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── JavaScript Tools ─────────────────────────────────────────────────────────

interface JavascriptToolsProps {
  element: LabElement;
  allElements?: LabElement[];
  javascript?: string;
  onInsertJavascript: (code: string) => void;
  onInsertJsPreset?: (template: LabElement[], code: string) => void;
}

type HandlerActionType = "none" | "style" | "toggleClass";

function JavascriptTools({ element, allElements, javascript = "", onInsertJavascript, onInsertJsPreset }: JavascriptToolsProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const isBody = element.tag === "body";

  const selector = isBody ? null : getElementSelector(element);
  const selectorLiteral = selector ? JSON.stringify(selector) : null;
  const varName = isBody ? null : toVarName(element.attrs?.id || element.id);
  const hasSelector = selector ? javascript.includes(selector) : false;
  const styleObject = isBody ? null : stylesToJsObject(element.styles);

  // Every element in the project is a candidate *target* for the action —
  // deliberately independent of `element` (which is only ever the listener).
  // Clicking a button and hiding some other panel entirely is the normal
  // case, not a special one.
  const targetOptions = (allElements && allElements.length > 0 ? allElements : [element]).filter((el) => el.tag !== "body");

  // "Grouped content" has no separate concept of its own in this project's
  // data model — an element with two or more direct children already *is*
  // a group, exactly the way a <ul> and its <li>s, or a <div> and its card
  // children, already relate to each other via parentId. Reusing that
  // existing relationship means this needs no new state at all: selecting
  // any such container is what makes the option appear.
  const directChildren = (allElements || []).filter((el) => el.parentId === element.id);

  function addDragAndDropReordering(): void {
    if (!varName || !selectorLiteral) return;
    const code = [
      "(() => {",
      `  const container = document.querySelector(${selectorLiteral});`,
      "  if (!container) return;",
      "",
      "  Array.from(container.children).forEach((child) => {",
      "    child.draggable = true;",
      "  });",
      "",
      "  let draggedElement = null;",
      "",
      "  container.addEventListener('dragstart', (event) => {",
      "    draggedElement = event.target;",
      "  });",
      "",
      "  container.addEventListener('dragover', (event) => {",
      "    event.preventDefault();",
      "  });",
      "",
      "  container.addEventListener('drop', (event) => {",
      "    event.preventDefault();",
      "    if (!draggedElement) return;",
      "",
      "    let target = event.target;",
      "    while (target && target.parentElement !== container) {",
      "      target = target.parentElement;",
      "    }",
      "    if (!target || target === draggedElement) return;",
      "",
      "    const children = Array.from(container.children);",
      "    const draggedIndex = children.indexOf(draggedElement);",
      "    const targetIndex = children.indexOf(target);",
      "    if (draggedIndex < targetIndex) {",
      "      target.after(draggedElement);",
      "    } else {",
      "      target.before(draggedElement);",
      "    }",
      "",
      "    draggedElement = null;",
      "  });",
      "})();",
    ].join("\n");
    onInsertJavascript(code);
  }

  const [eventType, setEventType] = useState(EVENT_TYPES[0].value);
  const [handlerName, setHandlerName] = useState(() => defaultHandlerName(EVENT_TYPES[0].value, varName || "element"));
  const [actionType, setActionType] = useState<HandlerActionType>("none");
  const [targetElementId, setTargetElementId] = useState(element.id);
  const [actionProperty, setActionProperty] = useState(CSS_PROPS_LIST[0]);
  const [actionClassName, setActionClassName] = useState("");

  // Selecting a different element on the canvas doesn't remount this
  // component — without this, the target dropdown would keep quietly
  // pointing at whichever element was selected the *first* time this panel
  // opened, well after the student moved on to a different one.
  useEffect(() => {
    setTargetElementId(element.id);
  }, [element.id]);
  const [actionValue, setActionValue] = useState("");

  function addEventHandler(): void {
    if (!varName || !selectorLiteral) return;
    const name = handlerName.trim() || defaultHandlerName(eventType, varName);

    const targetIsSelf = targetElementId === element.id;
    const targetElement = targetOptions.find((el) => el.id === targetElementId);
    const targetSelectorLiteral = targetIsSelf ? selectorLiteral : (targetElement ? JSON.stringify(getElementSelector(targetElement)) : selectorLiteral);
    const targetVarName = targetIsSelf ? varName : toVarName(targetElement?.attrs?.id || targetElement?.id || "target");

    // Only declare a second `const` (and its own null-check) when the
    // action actually reaches for a *different* element than the one
    // listening — targeting "this element" keeps the body exactly as
    // simple as it was before targeting existed at all.
    const targetLookupLines = targetIsSelf
      ? ""
      : `    const ${targetVarName} = document.querySelector(${targetSelectorLiteral});\n    if (!${targetVarName}) return;\n\n`;

    let actionLine: string;
    if (actionType === "style" && actionValue.trim()) {
      actionLine = `${targetVarName}.style.${actionProperty} = ${JSON.stringify(actionValue.trim())};`;
    } else if (actionType === "toggleClass" && actionClassName.trim()) {
      actionLine = `${targetVarName}.classList.toggle(${JSON.stringify(actionClassName.trim())});`;
    } else {
      actionLine = `// TODO: add your code here`;
    }

    const code = `(() => {\n  const ${varName} = document.querySelector(${selectorLiteral});\n  if (!${varName}) return;\n\n  function ${name}(event) {\n${targetLookupLines}    ${actionLine}\n  }\n\n  ${varName}.addEventListener(${JSON.stringify(eventType)}, ${name});\n})();`;
    onInsertJavascript(code);
  }

  const snippets = isBody ? [] : [
    { label: "Select", code: `const ${varName} = document.querySelector(${selectorLiteral});` },
    { label: "Apply",  code: `(() => {\n  const ${varName} = document.querySelector(${selectorLiteral});\n  if (!${varName}) return;\n\n  Object.assign(${varName}.style, ${styleObject});\n})();` },
    { label: "Reset",  code: `(() => {\n  const ${varName} = document.querySelector(${selectorLiteral});\n  if (!${varName}) return;\n\n  ${varName}.removeAttribute("style");\n})();` },
    { label: "Click",  code: `(() => {\n  const ${varName} = document.querySelector(${selectorLiteral});\n  if (!${varName}) return;\n\n  ${varName}.addEventListener("click", () => {\n    ${varName}.classList.toggle("is-active");\n  });\n})();` },
  ];

  return (
    <div className={styles.jsTools}>
      <div className={styles.jsPresetsLabel}>Presets</div>
      <div className={styles.jsPresetGrid}>
        {JS_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`${styles.jsPresetCard} ${activePreset === preset.id ? styles.jsPresetCardActive : ""}`}
            title={preset.description}
            onClick={() => {
              if (preset.template && onInsertJsPreset) {
                onInsertJsPreset(preset.template, preset.code);
              } else {
                onInsertJavascript(preset.code);
              }
              setActivePreset(preset.id);
              setTimeout(() => setActivePreset(null), 1200);
            }}
          >
            <span className={styles.jsPresetIcon}>{preset.icon}</span>
            <span className={styles.jsPresetLabel}>{preset.label}</span>
          </button>
        ))}
      </div>

      {!isBody && (
        <>
          <div className={styles.jsPresetsLabel} style={{ marginTop: 6 }}>Element</div>
          <div className={styles.selectorBox}>
            <span>selector</span>
            <code>{selector}</code>
          </div>
          <div className={styles.jsToolButtons}>
            {snippets.map((snippet) => (
              <button key={snippet.label} type="button" className={styles.jsToolBtn} onClick={() => onInsertJavascript(snippet.code)}>
                {snippet.label}
              </button>
            ))}
          </div>
          {hasSelector && <div className={styles.jsLinked}>JavaScript references this element</div>}

          <div className={styles.jsPresetsLabel} style={{ marginTop: 6 }}>Event Handlers</div>
          <div className={styles.eventHandlerRow}>
            <select
              className={styles.eventHandlerSelect}
              value={eventType}
              onChange={(e) => {
                const nextEvent = e.target.value;
                setEventType(nextEvent);
                setHandlerName(defaultHandlerName(nextEvent, varName || "element"));
              }}
            >
              {EVENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
            <input
              type="text"
              className={styles.eventHandlerInput}
              value={handlerName}
              onChange={(e) => setHandlerName(e.target.value)}
              placeholder="handlerFunctionName"
              spellCheck={false}
            />
          </div>
          <div className={styles.eventHandlerRow}>
            <select
              className={styles.eventHandlerSelect}
              value={targetElementId}
              onChange={(e) => setTargetElementId(e.target.value)}
            >
              {targetOptions.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.id === element.id ? `This element (${elementLabel(el)})` : elementLabel(el)}
                </option>
              ))}
            </select>
            <select
              className={styles.eventHandlerSelect}
              value={actionType}
              onChange={(e) => setActionType(e.target.value as HandlerActionType)}
            >
              <option value="none">Write it myself</option>
              <option value="style">Set a style property</option>
              <option value="toggleClass">Toggle a class</option>
            </select>
          </div>
          {actionType === "style" && (
            <div className={styles.eventHandlerRow}>
              <select
                className={styles.eventHandlerSelect}
                value={actionProperty}
                onChange={(e) => setActionProperty(e.target.value)}
              >
                {CSS_PROPS_LIST.map((prop) => (
                  <option key={prop} value={prop}>{prop}</option>
                ))}
              </select>
              <input
                type="text"
                className={styles.eventHandlerInput}
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                placeholder="e.g. red"
                spellCheck={false}
              />
            </div>
          )}
          {actionType === "toggleClass" && (
            <div className={styles.eventHandlerRow}>
              <input
                type="text"
                className={styles.eventHandlerInput}
                value={actionClassName}
                onChange={(e) => setActionClassName(e.target.value)}
                placeholder="class-name-to-toggle"
                spellCheck={false}
              />
            </div>
          )}
          <div className={styles.eventHandlerRow}>
            <button type="button" className={styles.jsToolBtn} style={{ gridColumn: "1 / -1" }} onClick={addEventHandler}>
              + Add
            </button>
          </div>
          <div className={styles.jsLinked} style={{ color: "var(--hl-hint)" }}>
            {actionType === "none" && "Inserts a named function wired up with addEventListener, with an empty body for you to fill in."}
            {actionType === "style" && (actionValue.trim()
              ? `Inserts a handler that sets the target's style.${actionProperty} to "${actionValue.trim()}".`
              : "Pick a property and type a value above — the target is whichever element you chose, not necessarily this one.")}
            {actionType === "toggleClass" && (actionClassName.trim()
              ? `Inserts a handler that toggles the class "${actionClassName.trim()}" on the target.`
              : "Type a class name above to toggle on the target element.")}
          </div>

          {directChildren.length >= 2 && (
            <>
              <div className={styles.jsPresetsLabel} style={{ marginTop: 6 }}>Drag and Drop</div>
              <div className={styles.jsLinked} style={{ color: "var(--hl-hint)" }}>
                {directChildren.length} direct children found inside this element — enable dragging to reorder them.
              </div>
              <button
                type="button"
                className={styles.jsToolBtn}
                style={{ width: "100%", marginTop: 4 }}
                onClick={addDragAndDropReordering}
              >
                Enable Drag &amp; Drop Reordering
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Event handler helpers ────────────────────────────────────────────────────

const EVENT_TYPES: { value: string; label: string }[] = [
  { value: "click", label: "Click" },
  { value: "mouseenter", label: "Hover (enter)" },
  { value: "mouseleave", label: "Hover (leave)" },
  { value: "focus", label: "Focus" },
  { value: "blur", label: "Blur" },
  { value: "keydown", label: "Key Down" },
  { value: "input", label: "Input" },
  { value: "change", label: "Change" },
  { value: "submit", label: "Submit" },
];

function defaultHandlerName(eventType: string, elementVarName: string): string {
  const capitalizedEvent = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  const capitalizedElement = elementVarName.charAt(0).toUpperCase() + elementVarName.slice(1);
  return `handle${capitalizedElement}${capitalizedEvent}`;
}

// A short, readable name for one entry in the target-element dropdown —
// enough to tell elements apart at a glance without dumping a full selector
// into a tiny <option>. Prefers id, falls back to class, then a snippet of
// its own text content, then just the bare tag as a last resort.
function elementLabel(el: LabElement): string {
  const id = el.attrs?.id?.trim();
  if (id) return `${el.tag}#${id}`;
  const className = el.attrs?.class?.trim().split(/\s+/)[0];
  if (className) return `${el.tag}.${className}`;
  const text = el.content?.trim();
  if (text) return `${el.tag} "${text.slice(0, 20)}${text.length > 20 ? "…" : ""}"`;
  return el.tag;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRowsForSection(section: Section, element: LabElement): SectionRow[] {
  if (section.key !== "content") return section.rows;
  return [...section.rows, ...(TAG_ATTR_ROWS[element.tag] || [])];
}

function getElementSelector(element: LabElement): string {
  const htmlId = element.attrs?.id?.trim();
  if (htmlId) return `#${cssEscape(htmlId)}`;
  return `[data-lab-id="${element.id}"]`;
}

function toVarName(value: string): string {
  const cleaned = String(value)
    .replace(/[^a-zA-Z0-9_$]+/g, " ")
    .trim()
    .replace(/\s+([a-zA-Z0-9_$])/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-zA-Z_$]+/, "");
  return cleaned || "selectedElement";
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\#.;:[\],>+~*='()\s]/g, "\\$&");
}

function stylesToJsObject(styles: Record<string, string> = {}): string {
  const body = Object.entries(styles)
    .map(([key, value]) => `\n    ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(",");
  return `{${body ? `${body}\n  ` : ""}}`;
}

// ─── Box Model Visual ─────────────────────────────────────────────────────────

interface BoxModelVisualProps { el: LabElement; }

function BoxModelVisual({ el }: BoxModelVisualProps) {
  const s = el.styles;

  function getSides(shorthand: string, top: string, right: string, bottom: string, left: string): { t: string; r: string; b: string; l: string } {
    const sh = s[shorthand] || "";
    const parts = sh.trim().split(/\s+/);
    if (parts.length === 1) return { t: parts[0], r: parts[0], b: parts[0], l: parts[0] };
    if (parts.length === 2) return { t: parts[0], r: parts[1], b: parts[0], l: parts[1] };
    if (parts.length === 4) return { t: parts[0], r: parts[1], b: parts[2], l: parts[3] };
    return { t: s[top] || "0", r: s[right] || "0", b: s[bottom] || "0", l: s[left] || "0" };
  }

  const margin  = getSides("margin",  "marginTop",  "marginRight",  "marginBottom",  "marginLeft");
  const padding = getSides("padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft");
  const border = s.border || "0";
  const width  = s.width  || "auto";
  const height = s.height || "auto";

  return (
    <div className={styles.boxModel}>
      <div className={styles.bmLayer} style={{ background: "rgba(246,178,107,0.25)", border: "1px solid rgba(246,178,107,0.6)" }}>
        <div className={styles.bmLayerLabel} style={{ color: "#c47d17" }}>margin</div>
        <div className={styles.bmTopVal} style={{ color: "#c47d17" }}>{margin.t}</div>
        <div className={styles.bmRow}>
          <span className={styles.bmSideVal} style={{ color: "#c47d17" }}>{margin.l}</span>
          <div className={styles.bmLayer} style={{ background: "rgba(226,75,74,0.12)", border: "1px solid rgba(226,75,74,0.4)", flex: 1 }}>
            <div className={styles.bmLayerLabel} style={{ color: "#b91c1c" }}>border</div>
            <div className={styles.bmTopVal} style={{ color: "#b91c1c" }}>{border}</div>
            <div className={styles.bmRow}>
              <span className={styles.bmSideVal} style={{ color: "#b91c1c" }}>—</span>
              <div className={styles.bmLayer} style={{ background: "rgba(0,180,100,0.14)", border: "1px solid rgba(0,180,100,0.4)", flex: 1 }}>
                <div className={styles.bmLayerLabel} style={{ color: "#166534" }}>padding</div>
                <div className={styles.bmTopVal} style={{ color: "#166534" }}>{padding.t}</div>
                <div className={styles.bmRow}>
                  <span className={styles.bmSideVal} style={{ color: "#166534" }}>{padding.l}</span>
                  <div className={styles.bmContent}>
                    <div className={styles.bmContentTag}>&lt;{el.tag}&gt;</div>
                    <div className={styles.bmDims}>{width} × {height}</div>
                  </div>
                  <span className={styles.bmSideVal} style={{ color: "#166534" }}>{padding.r}</span>
                </div>
                <div className={styles.bmBottomVal} style={{ color: "#166534" }}>{padding.b}</div>
              </div>
              <span className={styles.bmSideVal} style={{ color: "#b91c1c" }}>—</span>
            </div>
            <div className={styles.bmBottomVal} style={{ color: "#b91c1c" }}>{border}</div>
          </div>
          <span className={styles.bmSideVal} style={{ color: "#c47d17" }}>{margin.r}</span>
        </div>
        <div className={styles.bmBottomVal} style={{ color: "#c47d17" }}>{margin.b}</div>
      </div>
    </div>
  );
}

function toHex(val: string): string {
  if (!val) return "#000000";
  if (val.startsWith("#") && (val.length === 4 || val.length === 7)) return val;
  return "#000000";
}

// ─── Gradient presets ─────────────────────────────────────────────────────────

const GRADIENT_PRESETS = [
  { name: "Ocean",  value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Sky",    value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { name: "Fire",   value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)" },
  { name: "Night",  value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { name: "Gold",   value: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)" },
  { name: "Dark",   value: "linear-gradient(135deg, #1e1e2e 0%, #0f172a 100%)" },
  { name: "Mist",   value: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)" },
  { name: "Indigo", value: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)" },
];

interface GradientPresetsProps {
  onChange: (prop: string, value: string) => void;
}

function GradientPresets({ onChange }: GradientPresetsProps) {
  return (
    <div className={styles.gradientPresets}>
      <div className={styles.gradientLabel}>Gradient presets</div>
      <div className={styles.gradientList}>
        {GRADIENT_PRESETS.map(g => (
          <button key={g.name} className={styles.gradientSwatch} style={{ background: g.value }} title={g.name} onClick={() => onChange("background", g.value)} />
        ))}
        <button
          className={styles.gradientSwatch}
          style={{ background: "transparent", border: "1px dashed #555", color: "#888", fontSize: "9px" }}
          title="Clear gradient"
          onClick={() => onChange("background", "")}
        >✕</button>
      </div>
    </div>
  );
}

// ─── Theme Section ────────────────────────────────────────────────────────────

type ThemeDisplayItem = ComponentTheme;

interface ThemeGroupDisplay {
  label: string | null;
  themes: ThemeDisplayItem[];
}

interface ThemeSectionProps {
  title: string;
  groups: ThemeGroupDisplay[];
  onApply: (theme: ThemeDisplayItem) => void;
}

function ThemeSection({ title, groups, onApply }: ThemeSectionProps) {
  return (
    <div className={styles.themeSection}>
      <div className={styles.themeSectionTitle}>{title}</div>
      {groups.map((group, gi) => (
        <div key={gi} className={styles.themeGroup}>
          {group.label && <div className={styles.themeGroupLabel}>{group.label}</div>}
          <div className={styles.themeList}>
            {group.themes.map((theme) => (
              <button
                key={theme.id}
                className={styles.themeBtn}
                onClick={() => onApply(theme)}
                title={theme.description || theme.name}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Global Style controls (Color Mode / Glass / Centered — independent axes) ──

interface GlobalStyleControlsProps {
  bodyTheme: BodyThemeState;
  onSetColorMode: (mode: "light" | "dark") => void;
  onToggleGlass: () => void;
  onToggleCentered: () => void;
  onReset: () => void;
}

function GlobalStyleControls({ bodyTheme, onSetColorMode, onToggleGlass, onToggleCentered, onReset }: GlobalStyleControlsProps) {
  return (
    <div className={styles.themeSection}>
      <div className={styles.themeSectionTitle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Global Style
        <button className={styles.themeBtn} onClick={onReset} title="Reset color mode, glass, and centering to defaults">↺ Reset</button>
      </div>

      <div className={styles.themeGroup}>
        <div className={styles.themeGroupLabel}>Color Mode</div>
        <div className={styles.themeList}>
          <button
            className={`${styles.themeBtn} ${bodyTheme.colorMode === "light" ? styles.themeBtnApplied : ""}`}
            onClick={() => onSetColorMode("light")}
            title="Light background, dark text"
          >Light</button>
          <button
            className={`${styles.themeBtn} ${bodyTheme.colorMode === "dark" ? styles.themeBtnApplied : ""}`}
            onClick={() => onSetColorMode("dark")}
            title="Dark background, light text"
          >Dark</button>
        </div>
      </div>

      <div className={styles.themeGroup}>
        <div className={styles.themeGroupLabel}>Surface</div>
        <div className={styles.themeList}>
          <button
            className={`${styles.themeBtn} ${bodyTheme.glass ? styles.themeBtnApplied : ""}`}
            onClick={onToggleGlass}
            title="Colorful gradient backdrop + translucent blurred cards — works in either color mode"
          >Glassmorphism</button>
        </div>
      </div>

      <div className={styles.themeGroup}>
        <div className={styles.themeGroupLabel}>Layout</div>
        <div className={styles.themeList}>
          <button
            className={`${styles.themeBtn} ${bodyTheme.centered ? styles.themeBtnApplied : ""}`}
            onClick={onToggleCentered}
            title="Constrain the page to a centered column — doesn't affect color"
          >Centered Canvas</button>
        </div>
      </div>
    </div>
  );
}
