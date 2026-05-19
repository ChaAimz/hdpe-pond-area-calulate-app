import { useRef, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { usePondStore } from '../store/pondStore'
import { buildPondGeometry } from '../lib/buildPondGeometry'

function FitCamera({ trigger, center, radius }: {
  trigger: number
  center: THREE.Vector3
  radius: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const centerRef = useRef(center)
  const radiusRef = useRef(radius)
  centerRef.current = center
  radiusRef.current = radius

  useEffect(() => {
    if (trigger === 0 || radiusRef.current === 0) return
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const dist = (radiusRef.current / Math.sin(fov / 2)) * 1.3
    const c = centerRef.current
    camera.position.set(c.x + dist * 0.577, c.y + dist * 0.577, c.z + dist * 0.577)
    camera.lookAt(c)
    if (controlsRef.current) {
      controlsRef.current.target.copy(c)
      controlsRef.current.update()
    }
  }, [trigger])

  return <OrbitControls ref={controlsRef} makeDefault enablePan />
}

export default function ThreeDViewer() {
  const { points, depth, floorPts } = usePondStore()
  const hasShape = points.length >= 3 && floorPts.length >= 3
  const [fitTrigger, setFitTrigger] = useState(0)
  const [showGrid, setShowGrid] = useState(true)

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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
        <span className="text-slate-400">3D View</span>
        <div className="flex-1" />
        <button
          disabled={!hasShape}
          onClick={() => setFitTrigger(t => t + 1)}
          className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          Fit View
        </button>
        <button
          onClick={() => setShowGrid(g => !g)}
          className={`px-2 py-0.5 rounded border transition-colors ${
            showGrid ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-700 text-slate-600'
          }`}
        >
          Grid
        </button>
        <span className="text-slate-600">Drag · Scroll to zoom</span>
      </div>
      <div className="flex-1">
        <Canvas camera={{ position: [15, 15, 15], fov: 45 }} gl={{ preserveDrawingBuffer: true }} style={{ background: '#0c1220' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} />
          <directionalLight position={[-8, 5, -8]} intensity={0.3} color="#4488ff" />

          {geo && (
            <mesh geometry={geo}>
              <meshStandardMaterial color="#1d4ed8" side={THREE.DoubleSide}
                metalness={0.1} roughness={0.7} transparent opacity={0.92} />
            </mesh>
          )}

          {rimPts.length > 0 && (
            <Line points={rimPts} color="#93c5fd" lineWidth={2} />
          )}
          {floorRimPts.length > 0 && (
            <Line points={floorRimPts} color="#60a5fa" lineWidth={1.5} />
          )}
          {slopeEdges.map((pts, i) => (
            <Line key={`se${i}`} points={pts} color="#60a5fa" lineWidth={1} />
          ))}

          {showGrid && <gridHelper args={[50, 50, '#1e3a5f', '#1e293b']} />}
          <FitCamera trigger={fitTrigger} center={center} radius={radius} />
        </Canvas>
      </div>
    </div>
  )
}
