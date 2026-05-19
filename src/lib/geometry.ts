import type { Point } from '../types'

export function signedArea(pts: Point[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return area / 2
}

export function shoelaceArea(pts: Point[]): number {
  return Math.abs(signedArea(pts))
}

export function polygonEdgeLengths(pts: Point[]): number[] {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
}

// Insets polygon inward by distance d (meters). Expects y-up math coordinates.
// Returns [] if the inset collapses the polygon.
export function insetPolygon(pts: Point[], d: number): Point[] {
  if (pts.length < 3) return pts
  if (d <= 0) return pts

  // Ensure CCW winding (positive signed area in y-up space)
  const ccw = signedArea(pts) > 0 ? pts : [...pts].reverse()
  const n = ccw.length

  // For each edge compute inward offset line: nx*x + ny*y = c
  // Inward normal for CCW polygon (y-up) = left normal = (-dy, dx)/len
  const lines: { nx: number; ny: number; c: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = ccw[i]
    const b = ccw[(i + 1) % n]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-10) continue
    const nx = -dy / len
    const ny = dx / len
    lines.push({ nx, ny, c: nx * a.x + ny * a.y + d })
  }

  // Intersect consecutive offset lines → inset vertices
  const result: Point[] = []
  const m = lines.length
  for (let i = 0; i < m; i++) {
    const l1 = lines[i]
    const l2 = lines[(i + 1) % m]
    const det = l1.nx * l2.ny - l2.nx * l1.ny
    if (Math.abs(det) < 1e-10) {
      const a = ccw[(i + 1) % n]
      result.push({ x: a.x + l1.nx * d, y: a.y + l1.ny * d })
    } else {
      result.push({
        x: (l1.c * l2.ny - l2.c * l1.ny) / det,
        y: (l1.nx * l2.c - l2.nx * l1.c) / det,
      })
    }
  }

  const resultArea = shoelaceArea(result)
  const originalArea = shoelaceArea(pts)
  // Collapse detected: result area is tiny OR larger than original (polygon inverted/exploded)
  if (resultArea < 0.001 || resultArea >= originalArea) return []
  return result
}

export function calculatePondGeometry(
  topPts: Point[],
  depth: number,
  slopeRatio: number,
): { floorPts: Point[]; floorArea: number; slopeArea: number; totalArea: number } {
  if (depth === 0) {
    const area = shoelaceArea(topPts)
    return { floorPts: topPts, floorArea: area, slopeArea: 0, totalArea: area }
  }

  const run = depth * slopeRatio
  const slantHeight = Math.sqrt(depth ** 2 + run ** 2)
  const floorPts = insetPolygon(topPts, run)
  const floorArea = floorPts.length >= 3 ? shoelaceArea(floorPts) : 0
  const slopeArea = polygonEdgeLengths(topPts).reduce((s, l) => s + l * slantHeight, 0)

  return { floorPts, floorArea, slopeArea, totalArea: floorArea + slopeArea }
}
