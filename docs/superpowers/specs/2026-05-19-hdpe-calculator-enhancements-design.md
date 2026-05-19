# HDPE Calculator — Enhancement Features Design

**Date:** 2026-05-19
**Status:** Approved

## Overview

Five enhancements to the existing HDPE pond calculator app: zoom/pan in the 2D canvas, perimeter stat display, PNG export, keyboard shortcuts, and production build verification.

---

## 1. Zoom / Pan in DrawingCanvas

**UX model:** Scroll zoom + Middle-click drag pan (Option A)

### State

Two new values added to `pondStore` (or held locally in `DrawingCanvas` since they are pure view state, not calculation-relevant):

- `viewOffset: { x: number; y: number }` — pan offset in screen pixels
- `pxPerMeter: number` — already in store, but now driven by scroll

Hold these as **local React state in `DrawingCanvas`** (not in Zustand) because they don't affect any calculation and are canvas-only.

### Behaviour

| Input | Action |
|---|---|
| Scroll up | zoom in: `pxPerMeter *= 1.1`, pivot at cursor position |
| Scroll down | zoom out: `pxPerMeter /= 1.1`, clamp min 5, max 200 |
| Middle-button down + drag | pan: update `viewOffset` by mouse delta |
| "Reset View" button click | `pxPerMeter = 40`, `viewOffset = {x:0, y:0}` |

### Coordinate Conversion

Existing `toReal` / `toScreen` must incorporate offset:

```
toScreen(p) = { x: p.x * pxPerMeter + viewOffset.x,
                y: canvasH - p.y * pxPerMeter + viewOffset.y }

toReal(sx, sy) = { x: (sx - viewOffset.x) / pxPerMeter,
                   y: (canvasH - sy + viewOffset.y) / pxPerMeter }
```

### Zoom pivot

When zooming, the point under the cursor must stay fixed:
```
newOffset.x = cursorX - (cursorX - offset.x) * (newPpm / oldPpm)
newOffset.y = cursorY - (cursorY - offset.y) * (newPpm / oldPpm)
```

### UI

Add "Reset View" button in the DrawingCanvas toolbar (same row as Snap / Undo / Clear).

---

## 2. Perimeter in ResultPanel

### Calculation

Add `perimeter(points: Point[]): number` to `geometry.ts`:

```ts
// sum of edge lengths around closed polygon
export function perimeter(points: Point[]): number {
  return points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length]
    return sum + Math.hypot(next.x - p.x, next.y - p.y)
  }, 0)
}
```

Expose via `PondResult`:

```ts
interface PondResult {
  floorArea: number
  slopeArea: number
  totalArea: number
  hdpeArea: number
  rollCount: number
  perimeter: number   // ← new
}
```

Update `recompute()` in store to call `perimeter(points)` and store in `result`.

### UI

Add one `StatCard` in `ResultPanel` between "ขอบ Slope" and "รวม":

```
label: "เส้นรอบรูป"
value: result.perimeter.toFixed(1)
unit: "m"
```

---

## 3. Export PNG

### Library

Use `html-to-image` (MIT, no canvas restriction): `npm install html-to-image`

### Implementation

- Add a `ref` to the top-level content `<div>` in `App.tsx` (the div wrapping Canvas + 3D + ResultPanel, excluding BottomBar).
- Pass `ref` down or use a shared ref in a context / pass export handler up.
- Simplest approach: add `exportRef` in `App.tsx`, expose `onExport` callback to a button in the toolbar area.

### Trigger

Add an "Export PNG" button inside the **existing `<header>`** in `App.tsx` (next to the "New" button). On click:

```ts
import { toPng } from 'html-to-image'
toPng(exportRef.current).then(dataUrl => {
  const a = document.createElement('a')
  a.download = 'hdpe-pond.png'
  a.href = dataUrl
  a.click()
})
```

### Scope of capture

`exportRef` points to the **root app `<div>`** (the `h-screen flex flex-col` div), capturing everything: header, Canvas split, BottomBar, and ResultPanel. This gives a complete snapshot of the current state.

---

## 4. Keyboard Shortcuts

Attach a `keydown` listener via `useEffect` in `App.tsx` (single global listener).

| Key | Action | Store action |
|---|---|---|
| `Backspace` or `z` / `Z` | Undo last point | `removeLastPoint()` |
| `Escape` | Clear all points | `clearPoints()` |
| `Enter` | Close polygon | `closePolygon()` |
| `s` / `S` | Toggle snap | `toggleSnap()` |

Guard: ignore if focus is inside an `<input>` or `<select>` element (check `document.activeElement.tagName`).

---

## 5. Production Build Verification

Run `npm run build` after implementation. Fix any TypeScript errors or Vite warnings before marking done. No new code required — this is a verification step.

---

## Files Affected

| File | Change |
|---|---|
| `src/components/DrawingCanvas.tsx` | Add local zoom/pan state, update toReal/toScreen, add wheel/mousedown handlers, Reset View button |
| `src/lib/geometry.ts` | Add `perimeter()` function |
| `src/lib/geometry.test.ts` | Add perimeter tests |
| `src/types.ts` | Add `perimeter` to `PondResult` |
| `src/store/pondStore.ts` | Compute and store `perimeter` in `result` |
| `src/components/ResultPanel.tsx` | Add perimeter StatCard |
| `src/App.tsx` | Add exportRef, keyboard listener, Export PNG button, thin header bar |
| `package.json` | Add `html-to-image` dependency |

---

## Testing

- `perimeter()` gets unit tests in `geometry.test.ts`
- Zoom/pan, export, keyboard shortcuts tested manually via dev server
- `npm run test:run` must stay green (15+ tests)
- `npm run build` must succeed with no errors
