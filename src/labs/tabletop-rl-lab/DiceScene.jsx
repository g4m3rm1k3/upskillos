import { Component, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
const PIPS = {
  1: [[0, 0]], 2: [[-1, 1], [1, -1]], 3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]], 5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
}
const FACES = [[1, [0, .506, 0], [-Math.PI / 2, 0, 0]], [6, [0, -.506, 0], [Math.PI / 2, 0, 0]], [2, [0, 0, .506], [0, 0, 0]], [5, [0, 0, -.506], [0, Math.PI, 0]], [3, [.506, 0, 0], [0, Math.PI / 2, 0]], [4, [-.506, 0, 0], [0, -Math.PI / 2, 0]]]
const ROTATIONS = { 1: [0, 0, 0], 2: [-Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2], 5: [Math.PI / 2, 0, 0], 6: [Math.PI, 0, 0] }
function Die({ value, index, held, animated, rollId, onHold, disabled, reduced }) {
  const group = useRef(), body = useRef(), phase = useRef({ id: rollId, t: 2 })
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 4, .11), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ invalidate }, delta) => {
    if (!group.current) return
    if (phase.current.id !== rollId) phase.current = { id: rollId, t: animated && !reduced ? 0 : 2 }
    phase.current.t += delta
    const t = Math.min(1, phase.current.t / .95), ease = 1 - (1 - t) ** 3
    const x = (index - 2) * 1.48, z = held ? -1.55 : .55 + Math.sin(index * 2) * .25
    const bounce = t < 1 ? Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) * 2.5 : 0
    const targetX = x + (1 - ease) * Math.sin(index + t * 10) * .6
    const targetY = .65 + bounce + (held ? .1 : 0)
    group.current.position.x += (targetX - group.current.position.x) * Math.min(1, delta * 18)
    group.current.position.y = targetY
    group.current.position.z += (z - group.current.position.z) * Math.min(1, delta * 12)
    const rotation = ROTATIONS[value]
    body.current.rotation.set(rotation[0] + (1 - ease) * Math.PI * 6, rotation[1], rotation[2] + (1 - ease) * Math.PI * 4)
    if (t < 1 || Math.abs(group.current.position.z - z) > .005 || Math.abs(group.current.position.x - x) > .005) invalidate()
  })
  return <group ref={group} position={[(index - 2) * 1.48, .65, .55]} onClick={e => { e.stopPropagation(); if (!disabled) onHold(index) }}>
    <group ref={body}>
      <mesh geometry={geometry} castShadow receiveShadow dispose={null}><meshStandardMaterial color={held ? '#e3edd8' : '#fff3d9'} roughness={.29} metalness={.04} /></mesh>
      {FACES.map(([n, position, rotation]) => <group key={n} position={position} rotation={rotation}>
        {PIPS[n].map(([x, y], i) => <mesh key={i} position={[x * .24, y * .24, 0]}><circleGeometry args={[.082, 18]} /><meshStandardMaterial color={n === 1 ? '#ac513e' : '#26352e'} roughness={.8} /></mesh>)}
      </group>)}
    </group>
    {held && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.52, 0]}><ringGeometry args={[.64, .68, 40]} /><meshBasicMaterial color="#d6be7a" /></mesh>}
  </group>
}
function Refresh({ rollId, held }) {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => invalidate(), [invalidate, rollId, held])
  return null
}
class Boundary extends Component {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() { return this.state.error ? <div className="tt-fallback">The 3D tray needs WebGL. Use the numbered dice buttons below to keep playing.</div> : this.props.children }
}
export default function DiceScene({ turn, rollId, lastHeld, onHold, disabled, reduced }) {
  return <Boundary><Canvas shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 7.8, 8.5], fov: 42 }} gl={{ alpha: true, antialias: true }} aria-label="Five ivory dice on a green felt table">
    <Refresh rollId={rollId} held={turn.held} />
    <ambientLight intensity={1.5} /><directionalLight position={[-3, 8, 4]} intensity={3.2} color="#fff0ce" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-.001} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 20]} /><meshStandardMaterial color="#225c4c" roughness={1} /></mesh>
    {[-2.7, 2.7].map(z => <mesh key={z} position={[0, .15, z]} castShadow><boxGeometry args={[9.5, .3, .14]} /><meshStandardMaterial color="#bb995e" roughness={.7} /></mesh>)}
    {[-4.7, 4.7].map(x => <mesh key={x} position={[x, .15, 0]} castShadow><boxGeometry args={[.14, .3, 5.4]} /><meshStandardMaterial color="#bb995e" roughness={.7} /></mesh>)}
    {turn.dice.map((value, i) => <Die key={i} value={value} index={i} held={!!(turn.held & (1 << i))} animated={!(lastHeld & (1 << i))} rollId={rollId} onHold={onHold} disabled={disabled} reduced={reduced} />)}
  </Canvas></Boundary>
}
