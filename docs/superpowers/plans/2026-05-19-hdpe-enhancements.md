# HDPE Calculator Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `codex:rescue` (Codex plugin) for all implementation tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zoom/pan to 2D canvas, perimeter stat, PNG export, keyboard shortcuts, and verify production build.

**Architecture:** Perimeter flows through geometry lib → store → ResultPanel. Zoom/pan is pure local view-state in DrawingCanvas (no store changes). Export PNG uses `html-to-image` from a root ref in App. Keyboard shortcuts are a single `keydown` listener in App.

**Tech Stack:** React 18, Konva/react-konva, @react-three/fiber, Zustand, html-to-image (new), Vitest, Vite+TS

---

## File Map

| File | Change |
|---|---|
| `src/lib/geometry.ts` | Add `perimeter()` function |
| `src/lib/geometry.test.ts` | Add 2 perimeter tests |
| `src/types.ts` | Add `perimeter: number` to `PondResult` |
| `src/store/pondStore.ts` | Import + call `perimeter()` in `recompute()` |
| `src/components/ResultPanel.tsx` | Add perimeter StatCard |
| `src/components/DrawingCanvas.tsx` | Zoom/pan rewrite (local state, new handlers) |
| `src/components/ThreeDViewer.tsx` | Add `gl={{ preserveDrawingBuffer: true }}` |
| `src/App.tsx` | Add rootRef, Export PNG button, keyboard shortcuts |
| `package.json` | Add `html-to-image` dependency |

---

## Task 1: Perimeter — Geometry + Types + Store + UI

**Files:**
- Modify: `src/lib/geometry.ts`
- Modify: `src/lib/geometry.test.ts`
- Modify: `src/types.ts`
- Modify: `src/store/pondStore.ts`
- Modify: `src/components/ResultPanel.tsx`

- [ ] **Step 1: Add failing perimeter tests to geometry.test.ts**

Add this import line (replace existing import line at line 2):

```ts
import { shoelaceArea, insetPolygon, calculatePondGeometry, polygonEdgeLengths, perimeter } from './geometry'
```

Append these two test cases at the end of the file (after the last `})` closing `calculatePondGeometry`):

```ts
describe('perimeter', () => {
  it('returns sum of edge lengths for a 3×4 rectangle', () => {
    const pts = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }, { x: 0, y: 4 }]
    expect(perimeter(pts)).toBeCloseTo(14, 5)
  })

  it('returns correct perimeter for a 3-4-5 right triangle', () => {
    const pts = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }]
    expect(perimeter(pts)).toBeCloseTo(12, 5)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm run test:run -- src/lib/geometry.test.ts
```

Expected: `SyntaxError` or `perimeter is not a function` — 2 tests fail.

- [ ] **Step 3: Add `perimeter()` to geometry.ts**

Append at the end of `src/lib/geometry.ts`:

```ts
export function perimeter(pts: Point[]): number {
  return polygonEdgeLengths(pts).reduce((s, l) => s + l, 0)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
npm run test:run -- src/lib/geometry.test.ts
```

Expected: 17 tests pass (15 existing + 2 new).

- [ ] **Step 5: Add `perimeter` field to PondResult in types.ts**

In `src/types.ts`, replace the `PondResult` interface:

```ts
export interface PondResult {
  floorArea: number   // m²
  slopeArea: number   // m²
  totalArea: number   // m²
  hdpeArea: number    // m² after overlap applied
  rollCount: number
  perimeter: number   // m — top polygon perimeter
}
```

- [ ] **Step 6: Update recompute() in pondStore.ts**

In `src/store/pondStore.ts`, replace the first import line:

```ts
import { calculatePondGeometry, perimeter } from '../lib/geometry'
```

In the same file, replace the `return` line inside `recompute()` (the one that builds `result`):

```ts
  return { floorPts, result: { floorArea, slopeArea, totalArea, hdpeArea, rollCount, perimeter: perimeter(points) } }
```

- [ ] **Step 7: Add perimeter StatCard in ResultPanel.tsx**

In `src/components/ResultPanel.tsx`, in the `<div className="flex gap-2 flex-1 flex-wrap">` block, add a new StatCard between "ขอบ Slope" and "รวม":

```tsx
<StatCard label="เส้นรอบรูป" value={result ? result.perimeter.toFixed(1) : '—'} unit="m" />
```

After edit the block looks like:
```tsx
<StatCard label="ก้นบ่อ" value={result ? result.floorArea.toFixed(1) : '—'} unit="m²" />
<StatCard label="ขอบ Slope" value={result ? result.slopeArea.toFixed(1) : '—'} unit="m²" />
<StatCard label="เส้นรอบรูป" value={result ? result.perimeter.toFixed(1) : '—'} unit="m" />
<StatCard label="รวม" value={result ? result.totalArea.toFixed(1) : '—'} unit="m²" />
<StatCard label="+Overlap" value={result ? result.hdpeArea.toFixed(1) : '—'} unit="m²" />
<StatCard label="จำนวน Roll" value={result ? String(result.rollCount) : '—'} unit="rolls" highlight />
```

- [ ] **Step 8: Run all tests — expect all pass**

```
npm run test:run
```

Expected: 17 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/geometry.ts src/lib/geometry.test.ts src/types.ts src/store/pondStore.ts src/components/ResultPanel.tsx
git commit -m "feat: add perimeter calculation and stat card"
```

---

## Task 2: Zoom / Pan in DrawingCanvas

**Files:**
- Modify: `src/components/DrawingCanvas.tsx` (full rewrite of state + handlers + grid)

**Summary of changes:**
- Remove `pxPerMeter` from usePondStore() destructuring
- Add local state: `ppm` (zoom), `offset` (pan), `midDrag` (drag tracking)
- Update `toReal` / `toScreen` to use `ppm` + `offset`
- Add `handleWheel` (zoom at cursor), `handleMouseDown/Up` (middle-drag), update `handleMouseMove` (pan during drag)
- Recompute grid lines dynamically for visible area
- Add "Reset View" button in toolbar
- Change cursor to `grabbing` during pan

- [ ] **Step 1: Replace DrawingCanvas.tsx with updated version**

Full replacement of `src/components/DrawingCanvas.tsx`:

```tsx
import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { usePondStore } from '../store/pondStore'
import type { Point } from '../types'

function snapToGrid(val: number): number {
  return Math.round(val)
}

const SUB = 5

export default function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [cursor, setCursor] = useState<Point | null>(null)
  const [rawPos, setRawPos] = useState<{ x: number; y: number } | null>(null)
  const [ppm, setPpm] = useState(40)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [midDrag, setMidDrag] = useState<{ x: number; y: number } | null>(null)

  const {
    points, isClosed, snapEnabled, floorPts,
    addPoint, updatePoint, removeLastPoint, clearPoints, toggleSnap, closePolygon,
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
    x: (sx - offset.x) / ppm,
    y: (size.height - sy + offset.y) / ppm,
  })

  const toScreen = (p: Point) => ({
    x: p.x * ppm + offset.x,
    y: size.height - p.y * ppm + offset.y,
  })

  const snap = (p: Point): Point =>
    snapEnabled ? { x: snapToGrid(p.x), y: snapToGrid(p.y) } : p

  function handleWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1
    const newPpm = Math.max(5, Math.min(200, ppm * factor))
    const scale = newPpm / ppm
    setOffset(o => ({
      x: pos.x + (o.x - pos.x) * scale,
      y: (size.height - pos.y) * (scale - 1) + o.y * scale,
    }))
    setPpm(newPpm)
  }

  function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      e.evt.preventDefault()
      setMidDrag({ x: e.evt.clientX, y: e.evt.clientY })
    }
  }

  function handleMouseUp(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) setMidDrag(null)
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    if (isClosed) return

    if (points.length >= 3) {
      const { x: fx, y: fy } = toScreen(points[0])
      if (Math.hypot(pos.x - fx, pos.y - fy) < 14) {
        closePolygon()
        return
      }
    }
    addPoint(snap(toReal(pos.x, pos.y)))
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    if (midDrag) {
      const dx = e.evt.clientX - midDrag.x
      const dy = e.evt.clientY - midDrag.y
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
      setMidDrag({ x: e.evt.clientX, y: e.evt.clientY })
      return
    }

    setRawPos(pos)
    setCursor(snap(toReal(pos.x, pos.y)))
  }

  const lastPt = points.at(-1)
  const distToCursor =
    !isClosed && lastPt && cursor
      ? Math.sqrt((cursor.x - lastPt.x) ** 2 + (cursor.y - lastPt.y) ** 2)
      : null

  const nearFirst =
    !isClosed && points.length >= 3 && rawPos
      ? Math.hypot(rawPos.x - toScreen(points[0]).x, rawPos.y - toScreen(points[0]).y) < 14
      : false

  const toFlat = (pts: Point[]) => pts.flatMap(p => [toScreen(p).x, toScreen(p).y])

  const lineFlat = toFlat(points)
  const polyFlat = isClosed ? [...lineFlat, lineFlat[0], lineFlat[1]] : lineFlat
  const cursorFlat =
    !isClosed && lastPt && cursor
      ? [toScreen(lastPt).x, toScreen(lastPt).y, toScreen(cursor).x, toScreen(cursor).y]
      : []
  const floorFlat = floorPts.length >= 3 ? toFlat(floorPts) : []

  // Grid: compute visible lines in screen space
  const minorStep = ppm / SUB
  const kXLeft = Math.floor(-offset.x / minorStep) - 1
  const kXRight = Math.ceil((size.width - offset.x) / minorStep) + 1
  const gxLines = Array.from({ length: Math.max(0, kXRight - kXLeft + 1) }, (_, i) => {
    const k = kXLeft + i
    return { x: k * minorStep + offset.x, major: k % SUB === 0 }
  }).filter(l => l.x >= -1 && l.x <= size.width + 1)

  const kYBottom = Math.floor(offset.y / minorStep) - 1
  const kYTop = Math.ceil((size.height + offset.y) / minorStep) + 1
  const gyLines = Array.from({ length: Math.max(0, kYTop - kYBottom + 1) }, (_, i) => {
    const k = kYBottom + i
    return { y: size.height + offset.y - k * minorStep, major: k % SUB === 0 }
  }).filter(l => l.y >= -1 && l.y <= size.height + 1)

  const cursorClass = midDrag ? 'cursor-grabbing' : (isClosed ? 'cursor-default' : 'cursor-crosshair')

  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-800">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
        <span className="text-slate-400">Top View (m)</span>
        <div className="flex-1" />
        <button
          onClick={() => { setPpm(40); setOffset({ x: 0, y: 0 }) }}
          className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          Reset View
        </button>
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

      <div ref={containerRef} className={`flex-1 overflow-hidden ${cursorClass}`}>
        <Stage
          width={size.width}
          height={size.height}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onMouseLeave={() => { setCursor(null); setRawPos(null); setMidDrag(null) }}
        >
          <Layer listening={false}>
            {gxLines.map((l, i) => (
              <Line key={`gx${i}`} points={[l.x, 0, l.x, size.height]}
                stroke={l.major ? '#1e3a5f' : '#152030'}
                strokeWidth={l.major ? 0.8 : 0.4} />
            ))}
            {gyLines.map((l, i) => (
              <Line key={`gy${i}`} points={[0, l.y, size.width, l.y]}
                stroke={l.major ? '#1e3a5f' : '#152030'}
                strokeWidth={l.major ? 0.8 : 0.4} />
            ))}
          </Layer>

          <Layer>
            {points.length >= 1 && (
              <Line
                points={polyFlat}
                closed={isClosed}
                fill={isClosed ? 'rgba(14,165,233,0.07)' : undefined}
                stroke="#0ea5e9"
                strokeWidth={1.5}
              />
            )}

            {floorFlat.length > 0 && (
              <Line points={[...floorFlat, floorFlat[0], floorFlat[1]]} closed
                stroke="#3b82f6" strokeWidth={1} dash={[5, 3]}
                fill="rgba(30,64,175,0.15)" />
            )}

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

            {points.map((p, i) => {
              const s = toScreen(p)
              const isFirst = i === 0
              const highlight = isFirst && nearFirst
              return (
                <Circle key={i} x={s.x} y={s.y}
                  radius={highlight ? 8 : 5}
                  fill={isFirst ? '#16a34a' : '#0ea5e9'}
                  stroke={highlight ? '#4ade80' : 'white'}
                  strokeWidth={highlight ? 2.5 : 1.5}
                  draggable={!nearFirst || !isFirst}
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

- [ ] **Step 2: Verify zoom/pan manually**

```
npm run dev
```

Open http://localhost:5173. Draw 4 points on the canvas, then:
- Scroll up → canvas zooms in (grid gets larger)
- Scroll down → canvas zooms out
- Middle-click + drag → pans the canvas (cursor changes to grabbing)
- Click "Reset View" → returns to default zoom/offset
- Drawn polygon stays correct after zoom/pan

- [ ] **Step 3: Commit**

```bash
git add src/components/DrawingCanvas.tsx
git commit -m "feat: zoom (scroll) and pan (middle-drag) in drawing canvas"
```

---

## Task 3: Export PNG

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `src/components/ThreeDViewer.tsx` (preserveDrawingBuffer)
- Modify: `src/App.tsx` (ref + button + handler)

- [ ] **Step 1: Install html-to-image**

```
npm install html-to-image
```

Expected: `html-to-image` appears in `node_modules/` and `package.json` dependencies.

- [ ] **Step 2: Add preserveDrawingBuffer to ThreeDViewer**

In `src/components/ThreeDViewer.tsx`, change the `<Canvas ...>` opening tag from:

```tsx
<Canvas camera={{ position: [15, 15, 15], fov: 45 }} style={{ background: '#0c1220' }}>
```

to:

```tsx
<Canvas camera={{ position: [15, 15, 15], fov: 45 }} gl={{ preserveDrawingBuffer: true }} style={{ background: '#0c1220' }}>
```

This lets `html-to-image` read pixel data from the WebGL canvas.

- [ ] **Step 3: Update App.tsx — add ref, import, button, and handler**

Full replacement of `src/App.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import DrawingCanvas from './components/DrawingCanvas'
import ThreeDViewer from './components/ThreeDViewer'
import BottomBar from './components/BottomBar'
import ResultPanel from './components/ResultPanel'
import { usePondStore } from './store/pondStore'

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { removeLastPoint, clearPoints, closePolygon, toggleSnap } = usePondStore()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') removeLastPoint()
      else if (e.key === 'Escape') clearPoints()
      else if (e.key === 'Enter') closePolygon()
      else if (e.key === 's' || e.key === 'S') toggleSnap()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [removeLastPoint, clearPoints, closePolygon, toggleSnap])

  function handleExport() {
    if (!rootRef.current) return
    toPng(rootRef.current, { pixelRatio: 2 }).then(dataUrl => {
      const a = document.createElement('a')
      a.download = 'hdpe-pond.png'
      a.href = dataUrl
      a.click()
    })
  }

  return (
    <div ref={rootRef} className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-sm font-semibold tracking-wide">HDPE POND CALCULATOR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1 rounded border border-sky-700 text-sky-400 hover:text-sky-200 hover:border-sky-500 transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            New
          </button>
        </div>
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

**Note:** This also includes the keyboard shortcuts (Task 4) — both are in App.tsx, so they are implemented together.

- [ ] **Step 4: Verify Export PNG manually**

```
npm run dev
```

Open http://localhost:5173. Draw a polygon and close it. Click "Export PNG". Browser should download `hdpe-pond.png`. Open the file — should show the full app UI including the 3D viewer.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThreeDViewer.tsx src/App.tsx package.json package-lock.json
git commit -m "feat: export PNG and keyboard shortcuts"
```

---

## Task 4: Verify Keyboard Shortcuts

**Note:** Keyboard shortcuts were implemented in Task 3 (App.tsx). This task is manual verification only — no code changes.

- [ ] **Step 1: Test each shortcut**

```
npm run dev
```

Open http://localhost:5173. Click on the canvas area (not an input) to make sure focus is on the page, not an input field.

| Key | Expected result |
|---|---|
| Click to add 3 points, then press `Backspace` | Last point removed |
| Add 3 points, press `Z` | Last point removed |
| Add 2 points, press `Escape` | All points cleared |
| Add 3+ points, press `Enter` | Polygon closes |
| Press `S` | Snap toggles OFF/ON (check label in canvas toolbar) |
| Click into Depth input, then press `Escape` | Nothing happens (input field focus ignored) |

- [ ] **Step 2: Commit if no fixes needed (else fix and commit)**

If all tests pass with no code changes:
```bash
# No commit needed — covered by Task 3 commit
```

---

## Task 5: Production Build Verification

**Files:** None modified — verification only.

- [ ] **Step 1: Run all tests**

```
npm run test:run
```

Expected: 17 tests pass, 0 fail.

- [ ] **Step 2: Run production build**

```
npm run build
```

Expected output ends with something like:
```
✓ built in X.XXs
dist/index.html
dist/assets/index-XXXX.js
dist/assets/index-XXXX.css
```

If TypeScript errors appear, fix them before marking this step done.

- [ ] **Step 3: Commit if fixes were required**

If build revealed TS errors that needed fixing, commit the fixes:
```bash
git add <files-changed>
git commit -m "fix: resolve TypeScript errors from production build"
```

If build passed with no changes: no commit needed.

---

## Verification Checklist

After all tasks complete:

- [ ] `npm run test:run` → 17 tests, all green
- [ ] `npm run build` → no errors
- [ ] Canvas: scroll zooms in/out at cursor position
- [ ] Canvas: middle-drag pans (cursor shows grabbing)
- [ ] Canvas: Reset View returns to default
- [ ] ResultPanel: shows 6 stat cards including "เส้นรอบรูป"
- [ ] Header: Export PNG button downloads a .png file showing full UI
- [ ] Keyboard: Backspace/Z = undo, Escape = clear, Enter = close, S = snap
- [ ] Keyboard shortcuts ignored when input/select is focused
