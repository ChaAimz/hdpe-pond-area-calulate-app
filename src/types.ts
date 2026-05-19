export interface Point {
  x: number // meters, y-up convention
  y: number // meters, y-up convention
}

export interface HDPEPreset {
  label: string
  width: number      // meters (roll width)
  rollLength: number // meters (roll length)
}

export interface SlopeValue {
  ratio: number   // H:V — e.g. 2.0 means 2m horizontal per 1m vertical
  degrees: number // angle from horizontal in degrees
}

export interface PondResult {
  floorArea: number   // m²
  slopeArea: number   // m²
  totalArea: number   // m²
  hdpeArea: number    // m² after overlap applied
  rollCount: number
}

export const HDPE_PRESETS: HDPEPreset[] = [
  { label: 'Standard S (6×50)', width: 6, rollLength: 50 },
  { label: 'Standard M (7×50)', width: 7, rollLength: 50 },
  { label: 'Standard L (8×50)', width: 8, rollLength: 50 },
  { label: 'Large Roll (8×100)', width: 8, rollLength: 100 },
]
