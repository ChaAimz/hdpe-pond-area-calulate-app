# HDPE Pond Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where users draw a pond polygon top-view, enter slope/depth, and get HDPE sheet area + roll count with live 3D preview.

**Architecture:** Single-page Vite+React+TS. All state in Zustand (`pondStore`). 2D drawing via react-konva. 3D via @react-three/fiber. Pure calculation functions in `src/lib/` (only tested files). ShadCN+Tailwind for UI. Points stored in **real-world meters, y-up** convention; DrawingCanvas converts to/from Konva screen coordinates on every interaction.

**Tech Stack:** Vite 5, React 18, TypeScript, react-konva, @react-three/fiber, @react-three/drei, three.js, Zustand 5, ShadCN UI, Tailwind CSS 3, Vitest

---

### Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `package.json` (via scaffold)
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/index.css`
- Create: `src/test-setup.ts`
- Create: `CLAUDE.md`

- [ ] **Step 1: Scaffold Vite + React + TS**

```bash
cd "C:/Users/Aimz/source/repos/test-area-calculation-for-hdpe-sheet"
npm create vite@latest . -- --template react-ts
```

Expected: `package.json`, `src/`, `index.html` created. When prompted about non-empty directory, select "Ignore files and continue".

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install
npm install react-konva konva @react-three/fiber @react-three/drei three zustand
npm install @types/three
```

- [ ] **Step 3: Install Tailwind CSS 3**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Replace content of `tailwind.config.js` with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Install Vitest**

```bash
npm install -D vitest @vitest/coverage-v8 happy-dom @testing-library/react
```

- [ ] **Step 5: Configure vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

Create `src/test-setup.ts`:
```ts
// Vitest global setup
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 7: Initialize ShadCN**

```bash
npx shadcn@latest init
```

When prompted: Style = Default, Base color = Slate, CSS variables = Yes.

```bash
npx shadcn@latest add button input label select tooltip badge
```

- [ ] **Step 8: Create CLAUDE.md**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — production build
- `npm test` — run Vitest in watch mode
- `npm run test:run` — run tests once
- `npm run test:run -- src/lib/geometry.test.ts` — run single test file

## Architecture

Single-page Vite+React+TS app. All shared state in `src/store/pondStore.ts` (Zustand). Pure calculation logic in `src/lib/geometry.ts` and `src/lib/hdpe.ts` — these are the only unit-tested files. UI has 4 components: DrawingCanvas (react-konva), ThreeDViewer (@react-three/fiber), BottomBar (ShadCN inputs), ResultPanel (stat cards). Layout: top split (Canvas | 3D) + bottom bar + result strip.

## Coordinate Convention

`pondStore.points[]` are in **real-world meters, y-up** (standard math coordinates). DrawingCanvas converts between Konva screen pixels (y-down) and real meters:
- screen→real: `x = screenX / pxPerMeter`, `y = (canvasH - screenY) / pxPerMeter`
- real→screen: `x = realX * pxPerMeter`, `y = canvasH - realY * pxPerMeter`

All geometry functions in `lib/geometry.ts` expect y-up meter coordinates.

## Key Calculations

- run = `depth × slopeRatio` (horizontal setback per edge)
- slantHeight = `depth × √(1 + slopeRatio²)`
- floorPolygon = topPolygon inset inward by `run` meters per edge
- slopeArea = Σ(topEdgeLength × slantHeight)
- hdpeArea = (floorArea + slopeArea) × (1 + overlap/100)
- rollCount = ⌈hdpeArea / (rollWidth × rollLength)⌉
```

- [ ] **Step 9: Clean up Vite boilerplate**

Delete `src/assets/react.svg`, `public/vite.svg`. Replace `src/App.tsx`:
```tsx
export default function App() {
  return <div className="h-screen bg-slate-950 text-white">Loading...</div>
}
```

Replace `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```

- [ ] **Step 10: Verify dev server**

```bash
npm run dev
```
Expected: `VITE v5.x  ready at http://localhost:5173` — dark page shows "Loading..."

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React+TS with Tailwind, ShadCN, R3F, react-konva, Vitest"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create src/types.ts**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 3: Geometry Library (TDD)

**Files:**
- Create: `src/lib/geometry.ts`
- Create: `src/lib/geometry.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/geometry.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm run test:run -- src/lib/geometry.test.ts
```
Expected: Error — module not found

- [ ] **Step 3: Implement src/lib/geometry.ts**

```ts
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

  return shoelaceArea(result) < 0.001 ? [] : result
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
```

- [ ] **Step 4: Run to confirm PASS**

```bash
npm run test:run -- src/lib/geometry.test.ts
```
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/geometry.ts src/lib/geometry.test.ts
git commit -m "feat: geometry library with polygon area, inset, and pond calculation"
```

---

### Task 4: HDPE Calculation Library (TDD)

**Files:**
- Create: `src/lib/hdpe.ts`
- Create: `src/lib/hdpe.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/hdpe.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm run test:run -- src/lib/hdpe.test.ts
```
Expected: Error — module not found

- [ ] **Step 3: Implement src/lib/hdpe.ts**

```ts
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
```

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```
Expected: All tests PASS (geometry + hdpe)

- [ ] **Step 5: Commit**

```bash
git add src/lib/hdpe.ts src/lib/hdpe.test.ts
git commit -m "feat: HDPE calculation library with slope conversion and roll count"
```

---

### Task 5: Zustand Store

**Files:**
- Create: `src/store/pondStore.ts`

- [ ] **Step 1: Create src/store/pondStore.ts**

```ts
import { create } from 'zustand'
import type { Point, HDPEPreset, SlopeValue, PondResult } from '../types'
import { HDPE_PRESETS } from '../types'
import { calculatePondGeometry } from '../lib/geometry'
import { calculateHdpe, slopeRatioToDegrees, slopeDegreesToRatio } from '../lib/hdpe'

interface PondState {
  points: Point[]
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
  snapEnabled: true,
  pxPerMeter: 40,

  slope: { ratio: 2, degrees: slopeRatioToDegrees(2) },
  depth: 2,
  hdpePreset: HDPE_PRESETS[1],
  overlapPercent: 10,
  floorPts: [],
  result: null,

  addPoint: (p) => {
    const { points, depth, slope, hdpePreset, overlapPercent } = get()
    const next = [...points, p]
    set({ points: next, ...recompute(next, depth, slope, hdpePreset, overlapPercent) })
  },

  updatePoint: (index, p) => {
    const { points, depth, slope, hdpePreset, overlapPercent } = get()
    const next = points.map((pt, i) => (i === index ? p : pt))
    set({ points: next, ...recompute(next, depth, slope, hdpePreset, overlapPercent) })
  },

  removeLastPoint: () => {
    const { points, depth, slope, hdpePreset, overlapPercent } = get()
    const next = points.slice(0, -1)
    set({ points: next, ...recompute(next, depth, slope, hdpePreset, overlapPercent) })
  },

  clearPoints: () => set({ points: [], floorPts: [], result: null }),
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
```

- [ ] **Step 2: Commit**

```bash
git add src/store/pondStore.ts
git commit -m "feat: Zustand store with reactive pond calculation"
```

---

### Task 6: App Layout Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/DrawingCanvas.tsx` (stub)
- Create: `src/components/ThreeDViewer.tsx` (stub)
- Create: `src/components/BottomBar.tsx` (stub)
- Create: `src/components/ResultPanel.tsx` (stub)

- [ ] **Step 1: Create component stubs**

`src/components/DrawingCanvas.tsx`:
```tsx
export default function DrawingCanvas() {
  return (
    <div className="flex-1 bg-slate-950 flex items-center justify-center border-r border-slate-800">
      <span className="text-slate-600 text-sm">Canvas</span>
    </div>
  )
}
```

`src/components/ThreeDViewer.tsx`:
```tsx
export default function ThreeDViewer() {
  return (
    <div className="flex-1 bg-slate-950 flex items-center justify-center">
      <span className="text-slate-600 text-sm">3D Viewer</span>
    </div>
  )
}
```

`src/components/BottomBar.tsx`:
```tsx
export default function BottomBar() {
  return (
    <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center px-4">
      <span className="text-slate-600 text-sm">Inputs</span>
    </div>
  )
}
```

`src/components/ResultPanel.tsx`:
```tsx
export default function ResultPanel() {
  return (
    <div className="bg-slate-900 border-t border-slate-800 px-4 py-3">
      <span className="text-slate-600 text-sm">Results</span>
    </div>
  )
}
```

- [ ] **Step 2: Implement App.tsx**

```tsx
import DrawingCanvas from './components/DrawingCanvas'
import ThreeDViewer from './components/ThreeDViewer'
import BottomBar from './components/BottomBar'
import ResultPanel from './components/ResultPanel'

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-sm font-semibold tracking-wide">HDPE POND CALCULATOR</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          New
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <DrawingCanvas />
        <ThreeDViewer />
      </div>

      <BottomBar />
      <ResultPanel />
    </div>
  )
}
```

- [ ] **Step 3: Verify layout**

```bash
npm run dev
```
Expected: Dark navbar + two placeholder halves + bottom bar + results strip.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/
git commit -m "feat: app layout shell — top split, bottom bar, result strip"
```

---

### Task 7: Drawing Canvas (react-konva)

**Files:**
- Modify: `src/components/DrawingCanvas.tsx`

- [ ] **Step 1: Implement DrawingCanvas.tsx**

```tsx
import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { usePondStore } from '../store/pondStore'
import { calculatePondGeometry } from '../lib/geometry'
import type { Point } from '../types'

function snapToGrid(val: number): number {
  return Math.round(val)
}

export default function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [cursor, setCursor] = useState<Point | null>(null)

  const {
    points, snapEnabled, pxPerMeter, depth, slope,
    floorPts,
    addPoint, updatePoint, removeLastPoint, clearPoints, toggleSnap,
  } = usePondStore()

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    ro.observe(containerRef.current)
    const rect = containerRef.current.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })
    return () => ro.disconnect()
  }, [])

  const toReal = (sx: number, sy: number): Point => ({
    x: sx / pxPerMeter,
    y: (size.height - sy) / pxPerMeter,
  })

  const toScreen = (p: Point) => ({
    x: p.x * pxPerMeter,
    y: size.height - p.y * pxPerMeter,
  })

  const snap = (p: Point): Point =>
    snapEnabled ? { x: snapToGrid(p.x), y: snapToGrid(p.y) } : p

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()!.getPointerPosition()!
    const real = snap(toReal(pos.x, pos.y))

    if (points.length >= 3) {
      const { x: fx, y: fy } = toScreen(points[0])
      if (Math.hypot(pos.x - fx, pos.y - fy) < 14) return // close polygon
    }
    addPoint(real)
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setCursor(snap(toReal(pos.x, pos.y)))
  }

  const lastPt = points.at(-1)
  const distToCursor =
    lastPt && cursor
      ? Math.sqrt((cursor.x - lastPt.x) ** 2 + (cursor.y - lastPt.y) ** 2)
      : null

  const toFlat = (pts: Point[]) => pts.flatMap(p => [toScreen(p).x, toScreen(p).y])

  const lineFlat = toFlat(points)
  const closedFlat =
    points.length >= 3 ? [...lineFlat, lineFlat[0], lineFlat[1]] : lineFlat
  const cursorFlat =
    lastPt && cursor
      ? [toScreen(lastPt).x, toScreen(lastPt).y, toScreen(cursor).x, toScreen(cursor).y]
      : []

  const floorFlat = floorPts.length >= 3 ? toFlat(floorPts) : []

  const mX = Math.ceil(size.width / pxPerMeter) + 1
  const mY = Math.ceil(size.height / pxPerMeter) + 1
  const SUB = 5
  const gx = Array.from({ length: mX * SUB + 1 }, (_, i) => (i * pxPerMeter) / SUB)
  const gy = Array.from({ length: mY * SUB + 1 }, (_, i) => size.height - (i * pxPerMeter) / SUB)

  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-800">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
        <span className="text-slate-400">Top View (m)</span>
        <div className="flex-1" />
        <button
          onClick={toggleSnap}
          className={`px-2 py-0.5 rounded border transition-colors ${
            snapEnabled
              ? 'bg-sky-500/10 border-sky-500 text-sky-400'
              : 'border-slate-700 text-slate-500'
          }`}
        >
          Snap {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={removeLastPoint}
          disabled={points.length === 0}
          className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          onClick={clearPoints}
          disabled={points.length === 0}
          className="px-2 py-0.5 rounded border border-red-800 text-red-400 disabled:opacity-30"
        >
          Clear
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden cursor-crosshair">
        <Stage
          width={size.width}
          height={size.height}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          {/* Grid */}
          <Layer listening={false}>
            {gx.map((x, i) => (
              <Line key={`gx${i}`} points={[x, 0, x, size.height]}
                stroke={i % SUB === 0 ? '#1e3a5f' : '#152030'}
                strokeWidth={i % SUB === 0 ? 0.8 : 0.4} />
            ))}
            {gy.map((y, i) => (
              <Line key={`gy${i}`} points={[0, y, size.width, y]}
                stroke={i % SUB === 0 ? '#1e3a5f' : '#152030'}
                strokeWidth={i % SUB === 0 ? 0.8 : 0.4} />
            ))}
          </Layer>

          <Layer>
            {/* Top polygon fill + outline */}
            {points.length >= 3 && (
              <Line points={closedFlat} closed fill="rgba(14,165,233,0.07)"
                stroke="#0ea5e9" strokeWidth={1.5} />
            )}
            {points.length >= 1 && points.length < 3 && (
              <Line points={lineFlat} stroke="#0ea5e9" strokeWidth={1.5} />
            )}

            {/* Floor polygon (dashed) */}
            {floorFlat.length > 0 && (
              <Line points={[...floorFlat, floorFlat[0], floorFlat[1]]} closed
                stroke="#3b82f6" strokeWidth={1} dash={[5, 3]}
                fill="rgba(30,64,175,0.15)" />
            )}

            {/* Cursor guide line + distance label */}
            {cursorFlat.length > 0 && (
              <Line points={cursorFlat} stroke="#f59e0b" strokeWidth={1} dash={[4, 3]} />
            )}
            {distToCursor !== null && cursor && (
              <>
                <Rect x={toScreen(cursor).x + 8} y={toScreen(cursor).y - 20}
                  width={56} height={16} fill="#1e293b"
                  stroke="#f59e0b" strokeWidth={0.8} cornerRadius={3} />
                <Text x={toScreen(cursor).x + 10} y={toScreen(cursor).y - 17}
                  text={`${distToCursor.toFixed(1)} m`} fill="#fbbf24" fontSize={10} />
              </>
            )}

            {/* Point handles */}
            {points.map((p, i) => {
              const s = toScreen(p)
              return (
                <Circle key={i} x={s.x} y={s.y} radius={5}
                  fill={i === 0 ? '#16a34a' : '#0ea5e9'}
                  stroke="white" strokeWidth={1.5} draggable
                  onDragMove={(e) =>
                    updatePoint(i, snap(toReal(e.target.x(), e.target.y())))
                  }
                />
              )
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify drawing works**

```bash
npm run dev
```
- Click left panel → points appear, lines connect them
- 4th+ click closes polygon with fill
- Green dot = first point
- Cursor shows live distance
- Snap toggle changes label
- Dashed inner polygon appears after polygon is closed (requires depth/slope from store)

- [ ] **Step 3: Commit**

```bash
git add src/components/DrawingCanvas.tsx
git commit -m "feat: drawing canvas with snap-to-grid, live distance, floor preview"
```

---

### Task 8: 3D Viewer

**Files:**
- Create: `src/lib/buildPondGeometry.ts`
- Modify: `src/components/ThreeDViewer.tsx`

- [ ] **Step 1: Create src/lib/buildPondGeometry.ts**

```ts
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
```

- [ ] **Step 2: Implement ThreeDViewer.tsx**

```tsx
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
```

- [ ] **Step 3: Verify 3D works**

```bash
npm run dev
```
Draw a polygon on left. Right panel should show 3D pond with slope faces. Drag to orbit.

- [ ] **Step 4: Commit**

```bash
git add src/lib/buildPondGeometry.ts src/components/ThreeDViewer.tsx
git commit -m "feat: 3D pond viewer with slope faces and orbit controls"
```

---

### Task 9: Bottom Bar

**Files:**
- Modify: `src/components/BottomBar.tsx`

- [ ] **Step 1: Implement BottomBar.tsx**

```tsx
import { usePondStore } from '../store/pondStore'
import { HDPE_PRESETS } from '../types'

export default function BottomBar() {
  const {
    depth, slope, hdpePreset, overlapPercent,
    setDepth, setSlopeRatio, setSlopeDegrees, setHdpePreset, setOverlapPercent,
  } = usePondStore()

  return (
    <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 shrink-0">
      <div className="flex items-center gap-4 flex-wrap">

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">ความลึก</label>
          <div className="flex items-center gap-1">
            <input type="number" min={0} step={0.1} value={depth}
              onChange={e => setDepth(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">m</span>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-700" />

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">Slope (H:V ↔ °)</label>
          <div className="flex items-center gap-1">
            <input type="number" min={0.1} step={0.1}
              value={parseFloat(slope.ratio.toFixed(2))}
              onChange={e => setSlopeRatio(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">: 1  =</span>
            <input type="number" min={1} max={89} step={0.1}
              value={parseFloat(slope.degrees.toFixed(1))}
              onChange={e => setSlopeDegrees(Math.min(89, Math.max(1, parseFloat(e.target.value) || 1)))}
              className="w-14 bg-slate-950 border border-sky-800 rounded px-2 py-1 text-sm text-right text-sky-400 focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">°</span>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-700" />

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">HDPE Roll</label>
          <select value={hdpePreset.label}
            onChange={e => {
              const p = HDPE_PRESETS.find(p => p.label === e.target.value)
              if (p) setHdpePreset(p)
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-sky-500">
            {HDPE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>

        <div className="w-px h-8 bg-slate-700" />

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">Overlap</label>
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={50} step={1} value={overlapPercent}
              onChange={e => setOverlapPercent(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">%</span>
          </div>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify linked slope inputs**

```bash
npm run dev
```
- Change ratio input → degrees input auto-updates
- Change degrees input → ratio input auto-updates
- Change depth → 3D viewer updates

- [ ] **Step 3: Commit**

```bash
git add src/components/BottomBar.tsx
git commit -m "feat: bottom bar with linked slope inputs and HDPE preset selector"
```

---

### Task 10: Result Panel + Final Validation

**Files:**
- Modify: `src/components/ResultPanel.tsx`

- [ ] **Step 1: Implement ResultPanel.tsx**

```tsx
import { usePondStore } from '../store/pondStore'
import { shoelaceArea } from '../lib/geometry'

function StatCard({ label, value, unit, highlight = false }: {
  label: string; value: string; unit: string; highlight?: boolean
}) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 text-center min-w-[80px] ${
      highlight ? 'bg-green-950/40 border border-green-900/40' : 'bg-slate-800'
    }`}>
      <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${highlight ? 'text-green-400' : 'text-sky-400'}`}>
        {value}
      </div>
      <div className="text-[9px] text-slate-600">{unit}</div>
    </div>
  )
}

export default function ResultPanel() {
  const { points, result, slope } = usePondStore()

  const warnings: string[] = []
  if (points.length > 0 && points.length < 3) warnings.push('วาดอย่างน้อย 3 จุด')
  if (points.length >= 3 && shoelaceArea(points) < 1) warnings.push('พื้นที่เล็กมาก — ตรวจสอบ scale')
  if (slope.degrees <= 0 || slope.degrees >= 90) warnings.push('Slope ต้องอยู่ระหว่าง 1°–89°')

  return (
    <div className="bg-slate-900 border-t border-sky-900/30 px-4 py-2.5 shrink-0">
      {warnings.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {warnings.map(w => (
            <span key={w} className="text-xs bg-amber-950/50 border border-amber-800/50 text-amber-400 rounded px-2 py-0.5">
              ⚠ {w}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">ผลคำนวณ</span>
        </div>
        <div className="flex gap-2 flex-1 flex-wrap">
          <StatCard label="ก้นบ่อ" value={result ? result.floorArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label="ขอบ Slope" value={result ? result.slopeArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label="รวม" value={result ? result.totalArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label="+Overlap" value={result ? result.hdpeArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label="จำนวน Roll" value={result ? String(result.rollCount) : '—'} unit="rolls" highlight />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Full golden path test**

```bash
npm run dev
```

1. Click to draw a rectangular pond: click 4 corners roughly (0,0), (10,0), (10,8), (0,8) — snap will align them
2. Depth = 2.5, Slope ratio = 2 (should show ≈26.6°)
3. HDPE = Standard M (7×50), Overlap = 10%
4. Result panel should show 5 cards with numbers
5. 3D viewer shows pond shape — drag to orbit

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```
Expected: All geometry and hdpe tests PASS

- [ ] **Step 4: Production build**

```bash
npm run build
```
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 5: Final commit**

```bash
git add src/components/ResultPanel.tsx
git commit -m "feat: result panel with area breakdown, roll count, and validation warnings"
```
