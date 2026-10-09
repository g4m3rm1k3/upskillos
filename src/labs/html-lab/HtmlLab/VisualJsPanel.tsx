import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createBlock } from '../../visual-code/blocks.ts'
import {
  normalizeProject, insertBlock, removeBlock, moveBlock, updateBlock, transpileProject
} from '../../visual-code/transpiler.ts'
import { importVisualJs } from './visualJsImport'
import {
  BlockPalette, BlockProgram, computeDomHints, computeClassHints, computeVariableHints,
  type BlockEditorClassNames,
} from '../../visual-code/BlockEditor.tsx'
import type { Block, BlockType, Project } from '../../visual-code/types.ts'
import type { LabElement, JsFile } from './types'
import styles from './VisualJsPanel.module.css'

interface Props {
  elements: LabElement[]
  html: string
  css?: string
  jsFiles: JsFile[]
  activeJsFileId: string
  tabVisitCount?: number
  onCodeChange: (fileId: string, code: string) => void
}

// Maps this file's own CSS Modules classes onto the shared widget's generic
// slots — see BlockEditor.tsx's own comment for why this is a classNames
// bundle rather than a shared stylesheet (HTML Lab and Visual Code Studio
// use genuinely different, independent theming systems).
const BLOCK_EDITOR_CLASSNAMES: BlockEditorClassNames = {
  paletteSearchWrap: styles.paletteSearch,
  searchInput: styles.searchInput,
  paletteScroll: styles.paletteScroll,
  emptyState: styles.emptyState,
  paletteGroup: undefined,
  groupLabel: styles.groupLabel,
  paletteBtn: styles.paletteBtn,
  programHeader: styles.programHeader,
  importBtn: styles.importBtn,
  importBtnFlash: styles.importBtnFlash,
  programScroll: styles.programScroll,
  blockRowWrapper: styles.blockRowWrapper,
  blockRow: styles.blockRow,
  blockRowActive: styles.blockRowActive,
  blockTopLine: styles.blockTopLine,
  blockDot: styles.blockDot,
  blockName: styles.blockName,
  blockActions: styles.blockActions,
  iconBtn: styles.iconBtn,
  blockSummary: styles.blockSummary,
  fieldEditor: styles.fieldEditor,
  conceptHint: styles.conceptHint,
  childSlot: styles.childSlot,
  depthClass: (depth) => styles[`depth-${depth}`] || '',
  childActions: styles.childActions,
  addChildBtn: styles.addChildBtn,
  addChildIcon: styles.addChildIcon,
  addChildLabel: styles.addChildLabel,
  propRow: styles.propRow,
  propLabel: styles.propLabel,
  propInput: styles.propInput,
  fieldCode: styles.fieldCode,
  nestedExprSlot: styles.nestedExprSlot,
}

export default function VisualJsPanel({ elements, html, css = '', jsFiles, activeJsFileId, tabVisitCount, onCodeChange }: Props) {
  // One block-project file per HTML Lab JS file (same ids), so switching
  // which .js file is active — even without leaving this tab — shows that
  // file's own blocks instead of one shared canvas for the whole JS tab.
  const [project, setProject] = useState<Project>(() => normalizeProject({
    schemaVersion: 2,
    id: 'visual-js',
    name: 'Visual JS',
    target: 'javascript',
    files: jsFiles.map(f => ({ id: f.id, name: f.name, blocks: [] })),
    activeFileId: activeJsFileId,
    html: '',
  }))
  const [query, setQuery] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [importFlash, setImportFlash] = useState(false)
  const [preservedSource, setPreservedSource] = useState(false)
  // Per file: the JS text last imported into (or generated for) it, so each
  // file independently knows whether its code has changed since it was last
  // in sync with its blocks.
  const lastImportedCodeRef = useRef<Map<string, string>>(new Map())
  const dirtyFileRef = useRef<string | null>(null)

  const file = project.files.find(f => f.id === project.activeFileId) ?? project.files[0]
  const blocks = file?.blocks ?? []
  const generated = useMemo(() => transpileProject(project, project.activeFileId), [project])
  const activeJsCode = jsFiles.find(f => f.id === activeJsFileId)?.code ?? ''

  // Hints from canvas elements AND from raw HTML (covers elements typed in the HTML editor)
  const domHints = useMemo(() => computeDomHints(elements, html), [elements, html])
  // CSS class names from page elements + the CSS editor (for classList dropdowns)
  const classHints = useMemo(() => computeClassHints(domHints, css), [domHints, css])
  // Variable names declared anywhere in this file's own blocks (Variable /
  // Read Value) — offered as an explicit alternative to a raw CSS selector
  // wherever a block needs a target element, e.g. an event listener attached
  // to `btn` after `const btn = document.querySelector('#btn')` earlier.
  // Not real scope analysis — just "names declared somewhere in this file,"
  // same approximation domHints/classHints already make.
  const variableHints = useMemo(() => computeVariableHints(blocks), [blocks])

  const onCodeChangeRef = useRef(onCodeChange)
  useEffect(() => { onCodeChangeRef.current = onCodeChange })
  useEffect(() => {
    // Only an explicit block edit writes source. Mounting, importing and
    // switching files are read-only; deleting the final block writes "".
    if (dirtyFileRef.current !== project.activeFileId) return;
    dirtyFileRef.current = null;
    const fileId = project.activeFileId
    onCodeChangeRef.current(fileId, generated.code)
    // Track the outgoing code so the jsFiles-driven sync effect below sees
    // this file as already in sync and doesn't parse the code we just
    // generated back into blocks (which would be a lossy round-trip and
    // could visibly mutate what the user just built).
    lastImportedCodeRef.current.set(fileId, generated.code)
  }, [generated])

  function commit(updater: (bs: Block[]) => Block[]) {
    dirtyFileRef.current = project.activeFileId;
    setProject(p => normalizeProject({
      ...p,
      files: p.files.map(f => f.id === p.activeFileId ? { ...f, blocks: updater(f.blocks) } : f),
    }))
  }

  function addBlock(type: BlockType, parentId: string | null = null) {
    const raw = createBlock(type)
    // Clear VCS-specific selector defaults — learner picks from their own page elements
    const block = raw.fields && 'selector' in raw.fields
      ? { ...raw, fields: { ...raw.fields, selector: '' } }
      : raw
    commit(bs => insertBlock(bs, parentId, block))
    setSelectedBlockId(block.id)
  }

  function deleteBlock(id: string) {
    commit(bs => removeBlock(bs, id))
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  function updateField(blockId: string, name: string, value: string) {
    commit(bs => updateBlock(bs, blockId, b => ({ ...b, fields: { ...b.fields, [name]: value } })))
  }

  // For controls that set several fields atomically — e.g. picking a target
  // from the combined element/variable dropdown sets targetKind + selector +
  // variableName together, so the block is never left in a state where the
  // kind and the value it's paired with disagree.
  function updateFields(blockId: string, patch: Record<string, string>) {
    commit(bs => updateBlock(bs, blockId, b => ({ ...b, fields: { ...b.fields, ...patch } })))
  }

  const importFromJs = useCallback((code: string, fileId: string) => {
    const result = importVisualJs(code)
    const imported = result.blocks
    setPreservedSource(result.preserved)
    if (!imported.length) return
    // Flag the generated effect to skip onCodeChange for this render cycle.
    // The original code is already stored in lastImportedCodeRef so the next
    // sync can correctly detect whether the JS changed externally.
    dirtyFileRef.current = null
    lastImportedCodeRef.current.set(fileId, code)
    setProject(p => normalizeProject({
      ...p,
      files: p.files.map(f => f.id === fileId ? { ...f, blocks: imported } : f),
    }))
    setSelectedBlockId(null)
    setImportFlash(true)
    setTimeout(() => setImportFlash(false), 1200)
  }, [])

  // Keeps project.files structurally in sync with HTML Lab's own jsFiles
  // (add/rename/drop — a file removed from jsFiles is simply not in the
  // next mapped list), and re-imports whichever file is now active if its
  // code has changed since it was last synced. Runs whenever a new file is
  // added, the active file is switched (even without leaving this tab), or
  // this tab is first visited — not just on tab-visit like before.
  useEffect(() => {
    if (!tabVisitCount) return

    setProject(p => {
      const files = jsFiles.map(jf => {
        const existing = p.files.find(pf => pf.id === jf.id)
        return existing && existing.name === jf.name ? existing : { id: jf.id, name: jf.name, blocks: existing?.blocks ?? [] }
      })
      const sameFiles = files.length === p.files.length && files.every((f, i) => f === p.files[i])
      if (sameFiles && p.activeFileId === activeJsFileId) return p
      return normalizeProject({ ...p, files, activeFileId: activeJsFileId })
    })

    const activeCode = (jsFiles.find(jf => jf.id === activeJsFileId)?.code ?? '').trim()
    const lastCode = (lastImportedCodeRef.current.get(activeJsFileId) ?? '').trim()
    if (activeCode === lastCode) return

    if (!activeCode) {
      // JS was cleared — wipe this file's canvas so it doesn't show stale blocks
      lastImportedCodeRef.current.delete(activeJsFileId)
      setProject(p => normalizeProject({
        ...p,
        files: p.files.map(f => f.id === activeJsFileId ? { ...f, blocks: [] } : f),
      }))
      setSelectedBlockId(null)
      return
    }
    importFromJs(activeCode, activeJsFileId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabVisitCount, activeJsFileId, jsFiles])

  return (
    <div className={styles.root}>
      <div className={styles.guide}>Visual JS · {file?.name}<br />Choose a block, fill its fields, then Run in the page preview. Changes update this file.</div>
      {preservedSource && <p className={styles.guide}>This syntax is kept as an editable code block to preserve its behavior and comments.</p>}
      <div className={styles.twoPane}>

        {/* ── Left: Block palette ── */}
        <div className={styles.palette}>
          <BlockPalette
            query={query}
            onQueryChange={setQuery}
            onAddBlock={addBlock}
            classNames={BLOCK_EDITOR_CLASSNAMES}
          />
        </div>

        {/* ── Right: Program ── */}
        <div className={styles.program}>
          <BlockProgram
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelect={id => setSelectedBlockId(prev => prev === id ? null : id)}
            onDelete={deleteBlock}
            onMove={(id, dir) => commit(bs => moveBlock(bs, id, dir))}
            onAddChild={addBlock}
            onUpdateField={updateField}
            onUpdateFields={updateFields}
            domHints={domHints}
            classHints={classHints}
            variableHints={variableHints}
            classNames={BLOCK_EDITOR_CLASSNAMES}
            headerActions={activeJsCode.trim() ? (
              <button
                type="button"
                className={`${styles.importBtn} ${importFlash ? styles.importBtnFlash : ''}`}
                title="Convert the JavaScript file to visual blocks (replaces current blocks)"
                onClick={() => importFromJs(activeJsCode, activeJsFileId)}
              >
                ← Import from JS
              </button>
            ) : undefined}
          />
        </div>

      </div>
      <details className={styles.sourcePreview}><summary>See generated JavaScript</summary><pre>{generated.code || '// No blocks in this file.'}</pre></details>
    </div>
  )
}
