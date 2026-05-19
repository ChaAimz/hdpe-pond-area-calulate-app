import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { usePondStore } from '../store/pondStore'
import { buildPondGeometry } from '../lib/buildPondGeometry'

export default function ThreeDViewer() {
  const { points, depth, floorPts } = usePondStore()
  const hasShape = points.length >= 3 && floorPts.length >= 3

  const geo = hasShape ? buildPondGeometry(points, floorPts, depth) : null

  const rimPts = hasShape
    ? [...points.map(p => new THREE.Vector3(p.x, 0, -p.y)),
       new THREE.Vector3(points[0].x, 0, -points[0].y)]
    : []

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
        <span className="text-slate-400">3D View</span>
        <div className="flex-1" />
        <span className="text-slate-600">Drag · Scroll to zoom</span>
      </div>
      <div className="flex-1">
        <Canvas camera={{ position: [15, 15, 15], fov: 45 }} style={{ background: '#0c1220' }}>
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

          <gridHelper args={[50, 50, '#1e3a5f', '#1e293b']} />
          <OrbitControls makeDefault enablePan />
        </Canvas>
      </div>
    </div>
  )
}
