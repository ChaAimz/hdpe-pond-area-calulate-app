import { useRef, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import { Maximize2, Grid3X3, Ruler } from 'lucide-react'
import * as THREE from 'three'
import { usePondStore } from '../store/pondStore'
import { buildPondGeometry } from '../lib/buildPondGeometry'

function FitCamera({ trigger, radius }: { trigger: number; radius: number }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const radiusRef = useRef(radius)
  radiusRef.current = radius

  useEffect(() => {
    if (trigger === 0 || radiusRef.current === 0) return
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const dist = (radiusRef.current / Math.sin(fov / 2)) * 1.3
    camera.position.set(dist * 0.577, dist * 0.577, dist * 0.577)
    camera.lookAt(0, 0, 0)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [trigger])

  return <OrbitControls ref={controlsRef} makeDefault enablePan />
}

const ICON_BTN = 'p-1.5 rounded border transition-colors'
const ICON_BTN_DEFAULT = `${ICON_BTN} border-slate-700 text-slate-400 hover:text-white hover:border-slate-500`
const ICON_BTN_ACTIVE = `${ICON_BTN} bg-amber-500/10 border-amber-500 text-amber-400`
const ICON_BTN_INACTIVE = `${ICON_BTN} border-slate-700 text-slate-600`
const ICON_BTN_DISABLED = `${ICON_BTN} border-slate-800 text-slate-700`

export default function ThreeDViewer() {
  const { points, depth, floorPts } = usePondStore()
  const hasShape = points.length >= 3 && floorPts.length >= 3
  const [fitTrigger, setFitTrigger] = useState(0)
  const [showGrid, setShowGrid] = useState(true)
  const [showDims, setShowDims] = useState(false)

  const geo = hasShape ? buildPondGeometry(points, floorPts, depth) : null

  const rimPts = hasShape
    ? [...points.map(p => new THREE.Vector3(p.x, 0, -p.y)),
       new THREE.Vector3(points[0].x, 0, -points[0].y)]
    : []

  const floorRimPts = hasShape
    ? [...floorPts.map(fp => new THREE.Vector3(fp.x, -depth, -fp.y)),
       new THREE.Vector3(floorPts[0].x, -depth, -floorPts[0].y)]
    : []

  const slopeEdges = hasShape
    ? points.map((p, i) => {
        const m = floorPts.length
        const fp = floorPts[(i - 1 + m) % m]
        return [new THREE.Vector3(p.x, 0, -p.y), new THREE.Vector3(fp.x, -depth, -fp.y)]
      })
    : []

  const center = hasShape
    ? new THREE.Vector3(
        points.reduce((s, p) => s + p.x, 0) / points.length,
        -depth / 2,
        -points.reduce((s, p) => s + p.y, 0) / points.length,
      )
    : new THREE.Vector3()

  const radius = hasShape
    ? Math.max(
        ...points.map(p => new THREE.Vector3(p.x, 0, -p.y).distanceTo(center)),
        ...floorPts.map(fp => new THREE.Vector3(fp.x, -depth, -fp.y).distanceTo(center)),
        depth,
      )
    : 1

  const edgeDims = hasShape && showDims
    ? points.map((p, i) => {
        const q = points[(i + 1) % points.length]
        const mx = (p.x + q.x) / 2
        const mz = -(p.y + q.y) / 2
        const len = Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
        return { pos: [mx, 0.4, mz] as [number, number, number], label: `${len.toFixed(2)} m` }
      })
    : []

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <span className="text-xs text-slate-400">3D View</span>
        <div className="flex-1" />
        <button
          title="Fit View"
          disabled={!hasShape}
          onClick={() => setFitTrigger(t => t + 1)}
          className={hasShape ? ICON_BTN_DEFAULT : ICON_BTN_DISABLED}
        >
          <Maximize2 size={14} />
        </button>
        <button
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
          onClick={() => setShowGrid(g => !g)}
          className={showGrid ? ICON_BTN_DEFAULT : ICON_BTN_INACTIVE}
        >
          <Grid3X3 size={14} />
        </button>
        <button
          title={showDims ? 'Hide Dimensions' : 'Show Dimensions'}
          disabled={!hasShape}
          onClick={() => setShowDims(d => !d)}
          className={!hasShape ? ICON_BTN_DISABLED : showDims ? ICON_BTN_ACTIVE : ICON_BTN_INACTIVE}
        >
          <Ruler size={14} />
        </button>
        <span className="text-xs text-slate-600 ml-1">Drag · Scroll</span>
      </div>
      <div className="flex-1">
        <Canvas camera={{ position: [15, 15, 15], fov: 45 }} gl={{ preserveDrawingBuffer: true }} style={{ background: '#0c1220' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} />
          <directionalLight position={[-8, 5, -8]} intensity={0.3} color="#4488ff" />

          <group position={hasShape ? [-center.x, -center.y, -center.z] : [0, 0, 0]}>
            {geo && (
              <mesh geometry={geo}>
                <meshStandardMaterial color="#1d4ed8" side={THREE.DoubleSide}
                  metalness={0.1} roughness={0.7} transparent opacity={0.92} />
              </mesh>
            )}
            {rimPts.length > 0 && <Line points={rimPts} color="#93c5fd" lineWidth={2} />}
            {floorRimPts.length > 0 && <Line points={floorRimPts} color="#60a5fa" lineWidth={1.5} />}
            {slopeEdges.map((pts, i) => (
              <Line key={`se${i}`} points={pts} color="#60a5fa" lineWidth={1} />
            ))}
            {edgeDims.map((d, i) => (
              <Html key={`dim${i}`} position={d.pos} center>
                <span style={{
                  background: 'rgba(15,23,42,0.85)', color: '#fbbf24',
                  border: '1px solid #92400e', borderRadius: 3,
                  padding: '1px 5px', fontSize: 10, whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>{d.label}</span>
              </Html>
            ))}
          </group>

          {showGrid && <gridHelper args={[50, 50, '#1e3a5f', '#1e293b']} />}
          <FitCamera trigger={fitTrigger} radius={radius} />
        </Canvas>
      </div>
    </div>
  )
}
