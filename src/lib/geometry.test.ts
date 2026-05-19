import { describe, it, expect } from 'vitest'
import { shoelaceArea, insetPolygon, calculatePondGeometry, polygonEdgeLengths } from './geometry'

describe('shoelaceArea', () => {
  it('returns area of a 4×3 rectangle', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]
    expect(shoelaceArea(pts)).toBeCloseTo(12, 5)
  })

  it('gives same result for CCW and CW winding', () => {
    const ccw = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]
    const cw = [...ccw].reverse()
    expect(shoelaceArea(ccw)).toBeCloseTo(shoelaceArea(cw), 5)
  })
})

describe('polygonEdgeLengths', () => {
  it('returns correct lengths for a 3-4-5 right triangle', () => {
    const pts = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }]
    const [a, b, c] = polygonEdgeLengths(pts)
    expect(a).toBeCloseTo(3, 5)
    expect(b).toBeCloseTo(5, 5)
    expect(c).toBeCloseTo(4, 5)
  })
})

describe('insetPolygon', () => {
  it('insets a 10×10 square by 2m → 6×6 area', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    const inset = insetPolygon(pts, 2)
    expect(inset).toHaveLength(4)
    expect(shoelaceArea(inset)).toBeCloseTo(36, 0)
  })

  it('returns original polygon when d=0', () => {
    const pts = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }]
    expect(insetPolygon(pts, 0)).toEqual(pts)
  })

  it('returns empty array when inset collapses polygon', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 2 }]
    const inset = insetPolygon(pts, 5) // 5 > half of 2m narrow side
    expect(inset.length === 0 || shoelaceArea(inset) < 0.01).toBe(true)
  })
})

describe('calculatePondGeometry', () => {
  it('computes floor and slope for 10×10 square, depth=2, ratio=1', () => {
    const top = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    // run = 2×1 = 2m inset → floor = 6×6 = 36m²
    // slantHeight = sqrt(4+4) ≈ 2.828m
    // slopeArea = 4 edges × 10m × 2.828m ≈ 113.14m²
    const r = calculatePondGeometry(top, 2, 1)
    expect(r.floorArea).toBeCloseTo(36, 0)
    expect(r.slopeArea).toBeCloseTo(4 * 10 * Math.sqrt(4 + 4), 0)
    expect(r.totalArea).toBeCloseTo(r.floorArea + r.slopeArea, 1)
  })

  it('returns top area and zero slope when depth=0', () => {
    const top = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    const r = calculatePondGeometry(top, 0, 2)
    expect(r.floorArea).toBeCloseTo(100, 1)
    expect(r.slopeArea).toBeCloseTo(0, 5)
  })
})
