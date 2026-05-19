import { create } from 'zustand'
import type { Point, HDPEPreset, SlopeValue, PondResult } from '../types'
import { HDPE_PRESETS } from '../types'
import { calculatePondGeometry } from '../lib/geometry'
import { calculateHdpe, slopeRatioToDegrees, slopeDegreesToRatio } from '../lib/hdpe'

interface PondState {
  points: Point[]
  isClosed: boolean
  snapEnabled: boolean
  pxPerMeter: number

  slope: SlopeValue
  depth: number
  hdpePreset: HDPEPreset
  overlapPercent: number

  floorPts: Point[]
  result: PondResult | null

  addPoint: (p: Point) => void
  updatePoint: (index: number, p: Point) => void
  removeLastPoint: () => void
  clearPoints: () => void
  closePolygon: () => void
  toggleSnap: () => void
  setSlopeRatio: (ratio: number) => void
  setSlopeDegrees: (degrees: number) => void
  setDepth: (d: number) => void
  setHdpePreset: (p: HDPEPreset) => void
  setOverlapPercent: (n: number) => void
}

function recompute(
  points: Point[],
  depth: number,
  slope: SlopeValue,
  hdpePreset: HDPEPreset,
  overlapPercent: number,
): { floorPts: Point[]; result: PondResult | null } {
  if (points.length < 3) return { floorPts: [], result: null }
  const { floorPts, floorArea, slopeArea, totalArea } = calculatePondGeometry(points, depth, slope.ratio)
  const { hdpeArea, rollCount } = calculateHdpe(totalArea, overlapPercent, hdpePreset)
  return { floorPts, result: { floorArea, slopeArea, totalArea, hdpeArea, rollCount } }
}

export const usePondStore = create<PondState>((set, get) => ({
  points: [],
  isClosed: false,
  snapEnabled: true,
  pxPerMeter: 40,

  slope: { ratio: 2, degrees: slopeRatioToDegrees(2) },
  depth: 2,
  hdpePreset: HDPE_PRESETS[1],
  overlapPercent: 10,
  floorPts: [],
  result: null,

  addPoint: (p) => {
    const { points, isClosed, depth, slope, hdpePreset, overlapPercent } = get()
    if (isClosed) return
    const next = [...points, p]
    set({ points: next, ...recompute(next, depth, slope, hdpePreset, overlapPercent) })
  },

  closePolygon: () => {
    const { points, depth, slope, hdpePreset, overlapPercent } = get()
    if (points.length < 3) return
    set({ isClosed: true, ...recompute(points, depth, slope, hdpePreset, overlapPercent) })
  },

  updatePoint: (index, p) => {
    const { points, depth, slope, hdpePreset, overlapPercent } = get()
    const next = points.map((pt, i) => (i === index ? p : pt))
    set({ points: next, ...recompute(next, depth, slope, hdpePreset, overlapPercent) })
  },

  removeLastPoint: () => {
    const { points, depth, slope, hdpePreset, overlapPercent } = get()
    const next = points.slice(0, -1)
    set({ points: next, isClosed: false, ...recompute(next, depth, slope, hdpePreset, overlapPercent) })
  },

  clearPoints: () => set({ points: [], isClosed: false, floorPts: [], result: null }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  setSlopeRatio: (ratio) => {
    const slope = { ratio, degrees: slopeRatioToDegrees(ratio) }
    const { points, depth, hdpePreset, overlapPercent } = get()
    set({ slope, ...recompute(points, depth, slope, hdpePreset, overlapPercent) })
  },

  setSlopeDegrees: (degrees) => {
    const slope = { degrees, ratio: slopeDegreesToRatio(degrees) }
    const { points, depth, hdpePreset, overlapPercent } = get()
    set({ slope, ...recompute(points, depth, slope, hdpePreset, overlapPercent) })
  },

  setDepth: (depth) => {
    const { points, slope, hdpePreset, overlapPercent } = get()
    set({ depth, ...recompute(points, depth, slope, hdpePreset, overlapPercent) })
  },

  setHdpePreset: (hdpePreset) => {
    const { points, depth, slope, overlapPercent } = get()
    set({ hdpePreset, ...recompute(points, depth, slope, hdpePreset, overlapPercent) })
  },

  setOverlapPercent: (overlapPercent) => {
    const { points, depth, slope, hdpePreset } = get()
    set({ overlapPercent, ...recompute(points, depth, slope, hdpePreset, overlapPercent) })
  },
}))
