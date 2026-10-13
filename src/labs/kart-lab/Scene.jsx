import { Component, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LENGTH, SUNLIT, barriers, movingObstacles } from './engine/kart.js'
const OBSTACLES = barriers(SUNLIT)

const curve = new THREE.CatmullRomCurve3([
  [-32, 0, -32], [4, 0, -39], [36, 0, -27], [43, 0, 1],
  [24, 0, 25], [0, 0, 15], [-31, 0, 30], [-47, 0, 9],
].map(p => new THREE.Vector3(...p)), true, 'catmullrom', 0.5)
export function trackPoint(p, lane = 1) {
  const t = ((p / LENGTH) % 1 + 1) % 1, center = curve.getPointAt(t), tangent = curve.getTangentAt(t)
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x)
  return { position: center.addScaledVector(normal, (lane - 1) * 2.55), angle: Math.atan2(tangent.x, tangent.z), tangent }
}
function Ribbon({ inner, outer, color, height = 0 }) {
  const geometry = useMemo(() => {
    const points = [], indices = []
    for (let i = 0; i <= 384; i++) {
      const p = curve.getPointAt(i / 384), t = curve.getTangentAt(i / 384), n = new THREE.Vector3(-t.z, 0, t.x)
      for (const width of [inner, outer]) points.push(p.x + n.x * width, height, p.z + n.z * width)
      if (i < 384) { const j = i * 2; indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setIndex(indices); g.computeVertexNormals()
    return g
  }, [inner, outer, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.92} /></mesh>
}
function Box({ at, size, color, ...props }) {
  return <mesh position={at} castShadow receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.65} /></mesh>
}
function Tree({ x, z, scale = 1 }) {
  return <group position={[x, 0, z]} scale={scale}>
    <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.25, 0.4, 2.8, 6]} /><meshStandardMaterial color="#866a45" /></mesh>
    <mesh position={[0, 3.3, 0]} castShadow><icosahedronGeometry args={[2.1, 0]} /><meshStandardMaterial color="#419f6b" flatShading /></mesh>
    <mesh position={[0.65, 4.1, 0]} castShadow><icosahedronGeometry args={[1.55, 0]} /><meshStandardMaterial color="#70bd78" flatShading /></mesh>
  </group>
}
function StartSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#183f4a'; ctx.fillRect(0, 0, 1024, 128)
    ctx.fillStyle = '#d9efc9'; ctx.textAlign = 'center'; ctx.font = 'bold 64px sans-serif'
    ctx.fillText('SUNLIT CIRCUIT', 512, 87)
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 5.7, -0.315]} rotation={[0, Math.PI, 0]}><planeGeometry args={[9.6, 1]} /><meshBasicMaterial map={texture} /></mesh>
}
function World() {
  const decor = useMemo(() => Array.from({ length: 45 }, (_, i) => {
    const p = trackPoint(i * LENGTH / 45, i % 2 ? 5.6 : -3.3).position
    return { x: p.x, z: p.z, scale: 0.6 + (i % 4) * 0.15 }
  }), [])
  return <>
    <color attach="background" args={['#b5e1eb']} /><fog attach="fog" args={['#b5e1eb', 90, 210]} />
    <hemisphereLight args={['#effbff', '#648864', 2.4]} />
    <directionalLight position={[-35, 65, 20]} intensity={3.1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={75} shadow-camera-bottom={-75} shadow-bias={-0.0005} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow><planeGeometry args={[900, 900]} /><meshStandardMaterial color="#6fc4cc" /></mesh>
    <mesh position={[0, -1.2, 0]} receiveShadow><cylinderGeometry args={[75, 68, 2, 64]} /><meshStandardMaterial color="#8dc77e" /></mesh>
    <Ribbon inner={-5.2} outer={5.2} color="#e3d8aa" height={0.02} />
    <Ribbon inner={-4.45} outer={4.45} color="#e6ede6" height={0.045} />
    <Ribbon inner={-3.95} outer={3.95} color="#405464" height={0.06} />
    {Array.from({ length: 96 }, (_, i) => {
      const { position, angle } = trackPoint(i * LENGTH / 96)
      return <group key={i} position={position} rotation={[0, angle, 0]}>
        {[-4.2, 4.2].map(x => <Box key={x} at={[x, 0.1, 0]} size={[0.5, 0.08, 1.7]} color={i % 2 ? '#fff3d3' : '#ef7869'} />)}
        {i % 2 === 0 && [-1.28, 1.28].map(x => <Box key={x} at={[x, 0.075, 0]} size={[0.055, 0.015, 1.1]} color="#91a3ad" />)}
      </group>
    })}
    {OBSTACLES.map((o, i) => { const t = trackPoint(o.p, o.lane); return <group key={i} position={t.position} rotation={[0, t.angle, 0]}>
      <Box at={[0, 0.48, 0]} size={[1.85, 0.85, 0.65]} color="#f39b43" />
      {[-0.6, 0, 0.6].map(x => <Box key={x} at={[x, 0.52, -0.34]} size={[0.24, 0.7, 0.03]} color="#fff4d1" rotation={[0, 0, -0.3]} />)}
    </group> })}
    {decor.map((p, i) => <Tree key={i} {...p} />)}
    <group position={trackPoint(0).position} rotation={[0, trackPoint(0).angle, 0]}>
      {[-5, 5].map(x => <Box key={x} at={[x, 3, 0]} size={[0.45, 6, 0.45]} color="#f7e8cc" />)}
      <Box at={[0, 5.7, 0]} size={[10.5, 1.1, 0.6]} color="#183f4a" /><StartSign />
      {Array.from({ length: 12 }, (_, i) => <Box key={i} at={[-3.6 + i * 0.65, 0.09, 0]} size={[0.65, 0.04, 1]} color={i % 2 ? '#fff9e5' : '#1b303c'} />)}
    </group>
    <group position={[0, 0, -5]}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[8, 9, 2, 8]} /><meshStandardMaterial color="#e6cd9c" /></mesh>
      <mesh position={[0, 5, 0]} castShadow><icosahedronGeometry args={[5, 0]} /><meshStandardMaterial color="#75b58b" flatShading /></mesh>
      <Tree x={2} z={1} scale={1.5} />
    </group>
    {[-1, 1].map((side) => <group key={side} position={[side * 58, 0, -55]}>
      <mesh position={[0, 10, 0]}><coneGeometry args={[17, 26, 5]} /><meshStandardMaterial color="#93b2a8" flatShading /></mesh>
      <mesh position={[4, 22, 0]}><coneGeometry args={[5, 8, 5]} /><meshStandardMaterial color="#ecf2d9" flatShading /></mesh>
    </group>)}
  </>
}
function Sweepers({ race }) {
  const groups = useRef([])
  useFrame(({ invalidate }, delta) => {
    movingObstacles(race.current.tick).forEach((obstacle, i) => {
      const group = groups.current[i]
      if (!group) return
      const target = trackPoint(obstacle.p, obstacle.lane)
      if (!group.userData.ready) { group.position.copy(target.position); group.userData.ready = true }
      group.position.lerp(target.position, 1 - Math.exp(-delta * 18))
      group.rotation.y = target.angle
      if (group.position.distanceTo(target.position) > 0.005) invalidate()
    })
  })
  return <>{movingObstacles(0).map((o, i) => <group key={o.p}>
    <group position={trackPoint(o.p).position} rotation={[0, trackPoint(o.p).angle, 0]}>
      <Box at={[0, 0.095, 0]} size={[7.8, 0.025, 0.28]} color="#ffdb63" />
      {[-4.5, 4.5].map(x => <Box key={x} at={[x, 0.6, 0]} size={[0.35, 1.2, 0.35]} color="#ffcf45" />)}
    </group>
    <group ref={el => { groups.current[i] = el }}>
      <Box at={[0, 0.5, 0]} size={[1.7, 0.9, 0.9]} color="#e6b832" />
      {[-0.5, 0, 0.5].map(x => <Box key={x} at={[x, 0.5, -0.47]} size={[0.22, 0.85, 0.03]} color="#283a47" rotation={[0, 0, -0.4]} />)}
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.18, 8, 8]} /><meshStandardMaterial color="#fff19b" emissive="#ffad00" emissiveIntensity={2} /></mesh>
    </group>
  </group>)}</>
}
export const COLORS = ['#55dbc2', '#ff876f', '#b59af7']
function Kart({ race, index }) {
  const ref = useRef(null), smooth = useRef(null), impact = useRef({ tick: -1, age: 1 }), flash = useRef(null)
  useFrame(({ invalidate }, delta) => {
    const car = race.current.cars[index]
    if (!car || !ref.current) return
    if (impact.current.tick !== car.ticks) impact.current = { tick: car.ticks, age: car.last?.hit ? 0 : 1 }
    impact.current.age += delta
    const bounce = car.last?.hit ? Math.sin(Math.PI * Math.min(1, impact.current.age / 0.38)) : 0
    const displayLane = car.done ? (car.lane === 0 ? -1.2 : 3.2) : car.lane
    const t = trackPoint(car.p + bounce * 0.3, displayLane + (car.last?.impactLane - car.lane || 0) * bounce * 0.16)
    if (bounce > 0) invalidate()
    if (flash.current) { flash.current.visible = bounce > 0; flash.current.scale.setScalar(0.8 + bounce * 0.5) }
    if (!smooth.current || Math.abs(car.p - smooth.current.p) > 8) smooth.current = { p: car.p, position: t.position.clone() }
    smooth.current.position.lerp(t.position, 1 - Math.exp(-delta * 14)); smooth.current.p = car.p
    if (smooth.current.position.distanceTo(t.position) > 0.005) invalidate()
    ref.current.position.copy(smooth.current.position)
    ref.current.rotation.y = t.angle
    ref.current.position.y += bounce * 0.2
    ref.current.rotation.z = bounce * (index % 2 ? -0.16 : 0.16)
  })
  return <group ref={ref}>
    <group ref={flash} visible={false} position={[0, 1.8, 0]}>
      {[0, 1, 2, 3, 4, 5].map(i => <Box key={i} at={[Math.cos(i * Math.PI / 3) * 0.6, Math.sin(i * Math.PI / 3) * 0.6, 0]} size={[0.12, 0.4, 0.12]} color="#fff09b" rotation={[0, 0, i * Math.PI / 3 - Math.PI / 2]} />)}
    </group>
    <Box at={[0, 0.45, 0]} size={[1.25, 0.4, 1.8]} color={COLORS[index]} />
    <Box at={[0, 0.38, 1]} size={[1.5, 0.18, 0.45]} color={COLORS[index]} />
    <Box at={[0, 0.65, -0.75]} size={[1.65, 0.12, 0.45]} color={COLORS[index]} />
    <Box at={[0, 0.71, -0.1]} size={[0.62, 0.45, 0.7]} color="#273740" />
    {[[-0.8, 0.3, -0.6], [0.8, 0.3, -0.6], [-0.8, 0.3, 0.65], [0.8, 0.3, 0.65]].map((p, i) => <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.26, 12]} /><meshStandardMaterial color="#243440" /></mesh>)}
    <mesh position={[0, 1.1, -0.08]} castShadow><sphereGeometry args={[0.39, 16, 12]} /><meshStandardMaterial color={COLORS[index]} /></mesh>
    <Box at={[0, 1.12, 0.26]} size={[0.52, 0.16, 0.12]} color="#153449" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><circleGeometry args={[1.1, 24]} /><meshBasicMaterial color="#1b3336" transparent opacity={0.16} depthWrite={false} /></mesh>
  </group>
}
function CameraRig({ race, follow, cameraMode }) {
  const look = useRef(new THREE.Vector3())
  useFrame(({ camera, invalidate }, delta) => {
    const car = race.current.cars[follow] ?? race.current.cars[0]
    const { position, tangent } = trackPoint(car.p, car.lane)
    const desired = cameraMode === 'overview' ? new THREE.Vector3(75, 95, 85) : position.clone().addScaledVector(tangent, -11).add(new THREE.Vector3(0, 6.3, 0))
    camera.position.lerp(desired, 1 - Math.exp(-delta * 5))
    look.current.lerp(cameraMode === 'overview' ? new THREE.Vector3(0, 0, 0) : position.clone().addScaledVector(tangent, 8), 1 - Math.exp(-delta * 7))
    camera.lookAt(look.current)
    if (camera.position.distanceTo(desired) > 0.02 || look.current.distanceTo(cameraMode === 'overview' ? new THREE.Vector3() : position.clone().addScaledVector(tangent, 8)) > 0.02) invalidate()
  })
  return null
}
class SceneBoundary extends Component {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() { return this.state.error ? <div className="kl-webgl">3D rendering is unavailable. Enable WebGL in your browser to drive or spectate. Training and lessons still work.</div> : this.props.children }
}
function Refresh({ tick, follow, cameraMode }) {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => { invalidate() }, [tick, follow, cameraMode, invalidate])
  return null
}
export default function Scene({ race, follow, cameraMode, tick }) {
  return <SceneBoundary><Canvas frameloop="demand" shadows dpr={[1, 1.5]} camera={{ position: [75, 95, 85], fov: 48, near: 0.1, far: 300 }} gl={{ antialias: true }} aria-label="Three-dimensional kart racing circuit">
    <Refresh tick={tick} follow={follow} cameraMode={cameraMode} /><World /><Sweepers race={race} />{[0, 1, 2].map(i => <Kart key={i} race={race} index={i} />)}
    <CameraRig race={race} follow={follow} cameraMode={cameraMode} />
  </Canvas></SceneBoundary>
}
