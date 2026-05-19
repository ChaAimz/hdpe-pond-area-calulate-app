import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import { Maximize2, Grid3X3, Ruler } from 'lucide-react'
import * as THREE from 'three'
import { usePondStore } from '../store/pondStore'
import { buildPondGeometry } from '../lib/buildPondGeometry'

type ViewKey = 'iso' | 'top' | 'front' | 'side' | 'fit'

interface CameraCmd { view: ViewKey; seq: number }

function CameraController({ cmd, autoRotate, radius }: {
  cmd: CameraCmd
  autoRotate: boolean
  radius: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const radiusRef = useRef(radius)
  radiusRef.current = radius

  const moveTo = useCallback((pos: [number, number, number]) => {
    camera.position.set(...pos)
    camera.lookAt(0, 0, 0)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [camera])

  useEffect(() => {
    if (cmd.seq === 0 || radiusRef.current === 0) return
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const dist = (radiusRef.current / Math.sin(fov / 2)) * 1.3
    const d = dist * 0.577
    if (cmd.view === 'iso' || cmd.view === 'fit') moveTo([d, d, d])
    else if (cmd.view === 'top') moveTo([0.001, dist * 1.4, 0.001])
    else if (cmd.view === 'front') moveTo([0, 0, dist * 1.4])
    else if (cmd.view === 'side') moveTo([dist * 1.4, 0, 0])
  }, [cmd.seq])

  return (
    <OrbitControls ref={controlsRef} makeDefault enablePan
      autoRotate={autoRotate} autoRotateSpeed={1.5} />
  )
}

const ICON_BTN = 'p-1.5 rounded border transition-colors'
const BTN_ON  = `${ICON_BTN} bg-sky-500/10 border-sky-500 text-sky-500 dark:text-sky-400`
const BTN_OFF = `${ICON_BTN} border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500`
const BTN_DIM_ON  = `${ICON_BTN} bg-amber-500/10 border-amber-500 text-amber-500 dark:text-amber-400`
const BTN_DIM_OFF = `${ICON_BTN} border-gray-300 text-gray-400 hover:text-gray-500 dark:border-slate-700 dark:text-slate-600 dark:hover:text-slate-400`
const BTN_DIS = `${ICON_BTN} border-gray-200 text-gray-300 dark:border-slate-800 dark:text-slate-700`
const VIEW_BTN = 'px-2 py-0.5 text-xs rounded border transition-colors'
const VIEW_ACT = `${VIEW_BTN} bg-sky-500/10 border-sky-500 text-sky-500 dark:text-sky-400`
const VIEW_DEF = `${VIEW_BTN} border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500`

const DIM_STYLE: React.CSSProperties = {
  background: 'rgba(15,23,42,0.85)', color: '#fbbf24',
  border: '1px solid #92400e', borderRadius: 3,
  padding: '1px 5px', fontSize: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
}
const DEPTH_STYLE: React.CSSProperties = {
  background: 'rgba(15,23,42,0.85)', color: '#67e8f9',
  border: '1px solid #0e7490', borderRadius: 3,
  padding: '1px 5px', fontSize: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
}
const SLOPE_STYLE: React.CSSProperties = {
  background: 'rgba(15,23,42,0.85)', color: '#86efac',
  border: '1px solid #166534', borderRadius: 3,
  padding: '1px 5px', fontSize: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
}

export default function ThreeDViewer() {
  const { points, depth, floorPts, slope } = usePondStore()
  const hasShape = points.length >= 3 && floorPts.length >= 3

  const [cameraCmd, setCameraCmd] = useState<CameraCmd>({ view: 'iso', seq: 0 })
  const [activeView, setActiveView] = useState<ViewKey>('iso')
  const [showGrid, setShowGrid] = useState(true)
  const [showDims, setShowDims] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-rotate: start after 3s idle, stop on pointer interaction
  const resetIdle = useCallback(() => {
    setAutoRotate(false)
    if (idleRef.current) clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => setAutoRotate(true), 3000)
  }, [])

  useEffect(() => {
    resetIdle()
    return () => { if (idleRef.current) clearTimeout(idleRef.current) }
  }, [])

  const setView = (v: ViewKey) => {
    setActiveView(v)
    setCameraCmd(c => ({ view: v, seq: c.seq + 1 }))
    resetIdle()
  }

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

  // Slant height of slope face
  const slantHeight = hasShape ? Math.sqrt(depth ** 2 + (depth * slope.ratio) ** 2) : 0

  // Dimension annotations (in model world coords — group will offset them)
  const topEdgeDims = hasShape && showDims
    ? points.map((p, i) => {
        const q = points[(i + 1) % points.length]
        const mx = (p.x + q.x) / 2, mz = -(p.y + q.y) / 2
        const len = Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
        return { pos: [mx, 0.4, mz] as [number, number, number], label: `${len.toFixed(2)} m` }
      })
    : []

  // Slope slant-height labels — midpoint of each slope edge diagonal
  const slopeDims = hasShape && showDims
    ? slopeEdges.map((pts, i) => {
        const a = pts[0], b = pts[1]
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2
        return { pos: [mx, my, mz] as [number, number, number], label: `⟋ ${slantHeight.toFixed(2)} m` }
      })
    : []

  // Depth label — on one corner, midway between top and floor
  const depthDim = hasShape && showDims && points.length > 0
    ? (() => {
        const p0 = points[0]
        return { pos: [p0.x, -depth / 2, -p0.y] as [number, number, number], label: `↕ ${depth.toFixed(1)} m` }
      })()
    : null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-b border-gray-200 shrink-0 flex-wrap dark:bg-slate-900 dark:border-slate-800">
        <span className="text-xs text-gray-500 dark:text-slate-400">3D View</span>

        {/* View presets */}
        <div className="flex gap-1">
          {(['iso', 'top', 'front', 'side'] as ViewKey[]).map(v => (
            <button key={v} title={v.toUpperCase()}
              onClick={() => setView(v)}
              className={activeView === v ? VIEW_ACT : VIEW_DEF}
            >{v.toUpperCase()}</button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Fit / Grid / Dim */}
        <button title="Fit View" disabled={!hasShape}
          onClick={() => setView('fit')}
          className={hasShape ? BTN_OFF : BTN_DIS}
        ><Maximize2 size={14} /></button>
        <button title={showGrid ? 'Hide Grid' : 'Show Grid'}
          onClick={() => setShowGrid(g => !g)}
          className={showGrid ? BTN_ON : BTN_DIM_OFF}
        ><Grid3X3 size={14} /></button>
        <button title={showDims ? 'Hide Dimensions' : 'Show Dimensions'}
          disabled={!hasShape}
          onClick={() => setShowDims(d => !d)}
          className={!hasShape ? BTN_DIS : showDims ? BTN_DIM_ON : BTN_DIM_OFF}
        ><Ruler size={14} /></button>

        <span className="text-xs text-gray-400 dark:text-slate-600">Drag · Scroll</span>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative"
        onPointerDown={resetIdle}
        onPointerMove={resetIdle}
      >
        {autoRotate && (
          <div className="absolute top-2 right-2 z-10 text-xs text-gray-500 pointer-events-none select-none dark:text-slate-500">
            Auto-rotate — touch to stop
          </div>
        )}
        <Canvas camera={{ position: [15, 15, 15], fov: 45 }}
          gl={{ preserveDrawingBuffer: true }} style={{ background: '#0c1220' }}>
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

            {/* Top edge length labels */}
            {topEdgeDims.map((d, i) => (
              <Html key={`td${i}`} position={d.pos} center>
                <span style={DIM_STYLE}>{d.label}</span>
              </Html>
            ))}

            {/* Slope slant-height labels */}
            {slopeDims.map((d, i) => (
              <Html key={`sd${i}`} position={d.pos} center>
                <span style={SLOPE_STYLE}>{d.label}</span>
              </Html>
            ))}

            {/* Depth label */}
            {depthDim && (
              <Html position={depthDim.pos} center>
                <span style={DEPTH_STYLE}>{depthDim.label}</span>
              </Html>
            )}
          </group>

          {showGrid && (
            <gridHelper args={[50, 50, '#1e3a5f', '#1e293b']}
              position={[0, hasShape ? -depth / 2 : 0, 0]} />
          )}
          <CameraController cmd={cameraCmd} autoRotate={autoRotate} radius={radius} />
        </Canvas>
      </div>
    </div>
  )
}
