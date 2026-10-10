// Shared block-editing widget — palette, program list, block rows, and every
// field picker (target/event/class/CSS-property/expression/DOM-property).
// Built inside HTML Lab's VisualJsPanel.tsx across two sessions of iteration;
// extracted here so Visual Code Studio (the other consumer of blocks.ts/
// transpiler.ts) gets the same explicit pickers instead of its own separate,
// plainer copy — the exact drift that made this extraction necessary in the
// first place. Logic is unchanged from the HTML Lab version; only the CSS
// class names are now injected per host (the two hosts use genuinely
// different, independent theming systems — see BlockEditorClassNames below).

import { useEffect, useRef, useState } from 'react'
import {
  BLOCK_GROUPS, BLOCK_LIBRARY, blockDefinition, canContainChildren, childOptionsFor, summarizeBlock,
} from './blocks.ts'
import type { Block, BlockDefinition, BlockType, FieldSpec } from './types.ts'
// EXPRESSION_GROUPS/EXPRESSION_LIBRARY/detectTemplate/ExpressionParam currently
// live in HTML Lab's jsExpressionLibrary.ts. That file has no HTML-Lab-specific
// dependency (it's pure data + string composition) but wasn't moved in this
// pass to keep the diff focused on the widget itself — both hosts import it
// from its existing path.
import { EXPRESSION_GROUPS, EXPRESSION_LIBRARY, detectTemplate, type ExpressionParam } from '../html-lab/HtmlLab/jsExpressionLibrary.ts'

// ── Category accent colors ──────────────────────────────────────────────────
// Independent of light/dark theme (these are always-on accent hues, not base
// text/background colors) — shared as-is by both hosts. Also stamped as a
// `data-category` attribute alongside the inline `--block-color` custom
// property, since Visual Code Studio's own CSS keys some rules off
// `[data-category]` attribute selectors rather than inline vars — this way
// either host's existing category-coloring mechanism keeps working.
export const CATEGORY_COLORS: Record<string, string> = {
  oop: '#6366f1', state: '#0ea5e9', flow: '#f59e0b',
  output: '#10b981', html: '#ec4899', types: '#8b5cf6',
}

// ── CSS property / value knowledge ──────────────────────────────────────────

export const CSS_PROP_GROUPS = [
  { label: 'Layout',     props: ['display','flexDirection','alignItems','justifyContent','flexWrap','gap','gridTemplateColumns','gridTemplateRows','gridColumn','gridRow'] },
  { label: 'Size',       props: ['width','height','minWidth','minHeight','maxWidth','maxHeight'] },
  { label: 'Spacing',    props: ['margin','marginTop','marginRight','marginBottom','marginLeft','padding','paddingTop','paddingRight','paddingBottom','paddingLeft'] },
  { label: 'Text',       props: ['fontSize','fontWeight','lineHeight','letterSpacing','textAlign','color'] },
  { label: 'Background', props: ['backgroundColor','backgroundImage','backgroundSize'] },
  { label: 'Border',     props: ['border','borderTop','borderRight','borderBottom','borderLeft','borderRadius','boxShadow','outline'] },
  { label: 'Position',   props: ['position','top','right','bottom','left','zIndex'] },
  { label: 'Effects',    props: ['overflow','opacity','transform','transition','cursor','visibility','pointerEvents','objectFit'] },
]

// DOM element properties a beginner actually reaches for — same idea as
// CSS_PROP_GROUPS above, for JS property access/assignment instead of CSS.
// Doesn't try to cover every DOM property; "type manually" is always the
// escape hatch, same as every other picker here.
export const DOM_PROPERTY_GROUPS = [
  { label: 'Content',    props: ['textContent', 'innerHTML', 'innerText'] },
  { label: 'Value & state', props: ['value', 'checked', 'disabled', 'required', 'selected'] },
  { label: 'Attributes', props: ['id', 'className', 'href', 'src', 'alt', 'title'] },
]

export const CSS_PROP_VALUES: Record<string, string[]> = {
  display:        ['block','flex','grid','inline','inline-block','inline-flex','none'],
  flexDirection:  ['row','column','row-reverse','column-reverse'],
  alignItems:     ['flex-start','center','flex-end','stretch','baseline'],
  justifyContent: ['flex-start','center','flex-end','space-between','space-around','space-evenly'],
  flexWrap:       ['nowrap','wrap','wrap-reverse'],
  textAlign:      ['left','center','right','justify','start','end'],
  fontWeight:     ['normal','bold','100','200','300','400','500','600','700','800','900'],
  overflow:       ['visible','hidden','scroll','auto'],
  position:       ['static','relative','absolute','fixed','sticky'],
  cursor:         ['pointer','default','text','crosshair','move','not-allowed','none','grab'],
  visibility:     ['visible','hidden','collapse'],
  objectFit:      ['fill','contain','cover','none','scale-down'],
  pointerEvents:  ['auto','none'],
  backgroundSize: ['auto','cover','contain'],
}

export const DOM_EVENTS = [
  { value: 'click',       label: 'click — button press / tap' },
  { value: 'input',       label: 'input — text field changing' },
  { value: 'change',      label: 'change — dropdown / checkbox changed' },
  { value: 'submit',      label: 'submit — form submitted' },
  { value: 'keydown',     label: 'keydown — key pressed' },
  { value: 'keyup',       label: 'keyup — key released' },
  { value: 'focus',       label: 'focus — element receives focus' },
  { value: 'blur',        label: 'blur — element loses focus' },
  { value: 'mouseover',   label: 'mouseover — cursor enters element' },
  { value: 'mouseout',    label: 'mouseout — cursor leaves element' },
  { value: 'dblclick',    label: 'dblclick — double click' },
  { value: 'contextmenu', label: 'contextmenu — right-click menu' },
]

// ── Hint computation (pure — no React) ──────────────────────────────────────
// Each host feeds this whatever it has: HTML Lab has a live `elements` array
// plus raw `html`/`css` strings; Visual Code Studio has only `project.html`
// (no separate elements array, no separate css string) — it calls
// `computeDomHints([], project.html)` and `computeClassHints(domHints, '')`,
// getting a correct, smaller subset rather than a special case.

export interface HintElement {
  tag: string
  attrs: { id?: string; class?: string }
}

export function computeDomHints(elements: HintElement[], html: string): string[] {
  const hints: string[] = []
  for (const el of elements) {
    if (el.attrs.id) hints.push(`#${el.attrs.id}`)
    if (el.attrs.class) el.attrs.class.split(/\s+/).filter(Boolean).forEach(c => hints.push(`.${c}`))
    hints.push(el.tag)
  }
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) hints.push(`#${m[1]}`)
  for (const m of html.matchAll(/\bclass="([^"]+)"/g)) m[1].split(/\s+/).filter(Boolean).forEach(c => hints.push(`.${c}`))
  return [...new Set(hints)]
}

export function computeClassHints(domHints: string[], css: string): string[] {
  const names = new Set<string>()
  for (const h of domHints) if (h.startsWith('.')) names.add(h.slice(1))
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)\s*[{,]/g)) names.add(m[1])
  return [...names]
}

export function computeVariableHints(blocks: Block[]): string[] {
  const names: string[] = []
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if ((b.type === 'variable' || b.type === 'readValue') && b.fields?.name) names.push(b.fields.name)
      walk(b.children ?? [])
    }
  }
  walk(blocks)
  return [...new Set(names)]
}

// ── Style injection ──────────────────────────────────────────────────────────
// The two hosts (HTML Lab's Visual JS, Visual Code Studio) use genuinely
// different, independent CSS theming systems — not just renamed variables —
// so this widget takes its class names as a prop bundle instead of importing
// its own stylesheet. All keys are optional; an omitted key just renders
// with no class (unstyled, not broken) so a host can supply a partial bundle.
export interface BlockEditorClassNames {
  paletteSearchWrap?: string
  searchInput?: string
  paletteScroll?: string
  emptyState?: string
  paletteGroup?: string
  groupLabel?: string
  paletteBtn?: string
  programHeader?: string
  importBtn?: string
  importBtnFlash?: string
  programScroll?: string
  blockRowWrapper?: string
  blockRow?: string
  blockRowActive?: string
  blockTopLine?: string
  blockDot?: string
  blockName?: string
  blockActions?: string
  iconBtn?: string
  blockSummary?: string
  fieldEditor?: string
  conceptHint?: string
  childSlot?: string
  depthClass?: (depth: number) => string
  childActions?: string
  addChildBtn?: string
  addChildIcon?: string
  addChildLabel?: string
  propRow?: string
  propLabel?: string
  propInput?: string
  fieldCode?: string
  nestedExprSlot?: string
}

const NO_DEPTH_CLASS = () => ''

// ── Block Palette ────────────────────────────────────────────────────────────

export interface BlockPaletteProps {
  query: string
  onQueryChange: (q: string) => void
  onAddBlock: (type: BlockType) => void
  classNames: BlockEditorClassNames
  /** Include tsOnly blocks (Interface, Enum, Type Alias...) in the palette —
   *  HTML Lab's Visual JS is always JS, so it omits this; Visual Code Studio
   *  passes `project.target === 'typescript'`. */
  allowTsOnly?: boolean
  groupOrder?: string[]
  /** If provided, called for each block definition; return false to hide the block from the palette. */
  filterBlock?: (b: BlockDefinition) => boolean
}

/** Shared by `BlockPalette` internally and by a host that wants to show its
 *  own "N blocks" count in its own header chrome, without duplicating the
 *  filter predicate. */
export function filterPaletteBlocks(query: string, allowTsOnly = false, filterBlock?: (b: BlockDefinition) => boolean) {
  return BLOCK_LIBRARY.filter(b => {
    if (b.childOnly) return false
    if (b.tsOnly && !allowTsOnly) return false
    if (filterBlock && !filterBlock(b)) return false
    if (!query) return true
    return `${b.label} ${b.category} ${b.description}`.toLowerCase().includes(query.toLowerCase())
  })
}

export function BlockPalette({ query, onQueryChange, onAddBlock, classNames: cls, allowTsOnly = false, filterBlock, groupOrder }: BlockPaletteProps) {
  const visible = filterPaletteBlocks(query, allowTsOnly, filterBlock)
  const groups = groupOrder ? [...BLOCK_GROUPS].sort((a, b) => {
    const rank = (id: string) => { const index = groupOrder.indexOf(id); return index < 0 ? groupOrder.length : index }
    return rank(a.id) - rank(b.id)
  }) : BLOCK_GROUPS

  return (
    <>
      <div className={cls.paletteSearchWrap}>
        <input
          className={cls.searchInput}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search blocks…"
          aria-label="Search blocks"
        />
      </div>
      <div className={cls.paletteScroll}>
        {query && visible.length === 0 && (
          <div className={cls.emptyState}>
            No blocks match "{query}". Try a different word, or look for
            a block whose Target field can point at the element you want
            — most element-related actions (Event Listener, HTML Text,
            Add/Remove/Toggle Class, Set Style) work that way instead of
            a separate "find element" block.
          </div>
        )}
        {groups.map(group => {
          const groupBlocks = visible.filter(b => b.category === group.id)
          if (!groupBlocks.length) return null
          return (
            <div key={group.id} className={cls.paletteGroup} data-category={group.id}>
              <div className={cls.groupLabel} data-category={group.id}>{group.label}</div>
              {groupBlocks.map(item => (
                <button
                  key={item.type}
                  type="button"
                  className={cls.paletteBtn}
                  data-category={item.category}
                  style={{ '--block-color': CATEGORY_COLORS[item.category] || 'inherit' } as React.CSSProperties}
                  onClick={() => onAddBlock(item.type as BlockType)}
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Block Program ────────────────────────────────────────────────────────────

export interface BlockProgramProps {
  blocks: Block[]
  selectedBlockId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onAddChild: (type: BlockType, parentId: string | null) => void
  onUpdateField: (blockId: string, name: string, value: string) => void
  onUpdateFields: (blockId: string, patch: Record<string, string>) => void
  domHints: string[]
  classHints: string[]
  variableHints: string[]
  classNames: BlockEditorClassNames
  /** Optional right-side header content — HTML Lab uses this for its
   *  "← Import from JS" button; Visual Code Studio has its own separate
   *  top-level import flow and passes nothing. */
  headerActions?: React.ReactNode
  emptyMessage?: React.ReactNode
  /** If provided, called for each field spec before rendering. Return false to hide the field. */
  filterField?: (field: FieldSpec, block: Block) => boolean
}

export function BlockProgram({
  blocks, selectedBlockId, onSelect, onDelete, onMove, onAddChild, onUpdateField, onUpdateFields,
  domHints, classHints, variableHints, classNames: cls, headerActions, emptyMessage, filterField,
}: BlockProgramProps) {
  return (
    <>
      <div className={cls.programHeader}>
        Program
        {headerActions}
      </div>
      <div className={cls.programScroll}>
        {blocks.length === 0 ? (
          <div className={cls.emptyState}>{emptyMessage ?? 'Click a block on the left to add it here'}</div>
        ) : (
          blocks.map(block => (
            <BlockRow
              key={block.id}
              block={block}
              selectedBlockId={selectedBlockId}
              onSelect={onSelect}
              onDelete={onDelete}
              onMove={onMove}
              onAddChild={onAddChild}
              onUpdateField={onUpdateField}
              onUpdateFields={onUpdateFields}
              domHints={domHints}
              classHints={classHints}
              variableHints={variableHints}
              classNames={cls}
              filterField={filterField}
            />
          ))
        )}
      </div>
    </>
  )
}

// ── Block Row ─────────────────────────────────────────────────────────────────

interface BlockRowProps {
  block: Block
  selectedBlockId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onAddChild: (type: BlockType, parentId: string) => void
  onUpdateField: (blockId: string, name: string, value: string) => void
  onUpdateFields: (blockId: string, patch: Record<string, string>) => void
  domHints: string[]
  classHints: string[]
  variableHints: string[]
  classNames: BlockEditorClassNames
  depth?: number
  filterField?: (field: FieldSpec, block: Block) => boolean
}

function BlockRow({ block, selectedBlockId, onSelect, onDelete, onMove, onAddChild, onUpdateField, onUpdateFields, domHints, classHints, variableHints, classNames: cls, depth = 0, filterField }: BlockRowProps) {
  const def = blockDefinition(block.type)
  const childOptions = childOptionsFor(block.type)
  const isSelected = selectedBlockId === block.id
  const depthClass = cls.depthClass ?? NO_DEPTH_CLASS

  return (
    <div className={cls.blockRowWrapper}>
      <div
        className={`${cls.blockRow ?? ''} ${isSelected ? cls.blockRowActive ?? '' : ''}`}
        data-category={block.category}
        data-block-id={block.id}
        data-block-type={block.type}
        onClick={e => { e.stopPropagation(); onSelect(block.id) }}
      >
        <div className={cls.blockTopLine}>
          <span className={cls.blockDot} style={{ background: CATEGORY_COLORS[block.category] ?? '#94a3b8' }} />
          <button type="button" className={cls.blockName} aria-expanded={isSelected} title={`Edit ${def?.label ?? block.type} block`} style={{ color: CATEGORY_COLORS[block.category] ?? 'inherit', background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onSelect(block.id) }}>{def?.label ?? block.type}</button>
          <div className={cls.blockActions}>
            <button type="button" className={cls.iconBtn} title="Move up" onClick={e => { e.stopPropagation(); onMove(block.id, 'up') }}>▲</button>
            <button type="button" className={cls.iconBtn} title="Move down" onClick={e => { e.stopPropagation(); onMove(block.id, 'down') }}>▼</button>
            <button type="button" className={cls.iconBtn} title="Delete" onClick={e => { e.stopPropagation(); onDelete(block.id) }}>✕</button>
          </div>
        </div>
        <code className={cls.blockSummary}>{summarizeBlock(block)}</code>
        {isSelected && def?.fields?.length ? (
          <div className={cls.fieldEditor} onClick={e => e.stopPropagation()}>
            {def.fields.filter(field => !filterField || filterField(field, block)).map(field => (
              <FieldInput
                key={field.name}
                field={field}
                block={block}
                onChange={(name, value) => onUpdateField(block.id, name, value)}
                onChangeMulti={(patch) => onUpdateFields(block.id, patch)}
                domHints={domHints}
                classHints={classHints}
                variableHints={variableHints}
                classNames={cls}
              />
            ))}
          </div>
        ) : null}
        {!isSelected && def?.concept?.summary && (
          <span className={cls.conceptHint}>{def.concept.summary}</span>
        )}
      </div>
      {canContainChildren(block.type) && (
        <div className={`${cls.childSlot ?? ''} ${depthClass(depth % 6)}`}>
          {(block.children ?? []).map(child => (
            <BlockRow
              key={child.id}
              block={child}
              selectedBlockId={selectedBlockId}
              onSelect={onSelect}
              onDelete={onDelete}
              onMove={onMove}
              onAddChild={onAddChild}
              onUpdateField={onUpdateField}
              onUpdateFields={onUpdateFields}
              domHints={domHints}
              classHints={classHints}
              variableHints={variableHints}
              classNames={cls}
              depth={depth + 1}
              filterField={filterField}
            />
          ))}
          <div className={cls.childActions}>
            {childOptions.map(opt => {
              const color = CATEGORY_COLORS[opt.category] || '#94a3b8'
              return (
                <button
                  key={opt.type}
                  type="button"
                  className={cls.addChildBtn}
                  data-category={opt.category}
                  style={{
                    '--block-color': color,
                    '--block-bg': color + '1a',
                    '--block-border': color + '4d',
                  } as React.CSSProperties}
                  onClick={e => { e.stopPropagation(); onAddChild(opt.type as BlockType, block.id) }}
                >
                  <span className={cls.addChildIcon}>+</span>
                  <span className={cls.addChildLabel}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Field Input (dispatcher) ─────────────────────────────────────────────────

interface FieldInputProps {
  field: FieldSpec
  block: Block
  onChange: (name: string, value: string) => void
  onChangeMulti: (patch: Record<string, string>) => void
  domHints: string[]
  classHints: string[]
  variableHints: string[]
  classNames: BlockEditorClassNames
}

function FieldInput({ field, block, onChange, onChangeMulti, domHints, classHints, variableHints, classNames: cls }: FieldInputProps) {
  const value = block.fields?.[field.name] ?? ''

  if (block.type === 'call' && field.name === 'expression' && /[\n;]/.test(value)) {
    return <label className={cls.propRow}><span className={cls.propLabel}>JavaScript</span><textarea className={cls.fieldCode} aria-label="JavaScript source" value={value} onChange={e => onChange(field.name, e.target.value)} spellCheck={false} /></label>
  }
  if (field.name === 'selector') {
    return <TargetField block={block} domHints={domHints} variableHints={variableHints} onChange={onChangeMulti} classNames={cls} />
  }
  if (field.name === 'event') {
    return <EventTypeField value={value} onChange={v => onChange(field.name, v)} classNames={cls} />
  }
  if (field.name === 'className') {
    return <ClassNameField value={value} classHints={classHints} onChange={v => onChange(field.name, v)} classNames={cls} />
  }
  if (field.name === 'property') {
    return <CssPropertyField value={value} onChange={v => onChange(field.name, v)} classNames={cls} />
  }
  if (field.name === 'value' && block.type === 'setStyle') {
    return <CssValueField value={value} property={block.fields?.property ?? ''} onChange={v => onChange(field.name, v)} classNames={cls} />
  }
  // A list-typed field (For Each Item / Transform / Filter's source list) —
  // a variable picker, not a DOM selector picker: these act on an array
  // already held in a variable, never on a page element directly.
  if (field.name === 'list') {
    return <ListVariableField value={value} variableHints={variableHints} onChange={v => onChange(field.name, v)} classNames={cls} />
  }
  // Any general-purpose JS expression field — offers the curated pattern
  // library, but the raw text stays a normal, always-editable input either way.
  // `target` (Assign's left-hand side) is included: assigning to an element's
  // property (e.g. `element.disabled`) is exactly the "Get an element's
  // property" pattern below, just used as an assignment target instead of a
  // read — same expression, no separate mechanism needed.
  if (['value', 'expression', 'condition', 'target'].includes(field.name) || (field.name === 'text' && block.type === 'htmlText')) {
    return <ExpressionField label={field.label} value={value} domHints={domHints} variableHints={variableHints} onChange={v => onChange(field.name, v)} depth={1} classNames={cls} />
  }

  return (
    <label className={cls.propRow}>
      <span className={cls.propLabel}>{field.label}</span>
      {field.kind === 'select' ? (
        <select className={cls.propInput} value={value} onChange={e => onChange(field.name, e.target.value)}>
          {(field.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : field.kind === 'code' ? (
        <textarea className={cls.fieldCode} value={value} onChange={e => onChange(field.name, e.target.value)} />
      ) : (
        <input className={cls.propInput} value={value} onChange={e => onChange(field.name, e.target.value)} />
      )}
    </label>
  )
}

// ── Target Field ──────────────────────────────────────────────────────────────
// One combined dropdown for the "which element does this act on" question
// every DOM-facing block asks. Explicit, not inferred: picking from "By ID" /
// "By class" / "By tag" sets targetKind: 'selector'; picking from "Variables"
// sets targetKind: 'variable' — the block always knows which kind of target
// it has, it's never guessed from the string's shape.

function TargetField({ block, domHints, variableHints, onChange, classNames: cls }: {
  block: Block
  domHints: string[]
  variableHints: string[]
  onChange: (patch: Record<string, string>) => void
  classNames: BlockEditorClassNames
}) {
  const targetKind = block.fields?.targetKind === 'variable' ? 'variable' : 'selector'
  const selector = block.fields?.selector ?? ''
  const variableName = block.fields?.variableName ?? ''
  const currentValue = targetKind === 'variable' ? variableName : selector
  const knownValue = targetKind === 'variable' ? variableHints.includes(currentValue) : domHints.includes(currentValue)
  const [custom, setCustom] = useState(targetKind === 'selector' && currentValue !== '' && !knownValue)

  const ids     = domHints.filter(h => h.startsWith('#'))
  const classes = domHints.filter(h => h.startsWith('.'))
  const tags    = domHints.filter(h => !h.startsWith('#') && !h.startsWith('.'))
  const hasOptions = ids.length > 0 || classes.length > 0 || tags.length > 0 || variableHints.length > 0

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false)
    if (v.startsWith('__var__:')) {
      onChange({ targetKind: 'variable', variableName: v.slice('__var__:'.length), selector: '' })
    } else {
      onChange({ targetKind: 'selector', selector: v, variableName: '' })
    }
  }

  const selectValue = custom
    ? '__custom__'
    : targetKind === 'variable'
      ? (variableName ? `__var__:${variableName}` : '__empty__')
      : (selector || '__empty__')

  return (
    <div className={cls.propRow}>
      <span className={cls.propLabel}>Target</span>
      {hasOptions && (
        <select
          className={cls.propInput}
          aria-label="Target element or variable"
          value={selectValue}
          onChange={e => handleSelect(e.target.value)}
        >
          <option value="__empty__" disabled>— pick an element or variable —</option>
          {ids.length > 0 && <optgroup label="By ID">{ids.map(h => <option key={h} value={h}>{h}</option>)}</optgroup>}
          {classes.length > 0 && <optgroup label="By class">{classes.map(h => <option key={h} value={h}>{h}</option>)}</optgroup>}
          {tags.length > 0 && <optgroup label="By tag">{tags.map(h => <option key={h} value={h}>{h}</option>)}</optgroup>}
          {variableHints.length > 0 && (
            <optgroup label="Variables">
              {variableHints.map(v => <option key={v} value={`__var__:${v}`}>{v}</option>)}
            </optgroup>
          )}
          <option value="__custom__">Custom value…</option>
        </select>
      )}
      {(custom || !hasOptions) && (
        <input
          className={cls.propInput}
          aria-label="CSS selector"
          value={selector}
          onChange={e => onChange({ targetKind: 'selector', selector: e.target.value, variableName: '' })}
          placeholder="#id or .class or tag"
          autoFocus
        />
      )}
    </div>
  )
}

// ── Expression Field ──────────────────────────────────────────────────────────
// Same idea as the CSS property/value dropdowns below, for JS instead of CSS:
// a curated, grouped library of common expressions (find an element, fetch
// JSON, round a number, uppercase text...) that fills in the real field —
// which stays a normal, always-editable text input either way. Picking a
// pattern with parameters (e.g. "Fetch JSON from a URL" needs a URL) shows
// small inputs for just those parameters and live-composes the final
// expression as you fill them in.
//
function ExpressionField({ label, value, domHints, variableHints, onChange, nested, depth, classNames: cls }: {
  label: string
  value: string
  domHints: string[]
  variableHints: string[]
  onChange: (v: string) => void
  // True when this is a param of an *outer* expression (e.g. the "a" in
  // a && b) rather than the top-level field on the block itself — just
  // controls a visual indent so nesting depth reads clearly.
  nested?: boolean
  depth?: number
  classNames: BlockEditorClassNames
}) {
  // Runs once, at mount, against whatever this field already holds — e.g.
  // code that was just parsed in from the JS file. Lazy useState initializers
  // only ever run on the very first render, which is exactly the "only when
  // this is genuinely a fresh value, never fight the user mid-edit" timing
  // this needs (a fresh import always mounts a fresh block/field anyway).
  const [templateId, setTemplateId] = useState<string | null>(() => detectTemplate(value)?.id ?? null)
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => detectTemplate(value)?.params ?? {})
  const lastValue = useRef(value)
  // A parent expression can change an existing nested field without remounting
  // it. Refresh those controls, but retain a pattern the user just chose here.
  useEffect(() => {
    if (lastValue.current === value) return
    lastValue.current = value
    const detected = detectTemplate(value)
    setTemplateId(detected?.id ?? null)
    setParamValues(detected?.params ?? {})
  }, [value])
  const emitChange = (next: string) => { lastValue.current = next; onChange(next) }

  const template = templateId ? EXPRESSION_LIBRARY.find(t => t.id === templateId) ?? null : null
  const depthClass = cls.depthClass ?? NO_DEPTH_CLASS

  const handleSelectTemplate = (id: string) => {
    if (id === '__manual__') { setTemplateId(null); return }
    const t = EXPRESSION_LIBRARY.find(x => x.id === id)
    if (!t) return
    const initial: Record<string, string> = {}
    for (const param of t.params) initial[param.name] = param.default ?? ''
    setTemplateId(id)
    setParamValues(initial)
    emitChange(t.build(initial))
  }

  const handleParamChange = (name: string, v: string) => {
    const next = { ...paramValues, [name]: v }
    setParamValues(next)
    if (template) emitChange(template.build(next))
  }

  const body = (
    <>
      <label className={cls.propRow}>
        <span className={cls.propLabel}>Pattern</span>
        <select
          className={cls.propInput}
          aria-label="Expression pattern"
          value={templateId ?? '__manual__'}
          onChange={e => handleSelectTemplate(e.target.value)}
        >
          <option value="__manual__">Custom JavaScript</option>
          {EXPRESSION_GROUPS.map(group => {
            const items = EXPRESSION_LIBRARY.filter(t => t.group === group.id)
            if (!items.length) return null
            return (
              <optgroup key={group.id} label={group.label}>
                {items.map(t => <option key={t.id} value={t.id} title={t.description}>{t.label}</option>)}
              </optgroup>
            )
          })}
        </select>
      </label>
      {template?.params.map(param => (
        <ExpressionParamInput
          key={`${template.id}:${param.name}`}
          param={param}
          value={paramValues[param.name] ?? ''}
          domHints={domHints}
          variableHints={variableHints}
          onChange={v => handleParamChange(param.name, v)}
          depth={(depth || 0) + 1}
          classNames={cls}
        />
      ))}
      <label className={cls.propRow}>
        <span className={cls.propLabel}>{template ? 'Code' : label}</span>
        <input className={cls.propInput} aria-label={`${label} code`} value={value} spellCheck={false} onChange={e => {
          const next = detectTemplate(e.target.value)
          setTemplateId(next?.id ?? null)
          setParamValues(next?.params ?? {})
          emitChange(e.target.value)
        }} />
      </label>
    </>
  )

  return nested ? <div className={`${cls.nestedExprSlot ?? ''} ${depthClass((depth || 0) % 6)}`}>{body}</div> : <>{body}</>
}

function ExpressionParamInput({ param, value, domHints, variableHints, onChange, depth = 0, classNames: cls }: {
  param: ExpressionParam
  value: string
  domHints: string[]
  variableHints: string[]
  onChange: (v: string) => void
  depth?: number
  classNames: BlockEditorClassNames
}) {
  // Recursive case: a param that's itself a full sub-expression gets its
  // own nested pattern-picker, not a plain text box — this is what lets
  // "call a method whose argument is a comparison" build (or decompose)
  // one explicit piece at a time instead of bottoming out at raw text.
  if (param.kind === 'boolean') {
    return <label className={cls.propRow}><span className={cls.propLabel}>{param.label}</span><select className={cls.propInput} value={value || 'true'} onChange={e => onChange(e.target.value)}><option value="true">true</option><option value="false">false</option></select></label>
  }
  if (param.kind === 'expression') {
    return (
      <ExpressionField
        label={param.label}
        value={value}
        domHints={domHints}
        variableHints={variableHints}
        onChange={onChange}
        nested
        depth={depth}
        classNames={cls}
      />
    )
  }

  // A DOM element property, picked from a curated list instead of typed —
  // same dropdown-plus-custom-fallback shape as CssPropertyField, just for
  // JS property access (element.checked) instead of CSS (style.display).
  if (param.kind === 'domProperty') {
    return <DomPropertyParamInput label={param.label} value={value} onChange={onChange} classNames={cls} />
  }

  const hints = param.kind === 'selector' ? domHints : param.kind === 'variable' ? variableHints : []
  const known = hints.includes(value)
  const [custom, setCustom] = useState(hints.length > 0 ? (!known && value !== '') : true)

  if (hints.length === 0) {
    return (
      <label className={cls.propRow}>
        <span className={cls.propLabel}>{param.label}</span>
        <input className={cls.propInput} value={value} onChange={e => onChange(e.target.value)} placeholder={param.placeholder} />
      </label>
    )
  }

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false)
    onChange(v)
  }

  return (
    <label className={cls.propRow}>
      <span className={cls.propLabel}>{param.label}</span>
      <select className={cls.propInput} value={custom ? '__custom__' : (value || '__empty__')} onChange={e => handleSelect(e.target.value)}>
        <option value="__empty__" disabled>— pick —</option>
        {hints.map(h => <option key={h} value={h}>{h}</option>)}
        <option value="__custom__">Custom value…</option>
      </select>
      {custom && (
        <input className={cls.propInput} value={value} onChange={e => onChange(e.target.value)} placeholder={param.placeholder} autoFocus />
      )}
    </label>
  )
}

function DomPropertyParamInput({ label, value, onChange, classNames: cls }: { label: string; value: string; onChange: (v: string) => void; classNames: BlockEditorClassNames }) {
  const inGroups = DOM_PROPERTY_GROUPS.some(g => g.props.includes(value))
  const [custom, setCustom] = useState(!inGroups && value !== '')

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false); onChange(v)
  }

  return (
    <label className={cls.propRow}>
      <span className={cls.propLabel}>{label}</span>
      <select className={cls.propInput} aria-label={label} value={custom ? '__custom__' : (value || '__empty__')} onChange={e => handleSelect(e.target.value)}>
        <option value="__empty__" disabled>— pick a property —</option>
        {DOM_PROPERTY_GROUPS.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.props.map(prop => <option key={prop} value={prop}>{prop}</option>)}
          </optgroup>
        ))}
        {!inGroups && value && <option value={value}>{value}</option>}
        <option value="__custom__">Custom value…</option>
      </select>
      {custom && (
        <input className={cls.propInput} value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. dataset.count" autoFocus />
      )}
    </label>
  )
}

// ── Event Type Field ──────────────────────────────────────────────────────────

function EventTypeField({ value, onChange, classNames: cls }: { value: string; onChange: (v: string) => void; classNames: BlockEditorClassNames }) {
  const known = DOM_EVENTS.some(e => e.value === value)
  return (
    <label className={cls.propRow}>
      <span className={cls.propLabel}>Event</span>
      <select
        className={cls.propInput}
        value={known ? value : (value || 'click')}
        onChange={e => onChange(e.target.value)}
      >
        {DOM_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
        {!known && value && <option value={value}>{value}</option>}
      </select>
    </label>
  )
}

// ── Class Name Field ──────────────────────────────────────────────────────────

function ClassNameField({ value, classHints, onChange, classNames: cls }: { value: string; classHints: string[]; onChange: (v: string) => void; classNames: BlockEditorClassNames }) {
  const inList = classHints.includes(value)
  const [custom, setCustom] = useState(!inList && value !== '')

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false); onChange(v)
  }

  return (
    <div className={cls.propRow}>
      <span className={cls.propLabel}>Class name</span>
      {classHints.length > 0 && (
        <select
          className={cls.propInput}
          aria-label="CSS class name"
          value={custom ? '__custom__' : (value || '__empty__')}
          onChange={e => handleSelect(e.target.value)}
        >
          <option value="__empty__" disabled>— pick a class —</option>
          {classHints.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">Custom value…</option>
        </select>
      )}
      {(custom || classHints.length === 0) && (
        <input
          className={cls.propInput}
          aria-label="CSS class name"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="active"
          autoFocus
        />
      )}
    </div>
  )
}

// ── List Variable Field ───────────────────────────────────────────────────────
// The "source list" for For Each Item / Transform / Filter — a plain
// variable-name picker, not TargetField's element-selector concept, since
// these blocks act on an array already sitting in a variable.

function ListVariableField({ value, variableHints, onChange, classNames: cls }: { value: string; variableHints: string[]; onChange: (v: string) => void; classNames: BlockEditorClassNames }) {
  const known = variableHints.includes(value)
  const [custom, setCustom] = useState(variableHints.length > 0 ? (!known && value !== '') : true)

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false); onChange(v)
  }

  return (
    <div className={cls.propRow}>
      <span className={cls.propLabel}>List</span>
      {variableHints.length > 0 && (
        <select className={cls.propInput} aria-label="List variable" value={custom ? '__custom__' : (value || '__empty__')} onChange={e => handleSelect(e.target.value)}>
          <option value="__empty__" disabled>— pick a variable —</option>
          {variableHints.map(v => <option key={v} value={v}>{v}</option>)}
          <option value="__custom__">Custom value…</option>
        </select>
      )}
      {(custom || variableHints.length === 0) && (
        <input className={cls.propInput} aria-label="List variable" value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. players" autoFocus />
      )}
    </div>
  )
}

// ── CSS Property Field ────────────────────────────────────────────────────────

function CssPropertyField({ value, onChange, classNames: cls }: { value: string; onChange: (v: string) => void; classNames: BlockEditorClassNames }) {
  const inGroups = CSS_PROP_GROUPS.some(g => g.props.includes(value))
  const [custom, setCustom] = useState(!inGroups && value !== '')

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false); onChange(v)
  }

  return (
    <div className={cls.propRow}>
      <span className={cls.propLabel}>Property</span>
      <select
        className={cls.propInput}
        aria-label="CSS property"
        value={custom ? '__custom__' : (value || '__empty__')}
        onChange={e => handleSelect(e.target.value)}
      >
        <option value="__empty__" disabled>— pick a property —</option>
        {CSS_PROP_GROUPS.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.props.map(p => <option key={p} value={p}>{p}</option>)}
          </optgroup>
        ))}
        {!inGroups && value && <option value={value}>{value}</option>}
        <option value="__custom__">Custom value…</option>
      </select>
      {custom && (
        <input
          className={cls.propInput}
          aria-label="CSS property"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. border-color"
          autoFocus
        />
      )}
    </div>
  )
}

// ── CSS Value Field ───────────────────────────────────────────────────────────

function CssValueField({ value, property, onChange, classNames: cls }: { value: string; property: string; onChange: (v: string) => void; classNames: BlockEditorClassNames }) {
  const knownValues = CSS_PROP_VALUES[property]
  const inList = (knownValues ?? []).includes(value)
  const [custom, setCustom] = useState(!inList && value !== '')

  const handleSelect = (v: string) => {
    if (v === '__custom__') { setCustom(true); return }
    setCustom(false); onChange(v)
  }

  if (!knownValues) {
    return (
      <label className={cls.propRow}>
        <span className={cls.propLabel}>Value</span>
        <input
          className={cls.propInput}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. #ff0000 or 16px"
        />
      </label>
    )
  }

  return (
    <div className={cls.propRow}>
      <span className={cls.propLabel}>Value</span>
      <select
        className={cls.propInput}
        aria-label="CSS value"
        value={custom ? '__custom__' : (value || knownValues[0])}
        onChange={e => handleSelect(e.target.value)}
      >
        {knownValues.map(v => <option key={v} value={v}>{v}</option>)}
        {!inList && value && <option value={value}>{value}</option>}
        <option value="__custom__">Custom value…</option>
      </select>
      {custom && (
        <input
          className={cls.propInput}
          aria-label="CSS value"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="custom value"
          autoFocus
        />
      )}
    </div>
  )
}
