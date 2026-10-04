/**
 * HeapGraph — semantic heap visualizer.
 * No force simulation. Each pattern gets a layout that matches its structure:
 *   Arrays          → horizontal cell grid (sort/array algorithms)
 *   Linked-list     → horizontal card chain with arrows
 *   Everything else → scrollable card list with inline reference badges
 */
import type { HeapSnapshot, HeapObjectEntry, HeapDelta } from '../types'
import { useCodeLensTheme } from '../ThemeContext'
import type { CodeLensUiPalette } from '../theme'
import { heapObjectLabel } from './heapSnapshot'

function typeColor(t: string, ui: CodeLensUiPalette): string {
  const TYPE_COLOR: Record<string, string> = {
    Object: ui.accent, Array: ui.cyan, Node: ui.green, LinkedList: ui.purple,
    Map: ui.amber, Set: ui.pink, prototype: ui.textFaint,
  }
  return TYPE_COLOR[t] ?? ui.textDim
}

// ── Top-level dispatcher ───────────────────────────────────────────────────────

interface HeapGraphProps {
  snapshot: HeapSnapshot | null
  heapDelta?: HeapDelta[]
}

export default function HeapGraph({ snapshot, heapDelta }: HeapGraphProps) {
  const { theme: { ui } } = useCodeLensTheme()

  if (!snapshot || snapshot.objects.size === 0) return <EmptyState ui={ui} />

  const objects = [...snapshot.objects.values()]
  const isSequence = (o: HeapObjectEntry) => ['Array', 'list', 'tuple'].includes(o.type)
  const arrays  = objects.filter(isSequence)
  const others  = objects.filter(o => !isSequence(o))

  const mutatedProps = buildMutatedProps(heapDelta)

  // ── Check for SICP-style pair structures before falling into flat grid ─────
  // Check tree first (branching pairs), then chain (linear list).
  const pairs = arrays.filter(o => o.type === 'Array')
  const sicpTreeRoot  = pairs.length >= 3 ? detectSicpTree(pairs) : null
  const arraySiciChain = !sicpTreeRoot && pairs.length >= 2 ? detectSicpChain(pairs) : null

  // ── SICP pair tree → tree diagram ─────────────────────────────────────────
  if (sicpTreeRoot != null) {
    return (
      <div style={{ padding: '10px 12px', overflow: 'auto', height: '100%' }}>
        <div style={{ marginBottom: 6, fontSize: 10, color: ui.purple,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em' }}>
          PAIR TREE — {arrays.length} node{arrays.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'inline-block' }}>
          <PairTreeNode id={sicpTreeRoot} snapshot={snapshot} ui={ui} />
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: ui.textFaint,
          fontFamily: 'JetBrains Mono, monospace' }}>
          Each box: [head | tail] — • = pointer to child node, / = null
        </div>
      </div>
    )
  }

  // ── SICP list chain → linked-list renderer ────────────────────────────────
  if (arraySiciChain) {
    const chainSet   = new Set(arraySiciChain)
    const standalone = arrays.filter(o => !chainSet.has(o.id))
    const chainNodes = arraySiciChain.map(id => snapshot.objects.get(id)).filter((o): o is HeapObjectEntry => !!o)
    return (
      <div style={{ padding: '10px 12px', overflow: 'auto', height: '100%' }}>
        {standalone.length > 0 && standalone.map(arr => (
          <ArrayCells key={arr.id} obj={arr} ui={ui}
            isNew={snapshot.lastCreated.has(arr.id)}
            mutated={mutatedProps[arr.id] ?? new Set()}
          />
        ))}
        <div style={{ marginBottom: 6, fontSize: 10, color: ui.green,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em' }}>
          LIST CHAIN — {chainNodes.length} pair{chainNodes.length !== 1 ? 's' : ''}
        </div>
        <PairChain nodes={chainNodes} ui={ui}
          lastCreated={snapshot.lastCreated} lastMutated={snapshot.lastMutated}
        />
      </div>
    )
  }

  // ── Pure flat arrays (no inter-references) → cell grid ────────────────────
  if (arrays.length > 0 && others.length === 0) {
    return (
      <div style={{ padding: '10px 12px', overflow: 'auto', height: '100%' }}>
        {arrays.map(arr => (
          <ArrayCells
            key={arr.id}
            obj={arr}
            ui={ui}
            isNew={snapshot.lastCreated.has(arr.id)}
            mutated={mutatedProps[arr.id] ?? new Set()}
          />
        ))}
      </div>
    )
  }

  // ── Detect linked-list chain in non-array objects ──────────────────────────
  const chain = detectChain(others, snapshot)
  const chainSet = chain ? new Set(chain) : null
  const containers = chain ? others.filter(o => !chainSet!.has(o.id)) : []
  const chainNodes = chain ? chain.map(id => snapshot.objects.get(id)).filter((o): o is HeapObjectEntry => !!o) : []

  return (
    <div style={{ padding: '10px 12px', overflow: 'auto', height: '100%' }}>
      {/* Flat arrays alongside objects */}
      {arrays.map(arr => (
        <ArrayCells key={arr.id} obj={arr} ui={ui}
          isNew={snapshot.lastCreated.has(arr.id)}
          mutated={mutatedProps[arr.id] ?? new Set()}
        />
      ))}

      {/* Container objects (e.g. LinkedList wrapper) */}
      {containers.map(obj => (
        <ObjectCard key={obj.id} obj={obj} snapshot={snapshot} ui={ui}
          isNew={snapshot.lastCreated.has(obj.id)}
          isMutated={snapshot.lastMutated.has(obj.id)}
          mutatedProps={mutatedProps[obj.id] ?? new Set()}
        />
      ))}

      {/* Horizontal chain */}
      {chain && (
        <>
          {containers.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              fontSize: 10, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace',
            }}>
              <div style={{ height: 1, width: 24, background: ui.border }} />
              chain of {chainNodes.length} {chainNodes[0]?.type ?? 'nodes'}
              <div style={{ flex: 1, height: 1, background: ui.border }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 6 }}>
            {chainNodes.map((obj) => (
              <div key={obj.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <ObjectCard obj={obj} snapshot={snapshot} ui={ui}
                  isNew={snapshot.lastCreated.has(obj.id)}
                  isMutated={snapshot.lastMutated.has(obj.id)}
                  mutatedProps={mutatedProps[obj.id] ?? new Set()}
                  compact
                />
                <ChainArrow ui={ui} />
              </div>
            ))}
            <span style={{
              fontSize: 12, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace',
              padding: '0 8px', flexShrink: 0,
            }}>null</span>
          </div>
        </>
      )}

      {/* Card list for non-chain objects */}
      {!chain && others.map(obj => (
        <ObjectCard key={obj.id} obj={obj} snapshot={snapshot} ui={ui}
          isNew={snapshot.lastCreated.has(obj.id)}
          isMutated={snapshot.lastMutated.has(obj.id)}
          mutatedProps={mutatedProps[obj.id] ?? new Set()}
        />
      ))}
    </div>
  )
}

// ── Object card (used for both list and chain) ─────────────────────────────────

interface ObjectCardProps {
  obj: HeapObjectEntry
  snapshot: HeapSnapshot
  isNew: boolean
  isMutated: boolean
  mutatedProps: Set<string>
  compact?: boolean
  ui: CodeLensUiPalette
}

function ObjectCard({ obj, snapshot, isNew, isMutated, mutatedProps, compact, ui }: ObjectCardProps) {
  const color = typeColor(obj.type, ui)
  const prims: { key: string; val: unknown }[] = []
  const refs: { key: string; label: string; id: number }[] = []

  for (const [k, v] of obj.properties) {
    if (obj.type === 'Array' && k === 'length') continue
    if (isRef(v)) {
      const target = snapshot.objects.get(v.$ref)
      refs.push({ key: k, label: target ? heapObjectLabel(target) : `#${v.$ref}`, id: v.$ref })
    } else {
      prims.push({ key: k, val: v })
    }
  }

  const borderColor = isNew ? ui.green : isMutated ? ui.amber : color + '44'
  const glow = (isNew || isMutated)
    ? `0 0 12px ${isNew ? ui.green + '44' : ui.amber + '44'}`
    : 'none'

  return (
    <div style={{
      background: ui.panelBg2,
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      marginBottom: compact ? 0 : 8,
      minWidth: compact ? 130 : undefined,
      flexShrink: 0,
      boxShadow: glow,
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{
        background: color + '1a',
        padding: '5px 10px',
        borderRadius: '7px 7px 0 0',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
          {heapObjectLabel(obj)}
        </span>
        <span style={{ color: ui.borderStrong, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
          {obj.names?.length ? `${obj.type} #${obj.id}` : ''}
        </span>
        {isNew && (
          <span style={{
            marginLeft: 'auto', fontSize: 9, padding: '1px 5px', borderRadius: 99,
            background: ui.greenDeep + '22', color: ui.green, border: `1px solid ${ui.greenDeep}44`,
          }}>new</span>
        )}
        {isMutated && !isNew && (
          <span style={{
            marginLeft: 'auto', fontSize: 9, padding: '1px 5px', borderRadius: 99,
            background: ui.amberDeep + '22', color: ui.amberSoft, border: `1px solid ${ui.amberDeep}44`,
          }}>changed</span>
        )}
      </div>

      {/* Body */}
      {(prims.length > 0 || refs.length > 0) && (
        <div style={{ padding: '5px 10px 7px' }}>
          {prims.map(({ key, val }) => {
            const highlighted = mutatedProps.has(key)
            return (
              <div key={key} style={{
                display: 'flex', gap: 6, alignItems: 'baseline',
                fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                marginBottom: 2,
                background: highlighted ? ui.amberDeep + '1a' : 'transparent',
                borderRadius: 3, padding: highlighted ? '1px 3px' : '1px 0',
              }}>
                <span style={{ color: ui.cyan, flexShrink: 0 }}>{key}:</span>
                <span style={{ color: valColor(val, ui) }}>{fmtVal(val)}</span>
              </div>
            )
          })}
          {refs.map(({ key, label }) => (
            <div key={key} style={{
              display: 'flex', gap: 6, alignItems: 'center',
              fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 2,
            }}>
              <span style={{ color: ui.cyan, flexShrink: 0 }}>{key}:</span>
              <span style={{
                color: ui.accent, background: ui.accentBg,
                padding: '1px 6px', borderRadius: 4, fontSize: 10,
              }}>→ {label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChainArrow({ ui }: { ui: CodeLensUiPalette }) {
  return (
    <svg width="28" height="24" style={{ flexShrink: 0, overflow: 'visible' }}>
      <line x1="2" y1="12" x2="22" y2="12" stroke={ui.accentSolid} strokeWidth="1.5" />
      <polygon points="22,8 28,12 22,16" fill={ui.accentSolid} />
    </svg>
  )
}

// ── Array cells (sort / array-heavy algorithms) ────────────────────────────────

interface ArrayCellsProps {
  obj: HeapObjectEntry
  isNew: boolean
  mutated: Set<string>
  ui: CodeLensUiPalette
}

function ArrayCells({ obj, isNew, mutated, ui }: ArrayCellsProps) {
  const elems: unknown[] = []
  for (const [k, v] of obj.properties) {
    const idx = parseInt(k, 10)
    if (!isNaN(idx)) elems[idx] = v
  }
  const len   = elems.length
  const cellW = len > 30 ? 24 : len > 15 ? 32 : len > 8 ? 42 : 52
  const cellH = len > 30 ? 38 : 52

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: ui.cyan, fontWeight: 700 }}>
          {heapObjectLabel(obj)}
        </span>
        {obj.names?.length ? <span style={{ fontSize: 10, color: ui.textFaint }}>{obj.type} #{obj.id}</span> : null}
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 99,
          background: ui.border, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace',
        }}>{len} elements</span>
        {isNew && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 99,
            background: ui.greenDeep + '22', color: ui.green, border: `1px solid ${ui.greenDeep}`,
          }}>new</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {elems.map((v, i) => {
          const hit = mutated.has(String(i))
          return (
            <div key={i} title={`[${i}] = ${fmtVal(v)}`} style={{
              width: cellW, height: cellH,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 5, cursor: 'default',
              background: hit ? ui.amberDeep + '33' : ui.panelBg,
              border: `1px solid ${hit ? ui.amber : ui.border}`,
              boxShadow: hit ? `0 0 8px ${ui.amber}44` : 'none',
              transition: 'all 0.15s',
            }}>
              <span style={{
                fontSize: cellW < 32 ? 11 : 13, fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600, color: hit ? ui.amberSoft : ui.green, lineHeight: 1,
              }}>{v === undefined ? '·' : fmtVal(v)}</span>
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: ui.borderStrong, marginTop: 2, lineHeight: 1 }}>
                {i}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ ui }: { ui: CodeLensUiPalette }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', minHeight: 180, padding: 24, gap: 10, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>
        NO HEAP ALLOCATIONS
      </div>
      <div style={{ fontSize: 12, color: ui.textFaint, lineHeight: 1.7, maxWidth: 260 }}>
        This code works entirely with primitives — numbers, strings, booleans.
        Primitives live on the <span style={{ color: ui.accent }}>call stack</span>, not the heap.
      </div>
      <div style={{
        fontSize: 11, color: ui.borderStrong, padding: '6px 12px',
        borderRadius: 6, background: ui.panelBg, border: `1px solid ${ui.border}`,
      }}>
        → Switch to <span style={{ color: ui.accent }}>Scope</span> to see where variables live
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isRef(v: unknown): v is { $ref: number } { return v !== null && typeof v === 'object' && '$ref' in v }

function buildMutatedProps(heapDelta: HeapDelta[] | undefined): Record<number, Set<string>> {
  const map: Record<number, Set<string>> = {}
  for (const d of heapDelta ?? []) {
    if (d.op === 'mutate') {
      if (!map[d.objectId]) map[d.objectId] = new Set()
      map[d.objectId].add(String(d.property))
    }
  }
  return map
}

// ── SICP pair tree renderer ───────────────────────────────────────────────────
// Renders nested pairs as a tree diagram when they branch (head or tail is also a pair).
// Uses recursive divs with connecting lines.

interface PairTreeNodeProps {
  id: number
  snapshot: HeapSnapshot
  depth?: number
  visited?: Set<number>
  ui: CodeLensUiPalette
}

function PairTreeNode({ id, snapshot, depth = 0, visited = new Set(), ui }: PairTreeNodeProps) {
  if (visited.has(id)) return <span style={{ color: ui.red, fontSize: 10 }}>⟳</span>
  visited = new Set([...visited, id])

  const obj = snapshot.objects.get(id)
  if (!obj) return null

  const head = obj.properties.get('0')
  const tail = obj.properties.get('1')

  const isHeadRef = isRef(head) && snapshot.objects.has(head.$ref)
  const isTailRef = isRef(tail) && snapshot.objects.has(tail.$ref)
  const isTailNull = tail === null

  const headStr = isHeadRef ? null
    : head === null ? 'nil' : typeof head === 'number' ? String(head)
    : typeof head === 'string' ? `"${head}"` : String(head)

  const headColor = isHeadRef ? ui.accent
    : typeof head === 'number' ? ui.green : ui.amber

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* This node */}
      <div style={{
        display: 'flex', border: `1px solid ${ui.accent}44`, borderRadius: 6,
        background: ui.panelBg2, overflow: 'hidden', fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <div style={{ padding: '4px 8px', borderRight: `1px solid ${ui.accent}44`,
          color: headColor, minWidth: 28, textAlign: 'center' }}>
          {isHeadRef ? '•' : headStr}
        </div>
        <div style={{ padding: '4px 8px', color: isTailNull ? ui.textFaint : ui.accent,
          minWidth: 28, textAlign: 'center' }}>
          {isTailNull ? '/' : '•'}
        </div>
      </div>

      {/* Children */}
      {(isHeadRef || isTailRef) && (
        <div style={{ display: 'flex', gap: 20, marginTop: 0, position: 'relative' }}>
          {/* Connector line */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', width: 1,
            height: 14, background: `${ui.accent}44`, transform: 'translateX(-50%)',
          }} />
          {isHeadRef && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 1, height: 14, background: `${ui.accent}44` }} />
              <PairTreeNode id={(head as { $ref: number }).$ref} snapshot={snapshot} depth={depth + 1} visited={visited} ui={ui} />
            </div>
          )}
          {isTailRef && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 1, height: 14, background: `${ui.accent}44` }} />
              <PairTreeNode id={(tail as { $ref: number }).$ref} snapshot={snapshot} depth={depth + 1} visited={visited} ui={ui} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Detect if arrays form a TREE structure (both head AND tail can point to arrays)
// Returns the root node ID if a tree with branching is detected.
function detectSicpTree(arrays: HeapObjectEntry[]): number | null {
  if (arrays.length < 3) return null

  // Count how many times each array is referenced by another array
  const refCounts = new Map<number, number>()
  const pairIds   = new Set(arrays.map(a => a.id))

  for (const arr of arrays) {
    const len = parseInt(String(arr.properties.get('length') ?? 0), 10)
    if (len !== 2) continue
    for (const prop of ['0', '1']) {
      const v = arr.properties.get(prop)
      if (isRef(v) && pairIds.has(v.$ref)) {
        refCounts.set(v.$ref, (refCounts.get(v.$ref) ?? 0) + 1)
      }
    }
  }
  if (refCounts.size === 0) return null

  // Check for branching: any array has BOTH head and tail pointing to arrays
  const hasBranching = arrays.some(arr => {
    const h = arr.properties.get('0')
    const t = arr.properties.get('1')
    const hIsRef = isRef(h) && pairIds.has(h.$ref)
    const tIsRef = isRef(t) && pairIds.has(t.$ref)
    return hIsRef && tIsRef
  })
  if (!hasBranching) return null

  // Root = array not referenced by any other array in the set
  for (const arr of arrays) {
    if (!refCounts.has(arr.id)) return arr.id
  }
  return null
}

// ── SICP pair chain renderer ──────────────────────────────────────────────────
// Renders list(1,2,3) = [1,[2,[3,null]]] as a horizontal pair chain.
// Each node shows: [ head | tail→ ]

interface PairChainProps {
  nodes: HeapObjectEntry[]
  lastCreated: Set<number>
  lastMutated: Set<number>
  ui: CodeLensUiPalette
}

function PairChain({ nodes, lastCreated, lastMutated, ui }: PairChainProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 8, flexWrap: 'wrap', gap: '0 0' }}>
      {nodes.map((obj, i) => {
        const headVal = obj.properties.get('0')
        const tailVal = obj.properties.get('1')
        const isNew     = lastCreated.has(obj.id)
        const isMutated = lastMutated.has(obj.id)
        const borderColor = isNew ? ui.green : isMutated ? ui.amber : `${ui.accent}44`

        // Render the head value
        const headStr = headVal === null ? 'null'
          : headVal === undefined ? 'undef'
          : isRef(headVal)
            ? `#${headVal.$ref}`
            : String(headVal)

        const headColor = headVal === null ? ui.textFaint
          : typeof headVal === 'number' ? ui.green
          : typeof headVal === 'string' ? ui.amber
          : typeof headVal === 'boolean' ? ui.pink
          : ui.accent

        return (
          <div key={obj.id} style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
            {/* Pair box: [ head | ↓ ] */}
            <div style={{
              display: 'flex', border: `1px solid ${borderColor}`, borderRadius: 6,
              background: ui.panelBg2, overflow: 'hidden', flexShrink: 0,
              boxShadow: isNew ? `0 0 8px ${ui.green}44` : isMutated ? `0 0 8px ${ui.amber}44` : 'none',
            }}>
              {/* Head cell */}
              <div style={{
                padding: '6px 10px', borderRight: `1px solid ${borderColor}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontSize: 8, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>
                  head
                </span>
                <span style={{
                  fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700, color: headColor,
                }}>
                  {headStr}
                </span>
              </div>
              {/* Tail cell — just shows →next or null */}
              <div style={{
                padding: '6px 8px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, minWidth: 36,
              }}>
                <span style={{ fontSize: 8, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>
                  tail
                </span>
                <span style={{ fontSize: 11, color: ui.accent, fontFamily: 'JetBrains Mono, monospace' }}>
                  {tailVal === null ? 'nil' : '→'}
                </span>
              </div>
            </div>
            {/* Arrow between pairs */}
            {i < nodes.length - 1 && (
              <svg width="24" height="44" style={{ flexShrink: 0, alignSelf: 'center' }}>
                <line x1="2" y1="22" x2="18" y2="22" stroke={ui.accent} strokeWidth="1.5" />
                <polygon points="18,18 24,22 18,26" fill={ui.accent} />
              </svg>
            )}
          </div>
        )
      })}
      {/* Terminal null */}
      <div style={{
        display: 'flex', alignItems: 'center', paddingLeft: 8,
        fontSize: 11, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace',
        fontStyle: 'italic',
      }}>
        null
      </div>
    </div>
  )
}

// ── Detect SICP-style pair chain ──────────────────────────────────────────────
// A SICP pair is [head, tail]. A list is a chain: [a,[b,[c,null]]].
// We detect this by checking: each 2-element array whose index-1 is a $ref
// to another 2-element array in the snapshot.
function detectSicpChain(arrays: HeapObjectEntry[]): number[] | null {
  // Only consider arrays with exactly 2 elements (pair structure)
  const pairs = arrays.filter(o => o.properties.get('length') === 2)
  if (pairs.length < 2) return null

  // Build a next-map: pairId → pairId via index 1
  const nextMap = new Map<number, number>()
  const pairIds = new Set(pairs.map(p => p.id))
  for (const p of pairs) {
    const tail = p.properties.get('1')
    if (isRef(tail) && pairIds.has(tail.$ref)) {
      nextMap.set(p.id, tail.$ref)
    }
  }
  if (nextMap.size === 0) return null

  // Find the head of the chain (not a target of any next pointer)
  const targets = new Set(nextMap.values())
  let head: number | null = null
  for (const [id] of nextMap) {
    if (!targets.has(id)) { head = id; break }
  }
  if (head === null) return null

  // Walk the chain
  const order: number[] = []
  let cur: number | null = head
  const seen = new Set<number>()
  while (cur !== null && !seen.has(cur)) {
    order.push(cur)
    seen.add(cur)
    cur = nextMap.get(cur) ?? null
  }

  // Require at least 2 linked pairs to treat as a list chain
  return order.length >= 2 ? order : null
}

function detectChain(objects: HeapObjectEntry[], snapshot: HeapSnapshot): number[] | null {
  if (objects.length < 2) return null

  // Find pairs where one object has a property pointing to another of the same type
  const nextMap = new Map<number, number>() // fromId → toId
  for (const obj of objects) {
    for (const [, v] of obj.properties) {
      if (isRef(v) && snapshot.objects.has(v.$ref)) {
        const target = snapshot.objects.get(v.$ref)!
        if (target.type === obj.type) { nextMap.set(obj.id, v.$ref); break }
      }
    }
  }
  if (nextMap.size === 0) return null

  // Find chain head: in nextMap but not a target of any nextMap entry
  const allTargets = new Set(nextMap.values())
  let head: number | null = null
  for (const [id] of nextMap) {
    if (!allTargets.has(id)) { head = id; break }
  }
  if (head === null) head = nextMap.keys().next().value ?? null

  // Walk the chain
  const order: number[] = []
  let cur: number | null = head
  const seen = new Set<number>()
  while (cur !== null && !seen.has(cur)) {
    order.push(cur)
    seen.add(cur)
    cur = nextMap.get(cur) ?? null
  }

  return order.length >= 2 ? order : null
}

function valColor(v: unknown, ui: CodeLensUiPalette): string {
  if (v === null || v === undefined) return ui.textFaint
  if (typeof v === 'number') return ui.green
  if (typeof v === 'string') return ui.amber
  if (typeof v === 'boolean') return ui.pink
  return ui.textDim
}

function fmtVal(v: unknown): string {
  if (v === null)      return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return `"${v.length > 18 ? v.slice(0, 18) + '…' : v}"`
  if (typeof v === 'object') {
    if ('$ref' in v) return `→ #${v.$ref}`
    if ('objectId' in v) return `→ #${v.objectId}`
    return '{…}'
  }
  return String(v)
}
