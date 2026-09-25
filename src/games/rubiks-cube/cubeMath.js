// ─── Solved state: 54 stickers ───────────────────────────────────────────────
// Faces: U=0..8, R=9..17, F=18..26, D=27..35, L=36..44, B=45..53
function solvedState() {
  const s = new Array(54)
  const faces = ['U','R','F','D','L','B']
  faces.forEach((f, fi) => {
    for (let i = 0; i < 9; i++) s[fi * 9 + i] = f
  })
  return s
}

// ─── Rotation-matrix move algorithm ──────────────────────────────────────────
// Each function gives the new [x,y,z] after a CW rotation of that face (viewed from outside).
const FACE_ROT = {
  U: (x, y, z) => [-z, y, x],  
  D: (x, y, z) => [z, y, -x],  
  R: (x, y, z) => [x, z, -y],  
  L: (x, y, z) => [x, -z, y],  
  F: (x, y, z) => [ y,-x,  z],  
  B: (x, y, z) => [-y, x,  z],  
}

const FACE_LAYER_FN = {
  U: (_x, y, _z) => y ===  1,
  D: (_x, y, _z) => y === -1,
  R: (x, _y, _z) => x ===  1,
  L: (x, _y, _z) => x === -1,
  F: (_x, _y, z) => z ===  1,
  B: (_x, _y, z) => z === -1,
}

function normalToFaceName(x, y, z) {
  if (y ===  1) return 'U'
  if (y === -1) return 'D'
  if (x ===  1) return 'R'
  if (x === -1) return 'L'
  if (z ===  1) return 'F'
  return 'B'
}

function applyFaceMove(state, face) {
  const rot = FACE_ROT[face]
  const inLayer = FACE_LAYER_FN[face]
  const next = [...state]
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        if (!inLayer(x, y, z)) continue
        const [nx, ny, nz] = rot(x, y, z)
        const normals = []
        if (y ===  1) normals.push([ 0,  1,  0, 'U'])
        if (y === -1) normals.push([ 0, -1,  0, 'D'])
        if (x ===  1) normals.push([ 1,  0,  0, 'R'])
        if (x === -1) normals.push([-1,  0,  0, 'L'])
        if (z ===  1) normals.push([ 0,  0,  1, 'F'])
        if (z === -1) normals.push([ 0,  0, -1, 'B'])
        for (const [fn_x, fn_y, fn_z, fdir] of normals) {
          const [rn_x, rn_y, rn_z] = rot(fn_x, fn_y, fn_z)
          const newFdir = normalToFaceName(rn_x, rn_y, rn_z)
          const srcIdx = getStickerIndex(x, y, z, fdir)
          const dstIdx = getStickerIndex(nx, ny, nz, newFdir)
          if (srcIdx >= 0 && dstIdx >= 0) next[dstIdx] = state[srcIdx]
        }
      }
    }
  }
  return next
}

// ─── Move application ────────────────────────────────────────────────────────

function applyMove(state, moveName) {
  const face = moveName[0]
  const isDouble = moveName.endsWith('2')
  const isInverse = moveName.endsWith("'")
  if (isDouble)   return applyFaceMove(applyFaceMove(state, face), face)
  if (isInverse)  return applyFaceMove(applyFaceMove(applyFaceMove(state, face), face), face)
  return applyFaceMove(state, face)
}

// Derive permutation cycles from a move (for the math panel display)
function getMoveCycles(moveName) {
  const identity = Array.from({ length: 54 }, (_, i) => i)
  const after = applyMove(identity, moveName)
  // after[dst] = src  →  forward map: src → dst
  const fwd = new Array(54)
  for (let dst = 0; dst < 54; dst++) fwd[after[dst]] = dst
  const visited = new Array(54).fill(false)
  const cycles = []
  for (let i = 0; i < 54; i++) {
    if (visited[i] || fwd[i] === i) { visited[i] = true; continue }
    const cycle = [i]
    let j = fwd[i]
    while (j !== i) {
      visited[j] = true
      cycle.push(j)
      j = fwd[j]
    }
    visited[i] = true
    cycles.push(cycle)
  }
  return cycles
}

// Check if state is solved
function isSolved(state) {
  for (let f = 0; f < 6; f++) {
    const color = state[f * 9]
    for (let i = 1; i < 9; i++) {
      if (state[f * 9 + i] !== color) return false
    }
  }
  return true
}

// ─── Cubie building ──────────────────────────────────────────────────────────

// Get sticker index for a given cubie face
function getStickerIndex(x, y, z, face) {
  // face is one of 'U','D','R','L','F','B'
  // Returns index into 54-element state array
  const col = (v) => v + 1 // -1→0, 0→1, 1→2
  switch (face) {
    case 'U': {
      // U[row][col]: row 0=back(z=-1), row 2=front(z=+1); col 0=left(x=-1)
      const row = col(z) // z=-1→row 0, z=+1→row 2
      const c = col(x)
      return row * 3 + c
    }
    case 'D': {
      // D[row][col]: row 0=front(z=+1), row 2=back(z=-1); col 0=left(x=-1)
      const row = 2 - col(z) // z=+1→row 0, z=-1→row 2
      const c = col(x)
      return 27 + row * 3 + c
    }
    case 'R': {
      // R[row][col]: row 0=top(y=+1); col 0=front(z=+1), col 2=back(z=-1)
      const row = 2 - col(y) // y=+1→row 0
      const c = 2 - col(z) // z=+1→col 0, z=-1→col 2
      return 9 + row * 3 + c
    }
    case 'L': {
      // L[row][col]: row 0=top(y=+1); col 0=back(z=-1), col 2=front(z=+1)
      const row = 2 - col(y) // y=+1→row 0
      const c = col(z) // z=-1→col 0, z=+1→col 2... wait: col 0=back(z=-1), so z=-1→c=0
      // col(z) returns z+1: z=-1→0, z=+1→2 ✓
      return 36 + row * 3 + c
    }
    case 'F': {
      // F[row][col]: row 0=top(y=+1); col 0=left(x=-1)
      const row = 2 - col(y)
      const c = col(x)
      return 18 + row * 3 + c
    }
    case 'B': {
      // B[row][col]: row 0=top(y=+1); col 0=right(x=+1), col 2=left(x=-1)
      const row = 2 - col(y)
      const c = 2 - col(x) // x=+1→col 0, x=-1→col 2
      return 45 + row * 3 + c
    }
    default: return -1
  }
}


export { solvedState, applyMove, getMoveCycles, isSolved, getStickerIndex }
