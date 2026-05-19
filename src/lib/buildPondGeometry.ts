import * as THREE from 'three'
import type { Point } from '../types'

export function buildPondGeometry(
  topPts: Point[],
  floorPts: Point[],
  depth: number,
): THREE.BufferGeometry {
  if (topPts.length < 3 || floorPts.length < 3) return new THREE.BufferGeometry()

  const n = topPts.length
  const m = floorPts.length

  // 2D (x,y) meters → Three.js (x, y_3d, -z) with y=0 at surface, y=-depth at floor
  const top3: number[] = topPts.flatMap(p => [p.x, 0, -p.y])
  const floor3: number[] = floorPts.flatMap(p => [p.x, -depth, -p.y])

  const positions = [...floor3, ...top3]
  const indices: number[] = []

  // Floor face: fan triangulation (CCW when viewed from below)
  for (let i = 1; i < m - 1; i++) indices.push(0, i + 1, i)

  // Slope quads (2 triangles per edge)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const fi = i % m, fj = j % m
    const ti = m + i, tj = m + j
    indices.push(fi, fj, tj, fi, tj, ti)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
