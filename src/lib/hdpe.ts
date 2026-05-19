import type { HDPEPreset, PondResult } from '../types'

export function slopeRatioToDegrees(ratio: number): number {
  return (Math.atan(1 / ratio) * 180) / Math.PI
}

export function slopeDegreesToRatio(degrees: number): number {
  return 1 / Math.tan((degrees * Math.PI) / 180)
}

export function calculateHdpe(
  totalArea: number,
  overlapPercent: number,
  preset: HDPEPreset,
): Pick<PondResult, 'hdpeArea' | 'rollCount'> {
  const hdpeArea = totalArea * (1 + overlapPercent / 100)
  const rollArea = preset.width * preset.rollLength
  return { hdpeArea, rollCount: Math.ceil(hdpeArea / rollArea) }
}
