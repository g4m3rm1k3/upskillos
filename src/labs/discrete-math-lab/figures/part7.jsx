// Interactive figures for Part 7: Graph Theory & Networks
import { useState } from 'react'
import { C, Slider, Working } from './ui.jsx'
import {
  handshakeEdges, completeEdges, bipartiteEdges, hypercubeVertices, hypercubeEdges,
  matPow, eulerStatus, treeEdges, cayleyTrees, kruskalMst,
  planarFaces, planarMaxEdges, bipartitePlanarMaxEdges, cycleChromatic, wheelChromatic,
} from '../engine/discrete.js'

export function GraphHandshakeFig() {
  const [n, setN] = useState(5)
  const [edges, setEdges] = useState([[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]])
  const hasEdge = (u, v) => edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u))
  const toggleEdge = (u, v) => {
    if (u === v) return
    setEdges(es => (hasEdge(u, v) ? es.filter(([a, b]) => !((a === u && b === v) || (a === v && b === u))) : [...es, [Math.min(u, v), Math.max(u, v)]]))
  }

  const activeEdges = edges.filter(([u, v]) => u < n && v < n)
  const degrees = Array.from({ length: n }, (_, u) => activeEdges.filter(([a, b]) => a === u || b === u).length)
  const degSum = degrees.reduce((s, d) => s + d, 0)
  const oddCount = degrees.filter(d => d % 2 === 1).length

  return <div className="qm-fig-body">
    <Slider label="Vertices |V| = n" value={n} min={3} max={6} step={1} onChange={setN} />
    <div className="qm-buttons">
      {Array.from({ length: n }, (_, u) =>
        Array.from({ length: n - u - 1 }, (__, k) => {
          const v = u + k + 1
          const on = hasEdge(u, v)
          return <button key={`${u}-${v}`} className={on ? 'qm-primary' : ''} onClick={() => toggleEdge(u, v)}>
            {`{v${u + 1}, v${v + 1}}`}
          </button>
        }),
      )}
    </div>
    <Working rows={[
      ['Vertex degrees deg(vᵢ)', degrees.map((d, i) => `deg(v${i + 1})=${d}`).join(', '), `Odd-degree vertices: ${oddCount} (always even!)`],
      ['Handshaking Lemma ∑ deg(v) = 2|E|', `∑ deg = ${degSum}`, `2 × |E| = 2 × ${activeEdges.length} = ${2 * activeEdges.length} (${handshakeEdges(degrees)} edges)`],
      ['Special graph benchmarks', `K_${n} has ${completeEdges(n)} edges`, `Q₃ has ${hypercubeVertices(3)} vertices, ${hypercubeEdges(3)} edges`],
    ]} />
  </div>
}

export function BipartiteWalksFig() {
  const [graphKind, setGraphKind] = useState('c4')
  const [k, setK] = useState(2)
  const graphs = {
    c4: {
      label: '4-Cycle C₄ (Bipartite: 2-colorable)',
      bipartite: true,
      A: [
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
      ],
    },
    k3: {
      label: 'Triangle K₃ (Odd cycle C₃: NOT bipartite)',
      bipartite: false,
      A: [
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
      ],
    },
    paw: {
      label: '4-Vertex Paw Graph (Triangle + Leaf)',
      bipartite: false,
      A: [
        [0, 1, 1, 0],
        [1, 0, 1, 0],
        [1, 1, 0, 1],
        [0, 0, 1, 0],
      ],
    },
  }
  const cur = graphs[graphKind]
  const Ak = matPow(cur.A, k)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {Object.entries(graphs).map(([key, g]) => (
        <button key={key} className={graphKind === key ? 'qm-primary' : ''} onClick={() => setGraphKind(key)}>{g.label}</button>
      ))}
    </div>
    <Slider label="Walk length k (for A^k)" value={k} min={1} max={4} step={1} onChange={setK} />
    <table className="qm-mathcode dm-matrix-table">
      <thead>
        <tr>
          <th>(A^{k})ᵢⱼ</th>
          {cur.A.map((_, j) => <th key={j}>v{j + 1}</th>)}
        </tr>
      </thead>
      <tbody>
        {Ak.map((row, i) => (
          <tr key={i}>
            <td><b>v{i + 1}</b></td>
            {row.map((val, j) => <td key={j} className="mono"><b>{val}</b></td>)}
          </tr>
        ))}
      </tbody>
    </table>
    <Working rows={[
      ['Bipartite check (no odd cycles)', cur.label, cur.bipartite ? 'Bipartite ✓ (2-colorable)' : 'Not Bipartite ✗ (contains C₃)'],
      [`Diagonal (A^${k})₁₁ (closed walks of length ${k})`, `(A^${k})₁₁ = ${Ak[0][0]}`, `Complete bipartite benchmark: |E(K_{3,4})| = ${bipartiteEdges(3, 4)}`],
    ]} />
  </div>
}

export function EulerBridgeFig() {
  const [preset, setPreset] = useState('konigsberg')
  const configs = {
    konigsberg: {
      label: 'Seven Bridges of Königsberg (degrees 5, 3, 3, 3)',
      degrees: [5, 3, 3, 3],
      desc: 'All 4 landmasses have odd degree — neither an Eulerian circuit nor an Eulerian trail exists!',
    },
    oneAdded: {
      label: 'Königsberg + 1 Bridge (degrees 6, 4, 3, 3)',
      degrees: [6, 4, 3, 3],
      desc: 'Exactly 2 vertices have odd degree — an Eulerian trail exists starting at one odd bank and ending at the other!',
    },
    twoAdded: {
      label: 'Königsberg + 2 Opposite Bridges (degrees 6, 4, 4, 4)',
      degrees: [6, 4, 4, 4],
      desc: '0 odd-degree vertices — a full closed Eulerian circuit exists!',
    },
  }
  const cur = configs[preset]
  const status = eulerStatus(cur.degrees)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {Object.entries(configs).map(([k, cfg]) => (
        <button key={k} className={preset === k ? 'qm-primary' : ''} onClick={() => setPreset(k)}>{cfg.label}</button>
      ))}
    </div>
    <Working rows={[
      ['Vertex degrees', cur.degrees.join(', '), `${cur.degrees.filter(d => d % 2 === 1).length} odd-degree vertices`],
      ['Euler’s Theorem verdict', status === 'circuit' ? 'Eulerian Circuit ✓ (0 odd)' : status === 'trail' ? 'Eulerian Trail Only ✓ (2 odd)' : 'Impossible ✗ (>2 odd)', cur.desc],
    ]} />
  </div>
}

const SAMPLE_WEIGHTED_EDGES = [
  { u: 0, v: 1, w: 2, name: 'AB' },
  { u: 1, v: 2, w: 3, name: 'BC' },
  { u: 0, v: 3, w: 4, name: 'AD' },
  { u: 1, v: 3, w: 5, name: 'BD (cycle!)' },
  { u: 2, v: 4, w: 1, name: 'CE' },
  { u: 3, v: 4, w: 6, name: 'DE (cycle!)' },
  { u: 1, v: 4, w: 7, name: 'BE (cycle!)' },
]

export function TreeMstFig() {
  const [nCayley, setNCayley] = useState(4)
  const mst = kruskalMst(5, SAMPLE_WEIGHTED_EDGES)

  return <div className="qm-fig-body">
    <Slider label="Labeled vertices n (for Cayley’s n^(n−2))" value={nCayley} min={2} max={7} step={1} onChange={setNCayley} />
    <Working rows={[
      [`Tree on n = ${nCayley} vertices`, `Edges = n − 1 = ${treeEdges(nCayley)}`, `Cayley labeled trees = ${nCayley}^(${nCayley}−2) = ${cayleyTrees(nCayley)}`],
      ['Kruskal’s MST on 5-vertex network', `Sorted edges: ${SAMPLE_WEIGHTED_EDGES.slice().sort((a, b) => a.w - b.w).map(e => `${e.name}:${e.w}`).join(', ')}`, `Chosen 4 edges: ${mst.chosen.map(e => `${e.name}(${e.w})`).join(' + ')} = weight ${mst.totalWeight}`],
    ]} />
  </div>
}

export function PlanarColoringFig() {
  const [v, setV] = useState(5)
  const [e, setE] = useState(8)
  const maxSimple = planarMaxEdges(v)
  const maxBip = bipartitePlanarMaxEdges(v)
  const faces = planarFaces(v, Math.min(e, maxSimple))

  return <div className="qm-fig-body">
    <Slider label="Vertices |V| = v" value={v} min={3} max={10} step={1} onChange={setV} />
    <Slider label="Edges |E| = e" value={e} min={v - 1} max={completeEdges(v)} step={1} onChange={setE} />
    <Working rows={[
      ['Euler’s Planar Formula v − e + f = 2', `For v = ${v}, e = ${Math.min(e, maxSimple)}`, `Faces f = 2 − ${v} + ${Math.min(e, maxSimple)} = ${faces} (including outer face)`],
      ['Planarity bounds', `General: e ≤ 3v − 6 = ${maxSimple} (${e <= maxSimple ? 'Passes ✓' : 'Violates ✗ — Non-planar!'})`, `Triangle-free: e ≤ 2v − 4 = ${maxBip}`],
      ['Chromatic numbers χ(G)', `χ(C_${v}) = ${cycleChromatic(v)} (${v % 2 === 0 ? 'even cycle' : 'odd cycle'})`, `χ(W_${v}) = ${wheelChromatic(v)}, χ(K_${v}) = ${v}, Planar max ≤ 4`],
    ]} />
  </div>
}
