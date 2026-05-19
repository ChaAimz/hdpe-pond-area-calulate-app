import { describe, it, expect } from 'vitest'
import { calculateHdpe, slopeRatioToDegrees, slopeDegreesToRatio } from './hdpe'

describe('slopeRatioToDegrees', () => {
  it('converts 1:1 to 45°', () => {
    expect(slopeRatioToDegrees(1)).toBeCloseTo(45, 1)
  })
  it('converts 2:1 to ~26.57°', () => {
    expect(slopeRatioToDegrees(2)).toBeCloseTo(26.565, 1)
  })
})

describe('slopeDegreesToRatio', () => {
  it('converts 45° to ratio 1', () => {
    expect(slopeDegreesToRatio(45)).toBeCloseTo(1, 5)
  })
  it('round-trips ratio → degrees → ratio', () => {
    const r = 2.5
    expect(slopeDegreesToRatio(slopeRatioToDegrees(r))).toBeCloseTo(r, 4)
  })
})

describe('calculateHdpe', () => {
  it('applies 10% overlap correctly', () => {
    const res = calculateHdpe(100, 10, { label: 'T', width: 5, rollLength: 20 })
    expect(res.hdpeArea).toBeCloseTo(110, 5)
    expect(res.rollCount).toBe(2) // ceil(110/100)
  })
  it('requires 1 roll when area fits exactly', () => {
    const res = calculateHdpe(100, 0, { label: 'T', width: 10, rollLength: 10 })
    expect(res.rollCount).toBe(1)
  })
  it('rounds up roll count', () => {
    const res = calculateHdpe(101, 0, { label: 'T', width: 10, rollLength: 10 })
    expect(res.rollCount).toBe(2)
  })
})
